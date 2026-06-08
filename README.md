# Google Drive Clone

A full-stack Google Drive-like application with nested folders, image uploads, and user authentication.

## Tech Stack
- **Backend**: Node.js + Express + MongoDB
- **Frontend**: React
- **Auth**: JWT (bcryptjs)

## Setup

### Backend
```bash
cd backend
npm install
# Edit .env with your MongoDB URI
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### MCP Server (Bonus)
```bash
cd mcp-server
npm install
node index.js
```

## Features
- Signup / Login / Logout
- Create nested folders (unlimited depth)
- Upload images into folders
- Folder size = sum of all images inside (including nested)
- User-specific access (users only see their own data)
- Delete folders (cascades to sub-folders and images)
- Image preview

## MCP Tools (for Claude Desktop)
| Tool | Description |
|------|-------------|
| `login` | Authenticate and get token |
| `create_folder` | Create a folder (optionally nested) |
| `list_folders` | List folders at root or inside a parent |
| `list_images` | List images in a folder |
| `upload_image` | Upload a base64-encoded image |

### Claude Desktop config
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "drive": {
      "command": "node",
      "args": ["C:/path/to/dobby/mcp-server/index.js"]
    }
  }
}
```

## Demo Credentials
- Email: `demo@demo.com`
- Password: `demo1234`
