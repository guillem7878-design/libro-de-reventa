/* Pestaña «Almacén» (solo ordenador): el negocio dibujado como un local pequeño en isométrico.
   Cada zona enseña datos reales y abre lo que ya hace la app:
   estanterías → stock · mesa de embalar → ventas por preparar · carro → enviadas · cesta → devoluciones
   · cajas en la puerta → compras a proveedor · escritorio → móviles y su saldo.
   El chico hace lo que pasa de verdad: empaqueta si hay ventas por preparar, desembala si hoy ha llegado
   un pedido, trabaja en el portátil si hoy ha habido movimiento y duerme en el sofá si el día está parado.
   Usa lo que define index.html (S, render, go, openSheet, write, db…). */
(() => {
  'use strict';

  /* ---------- datos ---------- */
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
  // por enviar: lo dice shipOpen (index.html); con el correo conectado, cada venta sigue aquí hasta que Vinted avisa de que ha salido
  const pend = () => S.sales.filter(shipOpen).sort((a, b) => (a.shipDeadline || '9').localeCompare(b.shipDeadline || '9') || (a.date || '').localeCompare(b.date || ''));
  const sentWeek = () => S.sales.filter(s => s.status !== 'devuelta' && !shipOpen(s) && shipWhen(s) >= daysAgo(6));
  const rets = () => S.sales.filter(s => s.status === 'devuelta' && (s.returnedAt || s.date || '') >= daysAgo(30)).sort((a, b) => (b.returnedAt || '').localeCompare(a.returnedAt || ''));
  const incoming = () => S.expenses.filter(e => e.category === 'pedido' && (e.date || '') >= daysAgo(14)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const zoneOf = p => { const k = CATS[p && p.category] ? p.category : 'otro', kd = CATS[k].kind; return kd === 'shoe' ? 'zapatillas' : kd === 'plush' ? 'jellycat' : kd === 'clothes' ? 'futbol' : 'otro'; };
  const stockList = () => S.products.filter(p => units(p) > 0).sort((a, b) => CAT_ORDER.indexOf(zoneOf(a)) - CAT_ORDER.indexOf(zoneOf(b)) || units(b) - units(a));
  // qué está haciendo ahora el chico, según lo que ha pasado hoy
  function mood() {
    const f = window.ALMACEN && window.ALMACEN.force; if (f) return { k: f, txt: { pack: 'Empaquetando 2 pedidos', unbox: 'Desembalando lo que ha llegado', desk: 'Hoy 3 ventas, todo enviado' }[f] };
    const t = today(), pd = pend().length;
    const salesToday = S.sales.filter(s => s.date === t).length, ordersToday = S.expenses.filter(e => e.category === 'pedido' && e.receivedAt === t).length;
    if (pd) return { k: 'pack', txt: `Empaquetando ${pd === 1 ? '1 pedido' : pd + ' pedidos'}` };
    if (ordersToday) return { k: 'unbox', txt: 'Desembalando lo que ha llegado' };
    if (salesToday) return { k: 'desk', txt: `Hoy ${salesToday === 1 ? '1 venta' : salesToday + ' ventas'}, todo enviado` };
    return { k: 'desk', txt: 'Sin movimiento hoy · en el ordenador' };
  }

  /* ---------- isométrico ---------- */
  const U = 25, C30 = .866;
  const P = (x, y, z = 0) => [(x - y) * U * C30, (x + y) * U * .5 - z * U];
  const pt = (x, y, z) => P(x, y, z).map(n => n.toFixed(1)).join(',');
  const pts = a => a.map(p => pt(p[0], p[1], p[2] || 0)).join(' ');
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (h, k) => '#' + hex(h).map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
  const quad = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
  const EDGE = 'stroke="rgba(0,0,0,.22)" stroke-width=".6" stroke-linejoin="round"';
  // bloque con sus tres caras visibles (arriba, frente derecho y frente izquierdo) y un filo de luz arriba
  function box(x, y, z, w, d, h, col, extra = '', o = {}) {
    const top = o.top || col, r = o.r || shade(col, .82), l = o.l || shade(col, .66);
    return `<g ${extra}>` +
      `<polygon points="${pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}" fill="${r}" ${EDGE}/>` +
      `<polygon points="${pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${l}" ${EDGE}/>` +
      `<polygon points="${pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${top}" ${EDGE}/>` +
      `<polyline points="${pts([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y, z + h]])}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".8"/></g>`;
  }
  // sombra suave en el suelo bajo un mueble
  const shadow = (x, y, w, d, k = 1) => `<polygon points="${pts([[x - .15, y - .1], [x + w + .45, y - .1], [x + w + .55, y + d + .55], [x - .05, y + d + .45]])}" fill="rgba(0,0,0,${.32 * k})" filter="url(#almBlur)"/>`;
  // caja de cartón con cinta y etiqueta
  function carton(x, y, z, w, d, h, k = 1, extra = '') {
    const c = shade('#B98F62', k);
    let s = box(x, y, z, w, d, h, c, extra, { top: shade('#C79C6C', k) });
    s += quad([[x + w * .44, y, z + h], [x + w * .56, y, z + h], [x + w * .56, y + d, z + h], [x + w * .44, y + d, z + h]], 'rgba(233,217,184,.75)');
    s += quad([[x + w * .44, y + d, z + h * .55], [x + w * .56, y + d, z + h * .55], [x + w * .56, y + d, z + h], [x + w * .44, y + d, z + h]], 'rgba(233,217,184,.6)');
    s += quad([[x + w, y + d * .2, z + h * .25], [x + w, y + d * .55, z + h * .25], [x + w, y + d * .55, z + h * .55], [x + w, y + d * .2, z + h * .55]], 'rgba(255,255,255,.75)');
    return s;
  }
  const CAT_HEX = { zapatillas: '#D4B06A', jellycat: '#7F9BBF', futbol: '#D08A66', otro: '#B58AA6' };
  const WOOD = '#8F6C4B', WHITE = '#E9E5DC', METAL = '#3B3F48';

  /* ---------- el chico (rubio, media melena, camiseta, vaqueros y Samba) ---------- */
  const DEFS = `<defs>
    <filter id="almBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="almGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
    <linearGradient id="almHair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DC9C"/><stop offset=".55" stop-color="#E2C27A"/><stop offset="1" stop-color="#B8924F"/></linearGradient>
    <linearGradient id="almJeans" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3E4F6B"/><stop offset=".5" stop-color="#4C5F80"/><stop offset="1" stop-color="#34435C"/></linearGradient>
    <linearGradient id="almTee" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DCD7CC"/><stop offset=".45" stop-color="#F3F0EA"/><stop offset="1" stop-color="#C9C3B6"/></linearGradient>
    <linearGradient id="almSkin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E8C2A0"/><stop offset="1" stop-color="#D7AB86"/></linearGradient>
    <linearGradient id="almWallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--almWallTop)"/><stop offset="1" stop-color="var(--almWallBot)"/></linearGradient>
    <radialGradient id="almLamp"><stop offset="0" stop-color="rgba(255,214,150,.55)"/><stop offset="1" stop-color="rgba(255,214,150,0)"/></radialGradient>
  </defs>`;
  const samba = (x, flip) => `<g transform="translate(${x},0) scale(${flip ? -1 : 1},1)"><path d="M-6 -6.5 h7 q5 0 6 4 l.5 2 h-14.5 q-.5 -6 1 -6z" fill="#F4F2EC" stroke="rgba(0,0,0,.25)" stroke-width=".5"/><path d="M-6.5 -.6 h15 v2 h-15z" fill="#C68B59"/><path d="M-2 -6 l2 4.6 M.6 -6 l2 4.6 M3.2 -6 l2 4.6" stroke="#15171B" stroke-width="1"/></g>`;
  const head = `<g><rect x="-3.2" y="-87" width="6.4" height="8" fill="#D7AB86"/>
    <ellipse cx="0" cy="-95" rx="8.3" ry="10" fill="url(#almSkin)"/><ellipse cx="-8.2" cy="-94" rx="1.8" ry="2.6" fill="#D7AB86"/><ellipse cx="8.2" cy="-94" rx="1.8" ry="2.6" fill="#D7AB86"/>
    <ellipse cx="-3" cy="-94.5" rx="1.1" ry="1.3" fill="#2B2620"/><ellipse cx="3" cy="-94.5" rx="1.1" ry="1.3" fill="#2B2620"/>
    <path d="M-4.8 -97.6 q1.8 -1 3.4 0 M1.4 -97.6 q1.8 -1 3.4 0" stroke="#C9A55E" stroke-width=".9" fill="none"/><path d="M-2.2 -89.3 q2.2 1.2 4.4 0" stroke="#A9725A" stroke-width=".8" fill="none"/>
    <path d="M-10 -94 Q-11.5 -108 0 -108.5 Q11.5 -108 10.6 -94 Q10.4 -86 9.2 -83 Q8.6 -90 8.3 -94 Q5 -102 -2 -100.5 Q-6.5 -99.5 -8.2 -93 Q-8.6 -87 -9.6 -83 Q-10.6 -88 -10 -94 Z" fill="url(#almHair)"/>
    <path d="M-6 -104 q4 -3 9 -.5 M-2 -106 q5 -1.5 8 2" stroke="#F8E6B4" stroke-width=".8" fill="none" opacity=".7"/></g>`;
  // de pie, de frente. arms: 'down' | 'work' (manos sobre la mesa, una con la cinta)
  function standing(arms) {
    const a = arms === 'work'
      ? `<path d="M-12.5 -77 Q-15 -66 -10 -58 L-3 -54" stroke="url(#almTee)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M-10.5 -60 L-3 -54" stroke="#D7AB86" stroke-width="5.4" stroke-linecap="round"/>
         <g class="tape"><path d="M12.5 -77 Q15 -66 10 -58 L4 -53" stroke="url(#almTee)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M10.5 -60 L4 -53" stroke="#D7AB86" stroke-width="5.4" stroke-linecap="round"/><circle cx="4" cy="-52" r="3.4" fill="#C9A55E" stroke="#8C6A35" stroke-width=".8"/></g>`
      : `<path d="M-12.5 -77 Q-15.5 -64 -14 -52" stroke="url(#almTee)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M-14.4 -60 L-13.6 -48" stroke="#D7AB86" stroke-width="5.4" stroke-linecap="round"/>
         <path d="M12.5 -77 Q15.5 -64 14 -52" stroke="url(#almTee)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M14.4 -60 L13.6 -48" stroke="#D7AB86" stroke-width="5.4" stroke-linecap="round"/>`;
    return `<ellipse cx="0" cy="0" rx="17" ry="6" fill="rgba(0,0,0,.3)" filter="url(#almBlur)"/>
      <path d="M-10.5 -51 L-.8 -51 L-2.2 -6 L-9 -6 Z" fill="url(#almJeans)"/><path d="M.8 -51 L10.5 -51 L9 -6 L2.2 -6 Z" fill="url(#almJeans)"/>
      <path d="M-11 -53 h22 v4 h-22z" fill="#2B2D33"/>
      ${samba(-6, false)}${samba(6, true)}
      <path d="M-13 -78 Q0 -84.5 13 -78 L11.2 -51 L-11.2 -51 Z" fill="url(#almTee)"/><path d="M-4 -82 q4 3 8 0" stroke="#BDB6A8" stroke-width="1" fill="none"/>
      ${a}${head}`;
  }
  // sentado en la silla, de espaldas, con el portátil delante
  const seatedBack = `<path d="M-13 -42 Q0 -48 13 -42 L11 -8 L-11 -8 Z" fill="url(#almTee)"/>
      <path d="M-13 -40 Q-17 -26 -10 -18 M13 -40 Q17 -26 10 -18" stroke="url(#almTee)" stroke-width="7" stroke-linecap="round" fill="none"/>
      <rect x="-3.2" y="-52" width="6.4" height="8" fill="#D7AB86"/>
      <ellipse cx="0" cy="-60" rx="8.6" ry="10" fill="#D7AB86"/>
      <path d="M-10 -60 Q-11 -73 0 -73.5 Q11 -73 10.2 -60 Q10.4 -50 8 -46.5 Q2 -44 -2 -44.5 Q-8 -45.5 -9.6 -49 Q-10.6 -54 -10 -60 Z" fill="url(#almHair)"/>
      <path d="M-5 -69 q3 6 1 14 M3 -70 q2 6 0 15" stroke="#C9A55E" stroke-width=".9" fill="none" opacity=".8"/>`;

  /* ---------- la escena ---------- */
  const RX = 22, RY = 14, RH = 6.5;
  function scene() {
    const light = document.body.classList.contains('light'), m = mood();
    const floorA = light ? '#CBB79B' : '#2C2621', floorB = light ? '#C4AF92' : '#29231F';
    const wallL = light ? '#ECE8E0' : '#262930', wallR = light ? '#E4DFD5' : '#20232A';
    let s = DEFS;
    // paredes con zócalo
    s += quad([[0, 0, 0], [0, RY, 0], [0, RY, RH], [0, 0, RH]], wallL);
    s += quad([[0, 0, 0], [RX, 0, 0], [RX, 0, RH], [0, 0, RH]], wallR);
    s += quad([[0, 0, RH - .25], [0, RY, RH - .25], [0, RY, RH], [0, 0, RH]], shade(wallL, 1.06));
    s += quad([[0, 0, 0], [0, RY, 0], [0, RY, .3], [0, 0, .3]], light ? '#F7F5F0' : '#30333A');
    s += quad([[0, 0, 0], [RX, 0, 0], [RX, 0, .3], [0, 0, .3]], light ? '#F2EFE9' : '#2C2F36');
    // suelo de tarima
    for (let j = 0, r = 0; j < RY; j += .7, r++) {
      const off = (r % 3) * 1.6;
      for (let i = -off; i < RX; i += 4.8) { const x0 = Math.max(0, i), x1 = Math.min(RX, i + 4.8), y1 = Math.min(RY, j + .7);
        if (x1 > x0) s += quad([[x0, j], [x1, j], [x1, y1], [x0, y1]], ((r + Math.round(i)) % 2) ? floorA : floorB, `stroke="rgba(0,0,0,${light ? .08 : .22})" stroke-width=".5"`); }
    }
    // luz de la ventana en el suelo
    s += `<polygon points="${pts([[7.2, .2], [10.6, .2], [12.4, 4.6], [9.0, 4.6]])}" fill="rgba(255,236,200,${light ? .22 : .07})" filter="url(#almBlur)"/>`;
    // ventana con marco, cuadro de zapatillas y enchufe
    s += quad([[7, 0, 3.0], [10.6, 0, 3.0], [10.6, 0, 5.7], [7, 0, 5.7]], light ? '#F4F2EC' : '#3A3D45');
    s += quad([[7.2, 0, 3.2], [10.4, 0, 3.2], [10.4, 0, 5.5], [7.2, 0, 5.5]], light ? '#BFD6E6' : '#33465E');
    s += `<polyline points="${pts([[8.8, 0, 3.2], [8.8, 0, 5.5]])} " stroke="${light ? '#F4F2EC' : '#3A3D45'}" stroke-width="3"/><polyline points="${pts([[7.2, 0, 4.35], [10.4, 0, 4.35]])}" stroke="${light ? '#F4F2EC' : '#3A3D45'}" stroke-width="2.2"/>`;
    s += quad([[0, 10.2, 3.2], [0, 12.8, 3.2], [0, 12.8, 5.2], [0, 10.2, 5.2]], light ? '#2B2D33' : '#14161A');
    s += quad([[0, 10.4, 3.4], [0, 12.6, 3.4], [0, 12.6, 5.0], [0, 10.4, 5.0]], '#E9E4DA');
    s += `<g transform="translate(${P(0, 11.5, 4.2).join(',')}) skewY(26.6)"><path d="M-14 3 q2 -6 9 -6 h8 q6 0 9 4 l1 3 h-27z" fill="#F4F2EC" stroke="#15171B" stroke-width=".8"/><path d="M-4 -2 l3 5 M0 -2 l3 5 M4 -2 l3 5" stroke="#15171B" stroke-width="1.2"/><path d="M-14 3 h27 v2 h-27z" fill="#C68B59"/></g>`;
    s += quad([[3.6, 0, .9], [4.1, 0, .9], [4.1, 0, 1.35], [3.6, 0, 1.35]], light ? '#FFFFFF' : '#3A3D45');

    // lámpara de pie en la esquina (encendida por la noche/siesta)
    s += shadow(.8, .7, .6, .6);
    s += `<ellipse cx="${P(1.1, 1, 0)[0]}" cy="${P(1.1, 1, 0)[1]}" rx="11" ry="5" fill="${METAL}"/>`;
    s += `<polyline points="${pts([[1.1, 1, 0], [1.1, 1, 4.6]])}" stroke="${METAL}" stroke-width="2.4"/>`;
    s += `<path d="M${P(1.1, 1, 5.3)[0] - 14} ${P(1.1, 1, 4.6)[1]} L${P(1.1, 1, 5.3)[0] - 9} ${P(1.1, 1, 5.3)[1]} L${P(1.1, 1, 5.3)[0] + 9} ${P(1.1, 1, 5.3)[1]} L${P(1.1, 1, 5.3)[0] + 14} ${P(1.1, 1, 4.6)[1]} Z" fill="${light ? '#E8E2D6' : '#D9D2C4'}"/>`;
    if (!light) s += `<circle cx="${P(1.1, 1, 4.2)[0]}" cy="${P(1.1, 1, 4.2)[1]}" r="60" fill="url(#almLamp)" opacity=".45"/>`;

    // OFICINA: escritorio, portátil, flexo, móviles en su soporte y silla
    s += `<g class="az" data-alm="office">`;
    s += shadow(3, .3, 6.8, 2.6);
    for (const [lx, ly] of [[3.2, .45], [9.4, .45], [3.2, 2.5], [9.4, 2.5]]) s += box(lx, ly, 0, .22, .22, 1.85, METAL);
    s += box(3, .3, 1.85, 6.8, 2.6, .18, WOOD, '', { top: '#A07A55' });
    s += box(5.5, .7, 2.03, 2.3, 1.55, .07, '#C9CCD3');
    s += quad([[5.5, .7, 2.1], [7.8, .7, 2.1], [7.8, .7, 3.55], [5.5, .7, 3.55]], '#2B2F38');
    s += quad([[5.62, .7, 2.2], [7.68, .7, 2.2], [7.68, .7, 3.45], [5.62, .7, 3.45]], m.k === 'desk' ? '#6E8FB4' : (light ? '#9DB6D0' : '#33475F'));
    if (m.k === 'desk') s += `<circle cx="${P(6.6, .9, 2.8)[0]}" cy="${P(6.6, .9, 2.8)[1]}" r="38" fill="rgba(140,180,230,.18)" filter="url(#almGlow)"/>`;
    s += box(8.8, .55, 2.03, .5, .5, .1, METAL) + `<polyline points="${pts([[9.05, .8, 2.13], [9.05, .8, 3.2], [9.6, 1.4, 3.3]])}" stroke="${METAL}" stroke-width="2" fill="none"/>`;
    s += `<ellipse cx="${P(9.6, 1.45, 3.25)[0]}" cy="${P(9.6, 1.45, 3.25)[1]}" rx="7" ry="4" fill="${light ? '#2B2F38' : '#D9D2C4'}"/>`;
    s += box(3.25, .55, 2.03, 2.0, .5, .12, METAL);                                                       // soporte de móviles
    const accs = accounts().slice(0, 5);
    accs.forEach((a, i) => { const x = 3.35 + i * .38, y = .65;
      s += box(x, y, 2.15, .3, .1, .66, '#14161A', `data-tip="${esc(a.name)} · saldo ${money(balance(a.id).saldo)}"`);
      s += quad([[x + .03, y + .1, 2.2], [x + .27, y + .1, 2.2], [x + .27, y + .1, 2.76], [x + .03, y + .1, 2.76]], a.warm ? '#D9B66F' : '#5B6380'); });
    s += carton(3.4, 1.6, 2.03, .9, .8, .55, .95);                                                       // caja para fotos
    s += box(8.0, 1.75, 2.03, .38, .38, .42, '#EDE7DB') + `<ellipse cx="${P(8.19, 1.94, 2.45)[0]}" cy="${P(8.19, 1.94, 2.45)[1]}" rx="3.2" ry="1.6" fill="#5A3E2B"/>`;
    // persona en el escritorio (va antes que la silla para que el respaldo quede delante)
    if (m.k === 'desk') { const [px, py] = P(6.6, 3.55, 1.5); s += `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">${seatedBack}</g>`; }
    // silla de oficina
    const [cx, cy] = P(6.6, 3.9, 0);
    s += `<ellipse cx="${cx}" cy="${cy + 2}" rx="20" ry="8" fill="rgba(0,0,0,.25)" filter="url(#almBlur)"/>`;
    s += `<path d="M${cx - 16} ${cy} L${cx + 16} ${cy} M${cx} ${cy - 7} L${cx} ${cy + 7}" stroke="${METAL}" stroke-width="2.4"/><polyline points="${pts([[6.6, 3.9, 0], [6.6, 3.9, 1.3]])}" stroke="${METAL}" stroke-width="3"/>`;
    s += box(5.95, 3.3, 1.3, 1.3, 1.2, .25, '#2C3038');
    s += box(5.95, 4.35, 1.55, 1.3, .22, 1.6, '#2C3038', '', { top: '#3A3F48' });
    s += `</g>`;

    // ESTANTERÍAS de cubos con una caja por producto
    s += `<g class="az" data-alm="stock">`;
    const prods = stockList(), COLS = 5, ROWS = 3, CW = 1.5, SH = 1.45, Y0 = .8, maxU = Math.max(6, ...prods.map(units));
    s += shadow(.15, Y0, 1.75, COLS * CW + .2);
    s += box(.15, Y0, 0, 1.7, COLS * CW + .2, ROWS * SH + .2, WHITE, '', { r: '#D9D4C9', l: '#C9C3B6' });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const y = Y0 + .1 + c * CW, z = .1 + r * SH, i = (ROWS - 1 - r) * COLS + c, p = prods[i];
      s += quad([[1.85, y + .08, z + .08], [1.85, y + CW - .08, z + .08], [1.85, y + CW - .08, z + SH - .08], [1.85, y + .08, z + SH - .08]], light ? '#BDB6A8' : '#6F6A62');
      s += quad([[1.85, y + .08, z + SH - .08], [1.85, y + CW - .08, z + SH - .08], [1.85, y + CW - .08, z + SH - .3], [1.85, y + .08, z + SH - .3]], 'rgba(0,0,0,.18)');
      if (p) { const u = units(p), k = Math.max(.4, Math.min(1, u / maxU)), bh = (SH - .4) * k, bw = CW - .45;
        s += carton(.55, y + .22, z + .1, 1.2, bw, bh, 1 - (i % 3) * .05, `class="pbox" data-tip="${esc(p.name)} · ${u} ${u === 1 ? 'ud' : 'uds'}"`);
        s += quad([[1.75, y + .3, z + .1 + bh * .2], [1.75, y + .3 + bw * .25, z + .1 + bh * .2], [1.75, y + .3 + bw * .25, z + .1 + bh * .2 + .18], [1.75, y + .3, z + .1 + bh * .2 + .18]], CAT_HEX[zoneOf(p)]);
        }
    }
    s += `</g>`;

    // planta grande junto a la puerta
    s += shadow(20.3, .5, 1.2, 1.2);
    s += box(20.4, .6, 0, 1.1, 1.1, 1.2, light ? '#D8D2C6' : '#4A4D55', '', { top: '#3B2E22' });
    for (const [lx, ly, lz, rx, ry, c] of [[20.9, 1.1, 2.4, 20, 26, '#4F7D54'], [20.6, .9, 3.2, 15, 20, '#5E8C61'], [21.2, 1.3, 2.9, 14, 18, '#6B9B6C'], [20.95, 1.05, 3.9, 11, 15, '#79AA79']]) {
      const [ex, ey] = P(lx, ly, lz); s += `<ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${c}"/>`; }

    // ENTRADA: puerta y cajas de proveedor (hoy, abiertas si está desembalando)
    s += `<g class="az" data-alm="in">`;
    s += quad([[15.8, 0, 0], [18.8, 0, 0], [18.8, 0, 4.6], [15.8, 0, 4.6]], light ? '#F2EFE9' : '#34373F');
    s += quad([[16, 0, 0], [18.6, 0, 0], [18.6, 0, 4.4], [16, 0, 4.4]], light ? '#C9B79B' : '#4A3D30');
    s += quad([[16.25, 0, 2.4], [18.35, 0, 2.4], [18.35, 0, 4.1], [16.25, 0, 4.1]], 'rgba(0,0,0,.12)');
    s += `<circle cx="${P(18.25, 0, 2.1)[0]}" cy="${P(18.25, 0, 2.1)[1]}" r="2.2" fill="#C9A55E"/>`;
    const inc = incoming(), nIn = Math.min(inc.length, 4);
    const spots = [[15.4, 1.0, 0], [16.9, 1.1, 0], [16.1, 1.05, 1.0], [18.6, 1.3, 0]];
    for (let i = 0; i < nIn; i++) { const [x, y, z] = spots[i]; s += shadow(x, y, 1.3, 1.2, .6) + carton(x, y, z, 1.3, 1.2, 1.0, 1 - i * .04); }
    if (!nIn) s += quad([[15.6, .9, 0], [19, .9, 0], [19, 2.6, 0], [15.6, 2.6, 0]], 'transparent');
    s += `</g>`;

    // DEVOLUCIONES: cesta de mimbre al lado de la entrada
    s += `<g class="az" data-alm="ret">`;
    const rt = rets();
    s += shadow(2.4, 10.6, 2.4, 2.0);
    s += box(2.4, 10.6, 0, 2.4, 2.0, 1.1, '#9B7E57', '', { top: '#5A4630' });
    for (let k = .25; k < 1.1; k += .28) s += `<polyline points="${pts([[4.8, 10.6, k], [4.8, 12.6, k]])}" stroke="rgba(0,0,0,.18)" stroke-width=".8"/><polyline points="${pts([[2.4, 12.6, k], [4.8, 12.6, k]])}" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>`;
    for (let i = 0; i < Math.min(rt.length, 3); i++) s += carton(2.7 + i * .6, 10.9 + (i % 2) * .45, .75, .6, .6, .5, .92);
    s += `</g>`;

    // persona desembalando junto a la puerta
    if (m.k === 'unbox') { const [px, py] = P(17.6, 2.8, 0); s += `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">${standing('down')}</g>` + carton(17.2, 3.4, 0, 1.1, 1.0, .8, 1.02) + quad([[17.2, 3.4, .8], [16.7, 3.2, 1.3], [16.7, 4.2, 1.3], [17.2, 4.4, .8]], '#C79C6C'); }


    // MESA DE EMBALAR (persona detrás, empaquetando)
    s += `<g class="az" data-alm="prep">`;
    s += shadow(8.4, 6.9, 5.4, 2.8);
    if (m.k === 'pack') { const [px, py] = P(11.0, 6.15, 0); s += `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">${standing('work')}</g>`; }
    for (const [lx, ly] of [[8.55, 7.05], [13.55, 7.05], [8.55, 9.35], [13.55, 9.35]]) s += box(lx, ly, 0, .22, .22, 2.3, METAL);
    s += box(8.4, 6.9, .6, 5.4, 2.7, .1, METAL);                                                           // balda inferior
    s += carton(9.0, 7.3, .7, 1.2, 1.0, .5, .9) + box(11.2, 7.4, .7, 1.4, .9, .35, '#E9E2D4');              // cajas y sobres
    s += box(8.4, 6.9, 2.3, 5.4, 2.7, .16, '#B79670', '', { top: '#C9A985' });
    s += box(8.8, 7.25, 2.46, .9, .9, .28, '#3A3E47') + `<rect x="${P(9.25, 7.7, 2.75)[0] - 6}" y="${P(9.25, 7.7, 2.75)[1] - 3}" width="12" height="5" rx="1" fill="#9FD3A8"/>`;
    s += `<ellipse cx="${P(13.2, 9.0, 2.62)[0]}" cy="${P(13.2, 9.0, 2.62)[1]}" rx="8" ry="4.2" fill="#D9B26A" stroke="#8C6A35" stroke-width="1"/><ellipse cx="${P(13.2, 9.0, 2.62)[0]}" cy="${P(13.2, 9.0, 2.62)[1]}" rx="3.5" ry="1.8" fill="#8C6A35"/>`;
    const pd = pend(), nP = Math.min(pd.length, 6);
    for (let i = 0; i < nP; i++) { const x = 10.0 + (i % 3) * 1.0, y = 7.3 + Math.floor(i / 3) * 1.15, s0 = pd[i];
      s += carton(x, y, 2.46, .85, .95, .55, 1.05 - (i % 2) * .08, `data-tip="${esc(s0.name)}${s0.size ? ' · ' + esc(s0.size) : ''} · ${esc(accName(s0.account, s0.accountName))}"`); }
    s += `</g>`;

    // SALIDA: carro con lo enviado esta semana
    s += `<g class="az" data-alm="out">`;
    const sw = sentWeek(), nS = Math.min(sw.length, 8);
    s += shadow(18.4, 9.9, 2.8, 2.6);
    s += box(18.5, 10.0, .35, 2.6, 2.4, .12, METAL);
    for (const [wx, wy] of [[18.7, 12.3], [20.9, 12.3], [20.9, 10.1]]) { const [ex, ey] = P(wx, wy, .18); s += `<circle cx="${ex}" cy="${ey}" r="4.5" fill="#1A1C20" stroke="#4A4E57" stroke-width="1.4"/>`; }
    s += box(18.5, 10.0, .47, .12, 2.4, 2.4, METAL);                                                       // asa
    for (let i = 0; i < nS; i++) { const x = 18.75 + (i % 2) * 1.15, y = 10.2 + Math.floor(i / 2 % 2) * 1.05, z = .47 + Math.floor(i / 4) * .72;
      s += carton(x, y, z, 1.05, .95, .72, 1 - (i % 3) * .05); }
    s += `</g>`;

    return { svg: s, mood: m };
  }

  // posiciones de las etiquetas (en coordenadas del dibujo)
  const LABELS = [['stock', 1, 4.6, 5.3], ['office', 6.4, 1.4, 4.3], ['in', 17.3, 1.6, 5.2], ['prep', 13.4, 10.4, 2.4], ['ret', 3.6, 11.6, 2.4], ['out', 19.8, 11.2, 3.0]];
  const PERSON = { pack: [11.0, 6.15, 5.0], unbox: [17.6, 2.8, 5.0], desk: [6.6, 3.55, 4.6] };
  function labelText(k) {
    const tu = sum(S.products, units), pd = pend().length, sw = sentWeek().length, rt = rets().length, inc = incoming().length;
    const sal = r2(sum(accounts(), a => balance(a.id).saldo));
    return {
      stock: ['Estanterías', `${tu} uds · ${S.products.filter(p => units(p) > 0).length} productos`],
      office: ['Móviles', `${accounts().length} cuentas · saldo ${money(sal)}`],
      in: ['Entradas', inc ? `${inc} pedido${inc > 1 ? 's' : ''} en 2 semanas` : 'Nada llegando'],
      prep: ['Por preparar', pd ? `${pd} paquete${pd > 1 ? 's' : ''}` : 'Mesa libre'],
      ret: ['Devoluciones', rt ? `${rt} este mes` : 'Ninguna'],
      out: ['Enviados', `${sw} esta semana`]
    }[k];
  }

  /* ---------- pestaña ---------- */
  function vAlmacen() {
    const d = new Date();
    let h = `<header class="top"><div><div class="eyebrow">${cap(DAYS[d.getDay()])}, ${d.getDate()} de ${MONTHS_L[d.getMonth()]}</div><h1>Almacén</h1></div>
      <div class="dk-ctl"><button class="btn btn-main btn-sm" data-action="newSale">Apuntar venta</button><button class="round" data-action="more" aria-label="Ajustes">${G.dots}</button></div></header>`;
    if (!loadedAll() || S.error) return h + loading();
    const L = P(0, RY, 0)[0] - 20, R = P(RX, 0, 0)[0] + 20, T = P(0, 0, RH)[1] - 20, B = P(RX, RY, 0)[1] + 20, W = R - L, H = B - T;
    const at = (x, y, z) => { const [px, py] = P(x, y, z); return `left:${((px - L) / W * 100).toFixed(2)}%;top:${((py - T) / H * 100).toFixed(2)}%`; };
    const sc = scene();
    const labels = LABELS.map(([k, x, y, z]) => { const t = labelText(k); return `<button class="alm-tag" data-action="alm-zone" data-z="${k}" style="${at(x, y, z)}"><b>${t[0]}</b><span>${t[1]}</span></button>`; }).join('');
    const pp = PERSON[sc.mood.k];
    if (!window.__alm3dFail) return h + `<section class="alm"><div class="alm-room alm-3d" id="almRoom">${overlayHtml()}<div class="alm-load">Montando el almacén…</div></div></section>`;
    h += `<section class="alm"><div class="alm-room"><svg viewBox="${L.toFixed(0)} ${T.toFixed(0)} ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Almacén: ${esc(sc.mood.txt)}">${sc.svg}</svg>${labels}
      <div class="alm-mood ${sc.mood.k}" style="${at(...pp)}">${esc(sc.mood.txt)}</div></div>
      <p class="hint alm-hint">Haz clic en cada zona. Pasa el ratón por las cajas y los móviles para ver qué son.</p></section>`;
    return h;
  }

  /* ---------- 3D: el almacén con sus paneles ---------- */
  const ZK = { zapatillas: 'shoe', jellycat: 'plush', futbol: 'clothes', otro: 'box' };
  const zoneName = z => { const ls = CAT_ORDER.filter(k => CATS[k].kind === ZK[z] && S.products.some(p => (CATS[p.category] ? p.category : 'otro') === k && units(p) > 0)).map(k => CATS[k].label);
    return ls.length ? ls.join(' · ') : { zapatillas: 'Zapatillas', jellycat: 'Peluches', futbol: 'Ropa', otro: 'Otros' }[z]; };
  const CATN = {}; Object.keys(ZK).forEach(z => Object.defineProperty(CATN, z, { get: () => zoneName(z), enumerable: true }));
  const SPOTN = { zapatillas: 'Pared de zapatillas', jellycat: 'Montón de peluches', futbol: 'Burro de ropa', otro: 'Estantería baja' };
  const ZBTN = [['overview', 'Ciudad'], ['shop', 'Tienda'], ['phones', 'Móviles'], ['post', 'Envíos'], ['bank', 'Banco'], ['chain', 'Cadena'], ['in', 'Recepción'], ['stock', 'Stock'], ['prep', 'Preparación'], ['out', 'Salida'], ['ret', 'Devoluciones']];
  let world = null, loading3d = null, panelK = null, activeZ = 'overview';
  const IC = {
    pin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>'
  };
  const valor = l => r2(sum(l, p => (p.cost || 0) * units(p)));
  function alerts() {
    const a = [];
    const pd = pend().length; if (pd) a.push({ at: [5.4, 1.5, 3.75], k: 'prep', txt: pd + ' por preparar' });
    const rt = rets().filter(s => (s.returnedAt || '') >= daysAgo(7)).length; if (rt) a.push({ at: [8.45, 1.1, 6.0], k: 'ret', txt: rt + (rt > 1 ? ' devoluciones' : ' devolución') + ' esta semana' });
    if (typeof letterUnread === 'function' && loadedAll() && letterUnread()) a.push({ at: [10.35, 1.8, 8.15], k: 'mail', txt: 'Ha llegado tu carta' });
    if (onTheWay().some(o => o.n >= 12)) a.push({ at: [8.85, 1.3, 1.05], k: 'in', txt: 'Pedido en tu puerta: confírmalo' });
    return a;
  }
  // pedidos a proveedor: 0–9 días en avión, 10–11 llegando en furgoneta, 12+ descargando hasta que confirmas «Ha llegado»
  const pedidos = () => S.expenses.filter(e => e.category === 'pedido');
  const orderDays = e => days(e.date, today()) || 0;
  const stageOf = n => n >= 12 ? 'unload' : n >= 10 ? 'arrive' : 'plane';
  // los de hace más de 30 días sin confirmar se dan por recibidos
  const onTheWay = () => pedidos().filter(e => !e.receivedAt).map(e => ({ e, n: orderDays(e) })).filter(o => o.n <= 30).sort((x, y) => y.n - x.n);
  function shipping() {
    const w = onTheWay(), un = w.filter(o => o.n >= 12);
    return { plane: w.some(o => o.n < 10), vanMode: un.length ? 'unload' : w.some(o => o.n >= 10) ? 'arrive' : null,
      unloadUnits: sum(un, o => o.e.units || 1), recvUnits: sum(pedidos().filter(e => e.receivedAt && e.receivedAt >= daysAgo(6)), e => e.units || 1),
      recvToday: pedidos().some(e => e.receivedAt === today()) };
  }
  const LOGK = 'almLog';
  const readLog = () => { try { const j = JSON.parse(localStorage.getItem(LOGK) || '{}'); return j.d === today() ? j.items || [] : []; } catch (e) { return []; } };
  function addLog(txt) {
    const items = readLog(); const h = new Date(); items.unshift({ t: String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0'), txt }); items.length = Math.min(items.length, 40);
    try { localStorage.setItem(LOGK, JSON.stringify({ d: today(), items })); } catch (e) {}
    const ul = document.getElementById('aiLog'); if (ul) ul.innerHTML = logHtml(items); const rd = document.getElementById('aiReady'); if (rd) rd.textContent = readyCount() + '/' + pend().length;
    if (panelK === 'prep') { const p = document.getElementById('almPanel'); if (p && !p.hidden) p.innerHTML = panelHtml('prep'); }
  }
  const logHtml = items => items.length ? items.slice(0, 2).map(i => `<li><span>${i.t}</span>${esc(i.txt)}</li>`).join('') : '<li class="ai-none">Aún no ha pasado nada hoy.</li>';
  const packedIds = () => { try { return new Set(JSON.parse(localStorage.getItem('almPacked') || '[]')); } catch (e) { return new Set(); } };
  window.almPackedIds = packedIds;
  const readyCount = () => { let s; try { s = new Set(JSON.parse(localStorage.getItem('almPacked') || '[]')); } catch (e) { s = new Set(); } return pend().filter(x => s.has(x.id)).length; };
  const weekStart = () => { const t = today(), dow = (new Date(t + 'T00:00:00').getDay() + 6) % 7; return addDays(t, -dow); };
  const weekSales = () => S.sales.filter(s => s.status !== 'devuelta' && (s.date || '') >= weekStart() && (s.date || '') <= today());
  const FEAT_DAYS = 3;   // un destacado de Vinted dura 3 días
  const featsAll = () => S.expenses.filter(e => e.category === 'destacado').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const featLeft = e => FEAT_DAYS - (days(e.date, today()) || 0);
  const featsActive = () => featsAll().filter(e => featLeft(e) > 0);
  // lo que alimenta las acciones de la cadena en el almacén (solo lo de los últimos días: lo antiguo no se repite)
  function chain3d() {
    const it = s => ({ id: s.id, name: s.name, size: s.size || '', productId: s.productId, cat: zoneOf(prod(s.productId) || s), carrier: s.carrier || '', tip: s.name + (s.size ? ' · ' + s.size : '') });
    const ok = S.sales.filter(s => s.status !== 'devuelta'), d2 = daysAgo(2), l = accounts();
    const lbl = s => s.name + (s.size ? ' · ' + s.size : '');
    const ml = l.map(a => mailLast(a.id)).filter(Boolean).sort().pop() || '';
    return {
      shipped: ok.filter(s => !shipOpen(s) && shipWhen(s) >= d2 && shipWhen(s) <= today()).map(it),
      paid: ok.filter(s => s.paidAt && s.paidAt >= d2).map(it),
      payouts: l.flatMap(a => (a.payouts || []).filter(p => (p.date || '') >= d2).map(p => ({ id: p.id || (a.id + p.date + p.amount), tip: a.name + ' · ' + money(p.amount) }))),
      restock: S.sales.filter(s => s.status === 'devuelta' && s.restocked && s.productId && prod(s.productId) && (s.returnedAt || '') >= d2).map(it),
      saldo: r2(sum(l, x => balance(x.id).saldo)),
      postInfo: { ready: pend().filter(s => s.labelAt).length, sent: sentWeek().length },
      bankInfo: { saldo: money(r2(sum(l, x => balance(x.id).saldo))), pend: money(r2(sum(l, x => balance(x.id).pend))), month: money(sum(l.flatMap(x => x.payouts || []).filter(p => (p.date || '').slice(0, 7) === today().slice(0, 7)), p => p.amount)) },
      chain: { sold: pend().filter(s => !s.labelAt).map(lbl), label: pend().filter(s => s.labelAt).map(lbl), sent: ok.filter(s => !shipOpen(s) && !(s.paidAt || isFree(s)) && shipWhen(s) >= daysAgo(13)).map(lbl),
        paid: ok.filter(s => (s.paidAt || '') >= daysAgo(6)).map(lbl), on: l.filter(a => a.email).length, total: l.length, last: ml ? fmtDate(ml) : '' }
    };
  }
  function data3d() {
    return {
      products: S.products.filter(p => units(p) > 0 || pend().some(s => s.productId === p.id)).sort((a, b) => CAT_ORDER.indexOf(zoneOf(a)) - CAT_ORDER.indexOf(zoneOf(b)) || units(b) - units(a)).map(p => ({ id: p.id, name: p.name, cat: zoneOf(p), units: units(p), size: ((p.sizes || []).find(s => s.q > 0) || {}).s || '', unitSizes: (p.sizes || []).slice().sort((a, b) => String(a.s).localeCompare(String(b.s), 'es', { numeric: true })).flatMap(s => Array(Math.max(0, s.q | 0)).fill(String(s.s || ''))), tip: p.name })),
      accounts: accounts().map(x => ({ id: x.id, name: x.name, saldo: money(balance(x.id).saldo), pend: money(balance(x.id).pend), toShip: S.sales.filter(s => s.account === x.id && shipOpen(s)).length, month: S.sales.filter(s => s.account === x.id && s.status !== 'devuelta' && (s.date || '').slice(0, 7) === today().slice(0, 7)).length, warm: !!x.warm, mail: !!x.email, buzz: !!x.email && (S.mailin || []).some(m => (m.createdAt || 0) > Date.now() - 6e5 && String(m.to || '').toLowerCase().includes(String(x.email).toLowerCase())), tip: x.name + ' · saldo ' + money(balance(x.id).saldo) + (x.email ? ' · correo conectado' : '') })),
      pend: pend().map(s => ({ id: s.id, name: s.name, size: s.size || '', productId: s.productId, cat: zoneOf(prod(s.productId) || s), mail: mailOn(s.account), labelAt: s.labelAt || '', carrier: s.carrier || '', tip: s.name + (s.size ? ' · ' + s.size : '') + ' · ' + accName(s.account, s.accountName) })),
      letter: loadedAll() && letterUnread(), weekUnits: sum(weekSales(), s => s.qty || 1), featTV: (() => { const all = featsAll(), wk = weekStart(), mo = today().slice(0, 7);
        const ends = e => (e.createdAt ? e.createdAt : new Date(e.date + 'T00:00:00').getTime()) + FEAT_DAYS * 864e5;
        return { total: sum(all, e => e.amount), week: sum(all.filter(e => (e.date || '') >= wk), e => e.amount), month: sum(all.filter(e => (e.date || '').slice(0, 7) === mo), e => e.amount),
          active: all.filter(e => ends(e) > Date.now()).map(e => ({ name: (prod(e.productId) || {}).name || String(e.concept || 'Destacado').replace(/^Destacado( · )?/, '') || 'Destacado', ends: ends(e) })),
          last7: [6, 5, 4, 3, 2, 1, 0].map(n => sum(all.filter(e => e.date === addDays(today(), -n)), e => e.amount)) }; })(), feats: featsActive().filter(e => e.productId && prod(e.productId)).map(e => ({ id: e.id, cat: zoneOf(prod(e.productId)), productId: e.productId, tip: 'Destacado · ' + (prod(e.productId) || {}).name + ' · quedan ' + featLeft(e) + (featLeft(e) === 1 ? ' día' : ' días') })), incoming: incoming().length, ...chain3d(), rets: rets().length, sent: sentWeek().length, alerts: alerts(), ...shipping()
    };
  }
  /* panel lateral de cada zona, como la ficha de «Rayon A» del vídeo */
  const chip = u => u === 0 ? '<span class="ap-chip no">Agotado</span>' : '<span class="ap-chip ok">' + u + ' uds</span>';
  const rowBtn = (act, id, title, sub, right) => `<button class="ap-row" data-action="${act}" data-id="${id}"><span class="ap-rm"><b>${title}</b><span>${sub}</span></span>${right}</button>`;
  const pHead = (eye, title, sub, stats) => `<div class="ap-h"><div><span class="ap-e">${eye}</span><b>${title}</b>${sub ? `<span class="ap-s">${sub}</span>` : ''}</div><button class="ap-x" data-action="alm-close" aria-label="Cerrar">${G.x}</button></div>
      <div class="ap-stats">${stats.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>`;
  function panelHtml(k) {
    if (CATN[k]) {
      const ps = S.products.filter(p => zoneOf(p) === k).sort((a, b) => units(b) - units(a)), low = ps.filter(p => units(p) <= 2).length;
      return pHead('Stock · ' + SPOTN[k], CATN[k], ps.length + ' productos', [['Unidades', sum(ps, units)], ['Invertido', money(valor(ps))], ['Agotados', ps.filter(p => units(p) === 0).length]]) +
        `<div class="ap-l">Inventario</div><div class="ap-list">${ps.length ? ps.map(p => rowBtn('product', p.id, esc(p.name), (p.sizes || []).filter(s => s.q > 0).map(s => esc(s.s) + ' ×' + s.q).join(' · ') || 'Sin unidades', chip(units(p)))).join('') : '<p class="ap-empty">No hay productos en esta estantería.</p>'}</div>
        <div class="ap-f"><button class="btn btn-main btn-block" data-action="newProduct">Añadir producto</button></div>`;
    }
    if (k === 'stock' || k === 'overview' || k === 'shop') {
      const all = S.products, sal = r2(sum(accounts(), x => balance(x.id).saldo));
      const racksRows = Object.keys(CATN).map(c => { const ps = all.filter(p => zoneOf(p) === c); return rowBtn('alm-open', c, CATN[c] + ' · ' + SPOTN[c].toLowerCase(), ps.length + ' productos · ' + money(valor(ps)), '<span class="ap-chip ok">' + sum(ps, units) + ' uds</span>'); }).join('');
      const extra = k !== 'stock' ? rowBtn('alm-open', 'prep', 'Preparación', 'Ventas por enviar', '<span class="ap-chip ' + (pend().length ? 'lo' : 'ok') + '">' + pend().length + '</span>') +
        rowBtn('alm-open', 'out', 'Salida', 'Enviados esta semana', '<span class="ap-chip ok">' + sentWeek().length + '</span>') +
        rowBtn('alm-open', 'office', 'Escritorio', accounts().length + ' móviles', '<span class="ap-chip ok">' + money(sal) + '</span>') : '';
      return pHead(k === 'stock' ? 'Almacén' : 'Hoy', k === 'stock' ? 'Estanterías' : 'Vista general', '', [['Unidades', sum(all, units)], ['Invertido', money(valor(all))], ['Por preparar', pend().length], ['Saldo en cuentas', money(sal)]]) +
        `<div class="ap-l">${k === 'stock' ? 'Stock por zonas' : 'Zonas'}</div><div class="ap-list">${racksRows}${extra}</div>`;
    }
    if (k === 'prep') {
      const l = pend(), pk = packedIds(), todo = l.filter(s => !pk.has(s.id)), tub = l.filter(s => pk.has(s.id));
      const info = s => [esc(accName(s.account, s.accountName)), s.labelAt ? 'Etiqueta' + (s.carrier ? ' ' + esc(s.carrier.toUpperCase()) : '') : mailOn(s.account) ? 'Sin etiqueta aún' : '', s.shipBy ? 'sale sola el ' + fmtDate(s.shipBy) : s.shipDeadline ? 'antes del ' + fmtDate(s.shipDeadline) : '', money(s.price)].filter(Boolean).join(' · ');
      const late = s => s.shipDeadline && s.shipDeadline <= addDays(today(), 1);
      const row = (s, chip) => `<div class="ap-row"><button class="ap-rm" data-action="sale" data-id="${s.id}"><b>${esc(s.name)}${s.size ? ' · ' + esc(s.size) : ''}</b><span>${info(s)}</span></button>${late(s) ? '<span class="ap-chip lo">' + (s.shipDeadline <= today() ? 'Hoy' : 'Mañana') + '</span>' : chip}</div>`;
      return pHead('Preparación', 'Ventas por enviar', 'Salen solas cuando Vinted avisa del envío', [['Por preparar', todo.length], ['En la vagoneta', tub.length], ['Con etiqueta', l.filter(s => s.labelAt).length], ['Importe', money(sum(l, s => s.price))]]) +
        `<div class="ap-l">Por preparar</div><div class="ap-list">${todo.length ? todo.map(s => row(s, '<span class="ap-chip">' + (s.labelAt ? 'Etiqueta lista' : 'Preparando') + '</span>')).join('') : '<p class="ap-empty">Mesa libre: no hay nada por preparar.</p>'}</div>
        <div class="ap-l">En la vagoneta</div><div class="ap-list">${tub.length ? tub.map(s => row(s, '<span class="ap-chip ok">En la vagoneta</span>')).join('') : '<p class="ap-empty">La vagoneta está vacía.</p>'}</div>`;
    }
    // la oficina de los móviles: cada móvil es un agente con su puesto
    const accInfo = x => { const B = balance(x.id), mine = S.sales.filter(s => s.account === x.id && s.status !== 'devuelta'), mo = today().slice(0, 7);
      return { B, mine, open: mine.filter(shipOpen), month: mine.filter(s => (s.date || '').slice(0, 7) === mo), last: mailLast(x.id) }; };
    if (k === 'phones') {
      const l = accounts(), on = l.filter(x => x.email).length;
      return pHead('Oficina', 'Móviles', on + '/' + l.length + ' con el correo conectado · toca uno para entrar', [['En el saldo', money(r2(sum(l, x => balance(x.id).saldo)))], ['En camino', money(r2(sum(l, x => balance(x.id).pend)))], ['Por enviar', S.sales.filter(shipOpen).length], ['Calentadas', l.filter(x => x.warm).length + '/' + l.length]]) +
        `<div class="ap-l">Cada móvil</div><div class="ap-list">${l.map(x => { const I = accInfo(x); return rowBtn('alm-open', 'acc:' + x.id, esc(x.name), [x.email ? 'Correo ✓' : 'Sin correo', x.warm ? 'calentada' : 'sin calentar', I.open.length ? I.open.length + ' por enviar' : '', I.month.length + ' ventas este mes'].filter(Boolean).join(' · '), '<span class="ap-chip ' + (I.B.saldo > 0 ? 'ok' : '') + '">' + money(I.B.saldo) + '</span>'); }).join('') || '<p class="ap-empty">Aún no tienes móviles.</p>'}</div>`;
    }
    if (String(k).startsWith('acc:')) {
      const x = accounts().find(a => a.id === k.slice(4)); if (!x) return '';
      const I = accInfo(x), c = { sold: 0, label: 0, sent: 0, paid: 0 }; I.mine.filter(s => (s.date || '') >= daysAgo(30)).forEach(s => { const g = shipStage(s); if (c[g] !== undefined) c[g]++; });
      const outs = (x.payouts || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')), rec = I.mine.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
      const mails = (S.mailin || []).filter(m => x.email && String(m.to || '').toLowerCase().includes(String(x.email).toLowerCase()) && m.done).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
      return pHead('Móvil', esc(x.name), (x.email ? esc(x.email) : 'Sin correo conectado') + ' · ' + (x.warm ? 'calentada' : 'sin calentar'), [['En el saldo', money(I.B.saldo)], ['En camino', money(I.B.pend)], ['Ventas este mes', I.month.length], ['Facturado este mes', money(sum(I.month, s => s.price))]]) +
        `<div class="ap-l">Su cadena · últimos 30 días</div><div class="ap-stats">${[['Por preparar', c.sold], ['Con etiqueta', c.label], ['Enviadas', c.sent], ['Cobradas', c.paid]].map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>` +
        (I.open.length ? `<div class="ap-l">Por enviar</div><div class="ap-list">${I.open.map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), s.labelAt ? 'Etiqueta' + (s.carrier ? ' ' + esc(s.carrier.toUpperCase()) : '') + (s.shipDeadline ? ' · antes del ' + fmtDate(s.shipDeadline) : '') : 'Sin etiqueta aún', '<span class="ap-chip lo">' + money(s.price) + '</span>')).join('')}</div>` : '') +
        `<div class="ap-l">Últimas ventas</div><div class="ap-list">${rec.length ? rec.map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), fmtDate(s.date) + ' · ' + ({ sold: 'por preparar', label: 'con etiqueta', sent: 'enviada', paid: 'cobrada', back: 'devuelta' }[shipStage(s)] || ''), '<span class="ap-chip">' + money(s.price) + '</span>')).join('') : '<p class="ap-empty">Este móvil aún no ha vendido nada.</p>'}</div>` +
        (mails.length ? `<div class="ap-l">Últimos correos${I.last ? ' · ' + fmtDate(I.last) : ''}</div><div class="ap-list">${mails.map(m => `<div class="ap-row"><span class="ap-rm"><b>${esc(m.note || m.subject || '')}</b><span>${fmtDate(String(m.date).slice(0, 10))}</span></span></div>`).join('')}</div>` : '') +
        (outs.length ? `<div class="ap-l">Pasado al banco</div><div class="ap-list">${outs.slice(0, 5).map(o => `<div class="ap-row"><span class="ap-rm"><b>${money(o.amount)}</b><span>${fmtDate(o.date)}</span></span></div>`).join('')}</div>` : '') +
        `<div class="ap-f"><button class="btn btn-soft btn-block" data-action="account" data-id="${x.id}">Ajustes del móvil</button>${I.B.saldo > 0 ? `<button class="btn btn-main btn-block" data-action="payout" data-id="${x.id}" style="margin-top:8px">Pasar al banco</button>` : ''}</div>`;
    }
    if (k === 'bank') {
      const l = accounts(), outs = l.flatMap(x => (x.payouts || []).map(p => ({ ...p, a: x }))).sort((p, q) => (q.date || '').localeCompare(p.date || '')), mo = today().slice(0, 7);
      return pHead('Banco', 'Lo que pasas al banco', '', [['En el saldo', money(r2(sum(l, x => balance(x.id).saldo)))], ['En camino', money(r2(sum(l, x => balance(x.id).pend)))], ['Al banco este mes', money(sum(outs.filter(p => (p.date || '').slice(0, 7) === mo), p => p.amount))], ['En total', money(sum(outs, p => p.amount))]]) +
        `<div class="ap-l">Saldo por móvil</div><div class="ap-list">${l.map(x => { const B = balance(x.id); return `<div class="ap-row"><button class="ap-rm" data-action="alm-open" data-id="acc:${x.id}"><b>${esc(x.name)}</b><span>${money(B.saldo)} en el saldo${B.pend ? ' · ' + money(B.pend) + ' en camino' : ''}</span></button>${B.saldo > 0 ? `<button class="btn btn-main btn-sm" data-action="payout" data-id="${x.id}">Pasar</button>` : ''}</div>`; }).join('')}</div>
        <div class="ap-l">Transferencias</div><div class="ap-list">${outs.length ? outs.slice(0, 12).map(p => `<div class="ap-row"><span class="ap-rm"><b>${money(p.amount)}</b><span>${fmtDate(p.date)} · ${esc(p.a.name)}</span></span></div>`).join('') : '<p class="ap-empty">Aún no has pasado nada al banco.</p>'}</div>
        <div class="ap-f"><button class="btn btn-soft btn-block" data-action="saldo">Ver saldo completo</button></div>`;
    }
    if (k === 'post') {
      const ready = pend().filter(s => s.labelAt), sent = sentWeek().sort((a, b) => shipWhen(b).localeCompare(shipWhen(a)));
      return pHead('Punto de envío', 'Taquillas', 'Aquí deja los paquetes cuando Vinted avisa del envío', [['Con etiqueta', ready.length], ['Enviados (7 días)', sent.length], ['Importe', money(sum(sent, s => s.price))]]) +
        `<div class="ap-l">Listos para llevar</div><div class="ap-list">${ready.length ? ready.map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), esc(accName(s.account, s.accountName)) + (s.carrier ? ' · ' + esc(s.carrier.toUpperCase()) : '') + (s.shipDeadline ? ' · antes del ' + fmtDate(s.shipDeadline) : ''), '<span class="ap-chip lo">Llevar</span>')).join('') : '<p class="ap-empty">Nada con etiqueta pendiente de llevar.</p>'}</div>
        <div class="ap-l">Dejados en la taquilla</div><div class="ap-list">${sent.length ? sent.map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), esc(accName(s.account, s.accountName)) + ' · ' + fmtDate(shipWhen(s)) + (s.carrier ? ' · ' + esc(s.carrier.toUpperCase()) : ''), '<span class="ap-chip ok">' + money(s.price) + '</span>')).join('') : '<p class="ap-empty">No ha salido nada esta semana.</p>'}</div>`;
    }
    if (k === 'chain') {

      const ok = S.sales.filter(s => s.status !== 'devuelta'), stg = k2 => ok.filter(s => shipStage(s) === k2 && (s.date || '') >= daysAgo(30)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const C = [['sold', 'Por preparar', 'Vendidas, esperando la etiqueta o el envío'], ['label', 'Con etiqueta', 'Lista para llevar al punto de envío'], ['sent', 'Enviadas', 'Esperando a que el comprador la reciba'], ['paid', 'Cobradas', 'El dinero ya está en el saldo']];
      const sub = s => [esc(accName(s.account, s.accountName)), s.carrier ? esc(s.carrier.toUpperCase()) : '', s.shipDeadline && shipOpen(s) ? 'antes del ' + fmtDate(s.shipDeadline) : '', shipStage(s) === 'sent' ? 'enviada el ' + fmtDate(shipWhen(s)) + ' · cobro el ' + fmtDate(freeOn(s)) : '', shipStage(s) === 'paid' && s.paidAt ? 'cobrada el ' + fmtDate(s.paidAt) : ''].filter(Boolean).join(' · ');
      const on = accounts().filter(a => a.email).length;
      return pHead('Cadena', 'De la venta al cobro', on + '/' + accounts().length + ' móviles con el correo conectado', C.map(([c, t]) => [t, stg(c).length])) +
        C.map(([c, t, h]) => { const l = stg(c); return `<div class="ap-l">${t} · <span style="text-transform:none;letter-spacing:0;font-weight:500">${h}</span></div><div class="ap-list">${l.length ? l.slice(0, c === 'paid' ? 6 : 20).map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), sub(s), '<span class="ap-chip ' + (c === 'paid' ? 'ok' : c === 'sold' ? 'lo' : '') + '">' + money(s.price) + '</span>')).join('') : '<p class="ap-empty">Nada aquí ahora mismo.</p>'}</div>`; }).join('') +
        '<div class="ap-f"><button class="btn btn-soft btn-block" data-action="mails">Correos de Vinted</button></div>';
    }
    if (k === 'week') {
      const l = weekSales().slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')), u = sum(l, s => s.qty || 1), fac = sum(l, s => s.price), bn = sum(l, s => (s.price || 0) - (s.cost || 0));
      const byDay = {}; l.forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
      return pHead('Esta semana', 'Ventas de la semana', 'Desde el lunes ' + fmtDate(weekStart()), [['Ventas', l.length], ['Unidades', u], ['Facturado', money(fac)], ['Ganado', money(bn)]]) +
        (l.length ? Object.keys(byDay).sort().reverse().map(d => `<div class="ap-l">${dayLabel(d)}</div><div class="ap-list">${byDay[d].map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), esc(accName(s.account, s.accountName)), '<span class="ap-chip ok">' + money(s.price) + '</span>')).join('')}</div>`).join('') : '<p class="ap-empty">Aún no has vendido nada esta semana.</p>');
    }
    if (k === 'feat') {
      const all = featsAll(), act = featsActive(), wk = all.filter(e => (e.date || '') >= weekStart()), mo = all.filter(e => (e.date || '').slice(0, 7) === today().slice(0, 7));
      const row = e => { const p = prod(e.productId), left = featLeft(e), sold = p ? S.sales.some(s => s.productId === p.id && s.status !== 'devuelta' && (s.date || '') >= e.date) : false;
        return rowBtn('expense', e.id, esc(p ? p.name : String(e.concept || 'Destacado').replace(/^Destacado( · )?/, '') || 'Destacado'), esc(accName(e.account)) + ' · ' + fmtDate(e.date) + (sold ? ' · vendido después' : ''), '<span class="ap-chip ' + (left > 0 ? 'ok' : 'no') + '">' + (left > 0 ? 'Activo · ' + left + (left === 1 ? ' día' : ' días') : money(e.amount)) + '</span>'); };
      return pHead('Destacados', 'Artículos destacados', 'Cada destacado dura ' + FEAT_DAYS + ' días', [['Activos', act.length], ['Esta semana', money(sum(wk, e => e.amount))], ['Este mes', money(sum(mo, e => e.amount))], ['En total', all.length]]) +
        `<div class="ap-l">Activos</div><div class="ap-list">${act.length ? act.map(row).join('') : '<p class="ap-empty">Ningún artículo destacado ahora mismo.</p>'}</div>` +
        (all.length > act.length ? `<div class="ap-l">Anteriores</div><div class="ap-list">${all.filter(e => featLeft(e) <= 0).slice(0, 12).map(row).join('')}</div>` : '') +
        '<div class="ap-f"><button class="btn btn-main btn-block" data-action="qFeat">Destacar un artículo</button></div>';
    }
    if (k === 'out') {
      const l = sentWeek().sort((a, b) => shipWhen(b).localeCompare(shipWhen(a)));
      return pHead('Salida', 'Enviados', 'Últimos 7 días', [['Paquetes', l.length], ['Cobradas', l.filter(s => s.paidAt || isFree(s)).length], ['Importe', money(sum(l, s => s.price))]]) +
        `<div class="ap-l">Salidas</div><div class="ap-list">${l.length ? l.map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), esc(accName(s.account, s.accountName)) + ' · ' + fmtDate(shipWhen(s)) + (s.carrier ? ' · ' + esc(s.carrier.toUpperCase()) : ''), s.paidAt || isFree(s) ? '<span class="ap-chip ok">Cobrada</span>' : '<span class="ap-chip">' + money(s.price) + '</span>')).join('') : '<p class="ap-empty">No ha salido nada esta semana.</p>'}</div>`;
    }
    if (k === 'in') {
      const w = onTheWay(), got = pedidos().filter(e => e.receivedAt && e.receivedAt >= daysAgo(14)).sort((x, y) => y.receivedAt.localeCompare(x.receivedAt));
      const st = n => n >= 12 ? ['Descargando en tu puerta', 'lo'] : n >= 10 ? ['La furgoneta está llegando', 'ok'] : ['En avión · llega hacia el día 12', ''];
      return pHead('Recepción', 'Pedidos de proveedor', '', [['En camino', w.length], ['Unidades', sum(w, o => o.e.units || 0)], ['Recibidos (14 días)', got.length]]) +
        `<div class="ap-l">En camino</div><div class="ap-list">${w.length ? w.map(o => `<div class="ap-row"><button class="ap-rm" data-action="expense" data-id="${o.e.id}"><b>${esc(o.e.concept)}</b><span>Día ${o.n} · ${st(o.n)[0]}${o.e.units ? ' · ' + o.e.units + ' uds' : ''}</span></button><button class="btn btn-soft btn-sm" data-action="alm-recv" data-id="${o.e.id}">Ha llegado</button></div>`).join('') : '<p class="ap-empty">No hay ningún pedido en camino.</p>'}</div>
        ${got.length ? `<div class="ap-l">Recibidos</div><div class="ap-list">${got.map(e => rowBtn('expense', e.id, esc(e.concept), 'Llegó el ' + fmtDate(e.receivedAt) + (e.units ? ' · ' + e.units + ' uds' : '') + (e.invoice ? ' · Factura' : ''), '<span class="ap-chip ok">' + money(e.amount) + '</span>')).join('')}</div>` : ''}
        <div class="ap-l">Historial</div><div class="ap-list">${pedidos().slice().sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 12).map(e => rowBtn('expense', e.id, esc(e.concept), fmtDate(e.date) + (e.units ? ' · ' + e.units + ' uds' : '') + (e.invoice ? ' · Factura' : ''), '<span class="ap-chip">' + money(e.amount) + '</span>')).join('') || '<p class="ap-empty">Sin pedidos todavía.</p>'}</div>
        <button class="btn btn-soft btn-block" data-action="orders" style="margin-top:10px">Ver todos los pedidos</button>
        <div class="ap-f"><button class="btn btn-main btn-block" data-action="newExpense">Nueva compra</button></div>`;
    }
    if (k === 'office') {
      const l = accounts(), sal = r2(sum(l, x => balance(x.id).saldo)), pe = r2(sum(l, x => balance(x.id).pend));
      const outs = l.flatMap(x => (balance(x.id).outs || []).map(p => ({ ...p, a: x }))).sort((p, q) => (q.date || '').localeCompare(p.date || ''));
      const on = l.filter(x => x.email).length, rv = (S.mailin || []).filter(m => m.done && m.review).length;
      return pHead('Escritorio', 'Móviles', l.length + ' cuentas · ' + on + ' con el correo conectado', [['En el saldo', money(sal)], ['Pendiente', money(pe)], ['Correos hoy', (S.mailin || []).filter(m => String(m.date || '').slice(0, 10) === today()).length]]) +
        `<div class="ap-l">Correos de Vinted</div><div class="ap-list">${rowBtn('mails', '', 'Lo que se ha apuntado solo', rv ? rv + ' por revisar' : 'Todo en orden', '<span class="ap-chip ' + (rv ? 'lo' : 'ok') + '">' + (rv || on + '/' + l.length) + '</span>')}</div>` +
        `<div class="ap-l">Pasado al banco</div><div class="ap-list">${outs.length ? outs.slice(0, 6).map(p => `<div class="ap-row"><span class="ap-rm"><b>${money(p.amount)}</b><span>${fmtDate(p.date)} · ${esc(p.a.name)}</span></span></div>`).join('') : '<p class="ap-empty">Aún no has pasado nada al banco.</p>'}</div><button class="btn btn-soft btn-block" data-action="saldo" style="margin-top:10px">Ver saldo completo</button>` +
        `<div class="ap-l">Cuentas</div><div class="ap-list">${l.map(x => { const B = balance(x.id); const ml = mailLast(x.id); return rowBtn('account', x.id, esc(x.name), (x.warm ? 'Calentada' : 'Sin calentar') + ' · ' + (x.email ? 'Correo conectado' + (ml ? ' · último ' + fmtDate(ml) : '') : 'Sin correo') + (B.pend ? ' · ' + money(B.pend) + ' pendiente' : ''), '<span class="ap-chip ' + (B.saldo > 0 ? 'ok' : '') + '">' + money(B.saldo) + '</span>'); }).join('')}</div>`;
    }
    if (k === 'ret') {
      const l = rets();
      return pHead('Devoluciones', 'Lo que vuelve', 'Últimos 30 días', [['Devoluciones', l.length], ['Importe', money(sum(l, s => s.price))]]) +
        `<div class="ap-l">Devueltas</div><div class="ap-list">${l.length ? l.map(s => rowBtn('sale', s.id, esc(s.name) + (s.size ? ' · ' + esc(s.size) : ''), esc(accName(s.account, s.accountName)) + ' · ' + fmtDate(s.returnedAt || s.date), s.restocked ? '<span class="ap-chip ok">Al stock</span>' : '<span class="ap-chip lo">Fuera</span>')).join('') : '<p class="ap-empty">Ninguna devolución en 30 días.</p>'}</div>`;
    }
    return '';
  }
  function openPanel(k) {
    panelK = k; const p = document.getElementById('almPanel'); if (!p) return;
    p.innerHTML = panelHtml(k); p.hidden = false; p.scrollTop = 0;
    activeZ = CATN[k] ? 'stock' : String(k).startsWith('acc:') ? 'phones' : k; document.querySelectorAll('#almBar button').forEach(b => b.classList.toggle('on', b.dataset.z === activeZ));
  }
  function select(k) { if (k === 'mail') { letterSheet(); return; } if (world) world.flyTo(k); openPanel(k); }
  const tr = (el, xy) => { el.style.transform = `translate(${Math.round(xy[0])}px,${Math.round(xy[1])}px) translate(-50%,-100%)`; el.style.opacity = 1; };
  function place(o) {
    const room = document.getElementById('almRoom'); if (!room) return;
    room.classList.toggle('alm-front', !!o.front);
    for (const [k, xy] of o.racks) { const t = room.querySelector(`.alm-sign[data-z="${k}"]`); if (t) { if (o.front) t.style.opacity = 0; else tr(t, xy); } }
    room.querySelectorAll('.alm-pin').forEach((el, i) => { const p = o.pins[i]; if (o.front) el.style.opacity = 0; else if (p) tr(el, p.xy); });
    const m = room.querySelector('.alm-mood'); if (m && !o.person) m.style.opacity = 0;
    if (m && o.person) { tr(m, o.person); if (o.activity && m.textContent !== o.activity.say) m.textContent = o.activity.say; }
    if (o.activity) { const n = document.getElementById('aiNow'); if (n && n.textContent !== o.activity.say) n.textContent = o.activity.say; const bar = document.getElementById('aiBar'); if (bar) bar.style.width = (o.activity.progress * 100).toFixed(1) + '%';
      const kd = document.getElementById('aiKind'); if (kd) kd.textContent = o.activity.kind === 'sale' ? 'Preparando una venta' : 'Sin ventas por preparar'; }
    const t = room.querySelector('.alm-truck'); if (t) { if (o.truck && !o.front) { tr(t, o.truck); t.querySelector('b').textContent = o.truckState === 'unload' || o.truckState === 'open' ? 'Descargando tu pedido' : 'Pedido llegando'; } else t.style.opacity = 0; }
    const pl = room.querySelector('.alm-plane'); if (pl) { if (o.plane && !o.front) tr(pl, o.plane); else pl.style.opacity = 0; }
  }
  function overlayHtml() {
    const tday = today(), salesT = S.sales.filter(s => s.date === tday && s.status !== 'devuelta');
    const signs = '';   // sin carteles: al tocar cada cosa se abre su ficha
    const pins = alerts().map(p => `<button class="alm-pin" data-action="alm-open" data-id="${p.k}" aria-label="${esc(p.txt)}" style="opacity:0">${IC.pin}<span>${esc(p.txt)}</span></button>`).join('');
    return `<div class="alm-bar" id="almBar">${ZBTN.map(([k, l]) => `<button data-action="alm-open" data-id="${k}" data-z="${k}" class="${activeZ === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="alm-zoom"><button data-action="alm-zin" aria-label="Acercar">${IC.plus}</button><button data-action="alm-zout" aria-label="Alejar">${IC.minus}</button><button data-action="alm-open" data-id="overview" aria-label="Vista general">${IC.home}</button></div>
      <div class="alm-dock">
        <div class="ad-st"><b>${salesT.length}</b><span>ventas hoy</span></div>
        <button class="ad-st" data-action="alm-open" data-id="week" style="cursor:pointer"><b>${weekSales().length}</b><span>esta semana</span></button>
        ${featsActive().length ? `<button class="ad-st ad-ship" data-action="alm-open" data-id="feat" style="cursor:pointer"><b>${featsActive().length} ${featsActive().length === 1 ? 'destacado' : 'destacados'}</b><span>${featsActive().length === 1 ? 'activo ahora' : 'activos ahora'}</span></button>` : ''}
        <div class="ad-st"><b>${money0(sum(salesT, s => s.price))}</b><span>facturado hoy</span></div>
        <div class="ad-st"><b id="aiReady">${readyCount()}/${pend().length}</b><span>en la vagoneta</span></div>
        <div class="ad-st"><b>${sum(S.products, units)}</b><span>uds en stock</span></div>
        <div class="ad-st"><b>${money0(valor(S.products))}</b><span>invertido</span></div>
        ${onTheWay().length ? `<div class="ad-st ad-ship"><b>${onTheWay().length} en camino</b><span>${onTheWay().slice(0, 2).map(o => 'día ' + o.n + ' · ' + (o.n >= 12 ? 'descargando' : o.n >= 10 ? 'furgoneta llegando' : 'en avión')).join(' — ')}</span></div>` : ''}
        <div class="ad-log"><span class="ap-e">Hoy</span><ul class="ai-log" id="aiLog">${logHtml(readLog())}</ul></div>
      </div>
      ${signs}${pins}
      <aside class="alm-panel" id="almPanel" ${panelK ? '' : 'hidden'}>${panelK ? panelHtml(panelK) : ''}</aside>`;
  }
  async function mount3d() {
    if (!document.getElementById('almRoom')) return;
    try {
      if (!world) {
        loading3d = loading3d || import('./almacen3d.js').then(mod => mod.createWorld({ onSelect: k => select(k), onFrame: place, onLog: addLog, onTip: (t, ev) => { if (t && ev) showTip({ dataset: { tip: t } }, ev.clientX, ev.clientY); else tip.classList.remove('show'); } }));
        world = await loading3d;
      }
      const r = document.getElementById('almRoom'); if (!r) return;
      world.attach(r); world.update(data3d());
      const l = r.querySelector('.alm-load'); if (l) l.remove();
    } catch (e) { console.warn('Almacén 3D no disponible', e); window.__alm3dFail = true; render(); }
  }
  const baseRender = window.render;
  window.render = function () { baseRender.apply(this, arguments); if (S.tab === 'almacen' && S.desk) mount3d(); };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-action^="alm-"]'); if (!b) return;
    const a = b.dataset.action;
    if (a === 'alm-open') { const k = b.dataset.id; if (k === 'overview') { if (world) world.flyTo('overview'); openPanel('overview'); } else select(k); }
    else if (a === 'alm-close') { panelK = null; const p = document.getElementById('almPanel'); if (p) p.hidden = true; }
    else if (a === 'alm-recv') { const id = b.dataset.id; write(() => db.doc('expenses/' + id).update({ receivedAt: today() }), 'Pedido recibido', () => write(() => db.doc('expenses/' + id).update({ receivedAt: '' }), 'Deshecho')); }
    else if (a === 'alm-zin' && world) world.zoomBy(1.25);
    else if (a === 'alm-zout' && world) world.zoomBy(.8);
  });

  /* ---------- ventanas de cada zona ---------- */
  const saleRow = (s, btn) => `<div class="row"><button class="rm" data-action="sale" data-id="${s.id}" style="text-align:left;background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer"><span class="rt">${esc(s.name)}${s.size ? ' · ' + esc(s.size) : ''}</span><span class="rs">${esc(accName(s.account, s.accountName))} · ${fmtDate(s.date)}</span></button><span class="rv"><b>${money(s.price)}</b></span>${btn || ''}</div>`;
  function zone(k) {
    if (k === 'stock' || CATN[k]) return go('stock');
    if (k === 'office') return go('moviles');
    if (k === 'out') return go('movs');
    if (k === 'prep') {
      const l = pend();
      return openSheet('Por preparar', l.length
        ? `<p class="hint" style="margin:0">Ventas que aún tienes que empaquetar y enviar. Cuando salgan, márcalas como enviadas.</p>
           <div class="list">${l.map(s => saleRow(s, '')).join('')}</div>`
        : '<p class="hint" style="margin:0">No hay nada por preparar. Cada venta nueva aparece aquí hasta que la marques como enviada.</p>');
    }
    if (k === 'ret') {
      const l = rets();
      return openSheet('Devoluciones', l.length ? `<p class="hint" style="margin:0">Las de los últimos 30 días.</p><div class="list">${l.map(s => saleRow(s)).join('')}</div>` : '<p class="hint" style="margin:0">Ninguna devolución en los últimos 30 días.</p>');
    }
    if (k === 'in') {
      const l = incoming();
      return openSheet('Entradas', `${l.length ? `<p class="hint" style="margin:0">Pedidos a proveedor de las últimas 2 semanas.</p><div class="list">${l.map(e => `<div class="row"><button class="rm" data-action="editExpense" data-id="${e.id}" style="text-align:left;background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer"><span class="rt">${esc(e.concept)}</span><span class="rs">${fmtDate(e.date)}${e.units ? ' · ' + e.units + ' uds' : ''}</span></button><span class="rv"><b>${money(e.amount)}</b></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">No ha entrado ningún pedido en las últimas 2 semanas.</p>'}
        <button class="btn btn-main btn-block" data-action="newExpense">Nueva compra</button>`);
    }
  }

  /* ---------- enganche con la app: pestaña propia en la barra lateral del ordenador ---------- */
  VIEWS.almacen = () => S.desk ? vAlmacen() : VIEWS.panel();
  const nav = document.getElementById('tabbar'), mov = nav && nav.querySelector('[data-tab="movs"]');
  if (nav) {
    const b = document.createElement('button'); b.className = 'tab tab-desk'; b.dataset.action = 'tab'; b.dataset.tab = 'almacen';
    b.innerHTML = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/></svg>Almacén';
    nav.insertBefore(b, mov ? mov.nextSibling : null);
  }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-action^="alm-"]'); if (!b) return;
    const a = b.dataset.action, id = b.dataset.id;
    if (a === 'alm-zone') zone(b.dataset.z);
    else if (a === 'alm-ship') { const fromSale = b.dataset.from === 'sale'; if (await write(() => db.doc('sales/' + id).update({ ship: 'sent', shippedAt: today() }), 'Enviada', () => write(() => db.doc('sales/' + id).update({ ship: 'pend', shippedAt: '' }), 'Vuelve a por preparar'))) setTimeout(() => { if (fromSale) saleDetail(id); else if (!document.getElementById('almPanel')) { if (pend().length) zone('prep'); else closeSheet(); } }, 250); }
    else if (a === 'alm-shipall') { const l = pend(); if (await write(async () => { for (const s of l) await db.doc('sales/' + s.id).update({ ship: 'sent', shippedAt: today() }); }, l.length + ' enviadas') && !document.getElementById('almPanel')) closeSheet(); }
  });
  // zonas del dibujo: clic en cualquier parte de la zona
  document.addEventListener('click', ev => { const g = ev.target.closest && ev.target.closest('.alm .az'); if (g) zone(g.dataset.alm); });
  // al pasar el ratón por una caja o un móvil, su nombre
  document.addEventListener('mousemove', ev => { const el = ev.target.closest && ev.target.closest('.alm [data-tip]'); if (el) showTip(el, ev.clientX, ev.clientY); else if (ev.target.closest && ev.target.closest('.alm')) tip.classList.remove('show'); });

  const st = document.createElement('style');
  st.textContent = `
@media (max-width: 999px) { .tab-desk { display: none !important; } }
.alm { margin-top: 4px; }
.alm-room { position: relative; max-width: calc((100vh - 194px) * 1.42); margin: 0 auto; border-radius: 22px; overflow: hidden; padding: 8px; background: radial-gradient(80% 60% at 50% 40%, rgba(255,255,255,.04), transparent 70%), linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)); border: 1px solid var(--hair); }
.alm-room svg { display: block; width: 100%; height: auto; max-height: calc(100vh - 210px); margin: 0 auto; --almWallTop: #2A2D34; --almWallBot: #202329; }
.alm .az { cursor: pointer; transition: filter .15s; }
.alm .az:hover { filter: brightness(1.12) drop-shadow(0 0 10px rgba(212,176,106,.22)); }
.alm-tag { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 7px 11px; border-radius: 12px; text-align: left; white-space: nowrap; cursor: pointer;
  background: rgba(22,24,29,.8); color: #F2F1ED; border: 1px solid rgba(255,255,255,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 10px 24px -12px rgba(0,0,0,.7); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: transform .15s; }
body.light .alm-tag { background: rgba(255,255,255,.9); color: #15171B; border-color: rgba(20,20,30,.08); }
.alm-tag:hover { transform: translate(-50%, -100%) translateY(-2px); }
.alm-tag b { font-size: 13px; font-weight: 700; }
.alm-tag span { font-size: 11.5px; opacity: .7; font-weight: 500; }
.alm-mood { position: absolute; transform: translate(-50%, -100%); padding: 6px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none;
  background: rgba(212,176,106,.92); color: #15171B; box-shadow: 0 8px 18px -10px rgba(0,0,0,.6); }
.alm-mood::after { content: ""; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 10px; background: inherit; transform: translateX(-50%) rotate(45deg); border-radius: 2px; }
.alm-hint { text-align: center; margin: 10px 0 0; }
.alm-3d { --al-g: linear-gradient(180deg, rgba(30,32,38,.88), rgba(19,21,26,.88)); --al-solid: #15171C; --al-rim: rgba(255,255,255,.09); --al-hi: rgba(255,255,255,.1); --al-field: rgba(255,255,255,.06); --al-drop: rgba(0,0,0,.55);
  height: calc(100vh - 150px); min-height: 520px; max-width: none; padding: 0; border-radius: 20px; background: #141A28; overflow: hidden;
  border: 1px solid var(--gl-rim, var(--hair)); box-shadow: inset 0 1px 0 var(--gl-hi, transparent), 0 14px 34px -20px var(--gl-drop, rgba(0,0,0,.6)); }
body.light .alm-3d { --al-g: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.84)); --al-solid: #FFFFFF; --al-rim: rgba(20,20,30,.07); --al-hi: #FFFFFF; --al-field: rgba(20,20,30,.045); --al-drop: rgba(30,30,50,.22); }
.alm-3d .alm-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
.alm-3d .alm-canvas:active { cursor: grabbing; }
.alm-load { position: absolute; inset: 0; display: grid; place-items: center; color: #6B6B66; font-size: 14px; font-weight: 500; }
.alm-3d button { font: inherit; }
/* superficies de cristal, como las tarjetas de la app */
.alm-bar, .alm-zoom, .alm-dock, .alm-panel, .alm-sign { background: var(--al-g); color: var(--ink); border: 1px solid var(--al-rim); box-shadow: inset 0 1px 0 var(--al-hi), 0 14px 30px -16px var(--al-drop); backdrop-filter: blur(18px) saturate(130%); -webkit-backdrop-filter: blur(18px) saturate(130%); }
.alm-bar { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 3; display: flex; gap: 2px; padding: 3px; border-radius: 13px; }
.alm-bar button { border: 0; background: none; padding: 7px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--ink2); cursor: pointer; white-space: nowrap; transition: color .15s, background .15s; }
.alm-bar button:hover { color: var(--ink); background: var(--al-field); }
.alm-bar button.on { background: var(--gl-cta, var(--ink)); color: var(--gl-cta-ink, var(--bg)); }
.alm-zoom { position: absolute; left: 14px; top: 14px; z-index: 3; display: flex; gap: 2px; padding: 3px; border-radius: 13px; }
.alm-zoom button { width: 34px; height: 34px; border: 0; background: none; border-radius: 10px; display: grid; place-items: center; color: var(--ink2); cursor: pointer; }
.alm-zoom button:hover { background: var(--al-field); color: var(--ink); }
.alm-zoom svg { width: 17px; height: 17px; }
/* barra fija de abajo */
.alm-dock { position: absolute; left: 14px; right: 14px; bottom: 14px; z-index: 3; display: flex; align-items: stretch; gap: 8px; padding: 8px; border-radius: 20px; }
.ad-now { flex: 1.5 1 0; min-width: 180px; padding: 6px 8px 6px 10px; display: flex; flex-direction: column; justify-content: center; }
.ad-now b { display: block; font-size: 15px; font-weight: 700; letter-spacing: -.02em; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ai-bar { height: 4px; border-radius: 3px; background: var(--al-field); margin-top: 8px; overflow: hidden; } .ai-bar i { display: block; height: 100%; width: 0; background: var(--accent); border-radius: 3px; transition: width .4s; }
.ad-st { flex: none; min-width: 86px; padding: 9px 12px; border-radius: 14px; background: var(--al-field); display: flex; flex-direction: column; justify-content: center; gap: 1px; border: 0; text-align: left; font: inherit; color: inherit; }
.ad-st b { font-size: 17px; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; white-space: nowrap; } .ad-st span { font-size: 11.5px; font-weight: 500; color: var(--ink2); white-space: nowrap; }
.ad-ship { max-width: 240px; background: color-mix(in srgb, var(--accent) 14%, transparent); } .ad-ship b { font-size: 14px; letter-spacing: -.02em; } .ad-ship span { color: var(--accent); overflow: hidden; text-overflow: ellipsis; }
.ad-warn { cursor: pointer; background: color-mix(in srgb, var(--neg) 14%, transparent); } .ad-warn b, .ad-warn span { color: var(--neg); }
.ad-log { flex: 1.3 1 0; min-width: 0; padding: 6px 10px 6px 14px; border-left: 1px solid var(--al-rim); display: flex; flex-direction: column; justify-content: center; }
.ai-log { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.ai-log li { font-size: 12.5px; font-weight: 500; color: var(--ink2); display: flex; gap: 8px; white-space: nowrap; overflow: hidden; } .ai-log li span { color: var(--accent); font-weight: 700; font-variant-numeric: tabular-nums; flex: none; } .ai-log .ai-none { color: var(--ink3); }
@media (max-width: 1100px) { .ad-log { display: none; } }
.ap-e { display: block; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ink2); }
#aiKind { color: var(--accent); }
/* carteles, avisos y el bocadillo del trabajador */
.alm-front .alm-sign, .alm-front .alm-pin { pointer-events: none; }
.alm-sign, .alm-pin, .alm-3d .alm-mood { position: absolute; left: 0; top: 0; z-index: 2; transition: opacity .4s; will-change: transform; }
.alm-sign { display: flex; gap: 6px; align-items: baseline; padding: 6px 11px; border-radius: 11px; cursor: pointer; white-space: nowrap; }
.alm-sign b { font-size: 12.5px; font-weight: 700; letter-spacing: -.01em; }
.alm-sign span { font-size: 12px; font-weight: 500; color: var(--ink2); }
.alm-sign:hover { box-shadow: inset 0 1px 0 var(--al-hi), 0 0 0 1.5px var(--accent), 0 14px 30px -16px var(--al-drop); }
.alm-truck b, .alm-plane b { color: var(--accent); }
.alm-pin { border: 0; background: none; padding: 0; cursor: pointer; color: var(--accent); filter: drop-shadow(0 3px 4px rgba(0,0,0,.3)); }
.alm-pin svg { width: 26px; height: 26px; display: block; }
.alm-pin::after { content: ""; position: absolute; left: 50%; top: 9px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #fff; }
.alm-pin span { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); margin-bottom: 4px; padding: 5px 9px; border-radius: 9px; background: var(--al-solid); color: var(--ink); border: 1px solid var(--al-rim); font-size: 12px; font-weight: 600; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .15s; }
.alm-pin:hover span { opacity: 1; }
.alm-3d .alm-mood { padding: 5px 10px; border-radius: 10px; background: var(--gl-cta, var(--ink)); color: var(--gl-cta-ink, var(--bg)); font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none; box-shadow: 0 8px 18px -10px rgba(0,0,0,.6); }
/* panel lateral */
.alm-panel { position: absolute; top: 14px; right: 14px; bottom: 104px; width: 340px; z-index: 4; overflow-y: auto; padding: 18px; border-radius: 20px; scrollbar-width: none; }
.alm-panel[hidden] { display: none; }
.ap-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.ap-h b { display: block; font-size: 22px; font-weight: 700; letter-spacing: -.03em; margin-top: 3px; }
.ap-s { font-size: 13px; font-weight: 500; color: var(--ink2); }
.ap-x { width: 32px; height: 32px; border: 1px solid var(--al-rim); border-radius: 11px; background: var(--al-field); color: var(--ink2); cursor: pointer; display: grid; place-items: center; flex: none; }
.ap-x:hover { color: var(--ink); }
.ap-x svg { width: 15px; height: 15px; }
.ap-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0 6px; }
.ap-stats div { padding: 10px 12px; border-radius: 14px; background: var(--al-field); min-width: 0; }
.ap-stats span { display: block; font-size: 11.5px; font-weight: 500; color: var(--ink2); }
.ap-stats b { font-size: 16px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ap-l { margin: 16px 0 6px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ink2); }
.ap-list { display: flex; flex-direction: column; }
.ap-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 4px; border: 0; border-bottom: 1px solid var(--al-rim); background: none; text-align: left; color: inherit; cursor: pointer; border-radius: 0; }
.ap-row:last-child { border-bottom: 0; }
.ap-row:hover { background: var(--al-field); }
.ap-rm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; border: 0; background: none; padding: 0; text-align: left; color: inherit; cursor: pointer; }
.ap-rm b { font-size: 14px; font-weight: 600; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-rm span { font-size: 12px; font-weight: 500; color: var(--ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-chip { flex: none; display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 7px; font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums; background: var(--al-field); color: var(--ink2); }
.ap-chip.ok { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
.ap-chip.lo { background: color-mix(in srgb, var(--neg) 15%, transparent); color: var(--neg); }
.ap-chip.no { color: var(--ink3); }
.ap-empty { font-size: 13px; color: var(--ink2); margin: 6px 0; }
.ap-f { position: sticky; bottom: -18px; margin: 12px -18px -18px; padding: 12px 18px 18px; background: linear-gradient(transparent, var(--al-solid) 35%); }
.alm .tape { transform-origin: 12px -77px; animation: almTape 1.4s ease-in-out infinite; }
@keyframes almTape { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-14deg) translateX(3px); } }
@media (prefers-reduced-motion: reduce) { .alm .tape { animation: none; } }
`;
  document.head.appendChild(st);
  window.ALMACEN = { force: null };   // para ver cada escena en la vista previa
})();
