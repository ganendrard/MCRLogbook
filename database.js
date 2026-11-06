const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Menggunakan nama file baru (v6) untuk schema baru (day_of_week dangdut)
// v6 also stores schedule_periods persistently
const dbPath = path.resolve(__dirname, 'mcr_logbook_v6.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database (V6).');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Incidents Table
        db.run(`CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_day TEXT,
            incident_date TEXT,
            incident_time TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            evidence_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration to add incident_day column to existing database
        db.run(`ALTER TABLE incidents ADD COLUMN incident_day TEXT`, (err) => {
            // Kolom mungkin sudah ada, kita bisa mengabaikan errornya
        });

        // Migration to add incident_date column to existing database
        db.run(`ALTER TABLE incidents ADD COLUMN incident_date TEXT`, (err) => {
            // Kolom mungkin sudah ada, kita bisa mengabaikan errornya
        });

        // Schedules Table
        db.run(`CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week TEXT NOT NULL,
            program_time TEXT NOT NULL,
            program_name TEXT NOT NULL,
            rating TEXT,
            material_type TEXT,
            broadcast_type TEXT,
            is_replacement BOOLEAN DEFAULT 0,
            is_new BOOLEAN DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: make broadcast_type nullable if old schema had NOT NULL
        // SQLite doesn't support DROP/ALTER constraints, so we recreate the table
        db.run(`PRAGMA table_info(schedules)`, (err, rows) => {
            // Check is implicit: if table already exists with correct schema, skip
            // We use a safe workaround: try creating a temp table and migrate
        });
        db.run(`
            CREATE TABLE IF NOT EXISTS schedules_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day_of_week TEXT NOT NULL,
                program_time TEXT NOT NULL,
                program_name TEXT NOT NULL,
                rating TEXT,
                material_type TEXT,
                broadcast_type TEXT,
                is_replacement BOOLEAN DEFAULT 0,
                is_new BOOLEAN DEFAULT 0,
                start_date TEXT,
                end_date TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (!err) {
                // Copy all data from old schedules to schedules_v2
                db.run(`
                    INSERT OR IGNORE INTO schedules_v2
                    SELECT id, day_of_week, program_time, program_name,
                           rating, material_type, broadcast_type,
                           is_replacement, is_new, start_date, end_date, created_at
                    FROM schedules
                `, (err2) => {
                    if (!err2) {
                        // Replace old table with new one
                        db.serialize(() => {
                            db.run(`DROP TABLE IF EXISTS schedules_old`);
                            db.run(`ALTER TABLE schedules RENAME TO schedules_old`, (e) => {
                                if (!e) {
                                    db.run(`ALTER TABLE schedules_v2 RENAME TO schedules`, (e2) => {
                                        if (!e2) {
                                            db.run(`DROP TABLE IF EXISTS schedules_old`);
                                            console.log('Migration: broadcast_type is now optional.');
                                        }
                                    });
                                } else {
                                    // schedules_old already handled or schedules is already new schema
                                    db.run(`DROP TABLE IF EXISTS schedules_v2`);
                                }
                            });
                        });
                    }
                });
            }
        });

        // Requests Table (Titipan)
        db.run(`CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_date TEXT NOT NULL,
            target_time TEXT, -- Rentang waktu (opsional)
            request_type TEXT NOT NULL,
            details TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Breaking News Table
        db.run(`CREATE TABLE IF NOT EXISTS breaking_news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            broadcast_date TEXT NOT NULL,
            broadcast_time TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Dangdut Playlists Table (V6: pakai day_of_week)
        db.run(`CREATE TABLE IF NOT EXISTS dangdut_playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_date TEXT,
            day_of_week TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            song_list TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration to add playlist_date column to existing database
        db.run(`ALTER TABLE dangdut_playlists ADD COLUMN playlist_date TEXT`, (err) => {
            // Kolom mungkin sudah ada, kita bisa mengabaikan errornya
        });

        // Migration to add start_date and end_date columns to schedules
        db.run(
            `ALTER TABLE schedules ADD COLUMN start_date TEXT`,
            (err) => {}
        );
        db.run(
            `ALTER TABLE schedules ADD COLUMN end_date TEXT`,
            (err) => {}
        );

        // Schedule Periods Table - persists periods independently
        db.run(`CREATE TABLE IF NOT EXISTS schedule_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            label TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(start_date, end_date)
        )`);

        // Users Table for Authentication & Authorization
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`, () => {
            // Seed default users if table is empty
            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
                    stmt.run("MCR", "mcr", "MCR");
                    stmt.run("program", "programming", "Programming");
                    stmt.run("other", "other", "Other");
                    stmt.run("guest", "guest", "Guest");
                    stmt.finalize();
                    console.log('Default users seeded successfully.');
                }
            });
        });
        
        console.log('Database tables V6 verified/created successfully.');
    });
}

module.exports = db;
