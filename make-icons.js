// Genera los iconos PNG (sin dependencias). Uso: node make-icons.js
const fs = require('fs'), zlib = require('zlib');
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, pix) { const raw = Buffer.alloc((size * 4 + 1) * size); for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; pix.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
const BG = [13, 14, 17], GOLD = [212, 176, 106], GRAD = [30, 33, 40];
// reventa: etiqueta de precio dentro de una flecha circular, dentro de la zona segura (centro)
function shape(x, y) { // x, y en unidades 0-100
  const dx = x - 50, dy = y - 50, d = Math.hypot(dx, dy);
  // flecha circular: aro de radio 31 con un hueco arriba a la derecha y punta al final
  let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang < -20) ang += 360;
  if (Math.abs(d - 31) <= 3 && ang >= -20 && ang <= 272) return true;
  const e = 280 * Math.PI / 180, bx = 50 + 31 * Math.cos(e - 0.14), by = 50 + 31 * Math.sin(e - 0.14);
  const tx = -Math.sin(e), ty = Math.cos(e), nx = Math.cos(e), ny = Math.sin(e);
  const P = [[bx + nx * 8, by + ny * 8], [bx - nx * 8, by - ny * 8], [bx + tx * 10, by + ty * 10]];
  const sg = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const t1 = sg([x, y], P[0], P[1]), t2 = sg([x, y], P[1], P[2]), t3 = sg([x, y], P[2], P[0]);
  if (!((t1 < 0 || t2 < 0 || t3 < 0) && (t1 > 0 || t2 > 0 || t3 > 0))) return true;
  // etiqueta girada 45°: punta arriba a la izquierda, con su agujero
  const c = Math.SQRT1_2, lx = (dx * c + dy * c) - 4, ly = (-dx * c + dy * c);
  if ((lx + 11) ** 2 + ly ** 2 <= 3 ** 2) return false;
  if (lx >= -6 && lx <= 14 && Math.abs(ly) <= 10.5) return true;
  if (lx >= -21 && lx < -6 && Math.abs(ly) <= 10.5 * (lx + 21) / 15) return true;
  return false;
}
function draw(size) {
  const pix = Buffer.alloc(size * size * 4), S = 4, u = 100 / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let a = 0; for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) if (shape((x + (sx + .5) / S) * u, (y + (sy + .5) / S) * u)) a++;
    const t = a / (S * S), g = (x + y) / (2 * size), base = BG.map((v, i) => v + (GRAD[i] - v) * g * .8);
    const o = (y * size + x) * 4; for (let i = 0; i < 3; i++) pix[o + i] = Math.round(base[i] + (GOLD[i] - base[i]) * t); pix[o + 3] = 255;
  }
  return pix;
}
for (const [name, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) fs.writeFileSync(`icons/${name}.png`, png(s, draw(s)));
console.log('iconos generados');
