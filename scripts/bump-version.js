#!/usr/bin/env node
const fs = require('fs');
const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/bump-version.js <version>');
  process.exit(1);
}

const cargoPath = 'src-tauri/Cargo.toml';
const cargo = fs.readFileSync(cargoPath, 'utf8');
fs.writeFileSync(cargoPath, cargo.replace(/^version = ".*"/m, `version = "${version}"`));

const tauriPath = 'src-tauri/tauri.conf.json';
const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
tauri.version = version;
fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');

console.log(`Bumped to ${version}: Cargo.toml, tauri.conf.json`);
