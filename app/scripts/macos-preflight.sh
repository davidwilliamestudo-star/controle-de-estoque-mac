#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

failures=0

check_command() {
  local command_name="$1"
  local install_hint="$2"

  if command -v "$command_name" >/dev/null 2>&1; then
    printf "[ok] %s: " "$command_name"
    "$command_name" --version 2>/dev/null || "$command_name" -v 2>/dev/null || true
  else
    printf "[missing] %s\n" "$command_name"
    printf "          %s\n" "$install_hint"
    failures=$((failures + 1))
  fi
}

printf "Controle de Estoque - macOS preflight\n"
printf "=====================================\n\n"

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf "[warning] This script is intended to run on macOS. Current system: %s\n\n" "$(uname -s)"
fi

printf "Machine architecture: %s\n\n" "$(uname -m)"

if xcode-select -p >/dev/null 2>&1; then
  printf "[ok] Xcode Command Line Tools: %s\n" "$(xcode-select -p)"
else
  printf "[missing] Xcode Command Line Tools\n"
  printf "          Run: xcode-select --install\n"
  failures=$((failures + 1))
fi

check_command "node" "Install Node.js LTS from https://nodejs.org/"
check_command "npm" "Install Node.js LTS from https://nodejs.org/"
check_command "rustc" "Install Rust with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
check_command "cargo" "Install Rust with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

printf "\nProject checks\n"
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('[ok] package.json and tauri.conf.json are valid JSON')"

if [[ -f "src-tauri/icons/icon.icns" ]]; then
  printf "[ok] macOS icon found: src-tauri/icons/icon.icns\n"
else
  printf "[missing] macOS icon: src-tauri/icons/icon.icns\n"
  failures=$((failures + 1))
fi

printf "\nNative plugins declared by Cargo/Tauri should be validated after install:\n"
printf "- SQL / SQLite\n"
printf "- filesystem backup and restore\n"
printf "- native open/save dialogs\n"
printf "- clipboard\n"
printf "- notifications\n"
printf "- opener\n"

if [[ "$failures" -gt 0 ]]; then
  printf "\nPreflight finished with %s missing requirement(s).\n" "$failures"
  exit 1
fi

printf "\nPreflight passed. Next command:\n"
printf "bash scripts/macos-build.sh\n"
