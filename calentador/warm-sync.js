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
  /* ---------- Pestañas: 3 cuentas con los mismos menús y datos independientes ---------- */
  const SLOTS = ['1', '2', '3'];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ACTIVE = (v => SLOTS.includes(v) ? v : '1')(LS.get('wsActive'));
  window.W = {
    root: { slots: {}, names: {}, history: [] },
    get data() { return this.root.slots[ACTIVE] || (this.root.slots[ACTIVE] = {}); },
    set data(v) { this.root.slots[ACTIVE] = v; },
    save() { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 600); },
    flush
  };
  const slotName = n => W.root.names[n] || 'Cuenta ' + n;
  function slotStatus(n) {
    const d = W.root.slots[n] || {};
    if (d.vp_sent) return 'Enviada a la app';
    if (!d.vp_start) return 'Sin empezar';
    const a = new Date(d.vp_start + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
    return 'Día ' + Math.min(31, Math.max(1, Math.round((t - a) / 864e5) + 1)) + ' de 31';
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
    LS.set('wsActive', n); clearTimeout(timer); await flush(); location.reload();
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
  }

  /* ---------- Enviar el móvil a la app ---------- */
  const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/;
  const ibanFmt = s => String(s || '').replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  const r1 = n => Math.round(n * 10) / 10;

  function hookSend() {
    const base = window.render;
    window.render = function () { D.account.alias = slotName(ACTIVE); document.title = slotName(ACTIVE) + ' · Calentar cuenta'; base(); renderSend(); slotBar(); };
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
      const warmup = { inicio: startDate(), diasHechos: Object.values(dayDone).filter(Boolean).length, valoraciones: D.ratings.length, media: r1(T2.avg), indice: r1(T2.score / 20), articulos: D.listings.length, enviado: todayIso() };
      const { error } = await sb.from('docs').upsert({ coll: 'accounts', id, data: { name, iban: ib, phone: '', warm: true, order: Math.max(0, ...list.map(a => a.order || 0)) + 1, createdAt: Date.now(), warmup } });
      if (error) { ok.disabled = false; err.textContent = 'No se pudo enviar: ' + error.message; return; }
      W.data.vp_sent = { at: todayIso(), accountId: id, name };
      W.save(); await flush(); o.remove(); renderSend(); toast('«' + name + '» enviado a la app');
    };
    setTimeout(() => o.querySelector('#wsName').select(), 50);
  }

  async function startAnother() {
    if (!confirm('Se guarda esta cuenta en el historial y esta pestaña empieza de cero para otra. ¿Seguir?')) return;
    const d = W.data, T = trust();
    W.root.history.push({ pestaña: slotName(ACTIVE), name: d.vp_sent && d.vp_sent.name, inicio: d.vp_start, enviado: d.vp_sent && d.vp_sent.at, indice: r1(T.score / 20), valoraciones: D.ratings.length });
    W.data = {}; W.save(); await flush(); location.reload();
  }

  boot();
})();
