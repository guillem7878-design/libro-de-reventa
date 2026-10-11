// Genera los iconos PNG (sin dependencias). Uso: node make-icons.js
const fs = require('fs'), zlib = require('zlib');
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, pix) { const raw = Buffer.alloc((size * 4 + 1) * size); for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; pix.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
// colores de las tarjetas de la app: degradado grafito y tinta blanco hueso
const BG_A = [30, 33, 40], BG_B = [58, 63, 75], INK = [242, 241, 237];
// reventa: bolsa de compra con dos flechas en círculo (comprar y volver a vender), dentro de la zona segura
const tri = (x, y, P) => { const sg = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const t1 = sg([x, y], P[0], P[1]), t2 = sg([x, y], P[1], P[2]), t3 = sg([x, y], P[2], P[0]);
  return !((t1 < 0 || t2 < 0 || t3 < 0) && (t1 > 0 || t2 > 0 || t3 > 0)); };
function arrows(x, y) { // flechas recortadas dentro de la bolsa
  const cx = 50, cy = 60, R = 10.5, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
  let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang < 0) ang += 360;
  if (Math.abs(d - R) <= 2.1 && ((ang >= 195 && ang <= 330) || (ang >= 15 && ang <= 150))) return true;
  for (const e0 of [338, 158]) { const e = e0 * Math.PI / 180, bx = cx + R * Math.cos(e - .2), by = cy + R * Math.sin(e - .2), tx = -Math.sin(e), ty = Math.cos(e), nx = Math.cos(e), ny = Math.sin(e);
    if (tri(x, y, [[bx + nx * 5.2, by + ny * 5.2], [bx - nx * 5.2, by - ny * 5.2], [bx + tx * 6.5, by + ty * 6.5]])) return true; }
  return false;
}
function shape(x, y) {
  // asa: medio aro encima de la bolsa
  const hx = x - 50, hy = y - 36;
  if (hy <= 0 && Math.abs(Math.hypot(hx, hy) - 11) <= 2.6) return true;
  // cuerpo con esquinas redondeadas
  const x0 = 27, x1 = 73, y0 = 34, y1 = 82, r = 7;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const qx = Math.min(Math.max(x, x0 + r), x1 - r), qy = Math.min(Math.max(y, y0 + r), y1 - r);
  if ((x - qx) ** 2 + (y - qy) ** 2 > r * r) return false;
  return !arrows(x, y);
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
