import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(
  path.resolve('app/src/assets/contractLetterheadBase64.ts'),
  'utf8'
);
const out = path.resolve('scratch/letterhead');
fs.mkdirSync(out, { recursive: true });

const re = /export const (\w+)\s*=\s*['"`]([A-Za-z0-9+/=]+)['"`]/g;
let m;
while ((m = re.exec(src))) {
  const buf = Buffer.from(m[2], 'base64');
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const file = path.join(out, `${m[1]}.png`);
  fs.writeFileSync(file, buf);
  console.log(m[1], `${w}x${h}px`, `ratio=${(w / h).toFixed(4)}`, `A4 ratio=${(595.28 / 841.89).toFixed(4)}`, file, buf.length, 'bytes');
}
