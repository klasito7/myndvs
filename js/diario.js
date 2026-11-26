/* Diario: una entrada de texto por día. El título es el día en que se escribe.
   Incluye un importador que entiende texto pegado, .txt/.md con fechas como títulos, JSON (Day One, Journey y genéricos) y CSV. */
'use strict';
const DIA = (() => {
  const fold = s => P.fold(s);
  const MES = { enero: 1, ene: 1, january: 1, jan: 1, febrero: 2, feb: 2, february: 2, marzo: 3, mar: 3, march: 3, abril: 4, abr: 4, april: 4, apr: 4, mayo: 5, may: 5,
    junio: 6, jun: 6, june: 6, julio: 7, jul: 7, july: 7, agosto: 8, ago: 8, august: 8, aug: 8, septiembre: 9, setiembre: 9, sep: 9, set: 9, sept: 9, september: 9,
    octubre: 10, oct: 10, october: 10, noviembre: 11, nov: 11, november: 11, diciembre: 12, dic: 12, december: 12, dec: 12 };
  const MRE = Object.keys(MES).sort((a, b) => b.length - a.length).join('|');
  const WRE = '(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo|lun|mar|mie|jue|vie|sab|dom|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\\.?,?\\s+';
  const pad = n => String(n).padStart(2, '0');
  const valid = (y, m, d) => { const t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };
  const title = k => { const s = new Date(k + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1).replace(/,/, ''); };

  // ¿esta línea es un título de fecha? → { y?, m, d, rest }
  function header(line) {
    const raw = line.replace(/^[\s#>*_\-–—=]+|[\s*_:=]+$/g, '');
    if (!raw || raw.length > 90) return null;
    const f = fold(raw);
    const wm = f.match(new RegExp('^' + WRE)); let off = wm ? wm[0].length : 0;
    const s = f.slice(off);
    let m, y = null, mo, d, len;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = s.match(new RegExp(`^(\\d{1,2})(?:\\s+de)?\\s+(${MRE})\\.?(?:,?\\s+(?:de(?:l)?\\s+)?(\\d{4}))?(?![a-z])`)))) { d = +m[1]; mo = MES[m[2]]; if (m[3]) y = +m[3]; }
    else if ((m = s.match(new RegExp(`^(${MRE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?!\\d)`)))) { mo = MES[m[1]]; d = +m[2]; if (m[3]) y = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?![\d/])/))) { d = +m[1]; mo = +m[2]; if (m[3]) { y = +m[3]; if (y < 100) y += 2000; } else if (!wm && raw.length > 12) return null; }
    else return null;
    len = m[0].length;
    if (!mo || mo > 12 || !d || d > 31) return null;
    // lo que sigue a la fecha en la misma línea ("— día raro") se guarda como primera línea
    const rest = raw.slice(off + len).replace(/^[\s,.\-–—:|]+/, '').replace(/^\d{1,2}[:.]\d{2}(\s*(hs|h|am|pm))?\s*/i, '').replace(/^[\s,.\-–—:|]+/, '').trim();
    if (!y && !wm && rest) return null; // "3 de mayo fui a la playa" es texto, no un título
    return { y, m: mo, d, rest };
  }
  function finishYear(h, lastY) {
    let y = h.y || lastY;
    if (!y) { y = new Date().getFullYear(); if (`${y}-${pad(h.m)}-${pad(h.d)}` > today()) y--; }
    return valid(y, h.m, h.d) ? `${y}-${pad(h.m)}-${pad(h.d)}` : null;
  }
  // texto con fechas como títulos → [{date, text}]
  function parseText(txt, fallbackDate) {
    const lines = String(txt).replace(/\r\n?/g, '\n').split('\n'), out = []; let cur = null, lastY = null, lost = 0;
    for (const L of lines) {
      const h = header(L);
      const date = h ? finishYear(h, lastY) : null;
      if (date) { lastY = +date.slice(0, 4); cur = { date, lines: h.rest ? [h.rest] : [] }; out.push(cur); continue; }
      if (cur) cur.lines.push(L); else if (L.trim()) { if (fallbackDate) { cur = { date: fallbackDate, lines: [L] }; out.push(cur); } else lost++; }
    }
    return { entries: out.map(e => ({ date: e.date, text: e.lines.join('\n').replace(/^\s*\n|\n\s*$/g, '').trim() })).filter(e => e.text), lost };
  }
  const toDate = v => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') { const t = new Date(v < 1e11 ? v * 1000 : v); return isNaN(t) ? null : dk(t); }
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { const t = new Date(s); return isNaN(t) ? s.slice(0, 10) : dk(t); }
    if (/^\d{10,13}$/.test(s)) return toDate(+s);
    const h = header(s); if (h) return finishYear(h, null);
    const t = new Date(s); return isNaN(t) ? null : dk(t);
  };
  const DKEYS = ['date', 'fecha', 'creationDate', 'creation_date', 'created', 'createdAt', 'created_at', 'date_journal', 'dateJournal', 'day', 'dia', 'día', 'timestamp', 'time', 'modifiedDate'];
  const TKEYS = ['text', 'texto', 'body', 'content', 'contenido', 'entry', 'entrada', 'note', 'nota', 'markdown', 'richText'];
  const pick = (o, ks) => { for (const k of ks) if (o[k] != null && o[k] !== '') return o[k]; const low = Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v])); for (const k of ks) if (low[k.toLowerCase()] != null) return low[k.toLowerCase()]; return null; };
  const strip = s => String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  function parseJSON(data) {
    let arr = Array.isArray(data) ? data : data.entries || data.journal || data.diary || data.diario || data.items || data.notes || data.data || null;
    if (!arr && typeof data === 'object') arr = [data];
    const out = [];
    for (const o of arr || []) {
      if (!o || typeof o !== 'object') continue;
      const date = toDate(pick(o, DKEYS)); let t = pick(o, TKEYS);
      if (t && typeof t === 'object') t = JSON.stringify(t);
      const ttl = o.title || o.titulo || o.título;
      const text = strip([ttl && !header(String(ttl)) ? ttl : '', t || ''].filter(Boolean).join('\n')).trim();
      if (date && text) out.push({ date, text });
    }
    return out;
  }
  function parseCSV(txt) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"' && txt[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    if (rows.length < 2) return [];
    const hd = rows[0].map(h => fold(h.trim()));
    const di = hd.findIndex(h => DKEYS.map(fold).includes(h)), ti = hd.findIndex(h => TKEYS.map(fold).includes(h));
    if (di < 0 || ti < 0) return [];
    return rows.slice(1).map(r => ({ date: toDate(r[di]), text: (r[ti] || '').trim() })).filter(e => e.date && e.text);
  }
  // cualquier cosa → entradas, juntando las del mismo día
  function parseAny(content, name) {
    const nm = name || '', fromName = (() => { const h = header(nm.replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ')); return h ? finishYear(h, null) : null; })();
    let r = { entries: [], lost: 0 }, s = String(content).trim();
    if (/\.json$/i.test(nm) || /^[[{]/.test(s)) { try { r.entries = parseJSON(JSON.parse(s)); } catch (e) { r = parseText(s, fromName); } }
    else if (/\.csv$/i.test(nm)) r.entries = parseCSV(s);
    else r = parseText(s, fromName);
    return r;
  }
  function merge(list) {
    const by = new Map();
    for (const e of list) by.set(e.date, by.has(e.date) ? by.get(e.date) + '\n\n' + e.text : e.text);
    return [...by.entries()].map(([date, text]) => ({ date, text })).sort((a, b) => a.date.localeCompare(b.date));
  }
  return { header, parseText, parseAny, merge, title, toDate };
})();

/* ---------- datos ---------- */
const diaryId = k => 'd-' + k;
const diary = () => [...ITEMS.values()].filter(x => x.k === 'diary' && !x.gone && (x.text || '').trim());
const words = s => ((s || '').match(/\S+/g) || []).length;
// un día queda "abierto" hasta que lo cerrás a mano; los de antes de esta función cuentan como cerrados
const isClosed = e => e.closed === true || (e.closed === undefined && e.date < today());
const openPast = () => diary().filter(e => e.date < today() && !isClosed(e)).sort((a, b) => a.date.localeCompare(b.date));
// días sin escribir: desde tu primer día (máx. 60 días para atrás) hasta ayer
function missingDays() {
  const L = diary(); if (!L.length) return [];
  const first = L.reduce((m, e) => e.date < m ? e.date : m, today()), from = first > addDays(today(), -60) ? first : addDays(today(), -60), out = [];
  for (let k = from; k < today(); k = addDays(k, 1)) { const e = ITEMS.get(diaryId(k)); if (!e || e.gone || !(e.text || '').trim()) out.push(k); }
  return out.reverse();
}
async function diarySet(date, text, opt) {
  const id = diaryId(date), old = ITEMS.get(id);
  const it = old || { id, k: 'diary', date, c: Date.now(), closed: false };
  if (old && old.gone) { it.closed = false; delete it.closedAt; }
  it.text = text; it.gone = !text.trim(); it.date = date;
  if (opt && opt.closed !== undefined) { it.closed = opt.closed; it.closedAt = opt.closed ? Date.now() : 0; }
  await save(it, Object.assign({ quiet: true }, opt && opt.render ? { quiet: false } : {}));
  return it;
}
async function diaryClose(date, text) {
  if (!(text || '').trim()) { toast('Escribí algo antes de cerrar el día'); return false; }
  await diarySet(date, text, { closed: true });
  toast(`✓ ${DIA.title(date).split(' de ')[0]} cerrado`, { label: 'Reabrir', fn: async () => { await diarySet(date, ITEMS.get(diaryId(date)).text, { closed: false }); render(); } });
  return true;
}

/* ---------- vista ---------- */
let diaryImport = null, diaryMonth = '', diaryShowMissing = false;
function vDiario() {
  const t = today(), pend = openPast(), page = pend[0] ? pend[0].date : t, cur = ITEMS.get(diaryId(page));
  const all = diary().filter(x => x.date !== page).sort((a, b) => b.date.localeCompare(a.date));
  const months = {}; all.forEach(e => { const m = e.date.slice(0, 7); (months[m] = months[m] || []).push(e); });
  const has = k => { const e = ITEMS.get(diaryId(k)); return e && !e.gone && (e.text || '').trim(); };
  const streak = (() => { let n = 0, k = has(t) ? t : addDays(t, -1); while (has(k)) { n++; k = addDays(k, -1); } return n; })();
  const miss = missingDays();
  const mName = m => cap1(new Date(m + '-15T12:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(' de ', ' '));
  const wasClosed = cur && !cur.gone && isClosed(cur);
  return `<div class="dhead"><div class="dtit"><h1 class="day">Diario</h1><span class="mute small">${diary().length} días${streak > 1 ? ` · racha de ${streak} 🔥` : ''}</span></div><span class="grow"></span><button class="chip" data-a="dnew">+ Otro día</button><button class="chip" data-a="dimp">Importar</button></div>
  ${page !== t ? `<div class="dpend">📌 Este día quedó abierto. Terminalo y cerralo para seguir con ${pend.length > 1 ? `los otros ${pend.length - 1} y después con hoy` : 'hoy'}.</div>` : ''}
  <article class="dtoday${wasClosed ? ' closed' : ''}"><h2 class="dt">${DIA.title(page)}${page === t ? ' <small class="dtag">hoy</small>' : ''}</h2>
    ${wasClosed ? `<p class="dclosed">✓ Cerraste este día. Podés seguir editándolo; los cambios se guardan solos.</p>` : ''}
    <textarea id="dTx" data-date="${page}" placeholder="¿Cómo fue tu día? Lo que pasó, lo que sentiste, lo que no querés olvidar…">${esc(cur && !cur.gone ? cur.text : '')}</textarea>
    <div class="dfoot"><span class="mute small" id="dInfo">${cur && cur.text ? words(cur.text) + ' palabras · guardado' : 'Se guarda solo mientras escribís.'}</span>
      ${wasClosed ? '' : `<button class="primary sm" data-a="dclose" data-k="${page}">Guardar y cerrar el día</button>`}</div></article>
  ${miss.length ? `<section class="dmiss"><h2>Te ${miss.length === 1 ? 'falta un día' : `faltan ${miss.length} días`} <em>${miss.length}</em></h2><div class="dchips">${(diaryShowMissing ? miss : miss.slice(0, 6)).map(k => `<button class="chip" data-a="dadd" data-k="${k}">+ ${cap1(new Date(k + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''))}</button>`).join('')}${miss.length > 6 && !diaryShowMissing ? `<button class="chip" data-a="dmore">Ver los ${miss.length}</button>` : ''}</div></section>` : ''}
  ${pend.length > 1 ? `<section><h2>Sin cerrar <em>${pend.length - 1}</em></h2>${pend.slice(1).map(e => `<button class="dent open" data-a="dopen" data-id="${e.id}"><b>${DIA.title(e.date)} <small class="dtag">abierto</small></b><span>${esc((e.text || '').replace(/\s+/g, ' ').slice(0, 160))}</span></button>`).join('')}</section>` : ''}
  ${Object.keys(months).length ? Object.entries(months).map(([m, L]) => `<section><h2>${mName(m)} <em>${L.length}</em></h2>${L.filter(e => !(e.date < t && !isClosed(e))).map(e => `<button class="dent${isClosed(e) ? '' : ' open'}" data-a="dopen" data-id="${e.id}"><b>${DIA.title(e.date)}${isClosed(e) ? '' : ' <small class="dtag">abierto</small>'}</b><span>${esc((e.text || '').replace(/\s+/g, ' ').slice(0, 160))}</span></button>`).join('')}</section>`).join('')
    : '<p class="empty">Los días anteriores van a aparecer acá. Si tenés un diario en otra app, tocá <b>Importar</b>.</p>'}`;
}
let dT = null;
/* borrador al instante en cada tecla: si cerrás la app en medio de una frase, al volver se recupera.
   Con contraseña no se usa (quedaría sin cifrar): ahí se guarda cada 0,3 s. */
const DRAFT = 'myndvs-draft-';
function draft(date, text) { if (cfg.lock) return; try { localStorage.setItem(DRAFT + date, JSON.stringify({ text, t: Date.now() })); } catch (e) { /* nada */ } }
function draftDone(date, text) { try { const d = JSON.parse(localStorage.getItem(DRAFT + date) || 'null'); if (d && d.text === text) localStorage.removeItem(DRAFT + date); } catch (e) { /* nada */ } }
async function diaryRestoreDrafts() {
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(DRAFT)) continue;
    const date = k.slice(DRAFT.length);
    try {
      const d = JSON.parse(localStorage.getItem(k)), e = ITEMS.get(diaryId(date));
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && d && typeof d.text === 'string' && (!e || (e.u || 0) < d.t) && (!e || e.text !== d.text)) await diarySet(date, d.text);
    } catch (x) { /* nada */ }
    localStorage.removeItem(k);
  }
}
function flushDiary() { const tx = $('#dTx'); if (dT && tx) { clearTimeout(dT); dT = null; return diarySet(tx.dataset.date, tx.value); } }
function bindDiary() {
  const tx = $('#dTx'); if (!tx) return;
  const grow = () => { tx.style.height = 'auto'; tx.style.height = Math.max(200, tx.scrollHeight) + 'px'; };
  grow();
  tx.oninput = () => {
    grow(); clearTimeout(dT); $('#dInfo').textContent = words(tx.value) + ' palabras · guardando…'; draft(tx.dataset.date, tx.value);
    dT = setTimeout(async () => { dT = null; const v = tx.value; await diarySet(tx.dataset.date, v); draftDone(tx.dataset.date, v); const i = $('#dInfo'); if (i) i.textContent = words(v) + ' palabras · guardado ✓'; }, cfg.lock ? 300 : 600);
  };
  tx.onblur = flushDiary;
}
// que no se pierda nada si cerrás la app en medio de una frase
document.addEventListener('visibilitychange', () => { if (document.hidden) { flushDiary(); flushDiaryEd(); } });
window.addEventListener('pagehide', () => { flushDiary(); flushDiaryEd(); });

let dEdT = null, dEdCur = null;
function flushDiaryEd() { if (dEdT && dEdCur) { clearTimeout(dEdT); dEdT = null; const ed = $('#dEd'); if (ed) return diarySet(dEdCur, ed.value); } }
function diaryEditor(e) {
  const closed = isClosed(e) && !e.gone && (e.text || '').trim();
  dEdCur = e.date;
  openSheet(`<div class="form dsheet">
    <div class="edbar"><button class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><span class="grow"></span><button class="ib" data-a="ddel" data-id="${e.id}" aria-label="Borrar el día">${ICO.trash}</button></div>
    <h2 class="dt">${DIA.title(e.date)}${closed ? '' : ' <small class="dtag">abierto</small>'}</h2>
    <label class="mute small">Fecha <input type="date" id="dDate" value="${e.date}" max="${today()}"></label>
    <textarea id="dEd" placeholder="¿Qué pasó ese día?">${esc(e.text || '')}</textarea>
    <div class="dfoot"><span class="mute small" id="dEdInfo">${words(e.text)} palabras · se guarda solo</span>
      ${closed ? '<button class="ghost sm" data-a="dreopen">Reabrir</button>' : `<button class="primary sm" data-a="dcloseEd">Guardar y cerrar el día</button>`}</div></div>`, async () => {
    const v = $('#dEd').value, nd = $('#dDate').value || e.date;
    clearTimeout(dEdT); dEdT = null;
    if (nd !== e.date) {
      const other = ITEMS.get(diaryId(nd));
      const joined = other && !other.gone && (other.text || '').trim() ? other.text + '\n\n' + v : v;
      const wasClosed = isClosed(e);
      await diarySet(e.date, ''); await diarySet(nd, joined, { closed: wasClosed });
    } else await diarySet(e.date, v);
    dEdCur = null;
  }, 'full');
  const ed = $('#dEd'); autoGrow(ed);
  ed.addEventListener('input', () => { clearTimeout(dEdT); $('#dEdInfo').textContent = words(ed.value) + ' palabras · guardando…'; draft(e.date, ed.value); dEdT = setTimeout(async () => { dEdT = null; const v = ed.value; await diarySet(e.date, v); draftDone(e.date, v); const i = $('#dEdInfo'); if (i) i.textContent = words(ed.value) + ' palabras · guardado ✓'; }, 600); });
  if (!(e.text || '').trim()) setTimeout(() => ed.focus(), 200);
}

/* ---------- importar ---------- */
function importUI() {
  diaryImport = null;
  openSheet(`<div class="form">
    <div class="edbar"><button class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><h2>Importar días</h2></div>
    <p class="mute">Pegá el texto de tu otra app o elegí los archivos que exportaste (.txt, .md, .json o .csv; podés elegir varios). Cada día tiene que arrancar con su fecha, por ejemplo <b>Lunes 3 de noviembre de 2026</b>, <b>03/11/2026</b> o <b>2026-11-03</b>. Si es un archivo por día, sirve que la fecha esté en el nombre del archivo.</p>
    <textarea id="impTx" rows="7" placeholder="Pegá acá tu diario…"></textarea>
    <div class="btns"><button class="ghost" data-a="dimpFile">Elegir archivos</button><button class="primary" data-a="dimpGo">Ver qué días encontré</button></div>
    <div id="impPrev"></div></div>`);
}
function showImport(found, lost) {
  diaryImport = DIA.merge(found);
  const box = $('#impPrev'); if (!box) return;
  if (!diaryImport.length) { box.innerHTML = '<p class="warn">No encontré fechas. Fijate que cada día arranque con su fecha en una línea aparte (o mandame un pedacito del archivo y lo adapto).</p>'; return; }
  const dup = diaryImport.filter(e => ITEMS.get(diaryId(e.date)) && (ITEMS.get(diaryId(e.date)).text || '').trim()).length;
  box.innerHTML = `<h3>Encontré ${diaryImport.length} día${diaryImport.length === 1 ? '' : 's'} (del ${fmtD(diaryImport[0].date)} al ${fmtD(diaryImport[diaryImport.length - 1].date)})</h3>
    ${lost ? `<p class="mute small">${lost} línea${lost === 1 ? '' : 's'} del principio no tenían fecha arriba y no se importan.</p>` : ''}
    ${dup ? `<p class="mute small">${dup} día${dup === 1 ? '' : 's'} ya tenía${dup === 1 ? '' : 'n'} texto: lo importado se agrega abajo.</p>` : ''}
    <div class="imprev">${diaryImport.map(e => `<div><b>${DIA.title(e.date)}</b><span>${esc(e.text.replace(/\s+/g, ' ').slice(0, 110))}</span><small>${words(e.text)} palabras</small></div>`).join('')}</div>
    <button class="primary" data-a="dimpOk">Importar ${diaryImport.length} día${diaryImport.length === 1 ? '' : 's'}</button>`;
}
const fmtD = k => new Date(k + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
async function doImport() {
  if (!diaryImport) return;
  let n = 0;
  for (const e of diaryImport) {
    const old = ITEMS.get(diaryId(e.date)), prev = old && !old.gone ? (old.text || '').trim() : '';
    if (prev && prev.includes(e.text.trim())) continue; // ya estaba (importado dos veces)
    await diarySet(e.date, prev ? prev + '\n\n' + e.text : e.text, { closed: true }); n++;
  }
  diaryImport = null; await closeSheet(); toast(n ? `Importados ${n} días` : 'Esos días ya estaban');
}
$('#diaryIn').onchange = async ev => {
  const fs = [...ev.target.files]; if (!fs.length) return;
  const found = []; let lost = 0;
  for (const f of fs) { const r = DIA.parseAny(await f.text(), f.name); found.push(...r.entries); lost += r.lost || 0; }
  showImport(found, lost);
};
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a^=d]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'dimp') importUI();
  else if (a === 'dimpFile') { $('#diaryIn').value = ''; $('#diaryIn').click(); }
  else if (a === 'dimpGo') { const r = DIA.parseAny($('#impTx').value, ''); showImport(r.entries, r.lost); }
  else if (a === 'dimpOk') doImport();
  else if (a === 'dopen') { const it = ITEMS.get(b.dataset.id); if (it) diaryEditor(it); }
  else if (a === 'dclose') { await flushDiary(); const tx = $('#dTx'); if (await diaryClose(b.dataset.k, tx ? tx.value : '')) { const art = $('.dtoday'); if (art) art.classList.add('closing'); setTimeout(render, document.documentElement.classList.contains('rm') ? 0 : 420); } }
  else if (a === 'dcloseEd') { const ed = $('#dEd'); clearTimeout(dEdT); dEdT = null; if (await diaryClose(dEdCur, ed.value)) { sheetClose = null; await closeSheet(); } }
  else if (a === 'dreopen') { const ed = $('#dEd'); await diarySet(dEdCur, ed.value, { closed: false }); sheetClose = null; await closeSheet(); toast('Día reabierto'); }
  else if (a === 'dadd') { const k = b.dataset.k; diaryEditor(ITEMS.get(diaryId(k)) || { id: diaryId(k), k: 'diary', date: k, text: '', closed: false }); }
  else if (a === 'dmore') { diaryShowMissing = true; render(); }
  else if (a === 'dnew') { const k = addDays(today(), -1); openSheet(`<div class="form"><div class="edbar"><button class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><h2>Escribir otro día</h2></div><label class="mute small">¿Qué día?<input type="date" id="dPick" value="${k}" max="${today()}"></label><button class="primary" data-a="dpickGo">Abrir</button></div>`); }
  else if (a === 'dpickGo') { const k = $('#dPick').value; if (!k || k > today()) { toast('Elegí un día de hoy para atrás'); return; } await closeSheet(); diaryEditor(ITEMS.get(diaryId(k)) && !ITEMS.get(diaryId(k)).gone ? ITEMS.get(diaryId(k)) : { id: diaryId(k), k: 'diary', date: k, text: '', closed: false }); }
  else if (a === 'ddel') {
    const it = ITEMS.get(b.dataset.id); if (!it) return; const txt = it.text;
    clearTimeout(dEdT); dEdT = null; sheetClose = null; await diarySet(it.date, ''); await closeSheet(); render();
    toast('Día borrado', { label: 'Deshacer', fn: async () => { await diarySet(it.date, txt); render(); } });
  }
});
