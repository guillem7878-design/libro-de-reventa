/* Recordatorio diario del calentamiento: a la hora elegida avisa de lo que toca hoy en cada pestaña.
   Lo usan la app y el panel de calentar. Funciona con cualquiera de los dos abierto o en segundo plano;
   con todo cerrado haría falta un servidor de avisos (Web Push), que no está montado. */
(() => {
  'use strict';
  const BASE = new URL('./', document.currentScript ? document.currentScript.src : location.href).href;
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  };
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const mins = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const nowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

  // día del plan de una pestaña: días desde el alta menos los días saltados antes de hoy
  function dayOf(slot, today) {
    if (!slot || !slot.vp_start) return null;
    const a = new Date(slot.vp_start + 'T00:00:00'), t = new Date(today + 'T00:00:00');
    const age = Math.max(0, Math.round((t - a) / 864e5));
    return age + 1 - (slot.vp_skip || []).filter(d => d >= slot.vp_start && d < today).length;
  }
  // pestañas con tarea pendiente hoy (empezadas, sin enviar, sin saltar hoy y con el día sin marcar)
  function pending(root) {
    const t = ymd(new Date()), out = [];
    for (const n of ['1', '2', '3']) {
      const s = ((root || {}).slots || {})[n];
      if (!s || !s.vp_start || s.vp_sent || (s.vp_skip || []).includes(t)) continue;
      const d = dayOf(s, t); if (!d || d > 31 || (s.vp_days || {})[d]) continue;
      out.push({ n, name: ((root || {}).names || {})[n] || 'Cuenta ' + n, day: d });
    }
    return out;
  }
  const time = () => { const v = LS.get('wsRemind'); return /^\d{2}:\d{2}$/.test(v || '') ? v : null; };
  function set(v) {
    LS.set('wsRemind', v || null);
    // si la hora de hoy ya ha pasado, empieza mañana (no avisa nada más activarlo)
    LS.set('wsRemindDone', v && nowMins() >= mins(v) ? ymd(new Date()) : null);
  }
  async function show(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const o = { body, icon: BASE + 'icons/icon-192.png', badge: BASE + 'icons/icon-192.png', tag: 'calentar', data: { url: BASE + 'calentador/' } };
    try { const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration(); if (reg) await reg.showNotification(title, o); else new Notification(title, o); } catch (e) {}
  }
  let busy = false;
  async function check(getRoot) {
    const t = time(); if (!t || busy || !('Notification' in window) || Notification.permission !== 'granted') return;
    const today = ymd(new Date()); if (LS.get('wsRemindDone') === today || nowMins() < mins(t)) return;
    busy = true;
    try {
      const root = await getRoot(); if (!root) return;
      if (LS.get('wsRemindDone') === today) return; // otra pestaña ya avisó
      LS.set('wsRemindDone', today);
      const p = pending(root); if (!p.length) return;
      await show(p.length === 1 ? 'Calentar: toca el día ' + p[0].day : 'Calentar: ' + p.length + ' cuentas con tarea hoy', p.map(x => x.name + ' · día ' + x.day).join('\n'));
    } catch (e) {} finally { busy = false; }
  }
  function start(getRoot) {
    check(getRoot); setInterval(() => check(getRoot), 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(getRoot); });
  }
  window.WarmRemind = { pending, dayOf, time, set, show, start };
})();
