// Genera los iconos PNG (sin dependencias). Uso: node make-icons.js
const fs = require('fs'), zlib = require('zlib');
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, pix) { const raw = Buffer.alloc((size * 4 + 1) * size); for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; pix.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
const BG = [13, 14, 17], GOLD = [212, 176, 106], GRAD = [30, 33, 40];
// tres barras ascendentes con esquinas redondeadas, dentro de la zona segura (60 % central)
function draw(size) {
  const pix = Buffer.alloc(size * size * 4), S = 3, u = size / 100;
  const bars = [[27, 52, 14, 22], [43, 40, 14, 34], [59, 26, 14, 48]].map(([x, y, w, h]) => [x * u, y * u, (x + w) * u, (y + h) * u]);
  const r = 3.2 * u;
  const inBar = (px, py, [x0, y0, x1, y1]) => { if (px < x0 || px > x1 || py < y0 || py > y1) return false; const cx = Math.min(Math.max(px, x0 + r), x1 - r), cy = Math.min(Math.max(py, y0 + r), y1 - r); return (px - cx) ** 2 + (py - cy) ** 2 <= r * r; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let a = 0; for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) { const px = x + (sx + .5) / S, py = y + (sy + .5) / S; if (bars.some(b => inBar(px, py, b))) a++; }
    const t = a / (S * S), g = (x + y) / (2 * size), base = BG.map((v, i) => v + (GRAD[i] - v) * g * .8);
    const o = (y * size + x) * 4; for (let i = 0; i < 3; i++) pix[o + i] = Math.round(base[i] + (GOLD[i] - base[i]) * t); pix[o + 3] = 255;
  }
  return pix;
}
for (const [name, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) fs.writeFileSync(`icons/${name}.png`, png(s, draw(s)));
console.log('iconos generados');
