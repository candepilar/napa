# Napa Real: cómo correrlo

Visor que mide el agua de cada lote con datos satelitales reales de la NASA, sin cuentas ni procesamiento propio. Las capas y las mediciones se piden a servidores públicos (NASA GIBS, NASA CMR, titiler-cmr, EOX, AWS), así que **se abre en una compu con internet**.

## Demo en 5 minutos

1. **Abrir:** doble clic en `index.html` (Chrome o Firefox), o subirlo al VPS y abrirlo por URL.
2. **Ver la inundación real:** la vista arranca en el norte santafesino. **Buscar pasadas de radar sobre la vista** lista las fechas con datos (violeta: NISAR; azul: Sentinel-1 y mapa de agua OPERA). Al elegir una fecha se ven el radar y, en azul, el agua que detectó la NASA.
3. **Dibujar lotes:** **Dibujar lote**, clic en cada vértice, doble clic para cerrar. Conviene dibujar algunos dentro de la zona inundada y otros afuera, para comparar.
4. **Medir:** **Medir lotes con NASA OPERA**. Para cada pasada de Sentinel-1 entre las fechas elegidas, el visor pide el conteo exacto de píxeles del lote por clase (agua abierta, vegetación inundada, seco) al mapa de agua OPERA DSWx-S1. En segundos cada lote queda como siniestro, revisión o sin siniestro, con su serie y su intervalo de confianza.
5. **Exportar:** **Exportar resultados (CSV)** guarda la medición con el identificador de cada gránulo de la NASA usado: es la evidencia auditable.

## Si la medición falla

- **Mensaje de CORS:** el servidor titiler-cmr no acepta consultas desde el navegador. En el VPS: `node proxy.js` (puerto 8787, sin dependencias) y en el visor, en **Servidor**, poner `http://IP-DEL-VPS:8787`. Si el visor está en una página con HTTPS, el proxy también tiene que estar detrás de HTTPS.
- **El servidor no responde:** `titiler-cmr.opengeos.org` es un servicio comunitario, no de la NASA. Para producción hay que desplegar uno propio (titiler-cmr es código abierto de Development Seed) con una cuenta de Earthdata. Mientras tanto queda el camino de Earth Engine: `napa_pipeline_v03.js` y **cargar CSV de Earth Engine**.
- **Sin pasadas:** DSWx-S1 cubre desde septiembre de 2024, con pasadas cada 6 a 12 días. Ampliá el rango de fechas.
- **La consola del navegador (F12)** muestra qué servidor falló.

## Qué mide y qué no

- Fuente del agua: NASA OPERA DSWx-S1, 30 m, clases de agua abierta y vegetación inundada. Mapea cuerpos de agua de más de 3 ha y 200 m de ancho: un anegamiento chico dentro de un lote puede no aparecer.
- Napa agrega la medición por lote, el intervalo de confianza (binomial con efecto de diseño 3) y los días garantizados y posibles frente al umbral de la póliza.
- NISAR GCOV se muestra como capa, pero es un producto **provisional**: sus valores todavía no están validados.

## Licencias para uso comercial
- Sentinel-2 cloudless de EOX es gratis para uso no comercial; para vender el producto hay que pagar la licencia o usar otro mapa base.
- Los datos de la NASA (GIBS, CMR, OPERA, NISAR) son abiertos. AWS Terrain Tiles es abierto con atribución.

## Demo de presentación (index.html (presentación))

Tres actos, se cambian con las teclas 1, 2 y 3 (barra espaciadora: reproducir).

1. **Lo que nadie vio.** Pantalla partida: a la izquierda el óptico del mismo día (MODIS Terra, NASA), a la derecha el agua que vio el radar (OPERA DSWx-S1). Arrastrá el divisor. ▶ anima la inundación pasada por pasada con el contador de hectáreas. Las flechas cambian de fecha. Buscá antes una fecha con el óptico nublado para arrancar ahí.
2. **Tu campo.** Tocá cualquier punto: sale la constancia de ese campo (1 km², unas 100 ha) con días bajo agua confirmados y posibles y la lista de pasadas con su archivo de la NASA. Se puede imprimir como PDF. El QR abre la misma página en modo celular (`index.html (presentación)#campo`).
3. **Todos los campos.** La zona entera en parcelas de unas 110 ha, coloreadas por estado, con el total de hectáreas confirmadas.

**Antes de presentar (importante):**
- Abrí index.html (presentación) con internet, tocá **Medir la inundación** (1 a 3 minutos) y después **Ajustes → Guardar mediciones**. En el escenario usá **Cargar mediciones guardadas** y no dependés de la red para los actos 1 y 3.
- Para que el QR funcione, la página tiene que estar publicada (por ejemplo en el VPS, junto con proxy.js). Abierta como archivo local, el QR no sirve.
- `index.html (presentación)?prueba` usa datos simulados (con una franja roja que lo dice) solo para ensayar sin red. Nunca lo muestres como real.

**Qué es real y qué no:** el agua, las fechas y los porcentajes salen de NASA OPERA DSWx-S1. La animación muestra para cada lugar el último dato de radar disponible (lo más tenue es un dato de días anteriores). El contador mide a unos 130 m por píxel; la constancia de un campo mide a unos 33 m. Las parcelas del acto 3 son una cuadrícula; con el catastro provincial se usarían los campos reales.
