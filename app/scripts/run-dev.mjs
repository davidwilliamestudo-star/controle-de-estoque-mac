import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

// 1. Ensure WinLibs MinGW is in PATH
const mingwBin = 'C:\\Users\\wilia\\AppData\\Local\\Microsoft\\WinGet\\Packages\\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\\mingw64\\bin';
let currentPath = process.env.PATH || '';
if (existsSync(mingwBin) && !currentPath.includes(mingwBin)) {
  process.env.PATH = `${currentPath};${mingwBin}`;
}

// 2. Free port 1420 if still held by an old process
if (isWindows) {
  try {
    const portCmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`;
    const pids = execSync(portCmd, { encoding: 'utf-8' }).trim().split(/\r?\n/).filter(Boolean);
    for (const pidStr of pids) {
      const pid = parseInt(pidStr.trim(), 10);
      if (pid && pid !== process.pid) {
        console.log(`Liberando porta 1420 (encerrando processo PID ${pid})...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
    }
  } catch {}
}

// 3. If path has spaces on Windows, map virtual drive (X:) to avoid GNU windres space issue
let targetDir = appDir;
if (isWindows && appDir.includes(' ')) {
  const driveLetter = 'X:';
  try {
    try {
      execSync(`subst ${driveLetter} "${path.resolve(appDir, '..')}"`, { stdio: 'ignore' });
    } catch {}
    targetDir = `${driveLetter}\\app`;
  } catch (err) {
    console.warn('Aviso mapeando unidade virtual:', err);
  }
}

console.log(`🚀 Iniciando Tauri Dev a partir de: ${targetDir}`);

const isBuild = process.argv.includes('--build');
const args = isBuild ? ['tauri', 'build'] : ['tauri', 'dev'];

const child = spawn('npx', args, {
  cwd: targetDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
