#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { z } from 'zod';
import FormData from 'form-data';

const API = process.env.DRIVE_API_URL || 'http://localhost:5000/api';
let token = '';

const http = axios.create({ baseURL: API });
http.interceptors.request.use(cfg => {
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Walk all folders recursively to find one by name
async function resolveFolderByName(name, parentId = null) {
  const { data } = await http.get('/folders', { params: { parent: parentId || '' } });
  for (const f of data) {
    if (f.name.toLowerCase() === name.toLowerCase()) return f._id;
    const found = await resolveFolderByName(name, f._id);
    if (found) return found;
  }
  return null;
}

const ok  = text => ({ content: [{ type: 'text', text }] });
const bad = text => ({ content: [{ type: 'text', text: `❌ ${text}` }], isError: true });

function fmtSize(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ─────────────────────────────────────────────────────────────
const server = new McpServer({ name: 'google-drive-clone', version: '1.0.0' });

// login
server.tool(
  'login',
  'Authenticate with the Drive app. Call this first before any other tool.',
  { email: z.string().email(), password: z.string() },
  async ({ email, password }) => {
    try {
      const { data } = await http.post('/auth/login', { email, password });
      token = data.token;
      return ok(`✅ Logged in as "${data.user.username}" (${data.user.email})`);
    } catch (e) {
      return bad(e.response?.data?.message || 'Login failed');
    }
  }
);

// list_folders
server.tool(
  'list_folders',
  'List folders at root or inside a named parent folder.',
  { parent_name: z.string().optional() },
  async ({ parent_name }) => {
    try {
      let parentId = null;
      if (parent_name) {
        parentId = await resolveFolderByName(parent_name);
        if (!parentId) return bad(`Folder "${parent_name}" not found`);
      }
      const { data } = await http.get('/folders', { params: { parent: parentId || '' } });
      if (!data.length) return ok(`No folders${parent_name ? ` inside "${parent_name}"` : ' at root'}`);
      return ok(data.map(f => `📁 ${f.name}  [${fmtSize(f.size)}]  id:${f._id}`).join('\n'));
    } catch (e) {
      return bad(e.response?.data?.message || 'Failed to list folders');
    }
  }
);

// create_folder  ← the key natural-language tool
server.tool(
  'create_folder',
  'Create a folder. Use parent_name to nest it inside another folder by name. Example: name="Campaigns", parent_name="Projects".',
  {
    name: z.string(),
    parent_name: z.string().optional(),
  },
  async ({ name, parent_name }) => {
    try {
      let parentId = null;
      if (parent_name) {
        parentId = await resolveFolderByName(parent_name);
        if (!parentId) return bad(`Parent folder "${parent_name}" not found. Create it first.`);
      }
      const { data } = await http.post('/folders', { name, parent: parentId });
      return ok(`✅ Folder "${data.name}" created${parent_name ? ` inside "${parent_name}"` : ' at root'}  id:${data._id}`);
    } catch (e) {
      return bad(e.response?.data?.message || 'Failed to create folder');
    }
  }
);

// delete_folder
server.tool(
  'delete_folder',
  'Delete a folder by name. This also deletes all nested folders and images inside it.',
  { name: z.string() },
  async ({ name }) => {
    try {
      const id = await resolveFolderByName(name);
      if (!id) return bad(`Folder "${name}" not found`);
      await http.delete(`/folders/${id}`);
      return ok(`✅ Folder "${name}" and all its contents deleted`);
    } catch (e) {
      return bad(e.response?.data?.message || 'Failed to delete folder');
    }
  }
);

// list_images
server.tool(
  'list_images',
  'List all images inside a folder by folder name.',
  { folder_name: z.string() },
  async ({ folder_name }) => {
    try {
      const folderId = await resolveFolderByName(folder_name);
      if (!folderId) return bad(`Folder "${folder_name}" not found`);
      const { data } = await http.get('/images', { params: { folder: folderId } });
      if (!data.length) return ok(`No images in "${folder_name}"`);
      return ok(data.map(i => `🖼  ${i.name}  [${fmtSize(i.size)}]  id:${i._id}`).join('\n'));
    } catch (e) {
      return bad(e.response?.data?.message || 'Failed to list images');
    }
  }
);

// upload_image
server.tool(
  'upload_image',
  'Upload a base64-encoded image into a folder referenced by name.',
  {
    name: z.string(),
    folder_name: z.string(),
    image_base64: z.string(),
    extension: z.string().default('jpg'),
  },
  async ({ name, folder_name, image_base64, extension }) => {
    try {
      const folderId = await resolveFolderByName(folder_name);
      if (!folderId) return bad(`Folder "${folder_name}" not found`);
      const buf = Buffer.from(image_base64, 'base64');
      const form = new FormData();
      form.append('name', name);
      form.append('folder', folderId);
      form.append('image', buf, { filename: `upload.${extension}`, contentType: `image/${extension}` });
      const { data } = await http.post('/images', form, { headers: form.getHeaders() });
      return ok(`✅ Image "${data.name}" uploaded to "${folder_name}"  [${fmtSize(data.size)}]`);
    } catch (e) {
      return bad(e.response?.data?.message || 'Upload failed');
    }
  }
);

// delete_image
server.tool(
  'delete_image',
  'Delete an image by name from a specific folder.',
  { name: z.string(), folder_name: z.string() },
  async ({ name, folder_name }) => {
    try {
      const folderId = await resolveFolderByName(folder_name);
      if (!folderId) return bad(`Folder "${folder_name}" not found`);
      const { data: imgs } = await http.get('/images', { params: { folder: folderId } });
      const img = imgs.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (!img) return bad(`Image "${name}" not found in "${folder_name}"`);
      await http.delete(`/images/${img._id}`);
      return ok(`✅ Image "${name}" deleted from "${folder_name}"`);
    } catch (e) {
      return bad(e.response?.data?.message || 'Failed to delete image');
    }
  }
);

// get_folder_size
server.tool(
  'get_folder_size',
  'Get the total size of a folder including all nested subfolders and images.',
  { name: z.string() },
  async ({ name }) => {
    try {
      const id = await resolveFolderByName(name);
      if (!id) return bad(`Folder "${name}" not found`);
      const { data } = await http.get(`/folders/${id}`);
      return ok(`📁 "${data.name}" — total size: ${fmtSize(data.size)}`);
    } catch (e) {
      return bad(e.response?.data?.message || 'Failed to get folder size');
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
