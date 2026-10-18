/* Libro de Reventa · lector de correos de Vinted (Google Apps Script)
   Va en el Gmail que recibe los reenvíos (no en tu correo personal).
   Cada 5 minutos coge los correos nuevos de Vinted, se los da a leer a Claude (IA), que entiende qué es
   (venta, cobro, etiqueta, envío, compra, destacado, cancelación, devolución, retirada al banco…) y saca
   artículos, tallas, precios, transportista y fechas. Lo manda todo a la app y archiva el correo.
   Si no pones la clave de Claude, funciona igual: la app lee el correo con sus reglas. */

const LLAVE = 'PEGA_AQUÍ_LA_LLAVE';                                   // la que te dio Supabase
const SUPABASE_URL = 'https://bffjbpsulxstuabxjpoo.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZmpicHN1bHhzdHVhYnhqcG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0ODU3MDAsImV4cCI6MjEwNzA2MTcwMH0.plySgN2AeQSlkD5T3X4VnhY9hBorxEDr-7bOJBOCu_M';   // clave pública de la app (la misma de config.js)
// La clave de Claude NO va aquí: se guarda en Configuración del proyecto › Propiedades del script › ANTHROPIC_API_KEY

const MODELO = 'claude-opus-5-5';

const ESQUEMA = {
  type: 'object', additionalProperties: false,
  required: ['type', 'items', 'total', 'carrier', 'deadline', 'tracking', 'counterpart', 'summary'],
  properties: {
    type: { type: 'string', enum: ['venta', 'cobro', 'etiqueta', 'envio', 'compra', 'destacado', 'cancelacion', 'devolucion', 'retiro_banco', 'otro'] },
    items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'size', 'price'], properties: {
      title: { type: 'string' }, size: { anyOf: [{ type: 'string' }, { type: 'null' }] }, price: { anyOf: [{ type: 'number' }, { type: 'null' }] } } } },
    total: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    carrier: { anyOf: [{ type: 'string', enum: ['seur', 'correos', 'inpost', 'vinted_go', 'otro'] }, { type: 'null' }] },
    deadline: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
    tracking: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    counterpart: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    summary: { type: 'string' }
  }
};

const INSTRUCCIONES = `Lees correos de Vinted (y de sus transportistas) que recibe un revendedor en España y devuelves sus datos.
Tipos:
- venta: alguien ha comprado un artículo del usuario ("Has vendido un artículo", "X ha comprado"). Si es un lote, un elemento por artículo.
- cobro: la transacción se ha completado y el dinero pasa al saldo del usuario.
- etiqueta: Vinted le manda la etiqueta de envío para un pedido que ha vendido.
- envio: el transportista confirma que ha recogido o recibido el paquete que el usuario ha dejado (InPost, Vinted Go, SEUR, Correos…).
- compra: el usuario ha comprado algo (recibo de compra, "Se ha recibido tu pago").
- destacado: factura por destacar artículos.
- cancelacion: un pedido vendido se ha cancelado.
- devolucion: el comprador pide devolver o reclama.
- retiro_banco: el usuario ha transferido dinero de su saldo de Vinted a su banco.
- otro: cualquier otra cosa (promociones, mensajes, valoraciones…).
Reglas:
- title: el título del artículo tal cual aparece en el correo.
- size: la talla normalizada: zapatillas solo el número ("Pointure EU37 1/3" → "37 1/3", "39EU" → "39"); ropa "XS","S","M","L","XL","XXL"; si no hay, null.
- price: precio de ese artículo en euros como número (63,70 € → 63.7). total: el importe principal del correo (en compras, el importe pagado; en destacados y retiradas, el total).
- deadline: fecha límite de envío en formato AAAA-MM-DD si aparece.
- counterpart: el usuario comprador o vendedor de Vinted si aparece.
- summary: una frase corta en español con lo importante.
No inventes datos: si algo no aparece, null.`;

function leerConClaude(c) {
  const clave = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!clave) return null;
  const cuerpo = {
    model: MODELO, max_tokens: 8000,
    system: INSTRUCCIONES,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
    fallbacks: 'default',
    messages: [{ role: 'user', content: 'Asunto: ' + c.subject + '\nDe: ' + c.from + '\nFecha: ' + c.date + '\n\n' + c.text }]
  };
  const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify(cuerpo)
  });
  if (r.getResponseCode() !== 200) { console.log('Claude ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300)); return null; }
  const res = JSON.parse(r.getContentText());
  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return null;
  const t = (res.content || []).find(b => b.type === 'text');
  try { return t ? JSON.parse(t.text) : null; } catch (e) { return null; }
}

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
      try { correo.ai = leerConClaude(correo); } catch (e) { console.log('Claude: ' + e); }
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
