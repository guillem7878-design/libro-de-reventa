/* Almacén en 3D: tu habitación de trabajo, estilo limpio (blanco con el dorado de la marca), hecho con bloques
   y texturas dibujadas en el momento. Las cantidades son las de verdad, una pieza por unidad:
   · pared de zapatillas: una caja por par, con diseño inspirado en su marca · peluches Jellycat amontonados en el suelo
   · camisetas de fútbol colgadas en un burro · otros en una estantería baja · escritorio con los móviles
   · mesa de embalar · salida: una bolsa gris de envío por cada venta por preparar
   · recepción: palé con una caja de cartón por unidad que ha llegado · devoluciones en una esquina
   · fuera, la calle: pasan coches y, si te está llegando un pedido, una furgoneta de reparto llega, descarga y se va.
   Cámara con zoom, arrastre y vuelo a cada zona; pasea sola cuando no la tocas. 1 unidad = 1 metro. */
import * as THREE from 'three';

const ACC = '#C9A04E', WHITE = '#FFFFFF', DARK = '#2B2D33';
const RX = 10, RZ = 7, WH = 2.6;
const SW = { z0: .35, bays: 9, bay: .38, levels: 5, lv: .4, d: .36, per: 3 };   // pared de zapatillas (3 cajas por hueco)
const RAIL = { x0: 1.2, x1: 3.4, z: 5.0 };                               // burro de camisetas
const PILE = { x: 1.15, z: 6.2 };                                        // montón de peluches
const LOW = { x0: .35, z0: .06, w: 2.4, d: .42 };                        // estantería baja (otros)
const DESK = [3.4, .08, 2.0, .78];
const TABLE = [4.4, 3.3, 2.0, .9];
const DOOR = { z0: 1.3, z1: 2.4 };                                       // puerta a la calle (lado derecho)
const PALLET = [8.2, .35];                                               // recepción (lo que llega)
const TUB = [8.5, 3.3, .95, .75];                                        // salida (lo que se va)
const LANE = RX + 4.3;                                                    // carril de la furgoneta
export const ZONES = {
  overview: { at: [6.1, .7, 5.5], zoom: 1 },
  week: { at: [RX - 3.2, .5, RZ + 2.75], zoom: 3 },
  in: { at: [9.4, .5, 1.2], zoom: 2.6 },
  stock: { at: [1.6, .8, 3.4], zoom: 2.1 },
  prep: { at: [5.4, .5, 3.8], zoom: 2.8 },
  out: { at: [9.0, .5, 3.7], zoom: 2.9 },
  office: { at: [4.4, .6, .7], zoom: 2.7 },
  ret: { at: [8.4, .4, 6.0], zoom: 2.9 }
};

/* ---------- texturas ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const noise = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
// parquet de roble claro: tablas desplazadas con veta
const parquet = tex(1024, 1024, (g, w, h) => {
  const rows = 14, ph = h / rows;
  for (let r = 0; r < rows; r++) { let x = -((r * 173) % 300);
    while (x < w) { const len = rnd(240, 420), b = [rnd(206, 222), rnd(176, 190), rnd(138, 150)];
      g.fillStyle = `rgb(${b[0] | 0},${b[1] | 0},${b[2] | 0})`; g.fillRect(x, r * ph, len, ph);
      for (let k = 0; k < 14; k++) { const yy = r * ph + rnd(3, ph - 3); g.strokeStyle = `rgba(120,85,50,${rnd(.04, .12)})`; g.lineWidth = rnd(.6, 1.6); g.beginPath(); g.moveTo(x, yy); for (let xx = x; xx < x + len; xx += 24) g.lineTo(xx, yy + Math.sin(xx * .02 + k) * rnd(.5, 2)); g.stroke(); }
      g.fillStyle = 'rgba(90,60,35,.35)'; g.fillRect(x, r * ph, 1.5, ph); x += len; }
    g.fillStyle = 'rgba(90,60,35,.35)'; g.fillRect(0, r * ph, w, 1.5); }
  noise(g, w, h, 6000, .04);
}, [3.2, 2.2]);
// cajas de zapatillas inspiradas en cada marca (colores y diseño, sin logotipos)
const BRANDS = {
  nike: { body: '#EE6A2C', lid: '#EE6A2C', band: '#1E1E20' }, jordan: { body: '#1E1E20', lid: '#C8102E', band: '#C8102E' },
  adidas: { body: '#1F4FA0', lid: '#1F4FA0', band: '#FFFFFF', stripes: true }, nb: { body: '#A3A8AE', lid: '#A3A8AE', band: '#C8102E' },
  asics: { body: '#F2F2EF', lid: '#2C4E9E', band: '#2C4E9E' }, other: { body: '#2B2D33', lid: '#2B2D33', band: ACC }
};
const brandOf = n => /jordan/i.test(n) ? 'jordan' : /nike|air ?force|air ?max|dunk|blazer|cortez/i.test(n) ? 'nike' : /adidas|samba|gazelle|campus|spezial|handball|superstar|stan smith/i.test(n) ? 'adidas' : /new ?balance|\bnb\b|\b(550|530|9060|2002r)\b/i.test(n) ? 'nb' : /asics|onitsuka|gel-/i.test(n) ? 'asics' : 'other';
const shoeMats = {};
/* logos de marca: todos se dibujan en una misma caja de 100 × 60 y luego se encajan centrados en el hueco
   que les toca, así salen del mismo tamaño y en el color de su marca sobre el color de su caja */
const LOGO_INK = { nike: '#FFFFFF', jordan: '#FFFFFF', adidas: '#FFFFFF', nb: '#C8102E', asics: '#2C4E9E', other: '#D4B06A' };
function fitText(g, txt, font, cx, cy, maxW, maxH) {
  const [pre, fam] = font.split('|'); g.font = pre + ' 100px ' + fam; const m = g.measureText(txt), tw = m.width, th = (m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0);
  const s = Math.min(maxW / tw, maxH / th); g.save(); g.translate(cx, cy); g.scale(s, s); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(txt, 0, ((m.actualBoundingBoxAscent || 72) - (m.actualBoundingBoxDescent || 0)) / 2); g.restore();
}
const LOGOS = {
  nike: g => { g.save(); g.translate(15, 3.8); g.scale(1.75, 1.75); g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-6, 22, 2, 26, 12, 20); g.lineTo(46, 4); g.lineTo(13, 14); g.bezierCurveTo(4, 17, 0, 16, 4, 10); g.closePath(); g.fill(); g.restore(); },
  jordan: g => { fitText(g, 'JORDAN', 'italic 900|"Arial Black", Arial, sans-serif', 50, 25, 94, 34); g.fillStyle = '#C8102E'; g.fillRect(14, 48, 72, 6); },
  adidas: g => { for (let i = 0; i < 3; i++) { const bh = 14 + i * 9; g.save(); g.translate(31 + i * 17, 40); g.rotate(-.52); g.fillRect(-5.5, -bh, 11, bh); g.restore(); } fitText(g, 'adidas', 'normal 700|Arial, sans-serif', 50, 52, 70, 14); },
  nb: g => fitText(g, 'NB', 'italic 900|"Arial Black", Arial, sans-serif', 50, 30, 80, 50),
  asics: g => fitText(g, 'asics', 'italic 700|Arial, sans-serif', 50, 30, 94, 34),
  other: () => {}
};
function brandLogo(g, brand, x, y, w, h, sx = 1) {
  const s = Math.min(w / (100 * sx), h / 60);
  g.save(); g.translate(x + (w - 100 * s * sx) / 2, y + (h - 60 * s) / 2); g.scale(s * sx, s); g.fillStyle = LOGO_INK[brand] || LOGO_INK.other;
  (LOGOS[brand] || LOGOS.other)(g); g.restore();
}
function shoeboxMats(brand, size) {
  const key = brand + '|' + size; if (shoeMats[key]) return shoeMats[key]; const B = BRANDS[brand];
  const end = tex(256, 128, (g) => { const w = 128, h = 64; g.scale(2, 2); g.fillStyle = B.body; g.fillRect(0, 0, w, h); g.fillStyle = B.lid; g.fillRect(0, 0, w, 16); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 16, w, 2);
    if (!B.stripes) { g.fillStyle = B.band; g.fillRect(0, h - 6, w, 6); }
    brandLogo(g, brand, 5, 22, 46, 33, .74);
    g.fillStyle = '#FFFFFF'; g.fillRect(56, 21, 66, 37); g.fillStyle = '#16171A'; g.font = '800 26px Manrope, Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(size || '—').slice(0, 4), 89, 40.5); noise(g, w, h, 300, .05); });
  const side = tex(256, 64, (g, w, h) => { g.fillStyle = B.body; g.fillRect(0, 0, w, h); g.fillStyle = B.lid; g.fillRect(0, 0, w, 16); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 16, w, 2);
    if (!B.stripes) { g.fillStyle = B.band; g.fillRect(0, h - 6, w, 6); } brandLogo(g, brand, 120, 22, 128, 33, 1.48); noise(g, w, h, 600, .05); });
  const top = tex(128, 128, (g, w, h) => { g.fillStyle = B.lid; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); noise(g, w, h, 500, .05); });
  const m = o => new THREE.MeshStandardMaterial({ map: o, roughness: .7 });
  return shoeMats[key] = [m(end), m(end), m(top), m(top), m(side), m(side)];      // caras: +x (mira a la habitación), -x, +y, -y, +z, -z
}
// cartón kraft con cinta y etiqueta (lo que llega)
const kraftSide = tex(128, 128, (g, w, h) => { g.fillStyle = '#C9A274'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${Math.random() < .5 ? '110,75,40' : '235,205,160'},.12)`; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + 8, y + 1); g.stroke(); } g.fillStyle = 'rgba(232,215,180,.85)'; g.fillRect(56, 0, 16, 40); g.fillStyle = 'rgba(60,40,20,.5)'; g.font = '700 14px Inter, sans-serif'; g.fillText('↑↑', 10, 118); });
const kraftTop = tex(128, 128, (g, w, h) => { g.fillStyle = '#CDA678'; g.fillRect(0, 0, w, h); noise(g, w, h, 900, .07); g.fillStyle = 'rgba(232,215,180,.9)'; g.fillRect(56, 0, 16, h);
  g.fillStyle = '#FFFFFF'; g.fillRect(14, 74, 40, 38); g.fillStyle = '#333'; for (let i = 0; i < 4; i++) g.fillRect(18, 80 + i * 7, 26 - i * 4, 3); for (let i = 0; i < 12; i++) g.fillRect(18 + i * 3, 104, i % 3 ? 1 : 2, 6); });
const kraftMats = (() => { const s = new THREE.MeshStandardMaterial({ map: kraftSide, roughness: .9 }), t = new THREE.MeshStandardMaterial({ map: kraftTop, roughness: .9 }); return [s, s, t, s, s, s]; })();
// bolsa gris de envío con su etiqueta (lo que se va)
const bagTop = tex(128, 96, (g, w, h) => { g.fillStyle = '#9EA4AC'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${rnd(.04, .1)})`; g.fillRect(0, rnd(0, h), w, rnd(2, 6)); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, w, 8);
  g.fillStyle = '#FFFFFF'; g.fillRect(58, 24, 56, 52); g.fillStyle = '#26272B'; for (let i = 0; i < 4; i++) g.fillRect(63, 30 + i * 7, 40 - i * 6, 3); for (let i = 0; i < 14; i++) g.fillRect(63 + i * 3, 62, i % 3 ? 1 : 2, 9); });
const bagMats = (() => { const s = new THREE.MeshStandardMaterial({ color: '#9AA0A8', roughness: .38 }), t = new THREE.MeshStandardMaterial({ map: bagTop, roughness: .38 }); return [s, s, t, s, s, s]; })();
// camisetas: lisas, a rayas o con franja, con dorsal
const shirtTex = {};
function shirtMat(i) {
  if (shirtTex[i]) return shirtTex[i];
  const P = ['#1E1F23', '#ECEAE4', '#8E9196', '#C8B79A', '#2B3A55', '#5E6B4A', '#7A5A44', '#B9C4CF'][i % 8];
  const t = tex(128, 128, (g, w, h) => { g.fillStyle = P; g.fillRect(0, 0, w, h); noise(g, w, h, 500, .05); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = ['#ECEAE4', '#C8B79A', '#B9C4CF'].includes(P) ? 'rgba(30,31,35,.55)' : 'rgba(255,255,255,.7)'; g.fillRect(74, 30, 18, 8); });
  return shirtTex[i] = new THREE.MeshStandardMaterial({ map: t, roughness: .85 });
}

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, metalness: 0, ...o });
const M = {
  floor: new THREE.MeshStandardMaterial({ map: parquet, roughness: .55 }), wall: mat('#2B2F37', { roughness: .9 }), white: mat(WHITE), acc: mat(ACC, { roughness: .6 }), dark: mat(DARK, { roughness: .7 }),
  lgrey: mat('#E6E6E4'), mgrey: mat('#C9CCD1'), wood: mat('#D9B98C'), woodD: mat('#B8925F'), rug: mat('#ECE4D6', { roughness: 1 }),
  glass: mat('#DCE7EF', { roughness: .1, emissive: '#EAF2F8', emissiveIntensity: .4 }), film: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: .2, transparent: true, opacity: .28, depthWrite: false }),
  frame: mat('#B9BCC2', { roughness: .5, metalness: .3 }), chrome: mat('#D5D8DD', { roughness: .3, metalness: .6 }), skin: mat('#E2BB99'), hair: mat('#D8B56E'),
  screen: mat('#1D2027', { emissive: '#9EB7D8', emissiveIntensity: .45 }), leaf: mat('#9CCB8F'), leaf2: mat('#7FB676'), trunk: mat('#B59B7A'),
  road: mat('#C9CBCF', { roughness: 1 }), walk: mat('#ECEBE7', { roughness: 1 }), curb: mat('#FFFFFF'), lane: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), grass: mat('#E3EBDA', { roughness: 1 }),
  plush: ['#D9C7AC', '#A8C9B9', '#EBC2B5', '#C9BCE0', '#F2E2B8', '#BFD3E6', '#E8D5C4'].map(c => mat(c, { roughness: 1 })),
  yellow: mat('#FFCC00', { roughness: .45 }), red: mat('#D40511', { roughness: .45 }), tyre: mat('#1C1D20', { roughness: .8 }), rim: mat('#BFC3C9', { roughness: .3, metalness: .6 }),
  tint: mat('#2E3440', { roughness: .1, metalness: .2 }), lamp: mat('#FFFFFF', { emissive: '#FFF6DA', emissiveIntensity: .6 }), amber: mat('#F5A623', { emissive: '#F5A623', emissiveIntensity: 0 })
};
// estanterías de hierro de almacén: montantes perforados, largueros y baldas de rejilla
const perfTex = tex(64, 256, (g, w2, h) => { g.fillStyle = '#A3A9B1'; g.fillRect(0, 0, w2, h); g.fillStyle = '#5E646C'; for (let y = 8; y < h; y += 16) { g.fillRect(14, y, 10, 6); g.fillRect(40, y, 10, 6); } noise(g, w2, h, 200, .06); });
const STEEL = { up: new THREE.MeshStandardMaterial({ map: perfTex, roughness: .5, metalness: .55 }), beam: new THREE.MeshStandardMaterial({ color: '#B7BCC3', roughness: .35, metalness: .55 }),
  plate: new THREE.MeshStandardMaterial({ color: '#7A8088', roughness: .5, metalness: .5 }) };
