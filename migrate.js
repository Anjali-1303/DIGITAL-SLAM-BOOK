// Migration script: transfers local SQLite entries to Cloud PostgreSQL
const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is required to migrate.');
    console.log('Usage: DATABASE_URL=postgres://... node migrate.js');
    process.exit(1);
}

const sqliteDb = new Database(path.join(__dirname, 'slambook.db'));
const pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    console.log('📦 Reading entries from local slambook.db...');
    let localEntries = [];
    try {
        localEntries = sqliteDb.prepare('SELECT * FROM entries').all();
    } catch (e) {
        console.error('Error reading local SQLite entries:', e.message);
    }

    console.log(`Found ${localEntries.length} local entries.`);

    if (localEntries.length === 0) {
        console.log('No local entries to migrate.');
        process.exit(0);
    }

    console.log('🚀 Connecting to Cloud PostgreSQL...');
    await pgPool.query(`
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
    `);

    let migrated = 0;
    for (const entry of localEntries) {
        try {
            await pgPool.query(
                `INSERT INTO entries(name, phone, paragraph, secret, q1, q2, q3, anonymous, selfie, created_at)
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    entry.name,
                    entry.phone,
                    entry.paragraph,
                    entry.secret,
                    entry.q1,
                    entry.q2,
                    entry.q3,
                    entry.anonymous ? 1 : 0,
                    entry.selfie || null,
                    entry.created_at ? new Date(entry.created_at) : new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`Failed to migrate entry ${entry.name}:`, err.message);
        }
    }

    console.log(`✅ Successfully migrated ${migrated}/${localEntries.length} entries to Cloud PostgreSQL!`);
    await pgPool.end();
}

migrate();
