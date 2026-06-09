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
# Edit .env — set your MONGO_URI
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

---

## MCP Tools — Claude Desktop Integration

The MCP server exposes 7 natural-language tools so Claude Desktop can drive the app.

| Tool | What it does |
|------|-------------|
| `login` | Authenticate and get a token |
| `list_folders` | List folders at root or inside a parent |
| `create_folder` | Create a folder (optionally nested by parent name) |
| `delete_folder` | Delete a folder and all its contents |
| `list_images` | List images in a folder |
| `upload_image` | Upload a base64-encoded image into a folder |
| `delete_image` | Delete an image by name from a folder |

### Claude Desktop config

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "drive": {
      "command": "node",
      "args": ["C:/Users/Asus/Desktop/dobby/mcp-server/index.js"]
    }
  }
}
```

Restart Claude Desktop. Then try:

> "Login with email demo@demo.com and password demo1234"
> "Create a folder called Projects"
> "Create a folder called Campaigns inside Projects"
> "List folders inside Projects"
> "How big is the Projects folder?"

## Demo Credentials
- Email: `demo@demo.com`
- Password: `demo1234`
