import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

let failures = 0;

function commandOutput(command, args = []) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function checkCommand(command, args, installHint, label = command) {
  const output = commandOutput(command, args);

  if (output) {
    console.log(`[ok] ${label}: ${output.split("\n")[0]}`);
    return;
  }

  console.log(`[missing] ${label}`);
  console.log(`          ${installHint}`);
  failures += 1;
}

console.log("Controle de Estoque - macOS preflight");
console.log("=====================================\n");

if (process.platform !== "darwin") {
  console.log(`[warning] This preflight is intended for macOS. Current platform: ${process.platform}`);
  console.log("[warning] The final .app/.dmg build still needs to run on a real Mac.\n");
}

const npmCommand = process.platform === "win32" ? "cmd" : "npm";
const npmArgs = process.platform === "win32" ? ["/c", "npm", "-v"] : ["-v"];

console.log(`Node.js: ${process.version}`);
checkCommand(npmCommand, npmArgs, "Install Node.js LTS from https://nodejs.org/", "npm");
checkCommand("rustc", ["-V"], "Install Rust with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh");
checkCommand("cargo", ["-V"], "Install Rust with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh");

if (process.platform === "darwin") {
  const xcodePath = commandOutput("xcode-select", ["-p"]);
  if (xcodePath) {
    console.log(`[ok] Xcode Command Line Tools: ${xcodePath}`);
  } else {
    console.log("[missing] Xcode Command Line Tools");
    console.log("          Run: xcode-select --install");
    failures += 1;
  }
}

console.log("\nProject checks");

try {
  JSON.parse(readFileSync("package.json", "utf8"));
  JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  console.log("[ok] package.json and tauri.conf.json are valid JSON");
} catch (error) {
  console.log(`[missing] Project JSON parse failed: ${error.message}`);
  failures += 1;
}

if (existsSync("src-tauri/icons/icon.icns")) {
  console.log("[ok] macOS icon found: src-tauri/icons/icon.icns");
} else {
  console.log("[missing] macOS icon: src-tauri/icons/icon.icns");
  failures += 1;
}

console.log("\nNative plugins to validate after install:");
console.log("- SQL / SQLite");
console.log("- filesystem backup and restore");
console.log("- native open/save dialogs");
console.log("- clipboard");
console.log("- notifications");
console.log("- opener");

if (failures > 0) {
  console.log(`\nPreflight finished with ${failures} missing requirement(s).`);
  process.exit(1);
}

console.log("\nPreflight passed.");
console.log("On macOS, next command: npm run macos:build");
