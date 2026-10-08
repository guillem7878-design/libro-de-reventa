/* Libro de Reventa · sincronización con Supabase
   Reemplaza al entorno de Claude: ofrece la misma interfaz (db, assets, downloads) que usa la app,
   pero guarda los datos en tu proyecto de Supabase, con login, tiempo real y avisos. */
(() => {
  'use strict';
  const cfg = window.REVENTA_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  window.BLOB_URL = configured ? cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/photos/' : '';

  const COLLS = ['products', 'sales', 'expenses', 'stockmoves', 'accounts', 'catalog'];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const clean = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let sb = null, uid = null, email = '', installEvt = null;
  const cache = {}, subs = {}, loaded = {}, loading = {}, mine = new Set();
  COLLS.forEach(c => { cache[c] = new Map(); subs[c] = []; });

  /* ---------- Service worker e instalación ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  addEventListener('appinstalled', () => { installEvt = null; });
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent);

  /* ---------- Pantallas de acceso ---------- */
  const css = document.createElement('style');
  css.textContent = `
  #gate{position:fixed;inset:0;z-index:200;background:var(--bg);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto}
  #gate .box{width:100%;max-width:380px;display:flex;flex-direction:column;gap:14px}
  #gate img.logo{width:72px;height:72px;border-radius:18px;align-self:flex-start}
  #gate h1{margin:6px 0 0;font-size:30px;letter-spacing:-.035em;line-height:1.1}
  #gate p{margin:0;color:var(--ink2);font-size:14.5px;line-height:1.5}
  #gate .err{color:var(--neg);font-size:13.5px;min-height:18px}
  #gate .lnk{color:var(--ink2);font-size:14px;font-weight:600;align-self:center;padding:6px}
  #gate ol{margin:0;padding-left:20px;color:var(--ink2);font-size:14px;line-height:1.7}
  #gate code{font-family:ui-monospace,Menlo,Consolas,monospace;background:var(--card2);padding:1px 6px;border-radius:6px;color:var(--ink)}`;
  document.head.appendChild(css);

  function gate(html) { let g = document.getElementById('gate'); if (!g) { g = document.createElement('div'); g.id = 'gate'; document.body.appendChild(g); } g.innerHTML = `<div class="box">${html}</div>`; return g; }
  const ungate = () => { const g = document.getElementById('gate'); if (g) g.remove(); };

  function setupScreen() {
    gate(`<img class="logo" src="icons/icon-192.png" alt=""><h1>Falta conectar la base de datos</h1>
      <p>Esta app guarda tus datos en tu propio proyecto de Supabase para sincronizar móvil y ordenador.</p>
      <ol><li>Crea un proyecto gratis en supabase.com.</li><li>Ejecuta <code>supabase/schema.sql</code> en el editor SQL.</li><li>Copia la URL y la clave <code>anon</code> en <code>config.js</code>.</li></ol>
      <p>Los pasos completos están en el README.</p>`);
  }

  function loginScreen() {
    return new Promise(resolve => {
      let signup = false;
      const draw = (msg = '') => {
        const g = gate(`<img class="logo" src="icons/icon-192.png" alt=""><h1>Libro de Reventa</h1>
          <p>${signup ? 'Crea tu cuenta. Solo la necesitas la primera vez.' : 'Entra con tu cuenta para ver tus datos.'}</p>
          <form class="f" id="loginF" novalidate>
            <div class="fld"><label for="lg-mail">Correo</label><input id="lg-mail" type="email" autocomplete="email" inputmode="email" autocapitalize="off" value="${esc(LS.get('lastMail') || '')}"></div>
            <div class="fld"><label for="lg-pass">Contraseña</label><input id="lg-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}"></div>
            <div class="err" id="lg-err" role="alert">${esc(msg)}</div>
            <button class="btn btn-main btn-block" id="lg-go">${signup ? 'Crear cuenta' : 'Entrar'}</button>
          </form>
          <button class="lnk" id="lg-sw">${signup ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}</button>`);
        g.querySelector('#lg-sw').onclick = () => { signup = !signup; draw(); };
        g.querySelector('#loginF').onsubmit = async ev => {
          ev.preventDefault();
          const mail = g.querySelector('#lg-mail').value.trim(), pass = g.querySelector('#lg-pass').value, err = g.querySelector('#lg-err'), go = g.querySelector('#lg-go');
          if (!mail || !pass) { err.textContent = 'Escribe tu correo y tu contraseña.'; return; }
          if (signup && pass.length < 6) { err.textContent = 'La contraseña necesita al menos 6 caracteres.'; return; }
          go.disabled = true; err.textContent = '';
          const { data, error } = signup ? await sb.auth.signUp({ email: mail, password: pass }) : await sb.auth.signInWithPassword({ email: mail, password: pass });
          go.disabled = false;
          if (error) { err.textContent = /invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.' : /already registered/i.test(error.message) ? 'Ese correo ya tiene cuenta. Pulsa «Ya tengo cuenta».' : 'No se pudo entrar: ' + error.message; return; }
          if (!data.session) { err.textContent = 'Te hemos enviado un correo para confirmar la cuenta. Confírmalo y vuelve a entrar.'; return; }
          LS.set('lastMail', mail); resolve(data.session);
        };
      };
      draw();
    });
  }

  /* ---------- Base de datos ---------- */
  async function loadColl(c) {
    if (loaded[c]) return;
    if (loading[c]) return loading[c];
    loading[c] = (async () => {
      const m = new Map(); let from = 0; const step = 1000;
      for (;;) {
        const { data, error } = await sb.from('docs').select('id,data').eq('coll', c).order('created_at', { ascending: true }).range(from, from + step - 1);
        if (error) throw error;
        data.forEach(r => m.set(r.id, r.data));
        if (data.length < step) break; from += step;
      }
      // lo que haya llegado en tiempo real mientras cargaba tiene prioridad
      cache[c].forEach((v, k) => m.set(k, v));
      cache[c] = m; loaded[c] = true; emit(c);
    })();
    return loading[c];
  }
  const snap = c => ({ docs: [...cache[c]].map(([id, d]) => ({ id, data: () => d })) });
  function emit(c) { subs[c].forEach(cb => { try { cb(snap(c)); } catch (e) { console.error(e); } }); if (c === 'products') checkStock(); }
  const note = id => { mine.add(id); setTimeout(() => mine.delete(id), 20000); };
  const failIfOffline = () => { if (navigator.onLine === false) { const e = new Error('offline'); e.code = 'offline'; throw e; } };

  async function put(c, id, obj) {
    failIfOffline(); note(id);
    const { error } = await sb.from('docs').upsert({ coll: c, id, data: clean(obj), updated_at: new Date().toISOString() });
    if (error) throw error;
    cache[c].set(id, clean(obj)); if (loaded[c]) emit(c);
  }
  async function patch(c, id, p) {
    failIfOffline(); note(id);
    const { error } = await sb.rpc('merge_doc', { p_coll: c, p_id: id, p_patch: clean(p) });
    if (error) throw error;
    cache[c].set(id, { ...(cache[c].get(id) || {}), ...clean(p) }); if (loaded[c]) emit(c);
  }
  async function del(c, id) {
    failIfOffline(); note(id);
    const { error } = await sb.from('docs').delete().eq('coll', c).eq('id', id);
    if (error) throw error;
    cache[c].delete(id); if (loaded[c]) emit(c);
  }
  const db = {
    collection(c) {
      return {
        onSnapshot(cb, errCb) { subs[c].push(cb); if (loaded[c]) cb(snap(c)); else loadColl(c).catch(e => errCb && errCb(e)); return () => { subs[c] = subs[c].filter(f => f !== cb); }; },
        async add(obj) { const id = uuid(); await put(c, id, obj); return { id }; }
      };
    },
    doc(path) { const i = path.indexOf('/'), c = path.slice(0, i), id = path.slice(i + 1); return { update: p => patch(c, id, p), set: o => put(c, id, o), delete: () => del(c, id) }; }
  };

  function onRealtime(p) {
    const row = p.eventType === 'DELETE' ? p.old : p.new; if (!row || !cache[row.coll]) return;
    const c = row.coll;
    if (p.eventType === 'DELETE') cache[c].delete(row.id);
    else { const had = cache[c].has(row.id); cache[c].set(row.id, p.new.data); if (!had && p.eventType === 'INSERT' && !mine.has(row.id)) remoteInsert(c, p.new.data); }
    if (loaded[c]) emit(c);
  }

  /* ---------- Fotos y descargas ---------- */
  const assets = {
    async upload(blob, opts) {
      failIfOffline(); const path = `${uid}/${uuid()}.jpg`;
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: (opts && opts.type) || 'image/jpeg', upsert: false });
      if (error) { const e = new Error(error.message); e.code = /exceed|size|quota/i.test(error.message) ? 'quota_exceeded' : 'upload'; throw e; }
      return { id: path };
    }
  };
  function saveFile(filename, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const downloads = { async save({ filename, data }) { saveFile(filename, data, 'text/csv;charset=utf-8'); } };

  /* ---------- Avisos ---------- */
  const notifSupported = () => 'Notification' in window && 'serviceWorker' in navigator;
  const notifOn = () => notifSupported() && Notification.permission === 'granted' && LS.get('notif') !== '0';
  async function showNote(title, body, tag) {
    if (!notifOn()) return;
    try { const reg = await navigator.serviceWorker.getRegistration(); const o = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag, data: { url: './' } };
      if (reg) await reg.showNotification(title, o); else new Notification(title, o); } catch (e) {}
  }
  const money = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(+n) ? 0 : 2 }).format(n || 0);
  function remoteInsert(c, d) {
    if (c !== 'sales') return;
    const text = `${d.name || 'Venta'} · ${money(d.price)}`;
    if (document.visibilityState === 'visible') { if (window.toast) window.toast('Venta en otro dispositivo · ' + text); }
    else showNote('Nueva venta', text, 'venta');
  }
  let lastUnits = null;
  function checkStock() {
    if (!loaded.products) return;
    const t = [...cache.products.values()].reduce((s, p) => s + (p.sizes || []).reduce((a, x) => a + (x.q || 0), 0), 0);
    if (lastUnits !== null && lastUnits >= 15 && t < 15 && document.visibilityState !== 'visible') showNote('Stock bajo', `Quedan ${t} ${t === 1 ? 'unidad' : 'unidades'} en total.`, 'stock');
    lastUnits = t;
  }

  /* ---------- Copia de seguridad ---------- */
  const allDocs = () => COLLS.flatMap(c => [...cache[c]].map(([id, data]) => ({ coll: c, id, data })));
  function exportBackup() { saveFile(`reventa-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), docs: allDocs() }), 'application/json'); }
  function importBackup() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text()); const docs = (j.docs || []).filter(d => COLLS.includes(d.coll) && d.id && d.data);
        if (!docs.length) { window.toast('Ese archivo no tiene datos de la app'); return; }
        window.toast('Importando…');
        for (let i = 0; i < docs.length; i += 200) {
          const rows = docs.slice(i, i + 200).map(d => ({ coll: d.coll, id: String(d.id), data: clean(d.data) }));
          rows.forEach(r => note(r.id));
          const { error } = await sb.from('docs').upsert(rows); if (error) throw error;
          rows.forEach(r => cache[r.coll].set(r.id, r.data));
        }
        COLLS.forEach(c => loaded[c] && emit(c)); window.toast(`Importados ${docs.length} registros`);
      } catch (e) { window.toast('No se pudo importar: ' + (e.message || 'archivo no válido')); }
    };
    inp.click();
  }

  /* ---------- Ajustes ---------- */
  const ico = p => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = {
    bell: ico('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    out: ico('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
    up: ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
    down: ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
    phone: ico('<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>')
  };
  const chev = '<svg class="i chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  const row = (act, icon, t, s) => `<button class="row" data-action="${act}"><span class="th">${icon}</span><span class="rm"><span class="rt">${t}</span><span class="rs">${s}</span></span>${chev}</button>`;
  function settingsHtml() {
    let h = '';
    if (!isStandalone()) h += row('sx-install', IC.phone, 'Instalar la app', installEvt ? 'Icono propio y pantalla completa' : isIOS() ? 'Compartir › Añadir a pantalla de inicio' : 'Menú del navegador › Instalar');
    if (notifSupported()) {
      const p = Notification.permission;
      h += row('sx-notif', IC.bell, 'Avisos', p === 'denied' ? 'Bloqueados en el navegador' : notifOn() ? 'Activados · toca para desactivar' : 'Ventas desde otro dispositivo y stock bajo');
    }
    h += row('sx-backup', IC.down, 'Copia de seguridad', 'Descarga todos tus datos en un archivo');
    h += row('sx-import', IC.up, 'Importar copia', 'Sube un archivo de copia de seguridad');
    h += row('sx-out', IC.out, 'Cerrar sesión', esc(email));
    return `<div class="list">${h}</div>`;
  }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-action^="sx-"]'); if (!b) return;
    switch (b.dataset.action) {
      case 'sx-install':
        if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; }
        else window.toast(isIOS() ? 'En Safari: Compartir › Añadir a pantalla de inicio' : 'Usa el menú del navegador › Instalar app');
        break;
      case 'sx-notif': {
        if (notifOn()) { LS.set('notif', '0'); window.toast('Avisos desactivados'); }
        else if (Notification.permission === 'denied') window.toast('Actívalos en los ajustes del navegador para este sitio');
        else { const p = await Notification.requestPermission(); if (p === 'granted') { LS.set('notif', '1'); window.toast('Avisos activados'); showNote('Avisos activados', 'Te avisaremos de ventas y stock bajo.', 'hola'); } }
        if (window.moreSheet) window.moreSheet(); break; }
      case 'sx-backup': exportBackup(); break;
      case 'sx-import': importBackup(); break;
      case 'sx-out': await sb.auth.signOut(); location.reload(); break;
    }
  });

  /* ---------- Arranque ---------- */
  let booted = null;
  async function boot() {
    if (!configured) { setupScreen(); return null; }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await sb.auth.getSession();
    if (!session) session = await loginScreen();
    uid = session.user.id; email = session.user.email || ''; ungate();
    sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
    sb.channel('docs-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, onRealtime).subscribe();
    // al volver a la app tras un rato, recarga por si se perdió algún evento
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - (window.__hiddenAt || Date.now()) > 30000) COLLS.forEach(c => { loaded[c] = false; loading[c] = null; cache[c] = new Map(); if (subs[c].length) loadColl(c).catch(() => {}); }); else if (document.visibilityState === 'hidden') window.__hiddenAt = Date.now(); });
    // acceso directo ?accion=venta
    if (/accion=venta/.test(location.search)) { const t = setInterval(() => { if (window.loadedAll && window.loadedAll() && window.saleForm) { clearInterval(t); window.S.quick = false; window.saleForm(); } }, 250); setTimeout(() => clearInterval(t), 10000); }
    return db;
  }
  window.claude = { use: async name => name === 'db' ? (booted || (booted = boot())) : name === 'downloads' ? downloads : name === 'assets' ? assets : null };
  window.SYNC = { settingsHtml };
})();
