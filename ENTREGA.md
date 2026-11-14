# Napa · texto para la entrega de Space Apps 2026

Desafío: **Dancing with the SARs**

## Nombre
Napa: el agua de cada lote, vista por el radar de la NASA

## Resumen (para el formulario)
Cuando llueve hay nubes, y justo en ese momento los satélites ópticos no ven nada. Por eso nadie sabe con datos qué parte de su campo se inunda, con qué frecuencia y por cuántos días. Napa usa dos radares que atraviesan las nubes para responderlo, lote por lote.

Se dibuja un lote o se sube el KML del campo. Napa reúne todas las pasadas del mapa de agua NASA OPERA DSWx-S1 (derivado de Sentinel-1, 30 m, cada 6 a 12 días desde septiembre de 2024) y arma en uno o dos minutos un informe hídrico:

- **Mapa de ambientes**: para cada píxel de 30 m, en qué fracción de las pasadas tuvo agua. Separa lo que está casi siempre bajo agua, lo que se anega con frecuencia y lo que solo se inunda en eventos fuertes.
- **Serie histórica**: % del lote con agua en cada pasada, con intervalo de confianza de 95%.
- **Evento**: días bajo agua confirmados y posibles, como respaldo técnico para seguros y emergencias agropecuarias.
- **Segunda mirada con NISAR**: el radar de banda L de la NASA atraviesa el cultivo y muestra el agua escondida debajo de las plantas, justo donde la banda C de Sentinel-1 puede fallar. Napa cruza cada pasada de NISAR con la de Sentinel-1 más cercana.
- **Cartera**: con un KML de muchos lotes (los de los socios de una cooperativa, por ejemplo), Napa los mide todos y resume cuántas hectáreas son bajos frecuentes y cuántas estuvieron bajo agua en un evento, con un ranking por lote.
- **Exportación**: CSV por píxel para software de siembra variable, GeoJSON y PDF.

Funciona en el navegador, sin cuentas ni procesamiento propio: todo se pide a servicios públicos de la NASA (CMR, OPERA, GIBS). Lo probamos con [EMPRESA] sobre lotes que conocen: [RESULTADO, por ejemplo "los bajos que marcó Napa coincidieron con los que ellos conocen en 3 de 3 lotes"].

## Datos de la NASA usados
- OPERA DSWx-S1 (Dynamic Surface Water Extent from Sentinel-1), vía NASA CMR y titiler-cmr.
- NISAR L2 GCOV (provisional), vía NASA GIBS y NASA CMR.
- MODIS Terra Corrected Reflectance, vía NASA GIBS (comparación óptica en la demo).
- Catálogo NASA CMR (búsqueda de pasadas y trazabilidad de cada archivo usado).

## Guion del video (30 segundos)
1. (0-5 s) Foto satelital común del norte de Santa Fe en abril de 2026: todo nubes. "Cuando llueve, los satélites no ven el campo."
2. (5-12 s) Se arrastra el divisor y aparece el agua que vio el radar. "El radar de la NASA ve a través de las nubes."
3. (12-22 s) Se sube el KML de un lote real y aparece el mapa de ambientes. "Napa junta dos años de radar y muestra qué parte de cada lote se inunda, y cada cuánto."
4. (22-27 s) Se toca una fecha de NISAR. "Y con NISAR, el agua escondida debajo del cultivo."
5. (27-30 s) Frase de la empresa o logo. "Probado con [EMPRESA]. Napa."

## Diapositivas (si piden presentación)
1. **El problema**: con lluvia hay nubes, y sin datos no se sabe qué parte del lote se inunda.
2. **El dato**: Sentinel-1 (OPERA DSWx-S1) cada 6 a 12 días desde 2024, y NISAR banda L, que ve debajo del cultivo.
3. **Demo**: un lote real, su mapa de ambientes y su serie.
4. **Precisión**: intervalos de 95%, mínimo de pasadas por píxel, trazabilidad a cada archivo de la NASA, límites declarados.
5. **Validación**: lo que dijo [EMPRESA].
6. **Quién lo usa**: cooperativas y acopios (estado de los campos de todos sus socios), agrónomos (siembra variable), productores, aseguradoras y gobiernos (emergencia agropecuaria).
7. **Lo que sigue**: sumar NISAR al cálculo cuando salga de la etapa provisional, catastro provincial y alertas por lote.

## Preguntas que puede hacer el jurado
- **¿Por qué no usan solo NISAR?** Sus datos son provisionales y la historia es corta. Sentinel-1 da dos años de pasadas validadas, y NISAR suma lo que la banda C no ve.
- **¿Qué tan preciso es?** Píxeles de 30 m, solo se clasifican con 10 pasadas o más, y cada número tiene su intervalo de 95%. Un charco de menos de 30 m no se ve.
- **¿Qué es nuevo?** Los mapas de agua ya existen. Napa los convierte en una respuesta por lote (ambientes, días, evidencia) que un productor o un agrónomo puede usar sin saber de radar.
