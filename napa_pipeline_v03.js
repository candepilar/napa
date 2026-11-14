// =====================================================================
// Napa · pipeline v0.3 · agua por lote desde NASA OPERA DSWx-S1
// Google Earth Engine (Code Editor). Usa el mapa de agua validado por la NASA
// (Sentinel-1, 30 m) y le suma lo que Napa aporta: medición por lote,
// intervalo de confianza y días garantizados / posibles.
// Salida CSV: id, fecha, pct, ic_lo, ic_hi, pct_veg, n, version  -> se carga en Napa Real
// =====================================================================
var VERSION = 'napa-dswx-v0.3';

// 1) Lotes: exportados desde Napa Real (napa_lotes.geojson) y subidos como asset.
var lotes = ee.FeatureCollection('projects/TU_PROYECTO/assets/napa_lotes');   // propiedad 'id'
var INI = '2026-03-15', FIN = '2026-06-15';   // inundación del norte santafesino, abril 2026
var BORDE_M = 30, DEFF = 3;                   // borde interior; efecto de diseño (calibrar)

// 2) OPERA DSWx-S1. Banda WTR: 1/2 agua abierta (alta / moderada confianza), 3 vegetación inundada;
//    variantes 32-35 = mismas clases sobre humedales; 250 HAND, 251 sombra/solapamiento, 255 sin dato.
var dswx = ee.ImageCollection('OPERA/DSWX/L3_V1/S1').filterBounds(lotes).filterDate(INI, FIN);
print('Granulos DSWx-S1 en el período:', dswx.size());

function clasificar(img) {
  var w = img.select('WTR_Water_classification');
  var valido = w.lt(250);
  var abierta = w.eq(1).or(w.eq(2)).or(w.eq(32)).or(w.eq(33));
  var veg = w.eq(3).or(w.eq(35));
  var agua = abierta.or(veg);
  return agua.rename('agua').addBands(veg.rename('veg')).updateMask(valido)
    .set('fecha', ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'));
}
// Un mosaico por día (varios granulos MGRS cubren la zona)
var fechas = ee.List(dswx.aggregate_array('system:time_start')).map(function (t) { return ee.Date(t).format('YYYY-MM-dd'); }).distinct();
var diarias = ee.ImageCollection(fechas.map(function (f) {
  var d = ee.Date(f);
  return dswx.filterDate(d, d.advance(1, 'day')).map(clasificar).mosaic().set('fecha', f);
}));

// 3) Por lote: fracción con agua, intervalo de confianza (binomial con efecto de diseño), vegetación inundada
var lotesInt = lotes.map(function (f) { return f.buffer(-BORDE_M); });
var serie = diarias.map(function (im) {
  return im.reduceRegions({ collection: lotesInt, reducer: ee.Reducer.mean().combine(ee.Reducer.count(), '', true), scale: 30 })
    .map(function (f) {
      var n = ee.Number(f.get('agua_count')), p = ee.Number(f.get('agua_mean'));
      var se = p.multiply(ee.Number(1).subtract(p)).divide(n.divide(DEFF).max(1)).sqrt();
      return ee.Feature(null, { id: f.get('id'), fecha: im.get('fecha'),
        pct: p.multiply(100).round(), ic_lo: p.subtract(se.multiply(1.96)).max(0).multiply(100).round(),
        ic_hi: p.add(se.multiply(1.96)).min(1).multiply(100).round(),
        pct_veg: ee.Number(f.get('veg_mean')).multiply(100).round(), n: n, version: VERSION });
    }).filter(ee.Filter.gt('n', 10));   // menos de 10 píxeles válidos: no es una observación del lote
}).flatten();
print('Muestra:', serie.limit(10));
Export.table.toDrive({ collection: serie, description: 'napa_resultados', fileFormat: 'CSV',
  selectors: ['id', 'fecha', 'pct', 'ic_lo', 'ic_hi', 'pct_veg', 'n', 'version'] });

// 4) Control visual
Map.centerObject(lotes, 11);
var pico = diarias.select('agua').max();
Map.addLayer(pico.selfMask(), { palette: ['2f6fd6'] }, 'Agua máxima en el período (DSWx-S1)');
Map.addLayer(diarias.select('veg').max().selfMask(), { palette: ['7b61e8'] }, 'Vegetación inundada', false);
Map.addLayer(lotes.style({ color: 'ffffff', fillColor: '00000000', width: 2 }), {}, 'Lotes');
