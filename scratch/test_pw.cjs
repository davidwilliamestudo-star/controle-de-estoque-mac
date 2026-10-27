const crypto = require('crypto');
const stored = 'pbkdf2_sha256$210000$D1o0rsNGe2aQ/YBYTbztZg==$yG6I9mTfYN2IqJeWGhRlLucJdb/yoqUw8afUG1xjcYU=';
const parts = stored.split('$');
console.log('Parts:', parts);
const it = parseInt(parts[1]);
const salt = Buffer.from(parts[2], 'base64');
const expected = parts[3];
const derived = crypto.pbkdf2Sync('Ana2026!', salt, it, 32, 'sha256').toString('base64');
console.log('Matches Ana2026!:', derived === expected);
