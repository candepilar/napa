// Proxy mínimo para Napa Real: reenvía las consultas a titiler-cmr y agrega
// los encabezados CORS que el navegador necesita. Sin dependencias.
// Uso en el VPS:  node proxy.js            (escucha en el puerto 8787)
//                 PORT=9000 DESTINO=https://otro-titiler node proxy.js
// En el visor: Servidor = http://IP-DEL-VPS:8787  (o el dominio con HTTPS)
//
// Alertas por WhatsApp con Green API (opcional). El token queda en el VPS, nunca en la página:
//   GREEN_ID=1101xxxxxx GREEN_TOKEN=xxxx ALERTA_CLAVE=una-clave-larga node proxy.js
//   (GREEN_URL si tu instancia usa otro host, por ejemplo https://7103.api.greenapi.com)
// O con la API oficial de Meta (WhatsApp Business Cloud API), que tiene prioridad si está configurada:
//   WA_TOKEN=token_permanente WA_PHONE_ID=id_del_numero ALERTA_CLAVE=... node proxy.js
//   Meta solo deja mandar texto libre si el socio escribió en las últimas 24 h. Para avisos que inicia
//   la cooperativa hace falta una plantilla aprobada con un parámetro en el cuerpo:
//   WA_TEMPLATE=alerta_napa WA_LANG=es_AR  (el mensaje va en {{1}}, en una sola línea)
// La página manda POST /alerta {telefono, mensaje} con el encabezado X-Clave: ALERTA_CLAVE.
const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT || 8787;
const DESTINO = (process.env.DESTINO || "https://titiler-cmr.opengeos.org").replace(/\/+$/, "");
const GREEN_URL = (process.env.GREEN_URL || "https://api.green-api.com").replace(/\/+$/, "");
const GREEN_ID = process.env.GREEN_ID, GREEN_TOKEN = process.env.GREEN_TOKEN, CLAVE = process.env.ALERTA_CLAVE;
const WA_TOKEN = process.env.WA_TOKEN, WA_PHONE_ID = process.env.WA_PHONE_ID, WA_TEMPLATE = process.env.WA_TEMPLATE, WA_LANG = process.env.WA_LANG || "es_AR";
const WA_URL = (process.env.WA_URL || "https://graph.facebook.com/v21.0").replace(/\/+$/, "");
const META = !!(WA_TOKEN && WA_PHONE_ID), GREEN = !!(GREEN_ID && GREEN_TOKEN);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, X-Clave",
  "Access-Control-Max-Age": "86400",
};

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (req.url === "/alerta" && req.method === "POST") return alerta(req, res);
  if (!req.url.startsWith("/rasterio/")) { res.writeHead(404, CORS); return res.end("Solo /rasterio/…"); }
  const destino = new URL(DESTINO + req.url);
  const fwd = https.request(destino, {
    method: req.method,
    headers: { "Content-Type": req.headers["content-type"] || "application/json", Accept: req.headers.accept || "*/*" },
    timeout: 120000,
  }, (r) => {
    const headers = { ...CORS, "Content-Type": r.headers["content-type"] || "application/octet-stream" };
    res.writeHead(r.statusCode || 502, headers);
    r.pipe(res);
  });
  fwd.on("timeout", () => fwd.destroy(new Error("timeout")));
  fwd.on("error", (e) => { if (!res.headersSent) res.writeHead(502, CORS); res.end("Error del proxy: " + e.message); });
  req.pipe(fwd);
}).listen(PORT, () => console.log(`Proxy Napa en :${PORT} -> ${DESTINO}` + (CLAVE && META ? " · alertas WhatsApp con Meta Cloud API" + (WA_TEMPLATE ? ` (plantilla ${WA_TEMPLATE})` : " (texto libre: solo dentro de las 24 h)") : CLAVE && GREEN ? " · alertas WhatsApp con Green API" : " · alertas WhatsApp apagadas")));

// Envía un WhatsApp con Green API. chatId: 549 + característica + número (sin 0 ni 15) + "@c.us"; grupos: "...@g.us".
function alerta(req, res) {
  const json = (code, o) => { res.writeHead(code, { ...CORS, "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  if (!CLAVE || (!META && !GREEN)) return json(503, { error: "Falta ALERTA_CLAVE y WA_TOKEN/WA_PHONE_ID o GREEN_ID/GREEN_TOKEN en el VPS" });
  if (req.headers["x-clave"] !== CLAVE) return json(401, { error: "Clave incorrecta" });
  let cuerpo = "";
  req.on("data", (c) => { cuerpo += c; if (cuerpo.length > 20000) req.destroy(); });
  req.on("end", () => {
    let d; try { d = JSON.parse(cuerpo); } catch (e) { return json(400, { error: "JSON inválido" }); }
    const destino = String(d.telefono || "").trim();
    const chatId = /@(c|g)\.us$/.test(destino) ? destino : destino.replace(/[^0-9]/g, "") + "@c.us";
    if (!/^[0-9-]{8,}@(c|g)\.us$/.test(chatId) || !d.mensaje) return json(400, { error: "Falta un teléfono válido o el mensaje" });
    const msj = String(d.mensaje).slice(0, 4000), num = chatId.split("@")[0];
    let u, datos, headers = { "Content-Type": "application/json" }, nombre;
    if (META) {
      if (chatId.endsWith("@g.us")) return json(400, { error: "La API de Meta no manda a grupos" });
      nombre = "Meta"; u = new URL(`${WA_URL}/${WA_PHONE_ID}/messages`); headers.Authorization = "Bearer " + WA_TOKEN;
      // Meta no acepta saltos de línea en parámetros de plantilla
      datos = JSON.stringify(WA_TEMPLATE
        ? { messaging_product: "whatsapp", to: num, type: "template", template: { name: WA_TEMPLATE, language: { code: WA_LANG },
            components: [{ type: "body", parameters: [{ type: "text", text: msj.replace(/\*/g, "").replace(/\s*\n\s*/g, " · ").replace(/\s{2,}/g, " ").slice(0, 1000) }] }] } }
        : { messaging_product: "whatsapp", to: num, type: "text", text: { body: msj, preview_url: true } });
    } else {
      nombre = "Green API"; u = new URL(`${GREEN_URL}/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`);
      datos = JSON.stringify({ chatId, message: msj });
    }
    headers["Content-Length"] = Buffer.byteLength(datos);
    const g = (u.protocol === "http:" ? http : https).request(u, { method: "POST", headers, timeout: 30000 },
      (r) => { let t = ""; r.on("data", (c) => (t += c)); r.on("end", () => { const ok = r.statusCode >= 200 && r.statusCode < 300;
        json(ok ? 200 : 502, ok ? { ok: true, via: nombre, respuesta: safe(t) } : { error: `${nombre} respondió ${r.statusCode}`, detalle: safe(t) }); }); });
    g.on("timeout", () => g.destroy(new Error("timeout")));
    g.on("error", (e) => json(502, { error: `No se pudo contactar a ${nombre}: ` + e.message }));
    g.end(datos);
  });
}
function safe(t) { try { return JSON.parse(t); } catch (e) { return String(t).slice(0, 300); } }