const deckMat = () => new THREE.MeshStandardMaterial({ color: '#C3C8CE', roughness: .45, metalness: .5 });
const geo = new THREE.BoxGeometry(1, 1, 1);
// estantería metálica: axis 'z' (a lo largo de la pared izquierda) o 'x' (a lo largo de la del fondo)
function rack(parent, o) {
  const b = (dP, h, aP, dL, hh, aL, m) => o.axis === 'z' ? block(dL, hh, aL, m, o.x0 + dP, h, o.z0 + aP, parent) : block(aL, hh, dL, m, o.x0 + aP, h, o.z0 + dP, parent);
  const H = o.levels * o.lh + .12, bays = Math.max(1, Math.round(o.len / o.bayW)), bw = o.len / bays, dk = deckMat(o.len, o.depth);
  for (let i = 0; i <= bays; i++) for (const dP of [0, o.depth - .06]) { b(dP, 0, i * bw - (i === bays ? .06 : 0), .06, H, .06, STEEL.up); b(dP - .01, 0, i * bw - (i === bays ? .07 : -.01), .08, .015, .08, STEEL.plate); }
  for (let l = 0; l <= o.levels; l++) { const y = .06 + l * o.lh; for (const dP of [0, o.depth - .04]) b(dP, y - .055, 0, .04, .06, o.len, STEEL.beam); const dm = b(.04, y, .02, o.depth - .08, .012, o.len - .04, dk); dm.castShadow = false; }
  return H;
}
function block(w, h, d, m, x, y, z, parent, shadow = true) { const b = new THREE.Mesh(geo, m); b.scale.set(w, h, d); b.position.set(x + w / 2, y + h / 2, z + d / 2); b.castShadow = shadow; b.receiveShadow = true; parent.add(b); return b; }
const sphere = new THREE.SphereGeometry(1, 18, 14);
const ball = (r, m, x, y, z, parent, sx = 1, sy = 1, sz = 1) => { const s = new THREE.Mesh(sphere, m); s.position.set(x, y, z); s.scale.set(r * sx, r * sy, r * sz); s.castShadow = s.receiveShadow = true; parent.add(s); return s; };
const cyl = (r, h, m, x, y, z, parent, rx = 0, rz = 0) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); c.castShadow = c.receiveShadow = true; parent.add(c); return c; };
const parcel = (w, h, d, x, y, z, parent) => block(w, h, d, kraftMats, x, y, z, parent);
const bag = (x, y, z, parent, rot = 0) => { const b = block(.4, .085, .3, bagMats, x, y, z, parent); b.rotation.y = rot; return b; };

// persona sencilla, como las del vídeo
function person(top = DARK, cap) {
  const g = new THREE.Group(), body = mat(top, { roughness: .95 }), legs = mat('#202227');
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.09, .82, 0); legR.position.set(.09, .82, 0); g.add(legL, legR);
  block(.13, .8, .15, legs, -.065, -.8, -.075, legL); block(.13, .8, .15, legs, -.065, -.8, -.075, legR);
  block(.15, .07, .22, M.white, -.075, -.83, -.085, legL); block(.15, .07, .22, M.white, -.075, -.83, -.085, legR);
  block(.42, .62, .26, body, -.21, .8, -.13, g);
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-.27, 1.36, 0); armR.position.set(.27, 1.36, 0); g.add(armL, armR);
  block(.11, .56, .13, body, -.055, -.56, -.065, armL); block(.11, .56, .13, body, -.055, -.56, -.065, armR);
  block(.1, .1, .11, M.skin, -.05, -.66, -.055, armL); block(.1, .1, .11, M.skin, -.05, -.66, -.055, armR);
  block(.26, .28, .26, M.skin, -.13, 1.46, -.13, g);
  if (cap) { block(.29, .1, .29, cap, -.145, 1.7, -.145, g); block(.2, .03, .14, cap, -.1, 1.7, .12, g); }
  else { block(.28, .1, .28, M.hair, -.14, 1.68, -.14, g); block(.28, .14, .06, M.hair, -.14, 1.6, -.15, g); }
  const box = new THREE.Group(); parcel(.4, .3, .32, -.2, 1.0, .12, box); box.visible = false; g.add(box);
  const bg = new THREE.Group(); block(.4, .09, .3, bagMats, -.2, 1.1, .14, bg); bg.visible = false; g.add(bg);
  const carry = new THREE.Group(); carry.position.set(0, 1.0, .22); g.add(carry);
  const hand = new THREE.Group(); hand.position.set(0, -.68, .02); armR.add(hand);
  return { g, legL, legR, armL, armR, box, bag: bg, carry, hand };
}
function walkPose(P, t, carry) { const s = Math.sin(t * 9); P.legL.rotation.x = s * .5; P.legR.rotation.x = -s * .5; P.armL.rotation.x = carry ? -1.2 : -s * .4; P.armR.rotation.x = carry ? -1.2 : s * .4; P.g.position.y = Math.abs(Math.cos(t * 9)) * .03; }
function standPose(P, carry, t) { P.legL.rotation.x = P.legR.rotation.x = 0; P.g.position.y = 0; P.armL.rotation.x = P.armR.rotation.x = carry ? -1.2 : -.6 + Math.sin(t * 6) * .25; }

// furgoneta de reparto amarilla y roja, del estilo de una Iveco Daily
function dhlTex(wpx, hpx) {
  return tex(wpx, hpx, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#D40511';
    const fs = H * .78; g.font = 'italic 900 ' + fs + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle';
    const tw = g.measureText('DHL').width, tx = (W - tw) / 2; g.fillText('DHL', tx, H / 2 + H * .04);
    for (let i = 0; i < 3; i++) { const yy = H * (.3 + i * .16), lh = H * .07; g.fillRect(4, yy, tx - 14 - i * 6, lh); g.fillRect(tx + tw + 10 + i * 6, yy, W - (tx + tw + 10 + i * 6) - 4, lh); }
  });
}
const dhlMat = () => new THREE.MeshBasicMaterial({ map: dhlTex(512, 96), transparent: true, depthWrite: false });
function van() {
  const g = new THREE.Group(), W = 1.96;
  // caja de carga
  block(W, 2.15, 3.5, M.yellow, -W / 2, .5, -3.5, g);
  block(W + .03, .22, 3.49, M.red, -W / 2 - .015, .72, -3.495, g); block(W + .03, .05, 3.49, M.red, -W / 2 - .015, 1.02, -3.495, g);
  block(W + .04, .08, 3.54, mat('#E6B800', { roughness: .5 }), -W / 2 - .02, 2.64, -3.52, g);
  // cabina con morro inclinado (perfil extruido)
  const s = new THREE.Shape(); s.moveTo(0, .5); s.lineTo(1.62, .5); s.lineTo(1.72, .8); s.lineTo(1.68, 1.08); s.lineTo(1.42, 1.22); s.lineTo(.92, 2.08); s.lineTo(0, 2.2); s.closePath();
  const cab = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: W - .04, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }), M.yellow);
  cab.rotation.y = -Math.PI / 2; cab.position.set(W / 2 - .02, 0, 0); cab.castShadow = cab.receiveShadow = true; g.add(cab);
  // parabrisas inclinado, ventanillas, faros, calandra, paragolpes, retrovisores
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(W - .2, .98), M.tint); ws.position.set(0, 1.66, 1.19); ws.rotation.x = -Math.atan2(.5, .86); g.add(ws);
  for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), M.tint); sw.position.set(sx * (W / 2 + .025), 1.6, .62); sw.rotation.y = sx * Math.PI / 2; g.add(sw); }
  block(.7, .28, .04, M.dark, -.35, .78, 1.7, g); for (let i = 0; i < 3; i++) block(.66, .02, .045, mat('#55595F'), -.33, .83 + i * .07, 1.705, g);
  for (const sx of [-1, 1]) { block(.32, .14, .04, M.lamp, sx > 0 ? .5 : -.82, .95, 1.67, g); block(.12, .08, .04, M.amber, sx > 0 ? .78 : -.9, .96, 1.66, g); }
  block(W + .06, .2, .14, mat('#3A3D44', { roughness: .6 }), -W / 2 - .03, .45, 1.66, g);
  for (const sx of [-1, 1]) { block(.06, .04, .3, M.dark, sx * (W / 2 + .02) - .03, 1.55, 1.1, g); block(.05, .3, .18, M.dark, sx * (W / 2 + .28) - .025, 1.4, 1.08, g); }
  block(W - .1, .25, 5.6, M.dark, -W / 2 + .05, .3, -3.6, g);                                       // chasis
  // ruedas con llanta
  const wheels = [];
  for (const [x, z] of [[-.9, 1.15], [.9, 1.15], [-.9, -2.55], [.9, -2.55]]) { const w = new THREE.Group(); w.position.set(x, .38, z); g.add(w);
    const ty = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .26, 24), M.tyre); ty.rotation.z = Math.PI / 2; ty.castShadow = true; w.add(ty);
    const rm = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .27, 16), M.rim); rm.rotation.z = Math.PI / 2; w.add(rm); wheels.push(w); }
  // puertas traseras con bisagra
  const doors = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * W / 2, .5, -3.5); g.add(p); block(W / 2 - .01, 2.15, .04, M.yellow, sx > 0 ? -(W / 2 - .01) : 0, 0, -.04, p); block(W / 2 - .01, .22, .045, M.red, sx > 0 ? -(W / 2 - .01) : 0, .22, -.045, p); return p; });
  // logos DHL en los lados de la caja y en las puertas
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .5), dhlMat()); l.position.set(sx * (W / 2 + .018), 1.62, -1.75); l.rotation.y = sx * Math.PI / 2; g.add(l); }
  // intermitentes traseros
  const hz = [-1, 1].map(sx => block(.1, .1, .03, M.amber, sx * .85 - .05, .6, -3.53, g));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, wheels, doors, hz };
}
// avión de carga amarillo y rojo, para los pedidos que aún vienen de camino
function plane() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(.24, .2, 3.0, 18), M.yellow); fus.rotation.x = Math.PI / 2; body.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), M.yellow); nose.scale.set(1, 1, 1.6); nose.position.z = 1.5; body.add(nose);
  const tailc = new THREE.Mesh(new THREE.ConeGeometry(.2, .7, 16), M.yellow); tailc.rotation.x = -Math.PI / 2; tailc.position.z = -1.85; body.add(tailc);
  block(.5, .1, 2.6, M.red, -.25, -.05, -1.3, body);
  block(3.4, .05, .7, M.yellow, -1.7, -.1, -.1, body); block(3.42, .02, .12, M.red, -1.71, -.07, .48, body);
  block(1.3, .04, .4, M.yellow, -.65, .05, -2.0, body); block(.05, .75, .55, M.red, -.025, .1, -2.15, body);
  for (const sx of [-1, 1]) { const en = new THREE.Mesh(new THREE.CylinderGeometry(.11, .1, .5, 14), mat('#D9DCE0', { roughness: .3, metalness: .5 })); en.rotation.x = Math.PI / 2; en.position.set(sx * .85, -.22, .15); body.add(en); }
  for (let i = 0; i < 6; i++) block(.01, .07, .09, M.tint, .235, .05, .9 - i * .3, body);
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .24), dhlMat()); l.position.set(sx * .245, -.02, -.35); l.rotation.y = sx * Math.PI / 2; body.add(l); }
  return g;
}
function car(color) {
  const g = new THREE.Group(), c = mat(color, { roughness: .45 });
  block(1.7, .5, 3.9, c, -.85, .32, -1.95, g); block(1.5, .5, 2.0, c, -.75, .82, -1.0, g); block(1.52, .34, 1.96, M.tint, -.76, .9, -.98, g);
  for (const sx of [-1, 1]) { block(.3, .1, .04, M.lamp, sx > 0 ? .45 : -.75, .62, 1.94, g); block(.3, .1, .04, M.red, sx > 0 ? .45 : -.75, .62, -1.98, g); }
  const wheels = [];
  for (const [x, z] of [[-.86, -1.2], [.86, -1.2], [-.86, 1.2], [.86, 1.2]]) { const w = new THREE.Group(); w.position.set(x, .32, z); g.add(w); const ty = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .22, 18), M.tyre); ty.rotation.z = Math.PI / 2; w.add(ty); const rm = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .23, 12), M.rim); rm.rotation.z = Math.PI / 2; w.add(rm); wheels.push(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, wheels };
}

