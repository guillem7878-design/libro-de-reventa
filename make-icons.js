// Genera los iconos PNG (sin dependencias). Uso: node make-icons.js
const fs = require('fs'), zlib = require('zlib');
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, pix) { const raw = Buffer.alloc((size * 4 + 1) * size); for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; pix.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
// colores de las tarjetas de la app: degradado grafito y tinta blanco hueso
const BG_A = [30, 33, 40], BG_B = [58, 63, 75], INK = [242, 241, 237];
// monograma: una R geométrica (de reventa), centrada en la zona segura
function shape(x, y) {
  const T = 10;                                   // grosor del trazo
  if (x >= 33 && x <= 33 + T && y >= 25 && y <= 75) return true;          // palo
  const cx = 52, cy = 41, R = 16;                 // panza: dos barras y medio aro
  if (x >= 33 && x <= cx && ((y >= 25 && y <= 25 + T) || (y >= 57 - T && y <= 57))) return true;
  if (x >= cx) { const d = Math.hypot(x - cx, y - cy); if (d <= R && d >= R - T) return true; }
  // pierna en diagonal, cortada en recto abajo
  const ax = 49, ay = 52, bx = 68, by = 78, vx = bx - ax, vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  if (y <= 75 && y >= 57 - T && Math.hypot(x - ax - t * vx, y - ay - t * vy) <= T / 2 + .6) return true;
  return false;
}
function draw(size) {
  const pix = Buffer.alloc(size * size * 4), S = 4, u = 100 / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let a = 0; for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) if (shape((x + (sx + .5) / S) * u, (y + (sy + .5) / S) * u)) a++;
    const t = a / (S * S), g = (x + y) / (2 * size), base = BG_A.map((v, i) => v + (BG_B[i] - v) * g);
    const o = (y * size + x) * 4; for (let i = 0; i < 3; i++) pix[o + i] = Math.round(base[i] + (INK[i] - base[i]) * t); pix[o + 3] = 255;
  }
  return pix;
}
for (const [name, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) fs.writeFileSync(`icons/${name}.png`, png(s, draw(s)));
console.log('iconos generados');
