# Organizer for Caido

📁 A powerful organizer plugin for [Caido](https://caido.io) to help you manage, annotate, and analyze HTTP requests **and their full responses**.

## ✨ Features

- Save and persist HTTP requests **and responses** from Caido's HTTP History
- View the full **raw HTTP request and response side-by-side** in a split-panel layout
- Add custom notes and statuses: `Not touched`, `Pending`, `Finished`, `Important`
- Filter saved requests by status, search, and other fields
- `Req Length` and **`Res Length`** columns in the request table for quick size analysis
- Right-click context menu integration in HTTP History ("Send to Organizer")
- Inline right-click menu to delete saved requests
- All data persisted locally in SQLite via Caido's plugin API

## 🚀 Screenshots
<img width="2560" height="1319" alt="image" src="https://github.com/user-attachments/assets/2a2c2bb1-cde7-478c-b255-721c6e60287e" />


## 🛠 Usage

1. Install the plugin from `dist/plugin_package.zip` in Caido's Plugin Manager
2. In **HTTP History**, right-click any request → **"Send to Organizer (Table)"**
3. Open the **Organizer** tab from the sidebar
4. Click any saved entry to view the full Request / Response split view
5. Add notes, set a status, and save

## 📦 Technical Stack

- **Frontend**: React + TailwindCSS
- **Backend**: Caido Plugin API + SQLite
- **SDKs**: `@caido/sdk-frontend` + `@caido/sdk-backend` + GraphQL

## 🗃 Database Schema

Response data is stored in the plugin's SQLite database alongside request data:

| Column | Type | Description |
|--------|------|-------------|
| `reqRaw` | TEXT | Raw HTTP request string |
| `reqLength` | INTEGER | Request byte length |
| `resRaw` | TEXT | Full raw HTTP response string |
| `resLength` | INTEGER | Response byte length |
| `status` | TEXT | User-assigned status |
| `note` | TEXT | User-assigned note |


> Existing installs are automatically migrated via `ALTER TABLE` on first load.

## 📁 Structure

```
packages/
├── backend/        # SQLite schema, types, and API handlers
└── frontend/
    └── src/
        ├── index.tsx             # Plugin entry — commands, menu registration
        ├── Organizer.tsx         # Main UI component
        └── components/
            ├── RequestTable.tsx  # Saved requests table (with Res Length col)
            ├── RequestDetails.tsx# Split request/response view + note editor
            └── httpeditor/       # Caido HTTP editor wrapper component
```

## 🧪 Known Limitations

- 📥 Saved requests are read-only — raw cannot be edited after saving
- 📝 No export/import functionality yet

## 🎯 Future Goals

- 📤 Send saved requests directly into Replay
- 📦 JSON export for individual or full request/response data
- 🔍 Full-text search within raw request/response bodies

## 🧑‍💻 Authors

- **DewSecOff** — Original plugin
- **h0tak88r** — Fork: added full HTTP response capture & split-panel view

Contributions welcome!
