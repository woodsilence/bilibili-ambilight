import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const releasesDir = path.join(rootDir, 'releases');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '0.0.1';

if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

// Find Chrome or Edge executable
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browserExe = browserPaths.find((p) => fs.existsSync(p));
if (!browserExe) {
  console.error('Error: Could not find Google Chrome or Microsoft Edge to pack CRX.');
  process.exit(1);
}

const keyPath = path.join(releasesDir, 'bilibili-ambilight.pem');
const tempProfileDir = path.join(os.tmpdir(), `crx_pack_${Date.now()}`);

console.log(`Using browser: ${browserExe}`);
console.log('Packing CRX...');

let packCmd = `"${browserExe}" --pack-extension="${distDir}" --user-data-dir="${tempProfileDir}" --no-message-box`;
if (fs.existsSync(keyPath)) {
  packCmd += ` --pack-extension-key="${keyPath}"`;
}

try {
  execSync(packCmd, { stdio: 'ignore' });
} catch {
  // Browser exits with code 0 or ignores
}

// Chrome generates dist.crx and dist.pem in the parent directory of dist (i.e. rootDir)
const generatedCrx = path.join(rootDir, 'dist.crx');
const generatedPem = path.join(rootDir, 'dist.pem');

const targetCrx = path.join(releasesDir, `bilibili-ambilight-v${version}.crx`);
const latestCrx = path.join(releasesDir, 'bilibili-ambilight.crx');

if (fs.existsSync(generatedCrx)) {
  fs.copyFileSync(generatedCrx, targetCrx);
  fs.copyFileSync(generatedCrx, latestCrx);
  fs.unlinkSync(generatedCrx);

  if (fs.existsSync(generatedPem)) {
    if (!fs.existsSync(keyPath)) {
      fs.copyFileSync(generatedPem, keyPath);
    }
    fs.unlinkSync(generatedPem);
  }

  console.log(`CRX package created successfully:`);
  console.log(`  - ${targetCrx}`);
  console.log(`  - ${latestCrx}`);
} else {
  console.error('Failed to generate CRX file.');
}

// Also generate a zip archive
console.log('Generating ZIP archive...');
const targetZip = path.join(releasesDir, `bilibili-ambilight-v${version}.zip`);
const latestZip = path.join(releasesDir, 'bilibili-ambilight.zip');
try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${targetZip}' -Force"`,
    { stdio: 'inherit' }
  );
  fs.copyFileSync(targetZip, latestZip);
  console.log(`ZIP package created successfully:`);
  console.log(`  - ${targetZip}`);
  console.log(`  - ${latestZip}`);
} catch (err) {
  console.warn('Failed to create ZIP package:', err.message);
}
