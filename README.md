# 📺 MCR Logbook

A web-based logbook management system for Master Control Room (MCR) operations, built to streamline daily broadcasting workflows at a TV station.

**Live Demo →** `mcrlogbook-production.up.railway.app`  
**Figma Prototype →** [View Wireframe](https://www.figma.com/proto/SCiJ0frl3dHwWcjXYVkCG8/MCR-Logbook-Wireframe-Sederhana?node-id=4-11&starting-point-node-id=4%3A11&t=TejXdYpNHhg5Mkb1-1)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Role-Based Access** | Separate access for MCR, Programming, and Guest roles |
| 📋 **Incident Logging** | Log and track on-air incidents with evidence upload |
| 📅 **Program Scheduling** | Manage weekly broadcast schedules with period filters |
| 📢 **Breaking News** | Record breaking news broadcast logs |
| 🎵 **Dangdut Playlist** | Manage dangdut program song playlists |
| 📨 **Titipan / Requests** | Submit and track special broadcast requests |
| 📊 **Export** | Export schedules to Excel (.xlsx) and PDF |
| 🔄 **Real-time Sync** | Auto-refresh across connected clients via polling |

---

## 🛠️ Tech Stack

- **Backend** — Node.js, Express.js
- **Database** — SQLite3
- **Frontend** — Vanilla HTML, CSS, JavaScript
- **Export** — excel4node, PDFKit
- **File Upload** — Multer

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/ganendrard/MCRLogbook.git
cd MCRLogbook

# Install dependencies
npm install

# Start development server
npm run dev
```

App will run at **http://localhost:3000**

---

## 👥 Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `MCR` | `mcr` | MCR Operator |
| `program` | `programming` | Programming |
| `other` | `other` | Other Staff |
| `guest` | `guest` | Guest (read-only) |

---

## 📁 Project Structure

```
MCRLogbook/
├── public/          # Static frontend files (HTML, CSS, JS)
│   └── uploads/     # Uploaded evidence files
├── server.js        # Express server & API routes
├── database.js      # SQLite database & schema
└── package.json
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/login` | User authentication |
| `GET/POST/DELETE` | `/api/incidents` | Incident management |
| `GET/POST/DELETE` | `/api/schedules` | Schedule management |
| `GET/POST` | `/api/requests` | Titipan/requests |
| `GET/POST/DELETE` | `/api/breaking-news` | Breaking news log |
| `GET/POST/DELETE` | `/api/dangdut` | Dangdut playlist |
| `GET` | `/api/export/schedules/excel` | Export to Excel |
| `GET` | `/api/export/schedules/pdf` | Export to PDF |

---

## 🌐 Deployment

This project is deployed on **Railway**.
SQLite is used as the database with persistent volume storage.

---

## 📝 License

This project was built as an internship project. For educational and portfolio purposes only.
