// ai-excited-01-entry-ris v6: Ultra-Kinetic Blast & Fracture (Deterministic Node.js Renderer)
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const WIDTH = 800;
const HEIGHT = 800;
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || 'out1';

// Seeded PRNG (Mulberry32) for absolute determinism
let seed = 998244353;
function random(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomRange(min: number, max: number): number {
  return min + random() * (max - min);
}

const buffer = Buffer.alloc(WIDTH * HEIGHT * 4);

function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const idx = (y * WIDTH + x) * 4;
  const alpha = a / 255;
  if (alpha >= 1) {
    buffer[idx] = r;
    buffer[idx + 1] = g;
    buffer[idx + 2] = b;
    buffer[idx + 3] = 255;
  } else if (alpha > 0) {
    const prevA = buffer[idx + 3] / 255;
    const outA = alpha + prevA * (1 - alpha);
    if (outA > 0) {
      buffer[idx] = Math.round((r * alpha + buffer[idx] * prevA * (1 - alpha)) / outA);
      buffer[idx + 1] = Math.round((g * alpha + buffer[idx + 1] * prevA * (1 - alpha)) / outA);
      buffer[idx + 2] = Math.round((b * alpha + buffer[idx + 2] * prevA * (1 - alpha)) / outA);
      buffer[idx + 3] = Math.round(outA * 255);
    }
  }
}

function drawCircle(cx: number, cy: number, radius: number, r: number, g: number, b: number, maxA: number) {
  const xMin = Math.max(0, Math.floor(cx - radius - 2));
  const xMax = Math.min(WIDTH - 1, Math.ceil(cx + radius + 2));
  const yMin = Math.max(0, Math.floor(cy - radius - 2));
  const yMax = Math.min(HEIGHT - 1, Math.ceil(cy + radius + 2));

  for (let py = yMin; py <= yMax; py++) {
    for (let px = xMin; px <= xMax; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const factor = 1 - (dist / radius);
        const a = maxA * (factor * factor * (3 - 2 * factor));
        setPixel(px, py, r, g, b, a);
      }
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, baseA: number, thickness: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const steps = Math.ceil(len * 1.5);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    drawCircle(px, py, thickness, r, g, b, baseA);
  }
}

function renderBackgroundAndBlast() {
  const cx = 400;
  const cy = 330; // Off-center core

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Violent asymmetric shockwave glow and starfield background
      const rayBurst = Math.max(0, Math.cos(angle * 7 + dist * 0.01)) * 40;
      const coreGlow = Math.max(0, 1 - dist / 450) * 120;
      
      const rVal = Math.floor(10 + coreGlow * 1.2 + rayBurst);
      const gVal = Math.floor(5 + coreGlow * 0.4 + rayBurst * 0.5);
      const bVal = Math.floor(20 + coreGlow * 1.5 + rayBurst * 1.2);

      buffer[(y * WIDTH + x) * 4] = Math.min(255, rVal);
      buffer[(y * WIDTH + x) * 4 + 1] = Math.min(255, gVal);
      buffer[(y * WIDTH + x) * 4 + 2] = Math.min(255, bVal);
      buffer[(y * WIDTH + x) * 4 + 3] = 255;
    }
  }

  // Sharp stars
  for (let i = 0; i < 180; i++) {
    const sx = Math.floor(random() * WIDTH);
    const sy = Math.floor(random() * HEIGHT);
    const br = Math.floor(randomRange(120, 255));
    drawCircle(sx, sy, random() > 0.85 ? 1.5 : 0.8, br, br, 255, br);
  }

  // 1. Violent jagged shockwave rings (asymmetric ellipse expanding outwards)
  for (let r = 20; r < 600; r += 16) {
    const steps = 200;
    for (let i = 0; i < steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      // High-frequency jagged distortion for explosion rupture
      const jagged = Math.sin(theta * 9 + r * 0.03) * 35 + Math.cos(theta * 3 - r * 0.02) * 20;
      const rad = r + jagged;
      const px = cx + Math.cos(theta) * rad;
      const py = cy + Math.sin(theta) * rad * 0.9;

      const t = r / 600;
      const red = Math.floor(255 * (1 - t * 0.4));
      const green = Math.floor(220 * (1 - t) + 40 * t);
      const blue = Math.floor(255);
      const alpha = Math.max(15, Math.floor(240 * (1 - t)));

      drawCircle(px, py, 2.0, red, green, blue, alpha);
    }
  }

  // 2. High-energy lightning / plasma fracture bolts tearing through space
  for (let i = 0; i < 30; i++) {
    const angle = randomRange(0, Math.PI * 2);
    let currX = cx;
    let currY = cy;
    const len = randomRange(200, 480);
    const segs = Math.floor(randomRange(6, 12));
    const stepLen = len / segs;

    const isCyan = random() > 0.3;
    const r = isCyan ? 30 : 255;
    const g = isCyan ? 255 : 140;
    const b = 255;

    for (let s = 0; s < segs; s++) {
      const aVar = angle + randomRange(-0.5, 0.5);
      const nextX = currX + Math.cos(aVar) * stepLen;
      const nextY = currY + Math.sin(aVar) * stepLen;
      drawLine(currX, currY, nextX, nextY, r, g, b, 220, randomRange(1.5, 4.0));
      currX = nextX;
      currY = nextY;
    }
  }

  // 3. Shards and debris bursting outward at extreme velocities
  for (let i = 0; i < 150; i++) {
    const angle = randomRange(0, Math.PI * 2);
    const d = randomRange(30, 400);
    const sx = cx + Math.cos(angle) * d;
    const sy = cy + Math.sin(angle) * d;
    const str = randomRange(20, 80);
    const ex = sx + Math.cos(angle) * str;
    const ey = sy + Math.sin(angle) * str;

    const type = random();
    let r = 255, g = 255, b = 255;
    if (type < 0.3) { r = 255; g = 80; b = 40; }
    else if (type < 0.6) { r = 0; g = 255; b = 255; }
    else { r = 255; g = 240; b = 80; }

    drawLine(sx, sy, ex, ey, r, g, b, randomRange(150, 255), randomRange(1.0, 2.8));
  }

  // 4. Blazing White-Hot Core
  for (let r = 60; r > 0; r -= 2) {
    const f = r / 60;
    drawCircle(cx, cy, r, 255, Math.floor(210 + 45 * (1 - f)), Math.floor(180 + 75 * (1 - f)), Math.floor(255 * (1 - f * 0.6)));
  }
}

