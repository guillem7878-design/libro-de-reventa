/* Correos de Vinted → la app.
   El lector de Gmail deja cada correo de Vinted en la colección «mailin». Aquí se leen y se apuntan solos:
   · «Has vendido un artículo»        → venta (artículo de tu stock, talla, precio, móvil) y baja de stock
   · «La transacción se ha completado» → esa venta pasa a cobrada (al saldo)
   · «Tu factura de artículos destacados» → gasto de destacado
   · «Tu recibo de …»                  → compra
   · «Etiqueta de envío»               → etiqueta lista (SEUR/Correos: se da por enviada a la semana)
   · InPost / Vinted Go                 → paquete enviado
   Si una venta ya la habías apuntado a mano, el correo se une a ella (no se duplica).
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

  /* lo que dice el correo, ordenado: lo que ha leído Claude (si lo hay) y, si no, las reglas de siempre */
  const AI_K = { venta: 'sale', cobro: 'paid', etiqueta: 'label', envio: 'ship', compra: 'buy', destacado: 'feat', cancelacion: 'cancel', devolucion: 'return', retiro_banco: 'payout', otro: 'other' };
  function info(m) {
    const a = m.ai && typeof m.ai === 'object' && m.ai.type ? m.ai : null, text = m.text || '';
    if (a) return { kind: AI_K[a.type] || 'other', items: (a.items || []).filter(i => i && i.title).map(i => ({ title: clean(i.title), size: i.size ? String(i.size).replace(',', '.').trim() : '', price: typeof i.price === 'number' ? i.price : 0 })),
      total: typeof a.total === 'number' ? a.total : 0, carrier: a.carrier === 'vinted_go' ? 'vintedgo' : a.carrier || '', deadline: a.deadline || '', summary: a.summary || '', ai: true };
    const kind = kindOf(m), it = [];
    let total = 0, carrier = '', deadline = '';
    if (kind === 'sale') { const mm = /ha comprado\s+([\s\S]{3,260}?)\s+(\d{1,5}(?:[.,]\d{2})?)\s*€/i.exec(text); const t = clean(mm ? mm[1] : (/«([^»]+)»|“([^”]+)”/.exec(text) || [])[1] || m.subject);
      it.push({ title: t, size: sizeOf(t), price: mm ? num(mm[2]) : num((/(\d{1,5}[.,]\d{2})\s*€/.exec(text) || [])[1]) }); }
    if (kind === 'paid') it.push({ title: clean((/pedido de\s*[“"«]([^”"»]+)[”"»]/i.exec(text) || [])[1] || ''), size: '', price: 0 });
    if (kind === 'label') { const t = clean((/etiqueta de env[ií]o para\s+(.+?)\.\s*utilizar/i.exec(m.subject || '') || /pedido\s*:?\s*\n?\s*([^\n]+)/i.exec(text) || [])[1] || ''); it.push({ title: t, size: '', price: 0 });
      carrier = /seur/i.test(text) ? 'seur' : /correos/i.test(text) ? 'correos' : /inpost/i.test(text) ? 'inpost' : /vinted go|mondial|relay/i.test(text) ? 'vintedgo' : '';
      const dl = /(\d{2})\/(\d{2})\/(\d{4})/.exec(m.subject || '') || /fecha l[ií]mite[^\d]{0,30}(\d{2})\/(\d{2})\/(\d{4})/i.exec(text); deadline = dl ? dl[3] + '-' + dl[2] + '-' + dl[1] : ''; }
    if (kind === 'feat') { const tot = /total[^\d€]{0,40}(\d{1,4}[.,]\d{2})/i.exec(text), all = [...text.matchAll(/(\d{1,4}[.,]\d{2})\s*€/g)].map(x => num(x[1])); total = tot ? num(tot[1]) : all.length ? Math.max(...all) : 0; }
    if (kind === 'buy') { it.push({ title: clean((/tu recibo de\s*[“"«]([^”"»]+)[”"»]/i.exec(m.subject) || /pedido\s*:?\s*\n?\s*([^\n]+)/i.exec(text) || [])[1] || 'Compra en Vinted'), size: '', price: 0 });
      total = num((/importe pagado\s*:?\s*\n?\s*(\d{1,5}[.,]\d{2})/i.exec(text) || /(\d{1,5}[.,]\d{2})\s*€/.exec(text) || [])[1] || 0); }
    return { kind, items: it, total, carrier, deadline, summary: '', ai: false };
  }
  const findSale = (title, acc, extra) => S.sales.filter(s => s.status !== 'devuelta' && (!acc || s.account === acc.id) && (!extra || extra(s))).map(s => ({ s, sc: titleScore(title, s.mailTitle || s.name) })).filter(x => x.sc >= .5).sort((a, b) => b.sc - a.sc || (b.s.date || '').localeCompare(a.s.date || ''))[0];
  const bumpStock = async (p, size, d) => { const sizes = (p.sizes || []).map(s => ({ ...s })), e = sizes.find(s => s.s === size); if (e) e.q = Math.max(0, e.q + d); else if (d > 0) sizes.push({ s: size || 'Única', q: d }); await db.doc('products/' + p.id).update({ sizes }); };

  async function handle(m) {
    const I = info(m), kind = I.kind, acc = accOf(m), date = ymdOf(m.date), base = 'v' + (m.mailId || m.id);
    const it0 = I.items[0] || { title: '', size: '', price: 0 };
    if (kind === 'sale') {   // una venta por artículo (en un lote, varias)
      const items = I.items.length ? I.items : [it0], notes = []; let anyReview = false, firstRef = '';
      for (let k = 0; k < items.length; k++) {
        const it = items[k], ref = base + (items.length > 1 ? '_' + k : ''); if (!firstRef) firstRef = ref;
        if (S.sales.some(s => s.id === ref || s.mailRef === ref)) { notes.push('ya estaba'); continue; }
        const price = it.price || (I.total && items.length ? Math.round(I.total / items.length * 100) / 100 : 0);
        const p = matchProduct(it.title), size = p ? pickSize(p, it.size || sizeOf(it.title)) : it.size || sizeOf(it.title);
        const data = p ? { productId: p.id, name: p.name, category: p.category || 'otro', photo: p.photo || '', size, qty: 1, price, cost: Math.round((p.cost || 0) * 100) / 100, account: acc ? acc.id : '', date }
          : { productId: '', name: it.title, category: 'otro', photo: '', size, qty: 1, price, cost: 0, account: acc ? acc.id : '', date };
        // ¿ya la apuntaste tú a mano? (mismo móvil, ±2 días, mismo artículo) → se une a esa en vez de duplicarla
        const mine = S.sales.find(s => s.source !== 'mail' && !s.mailRef && s.status !== 'devuelta' && (!acc || s.account === acc.id) && Math.max(days(s.date || date, date) || 0, days(date, s.date || date) || 0) <= 2 && (p ? s.productId === p.id : titleScore(it.title, s.name) >= .5));
        if (mine) {
          await db.doc('sales/' + mine.id).update({ source: 'mail', mailRef: ref, mailTitle: it.title, ...(mine.price ? {} : { price }), ...(mine.account || !acc ? {} : { account: acc.id }) });
          mine.source = 'mail'; mine.mailRef = ref; if (k === 0) firstRef = mine.id;
          notes.push(mine.name + ' · ya la tenías apuntada, ahora la sigo por correo'); continue;
        }
        if (p && size) await bumpStock(p, size, -1);
        const review = !p || !size || !acc || !price; anyReview = anyReview || review;
        const sale = { ...data, status: 'ok', ship: 'pend', createdAt: Date.now(), source: 'mail', mailTitle: it.title, review, lot: items.length > 1 ? base : '' };
        await db.doc('sales/' + ref).set(sale); if (!S.sales.some(s => s.id === ref)) S.sales.push({ id: ref, ...sale });   // que la vea ya el siguiente correo
        notes.push((p ? p.name : it.title) + (size ? ' · ' + size : '') + ' · ' + money(price) + (review ? ' · revisa ' + [!p && 'el artículo', p && !size && 'la talla', !acc && 'el móvil', !price && 'el precio'].filter(Boolean).join(', ') : ''));
      }
      if (notes.every(n => n === 'ya estaba')) return { kind, note: 'ya estaba' };
      return { kind, ref: 'sales/' + firstRef, review: anyReview, note: (items.length > 1 ? 'Lote de ' + items.length + ': ' : '') + notes.filter(n => n !== 'ya estaba').join(' + ') };
    }
    if (kind === 'paid') {
      const c = findSale(it0.title, acc, s => !s.paidAt);
      if (!c) return { kind, review: true, note: 'cobrado «' + it0.title + '», pero no encuentro la venta' };
      await db.doc('sales/' + c.s.id).update({ paidAt: date });
      return { kind, ref: 'sales/' + c.s.id, note: c.s.name + ' · cobrada' };
    }
    if (kind === 'label') {
      const c = findSale(it0.title, acc, s => !s.shippedAt);
      if (!c) return { kind, review: true, note: 'etiqueta de «' + it0.title + '», pero no encuentro la venta' };
      // SEUR y Correos no avisan cuando lo envías: se da por enviado a la semana (o en la fecha límite, si es antes)
      const week = addDays(date, 7), shipBy = I.carrier === 'seur' || I.carrier === 'correos' ? (I.deadline && I.deadline < week ? I.deadline : week) : '';
      await db.doc('sales/' + c.s.id).update({ labelAt: date, carrier: I.carrier, shipDeadline: I.deadline, shipBy });
      return { kind, ref: 'sales/' + c.s.id, note: c.s.name + ' · etiqueta' + (I.carrier ? ' ' + I.carrier.toUpperCase() : '') + (shipBy ? ' · enviado el ' + shipBy.slice(8) + '/' + shipBy.slice(5, 7) : '') };
    }
    if (kind === 'ship') {
      const c = it0.title ? findSale(it0.title, acc, s => !s.shippedAt) : null;
      const s = c ? c.s : S.sales.filter(x => x.status !== 'devuelta' && !x.shippedAt && (!acc || x.account === acc.id) && (x.date || '') >= addDays(date, -10) && (x.date || '') <= date).sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
      if (!s) return { kind, note: 'paquete entregado en el punto de envío' };
      await db.doc('sales/' + s.id).update({ ship: 'sent', shippedAt: date });
      return { kind, ref: 'sales/' + s.id, note: s.name + ' · enviado' };
    }
    if (kind === 'feat' || kind === 'buy') {
      if (S.expenses.some(e => e.id === base)) return { kind, note: 'ya estaba' };
      const amount = I.total || it0.price || 0;
      if (kind === 'feat') {
        const p = it0.title ? matchProduct(it0.title) : null;   // si la factura dice qué artículo, se asocia (y sale su estrella en el almacén)
        await db.doc('expenses/' + base).set({ concept: 'Destacado' + (p ? ' · ' + p.name : ''), amount, category: 'destacado', account: acc ? acc.id : '', date, units: 0, productId: p ? p.id : '', note: '', source: 'mail', createdAt: Date.now() });
        return { kind, ref: 'expenses/' + base, review: !amount || !acc, note: 'Destacado' + (p ? ' · ' + p.name : '') + ' · ' + money(amount) };
      }
      const what = it0.title || 'Compra en Vinted';
      await db.doc('expenses/' + base).set({ concept: what, amount, category: 'compra', account: acc ? acc.id : '', date, units: 0, source: 'mail', createdAt: Date.now() });
      return { kind, ref: 'expenses/' + base, review: !amount || !acc, note: what + ' · ' + money(amount) };
    }
    if (kind === 'cancel') {   // venta anulada: deja de contar y la unidad vuelve al stock
      const c = findSale(it0.title, acc);
      if (!c) return { kind, review: true, note: 'cancelado «' + it0.title + '», pero no encuentro la venta' };
      const p = c.s.productId && S.products.find(x => x.id === c.s.productId);
      if (p && !c.s.restocked) await bumpStock(p, c.s.size, c.s.qty || 1);
      await db.doc('sales/' + c.s.id).update({ status: 'devuelta', returnedAt: date, restocked: !!p, cancelled: true });
      return { kind, ref: 'sales/' + c.s.id, note: c.s.name + ' · cancelada' + (p ? ', vuelve al stock' : '') };
    }
    if (kind === 'return') {   // el comprador pide devolver: lo decides tú
      const c = findSale(it0.title, acc);
      return { kind, ref: c ? 'sales/' + c.s.id : '', review: true, note: 'Devolución pedida' + (c ? ' · ' + c.s.name : it0.title ? ' · ' + it0.title : '') + ' · ábrela y marca «Devolución» si se confirma' };
    }
    if (kind === 'payout') {   // dinero del saldo de Vinted al banco
      if (!acc || !I.total) return { kind, review: true, note: 'Transferencia al banco' + (I.total ? ' de ' + money(I.total) : '') + ': no sé de qué móvil' };
      const a = S.accounts.find(x => x.id === acc.id), old = (a && a.payouts) || [];
      if (old.some(p => p.mail === base)) return { kind, note: 'ya estaba' };
      await db.doc('accounts/' + acc.id).update({ payouts: old.concat({ id: base, date, amount: I.total, iban: (a && a.iban) || '', mail: base }) });
      return { kind, note: acc.name + ' · ' + money(I.total) + ' al banco' };
    }
    return { kind, note: I.summary || m.subject || '' };
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
        let r; try { r = await handle(m); } catch (e) { r = { kind: info(m).kind, review: true, note: 'no se pudo leer: ' + (e && e.message || e) }; }
        await db.doc('mailin/' + docId(m)).update({ done: true, kind: r.kind, ref: r.ref || '', review: !!r.review, note: r.note || '', doneAt: Date.now() });
        if (r.kind !== 'other' && r.note !== 'ya estaba') toast(({ sale: 'Venta desde Vinted', paid: 'Cobro', feat: 'Destacado', buy: 'Compra', ship: 'Envío', label: 'Etiqueta', cancel: 'Cancelada', return: 'Devolución', payout: 'Al banco' }[r.kind] || 'Vinted') + ' · ' + r.note);
      }
    } finally { busy = false; }
    if ((S.mailin || []).some(m => !m.done)) setTimeout(run, 1500);   // si han llegado más mientras tanto
  }
  setInterval(() => { run().catch(() => {}); }, 15000);                 // por si se escapa algún aviso
  window.MAIL = { run, kindOf, matchProduct, sizeOf };
})();
