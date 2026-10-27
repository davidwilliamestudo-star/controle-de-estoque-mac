const crypto = require('crypto');
const stored = 'pbkdf2_sha256$210000$qGqPtX1oM24qDlhaBi6QIQ==$xD2W//McPwaZ1Qfa3LtGPRxR21AXc3yFtSikohTga0w=';
const parts = stored.split('$');
const it = parseInt(parts[1]);
const salt = Buffer.from(parts[2], 'base64');
const expected = parts[3];

const candidates = [
  'Ana2026!',
  'ana2026!',
  'Ana2026',
  'ana2026',
  '123456',
  'admin',
  'admin123',
  'draanamorong',
  'DraAna2026!',
  'DraAnaMorong',
  'DraAnaMorong2026!',
  'Morong2026!',
  'DraAnaMorongClinic',
  'DraAnaClinicSecureKey2026!#',
  'Voltq2026!',
  'voltq',
  'password'
];

for (const c of candidates) {
  const derived = crypto.pbkdf2Sync(c, salt, it, 32, 'sha256').toString('base64');
  if (derived === expected) {
    console.log('MATCH FOUND:', c);
    process.exit(0);
  }
}
console.log('No candidate matched.');
