import fs from 'node:fs/promises';
import path from 'node:path';
import { restyle } from './atlas-palette.mjs';

// Recolors the bundled atlas SVGs in place (safe to run twice). `npm run fetch-atlas` does the same on import.
const dir = 'src/renderer/public/images/atlas';
for (const file of (await fs.readdir(dir)).filter(f => f.endsWith('.svg'))) {
  const full = path.join(dir, file);
  const svg = await fs.readFile(full, 'utf8');
  const next = restyle(svg);
  if (next !== svg) await fs.writeFile(full, next);
}
