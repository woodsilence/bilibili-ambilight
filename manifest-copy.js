import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('./src/manifest.json', 'utf8'));
manifest.version = pkg.version || '0.0.1';

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}
fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
