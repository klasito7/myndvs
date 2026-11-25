# Myndvs: reglas del repo

- App sin frameworks ni build: HTML + CSS + JS planos, servidos tal cual por GitHub Pages (`klasito7.github.io/myndvs`).
- **Tutorial siempre al día**: cada vez que se agrega o cambia una función visible, actualizar `js/tour.js`:
  - pasos nuevos con `v` = versión nueva, y subir `TOUR_V` a ese número (así la app ofrece "Solo las novedades");
  - si cambia algo que ya tenía paso, corregir su texto (sin cambiar su `v`);
  - mantener el paso final (`end: true`) al final.
- Al tocar archivos que cachea el modo sin señal, subir la versión `V` en `sw.js` y sumar los archivos nuevos a `SHELL`.
- Actualizar el `README.md` con cada función nueva.
- Textos en castellano rioplatense, cortos y claros.
- Comparte origen con Lifebgood (`../Lifebgood/`): no usar claves de `localStorage` que empiecen con `lifebgood`.
