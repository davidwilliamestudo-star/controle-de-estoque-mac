const crypto = globalThis.crypto;

async function test() {
  const stored = 'pbkdf2_sha256$210000$D1o0rsNGe2aQ/YBYTbztZg==$yG6I9mTfYN2IqJeWGhRlLucJdb/yoqUw8afUG1xjcYU=';
  const parts = stored.split('$');
  const it = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'base64');
  const exp = parts[3];

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('Ana2026!'),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const t0 = performance.now();
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: it, hash: 'SHA-256' },
    key,
    256
  );
  const duration = performance.now() - t0;
  console.log(`WebCrypto took ${duration.toFixed(2)} ms`);
  console.log('Matches:', Buffer.from(bits).toString('base64') === exp);
}

test();
