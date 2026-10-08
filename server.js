const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Admin password configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'anjali123';

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/slambook';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define Schema
const entrySchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    paragraph: { type: String, required: true },
    secret: { type: String, required: true },
    q1: { type: String, required: true },
    q2: { type: String, required: true },
    q3: { type: String, required: true },
    anonymous: { type: Number, default: 0 },
    selfie: { type: String },
    created_at: { type: Date, default: Date.now }
});

const Entry = mongoose.model('Entry', entrySchema);

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
        const newEntry = new Entry({
            name: name.trim(),
            phone: phone.trim(),
            paragraph: paragraph.trim(),
            secret: secret.trim(),
            q1: q1.trim(),
            q2: q2.trim(),
            q3: q3.trim(),
            anonymous: anonymous ? 1 : 0,
            selfie
        });
        const savedEntry = await newEntry.save();
        res.json({ ok: true, id: savedEntry._id });
    } catch (err) {
        console.error('Error inserting entry:', err);
        res.status(500).json({ error: 'Failed to save entry' });
    }
});

// Admin-only route to get all entries
app.get('/api/entries', requireAdmin, async (req, res) => {
    try {
        const entries = await Entry.find().sort({ _id: -1 });
        // Map _id to id to maintain frontend compatibility if it relies on 'id' instead of '_id'
        const formattedEntries = entries.map(entry => {
            const obj = entry.toObject();
            obj.id = obj._id;
            return obj;
        });
        res.json(formattedEntries);
    } catch (err) {
        console.error('Error fetching entries:', err);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Admin-only route to delete an entry
app.delete('/api/entries/:id', requireAdmin, async (req, res) => {
    try {
        const result = await Entry.findByIdAndDelete(req.params.id);
        res.json({ ok: true, deleted: !!result });
    } catch (err) {
        console.error('Error deleting entry:', err);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => console.log(`Slam Book running on http://localhost:${PORT}`));
}

module.exports = app;
