import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasXcodeTools() {
  try {
    execFileSync("xcode-select", ["-p"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

console.log("Controle de Estoque - macOS build");
console.log("=================================\n");

if (process.platform !== "darwin") {
  console.log(`This build must run on macOS. Current platform: ${process.platform}`);
  console.log("Use this Windows machine to prepare the project, then run this command on the client's Mac:");
  console.log("npm run macos:build");
  process.exit(1);
}

if (!hasXcodeTools()) {
  console.log("Xcode Command Line Tools are missing. Run:");
  console.log("xcode-select --install");
  process.exit(1);
}

if (!existsSync("node_modules")) {
  console.log("Installing npm dependencies...");
  run("npm", ["install"]);
} else {
  console.log("npm dependencies already installed.");
}

console.log("\nRunning frontend production build...");
run("npm", ["run", "build"]);

console.log("\nBuilding macOS app and DMG...");
run("npm", ["run", "tauri:build:mac"]);

console.log("\nBuild finished.");
console.log("Check these folders:");
console.log("- src-tauri/target/release/bundle/macos");
console.log("- src-tauri/target/release/bundle/dmg");
console.log("\nIf macOS blocks the first launch, open System Settings > Privacy & Security and allow the app.");
