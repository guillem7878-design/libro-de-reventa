/* Calentar cuenta · sincronización con Supabase y envío del móvil a la app
   El panel guarda todo en un único documento (coll "warmups", id "current") de tu base de datos.
   Usa la misma sesión que la app principal (mismo dominio), así que no vuelve a pedirte el acceso. */
(() => {
  'use strict';
  const cfg = window.REVENTA_CONFIG || {};
  const iso = () => new Date().toISOString();
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sb = null, remoteAt = 0, dirty = false, timer = null, saving = false;

  /* ---------- Aviso a pantalla completa (errores de acceso) ---------- */
  function overlay(html) {
    let o = document.getElementById('wsGate');
    if (!o) { o = document.createElement('div'); o.id = 'wsGate'; o.style.cssText = 'position:fixed;inset:0;z-index:300;background:var(--bg);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:24px;font:15px/1.5 var(--font),system-ui,sans-serif'; document.body.appendChild(o); }
    o.innerHTML = `<div style="max-width:380px;display:flex;flex-direction:column;gap:12px">${html}</div>`; return o;
  }
  const toastEl = () => { let t = document.getElementById('wsToast'); if (!t) { t = document.createElement('div'); t.id = 'wsToast'; t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#2A2D35;color:#F2F1ED;border:1px solid rgba(255,255,255,.12);padding:11px 18px;border-radius:16px;font-weight:600;font-size:13.5px;z-index:400;max-width:90vw;opacity:0;transition:opacity .2s;pointer-events:none'; document.body.appendChild(t); } return t; };
  let tt; const toast = m => { const t = toastEl(); t.textContent = m; t.style.opacity = 1; clearTimeout(tt); tt = setTimeout(() => t.style.opacity = 0, 2600); };

  /* ---------- Si la carga se atasca: aviso con salida ---------- */
  async function resetLocal() {
    try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } catch (e) {}
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) {}
    location.reload();
  }
  setTimeout(() => {
    if (window.__wsReady || document.getElementById('wsGate')) return;
    const o = overlay('<b style="font-size:20px;letter-spacing:-.02em">Está tardando más de lo normal</b><span>No he podido cargar el panel todavía. Puede ser la conexión o una copia antigua guardada en este dispositivo.</span><button class="btn" id="stR" style="width:100%">Reintentar</button><button class="btn ghost" id="stC" style="width:100%">Limpiar copia local y reintentar</button><span class="hint">Limpiar no borra tus datos ni tu sesión: solo vuelve a descargar la app.</span>');
    o.querySelector('#stR').onclick = () => location.reload(); o.querySelector('#stC').onclick = resetLocal;
  }, 15000);

  /* ---------- Guardado ---------- */
  async function flush() {
    if (!sb || !dirty || saving) return; saving = true; dirty = false;
    const at = iso();
    const { error } = await sb.from('docs').upsert({ coll: 'warmups', id: 'current', data: W.root, updated_at: at });
    saving = false;
    if (error) { dirty = true; toast('No se pudo guardar. Revisa la conexión.'); return; }
    remoteAt = Date.parse(at);
    if (dirty) flush();
  }
  // guarda ya lo pendiente, esperando si había un guardado a medias (antes de recargar la página)
  async function flushAll() { clearTimeout(timer); while (saving) await new Promise(r => setTimeout(r, 50)); await flush(); }
  /* ---------- Pestañas: 3 cuentas con los mismos menús y datos independientes ---------- */
  const SLOTS = ['1', '2', '3'];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ACTIVE = (v => SLOTS.includes(v) ? v : '1')(LS.get('wsActive'));
  window.W = {
    root: { slots: {}, names: {}, history: [] },
    get data() { return this.root.slots[ACTIVE] || (this.root.slots[ACTIVE] = {}); },
    set data(v) { this.root.slots[ACTIVE] = v; },
    active: ACTIVE,
    save() { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 600); },
    flush: flushAll,
    pushBuys: () => pushBuys(),
    delExpense: id => delExpense(id)
  };
  const slotName = n => W.root.names[n] || 'Cuenta ' + n;
  function slotStatus(n) {
    const d = W.root.slots[n] || {};
    if (d.vp_sent) return 'Enviada a la app';
    if (!d.vp_start) return 'Sin empezar';
    const t = new Date(), hoy = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    if ((d.vp_skip || []).includes(hoy)) return 'Descanso hoy';
    const dia = window.WarmRemind ? WarmRemind.dayOf(d, hoy) : 1;
    return dia > 31 ? 'Plan terminado' : 'Día ' + Math.max(1, dia) + ' de 31';
  }
  function slotBar() {
    const hd = document.querySelector('header'); if (!hd) return;
    let bar = document.getElementById('slotBar');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'slotBar'; hd.after(bar);
      const st = document.createElement('style');
      st.textContent = '#slotBar .sl{display:flex;gap:8px;margin:14px 0 16px;padding:2px}#slotBar .slw{position:relative;flex:1 1 0;min-width:0}#slotBar .slb{width:100%;text-align:left;border:1px solid var(--line);background:var(--card);border-radius:18px;padding:9px 26px 9px 10px;cursor:pointer;color:var(--ink);font:inherit;transition:.15s}#slotBar .slb:hover{border-color:var(--bd2)}#slotBar .slb b{display:block;font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#slotBar .slb span{display:block;font-size:11px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#slotBar .sle{position:absolute;top:50%;right:3px;transform:translateY(-50%);width:22px;height:22px;border:0;border-radius:9px;background:transparent;color:var(--mut);cursor:pointer;display:grid;place-items:center;padding:0;transition:.15s}#slotBar .sle:hover{background:var(--card2);color:var(--ink)}#slotBar .sle svg{width:12px;height:12px}#slotBar .slb.on+.sle{color:rgba(255,255,255,.75)}#slotBar .slb.on+.sle:hover{background:rgba(255,255,255,.14);color:#fff}';
      document.head.appendChild(st); bar.addEventListener('click', onBar);
    }
    const pen = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/></svg>';
    bar.innerHTML = '<div class="wrap"><div class="sl" role="tablist" aria-label="Cuentas">' + SLOTS.map(n =>
      '<div class="slw"><button class="slb' + (n === ACTIVE ? ' on' : '') + '" role="tab" aria-selected="' + (n === ACTIVE) + '" data-n="' + n + '"><b>' + esc(slotName(n)) + '</b><span>' + esc(slotStatus(n)) + '</span></button>' +
      '<button class="sle" data-ed="' + n + '" aria-label="Cambiar el nombre de ' + esc(slotName(n)) + '" title="Cambiar nombre">' + pen + '</button></div>').join('') + '</div></div>';
  }
  function renameSlot(n) {
    const o = overlay('<div style="background:var(--card);border:1px solid var(--line);border-radius:24px;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6)"><b style="font-size:19px;letter-spacing:-.02em">Nombre de la cuenta</b><span class="hint">Cómo quieres llamar a esta pestaña. Si la envías a la app, ese será el nombre del móvil.</span><input id="wsRen" maxlength="24" autocomplete="off" value="' + esc(slotName(n)) + '" style="display:block;width:100%;padding:11px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card2);font:inherit;color:var(--ink)"><div class="row" style="gap:8px"><button class="btn" id="wsRenOk" style="flex:1">Guardar</button><button class="btn ghost" id="wsRenNo">Cancelar</button></div></div>');
    o.style.background = 'rgba(0,0,0,.6)';
    const inp = o.querySelector('#wsRen');
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    const save = () => {
      const v = inp.value.trim().slice(0, 24);
      if (v && v !== 'Cuenta ' + n) W.root.names[n] = v; else delete W.root.names[n];
      W.save(); o.remove(); window.render(); toast('Nombre guardado');
    };
    o.querySelector('#wsRenOk').onclick = save; o.querySelector('#wsRenNo').onclick = () => o.remove();
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); else if (e.key === 'Escape') o.remove(); });
  }
  async function onBar(e) {
    const ed = e.target.closest('[data-ed]'); if (ed) { renameSlot(ed.dataset.ed); return; }
    const b = e.target.closest('.slb'); if (!b) return;
    const n = b.dataset.n; if (!n || n === ACTIVE) return;
    LS.set('wsActive', n); await flushAll(); location.reload();
  }
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { clearTimeout(timer); flush(); return; }
    if (!sb || dirty) return;
    const { data } = await sb.from('docs').select('updated_at').eq('coll', 'warmups').eq('id', 'current').maybeSingle();
    if (data && Date.parse(data.updated_at) > remoteAt + 1500 && !dirty) location.reload();
  });
  addEventListener('pagehide', () => { clearTimeout(timer); flush(); });

  /* ---------- Arranque ---------- */
  async function boot() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) { overlay('<b style="font-size:20px;letter-spacing:-.02em">Falta conectar la base de datos</b><span>Revisa <code>config.js</code> en la raíz de la app.</span>'); return; }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { overlay('<b style="font-size:20px;letter-spacing:-.02em">Entra primero en la app</b><span>Este panel usa tu cuenta del Libro de Reventa para guardar y sincronizar el calentamiento.</span><a href="../" style="background:var(--btn);color:var(--btn-ink);text-align:center;padding:13px;border-radius:16px;font-weight:600;text-decoration:none">Ir a la app</a>'); return; }
    const { data, error } = await sb.from('docs').select('data,updated_at').eq('coll', 'warmups').eq('id', 'current').maybeSingle();
    if (error) { overlay('<b style="font-size:20px;letter-spacing:-.02em">No se pudieron cargar los datos</b><span>' + esc(error.message) + '</span>'); return; }
    if (data) {
      let r = data.data || {}; remoteAt = Date.parse(data.updated_at);
      if (!r.slots) { const hist = r.vp_history || []; delete r.vp_history; r = { slots: { '1': r }, names: {}, history: hist }; W.root = r; W.save(); }
      r.slots = r.slots || {}; r.names = r.names || {}; r.history = r.history || [];
      W.root = r;
    }
    // la página debe estar entera (el bloque del panel está más abajo que este archivo)
    if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    // ejecuta el panel (su código está en un bloque de texto para no arrancar antes de tener los datos)
    const s = document.createElement('script'); s.textContent = document.getElementById('main-app').textContent; document.body.appendChild(s);
    hookSend(); window.__wsReady = true;
    renderRem(); autoBackup();
    if (window.WarmRemind) WarmRemind.start(async () => W.root);
    if (W.data.vp_sent) pushBuys();
  }

  /* ---------- Compras del calentamiento → gastos del móvil en la app ---------- */
  const r2 = n => Math.round(n * 100) / 100;
  // resumen de compras y ventas de la pestaña abierta (va a la ficha del móvil en la app)
  function hist() {
    const d = W.data, B = d.vp_buys || [], S = (d.vp_listings || []).filter(x => x.estado === 'vendido');
    const historial = B.map(b => ({ t: 'compra', fecha: b.fecha, articulo: b.articulo, importe: r2((b.precio || 0) + (b.envio || 0)) }))
      .concat(S.map(x => ({ t: 'venta', fecha: x.fechaVenta || x.fecha, articulo: x.articulo + (x.modelo ? ' · ' + x.modelo : ''), importe: r2((x.precioVenta || 0) - (x.comisionEnvio || 0)) })))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const tot = t => r2(historial.filter(h => h.t === t).reduce((a, h) => a + h.importe, 0));
    return { compras: B.length, gastado: tot('compra'), ventas: S.length, ingresos: tot('venta'), historial };
  }
  let pushing = false;
  async function pushBuys(accountId, name) {
    const sent = W.data.vp_sent; accountId = accountId || (sent && sent.accountId); name = name || (sent && sent.name);
    if (!sb || !accountId || pushing) return 0;
    pushing = true; let n = 0;
    try {
      for (const b of W.data.vp_buys || []) {
        if (b.appId) continue;
        const id = uuid();
        const { error } = await sb.from('docs').upsert({ coll: 'expenses', id, data: { concept: 'Calentamiento ' + name + ' · ' + (b.articulo || 'compra'), amount: r2((b.precio || 0) + (b.envio || 0)), date: b.fecha || todayIso(), category: 'otros', units: 1, account: accountId, warmup: true, createdAt: Date.now() } });
        if (error) { toast('No se pudo pasar una compra a la app: ' + error.message); break; }
        b.appId = id; n++;
      }
    } finally { pushing = false; }
    if (n) { W.save(); await flushAll(); window.render(); toast(n === 1 ? 'Compra apuntada como gasto en la app' : n + ' compras apuntadas como gastos en la app'); }
    return n;
  }
  async function delExpense(id) {
    const { error } = await sb.from('docs').delete().eq('coll', 'expenses').eq('id', id);
    if (error) toast('No se pudo quitar el gasto de la app: ' + error.message);
  }
  // con la cuenta ya en la app, su ficha se mantiene al día con las compras y ventas nuevas
  let histSig = null, histT = null;
  function syncApp() {
    const sent = W.data.vp_sent; if (!sent || !sb) return;
    const h = hist(), sig = JSON.stringify(h); if (sig === histSig) return; histSig = sig;
    clearTimeout(histT); histT = setTimeout(async () => {
      const { data } = await sb.from('docs').select('data').eq('coll', 'accounts').eq('id', sent.accountId).maybeSingle();
      if (!data || !data.data) return; // el móvil se borró en la app
      const a = data.data, w = a.warmup || {};
      if (JSON.stringify({ compras: w.compras, gastado: w.gastado, ventas: w.ventas, ingresos: w.ingresos, historial: w.historial }) === sig) return;
      a.warmup = { ...w, ...h };
      await sb.from('docs').upsert({ coll: 'accounts', id: sent.accountId, data: a });
    }, 800);
  }

  /* ---------- Copias automáticas: una al día de las tres pestañas, se guardan las últimas 14 ---------- */
  const KEEP = 14;
  async function listBk() {
    const { data, error } = await sb.from('docs').select('id,updated_at').eq('coll', 'warmups');
    if (error) return null;
    return (data || []).filter(r => /^bk-\d{4}-\d{2}-\d{2}$/.test(r.id)).sort((a, b) => b.id.localeCompare(a.id));
  }
  async function autoBackup() {
    try {
      const has = Object.values(W.root.slots || {}).some(s => s && Object.keys(s).length);
      const list = await listBk();
      if (has && list) {
        const id = 'bk-' + todayIso();
        if (!list.some(r => r.id === id)) { const at = iso(); const { error } = await sb.from('docs').upsert({ coll: 'warmups', id, data: JSON.parse(JSON.stringify(W.root)), updated_at: at }); if (!error) list.unshift({ id, updated_at: at }); }
        for (const r of list.slice(KEEP)) await sb.from('docs').delete().eq('coll', 'warmups').eq('id', r.id);
      }
    } catch (e) {}
    renderBk();
  }
  const fmtDay = s => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  async function renderBk() {
    const el = document.getElementById('bkList'); if (!el) return;
    const list = await listBk();
    if (!list) { el.innerHTML = '<div class="empty">No se pudieron cargar las copias.</div>'; return; }
    if (!list.length) { el.innerHTML = '<div class="empty">Aún no hay copias automáticas. La primera se guarda sola en cuanto empieces una cuenta.</div>'; return; }
    el.innerHTML = list.map(r => { const d = r.id.slice(3), h = r.updated_at ? new Date(r.updated_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="bkrow"><span>${esc(fmtDay(d))}${h ? ' <span class="hint">· ' + esc(h) + '</span>' : ''}</span><span class="row" style="gap:6px"><button class="btn ghost sm" data-bkd="${esc(r.id)}">Descargar</button><button class="btn ghost sm" data-bkr="${esc(r.id)}">Volver a esta</button></span></div>`; }).join('');
    el.onclick = async e => {
      const b = e.target.closest('[data-bkd],[data-bkr]'); if (!b) return;
      const id = b.dataset.bkd || b.dataset.bkr, day = id.slice(3);
      const { data, error } = await sb.from('docs').select('data').eq('coll', 'warmups').eq('id', id).maybeSingle();
      if (error || !data || !data.data) { toast('No se pudo leer la copia'); return; }
      if (b.dataset.bkd) { saveJson('copia-calentador-' + day + '.json', { tipo: 'calentador', version: 2, fecha: day, root: data.data }); return; }
      if (!confirm('El calentador entero (las tres pestañas) vuelve a como estaba el ' + fmtDay(day) + '. Lo que hayas hecho después se pierde. ¿Seguir?')) return;
      const r = data.data; W.root = { slots: r.slots || {}, names: r.names || {}, history: r.history || [] };
      W.save(); await flushAll(); location.reload();
    };
  }

  /* ---------- Recordatorio del día (en este dispositivo) ---------- */
  function renderRem() {
    const el = document.getElementById('remBox'); if (!el || !window.WarmRemind) return;
    const R = window.WarmRemind, t = R.time(), sup = 'Notification' in window, perm = sup ? Notification.permission : 'denied';
    el.innerHTML = `<p class="hint" style="margin-top:0">Un aviso a la hora que elijas con lo que toca hoy en cada pestaña. No avisa de las cuentas que ya has hecho, saltado o enviado.</p>
      <div class="remrow"><input type="time" id="remT" value="${t || '10:00'}" aria-label="Hora del aviso"><button class="btn" id="remOn">${t ? 'Cambiar hora' : 'Activar'}</button>${t ? '<button class="btn ghost" id="remOff">Desactivar</button>' : ''}</div>
      <p class="hint" style="margin-bottom:0">${!sup ? 'Este navegador no permite avisos.' : perm === 'denied' ? 'Los avisos están bloqueados para esta web en el navegador: actívalos en sus ajustes.' : t ? '<b style="color:var(--ink)">Activado a las ' + t + '</b> en este dispositivo.' : 'Se activa solo en este dispositivo.'}
      Llega con la app o este panel abiertos o en segundo plano. Con todo cerrado haría falta un servidor de avisos, que no está montado.</p>`;
    el.querySelector('#remOn').onclick = async () => {
      const v = el.querySelector('#remT').value; if (!/^\d{2}:\d{2}$/.test(v)) { toast('Elige una hora'); return; }
      if (!sup) { toast('Este navegador no permite avisos'); return; }
      if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') { toast('Sin permiso para avisos'); renderRem(); return; }
      const first = !R.time(); R.set(v); renderRem(); window.render();
      toast('Te aviso cada día a las ' + v);
      if (first) R.show('Recordatorio activado', 'Cada día a las ' + v + ' te aviso de lo que toca en cada cuenta.');
    };
    const off = el.querySelector('#remOff'); if (off) off.onclick = () => { R.set(null); renderRem(); window.render(); toast('Recordatorio desactivado'); };
  }

  /* ---------- Enviar el móvil a la app ---------- */
  const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/;
  const ibanFmt = s => String(s || '').replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  const r1 = n => Math.round(n * 10) / 10;

  function hookSend() {
    const base = window.render;
    window.render = function () { D.account.alias = slotName(ACTIVE); document.title = slotName(ACTIVE) + ' · Calentar cuenta'; base(); renderSend(); slotBar(); syncApp(); };
    window.render();
    const ti = document.getElementById('title'); if (ti) { ti.style.cursor = 'pointer'; ti.title = 'Cambiar el nombre de la cuenta'; ti.addEventListener('click', () => renameSlot(ACTIVE)); }
  }

  function renderSend() {
    const el = document.getElementById('sendBox'); if (!el) return;
    const sent = W.data.vp_sent, T = trust(), started = !!startDate();
    const box = 'margin:0 0 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap';
    if (sent) {
      el.innerHTML = `<div class="card" style="${box}"><div style="min-width:0"><b>Enviado a la app</b><div class="hint">«${esc(sent.name)}» está en Móviles como calentado desde el ${esc(sent.at)}.</div></div>
        <div class="row" style="gap:8px"><a class="btn" href="../?movil=${encodeURIComponent(sent.accountId)}" style="text-decoration:none">Abrir en la app</a><button class="btn ghost" id="wsNew">Calentar otra cuenta</button></div></div>`;
      document.getElementById('wsNew').onclick = startAnother;
      return;
    }
    if (!started) { el.innerHTML = ''; return; }
    const falta = T.checks.filter(c => !c[1]).length;
    el.innerHTML = `<div class="card" style="${box}"><div style="min-width:0"><b>Enviar a la app</b>
      <div class="hint">${T.ready ? 'Cuenta calentada: índice ' + (T.score / 20).toFixed(1) + '/5. Ya puedes enviarla.' : 'Índice ' + (T.score / 20).toFixed(1) + '/5 · te faltan ' + falta + ' de ' + T.checks.length + ' comprobaciones.'}</div></div>
      <button class="btn" id="wsSend">Enviar a la app</button></div>`;
    document.getElementById('wsSend').onclick = openSend;
  }

  async function openSend() {
    const T = trust();
    const { data: accs } = await sb.from('docs').select('data').eq('coll', 'accounts');
    const list = (accs || []).map(r => r.data || {});
    const nextName = W.root.names[ACTIVE] || 'Móvil ' + (list.length + 1);
    const missing = T.checks.filter(c => !c[1]).map(c => c[0]);
    const o = overlay(`<div style="background:var(--card);border:1px solid var(--line);border-radius:24px;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6)">
      <b style="font-size:19px">Enviar el móvil a la app</b>
      <span class="hint">Se añade a <b>Móviles</b> como <b>Calentada</b>, con el resumen del calentamiento.</span>
      ${missing.length ? `<div style="background:var(--warnbg);border-radius:14px;padding:10px 12px;font-size:13px"><b>Aún no cumple todo:</b><ul style="margin:6px 0 0;padding-left:18px">${missing.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <label class="hint">Nombre del móvil<input id="wsName" value="${esc(nextName)}" autocomplete="off" style="display:block;width:100%;margin-top:4px;padding:11px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card2);font:inherit;color:var(--ink)"></label>
      <label class="hint">IBAN donde cobra (opcional)<input id="wsIban" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ES00 0000 0000 0000 0000 0000" style="display:block;width:100%;margin-top:4px;padding:11px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card2);font:inherit;color:var(--ink);text-transform:uppercase"></label>
      <div id="wsErr" style="color:var(--bad);font-size:13px;min-height:16px"></div>
      <div class="row" style="gap:8px"><button class="btn" id="wsOk" style="flex:1">Enviar</button><button class="btn ghost" id="wsCancel">Cancelar</button></div></div>`);
    o.style.background = 'rgba(0,0,0,.6)';
    const iban = o.querySelector('#wsIban');
    iban.addEventListener('input', () => { iban.value = ibanFmt(iban.value); });
    o.querySelector('#wsCancel').onclick = () => o.remove();
    o.querySelector('#wsOk').onclick = async () => {
      const name = o.querySelector('#wsName').value.trim(), ib = iban.value.replace(/\s/g, '').toUpperCase(), err = o.querySelector('#wsErr'), ok = o.querySelector('#wsOk');
      if (!name) { err.textContent = 'Ponle un nombre al móvil.'; return; }
      if (ib && !IBAN_RE.test(ib)) { err.textContent = 'Ese IBAN no parece correcto. Revisa que empiece por ES y los números.'; return; }
      ok.disabled = true; err.textContent = '';
      const T2 = trust(), id = uuid();
      const warmup = { inicio: startDate(), diasHechos: Object.values(dayDone).filter(Boolean).length, valoraciones: D.ratings.length, media: r1(T2.avg), indice: r1(T2.score / 20), articulos: D.listings.length, enviado: todayIso(), ...hist() };
      const { error } = await sb.from('docs').upsert({ coll: 'accounts', id, data: { name, iban: ib, phone: '', warm: true, order: Math.max(0, ...list.map(a => a.order || 0)) + 1, createdAt: Date.now(), warmup } });
      if (error) { ok.disabled = false; err.textContent = 'No se pudo enviar: ' + error.message; return; }
      W.data.vp_sent = { at: todayIso(), accountId: id, name };
      W.save(); await flushAll(); o.remove(); renderSend(); toast('«' + name + '» enviado a la app');
      await pushBuys(id, name); renderBuyForm();
    };
    setTimeout(() => o.querySelector('#wsName').select(), 50);
  }

  async function startAnother() {
    if (!confirm('Se guarda esta cuenta en el historial y esta pestaña empieza de cero para otra. ¿Seguir?')) return;
    const d = W.data, T = trust();
    W.root.history.push({ pestaña: slotName(ACTIVE), name: d.vp_sent && d.vp_sent.name, inicio: d.vp_start, enviado: d.vp_sent && d.vp_sent.at, indice: r1(T.score / 20), valoraciones: D.ratings.length, compras: (d.vp_buys || []).length, ventas: D.listings.filter(x => x.estado === 'vendido').length });
    W.data = {}; W.save(); await flushAll(); location.reload();
  }

  boot();
})();
