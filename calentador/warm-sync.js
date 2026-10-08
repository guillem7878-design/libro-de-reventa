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
    if (!o) { o = document.createElement('div'); o.id = 'wsGate'; o.style.cssText = 'position:fixed;inset:0;z-index:300;background:#f6f3ec;color:#0f2c36;display:flex;align-items:center;justify-content:center;padding:24px;font:15px/1.5 "Plus Jakarta Sans",system-ui,sans-serif'; document.body.appendChild(o); }
    o.innerHTML = `<div style="max-width:380px;display:flex;flex-direction:column;gap:12px">${html}</div>`; return o;
  }
  const toastEl = () => { let t = document.getElementById('wsToast'); if (!t) { t = document.createElement('div'); t.id = 'wsToast'; t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#0f2c36;color:#fff;padding:11px 18px;border-radius:14px;font-weight:700;font-size:13.5px;z-index:400;max-width:90vw;opacity:0;transition:opacity .2s;pointer-events:none'; document.body.appendChild(t); } return t; };
  let tt; const toast = m => { const t = toastEl(); t.textContent = m; t.style.opacity = 1; clearTimeout(tt); tt = setTimeout(() => t.style.opacity = 0, 2600); };

  /* ---------- Guardado ---------- */
  async function flush() {
    if (!sb || !dirty || saving) return; saving = true; dirty = false;
    const at = iso();
    const { error } = await sb.from('docs').upsert({ coll: 'warmups', id: 'current', data: W.data, updated_at: at });
    saving = false;
    if (error) { dirty = true; toast('No se pudo guardar. Revisa la conexión.'); return; }
    remoteAt = Date.parse(at);
    if (dirty) flush();
  }
  window.W = { data: {}, save() { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 600); }, flush };
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { clearTimeout(timer); flush(); return; }
    if (!sb || dirty) return;
    const { data } = await sb.from('docs').select('updated_at').eq('coll', 'warmups').eq('id', 'current').maybeSingle();
    if (data && Date.parse(data.updated_at) > remoteAt + 1500 && !dirty) location.reload();
  });
  addEventListener('pagehide', () => { clearTimeout(timer); flush(); });

  /* ---------- Arranque ---------- */
  async function boot() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) { overlay('<b style="font-size:20px">Falta conectar la base de datos</b><span>Revisa <code>config.js</code> en la raíz de la app.</span>'); return; }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { overlay('<b style="font-size:20px">Entra primero en la app</b><span>Este panel usa tu cuenta del Libro de Reventa para guardar y sincronizar el calentamiento.</span><a href="../" style="background:#0f2c36;color:#fff;text-align:center;padding:13px;border-radius:14px;font-weight:800;text-decoration:none">Ir a la app</a>'); return; }
    const { data, error } = await sb.from('docs').select('data,updated_at').eq('coll', 'warmups').eq('id', 'current').maybeSingle();
    if (error) { overlay('<b style="font-size:20px">No se pudieron cargar los datos</b><span>' + esc(error.message) + '</span>'); return; }
    if (data) { W.data = data.data || {}; remoteAt = Date.parse(data.updated_at); }
    // la página debe estar entera (el bloque del panel está más abajo que este archivo)
    if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    // ejecuta el panel (su código está en un bloque de texto para no arrancar antes de tener los datos)
    const s = document.createElement('script'); s.textContent = document.getElementById('main-app').textContent; document.body.appendChild(s);
    hookSend();
  }

  /* ---------- Enviar el móvil a la app ---------- */
  const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/;
  const ibanFmt = s => String(s || '').replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  const r1 = n => Math.round(n * 10) / 10;

  function hookSend() {
    const base = window.render; window.render = function () { base(); renderSend(); }; renderSend();
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
    const nextName = 'Móvil ' + (list.length + 1);
    const missing = T.checks.filter(c => !c[1]).map(c => c[0]);
    const o = overlay(`<div style="background:#fff;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 50px -20px rgba(15,44,54,.5)">
      <b style="font-size:19px">Enviar el móvil a la app</b>
      <span class="hint">Se añade a <b>Móviles</b> como <b>Calentada</b>, con el resumen del calentamiento.</span>
      ${missing.length ? `<div style="background:#fff4e5;border-radius:12px;padding:10px 12px;font-size:13px"><b>Aún no cumple todo:</b><ul style="margin:6px 0 0;padding-left:18px">${missing.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <label class="hint">Nombre del móvil<input id="wsName" value="${esc(nextName)}" autocomplete="off" style="display:block;width:100%;margin-top:4px;padding:11px 12px;border-radius:12px;border:1px solid #e6e1d6;font:inherit;color:#0f2c36"></label>
      <label class="hint">IBAN donde cobra (opcional)<input id="wsIban" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ES00 0000 0000 0000 0000 0000" style="display:block;width:100%;margin-top:4px;padding:11px 12px;border-radius:12px;border:1px solid #e6e1d6;font:inherit;color:#0f2c36;text-transform:uppercase"></label>
      <div id="wsErr" style="color:#c4443b;font-size:13px;min-height:16px"></div>
      <div class="row" style="gap:8px"><button class="btn" id="wsOk" style="flex:1">Enviar</button><button class="btn ghost" id="wsCancel">Cancelar</button></div></div>`);
    o.style.background = 'rgba(15,44,54,.55)';
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
    if (!confirm('Se guarda esta cuenta en el historial y el panel empieza de cero para otra. ¿Seguir?')) return;
    const d = W.data, T = trust();
    const hist = (d.vp_history || []).concat([{ name: d.vp_sent && d.vp_sent.name, inicio: d.vp_start, enviado: d.vp_sent && d.vp_sent.at, indice: r1(T.score / 20), valoraciones: D.ratings.length }]);
    W.data = { vp_history: hist }; W.save(); await flush(); location.reload();
  }

  boot();
})();
