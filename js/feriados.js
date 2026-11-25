/* Feriados de Argentina.
   - 2026: calendario oficial incorporado (Jefatura de Gabinete; Res. 164/2025 para los días turísticos).
   - Cualquier año: se actualiza solo desde api.argentinadatos.com (datos de argentina.gob.ar) una vez por semana.
   - Sin conexión y sin datos de ese año: los inamovibles se calculan (incluye Carnaval y Semana Santa). */
'use strict';
const FER = (() => {
  const T = { i: 'Feriado inamovible', t: 'Feriado trasladable', p: 'Día no laborable con fines turísticos', n: 'Día no laborable' };
  const BASE = {
    2026: [['01-01', 'Año Nuevo', 'i'], ['02-16', 'Carnaval', 'i'], ['02-17', 'Carnaval', 'i'], ['03-23', 'Día no laborable turístico', 'p'],
      ['03-24', 'Día de la Memoria por la Verdad y la Justicia', 'i'], ['04-02', 'Día del Veterano y de los Caídos en Malvinas', 'i'], ['04-02', 'Jueves Santo', 'n'],
      ['04-03', 'Viernes Santo', 'i'], ['05-01', 'Día del Trabajador', 'i'], ['05-25', 'Revolución de Mayo', 'i'], ['06-15', 'Paso a la Inmortalidad de Güemes', 't'],
      ['06-20', 'Día de la Bandera (Belgrano)', 'i'], ['07-09', 'Día de la Independencia', 'i'], ['07-10', 'Día no laborable turístico', 'p'],
      ['08-17', 'Paso a la Inmortalidad de San Martín', 't'], ['10-12', 'Día del Respeto a la Diversidad Cultural', 't'], ['11-23', 'Día de la Soberanía Nacional', 't'],
      ['12-07', 'Día no laborable turístico', 'p'], ['12-08', 'Inmaculada Concepción de María', 'i'], ['12-25', 'Navidad', 'i']]
  };
  const pad = n => String(n).padStart(2, '0');
  function easter(y) { // algoritmo de Gauss (gregoriano)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1, 12);
  }
  function fixed(y) {
    const E = easter(y), off = n => { const d = new Date(E); d.setDate(d.getDate() + n); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    return [['01-01', 'Año Nuevo', 'i'], [off(-48), 'Carnaval', 'i'], [off(-47), 'Carnaval', 'i'], ['03-24', 'Día de la Memoria por la Verdad y la Justicia', 'i'],
      ['04-02', 'Día del Veterano y de los Caídos en Malvinas', 'i'], [off(-3), 'Jueves Santo', 'n'], [off(-2), 'Viernes Santo', 'i'], ['05-01', 'Día del Trabajador', 'i'],
      ['05-25', 'Revolución de Mayo', 'i'], ['06-20', 'Día de la Bandera (Belgrano)', 'i'], ['07-09', 'Día de la Independencia', 'i'],
      ['12-08', 'Inmaculada Concepción de María', 'i'], ['12-25', 'Navidad', 'i']];
  }
  const cache = {};
  function load(y) {
    if (cache[y]) return cache[y];
    let L = null;
    try { const c = JSON.parse(localStorage.getItem('myndvs-fer-' + y) || 'null'); if (c && Array.isArray(c.L)) L = c.L; } catch (e) { /* nada */ }
    if (!L) L = BASE[y] || fixed(y);
    const map = {};
    for (const [md, name, tp] of L) { const k = `${y}-${md}`; (map[k] = map[k] || []).push({ name, type: T[tp] || T.i, tp }); }
    return (cache[y] = map);
  }
  async function refresh(y) {
    try {
      const c = JSON.parse(localStorage.getItem('myndvs-fer-' + y) || 'null');
      if (c && Date.now() - c.at < 7 * 864e5) return false;
    } catch (e) { /* nada */ }
    try {
      const r = await fetch(`https://api.argentinadatos.com/v1/feriados/${y}`);
      if (!r.ok) return false;
      const j = await r.json(); if (!Array.isArray(j) || !j.length) return false;
      const L = j.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && x.fecha.startsWith(String(y))).map(x => [x.fecha.slice(5), String(x.nombre || 'Feriado').slice(0, 80), x.tipo === 'trasladable' ? 't' : x.tipo === 'puente' ? 'p' : 'i']);
      if (!L.length) return false;
      // la API no trae Jueves Santo (no laborable): se suma
      if (!L.some(x => /jueves santo/i.test(x[1]))) { const f = fixed(y).find(x => x[1] === 'Jueves Santo'); if (f) L.push(f); }
      localStorage.setItem('myndvs-fer-' + y, JSON.stringify({ at: Date.now(), L }));
      delete cache[y]; return true;
    } catch (e) { return false; }
  }
  const on = k => load(+k.slice(0, 4))[k] || [];
  return { on, refresh, T };
})();
const ferOn = () => cfg.feriados !== false;
// eventos "de mentira" para los feriados (no se guardan ni se sincronizan)
function ferEvents(k) {
  if (!ferOn()) return [];
  const L = FER.on(k); if (!L.length) return [];
  // si ya tenés el calendario de feriados de Google prendido, no se duplica
  const dup = events().some(e => e.date === k && !e.start && /feriad|holiday/i.test(calName(e.cal)));
  return dup ? [] : L.map((f, i) => ({ id: `fer-${k}-${i}`, k: 'ev', hol: true, ro: true, title: f.name, type: f.type, tp: f.tp, date: k, start: null, end: null, cal: '_fer' }));
}
async function ferRefresh() {
  const y = new Date().getFullYear();
  const a = await FER.refresh(y), b = await FER.refresh(y + 1);
  if ((a || b) && $('#sheet').hidden) render();
}