// Retro Pixel Font Renderer
function drawChar(ch: string, startX: number, startY: number, scale: number, r: number, g: number, b: number) {
  const font: { [key: string]: string[] } = {
    'W': ["10001", "10001", "10101", "11111", "10001"],
    'A': ["01110", "10001", "11111", "10001", "10001"],
    'T': ["11111", "00100", "00100", "00100", "00100"],
    'C': ["01110", "10001", "10000", "10001", "01110"],
    'H': ["10001", "10001", "11111", "10001", "10001"],
    'I': ["111", "010", "010", "010", "111"],
    'B': ["11110", "10001", "11110", "10001", "11110"],
    'L': ["10000", "10000", "10000", "10000", "11111"],
    'O': ["01110", "10001", "10001", "10001", "01110"],
    '!': ["1", "1", "1", "0", "1"]
  };

  const glyph = font[ch];
  if (!glyph) return 0;

  const rows = glyph.length;
  const cols = glyph[0].length;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (glyph[gy][gx] === '1') {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = startX + (gx * scale) + sx;
            const py = startY + (gy * scale) + sy;
            setPixel(px + 2, py + 2, 0, 0, 0, 240); // Hard shadow
            setPixel(px, py, r, g, b, 255);
          }
        }
      }
    }
  }
  return (cols * scale) + (2 * scale);
}

function drawTextBanner(text: string, centerX: number, startY: number, scale: number) {
  let totalWidth = 0;
  const fontWidths: { [key: string]: number } = {
    'W': 5, 'A': 5, 'T': 5, 'C': 5, 'H': 5, 'I': 3, 'B': 5, 'L': 5, 'O': 5, '!': 1, ' ': 3
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      totalWidth += 3 * scale;
    } else {
      totalWidth += (fontWidths[ch] || 5) * scale + 2 * scale;
    }
  }

  let cursorX = centerX - totalWidth / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      cursorX += 3 * scale;
    } else {
      const advance = drawChar(ch, cursorX, startY, scale, 255, 230, 50);
      cursorX += advance;
    }
  }
}

// PNG Encoder
function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const scanlineSize = width * 4 + 1;
  const filteredData = Buffer.alloc(height * scanlineSize);
  for (let y = 0; y < height; y++) {
    filteredData[y * scanlineSize] = 0;
    rgba.copy(filteredData, y * scanlineSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(filteredData, { level: 6 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcVal = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  buf.writeInt32BE(crcVal, 8 + len);
  return buf;
}

const crcTable = (() => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff);
}

console.log('Rendering ultra-kinetic blast entry (v6)...');
renderBackgroundAndBlast();
drawTextBanner("WATCH IT BLOW !", WIDTH / 2, HEIGHT - 80, 5);

const pngBuffer = encodePNG(WIDTH, HEIGHT, buffer);
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
const outPath = path.join(OUT_DIR, 'entry.png');
fs.writeFileSync(outPath, pngBuffer);
console.log(`Saved entry to ${outPath} (${pngBuffer.length} bytes)`);
