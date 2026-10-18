/* Correos de Vinted → la app.
   El lector de Gmail deja cada correo de Vinted en la colección «mailin». Aquí se leen y se apuntan solos:
   · «Has vendido un artículo»        → venta (artículo de tu stock, talla, precio, móvil) y baja de stock
   · «La transacción se ha completado» → esa venta pasa a cobrada (al saldo)
   · «Tu factura de artículos destacados» → gasto de destacado
   · «Tu recibo de …»                  → compra
   · InPost / Vinted Go                 → paquete enviado
   Lo que no está claro queda «por revisar». Las ventas y gastos usan el id del correo: nunca se apuntan dos veces. */
(function () {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/]+/g, ' ').trim();
  const STOP = new Set(['pointure', 'eu', 'talla', 'size', 'taille', 'de', 'del', 'la', 'el', 'y', 'con', 'the', 'a', 'en', 'nuevo', 'nueva', 'new', 'argente', 'plata']);
  const toks = s => norm(s).split(' ').filter(t => t.length > 1 && !STOP.has(t) && !/^\d+(\/\d+)?$/.test(t));
  const num = s => { const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 100) / 100; };
  const money = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const clean = s => String(s || '').replace(/\[[^\]]*\]/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const ymdOf = iso => { const d = new Date(iso || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function kindOf(m) {
    const s = (m.subject || '') + ' ' + (m.text || '').slice(0, 1500);
    if (/has vendido un art/i.test(m.subject) || /ha comprado[\s\S]{0,400}transferiremos el pago/i.test(m.text || '')) return 'sale';
    if (/transacci[oó]n se ha completado/i.test(s)) return 'paid';
    if (/etiqueta de env[ií]o/i.test(m.subject || '')) return 'label';
    if (/factura de art[ií]culos destacados/i.test(s) || /has destacado/i.test(s)) return 'feat';
    if (/tu recibo de/i.test(m.subject) || /se ha recibido tu pago/i.test(s)) return 'buy';
    if (/inpost|vinted go|nos encargamos del resto|listo para ser enviado|hemos recogido el paquete/i.test(s)) return 'ship';
    return 'other';
  }
  const accOf = m => { const to = String(m.to || '').toLowerCase(); return (S.accounts || []).find(a => a.email && to.includes(String(a.email).toLowerCase())) || null; };

  // artículo de tu stock que mejor encaja con el título del anuncio
  function matchProduct(title) {
    const t = new Set(toks(title)); if (!t.size) return null;
    const scored = S.products.map(p => { const pt = toks(p.name); const hit = pt.filter(x => t.has(x)).length; return { p, sc: pt.length ? hit / pt.length : 0, hit }; })
      .filter(x => x.hit >= 2).sort((a, b) => b.sc - a.sc || b.hit - a.hit);
    if (!scored.length || scored[0].sc < .5) return null;
    if (scored[1] && scored[1].sc === scored[0].sc && scored[1].hit === scored[0].hit) return null;   // empate: mejor que lo mires tú
    return scored[0].p;
  }
  function sizeOf(title) {
    const t = String(title || '');
    const m = /pointure\s*(?:eu)?\s*(\d{2}(?:[.,]5)?(?:\s+\d\/\d)?)/i.exec(t) || /(?:\beu|talla|size|taille)\s*:?\s*(\d{2}(?:[.,]5)?(?:\s+\d\/\d)?)/i.exec(t) || /\b(\d{2}(?:[.,]5)?)\s*eu\b/i.exec(t);
    if (m) return m[1].replace(',', '.').trim();
    const c = /\b(XXS|XS|S|M|L|XL|XXL)\b/.exec(t); return c ? c[1] : '';
  }
  function pickSize(p, sz) {
    const sizes = (p.sizes || []).filter(s => s.q > 0); if (!sizes.length) return '';
    if (sizes.length === 1 && !sz) return sizes[0].s;
    const n = s => String(s).replace(',', '.').trim().toLowerCase();
    return (sizes.find(s => n(s.s) === n(sz)) || sizes.find(s => sz && n(s.s).split(' ')[0] === n(sz).split(' ')[0]) || {}).s || '';
  }
  const titleScore = (a, b) => { const A = new Set(toks(a)), B = toks(b); return B.length ? B.filter(x => A.has(x)).length / B.length : 0; };

  async function handle(m) {
    const kind = kindOf(m), acc = accOf(m), date = ymdOf(m.date), text = m.text || '';
    const ref = 'v' + (m.mailId || m.id); let res = { kind, review: false, note: '' };
    if (kind === 'sale') {
      if (S.sales.some(s => s.id === ref)) return { ...res, note: 'ya estaba' };
      const mm = /ha comprado\s+([\s\S]{3,260}?)\s+(\d{1,5}(?:[.,]\d{2})?)\s*€/i.exec(text);
      const title = clean(mm ? mm[1] : (/«([^»]+)»|“([^”]+)”/.exec(text) || [])[1] || m.subject), price = mm ? num(mm[2]) : num((/(\d{1,5}[.,]\d{2})\s*€/.exec(text) || [])[1]);
      const p = matchProduct(title), size = p ? pickSize(p, sizeOf(title)) : sizeOf(title);
      const data = p ? { productId: p.id, name: p.name, category: p.category || 'otro', photo: p.photo || '', size, qty: 1, price, cost: Math.round((p.cost || 0) * 100) / 100, account: acc ? acc.id : '', date }
        : { productId: '', name: title, category: 'otro', photo: '', size, qty: 1, price, cost: 0, account: acc ? acc.id : '', date };
      if (p && size) { const sizes = (p.sizes || []).map(s => ({ ...s })), e = sizes.find(s => s.s === size); if (e) { e.q = Math.max(0, e.q - 1); await db.doc('products/' + p.id).update({ sizes }); } }
      const review = !p || !size || !acc || !price;
      const sale = { ...data, status: 'ok', ship: date >= today() ? 'pend' : 'sent', createdAt: Date.now(), source: 'mail', mailTitle: title, review };
      await db.doc('sales/' + ref).set(sale); if (!S.sales.some(s => s.id === ref)) S.sales.push({ id: ref, ...sale });   // que la vea ya el siguiente correo
      return { kind, ref: 'sales/' + ref, review, note: (p ? p.name : title) + (size ? ' · ' + size : '') + ' · ' + money(price) + (review ? ' · revisa ' + [!p && 'el artículo', p && !size && 'la talla', !acc && 'el móvil', !price && 'el precio'].filter(Boolean).join(', ') : '') };
    }
    if (kind === 'paid') {
      const title = clean((/pedido de\s*[“"«]([^”"»]+)[”"»]/i.exec(text) || [])[1] || '');
      const cand = S.sales.filter(s => s.status !== 'devuelta' && !s.paidAt && (!acc || s.account === acc.id)).map(s => ({ s, sc: titleScore(title, s.mailTitle || s.name) })).filter(x => x.sc >= .5).sort((a, b) => b.sc - a.sc || (a.s.date || '').localeCompare(b.s.date || ''));
      if (!cand.length) return { kind, review: true, note: 'cobrado «' + title + '», pero no encuentro la venta' };
      await db.doc('sales/' + cand[0].s.id).update({ paidAt: date });
      return { kind, ref: 'sales/' + cand[0].s.id, note: cand[0].s.name + ' · cobrada' };
    }
    if (kind === 'label') {   // «Etiqueta de envío para X. Utilizar antes del 28/09/2026»
      const title = clean((/etiqueta de env[ií]o para\s+(.+?)\.\s*utilizar/i.exec(m.subject || '') || /pedido\s*:?\s*\n?\s*([^\n]+)/i.exec(text) || [])[1] || '');
      const carrier = /seur/i.test(text) ? 'seur' : /correos/i.test(text) ? 'correos' : /inpost/i.test(text) ? 'inpost' : /vinted go|mondial|relay/i.test(text) ? 'vintedgo' : '';
      const dl = /(\d{2})\/(\d{2})\/(\d{4})/.exec(m.subject || '') || /fecha l[ií]mite[^\d]{0,30}(\d{2})\/(\d{2})\/(\d{4})/i.exec(text);
      const deadline = dl ? dl[3] + '-' + dl[2] + '-' + dl[1] : '';
      const cand = S.sales.filter(s => s.status !== 'devuelta' && !s.shippedAt && (!acc || s.account === acc.id)).map(s => ({ s, sc: titleScore(title, s.mailTitle || s.name) })).filter(x => x.sc >= .5).sort((a, b) => b.sc - a.sc || (b.s.date || '').localeCompare(a.s.date || ''));
      if (!cand.length) return { kind, review: true, note: 'etiqueta de «' + title + '», pero no encuentro la venta' };
      // SEUR y Correos no avisan cuando lo envías: se da por enviado a la semana (o en la fecha límite, si es antes)
      const week = addDays(date, 7), shipBy = carrier === 'seur' || carrier === 'correos' ? (deadline && deadline < week ? deadline : week) : '';
      await db.doc('sales/' + cand[0].s.id).update({ labelAt: date, carrier, shipDeadline: deadline, shipBy });
      return { kind, ref: 'sales/' + cand[0].s.id, note: cand[0].s.name + ' · etiqueta' + (carrier ? ' ' + carrier.toUpperCase() : '') + (shipBy ? ' · enviado el ' + shipBy.slice(8) + '/' + shipBy.slice(5, 7) : '') };
    }
    if (kind === 'feat') {
      if (S.expenses.some(e => e.id === ref)) return { ...res, note: 'ya estaba' };
      const tot = /total[^\d€]{0,40}(\d{1,4}[.,]\d{2})/i.exec(text), all = [...text.matchAll(/(\d{1,4}[.,]\d{2})\s*€/g)].map(x => num(x[1]));
      const amount = tot ? num(tot[1]) : all.length ? Math.max(...all) : 0;
      await db.doc('expenses/' + ref).set({ concept: 'Destacado', amount, category: 'destacado', account: acc ? acc.id : '', date, units: 0, productId: '', note: '', source: 'mail', createdAt: Date.now() });
      return { kind, ref: 'expenses/' + ref, review: !amount || !acc, note: 'Destacado · ' + money(amount) };
    }
    if (kind === 'buy') {
      if (S.expenses.some(e => e.id === ref)) return { ...res, note: 'ya estaba' };
      const what = clean((/tu recibo de\s*[“"«]([^”"»]+)[”"»]/i.exec(m.subject) || /pedido\s*:?\s*\n?\s*([^\n]+)/i.exec(text) || [])[1] || 'Compra en Vinted');
      const amount = num((/importe pagado\s*:?\s*\n?\s*(\d{1,5}[.,]\d{2})/i.exec(text) || /(\d{1,5}[.,]\d{2})\s*€/.exec(text) || [])[1] || 0);
      await db.doc('expenses/' + ref).set({ concept: what, amount, category: 'compra', account: acc ? acc.id : '', date, units: 0, source: 'mail', createdAt: Date.now() });
      return { kind, ref: 'expenses/' + ref, review: !amount || !acc, note: what + ' · ' + money(amount) };
    }
    if (kind === 'ship') {
      const s = S.sales.filter(x => x.status !== 'devuelta' && !x.shippedAt && (!acc || x.account === acc.id) && (x.date || '') >= addDays(date, -10) && (x.date || '') <= date).sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
      if (!s) return { kind, note: 'paquete entregado en el punto de envío' };
      await db.doc('sales/' + s.id).update({ ship: 'sent', shippedAt: date });
      return { kind, ref: 'sales/' + s.id, note: s.name + ' · enviado' };
    }
    return { kind, note: m.subject || '' };
  }

  const docId = m => m.id;
  let busy = false;
  async function run() {
    if (busy || typeof S === 'undefined' || !loadedAll() || !db) return;
    for (const s of S.sales.filter(s => s.shipBy && !s.shippedAt && s.shipBy <= today() && s.status !== 'devuelta')) { try { await db.doc('sales/' + s.id).update({ ship: 'sent', shippedAt: s.shipBy }); } catch (e) {} }
    const todo = (S.mailin || []).filter(m => !m.done).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!todo.length) return;
    busy = true;
    await new Promise(r => setTimeout(r, 400 + Math.random() * 3000));   // si hay dos dispositivos abiertos, que no lo hagan a la vez
    try {
      for (const m of todo) {
        const cur = (S.mailin || []).find(x => x.id === m.id); if (!cur || cur.done) continue;
        let r; try { r = await handle(m); } catch (e) { r = { kind: kindOf(m), review: true, note: 'no se pudo leer: ' + (e && e.message || e) }; }
        await db.doc('mailin/' + docId(m)).update({ done: true, kind: r.kind, ref: r.ref || '', review: !!r.review, note: r.note || '', doneAt: Date.now() });
        if (r.kind !== 'other' && r.note !== 'ya estaba') toast({ sale: 'Venta desde Vinted', paid: 'Cobro', feat: 'Destacado', buy: 'Compra', ship: 'Envío', label: 'Etiqueta' }[r.kind] + ' · ' + r.note);
      }
    } finally { busy = false; }
    if ((S.mailin || []).some(m => !m.done)) setTimeout(run, 1500);   // si han llegado más mientras tanto
  }
  setInterval(() => { run().catch(() => {}); }, 15000);                 // por si se escapa algún aviso
  window.MAIL = { run, kindOf, matchProduct, sizeOf };
})();
