#!/usr/bin/env node
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env'), debug: true });

console.log('Environment variables after loading .env:');
console.log('FOURSQUARE_API_KEY:', process.env.FOURSQUARE_API_KEY ? '[SET]' : '[NOT SET]');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '[SET]' : '[NOT SET]');
console.log('VITE_LOCAL_ONLY:', process.env.VITE_LOCAL_ONLY);

const whitelist = [
  'GEMINI_API_KEY',
  'FOURSQUARE_API_KEY',
  'FOURSQUARE_API_VERSION',
];

for (const key of whitelist) {
  const val = process.env[key];
  const viteKey = `VITE_${key}`;
  if (val && !process.env[viteKey]) {
    process.env[viteKey] = val;
    console.log(`Injected: ${viteKey} = ${val.slice(0, 10)}...`);
  }
}

// Force set VITE_LOCAL_ONLY to true for local builds
process.env.VITE_LOCAL_ONLY = 'true';
console.log('Set VITE_LOCAL_ONLY = true');

// Validate presence for local-no-server mode
const missing = [];
if (process.env.VITE_LOCAL_ONLY === 'true') {
  if (!process.env.VITE_FOURSQUARE_API_KEY) missing.push('FOURSQUARE_API_KEY');
  if (!process.env.VITE_GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
}
if (missing.length) {
  console.error(`Missing required keys in .env for local APK build: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Final environment variables for Vite build:');
console.log('VITE_LOCAL_ONLY:', process.env.VITE_LOCAL_ONLY);
console.log('VITE_FOURSQUARE_API_KEY:', process.env.VITE_FOURSQUARE_API_KEY ? '[SET]' : '[NOT SET]');
console.log('VITE_GEMINI_API_KEY:', process.env.VITE_GEMINI_API_KEY ? '[SET]' : '[NOT SET]');

const isWin = process.platform === 'win32';
const exe = isWin ? 'npm.cmd' : 'npm';
const args = ['run', 'build:client'];

console.log('Running Vite build...');
const res = spawnSync(exe, args, { stdio: 'inherit', env: process.env, shell: isWin });
console.log(`Build completed with exit code: ${res.status}`);
process.exit(res.status ?? 0);
