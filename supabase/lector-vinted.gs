/* Libro de Reventa · lector de correos de Vinted (Google Apps Script)
   Va en el Gmail que recibe los reenvíos (no en tu correo personal).
   Cada 5 minutos coge los correos nuevos de Vinted, se los pasa a la app tal cual y los archiva.
   La app es la que los lee y apunta ventas, etiquetas, envíos, cobros, compras y destacados. Gratis. */

const LLAVE = 'PEGA_AQUÍ_LA_LLAVE';                                   // la que te dio Supabase
const SUPABASE_URL = 'https://bffjbpsulxstuabxjpoo.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZmpicHN1bHhzdHVhYnhqcG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0ODU3MDAsImV4cCI6MjEwNzA2MTcwMH0.plySgN2AeQSlkD5T3X4VnhY9hBorxEDr-7bOJBOCu_M';   // clave pública de la app (la misma de config.js)

function leerCorreos() {
  const hecho = GmailApp.getUserLabelByName('App') || GmailApp.createLabel('App');
  const hilos = GmailApp.search('newer_than:14d -label:App (from:vinted OR from:vinted.es OR from:vintedgo OR inpost OR seur OR correos)', 0, 30);
  hilos.forEach(hilo => {
    let ok = true;
    hilo.getMessages().forEach(m => {
      const correo = {
        id: m.getId(),
        subject: m.getSubject(),
        from: m.getFrom(),
        to: [m.getTo(), m.getCc(), m.getHeader('X-Forwarded-For'), m.getHeader('X-Original-To')].filter(Boolean).join(', '),
        date: m.getDate().toISOString(),
        text: m.getPlainBody().slice(0, 20000)
      };
      const r = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/ingest_mail', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
        payload: JSON.stringify({ p_key: LLAVE, p_mail: correo })
      });
      if (r.getResponseCode() >= 300) { ok = false; console.log('Error ' + r.getResponseCode() + ': ' + r.getContentText()); }
    });
    if (ok) { hilo.addLabel(hecho); hilo.moveToArchive(); hilo.markRead(); }
  });
}

/* Ejecuta esta UNA vez: deja programado leerCorreos cada 5 minutos. */
function instalar() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('leerCorreos').timeBased().everyMinutes(5).create();
  leerCorreos();
}
