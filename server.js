const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const xl = require('excel4node');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const fs = require('fs');

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// --- Authentication & Role Middleware ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    db.get(
        "SELECT username, role FROM users " +
        "WHERE LOWER(username) = LOWER(?) AND password = ?",
        [username, password],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (row) {
                res.json({
                    success: true,
                    user: { username: row.username, role: row.role }
                });
            } else {
                res.status(401).json({ error: 'Username atau password salah!' });
            }
        }
    );
});

function checkRole(allowedRoles) {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'] || 'Guest';
        const hasAccess = allowedRoles.map(r => r.toLowerCase()).includes(userRole.toLowerCase());
        
        if (hasAccess) {
            next();
        } else {
            res.status(403).json({
                error: 'Akses ditolak: Anda tidak memiliki wewenang ' +
                       'untuk melakukan tindakan ini.'
            });
        }
    };
}

// --- Polling Logic ---
let globalLastUpdate = Date.now();

function markUpdated() {
    globalLastUpdate = Date.now();
}

app.get('/api/latest-updates', (req, res) => {
    const since = parseInt(req.query.since || 0);
    const hasUpdates = globalLastUpdate > since;
    res.json({ hasUpdates, timestamp: globalLastUpdate });
});

// --- API Endpoints ---

// 1. Incidents
app.get('/api/incidents', (req, res) => {
    db.all("SELECT * FROM incidents ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/incidents', checkRole(['MCR']), upload.single('evidence'), (req, res) => {
    const { incident_day, incident_date, incident_time, category, description } = req.body;
    let evidence_path = null;
    if (req.file) {
        // Simpan path relatif ke folder public
        evidence_path = '/uploads/' + req.file.filename;
    }

    const insertIncidentSql = `
        INSERT INTO incidents (
            incident_day, incident_date, incident_time,
            category, description, evidence_path
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        insertIncidentSql,
        [
            incident_day, incident_date, incident_time,
            category, description, evidence_path
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            markUpdated();
            res.json({ id: this.lastID, message: 'Incident added successfully' });
        }
    );
});

app.delete('/api/incidents/:id', checkRole(['MCR']), (req, res) => {
    db.run(`DELETE FROM incidents WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        markUpdated();
        res.json({ message: 'Incident deleted successfully' });
    });
});

// 2. Schedules
app.get('/api/schedules', (req, res) => {
    const { start_date, end_date } = req.query;
    let query = "SELECT * FROM schedules";
    let params = [];
    
    if (start_date && end_date) {
        query += " WHERE start_date = ? AND end_date = ?";
        params = [start_date, end_date];
    }
    query += " ORDER BY program_time ASC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/schedules/periods', (req, res) => {
    // Merge persisted periods + periods implied from schedule entries
    const sql = `
        SELECT start_date, end_date FROM schedule_periods
        WHERE start_date IS NOT NULL AND end_date IS NOT NULL
        UNION
        SELECT DISTINCT start_date, end_date FROM schedules
        WHERE start_date IS NOT NULL AND end_date IS NOT NULL
        ORDER BY start_date DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Save a new schedule period (Programming only)
app.post('/api/schedule-periods', checkRole(['Programming']), (req, res) => {
    const { start_date, end_date, label } = req.body;
    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date required' });
    }
    if (start_date > end_date) {
        return res.status(400).json(
            { error: 'start_date must not be after end_date' }
        );
    }
    db.run(
        `INSERT OR IGNORE INTO schedule_periods
         (start_date, end_date, label) VALUES (?, ?, ?)`,
        [start_date, end_date, label || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Period saved successfully' });
        }
    );
});

app.post('/api/schedules', checkRole(['Programming']), (req, res) => {
    const {
        days, day_of_week, program_time, program_name,
        rating, material_type, broadcast_type,
        is_replacement, is_new, start_date, end_date
    } = req.body;
    
    const targetDays = Array.isArray(days) ? days : [day_of_week || 'Senin'];

    db.serialize(() => {
        let errorOccurred = null;
        const insertScheduleSql = `
            INSERT INTO schedules (
                day_of_week, program_time, program_name,
                rating, material_type, broadcast_type,
                is_replacement, is_new, start_date, end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const stmt = db.prepare(insertScheduleSql);
        
        targetDays.forEach(day => {
            stmt.run(
                day, program_time, program_name,
                rating || null, material_type || null,
                broadcast_type || null,
                is_replacement ? 1 : 0, is_new ? 1 : 0,
                start_date || null, end_date || null,
                (err) => {
                    if (err) errorOccurred = err;
                }
            );
        });
        
        stmt.finalize((err) => {
            const finalErr = err || errorOccurred;
            if (finalErr) {
                return res.status(500).json({ error: finalErr.message });
            }
            markUpdated();
            res.json({ message: 'Schedules added successfully' });
        });
    });
});
app.delete('/api/schedules/:id', checkRole(['Programming']), (req, res) => {
    db.run(`DELETE FROM schedules WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        markUpdated();
        res.json({ message: 'Schedule deleted successfully' });
    });
});

// 3. Requests (Titipan)
app.get('/api/requests', (req, res) => {
    db.all("SELECT * FROM requests ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/requests', checkRole(['Other', 'MCR', 'Programming']), (req, res) => {
    const { target_date, target_time, request_type, details } = req.body;
    db.run(`INSERT INTO requests (target_date, target_time, request_type, details) VALUES (?, ?, ?, ?)`,
        [target_date, target_time, request_type, details], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            markUpdated();
            res.json({ id: this.lastID, message: 'Request added successfully' });
        });
});
app.put('/api/requests/:id/read', checkRole(['MCR']), (req, res) => {
    db.run(`UPDATE requests SET is_read = 1 WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        markUpdated();
        res.json({ message: 'Request marked as read' });
    });
});

