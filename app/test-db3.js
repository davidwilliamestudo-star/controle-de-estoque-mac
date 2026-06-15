import sqlite3 from 'sqlite3';

const dbPath = 'C:\\Users\\wilia\\AppData\\Roaming\\com.anamorong.estoque\\estoque.db';
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
});
