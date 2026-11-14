// Proxy mínimo para Napa Real: reenvía las consultas a titiler-cmr y agrega
// los encabezados CORS que el navegador necesita. Sin dependencias.
// Uso en el VPS:  node proxy.js            (escucha en el puerto 8787)
//                 PORT=9000 DESTINO=https://otro-titiler node proxy.js
// En el visor: Servidor = http://IP-DEL-VPS:8787  (o el dominio con HTTPS)
//
// Alertas por WhatsApp con Green API (opcional). El token queda en el VPS, nunca en la página:
//   GREEN_ID=1101xxxxxx GREEN_TOKEN=xxxx ALERTA_CLAVE=una-clave-larga node proxy.js
//   (GREEN_URL si tu instancia usa otro host, por ejemplo https://7103.api.greenapi.com)
// La página manda POST /alerta {telefono, mensaje} con el encabezado X-Clave: ALERTA_CLAVE.
const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT || 8787;
const DESTINO = (process.env.DESTINO || "https://titiler-cmr.opengeos.org").replace(/\/+$/, "");
const GREEN_URL = (process.env.GREEN_URL || "https://api.green-api.com").replace(/\/+$/, "");
const GREEN_ID = process.env.GREEN_ID, GREEN_TOKEN = process.env.GREEN_TOKEN, CLAVE = process.env.ALERTA_CLAVE;
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
}).listen(PORT, () => console.log(`Proxy Napa en :${PORT} -> ${DESTINO}` + (GREEN_ID && GREEN_TOKEN && CLAVE ? " · alertas WhatsApp activas" : " · alertas WhatsApp apagadas")));

// Envía un WhatsApp con Green API. chatId: 549 + característica + número (sin 0 ni 15) + "@c.us"; grupos: "...@g.us".
function alerta(req, res) {
  const json = (code, o) => { res.writeHead(code, { ...CORS, "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  if (!GREEN_ID || !GREEN_TOKEN || !CLAVE) return json(503, { error: "Faltan GREEN_ID, GREEN_TOKEN o ALERTA_CLAVE en el VPS" });
  if (req.headers["x-clave"] !== CLAVE) return json(401, { error: "Clave incorrecta" });
  let cuerpo = "";
  req.on("data", (c) => { cuerpo += c; if (cuerpo.length > 20000) req.destroy(); });
  req.on("end", () => {
    let d; try { d = JSON.parse(cuerpo); } catch (e) { return json(400, { error: "JSON inválido" }); }
    const destino = String(d.telefono || "").trim();
    const chatId = /@(c|g)\.us$/.test(destino) ? destino : destino.replace(/[^0-9]/g, "") + "@c.us";
    if (!/^[0-9-]{8,}@(c|g)\.us$/.test(chatId) || !d.mensaje) return json(400, { error: "Falta un teléfono válido o el mensaje" });
    const datos = JSON.stringify({ chatId, message: String(d.mensaje).slice(0, 4000) });
    const u = new URL(`${GREEN_URL}/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`);
    const g = (u.protocol === "http:" ? http : https).request(u, {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(datos) }, timeout: 30000,
    }, (r) => { let t = ""; r.on("data", (c) => (t += c)); r.on("end", () => json(r.statusCode === 200 ? 200 : 502, r.statusCode === 200 ? { ok: true, respuesta: safe(t) } : { error: "Green API respondió " + r.statusCode, detalle: safe(t) })); });
    g.on("timeout", () => g.destroy(new Error("timeout")));
    g.on("error", (e) => json(502, { error: "No se pudo contactar a Green API: " + e.message }));
    g.end(datos);
  });
}
function safe(t) { try { return JSON.parse(t); } catch (e) { return String(t).slice(0, 300); } }