export function createWorld(opts) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false });
  renderer.setPixelRatio(2); renderer.outputColorSpace = THREE.SRGBColorSpace;   // siempre a doble resolución: bordes y texturas finas sin temblar
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'alm-canvas';
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#E9E6E0', 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFFFFF', 1.15); sun.position.set(-5, 14, 10);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 2, far: 45 });
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .035; sun.shadow.radius = 5;
  sun.target.position.set(RX / 2 + 2, 0, RZ / 2); scene.add(sun, sun.target);

  /* ---------- día y noche según la hora (de noche: estrellas, luna, farola e interior encendidos) ---------- */
  const SUN = [[8.4, 18.1], [8.1, 18.6], [7.5, 19.2], [7.6, 20.6], [7.0, 21.1], [6.7, 21.5], [6.9, 21.5], [7.3, 21.0], [7.8, 20.2], [8.2, 19.3], [7.7, 18.0], [8.2, 17.8]];   // salida y puesta aprox. (España)
  const isNight = () => { const d = new Date(), h = d.getHours() + d.getMinutes() / 60, [up, down] = SUN[d.getMonth()]; return h < up || h >= down; };
  const C = (x) => new THREE.Color(x);
  const SKY = { day: C('#C7D0D8'), night: C('#141A28') };
  const skyScene = new THREE.Scene(); skyScene.background = SKY.day.clone();
  const ISL = { x0: -2.6, x1: RX + 9.6, z0: -4.6, z1: RZ + 4.6 };
  const island = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -ISL.x0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), ISL.x1), new THREE.Plane(new THREE.Vector3(0, 0, 1), -ISL.z0), new THREE.Plane(new THREE.Vector3(0, 0, -1), ISL.z1)];
  const roomLight = new THREE.PointLight('#FFD9A8', 0, 0, 2); roomLight.position.set(5.2, 2.35, 3.4); scene.add(roomLight);
  const roomLight2 = new THREE.PointLight('#FFD9A8', 0, 0, 2); roomLight2.position.set(1.6, 2.35, 2.2); scene.add(roomLight2);
  const streetLight = new THREE.PointLight('#FFC978', 0, 0, 2); streetLight.position.set(RX + 1.23, 2.75, 4.66); scene.add(streetLight);
  // estrellas y luna pegadas a la cámara, al fondo de todo (solo se ven donde hay cielo)
  const sky = new THREE.Group();
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 520; i++) sp.push((Math.random() - .5) * 60, (Math.random() - .5) * 26, -110);
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: '#FFFFFF', size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat); sky.add(stars);
  const starGeo2 = new THREE.BufferGeometry(), sp2 = [];
  for (let i = 0; i < 90; i++) sp2.push((Math.random() - .5) * 60, (Math.random() - .5) * 26, -110);
  starGeo2.setAttribute('position', new THREE.Float32BufferAttribute(sp2, 3));
  const starMat2 = new THREE.PointsMaterial({ color: '#FFF4D6', size: 2.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  sky.add(new THREE.Points(starGeo2, starMat2));
  const moonMat = new THREE.MeshBasicMaterial({ color: '#F4EEDC', transparent: true, opacity: 0, depthWrite: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(.26, 40), moonMat); moon.position.set(-4.6, 4.55, -109); sky.add(moon);
  const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(.6, 40), new THREE.MeshBasicMaterial({ color: '#AFC3E8', transparent: true, opacity: 0, depthWrite: false })); moonHalo.position.set(-4.6, 4.55, -109.5); sky.add(moonHalo);
  const GROUND = [[M.grass, '#E3EBDA', '#2F3B35'], [M.walk, '#ECEBE7', '#4B5058'], [M.road, '#C9CBCF', '#2B2E35'], [M.curb, '#FFFFFF', '#6A707A']].map(([m, d, n]) => [m, C(d), C(n)]);
  let night = isNight(), nk = night ? 1 : 0, nightT = 0;
  function tickNight(dt, t) {
    nightT += dt; if (nightT > 30) { nightT = 0; night = isNight(); }
    nk += ((night ? 1 : 0) - nk) * Math.min(1, dt * 1.5); const k = nk;
    skyScene.background.copy(SKY.day).lerp(SKY.night, k);
    hemi.intensity = 2.2 - 1.55 * k; hemi.color.set('#FFFFFF').lerp(C('#9FB2D6'), k); hemi.groundColor.set('#E9E6E0').lerp(C('#1C2130'), k);
    sun.intensity = 1.15 - .8 * k; sun.color.set('#FFFFFF').lerp(C('#A9BDE6'), k);
    roomLight.intensity = 9 * k; roomLight2.intensity = 6 * k; streetLight.intensity = 14 * k;
    M.lamp.emissiveIntensity = .6 + 2.4 * k; M.lamp.emissive.set('#FFF6DA').lerp(C('#FFC978'), k);
    M.glass.emissive.set('#EAF2F8').lerp(C('#24324D'), k); M.glass.emissiveIntensity = .4 + .2 * k;
    starMat.opacity = .85 * k * (.85 + .15 * Math.sin(t * 1.3)); starMat2.opacity = k * (.75 + .25 * Math.sin(t * 2.1 + 1)); moonMat.opacity = k; moonHalo.material.opacity = .1 * k;
    for (const [m, d, n] of GROUND) m.color.copy(d).lerp(n, k);
  }
  const fill = new THREE.DirectionalLight('#FFFFFF', 0); fill.position.set(14, 4, 2); fill.target.position.set(0, 1, 2); scene.add(fill, fill.target);
  const world = new THREE.Group(); scene.add(world);
  /* buzón (cada lunes trae la carta de la semana) */
  const mailG = new THREE.Group(); mailG.userData.zone = 'mail'; mailG.userData.tip = 'Buzón';
  block(.07, .92, .07, M.dark, -.035, -.02, -.035, mailG);
  const mbody = mat('#2E3440', { roughness: .45, metalness: .3 }); block(.3, .26, .4, mbody, -.15, .9, -.2, mailG);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .4, 20, 1, false, 0, Math.PI), mbody); roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.set(0, 1.16, 0); roof.castShadow = true; mailG.add(roof);
  block(.012, .18, .3, M.acc, .148, .94, -.15, mailG);
  const flag = new THREE.Group(); flag.position.set(-.16, 1.02, .1); mailG.add(flag); block(.02, .26, .03, M.red, -.01, 0, -.015, flag); block(.02, .07, .1, M.red, -.01, .19, -.1, flag);
  const letterM = new THREE.Group(); letterM.position.set(0, 1.1, -.08); mailG.add(letterM);
  block(.03, .2, .28, M.white, -.015, 0, -.14, letterM); block(.032, .05, .05, M.red, -.016, .12, -.025, letterM);
  let letterOn = false;
  /* el coche del jardín: compacto deportivo gris mate con alerón, parrilla de lamas, llantas negras y pinzas rojas (sin logos) */
  function hotHatch() {
    const g = new THREE.Group();
    const paint = mat('#6F747B', { roughness: .55, metalness: .25 }), gloss = mat('#0E0F11', { roughness: .25, metalness: .4 }), trim = mat('#1A1B1E', { roughness: .6 }), glass = mat('#15181D', { roughness: .08, metalness: .5 });
    const W2 = .9;   // media anchura
    const prof = (pts, depth, m, z0, bev) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: !!bev, bevelThickness: bev || 0, bevelSize: bev || 0, bevelSegments: 3, curveSegments: 6 }); geo.translate(0, 0, z0);
      const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
    // silueta lateral (x = largo, y = alto): morro bajo, capó largo, parabrisas tumbado, techo que cae a la luneta
    const body = [[-2.18, .24], [2.12, .24], [2.22, .4], [2.2, .62], [1.95, .72], [1.15, .84], [.78, .9], [-.08, 1.34], [-1.38, 1.33], [-1.9, 1.12], [-2.1, .98], [-2.2, .74]];
    prof(body, W2 * 2 - .1, paint, -W2 + .05, .05);
    // cristales: un poco por fuera de la carrocería en los laterales y en los planos inclinados, por debajo del techo
    prof([[.74, .93], [-.06, 1.3], [-1.35, 1.29], [-1.86, 1.1], [-1.95, .98], [-1.4, .95], [.3, .93]], W2 * 2 + .07, glass, -W2 - .035);
    // pilar B en color carrocería y moldura de ventanillas
    for (const z of [W2 + .04, -W2 - .04]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.09, .34, .01), paint); b.position.set(-.55, 1.12, z); g.add(b); const bl = new THREE.Mesh(new THREE.BoxGeometry(2.6, .025, .01), trim); bl.position.set(-.55, .94, z); g.add(bl); }
    // faldones, pasos de rueda y difusor en negro
    const box = (sx, sy, sz, m, x, y, z, ry = 0, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.rotation.set(0, ry, rz); b.castShadow = true; g.add(b); return b; };
    for (const z of [W2 + .04, -W2 - .04]) box(2.1, .1, .04, trim, 0, .3, z);
    box(.5, .16, 1.5, trim, -2.08, .32, 0);                                       // difusor
    for (const z of [-.62, -.44, .44, .62]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .14, 16), mat('#9AA0A8', { roughness: .3, metalness: .8 })); e.rotation.z = Math.PI / 2; e.position.set(-2.3, .31, z); g.add(e); }
    // frontal: parrilla de lamas verticales, tomas laterales y faros finos
    box(.06, .27, 1.0, gloss, 2.25, .52, 0);
    for (let i = 0; i < 11; i++) box(.02, .23, .022, M.chrome, 2.285, .52, -.45 + i * .09);
    for (const z of [-.66, .66]) { box(.05, .16, .3, gloss, 2.25, .36, z); const hl = box(.05, .06, .36, M.lamp, 2.18, .69, z * 1.02, z > 0 ? -.25 : .25); hl.rotation.z = -.12; }
    box(.08, .05, 1.6, trim, 2.25, .25, 0);                                       // labio delantero
    // detrás: pilotos LED rojos, alerón de techo negro brillante con aletas
    const tail = mat('#B3121E', { emissive: '#FF2A2A', emissiveIntensity: .7, roughness: .3 });
    for (const z of [-.6, .6]) box(.05, .07, .42, tail, -2.26, .86, z);
    box(.05, .03, .34, tail, -2.26, .52, 0);                                      // luz antiniebla central
    box(.5, .045, 1.72, gloss, -1.62, 1.42, 0, 0, .1);
    for (const z of [-.84, .84]) box(.42, .12, .03, gloss, -1.6, 1.37, z);
    // retrovisores negros
    for (const z of [W2 + .1, -W2 - .1]) box(.16, .1, .14, gloss, .62, 1.0, z);
    // ruedas: neumático, llanta negra de radios, pinza roja
    const caliper = mat('#C8102E', { roughness: .4 });
    for (const [x, z] of [[1.36, .83], [1.36, -.83], [-1.38, .83], [-1.38, -.83]]) {
      const wg = new THREE.Group(); wg.position.set(x, .35, z); g.add(wg); const side = z > 0 ? 1 : -1;
      const ty = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .26, 28), M.tyre); ty.rotation.x = Math.PI / 2; wg.add(ty);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .262, 28), gloss); rim.rotation.x = Math.PI / 2; wg.add(rim); const lip = new THREE.Mesh(new THREE.TorusGeometry(.27, .012, 6, 28), mat('#3A3D42', { roughness: .3, metalness: .6 })); lip.position.z = side * .131; wg.add(lip);
      for (let i = 0; i < 10; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.035, .24, .02), mat('#2E3035', { roughness: .35, metalness: .5 })); sp.position.set(0, 0, side * .132); sp.rotation.z = i / 10 * Math.PI; wg.add(sp); }
      const cp = new THREE.Mesh(new THREE.BoxGeometry(.14, .1, .05), caliper); cp.position.set(.1, .12, side * .09); wg.add(cp);
    }
    const star = (r, x, y, rotY) => { const s = new THREE.Group(); s.position.set(x, y, 0); s.rotation.y = rotY; g.add(s);
      const chrome = mat('#E4E7EB', { roughness: .15, metalness: .9 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * .1, 8, 32), chrome); s.add(ring);
      for (let i = 0; i < 3; i++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(r * .16, r * .95, r * .12), chrome); const ang = i / 3 * Math.PI * 2; arm.position.set(Math.sin(ang) * r * .47, Math.cos(ang) * r * .47, 0); arm.rotation.z = -ang; s.add(arm); }
      return s; };
    star(.1, 2.3, .53, Math.PI / 2);      // en la parrilla
    star(.075, -2.255, .98, -Math.PI / 2);   // en el portón
    const badge = (txt, wpx, col) => { const t = tex(wpx, 64, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = col; c.font = '800 44px Manrope, Arial, sans-serif'; c.textBaseline = 'middle'; c.fillText(txt, 4, H / 2 + 2); }); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); };
    const amgP = new THREE.Mesh(new THREE.PlaneGeometry(.26, .07), badge('AMG', 128, '#E9ECF0')); amgP.position.set(-2.262, .83, .32); amgP.rotation.y = -Math.PI / 2; g.add(amgP);
    const a45P = new THREE.Mesh(new THREE.PlaneGeometry(.3, .07), badge('A45 S', 160, '#E9ECF0')); a45P.position.set(-2.262, .83, -.3); a45P.rotation.y = -Math.PI / 2; g.add(a45P);
    g.traverse(o => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
    return g;
  }
  /* ---------- fuera: acera, calle y árboles ---------- */
  block(ISL.x1 - ISL.x0, .1, ISL.z1 - ISL.z0, M.grass, ISL.x0, -.2, ISL.z0, world, false);
  block(ISL.x1 - ISL.x0, .7, ISL.z1 - ISL.z0, mat('#3A2F28', { roughness: 1 }), ISL.x0, -.9, ISL.z0, world, false); block(ISL.x1 - ISL.x0, .12, ISL.z1 - ISL.z0, mat('#55473B', { roughness: 1 }), ISL.x0, -.32, ISL.z0, world, false);
  block(2.0, .12, 34, M.walk, RX + .14, -.13, -14, world, false); block(.14, .14, 34, M.curb, RX + 2.14, -.13, -14, world, false);
  block(7.2, .1, 34, M.road, RX + 2.28, -.16, -14, world, false);
  for (let z = -14; z < 20; z += 2.4) block(.14, .01, 1.3, M.lane, RX + 5.88, -.06, z, world, false);
  for (const z of [-3.4, -.8]) { block(.2, .9, .2, M.trunk, RX + 1.0, -.01, z, world); for (const [dx, dy, s] of [[0, 1.6, .7], [.2, 1.95, .45], [-.2, 1.85, .5]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), dx ? M.leaf2 : M.leaf); c.position.set(RX + 1.1 + dx, dy, z + .1); c.castShadow = true; world.add(c); } }
  {
    const hedge = mat('#6E9A6A', { roughness: 1 }), pot = mat('#3A3E47', { roughness: .8 }), flower = ['#E8B4B8', '#F2D398', '#C9B6E4', '#F4F1EA'].map(c => mat(c, { roughness: 1 }));
    // seto bajo delante de la casa, con huecos
    for (const [x0, x1] of [[-.1, 3.0], [3.8, 7.6], [8.4, RX - .1]]) { block(x1 - x0, .32, .34, hedge, x0, -.1, RZ + .55, world); for (let x = x0 + .15; x < x1 - .1; x += .3) ball(.17, hedge, x, .22, RZ + .72, world, 1, .7, 1); }
    // jardineras con flores a los lados de la puerta
    for (const z of [DOOR.z0 - .55, DOOR.z1 + .2]) { block(.4, .3, .36, pot, RX + .25, -.02, z, world); for (let i = 0; i < 5; i++) ball(.07, flower[i % 4], RX + .33 + (i % 3) * .12, .33, z + .08 + (i % 2) * .16, world); ball(.14, M.leaf2, RX + .45, .3, z + .18, world, 1.3, .6, 1); }
    // (sin coche aparcado)
    // banco de madera en la acera
    const bz = 5.1; block(.42, .05, 1.3, M.wood, RX + 1.42, .38, bz, world); block(.06, .38, 1.3, M.wood, RX + 1.78, .43, bz, world);
    for (const dz of [.08, 1.14]) { block(.36, .4, .06, M.dark, RX + 1.46, -.02, bz + dz, world); block(.05, .82, .06, M.dark, RX + 1.8, -.02, bz + dz, world); }
    // papelera y buzón
    cyl(.14, .55, M.dark, RX + 1.7, .25, 6.75, world); cyl(.15, .04, M.chrome, RX + 1.7, .54, 6.75, world);
    mailG.position.set(RX + .35, 0, RZ + 1.15); mailG.rotation.y = Math.PI / 2; world.add(mailG);
    // aparcabicis con una bici
    for (const z of [-2.6, -2.0]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 8, 24, Math.PI), M.chrome); r.position.set(RX + 1.55, 0, z); r.rotation.y = Math.PI / 2; world.add(r); }
    const bike = new THREE.Group(); bike.position.set(RX + 1.25, 0, -2.3); bike.rotation.y = Math.PI / 2; world.add(bike);
    for (const x of [-.32, .32]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(.2, .022, 8, 24), M.tyre); wh.position.set(x, .22, 0); bike.add(wh); }
    block(.62, .035, .035, M.red, -.31, .38, -.017, bike); block(.035, .26, .035, M.red, -.05, .22, -.017, bike); block(.16, .03, .06, M.dark, -.12, .5, -.03, bike); block(.04, .3, .04, M.dark, .28, .38, -.02, bike); block(.04, .04, .3, M.dark, .28, .66, -.15, bike);
  }
  block(.12, 3.2, .12, M.dark, RX + 1.9, -.01, 4.6, world); block(.9, .08, .14, M.dark, RX + 1.15, 3.1, 4.59, world); block(.36, .1, .22, M.lamp, RX + 1.05, 3.0, 4.55, world);   // farola

  /* ---------- la habitación ---------- */
  block(RX + .28, .12, RZ + .28, M.floor, -.14, -.12, -.14, world, false);
  const wall = (w, h, d, x, y, z) => block(w, h, d, M.wall, x, y, z, world);
  wall(.14, WH, RZ + .14, -.14, 0, -.14);
  wall(DESK[0] + .2, WH, .14, 0, 0, -.14); wall(1.6, 1.0, .14, DESK[0] + .2, 0, -.14); wall(1.6, .4, .14, DESK[0] + .2, WH - .4, -.14);
  block(1.6, 1.2, .03, M.glass, DESK[0] + .2, 1.0, -.085, world, false); block(.05, 1.2, .06, M.white, DESK[0] + .98, 1.0, -.1, world); block(1.66, .05, .2, M.white, DESK[0] + .17, .965, -.06, world);
  wall(RX - (DESK[0] + 1.8), WH, .14, DESK[0] + 1.8, 0, -.14);
  block(RX + .16, .05, .17, M.acc, -.15, WH, -.155, world); block(.17, .05, RZ + .01, M.acc, -.155, WH, .015, world);
  block(RX, .08, .025, M.white, 0, 0, .001, world, false); block(.025, .08, RZ, M.white, .001, 0, .03, world, false);
  // radiador bajo la ventana, enchufe y reloj
  block(1.1, .5, .07, M.white, DESK[0] + .45, .25, .01, world); for (let i = 0; i < 9; i++) block(.06, .46, .02, M.lgrey, DESK[0] + .5 + i * .12, .27, .08, world);
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .03, 32), M.white); clock.rotation.x = Math.PI / 2; clock.position.set(7.4, 2.05, .02); world.add(clock);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(.15, 32), new THREE.MeshStandardMaterial({ map: tex(128, 128, (g) => { g.fillStyle = '#FFF'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#2B2D33'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(64 + Math.cos(a) * 54 - 2, 64 + Math.sin(a) * 54 - 2, 4, 4); } g.lineWidth = 5; g.strokeStyle = '#2B2D33'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.moveTo(64, 64); g.lineTo(94, 72); g.stroke(); }) }));
  clockFace.position.set(7.4, 2.05, .037); world.add(clockFace);
  // marco de la puerta a la calle y felpudo
  block(.12, 2.15, .1, M.white, RX - .06, 0, DOOR.z0 - .1, world); block(.12, 2.15, .1, M.white, RX - .06, 0, DOOR.z1, world); block(.12, .12, DOOR.z1 - DOOR.z0 + .2, M.acc, RX - .06, 2.15, DOOR.z0 - .1, world);
  block(.7, .012, 1.0, M.dark, RX - .78, .003, DOOR.z0 + .05, world, false);
  // decoración: alfombra, lámpara, planta, cuadro de unas zapatillas
  block(3.2, .01, 2.4, M.rug, TABLE[0] - .6, .003, TABLE[1] - .75, world, false);
  block(.26, .03, .26, M.dark, DESK[0] + 2.3, 0, .2, world); block(.03, 1.55, .03, M.dark, DESK[0] + 2.415, .03, .315, world); block(.36, .26, .36, M.white, DESK[0] + 2.25, 1.55, .15, world);
  block(.36, .42, .36, M.white, RX - .5, 0, RZ - .5, world); for (const [dx, dy, dz, s] of [[0, .78, 0, .34], [.1, 1.05, -.06, .25], [-.08, 1.0, .1, .23]]) ball(s, M.leaf, RX - .32 + dx, dy, RZ - .32 + dz, world);
  block(.8, .6, .025, M.acc, 5.9, 1.3, .002, world);
  const poster = tex(256, 192, (g, w, h) => { g.fillStyle = '#F7F4EE'; g.fillRect(0, 0, w, h); g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(128, 110, 92, 34, 0, 0, 7); g.fill(); g.strokeStyle = '#1E1E20'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#1E1E20'; for (let i = 0; i < 3; i++) { g.save(); g.translate(110 + i * 16, 120); g.rotate(-.5); g.fillRect(-4, -26, 8, 34); g.restore(); } g.fillStyle = '#C68B59'; g.fillRect(40, 136, 176, 10); });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(.72, .52), new THREE.MeshStandardMaterial({ map: poster, roughness: .8 })); pm.position.set(6.3, 1.6, .03); world.add(pm);

  /* ---------- zonas ---------- */
  const Z = {}; const zone = k => { const g = new THREE.Group(); g.userData.zone = k; world.add(g); Z[k] = g; return g; };
  zone('stock'); const sub = k => { const g = new THREE.Group(); g.userData.zone = 'stock'; g.userData.rack = k; Z.stock.add(g); return g; };
  // pared de zapatillas
  const gz = sub('zapatillas'), zw = SW.bays * SW.bay, zh = SW.levels * SW.lv + .1;
  rack(gz, { axis: 'z', x0: .02, z0: SW.z0, depth: SW.d + .06, len: zw, levels: SW.levels, lh: SW.lv, bayW: SW.bay * 3 });
  const shoeItems = new THREE.Group(); gz.add(shoeItems);
  // peluches en el suelo
  const gj = sub('jellycat'); const rugJ = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .012, 40), mat('#F3E9DA', { roughness: 1 })); rugJ.position.set(PILE.x, .009, PILE.z); rugJ.receiveShadow = true; gj.add(rugJ);
  const plushItems = new THREE.Group(); gj.add(plushItems);
  // burro de camisetas
  const gf = sub('futbol'); for (const x of [RAIL.x0, RAIL.x1]) { block(.04, 1.62, .04, M.chrome, x, 0, RAIL.z - .02, gf); block(.04, .03, .5, M.chrome, x, .02, RAIL.z - .25, gf); }
  cyl(.016, RAIL.x1 - RAIL.x0 + .04, M.chrome, (RAIL.x0 + RAIL.x1) / 2 + .02, 1.62, RAIL.z, gf, 0, Math.PI / 2);
  const shirtItems = new THREE.Group(); gf.add(shirtItems);
  // estantería baja (otros)
  const go = sub('otro'); rack(go, { axis: 'x', x0: LOW.x0, z0: LOW.z0, depth: LOW.d, len: LOW.w, levels: 2, lh: .45, bayW: 1.2 });
  const otherItems = new THREE.Group(); go.add(otherItems);
  // escritorio
  const zoff = zone('office');
  block(DESK[2], .05, DESK[3], M.white, DESK[0], .74, DESK[1], zoff); block(.05, .74, DESK[3] - .1, M.frame, DESK[0] + .05, 0, DESK[1] + .05, zoff); block(.05, .74, DESK[3] - .1, M.frame, DESK[0] + DESK[2] - .1, 0, DESK[1] + .05, zoff);
  block(.66, .4, .04, M.dark, DESK[0] + .7, .87, DESK[1] + .12, zoff); block(.62, .35, .012, M.screen, DESK[0] + .72, .895, DESK[1] + .165, zoff); block(.06, .08, .06, M.dark, DESK[0] + 1.0, .79, DESK[1] + .12, zoff); block(.24, .015, .16, M.dark, DESK[0] + .91, .79, DESK[1] + .06, zoff);
  block(.44, .016, .14, M.lgrey, DESK[0] + .82, .79, DESK[1] + .36, zoff); block(.06, .02, .1, M.lgrey, DESK[0] + 1.34, .79, DESK[1] + .38, zoff);
  block(.36, .015, .24, M.mgrey, DESK[0] + .15, .79, DESK[1] + .36, zoff); block(.34, .2, .01, M.mgrey, DESK[0] + .16, .805, DESK[1] + .36, zoff);
  cyl(.045, .1, M.white, DESK[0] + 1.75, .84, DESK[1] + .55, zoff); ball(.08, M.leaf2, DESK[0] + 1.82, .95, DESK[1] + .2, zoff); block(.12, .1, .12, M.white, DESK[0] + 1.76, .79, DESK[1] + .14, zoff);
  const chair = new THREE.Group(); chair.position.set(DESK[0] + 1.0, 0, DESK[1] + 1.2); zoff.add(chair);
  block(.5, .07, .48, M.dark, -.25, .44, -.24, chair); block(.48, .5, .06, M.dark, -.24, .5, .2, chair); block(.05, .44, .05, M.frame, -.025, 0, -.025, chair); block(.5, .03, .06, M.frame, -.25, .02, -.03, chair); block(.06, .03, .5, M.frame, -.03, .02, -.25, chair);
  const phones = new THREE.Group(); zoff.add(phones);
  // mesa de embalar
  const zprep = zone('prep');
  block(TABLE[2], .05, TABLE[3], M.white, TABLE[0], .88, TABLE[1], zprep);
  for (const [dx, dz] of [[.04, .04], [TABLE[2] - .09, .04], [.04, TABLE[3] - .09], [TABLE[2] - .09, TABLE[3] - .09]]) block(.05, .88, .05, M.frame, TABLE[0] + dx, 0, TABLE[1] + dz, zprep);
  block(TABLE[2] - .1, .03, TABLE[3] - .1, M.lgrey, TABLE[0] + .05, .25, TABLE[1] + .05, zprep);
  block(.32, .05, .32, M.dark, TABLE[0] + .12, .93, TABLE[1] + .12, zprep); block(.18, .02, .08, mat('#9FD3A8', { emissive: '#9FD3A8', emissiveIntensity: .35 }), TABLE[0] + .19, .986, TABLE[1] + .16, zprep);
  cyl(.11, .5, mat('#EEF3F6', { roughness: .2, transparent: true, opacity: .75 }), TABLE[0] + TABLE[2] - .35, .4, TABLE[1] + .45, zprep, 0, Math.PI / 2);   // rollo de plástico de burbujas (balda)
  const tg = new THREE.Group(); tg.position.set(TABLE[0] + TABLE[2] - .25, .93, TABLE[1] + TABLE[3] - .28); zprep.add(tg); cyl(.065, .05, mat('#E5D7B5'), 0, .07, 0, tg, Math.PI / 2); block(.2, .04, .05, M.red, -.12, .0, -.025, tg); block(.04, .14, .04, M.red, -.12, -.0, -.02, tg);   // pistola de cinta
  block(.18, .1, .12, M.white, TABLE[0] + .55, .93, TABLE[1] + .1, zprep); block(.14, .005, .06, M.white, TABLE[0] + .57, 1.03, TABLE[1] + .13, zprep);   // impresora de etiquetas
  for (let i = 0; i < 4; i++) parcel(.5, .02, .38, TABLE[0] + .15, .285 + i * .023, TABLE[1] + .15, zprep);
  const prepItems = new THREE.Group(); zprep.add(prepItems);
  // salida: cubo gris con ruedas, una bolsa por envío
  const zout = zone('out'); const [tx0, tz0, tw, td] = TUB;
  block(tw, .06, td, M.mgrey, tx0, .12, tz0, zout); block(tw, .3, .04, M.mgrey, tx0, .12, tz0, zout); block(tw, .3, .04, M.mgrey, tx0, .12, tz0 + td - .04, zout); block(.04, .3, td - .08, M.mgrey, tx0 + .002, .12, tz0 + .04, zout); block(.04, .3, td - .08, M.mgrey, tx0 + tw - .042, .12, tz0 + .04, zout);
  for (const [dx, dz] of [[.08, .08], [tw - .08, .08], [.08, td - .08], [tw - .08, td - .08]]) cyl(.05, .04, M.dark, tx0 + dx, .05, tz0 + dz, zout, 0, Math.PI / 2);
  const outItems = new THREE.Group(); zout.add(outItems);
  // recepción: palé de madera
  const zin = zone('in'); const [px, pz] = PALLET;
  const palletG = new THREE.Group(); zin.add(palletG);
  for (const dz of [0, .53, 1.06]) block(1.2, .1, .14, M.woodD, px, 0, pz + dz, palletG);
  for (let i = 0; i < 7; i++) block(.15, .03, 1.2, M.wood, px + i * .175, .1, pz, palletG);
  const inItems = new THREE.Group(); zin.add(inItems);
  // devoluciones: caja grande abierta
  const zret = zone('ret'); block(1.1, .55, .8, M.white, 7.9, 0, 5.6, zret); block(1.0, .02, .7, M.lgrey, 7.95, .53, 5.65, zret);
  const retItems = new THREE.Group(); zret.add(retItems);

  /* carro de la semana: una caja por cada unidad vendida desde el lunes, apiladas en un carro de plataforma */
  const weekG = new THREE.Group(); weekG.userData.zone = 'week'; weekG.userData.tip = 'Ventas de esta semana'; weekG.position.set(RX - 3.2, 0, RZ + 2.75); weekG.rotation.y = -.18; world.add(weekG);
  { const deck = mat('#3A3F48', { roughness: .6, metalness: .3 }), rub = mat('#22252B', { roughness: .9 });
    block(1.5, .06, .9, deck, -.75, .2, -.45, weekG); block(1.54, .02, .94, rub, -.77, .26, -.47, weekG);           // plataforma con alfombrilla
    for (const [x, z] of [[-.62, -.34], [.62, -.34], [-.62, .34], [.62, .34]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .06, 16), M.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, .09, z); weekG.add(w); block(.04, .1, .04, M.chrome, x - .02, .12, z - .02, weekG); }
    for (const z of [-.42, .42]) block(.035, .95, .035, M.chrome, -.78, .26, z - .0175, weekG); block(.035, .035, .88, M.chrome, -.78, 1.2, -.44, weekG);   // asa
  }
  const weekBoxes = new THREE.Group(); weekG.add(weekBoxes);
  function drawWeek(n) { clear(weekBoxes); n = Math.min(n, 42);
    for (let i = 0; i < n; i++) { const lay = Math.floor(i / 6), k = i % 6, col = k % 3, row = Math.floor(k / 3), rot = ((i * 7) % 5 - 2) * .04;
      const b = parcel(.4, .24, .38, -.66 + col * .44, .28 + lay * .25, -.41 + row * .42, weekBoxes); b.rotation.y = rot; b.castShadow = true; } }
  /* destacados: una estrella dorada que gira encima del artículo */
  const featG = new THREE.Group(); world.add(featG);
  const featMat = mat('#E9C46A', { emissive: '#D4A23A', emissiveIntensity: .9, roughness: .3, metalness: .4 });
  const featGeo = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .055 : .13, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2 }); g.center(); return g; })();
  function drawFeats(list) { clear(featG); world.updateMatrixWorld(true); const v = new THREE.Vector3();
    (list || []).forEach((f, i) => { const ms = shelfMesh[f.productId]; let p = null;
      if (ms && ms.length) { ms[ms.length - 1].getWorldPosition(v); p = v.clone(); } else if (slotPos[f.productId]) p = new THREE.Vector3(...slotPos[f.productId]);
      if (!p) return;
      const g = new THREE.Group(); g.position.set(p.x + (p.x < .8 ? .45 : 0), p.y + .32, p.z); g.userData = { zone: 'feat', tip: f.tip, y: g.position.y, ph: i * 1.3 }; featG.add(g);
      const st = new THREE.Mesh(featGeo, featMat); g.add(st);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .008, 6, 32), featMat); ring.rotation.x = Math.PI / 2; ring.position.y = -.12; g.add(ring); }); }
  /* tele de destacados: pantalla en directo con todo lo gastado en destacar */
  const tvC = document.createElement('canvas'); tvC.width = 640; tvC.height = 360; const tvX = tvC.getContext('2d');
  const tvT = new THREE.CanvasTexture(tvC); tvT.colorSpace = THREE.SRGBColorSpace; tvT.anisotropy = 4;
  const tvG = new THREE.Group(); tvG.userData.zone = 'feat'; tvG.userData.tip = 'Destacados'; tvG.position.set(8.7, 1.72, 0); world.add(tvG);
  block(1.56, .9, .05, M.dark, -.78, -.45, .002, tvG); block(1.6, .04, .06, mat('#1A1B1F'), -.8, -.47, 0, tvG);
  const tvS = new THREE.Mesh(new THREE.PlaneGeometry(1.46, .82), new THREE.MeshBasicMaterial({ map: tvT, toneMapped: false })); tvS.position.set(0, 0, .056); tvG.add(tvS);
  block(.2, .02, .08, M.dark, -.1, -.5, .02, tvG);   // soporte
  let tvData = { total: 0, month: 0, week: 0, active: [], last7: [0, 0, 0, 0, 0, 0, 0] }, tvShown = 0, tvTick = 0;
  const eur = n => (Math.round(n * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  function drawTV(t) {
    const g = tvX, W2 = 640, H2 = 360;
    const bg = g.createLinearGradient(0, 0, W2, H2); bg.addColorStop(0, '#0E1220'); bg.addColorStop(1, '#1B1630'); g.fillStyle = bg; g.fillRect(0, 0, W2, H2);
    // brillo que barre la pantalla
    const sx = ((t * 90) % (W2 + 400)) - 200, sh = g.createLinearGradient(sx - 120, 0, sx + 120, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W2, H2);
    g.font = '800 26px Manrope, Arial, sans-serif'; g.fillStyle = '#E9C46A'; g.textBaseline = 'top'; g.fillText('★ DESTACADOS', 28, 24);
    const live = Math.sin(t * 4) > 0; g.fillStyle = live ? '#FF3B4A' : 'rgba(255,59,74,.35)'; g.beginPath(); g.arc(W2 - 140, 38, 8, 0, 7); g.fill();
    g.fillStyle = '#F2F1ED'; g.font = '700 18px Manrope, Arial, sans-serif'; g.fillText('EN DIRECTO', W2 - 124, 28);
    // contador del total (sube animado cuando cambia)
    tvShown += (tvData.total - tvShown) * .08; if (Math.abs(tvData.total - tvShown) < .005) tvShown = tvData.total;
    g.fillStyle = '#9C9B94'; g.font = '600 18px Manrope, Arial, sans-serif'; g.fillText('Gastado en destacar', 28, 78);
    g.fillStyle = '#FFFFFF'; g.font = '800 76px Manrope, Arial, sans-serif'; g.fillText(eur(tvShown), 26, 100);
    g.font = '700 20px Manrope, Arial, sans-serif'; g.fillStyle = '#E9C46A'; g.fillText(tvData.active.length + (tvData.active.length === 1 ? ' activo' : ' activos'), 28, 192);
    g.fillStyle = '#9C9B94'; g.fillText('· semana ' + eur(tvData.week) + ' · mes ' + eur(tvData.month), 28 + g.measureText(tvData.active.length + (tvData.active.length === 1 ? ' activo' : ' activos')).width + 10, 192);
    // barras de los últimos 7 días
    const mx = Math.max(1, ...tvData.last7), bx = W2 - 220, by = 210;
    tvData.last7.forEach((v, i) => { const h = 6 + v / mx * 110; g.fillStyle = i === 6 ? '#E9C46A' : 'rgba(233,196,106,.45)'; g.fillRect(bx + i * 28, by - h, 18, h); });
    g.fillStyle = '#6B6B66'; g.font = '600 14px Manrope, Arial, sans-serif'; g.fillText('últimos 7 días', bx, by + 8);
    // cinta con los destacados activos y su cuenta atrás
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H2 - 70, W2, 70); g.fillStyle = '#E9C46A'; g.fillRect(0, H2 - 70, W2, 3);
    const items = tvData.active.length ? tvData.active.map(a => { const ms = Math.max(0, a.ends - Date.now()), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); return '★ ' + a.name + '  ·  quedan ' + (d ? d + ' d ' : '') + h + ' h ' + m + ' min'; }) : ['Ningún artículo destacado ahora mismo  ·  toca la tele para destacar uno'];
    g.font = '700 24px Manrope, Arial, sans-serif'; g.fillStyle = '#F2F1ED';
    const txt = items.join('        '), tw = g.measureText(txt).width + 160, off = (t * 70) % tw;
    for (let x = -off; x < W2; x += tw) g.fillText(txt, 20 + x, H2 - 50);
    // líneas de barrido sutiles
    g.fillStyle = 'rgba(255,255,255,.025)'; for (let y = 0; y < H2; y += 4) g.fillRect(0, y, W2, 1);
    tvT.needsUpdate = true;
  }
  /* ---------- gente, furgoneta y coches ---------- */
  const P = person(); world.add(P.g); P.g.position.set(TABLE[0] + 1.0, 0, TABLE[1] - .4);
  const courier = person('#FFCC00', M.red); courier.g.visible = false; world.add(courier.g);
  const V = van(); world.add(V.g); V.g.visible = false; V.g.position.set(LANE, 0, -22);
  const PL = plane(); PL.scale.setScalar(.42); PL.visible = false; scene.add(PL); let planeOn = false, planeT = 60;
  const cars = ['#E8E6E1', '#2B2D33', '#B9BCC2', '#8FA3B8', '#A53A3A'].map(c => { const k = car(c); world.add(k.g); k.g.visible = false; return k; });
  let carT = 3, carI = 0; const carRuns = [];

  /* ---------- datos → objetos (cantidades reales) ---------- */
  const clear = g => { while (g.children.length) g.remove(g.children[g.children.length - 1]); };
  let D = null, slotPos = {}, bagCount = 0;
  function update(d) {
    D = d; slotPos = {}; shelfMesh = {};
    // lo vendido que aún no ha preparado sigue físicamente en su sitio hasta que lo coge de verdad
    const waiting = {}, waitSz = {};
    d.pend.forEach(s => { if (!packed.has(s.id) && !(job && job.kind === 'sale' && job.id === s.id && job.picked)) { waiting[s.productId] = (waiting[s.productId] || 0) + 1; (waitSz[s.productId] = waitSz[s.productId] || []).push(String(s.size || '')); } });
    const sizesOf = p => [...(p.unitSizes || []), ...(waitSz[p.id] || [])];
    const shown = p => p.units + (waiting[p.id] || 0);
    const byCat = k => d.products.filter(p => p.cat === k && shown(p) > 0);
    const track = (p, m, sz) => { (shelfMesh[p.id] = shelfMesh[p.id] || []).push(m); m.userData.size = sz || ''; m.userData.tip = p.tip + (sz && sz !== 'Única' ? ' · talla ' + sz : ''); };
    // zapatillas: una caja por par, de 3 en 3 por hueco, cada producto seguido del anterior
    clear(shoeItems);
    const pairs = byCat('zapatillas').reduce((t, p) => t + shown(p), 0), per = Math.min(SW.per, Math.max(1, Math.ceil(pairs / (SW.bays * SW.levels))));
    const LV = [2, 1, 3, 0, 4];   // orden de baldas: primero la del medio
    let slot = 0; const cap = SW.bays * SW.levels * per;
    byCat('zapatillas').forEach(p => { const g = new THREE.Group(); g.userData.tip = p.tip; g.userData.rack = 'zapatillas'; shoeItems.add(g);
      const szs = sizesOf(p); let first = null;
      for (let k = 0; k < shown(p) && slot < cap; k++, slot++) {
        const cell = Math.floor(slot / per), inCell = slot % per, bay = cell % SW.bays, lvl = LV[Math.floor(cell / SW.bays)];
        const z = SW.z0 + bay * SW.bay + .04, y = .073 + lvl * SW.lv + inCell * .118; const sz = szs[k] || p.size; track(p, block(.33, .115, SW.bay - .07, shoeboxMats(brandOf(p.name), sz), .06, y, z, g), sz);
        if (!first) first = [.35, y + .4, z + .15];
      } slotPos[p.id] = first || [.35, 1, 1]; });
    // peluches: uno por unidad, amontonados en capas cada vez más pequeñas
    clear(plushItems);
    let n = 0; byCat('jellycat').forEach((p, pi) => { const g = new THREE.Group(); g.userData.tip = p.tip; g.userData.rack = 'jellycat'; plushItems.add(g);
      for (let k = 0; k < shown(p) && n < 70; k++, n++) {
        const layer = n < 14 ? 0 : n < 24 ? 1 : n < 31 ? 2 : n < 35 ? 3 : 4 + Math.floor((n - 35) / 8), idx = [n, n - 14, n - 24, n - 31, (n - 35) % 8][Math.min(layer, 4)];
        const cnt = [14, 10, 7, 4, 8][Math.min(layer, 4)], rad = [.62, .45, .28, .12, .5][Math.min(layer, 4)], a = idx / cnt * Math.PI * 2 + layer * .7;
        const x = PILE.x + Math.cos(a) * rad, z = PILE.z + Math.sin(a) * rad, y = .13 + layer * .19, m = M.plush[(pi * 2 + k) % M.plush.length], s = .9 + (n % 4) * .07;
        const pl = new THREE.Group(); pl.position.set(x, y, z); pl.rotation.y = -a + Math.PI / 2 + (n % 3) * .3; g.add(pl); pl.userData.kind = 'plush';
        ball(.13 * s, m, 0, 0, 0, pl, 1, .9, .95); ball(.1 * s, m, 0, .17 * s, .03, pl);
        ball(.034 * s, m, -.06 * s, .26 * s, .03, pl, .7, 1.7, .6); ball(.034 * s, m, .06 * s, .26 * s, .03, pl, .7, 1.7, .6);
        ball(.045 * s, m, -.12 * s, .02, .05, pl, .8, 1, 1.2); ball(.045 * s, m, .12 * s, .02, .05, pl, .8, 1, 1.2);
        ball(.012, M.dark, -.035 * s, .19 * s, .12 * s, pl); ball(.012, M.dark, .035 * s, .19 * s, .12 * s, pl); ball(.016, mat('#8C6A5A'), 0, .16 * s, .125 * s, pl);
        track(p, pl, sizesOf(p)[k]);
      } slotPos[p.id] = [PILE.x, .9, PILE.z]; });
    // camisetas: una por unidad
    clear(shirtItems);
    const total = byCat('futbol').reduce((t, p) => t + shown(p), 0), step = Math.min(.14, (RAIL.x1 - RAIL.x0 - .2) / Math.max(1, total - 1));
    let si = 0; byCat('futbol').forEach((p, pi) => { const g = new THREE.Group(); g.userData.tip = p.tip; g.userData.rack = 'futbol'; shirtItems.add(g); const m = shirtMat(pi);
      for (let k = 0; k < shown(p) && si < 40; k++, si++) {
        const x = RAIL.x0 + .1 + si * step, sh = new THREE.Group(); sh.position.set(x, 0, RAIL.z); sh.rotation.y = (si % 2 ? .04 : -.04); g.add(sh); sh.userData.kind = 'shirt'; sh.userData.mat = pi;
        const hook = new THREE.Mesh(new THREE.TorusGeometry(.04, .006, 6, 12, Math.PI), M.chrome); hook.position.set(0, 1.6, 0); hook.rotation.y = Math.PI / 2; sh.add(hook);
        block(.035, .08, .4, M.chrome, -.0175, 1.5, -.2, sh);
        block(.04, .6, .46, m, -.02, .94, -.23, sh); block(.036, .16, .17, m, -.018, 1.36, -.4, sh); block(.036, .16, .17, m, -.018, 1.36, .23, sh);
        block(.044, .04, .14, M.white, -.022, 1.5, -.07, sh);
        track(p, sh, sizesOf(p)[k]);
      } slotPos[p.id] = [(RAIL.x0 + RAIL.x1) / 2, 1.9, RAIL.z]; });
    // otros: una caja por unidad en la estantería baja
    clear(otherItems);
    let oi = 0; byCat('otro').forEach(p => { const g = new THREE.Group(); g.userData.tip = p.tip; g.userData.rack = 'otro'; otherItems.add(g);
      for (let k = 0; k < shown(p) && oi < 18; k++, oi++) { const shelf = Math.floor(oi / 6), col = oi % 6, x = LOW.x0 + .08 + col * .37, y = [.073, .523, .973][shelf]; track(p, parcel(.3, .26, .3, x, y, LOW.z0 + .06, g), sizesOf(p)[k]); }
      slotPos[p.id] = [LOW.x0 + .6, .8, LOW.z0 + .3]; });
    // recepción: lo recibido esta semana + lo que el repartidor va descargando (una caja por unidad)
    recvUnits = d.recvUnits; unloadTotal = d.unloadUnits; if (d.vanMode !== 'unload') delivered = 0; drawPallet();
    // solo hay muebles donde hay algo: sin camisetas no hay burro, sin peluches no hay alfombra…
    const cnt = k => byCat(k).reduce((t, p) => t + shown(p), 0);
    gz.visible = cnt('zapatillas') > 0; rugJ.visible = cnt('jellycat') > 0; gf.visible = cnt('futbol') > 0; go.visible = cnt('otro') > 0;
    zret.visible = d.rets > 0;
    // devoluciones: una caja por devolución
    clear(retItems);
    for (let i = 0; i < Math.min(d.rets, 12); i++) parcel(.26, .18, .22, 8.0 + (i % 3) * .3, .55 + Math.floor(i / 6) * .19, 5.7 + Math.floor(i / 3 % 2) * .3, retItems);
    // móviles en el escritorio
    clear(phones);
    const mailLed = mat(0x34D399, { emissive: 0x34D399, emissiveIntensity: .9 });
    d.accounts.slice(0, 8).forEach((a, i) => { const g = new THREE.Group(); g.userData.tip = a.tip; g.userData.account = a.id; phones.add(g);
      block(.08, .014, .15, M.dark, DESK[0] + .1 + i * .11, .79, DESK[1] + .6, g); block(.07, .005, .13, a.warm ? mat(ACC, { emissive: ACC, emissiveIntensity: .5 }) : M.screen, DESK[0] + .105 + i * .11, .806, DESK[1] + .61, g);
      if (a.mail) block(.014, .006, .009, mailLed, DESK[0] + .133 + i * .11, .804, DESK[1] + .6005, g); });   // lucecita verde: su correo llega a la app
    vanMode = d.vanMode; planeOn = !!d.plane; letterOn = !!d.letter; drawWeek(d.weekUnits || 0); drawFeats(d.feats); if (d.featTV) tvData = d.featTV;
    pins = d.alerts; for (const id of [...packed]) if (!d.pend.some(s => s.id === id)) packed.delete(id); savePacked(); drawTub(); plan();
  }

  /* ---------- el trabajador: hace lo que pasa de verdad ----------
     · por cada venta por preparar: va a su sitio, coge ESA unidad de la estantería, la deja en la mesa, la mete en
       una bolsa gris de su tamaño, la precinta, imprime y pega la etiqueta, la lleva a la vagoneta (que se va llenando)
       y registra la venta en el ordenador. Lo hecho se guarda: si recargas no lo repite.
     · sin nada que preparar: tareas de tiempo muerto (calentar cuentas, buscar productos, revisar stock, ordenar, barrer) */
  const LSP = 'almPacked';
  const packed = new Set((() => { try { return JSON.parse(localStorage.getItem(LSP) || '[]'); } catch (e) { return []; } })());
  const savePacked = () => { try { localStorage.setItem(LSP, JSON.stringify([...packed])); } catch (e) {} };
  let shelfMesh = {};
  const kindOf = cat => cat === 'zapatillas' ? 'shoe' : cat === 'jellycat' ? 'plush' : cat === 'futbol' ? 'shirt' : 'box';
  const LIFT = { shoe: .06, plush: .11, shirt: .03, box: .13 };                       // media altura de cada cosa
  const BAG = { shoe: [.41, .15, .31], plush: [.4, .22, .31], shirt: [.38, .07, .29], box: [.41, .3, .31] };   // bolsas de envío a medida
  function itemMesh(kind, info = {}) {
    const g = new THREE.Group();
    if (kind === 'shoe') block(.33, .115, .21, shoeboxMats(brandOf(info.name || ''), info.size), -.165, -.0575, -.105, g);
    else if (kind === 'plush') { const m = M.plush[(info.name || '').length % M.plush.length]; ball(.11, m, 0, 0, 0, g, 1, .9, .95); ball(.08, m, 0, .14, .02, g); ball(.028, m, -.05, .22, .02, g, .7, 1.7, .6); ball(.028, m, .05, .22, .02, g, .7, 1.7, .6); }
    else if (kind === 'shirt') block(.3, .05, .24, shirtMat(info.mat || 0), -.15, -.025, -.12, g);
    else block(.3, .26, .3, kraftMats, -.15, -.13, -.15, g);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function bagMesh(kind) { const g = new THREE.Group(), [bw, bh, bd] = BAG[kind]; block(bw, bh, bd, bagMats, -bw / 2, -bh / 2, -bd / 2, g); g.userData.h = bh; return g; }
  const labelMesh = () => { const g = new THREE.Group(); block(.1, .006, .07, M.white, -.05, -.003, -.035, g); block(.06, .007, .012, M.dark, -.035, -.003, -.02, g); return g; };
  // utensilios
  const clipG = (() => { const g = new THREE.Group(); block(.24, .32, .012, mat('#C9A274'), -.12, -.22, .03, g); block(.2, .26, .004, M.white, -.1, -.19, .043, g); block(.08, .03, .02, M.chrome, -.04, .08, .03, g); return g; })();
  const phoneG = (() => { const g = new THREE.Group(); block(.075, .15, .012, M.dark, -.037, -.1, .02, g); block(.065, .13, .004, M.screen, -.032, -.09, .033, g); return g; })();
  // escoba sujeta delante del cuerpo: palo desde las manos hasta el suelo y cepillo con cerdas
  const broomG = (() => { const g = new THREE.Group(), a = new THREE.Vector3(.1, 1.02, .3), b = new THREE.Vector3(.02, .07, .82), dir = b.clone().sub(a), len = dir.length();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, len, 10), mat('#B59B7A', { roughness: .6 })); stick.position.copy(a).add(b).multiplyScalar(.5); stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); stick.castShadow = true; g.add(stick);
    const head = new THREE.Group(); head.position.copy(b); g.add(head); block(.42, .05, .08, M.red, -.21, .0, -.04, head); block(.4, .06, .07, mat('#3A3D44', { roughness: 1 }), -.2, -.06, -.035, head);
    g.visible = false; return g; })();
  P.g.add(broomG);
  const handProp = k => { while (P.hand.children.length) P.hand.remove(P.hand.children[0]); broomG.visible = k === 'broom'; if (k === 'clip') P.hand.add(clipG); if (k === 'phone') P.hand.add(phoneG); };
  // la mesa y la vagoneta
  const tableG = new THREE.Group(); tableG.position.set(TABLE[0] + 1.05, .935, TABLE[1] + .4); zprep.add(tableG);
  const printOut = new THREE.Vector3(TABLE[0] + .64, 1.0, TABLE[1] + .12);
  function tubLayout(kinds) {                                    // cada bolsa al hueco más bajo: la pila crece de verdad
    const cells = [[tx0 + .255, tz0 + .21], [tx0 + .695, tz0 + .21], [tx0 + .255, tz0 + .54], [tx0 + .695, tz0 + .54]], hgt = [0, 0, 0, 0];
    return kinds.map((k, i) => { let c = 0; for (let j = 1; j < 4; j++) if (hgt[j] < hgt[c] - .001) c = j; const h = BAG[k][1], y = .18 + hgt[c] + h / 2; hgt[c] += h; return { x: cells[c][0], y, z: cells[c][1], r: ((i * 37) % 7 - 3) * .01 }; });
  }
  const readyList = () => (D ? D.pend : []).filter(s => packed.has(s.id));
  function drawTub() {
    clear(outItems); const ready = readyList(), lay = tubLayout(ready.map(s => kindOf(s.cat)));
    ready.slice(0, 40).forEach((s, i) => { const b = bagMesh(kindOf(s.cat)), L = lay[i]; b.position.set(L.x, L.y, L.z); b.rotation.y = L.r; b.userData.tip = s.tip; const lb = labelMesh(); lb.position.set(.05, b.userData.h / 2 + .003, .02); b.add(lb); outItems.add(b); });
    zout.visible = (D && D.pend.length > 0) || ready.length > 0;
  }
  // movimiento fluido de una cosa entre dos sitios (en coordenadas del mundo)
  const idQ = new THREE.Quaternion(), wv = new THREE.Vector3();
  let fl = null;
  function fly(obj, toFn, dur, done, toQ) { world.attach(obj); fl = { obj, from: obj.position.clone(), fromQ: obj.quaternion.clone(), toFn, t: 0, dur, done, toQ }; }
  const toCarry = (obj, dur, done) => fly(obj, carryPos, dur, done, P.g.quaternion.clone());
  function tickFly(dt) {
    if (!fl) return; const f = fl; f.t += dt; const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k), to = f.toFn();
    f.obj.position.lerpVectors(f.from, to, e); f.obj.position.y += Math.sin(k * Math.PI) * .1; f.obj.quaternion.slerpQuaternions(f.fromQ, f.toQ || idQ, e);
    if (k >= 1) { fl = null; if (f.done) f.done(); }
  }
  const carryPos = () => P.carry.getWorldPosition(wv).clone();
  const holdIn = (obj, parent) => { parent.attach(obj); obj.position.set(0, 0, 0); obj.quaternion.identity(); };
  let held = null, onTable = null, bagNow = null, label = null;
  const SPOT = {
    table: [TABLE[0] + 1.05, TABLE[1] - .38], printer: [TABLE[0] + .64, TABLE[1] - .38], aisle: [TABLE[0] - .5, TABLE[1] - .38],
    tub: [tx0 - .38, tz0 + td / 2], chair: [DESK[0] + 1.0, DESK[1] + 1.1]
  };
  function pickSpot(s) {
    if (s.cat === 'jellycat') return [[PILE.x + 1.05, PILE.z - .35], -Math.PI / 2, 'el montón de peluches'];
    if (s.cat === 'futbol') return [[(RAIL.x0 + RAIL.x1) / 2, RAIL.z - .65], 0, 'el burro de camisetas'];
    if (s.cat === 'otro') return [[LOW.x0 + 1.0, .95], Math.PI, 'la estantería'];
    const sp = slotPos[s.productId]; return [[1.0, sp ? sp[2] : 2.0], -Math.PI / 2, 'la pared de zapatillas'];
  }
  const short = s => s.name + (s.size ? ' · ' + s.size : '');
  function saleJob(s) {
    const kind = kindOf(s.cat), info = { kind, name: s.name, size: s.size };
    const [spot0, face, where] = pickSpot(s);
    // va justo delante de la unidad que va a coger
    const pickIdx = list => { if (!list || !list.length) return -1; for (let i = list.length - 1; i >= 0; i--) if (list[i].userData.size === String(s.size || '')) return i; return list.length - 1; };
    const target = () => { const list = shelfMesh[s.productId], i = pickIdx(list); return i < 0 ? null : list[i]; };
    const tgt = target(); let spot = spot0;
    if (tgt && s.cat === 'zapatillas') { tgt.getWorldPosition(wv); spot = [1.0, wv.z]; }
    if (tgt && s.cat === 'futbol') { tgt.getWorldPosition(wv); spot = [wv.x, RAIL.z - .65]; }
    if (tgt && s.cat === 'jellycat') { tgt.getWorldPosition(wv); const dx = wv.x - PILE.x, dz = wv.z - PILE.z, l = Math.hypot(dx, dz) || 1; spot = [PILE.x + dx / l * 1.05, PILE.z + dz / l * 1.05]; }
    const job = { kind: 'sale', id: s.id, picked: false, steps: [] };
    job.steps = [
      { go: SPOT.aisle, say: 'Va a por ' + short(s) },
      { go: spot, say: 'Va a por ' + short(s) + ' a ' + where },
      { anim: 'pick', t: 2.2, face: s.cat === 'jellycat' ? Math.atan2(PILE.x - spot[0], PILE.z - spot[1]) : face, say: 'Cogiendo ' + short(s),
        start: () => { const list = shelfMesh[s.productId], pi = pickIdx(list); let m = pi < 0 ? null : list.splice(pi, 1)[0];
          if (m && m.userData.kind === 'shirt') { const w2 = new THREE.Vector3(); m.getWorldPosition(w2); m.parent.remove(m); m = itemMesh('shirt', { mat: m.userData.mat }); m.position.set(w2.x, 1.24, w2.z); world.add(m); }
          if (!m) { m = itemMesh(kind, info); P.carry.getWorldPosition(wv); m.position.copy(wv); world.add(m); }
          held = m; job.picked = true; toCarry(m, 1.6, () => holdIn(m, P.carry)); },
        end: () => log('Ha cogido ' + short(s) + ' de ' + where) },
      { go: SPOT.aisle, carry: true, say: 'Lo lleva a la mesa de embalar' },
      { go: SPOT.table, carry: true, say: 'Lo lleva a la mesa de embalar' },
      { anim: 'place', t: 1.3, face: 0, say: 'Lo deja en la mesa', start: () => { if (held) fly(held, () => tableG.getWorldPosition(wv).clone().add(new THREE.Vector3(0, LIFT[kind], 0)), 1.1, () => { onTable = held; held = null; }); } },
      { anim: 'pack', t: 4.2, face: 0, say: 'Lo mete en la bolsa de envío', start: () => { bagNow = bagMesh(kind); bagNow.scale.set(.2, .2, .2); tableG.add(bagNow); bagNow.position.set(0, BAG[kind][1] / 2, 0); }, tick: k => { if (bagNow) bagNow.scale.setScalar(.2 + .8 * k); if (onTable) { if (!onTable.userData.s0) onTable.userData.s0 = onTable.scale.clone(); onTable.scale.copy(onTable.userData.s0).multiplyScalar(1 - .5 * k); onTable.position.y = tableG.position.y + LIFT[kind] - k * .04; } },
        end: () => { if (onTable) { onTable.parent.remove(onTable); onTable = null; } } },
      { anim: 'pack', t: 3.6, face: 0, say: 'Cerrando y precintando la bolsa', end: () => log('Empaquetado ' + short(s)) },
      { go: SPOT.printer, say: 'Imprimiendo la etiqueta de envío' },
      { anim: 'print', t: 3.6, face: 0, say: 'Imprimiendo la etiqueta de envío', start: () => { label = labelMesh(); label.position.copy(printOut); world.add(label); }, tick: k => { if (label) label.position.set(printOut.x, printOut.y + .02, printOut.z + .02 + k * .1); },
        end: () => { if (label) holdIn(label, P.hand); } },
      { go: SPOT.table, say: 'Pegando la etiqueta' },
      { anim: 'stick', t: 2.0, face: 0, say: 'Pegando la etiqueta', start: () => { if (label && bagNow) fly(label, () => bagNow.getWorldPosition(wv).clone().add(new THREE.Vector3(.05, BAG[kind][1] / 2 + .004, .02)), 1.2, () => { holdIn(label, bagNow); label.position.set(.05, BAG[kind][1] / 2 + .004, .02); label = null; }); },
        end: () => log('Etiqueta pegada') },
      { anim: 'place', t: 1.2, face: 0, say: 'Coge el paquete', start: () => { if (bagNow) toCarry(bagNow, 1.0, () => holdIn(bagNow, P.carry)); } },
      { go: SPOT.tub, carry: true, say: 'Lo lleva a la vagoneta de envíos' },
      { anim: 'drop', t: 1.6, face: Math.PI / 2, say: 'Lo deja en la vagoneta de envíos',
        start: () => { const L = tubLayout([...readyList(), s].map(x => kindOf(x.cat))).pop(); if (bagNow) { bagNow.userData.toQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, L.r, 0)); fly(bagNow, () => new THREE.Vector3(L.x, L.y, L.z), 1.3, null, bagNow.userData.toQ); } },
        end: () => { if (bagNow) { bagNow.parent && bagNow.parent.remove(bagNow); bagNow = null; } packed.add(s.id); savePacked(); drawTub(); log(short(s) + ' listo para enviar'); } },
      { go: SPOT.aisle, say: 'Va a registrar la venta' },
      { go: SPOT.chair, say: 'Va a registrar la venta' },
      { anim: 'type', t: 5, face: Math.PI, sit: true, say: 'Registrando la venta en el ordenador', end: () => log('Venta registrada: ' + short(s)) }
    ];
    return job;
  }
  const IDLE = [
    () => ({ kind: 'idle', steps: [{ go: SPOT.chair, say: 'Va a calentar cuentas' }, { anim: 'phone', t: 36, face: Math.PI, sit: true, say: 'Calentando cuentas en los móviles', start: () => handProp('phone'), end: () => { handProp(null); log('Ha calentado las cuentas'); } }] }),
    () => ({ kind: 'idle', steps: [{ go: SPOT.chair, say: 'Va al portátil' }, { anim: 'type', t: 28, face: Math.PI, sit: true, say: 'Buscando productos ganadores en el portátil', end: () => log('Ha buscado productos ganadores') }] }),
    () => ({ kind: 'idle', steps: [{ go: SPOT.aisle, say: 'Va a revisar el stock', start: () => handProp('clip') }, { go: [1.0, .9], say: 'Revisando el stock' }, { anim: 'check', t: 3.5, face: -Math.PI / 2, say: 'Revisando el stock' }, { go: [1.0, 2.0], say: 'Revisando el stock' }, { anim: 'check', t: 3.5, face: -Math.PI / 2, say: 'Revisando el stock' }, { go: [1.0, 3.1], say: 'Revisando el stock' }, { anim: 'check', t: 3.5, face: -Math.PI / 2, say: 'Revisando el stock', end: () => { handProp(null); log('Ha revisado el stock'); } }] }),
    () => ({ kind: 'idle', steps: [{ go: SPOT.aisle, say: 'Va a ordenar la estantería' }, { go: [1.0, 1.6], say: 'Ordenando la estantería' }, { anim: 'organize', t: 12, face: -Math.PI / 2, say: 'Ordenando la estantería', end: () => log('Ha ordenado la estantería') }] }),
    () => ({ kind: 'idle', steps: [{ go: [3.2, 5.9], say: 'Va a barrer', start: () => handProp('broom') }, { go: [7.2, 5.9], sweep: true, say: 'Barriendo' }, { go: [7.2, 2.6], sweep: true, say: 'Barriendo' }, { go: [3.6, 2.4], sweep: true, say: 'Barriendo', end: () => { handProp(null); log('Ha barrido'); } }] })
  ];
  let job = null, idleI = Math.floor(Math.random() * IDLE.length), seated = false, say = '';
  const log = txt => opts.onLog && opts.onLog(txt);
  function cleanup() { handProp(null); for (const o of [held, onTable, bagNow, label]) if (o && o.parent) o.parent.remove(o); held = onTable = bagNow = label = null; fl = null; while (P.carry.children.length) P.carry.remove(P.carry.children[0]); }
  function startNext() {
    cleanup();
    const s = D && D.pend.find(x => !packed.has(x.id));
    job = s ? saleJob(s) : IDLE[idleI++ % IDLE.length](); job.i = 0;
  }
  function plan() {
    // si estaba en una tarea de tiempo muerto y aparece una venta por preparar, la deja y se pone con la venta
    if (!job || (job.kind === 'idle' && D.pend.some(x => !packed.has(x.id)))) startNext();
    else if (job.kind === 'sale' && !D.pend.some(x => x.id === job.id)) startNext();     // la marcaste como enviada o la borraste
  }
  const SPEED = 1.1, tmp = new THREE.Vector3();
  const turn = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * Math.min(1, k); };
  function moveTo(Q, target, dt, t, speed = SPEED) {
    const p = Q.g.position; tmp.set(target[0] - p.x, 0, target[1] - p.z); const dist = tmp.length();
    if (dist < .03) return true;
    tmp.normalize(); p.x += tmp.x * Math.min(dist, speed * dt); p.z += tmp.z * Math.min(dist, speed * dt);
    Q.g.rotation.y = turn(Q.g.rotation.y, Math.atan2(tmp.x, tmp.z), dt * 10); return false;
  }
  function tickWorker(dt, t) {
    tickFly(dt);
    if (!job) startNext(); if (!job) return;
    const st = job.steps[job.i]; if (!st) { startNext(); return; }
    if (!st._on) { st._on = true; st._t = 0; if (st.start) st.start(); }
    say = st.say || say; const p = P.g.position;
    seated = !!st.sit;
    if (st.go) {
      if (moveTo(P, st.go, dt, t)) { if (st.end) st.end(); job.i++; return; }
      walkPose(P, t, !!st.carry);
      if (st.sweep) { const s2 = Math.sin(t * 4); P.armR.rotation.x = P.armL.rotation.x = -.85; P.armR.rotation.z = s2 * .12; P.armL.rotation.z = s2 * .12; broomG.rotation.y = s2 * .16; P.legL.rotation.x *= .5; P.legR.rotation.x *= .5; }
      else if (broomG.visible) { P.armR.rotation.x = P.armL.rotation.x = -.85; P.armL.rotation.z = P.armR.rotation.z = 0; broomG.rotation.y = 0; }
      else if (P.hand.children.length && !st.carry) P.armR.rotation.x = -.5;
      return;
    }
    st._t += dt; if (st.face !== undefined) P.g.rotation.y = turn(P.g.rotation.y, st.face, dt * 8);
    const k = Math.min(1, st._t / st.t), w = Math.sin(t * 7);
    if (st.tick) st.tick(k);
    P.legL.rotation.x = P.legR.rotation.x = 0; p.y = 0; P.armL.rotation.z = P.armR.rotation.z = 0;
    switch (st.anim) {
      case 'pick': P.armR.rotation.x = P.armL.rotation.x = -1.45 - Math.sin(k * Math.PI) * .4; break;
      case 'place': case 'drop': P.armR.rotation.x = P.armL.rotation.x = -1.2 + Math.sin(k * Math.PI) * .4; break;
      case 'pack': P.armR.rotation.x = -1.1 + w * .25; P.armL.rotation.x = -1.1 - w * .25; break;
      case 'print': P.armR.rotation.x = -1.0 + Math.sin(t * 3) * .08; P.armL.rotation.x = -.2; break;
      case 'stick': P.armR.rotation.x = -1.15 + Math.max(0, Math.sin(t * 6)) * .2; P.armL.rotation.x = -1.0; break;
      case 'check': P.armL.rotation.x = -1.0; P.armR.rotation.x = -.9 + Math.sin(t * 4) * .1; break;
      case 'organize': P.armR.rotation.x = -2.1 + w * .3; P.armL.rotation.x = -2.1 - w * .3; break;
      case 'type': case 'phone':
        p.set(SPOT.chair[0], -.36, SPOT.chair[1]); P.legL.rotation.x = P.legR.rotation.x = -1.45;
        if (st.anim === 'type') { P.armL.rotation.x = -1.15 + Math.sin(t * 8) * .05; P.armR.rotation.x = -1.15 + Math.sin(t * 8 + 1.6) * .05; }
        else { P.armR.rotation.x = -2.0 + Math.sin(t * 2) * .05; P.armL.rotation.x = -1.2; }
        break;
    }
    if (st._t >= st.t && !fl) { if (st.end) st.end(); if (st.sit) p.y = 0; job.i++; }
  }

  /* ---------- calle: coches, el avión y la furgoneta de reparto ---------- */
  // días 0–9 tras el pedido: avión a lo lejos · 10–11: llega la furgoneta y aparca · 12+: descarga hasta que confirmas
  let vanMode = null, vanState = 'away', vanT = 2, vanSpeed = 0, recvUnits = 0, unloadTotal = 0, delivered = 0;
  const STOP = 3.4;
  const cPath = [[LANE - 1.25, STOP - 4.0], [RX + 1.0, STOP - 4.0], [RX + .6, (DOOR.z0 + DOOR.z1) / 2], [RX - .5, (DOOR.z0 + DOOR.z1) / 2], [px + .6, pz + 1.5]];
  let cStep = 0, cDir = 1, cWait = 0;
  function drawPallet() {
    clear(inItems); const n = Math.min(recvUnits + delivered, 45);
    palletG.visible = n > 0 || vanMode === 'unload';
    for (let i = 0; i < n; i++) { const l = Math.floor(i / 9), c = i % 9; parcel(.37, .3, .37, px + .02 + (c % 3) * .39, .13 + l * .305, pz + .02 + Math.floor(c / 3) * .39, inItems); }
    if (recvUnits && n) block(1.24, .305 * Math.ceil(n / 9) + .02, 1.24, M.film, px - .02, .125, pz - .02, inItems, false);
  }
  function spinWheels(ws, d) { for (const w2 of ws) w2.rotation.x += d / .38; }
  const doorsTo = k => { V.doors[0].rotation.y = -k * 1.9; V.doors[1].rotation.y = k * 1.9; };
  function tickStreet(dt, t) {
    carT -= dt;
    if (carT <= 0) { const c = cars[carI++ % cars.length]; if (!c.g.visible) { let dir = Math.random() < .5 ? 1 : -1; if (dir > 0 && vanState !== 'away') dir = -1;
      c.g.visible = true; c.g.position.set(dir > 0 ? LANE : RX + 7.5, 0, dir > 0 ? -18 : 22); c.g.rotation.y = dir > 0 ? 0 : Math.PI; carRuns.push({ c, dir }); } carT = 5 + Math.random() * 7; }
    for (let i = carRuns.length - 1; i >= 0; i--) { const r = carRuns[i]; const d = r.dir * 6.5 * dt; r.c.g.position.z += d; spinWheels(r.c.wheels, Math.abs(d)); if (r.c.g.position.z > 23 || r.c.g.position.z < -19) { r.c.g.visible = false; carRuns.splice(i, 1); } }
    // avión cruzando el cielo a lo lejos (por la derecha, por encima de la calle, sin tapar la habitación)
    if (planeOn || PL.visible) { planeT += dt; const cyc = planeT % 90, sx = 1.5 + cyc / 18 * 14, K = 1.2, L = ZONES.overview.at;
      PL.position.set(L[0] + (sx * 1.414 + K) / 2, 6.9 + Math.sin(planeT * .5) * .08, L[2] + (K - sx * 1.414) / 2); PL.rotation.set(0, Math.PI * .75, Math.sin(planeT * .7) * .04);
      PL.visible = planeOn && cyc < 18; }
    // furgoneta
    const G = V.g;
    if (vanState === 'away') { vanT -= dt; if (vanMode && vanT <= 0) { vanState = 'arrive'; G.visible = true; G.position.z = -22; doorsTo(0); } }
    else if (vanState === 'arrive') { const left = STOP - G.position.z; vanSpeed = Math.max(.6, Math.min(7, left * 1.1)); const d = Math.min(left, vanSpeed * dt); G.position.z += d; spinWheels(V.wheels, d); if (left < .01) vanState = 'parked'; }
    else if (vanState === 'parked') { if (vanMode === 'unload') { vanState = 'open'; vanT = 0; } else if (!vanMode) { vanState = 'leave'; vanSpeed = .5; } }
    else if (vanState === 'open') { vanT += dt; doorsTo(Math.min(1, vanT / 1.2)); if (vanT >= 1.2) { vanState = 'unload'; courier.g.visible = true; courier.g.position.set(cPath[0][0], 0, cPath[0][1]); cStep = 1; cDir = 1; cWait = 0; } }
    else if (vanState === 'unload') {
      const more = delivered < unloadTotal;
      if (!vanMode && cDir > 0 && cStep <= 1) { cDir = -1; cStep = 0; }                // confirmado: vuelve a la furgoneta
      if (cWait > 0) { cWait -= dt; standPose(courier, cDir > 0, t); }
      else if (cStep === 0 && cDir < 0 && moveTo(courier, cPath[0], dt, t, 1.25)) {
        if (!vanMode) { courier.g.visible = false; vanState = 'close'; vanT = 0; }
        else if (more) { cDir = 1; cStep = 1; cWait = .8; } else { standPose(courier, false, t); courier.g.rotation.y = 0; }
      }
      else if (cStep > 0 || cDir > 0) { const target = cPath[cStep];
        if (moveTo(courier, target, dt, t, 1.25)) { cStep += cDir;
          if (cStep >= cPath.length) { delivered++; drawPallet(); cDir = -1; cStep = cPath.length - 2; cWait = .9; }
          if (cStep < 0) cStep = 0; }
        else walkPose(courier, t, cDir > 0); }
      courier.box.visible = cDir > 0 && courier.g.visible;
    }
    else if (vanState === 'close') { vanT += dt; doorsTo(1 - Math.min(1, vanT / 1.0)); if (vanT >= 1.0) { vanState = 'leave'; vanSpeed = .5; } }
    else if (vanState === 'leave') { vanSpeed = Math.min(8, vanSpeed + dt * 3); const d = vanSpeed * dt; G.position.z += d; spinWheels(V.wheels, d); if (G.position.z > 26) { G.visible = false; vanState = 'away'; vanT = 3; } }
    const parkedish = vanState === 'parked' || vanState === 'open' || vanState === 'unload' || vanState === 'close';
    M.amber.emissiveIntensity = parkedish && Math.sin(t * 7) > 0 ? 1.2 : 0;
  }

  /* ---------- cámara ---------- */
  const cam = new THREE.OrthographicCamera(-10, 10, 6, -6, 10, 120); skyScene.add(sky);
  renderer.autoClear = false;
  const look = new THREE.Vector3(...ZONES.overview.at), lookTo = look.clone();
  let zoom = 1, zoomTo = 1, az = Math.PI / 4, azTo = az, idle = 0, auto = 0;
  const EL = .64, R = 50, VIEW = 11.6;
  // primer plano: cámara casi a la altura de los ojos, de frente, y un corte que quita lo que hay delante
  let el = EL, elTo = EL, near = 10, nearTo = 10, front = false;
  let host = null, raf = 0, W = 1, H = 1, last = performance.now(), clock2 = 0;
  function fit() { if (!host) return; const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); }
  const ro = new ResizeObserver(fit);
  function placeCam(dt) {
    idle += dt;
    if (!front && idle > 15) { auto += dt; if (auto > 50) { auto = 0; azTo = Math.PI / 4 + (Math.random() * 2 - 1) * .18; } }
    // se acerca suave y, al llegar, se queda quieta del todo (sin micro-movimientos que hagan temblar la imagen)
    look.lerp(lookTo, Math.min(1, dt * 2.6)); if (look.distanceTo(lookTo) < 4e-3) look.copy(lookTo);
    zoom += (zoomTo - zoom) * Math.min(1, dt * 2.5); if (Math.abs(zoomTo - zoom) < 1e-3) zoom = zoomTo; az += (azTo - az) * Math.min(1, dt * 1.6); if (Math.abs(azTo - az) < 2e-3) az = azTo;
    el += (elTo - el) * Math.min(1, dt * 2.6); if (Math.abs(elTo - el) < 1e-3) el = elTo;
    near += (nearTo - near) * Math.min(1, dt * 3); if (Math.abs(nearTo - near) < 1e-2) near = nearTo; cam.near = near;
    fill.intensity += ((front ? .9 : 0) - fill.intensity) * Math.min(1, dt * 3); P.g.visible = !(front && near > 30);
    const a = W / H; cam.left = -VIEW * a / 2; cam.right = VIEW * a / 2; cam.top = VIEW / 2; cam.bottom = -VIEW / 2; cam.zoom = zoom; cam.updateProjectionMatrix();
    cam.position.set(look.x + R * Math.sin(az) * Math.cos(el), look.y + R * Math.sin(el), look.z + R * Math.cos(az) * Math.cos(el)); cam.lookAt(look);
  }
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); idle = 0; });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return hoverAt(e);
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    drag.x = e.clientX; drag.y = e.clientY; idle = 0;
    const k = VIEW / H / zoom, right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), fwd = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az));
    if (front) { lookTo.addScaledVector(right, -dx * k); lookTo.y = Math.max(.5, Math.min(2.2, lookTo.y + dy * k)); } else lookTo.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.sin(el));
    lookTo.x = Math.max(-1, Math.min(RX + 6, lookTo.x)); lookTo.z = Math.max(-3, Math.min(RZ + 2, lookTo.z)); look.copy(lookTo);
  });
  canvas.addEventListener('pointerup', e => { if (drag && !drag.moved) clickAt(e); drag = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); idle = 0; zoomTo = Math.max(.85, Math.min(front ? 6 : 3.5, zoomTo * (e.deltaY < 0 ? 1.15 : .87))); }, { passive: false });

  /* ---------- ratón: nombres y clic (sin cambiar colores, para que nada parpadee) ---------- */
  const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const skip = new Set([M.floor, M.wall, M.grass, M.road, M.walk, M.curb, M.rug]);
  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(ndc, cam); const hit = rc.intersectObjects([world, PL], true).find(h => !skip.has(h.object.material));
    if (!hit) return {}; let o = hit.object, zone = null, tip = null, rack = null;
    while (o) { if (!tip && o.userData.tip) tip = o.userData.tip; if (!rack && o.userData.rack) rack = o.userData.rack; if (!zone && o.userData.zone) zone = o.userData.zone; o = o.parent; }
    if (!zone && hit.object && PL.visible) { let q = hit.object; while (q) { if (q === PL) { zone = 'in'; tip = 'Pedido en camino'; break; } q = q.parent; } }
    if (!zone && hit.object && V.g.visible) { let q = hit.object; while (q) { if (q === V.g) { zone = 'in'; tip = 'Pedido llegando'; break; } q = q.parent; } }
    return { zone, tip, rack };
  }
  let lastHover = 0;
  function hoverAt(e) { const now = performance.now(); if (now - lastHover < 60) return; lastHover = now; const h = pick(e); canvas.style.cursor = h.zone ? 'pointer' : 'grab'; if (opts.onTip) opts.onTip(h.tip, e); }
  function clickAt(e) { const h = pick(e); if (h.zone && opts.onSelect) opts.onSelect(h.rack || h.zone, h); }
  canvas.addEventListener('mouseleave', () => opts.onTip && opts.onTip(null));

  /* ---------- bucle ---------- */
  let pins = [];
  const v = new THREE.Vector3();
  const proj = (x, y, z) => { v.set(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  const SIGNS = { zapatillas: [.3, SW.levels * SW.lv + .5, SW.z0 + SW.bays * SW.bay / 2], jellycat: [PILE.x, 1.25, PILE.z], futbol: [(RAIL.x0 + RAIL.x1) / 2, 2.05, RAIL.z], otro: [LOW.x0 + LOW.w / 2, 1.35, LOW.z0 + .2] };
  function frame(now) {
    if (!canvas.isConnected) { raf = 0; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now; clock2 += dt;
    if (D) tickWorker(dt, clock2); tickStreet(dt, clock2);
    letterM.visible = letterOn; flag.rotation.z = letterOn ? 0 : -1.5; if (letterOn) letterM.position.y = 1.1 + Math.sin(clock2 * 2) * .015;
    featG.children.forEach(g => { g.rotation.y = clock2 * 1.6 + g.userData.ph; g.position.y = g.userData.y + Math.sin(clock2 * 2.2 + g.userData.ph) * .05; const s = 1 + Math.sin(clock2 * 3 + g.userData.ph) * .06; g.scale.setScalar(s); });
    tvTick += dt; if (tvTick > 1 / 24) { tvTick = 0; drawTV(clock2); }
    tickNight(dt, clock2); placeCam(dt); sky.position.copy(cam.position); sky.quaternion.copy(cam.quaternion); sky.scale.setScalar(1 / zoom);
    renderer.clear(); renderer.clippingPlanes = []; renderer.render(skyScene, cam); renderer.clearDepth(); renderer.clippingPlanes = island; renderer.render(scene, cam);
    if (opts.onFrame) opts.onFrame({
      racks: Object.entries(SIGNS).map(([k, p]) => [k, proj(...p)]),
      front, person: front ? null : proj(P.g.position.x, seated ? 1.75 : 2.1, P.g.position.z), activity: { say, progress: job ? Math.min(1, job.i / job.steps.length) : 0, kind: job ? job.kind : '' },
      truck: V.g.visible ? proj(V.g.position.x, 3.2, V.g.position.z - 1.2) : null, truckState: vanState,
      plane: PL.visible ? proj(PL.position.x, PL.position.y + .9, PL.position.z) : null,
      pins: pins.map(p => ({ ...p, xy: proj(...(p.at || slotPos[p.productId] || [0, 0, 0])) })), zoom
    });
    raf = requestAnimationFrame(frame);
  }

  return {
    canvas,
    attach(el) { if (host !== el) { if (host) ro.unobserve(host); host = el; ro.observe(el); } if (canvas.parentNode !== el) el.prepend(canvas); fit(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } },
    update,
    flyTo(k) {
      if (k === 'zapatillas') {          // de frente a la pared de zapatillas, a la altura de las cajas
        front = true; const len = SW.bays * SW.bay; lookTo.set(.3, SW.levels * SW.lv / 2 + .05, SW.z0 + len / 2 - .85);
        azTo = Math.PI / 2; elTo = .1; nearTo = R - 1.55; zoomTo = Math.min(5, VIEW / (SW.levels * SW.lv + 1.6)); idle = 0; return;
      }
      if (k === 'feat') {                // de frente a la tele de destacados
        front = true; lookTo.set(8.7, 1.62, .1); azTo = 0; elTo = .14; nearTo = R - 1.6; zoomTo = VIEW / 1.9; idle = 0; return;
      }
      front = false; elTo = EL; nearTo = 10;
      const s = SIGNS[k]; const Zn = ZONES[k] || (s && { at: [s[0] + .6, .7, s[2]], zoom: 2.3 }); if (!Zn) return; lookTo.set(...Zn.at); zoomTo = Zn.zoom; azTo = Math.PI / 4; idle = 0; },
    zoomBy(f) { zoomTo = Math.max(.85, Math.min(front ? 6 : 3.5, zoomTo * f)); idle = 0; },
    state: () => ({ zoom, zoomTo, look: look.toArray(), van: vanState })
  };
}
