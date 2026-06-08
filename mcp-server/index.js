#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { z } from 'zod';
import FormData from 'form-data';

const API = process.env.DRIVE_API_URL || 'http://localhost:5000/api';
let token = '';

const api = axios.create({ baseURL: API });
api.interceptors.request.use(cfg => {
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const server = new McpServer({ name: 'drive-mcp', version: '1.0.0' });

server.tool('login',
  { email: z.string().email(), password: z.string() },
  async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    token = data.token;
    return { content: [{ type: 'text', text: `Logged in as ${data.user.username}` }] };
  }
);

server.tool('create_folder',
  { name: z.string(), parent_id: z.string().optional() },
  async ({ name, parent_id }) => {
    const { data } = await api.post('/folders', { name, parent: parent_id || null });
    return { content: [{ type: 'text', text: `Folder "${data.name}" created (id: ${data._id})` }] };
  }
);

server.tool('list_folders',
  { parent_id: z.string().optional() },
  async ({ parent_id }) => {
    const { data } = await api.get('/folders', { params: { parent: parent_id || '' } });
    const list = data.map(f => `${f.name} (id: ${f._id}, size: ${f.size} bytes)`).join('\n') || 'No folders';
    return { content: [{ type: 'text', text: list }] };
  }
);

server.tool('list_images',
  { folder_id: z.string() },
  async ({ folder_id }) => {
    const { data } = await api.get('/images', { params: { folder: folder_id } });
    const list = data.map(i => `${i.name} (id: ${i._id}, size: ${i.size} bytes)`).join('\n') || 'No images';
    return { content: [{ type: 'text', text: list }] };
  }
);

server.tool('upload_image',
  { name: z.string(), folder_id: z.string(), image_base64: z.string(), extension: z.string().default('jpg') },
  async ({ name, folder_id, image_base64, extension }) => {
    const buf = Buffer.from(image_base64, 'base64');
    const form = new FormData();
    form.append('name', name);
    form.append('folder', folder_id);
    form.append('image', buf, { filename: `upload.${extension}`, contentType: 'image/jpeg' });
    const { data } = await api.post('/images', form, { headers: form.getHeaders() });
    return { content: [{ type: 'text', text: `Image "${data.name}" uploaded (id: ${data._id})` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
