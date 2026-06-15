import sqlite3 from 'sqlite3';

const dbPath = 'C:\\Users\\wilia\\AppData\\Roaming\\com.anamorong.estoque\\estoque.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
    process.exit(1);
  }
});

db.all("SELECT * FROM tauri_migrations", [], (err, rows) => {
  if (err) {
    console.error('tauri_migrations err:', err.message);
    db.all("SELECT * FROM __tauri_migrations", [], (err2, rows2) => {
      if (err2) console.error('__tauri_migrations err:', err2.message);
      else console.log('__tauri_migrations:', rows2);
    });
  } else {
    console.log('tauri_migrations:', rows);
  }
});
