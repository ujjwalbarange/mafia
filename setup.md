# 🎭 Mafia Party Game — Setup Guide

## Prerequisites

- **Node.js** v18 or higher → [Download](https://nodejs.org)
- **MySQL** 8.0 or higher → [Download](https://dev.mysql.com/downloads/)
- A terminal (Command Prompt, PowerShell, or bash)

---

## Quick Start (under 10 minutes)

### 1. Database Setup

Open MySQL Workbench, phpMyAdmin, or your preferred MySQL client and run:

```sql
source sql/schema.sql
```

Or paste the contents of `sql/schema.sql` and execute.

Optional test data:
```sql
source sql/seed.sql
```

### 2. Environment Configuration

Copy the env template:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=mafia_game
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Start Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Server starts on `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Frontend starts on `http://localhost:5173`

### 5. Open the App

Open `http://localhost:5173` in your browser.

---

## How to Play

1. **Create a Room** — One person creates a room and gets a 6-character code
2. **Share the Code** — Others join using the code or share link
3. **Assign Roles** — Host assigns Impostor, Doctor, Police, and Civilian roles
4. **Night Phase** — Host guides through mafia kill, doctor save, and police investigation
5. **Day Phase** — Everyone discusses in person (the app is just the moderator!)
6. **Vote** — Official voting to eliminate a suspect
7. **Repeat** until impostors or civilians win

---

## Deployment

### Render / Railway

1. Push to a Git repository
2. Create a new Web Service
3. Set root directory to `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from `.env.example`
7. Deploy frontend separately as a static site (build with `npm run build`)

### VPS / Shared Hosting

1. Install Node.js and MySQL on the server
2. Clone the repository
3. Run the database schema
4. Set up `.env`
5. Install dependencies
6. Use PM2 or similar to run the backend:
   ```bash
   npm install -g pm2
   cd backend
   pm2 start server.js --name mafia-backend
   ```
7. Build and serve the frontend:
   ```bash
   cd frontend
   npm run build
   ```
   Serve the `dist` folder with Nginx or similar.

### Production Notes

- Set `NODE_ENV=production` in `.env`
- Update `CLIENT_URL` to your frontend domain
- Use a strong `SESSION_SECRET`
- Consider using HTTPS with a reverse proxy (Nginx/Caddy)

---

## Project Structure

```
mafia/
├── backend/
│   ├── server.js              # Express + Socket.IO entry
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js    # MySQL pool
│   │   │   └── constants.js   # Game constants
│   │   ├── models/            # Raw SQL models
│   │   ├── routes/            # REST API routes
│   │   ├── socket/            # Socket.IO handlers
│   │   ├── game/              # Game engine
│   │   └── utils/             # Helpers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # UI + game components
│   │   ├── pages/             # Page-level components
│   │   ├── context/           # React contexts
│   │   ├── utils/             # Socket client
│   │   └── index.css          # Design system
│   └── package.json
├── sql/
│   ├── schema.sql             # Database tables
│   └── seed.sql               # Test data
├── .env.example               # Environment template
├── setup.md                   # This file
├── api-docs.md                # REST API documentation
└── socket-events.md           # Socket event documentation
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MySQL connection failed | Check credentials in `.env`, ensure MySQL is running |
| Socket not connecting | Check CORS settings, ensure backend is on port 5000 |
| Blank page | Check browser console, ensure frontend deps installed |
| Players can't join | Ensure same network, check firewall settings |
