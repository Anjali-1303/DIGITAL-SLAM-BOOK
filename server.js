const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'slambook.db'));

// Admin password configuration (default: anjali123 if not set in environment)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'anjali123';

db.exec(`CREATE TABLE IF NOT EXISTS entries(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    paragraph TEXT NOT NULL,
    secret TEXT NOT NULL,
    q1 TEXT NOT NULL,
    q2 TEXT NOT NULL,
    q3 TEXT NOT NULL,
    anonymous INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const passHeader = req.headers['x-admin-password'];
    const providedPass = passHeader || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!providedPass || providedPass !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized access. Incorrect or missing admin password.' });
    }
    next();
}

// Admin login verification route
app.post('/api/login', (req, res) => {
    const { password } = req.body || {};
    if (password && password === ADMIN_PASSWORD) {
        return res.json({ ok: true, token: ADMIN_PASSWORD });
    }
    return res.status(401).json({ error: 'Incorrect password' });
});

// Public submission route
app.post('/api/entries', (req, res) => {
    const { name, phone, paragraph, secret, q1, q2, q3, anonymous } = req.body || {};
    if (![name, phone, paragraph, secret, q1, q2, q3].every(x => typeof x === 'string' && x.trim())) {
        return res.status(400).json({ error: 'Please fill out all required fields.' });
    }
    const stmt = db.prepare('INSERT INTO entries(name, phone, paragraph, secret, q1, q2, q3, anonymous) VALUES(?,?,?,?,?,?,?,?)');
    const info = stmt.run(name.trim(), phone.trim(), paragraph.trim(), secret.trim(), q1.trim(), q2.trim(), q3.trim(), anonymous ? 1 : 0);
    res.json({ ok: true, id: info.lastInsertRowid });
});

// Admin-only route to get all entries
app.get('/api/entries', requireAdmin, (req, res) => {
    const entries = db.prepare('SELECT * FROM entries ORDER BY id DESC').all();
    res.json(entries);
});

// Admin-only route to delete an entry
app.delete('/api/entries/:id', requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
    res.json({ ok: true, deleted: info.changes > 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Slam Book running on http://localhost:${PORT}`));

