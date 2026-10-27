import sqlite3 from 'sqlite3';

const dbPath = 'C:\\Users\\wilia\\AppData\\Roaming\\com.anamorong.estoque\\estoque.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
    process.exit(1);
  }
});

db.all("SELECT key, value FROM settings WHERE key LIKE '%appscript%' OR key LIKE '%google%'", [], (err, rows) => {
  if (err) {
    console.error('Query error:', err);
  } else {
    console.log('--- Settings in local SQLite ---');
    console.log(rows);
  }
  db.close();
});