// 4. Breaking News
app.get('/api/breaking-news', (req, res) => {
    db.all("SELECT * FROM breaking_news ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/breaking-news', checkRole(['MCR']), (req, res) => {
    const { broadcast_date, broadcast_time, content } = req.body;
    db.run(`INSERT INTO breaking_news (broadcast_date, broadcast_time, content) VALUES (?, ?, ?)`,
        [broadcast_date, broadcast_time, content], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            markUpdated();
            res.json({ id: this.lastID, message: 'Breaking news added successfully' });
        });
});

app.delete('/api/breaking-news/:id', checkRole(['MCR']), (req, res) => {
    db.run(`DELETE FROM breaking_news WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        markUpdated();
        res.json({ message: 'Breaking news deleted successfully' });
    });
});

// 5. Dangdut Playlists
app.get('/api/dangdut', (req, res) => {
    db.all("SELECT * FROM dangdut_playlists ORDER BY day_of_week ASC, created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/dangdut', checkRole(['Programming']), (req, res) => {
    const { playlist_date, day_of_week, time_slot, song_list } = req.body;
    db.serialize(() => {
        db.run(
            "DELETE FROM dangdut_playlists " +
            "WHERE playlist_date = ? AND time_slot = ?",
            [playlist_date, time_slot]
        );
        db.run(
            "INSERT INTO dangdut_playlists (" +
            "playlist_date, day_of_week, time_slot, song_list" +
            ") VALUES (?, ?, ?, ?)",
            [playlist_date, day_of_week, time_slot, song_list],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                markUpdated();
                res.json({ 
                    id: this.lastID, 
                    message: 'Dangdut playlist added successfully' 
                });
            }
        );
    });
});
app.delete('/api/dangdut/:id', checkRole(['Programming']), (req, res) => {
    db.run(`DELETE FROM dangdut_playlists WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        markUpdated();
        res.json({ message: 'Playlist deleted successfully' });
    });
});

// --- Export Endpoints ---

app.get('/api/export/schedules/excel', (req, res) => {
    const { start_date, end_date } = req.query;
    let query = "SELECT * FROM schedules";
    let params = [];
    if (start_date && end_date) {
        query += " WHERE start_date = ? AND end_date = ?";
        params = [start_date, end_date];
    }
    query += " ORDER BY day_of_week ASC, program_time ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet('Daily Schedule');

        const headerStyle = wb.createStyle({
            font: { bold: true, color: '#FFFFFF' },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                fgColor: '#0052CC'
            }
        });

        const headers = [
            'Hari', 'Waktu', 'Nama Program', 'Rating',
            'Material', 'Tipe Siaran', 'Status Khusus'
        ];
        headers.forEach((header, index) => {
            ws.cell(1, index + 1).string(header).style(headerStyle);
        });

        rows.forEach((row, rowIndex) => {
            let status = 'Reguler';
            if (row.is_replacement) status = 'Program Pengganti';
            if (row.is_new) status = 'Program Baru';

            ws.cell(rowIndex + 2, 1).string(row.day_of_week);
            ws.cell(rowIndex + 2, 2).string(row.program_time);
            ws.cell(rowIndex + 2, 3).string(row.program_name);
            ws.cell(rowIndex + 2, 4).string(row.rating);
            ws.cell(rowIndex + 2, 5).string(row.material_type);
            ws.cell(rowIndex + 2, 6).string(row.broadcast_type);
            ws.cell(rowIndex + 2, 7).string(status);
        });

        wb.write('Weekly_Schedule.xlsx', res);
    });
});

app.get('/api/export/schedules/pdf', (req, res) => {
    const { start_date, end_date } = req.query;
    let query = "SELECT * FROM schedules";
    let params = [];
    if (start_date && end_date) {
        query += " WHERE start_date = ? AND end_date = ?";
        params = [start_date, end_date];
    }
    query += " ORDER BY day_of_week ASC, program_time ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const doc = new PDFDocument();
        res.setHeader(
            'Content-disposition', 
            'attachment; filename=Weekly_Schedule.pdf'
        );
        res.setHeader('Content-type', 'application/pdf');
        
        doc.pipe(res);
        doc.fontSize(20).text('MCR Weekly Schedule', { align: 'center' });
        doc.moveDown();
        
        rows.forEach((row) => {
            let status = '';
            if (row.is_replacement) status = '(Pengganti)';
            if (row.is_new) status = '(Baru)';
            
            const scheduleText = 
                `[${row.day_of_week} ${row.program_time}] ` +
                `${row.program_name} ${status}`;
            doc.fontSize(12).text(scheduleText);
            doc.moveDown(0.3);
        });
        
        doc.end();
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
