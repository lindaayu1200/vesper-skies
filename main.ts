// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

function imageSize(bytes: Buffer, name: string): { width: number; height: number } {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.subarray(0, 8).equals(pngSignature)) {
    if (bytes.length < 33 || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error(`${name} is a truncated or malformed PNG`);
    }
    let offset = 8;
    let sawIhdr = false;
    let sawIend = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > bytes.length) throw new Error(`${name} is a truncated PNG`);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (type === 'IHDR') sawIhdr = true;
      if (type === 'IEND') {
        sawIend = true;
        if (end !== bytes.length) throw new Error(`${name} has data after PNG IEND`);
        break;
      }
      offset = end;
    }
    if (!sawIhdr || !sawIend) throw new Error(`${name} is not a whole PNG`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error(`${name} is not a PNG or JPEG`);
  }
  let offset = 2;
  let dimensions: { width: number; height: number } | undefined;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error(`${name} has malformed JPEG markers`);
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (offset !== bytes.length) throw new Error(`${name} has data after JPEG EOI`);
      if (!dimensions) throw new Error(`${name} has no JPEG dimensions`);
      return dimensions;
    }
    if (marker === 0xda) {
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      offset += length;
      while (offset + 1 < bytes.length) {
        if (bytes[offset++] !== 0xff) continue;
        const next = bytes[offset++];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) continue;
        offset -= 2;
        break;
      }
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (length < 7) throw new Error(`${name} has a malformed JPEG frame`);
      dimensions = { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error(`${name} is not a whole JPEG`);
}

function validateOutput(): void {
  const errors: string[] = [];
  const screenshotsDir = join(out, 'screenshots');
  let screenshotCount = 0;
  try {
    const entries = readdirSync(screenshotsDir, { withFileTypes: true });
    screenshotCount = entries.length;
    if (screenshotCount < 3 || screenshotCount > 4) errors.push(`screenshots contains ${screenshotCount} files; expected 3-4`);
    for (const entry of entries) {
      const name = entry.name;
      const path = join(screenshotsDir, name);
      if (!entry.isFile()) throw new Error(`${name} is not a whole image file`);
      const bytes = readFileSync(path);
      if (bytes.length >= 256 * 1024) throw new Error(`${name} is ${bytes.length} bytes; must be under 256 KiB`);
      const { width, height } = imageSize(bytes, name);
      const longSide = Math.max(width, height);
      const shortSide = Math.min(width, height);
      if (longSide > 1280 || shortSide < 480) {
        throw new Error(`${name} is ${width}x${height}; required long side <=1280 and short side >=480`);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const indexPath = join(out, 'game', 'index.html');
  try {
    const size = statSync(indexPath).size;
    if (size >= 1024 * 1024) throw new Error(`game/index.html is ${size} bytes; must be under 1 MiB`);
    console.log(`validate game/index.html: PASS (${size} bytes)`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    console.log('validate game/index.html: FAIL');
  }
  if (errors.length === 0) console.log(`validate screenshots: PASS (${screenshotCount} whole PNG/JPEG files)`);
  else console.log(`validate screenshots: FAIL (${screenshotCount} entries)`);
  if (errors.length > 0) {
    console.error(`Output validation failed: ${errors.join('; ')}`);
    process.exitCode = 1;
  }
}

validateOutput();
