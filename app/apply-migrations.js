import sqlite3 from 'sqlite3';
import fs from 'fs';

const dbPath = 'C:\\Users\\wilia\\AppData\\Roaming\\com.anamorong.estoque\\estoque.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
    process.exit(1);
  }
});

const migration007 = fs.readFileSync('C:\\Users\\wilia\\OneDrive\\Documentos\\VOLTQ\\DRA ANA MORONG\\Controle de Estoque\\app\\src\\lib\\db\\migrations\\007_dashboard_notifications.sql', 'utf8');
const migration008 = fs.readFileSync('C:\\Users\\wilia\\OneDrive\\Documentos\\VOLTQ\\DRA ANA MORONG\\Controle de Estoque\\app\\src\\lib\\db\\migrations\\008_patient_application_plans.sql', 'utf8');

db.serialize(() => {
  db.exec(migration007, (err) => {
    if (err) console.error('Error in 007:', err.message);
    else console.log('Applied 007');
  });

  db.exec(migration008, (err) => {
    if (err) console.error('Error in 008:', err.message);
    else console.log('Applied 008');
  });
});

db.close();
