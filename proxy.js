// Proxy mínimo para Napa Real: reenvía las consultas a titiler-cmr y agrega
// los encabezados CORS que el navegador necesita. Sin dependencias.
// Uso en el VPS:  node proxy.js            (escucha en el puerto 8787)
//                 PORT=9000 DESTINO=https://otro-titiler node proxy.js
// En el visor: Servidor = http://IP-DEL-VPS:8787  (o el dominio con HTTPS)
const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT || 8787;
const DESTINO = (process.env.DESTINO || "https://titiler-cmr.opengeos.org").replace(/\/+$/, "");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
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
}).listen(PORT, () => console.log(`Proxy Napa en :${PORT} -> ${DESTINO}`));
