// Entiende frases como "mañana 16 dentista", "vie 21:30 cena con Ulises", "24/11 pagar la luz", "- comprar alimento".
// Sin IA: reglas. Devuelve título, fecha, hora de inicio y (si la hay) de fin.
(function (root) {
  'use strict';
  // minúsculas y sin tildes, sin cambiar el largo (para cortar por posición)
  const fold = s => [...s].map(c => c.normalize('NFD')[0]).join('').toLowerCase();
  const dk = d => d.toLocaleDateString('sv-SE');
  const WD = { domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, miercoles: 3, mie: 3, jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6 };
  const hm = (h, m) => String(h).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0');

  function parse(text, now) {
    now = now || new Date();
    let s = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ';
    let task = false;
    const mt = s.match(/^\s*(?:-|\[\s?\])\s+/);
    if (mt) { task = true; s = ' ' + s.slice(mt[0].length); }
    const date = new Date(now); date.setHours(0, 0, 0, 0);
    let hasDate = false, h = null, mi = 0, h2 = null, mi2 = 0, pm = null;
    const cut = re => { const f = fold(s), m = re.exec(f); if (!m) return null; s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length); return m; };

    let m = cut(/\s(?:de|a|por)\s+la\s+(manana|tarde|noche)\b/);
    if (m) pm = m[1] !== 'manana';
    if (cut(/\spasado\s+manana\b/)) { date.setDate(date.getDate() + 2); hasDate = true; }
    else if (cut(/\smanana\b(?!\s+a\s+la)/)) { date.setDate(date.getDate() + 1); hasDate = true; }
    else if (cut(/\shoy\b/)) hasDate = true;
    else if ((m = cut(/\s(?:el\s+|este\s+|proximo\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado|dom|lun|mie|jue|vie|sab)\b/))) {
      date.setDate(date.getDate() + ((WD[m[1]] - date.getDay() + 7) % 7)); hasDate = true;
    } else if ((m = cut(/\s(?:el\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      let y = m[3] ? +m[3] : date.getFullYear(); if (y < 100) y += 2000;
      const d2 = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && d2 < date) d2.setFullYear(d2.getFullYear() + 1);
      if (!isNaN(d2)) { date.setTime(d2.getTime()); hasDate = true; }
    }
    // rango "de 16 a 18", "16 a 18:30", "16-18"
    if ((m = cut(/\s(?:de\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:a|-|hasta)\s*(?:las?\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:hs?|horas)?(?=\s)/))) {
      h = +m[1]; mi = +(m[2] || 0); h2 = +m[3]; mi2 = +(m[4] || 0);
    }
    else if ((m = cut(/\s(?:a\s+las?\s+)?(\d{1,2})[:.](\d{2})\s*(?:hs?|horas)?(?=\s)/))) { h = +m[1]; mi = +m[2]; }
    else if ((m = cut(/\sa\s+las?\s+(\d{1,2})\s*(?:hs?|horas)?(?=\s)/))) h = +m[1];
    else if ((m = cut(/\s(\d{1,2})\s*(?:hs|h|horas)(?=\s)/))) h = +m[1];
    else if (pm != null && (m = cut(/\s(\d{1,2})(?=\s)/))) h = +m[1]; // "3 de la tarde"
    else if (hasDate && (m = cut(/^\s+(\d{1,2})(?=\s)/))) h = +m[1]; // "mañana 16 dentista"
    else if (hasDate && (m = cut(/\s(\d{1,2})\s*$/))) h = +m[1];
    if (h != null && pm === true && h < 12) h += 12;
    if (h2 != null && (pm === true || h2 < h) && h2 < 12) h2 += 12;
    const time = h != null && h < 24 && mi < 60 ? hm(h, mi) : null;
    const end = time && h2 != null && h2 < 24 && mi2 < 60 ? hm(h2, mi2) : null;

    let title = s.replace(/\s+/g, ' ').trim().replace(/^(?:a\s+las?|a|el|la)\s+/i, '').replace(/\s+(?:a\s+las?|a|el)$/i, '').trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return { title, task, hasDate, date: hasDate || time ? dk(date) : null, time, end };
  }

  const api = { parse, fold };
  if (typeof module !== 'undefined') module.exports = api; else root.M_PARSE = api;
})(this);
