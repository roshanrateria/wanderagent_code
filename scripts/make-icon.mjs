// scripts/make-icon.mjs
// Convert client/icon.png to build/icon.ico if it doesn't already exist.
import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

const root = path.resolve();
const src = path.resolve(root, 'public', 'icon.png');
const outDir = path.resolve(root, 'build');
const out = path.resolve(outDir, 'icon.ico');

(async ()=>{
  if (!fs.existsSync(src)) {
    console.warn('No source icon at', src);
    process.exit(0);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    const buffer = await pngToIco(src);
    fs.writeFileSync(out, buffer);
    console.log('Wrote', out);
  } catch (e) {
    console.error('Failed to generate icon.ico', e);
    process.exit(1);
  }
})();
