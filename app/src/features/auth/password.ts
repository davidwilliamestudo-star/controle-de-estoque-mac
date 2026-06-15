const PASSWORD_ALGORITHM = "PBKDF2";
const HASH_ALGORITHM = "SHA-256";

function toBase64(bytes: ArrayBuffer): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  values.forEach(value => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const encodedPassword = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey(
    "raw",
    encodedPassword,
    PASSWORD_ALGORITHM,
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: PASSWORD_ALGORITHM,
      salt,
      iterations,
      hash: HASH_ALGORITHM,
    },
    key,
    256,
  );

  return toBase64(bits);
}

export async function hashPassword(password: string, iterations = 210000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${toBase64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, iterationsRaw, saltRaw, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !saltRaw || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100000) {
    return false;
  }

  const hash = await derivePasswordHash(password, fromBase64(saltRaw), iterations);
  return hash === expectedHash;
}

