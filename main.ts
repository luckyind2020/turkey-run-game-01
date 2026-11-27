// Gobble Run — the hand-in program for make.fun's turkey escape game bounty.
// It copies game/ and screenshots/ from this repository to the output
// directory and writes /output/dossier.json with buildDossier from the
// vendored library. Standard library only; no network, no secrets.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });

// Copy the whole game and every screenshot, exactly as they ship.
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

// The dossier caps are this competition's gate: text capped at 160 KiB,
// at most 4 screenshots of at most 256 KiB each, game/ within its limits.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Gobble Run handed in: dossier.json (${dossier.length} bytes)`);
