#  Digital Slam Book

A web-based digital autograph & slam book application built for collecting memories from friends and classmates. Designed with a public entry submission form and a password-protected admin dashboard so secret messages remain private.

---

##  Features

- **Public Autograph Form**: Friends can write personal memories, answer fun questions, and leave a paragraph.
- ** Secret Messages**: Supports optional secret messages with anonymous sender options.
- **Strict Privacy**: Visitors can submit memories, but cannot view anyone else's submissions or secrets.
- **Protected Owner Dashboard**: Access to entries (`/admin.html`) is secured with an Admin Passcode.
- **Dashboard Tools**: Search/filter entries by name or text, and delete unwanted entries.
- **Lightweight Storage**: Uses SQLite database to store all memories reliably.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express
- **Database**: SQLite (`better-sqlite3`)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Fetch API)

---

## 📁 Project Structure

```
digital-slam-book/
├── public/
│   ├── index.html       # Public submission form
│   └── admin.html       # Password-protected owner dashboard
├── .gitignore           # Git ignore configuration
├── package.json         # Dependencies and scripts
├── README.md            # Project documentation
├── server.js            # Express server & API endpoints
└── slambook.db          # Local SQLite database (auto-created)
```

---

## 🚀 Quick Start (Local Setup)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Open in browser**
   - **Public Autograph Page**: `http://localhost:3000`


---

## 🌐 Online Deployment (Free Hosting)

### Render (Recommended)
1. Push this project folder to your GitHub account.
2. Sign up on [Render.com](https://render.com) and click **New Web Service**.
3. Select your GitHub repository.
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add Environment Variable:
   - `ADMIN_PASSWORD` = `your_chosen_secret_password`
7. Click **Deploy**.
 CHECK AT THIS :https://digital-slam-book-3m8t.onrender.com/
---
