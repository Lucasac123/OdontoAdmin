#!/usr/bin/env node
// Script to generate Android icon PNGs from source PNG using canvas
// Run: node scripts/generate-icons.mjs

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const sizes = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

async function main() {
  const src = join(ROOT, 'icon-source.png');
  const img = await loadImage(src);

  for (const { dir, size } of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const buf = canvas.toBuffer('image/png');
    const outDir = join(ROOT, 'android/app/src/main/res', dir);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'ic_launcher.png'), buf);
    writeFileSync(join(outDir, 'ic_launcher_round.png'), buf);
    console.log(`✅ Generated ${size}x${size} -> ${dir}`);
  }
  console.log('Done!');
}

main().catch(console.error);
