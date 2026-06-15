#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

printf "Controle de Estoque - macOS build\n"
printf "=================================\n\n"

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf "This build must run on macOS. Current system: %s\n" "$(uname -s)"
  exit 1
fi

if ! xcode-select -p >/dev/null 2>&1; then
  printf "Xcode Command Line Tools are missing. Run:\n"
  printf "xcode-select --install\n"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  printf "Installing npm dependencies...\n"
  npm install
else
  printf "npm dependencies already installed.\n"
fi

printf "\nRunning frontend production build...\n"
npm run build

printf "\nBuilding macOS app and DMG...\n"
npm run tauri:build:mac

printf "\nBuild finished.\n"
printf "Check these folders:\n"
printf "- src-tauri/target/release/bundle/macos\n"
printf "- src-tauri/target/release/bundle/dmg\n"
printf "\nIf macOS blocks the first launch, open System Settings > Privacy & Security and allow the app.\n"
