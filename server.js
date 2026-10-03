const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Admin password configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'anjali123';

// Database selection: PostgreSQL if DATABASE_URL is set, fallback to SQLite locally
const usePostgres = !!process.env.DATABASE_URL;
let db = null;
let pgPool = null;

if (usePostgres) {
    console.log('Connecting to Cloud PostgreSQL Database...');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    // Auto-create PostgreSQL table
    pgPool.query(`
        CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            paragraph TEXT NOT NULL,
            secret TEXT NOT NULL,
            q1 TEXT NOT NULL,
            q2 TEXT NOT NULL,
            q3 TEXT NOT NULL,
            anonymous INTEGER DEFAULT 0,
            selfie TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `).catch(err => console.error('Error initializing PostgreSQL table:', err));
} else {
    console.log('Connecting to local SQLite Database...');
    const Database = require('better-sqlite3');
    db = new Database(path.join(__dirname, 'slambook.db'));
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
        selfie TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    try {
        db.exec(`ALTER TABLE entries ADD COLUMN selfie TEXT`);
    } catch (e) {
        // Column already exists
    }
}

app.use(express.json({ limit: '10mb' }));
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
app.post('/api/entries', async (req, res) => {
    const { name, phone, paragraph, secret, q1, q2, q3, anonymous, selfie } = req.body || {};
    if (![name, phone, paragraph, secret, q1, q2, q3].every(x => typeof x === 'string' && x.trim())) {
        return res.status(400).json({ error: 'Please fill out all required text fields.' });
    }
    if (!selfie || typeof selfie !== 'string' || !selfie.startsWith('data:image')) {
        return res.status(400).json({ error: 'Please take or upload a selfie for identity verification!' });
    }

    try {
        if (usePostgres) {
            const result = await pgPool.query(
                'INSERT INTO entries(name, phone, paragraph, secret, q1, q2, q3, anonymous, selfie) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
                [name.trim(), phone.trim(), paragraph.trim(), secret.trim(), q1.trim(), q2.trim(), q3.trim(), anonymous ? 1 : 0, selfie]
            );
            res.json({ ok: true, id: result.rows[0].id });
        } else {
            const stmt = db.prepare('INSERT INTO entries(name, phone, paragraph, secret, q1, q2, q3, anonymous, selfie) VALUES(?,?,?,?,?,?,?,?,?)');
            const info = stmt.run(name.trim(), phone.trim(), paragraph.trim(), secret.trim(), q1.trim(), q2.trim(), q3.trim(), anonymous ? 1 : 0, selfie);
            res.json({ ok: true, id: info.lastInsertRowid });
        }
    } catch (err) {
        console.error('Error inserting entry:', err);
        res.status(500).json({ error: 'Failed to save entry' });
    }
});

// Admin-only route to get all entries
app.get('/api/entries', requireAdmin, async (req, res) => {
    try {
        if (usePostgres) {
            const result = await pgPool.query('SELECT * FROM entries ORDER BY id DESC');
            res.json(result.rows);
        } else {
            const entries = db.prepare('SELECT * FROM entries ORDER BY id DESC').all();
            res.json(entries);
        }
    } catch (err) {
        console.error('Error fetching entries:', err);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Admin-only route to delete an entry
app.delete('/api/entries/:id', requireAdmin, async (req, res) => {
    try {
        if (usePostgres) {
            const result = await pgPool.query('DELETE FROM entries WHERE id = $1', [req.params.id]);
            res.json({ ok: true, deleted: result.rowCount > 0 });
        } else {
            const info = db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
            res.json({ ok: true, deleted: info.changes > 0 });
        }
    } catch (err) {
        console.error('Error deleting entry:', err);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Slam Book running on http://localhost:${PORT}`));
