import sqlite3 from 'sqlite3';
import fs from 'fs';

const dbPath = 'C:\\Users\\wilia\\AppData\\Roaming\\com.anamorong.estoque\\estoque.db';
const db = new sqlite3.Database(dbPath);

const sql = fs.readFileSync('C:\\Users\\wilia\\OneDrive\\Documentos\\VOLTQ\\DRA ANA MORONG\\Controle de Estoque\\app\\src\\lib\\db\\migrations\\007_dashboard_notifications.sql', 'utf8');

db.exec(sql, (err) => {
  if (err) console.error("Error applying migration 007:", err);
  else console.log("Migration 007 applied successfully.");
});
