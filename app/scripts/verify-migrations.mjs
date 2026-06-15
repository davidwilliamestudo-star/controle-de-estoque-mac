import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(appRoot, "src", "lib", "db", "migrations");
const manifestPath = path.join(migrationsDir, "MIGRATIONS_SHA384.json");

function sha384(buffer) {
  return createHash("sha384").update(buffer).digest("hex").toUpperCase();
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const migrations = manifest.migrations ?? [];
const seenVersions = new Set();
const seenFiles = new Set();

for (const migration of migrations) {
  if (seenVersions.has(migration.version)) {
    fail(`Migration duplicada no manifesto: versao ${migration.version}`);
    continue;
  }
  seenVersions.add(migration.version);
  seenFiles.add(migration.file);

  const filePath = path.join(migrationsDir, migration.file);
  let content;
  try {
    content = await readFile(filePath);
  } catch {
    fail(`Migration listada no manifesto nao existe: ${migration.file}`);
    continue;
  }

  const actual = sha384(content);
  if (actual !== migration.sha384) {
    fail([
      `Checksum alterado para ${migration.file}.`,
      `  esperado: ${migration.sha384}`,
      `  atual:    ${actual}`,
      "Migrations aplicadas sao imutaveis; crie uma nova migration em vez de editar esta.",
    ].join("\n"));
  }
}

const sqlFiles = (await readdir(migrationsDir))
  .filter((file) => /^\d+_.*\.sql$/u.test(file))
  .sort();

for (const file of sqlFiles) {
  if (!seenFiles.has(file)) {
    fail(`Migration SQL ausente do manifesto: ${file}`);
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`Migrations verificadas: ${migrations.length} arquivo(s), SHA-384 OK.`);
