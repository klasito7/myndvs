/* Myndvs: notas, audios, imágenes, dibujos, calendario y tareas en un solo lugar.
   Todo vive en el navegador (IndexedDB). Calendario y tareas se sincronizan con Google;
   las notas y sus archivos, con un Gist privado de GitHub. Sin servidores propios. */
'use strict';
const P = window.M_PARSE;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const dk = d => d.toLocaleDateString('sv-SE');
const today = () => dk(new Date());
const addDays = (k, n) => { const d = new Date(k + 'T12:00'); d.setDate(d.getDate() + n); return dk(d); };
const dow = k => new Date(k + 'T12:00').getDay();
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtLong = k => cap1(new Date(k + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));
const fmtShort = k => { const t = today(); if (k === t) return 'Hoy'; if (k === addDays(t, 1)) return 'Mañana'; if (k === addDays(t, -1)) return 'Ayer'; return cap1(new Date(k + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')); };
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : m < 10080 ? `hace ${Math.round(m / 1440)} d` : new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }); };
const plusHour = t => { const h = Math.min(23, +t.slice(0, 2) + 1); return String(h).padStart(2, '0') + t.slice(2); };
const fmtDur = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
const ORIGIN_OK = /(^|\.)github\.io$/.test(location.hostname) || location.hostname === 'localhost';
const ICO = {
  pin: '<svg viewBox="0 0 24 24"><path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2.5h4L15.5 6"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M13.5 6.5l4 4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 12.5l3 3 5.5-6.5"/></svg>',
  arch: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10h14V9M10 13h4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  restore: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.3L4 8"/><path d="M4 3v5h5"/></svg>'
};
const NCOL = ['', 'rojo', 'ambar', 'verde', 'azul', 'violeta'];
const ECOL = { '': 'var(--acc)', rojo: '#ff7b7b', ambar: '#f4b740', verde: '#5fd39a', azul: '#5aa9ff', violeta: '#b28cff' };
const LBK = [['auto', 'Automática'], ['p', 'Principal'], ['s', 'Secundaria'], ['i', 'Solo aviso (sin XP)']];
const REP = [['', 'No se repite'], ['d', 'Todos los días'], ['w', 'Todas las semanas'], ['m', 'Todos los meses'], ['y', 'Todos los años']];
const WDS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/* ---------- base de datos local (IndexedDB) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('myndvs', 2);
      r.onupgradeneeded = () => { const d = r.result, have = d.objectStoreNames; if (!have.contains('items')) d.createObjectStore('items', { keyPath: 'id' }); if (!have.contains('blobs')) d.createObjectStore('blobs'); if (!have.contains('kv')) d.createObjectStore('kv'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  run(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode), q = fn(t.objectStore(store));
      t.oncomplete = () => res(q ? q.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  // con contraseña, items y archivos se guardan cifrados (ver lock.js)
  all: async s => { const L = await DB.run(s, 'readonly', o => o.getAll()); return Promise.all(L.map(r => openVal(s, r))); },
  get: async (s, k) => openVal(s, await DB.run(s, 'readonly', o => o.get(k))),
  put: async (s, v, k) => { const w = await sealVal(s, v); return DB.run(s, 'readwrite', o => k === undefined ? o.put(w) : o.put(w, k)); },
  del: (s, k) => DB.run(s, 'readwrite', o => o.delete(k)),
  keys: s => DB.run(s, 'readonly', o => o.getAllKeys())
};

/* ---------- ajustes (chicos: localStorage) ---------- */
const APP_V = '1.4 (25/11)';
const CFG_KEY = 'myndvs-cfg';
let cfg = { gcid: '', gsync: '', glast: 0, gerr: '', ghtok: '', gist: '', mgist: '', login: '', clast: 0, cerr: '', up: [], mdel: [] };
try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { /* sin almacenamiento */ }
const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* lleno */ } };

/* ---------- Lifebgood (mismo sitio: klasito7.github.io) ---------- */
function lbState() { try { return JSON.parse(localStorage.getItem('lifebgood-v1') || 'null'); } catch (e) { return null; } }
function hubState() { try { return JSON.parse(localStorage.getItem('hub2') || 'null'); } catch (e) { return null; } }
const lbCid = () => { const s = lbState(); return (s && s.gcal && s.gcal.cid) || ''; };
const gCid = () => cfg.gcid || lbCid();
const ghTok = () => { if (cfg.ghtok) return cfg.ghtok; const s = lbState(), h = hubState(); return (s && s.fx && s.fx.token) || (h && h.sync && h.sync.token) || ''; };
const lvl = xp => { let L = 1; while (xp >= 50 * L * (L + 1)) L++; return { L, lo: 50 * (L - 1) * L, hi: 50 * L * (L + 1) }; };

/* ---------- estado en memoria ---------- */
const ITEMS = new Map();
// todo lo que entra de afuera pasa por acá: así un dato raro nunca se convierte en código en la pantalla
const RX = { id: /^[\w-]{1,64}$/, date: /^\d{4}-\d{2}-\d{2}$/, hm: /^\d{2}:\d{2}$/ };
function clean(it) {
  if (!it || typeof it !== 'object' || !RX.id.test(String(it.id)) || !['note', 'ev', 'task', 'diary'].includes(it.k)) return null;
  const o = Object.assign({}, it);
  for (const k of ['text', 'title', 'notes']) if (o[k] != null) o[k] = String(o[k]);
  if (!NCOL.includes(o.color || '')) o.color = '';
  for (const k of ['date', 'due', 'until']) if (o[k] && !RX.date.test(o[k])) o[k] = k === 'date' ? today() : null;
  for (const k of ['start', 'end']) if (o[k] && !RX.hm.test(o[k])) o[k] = null;
  if (!['', 'd', 'w', 'm', 'y'].includes(o.rep || '')) o.rep = '';
  if (!['auto', 'p', 's', 'i'].includes(o.lb || 'auto')) o.lb = 'auto';
  o.days = Array.isArray(o.days) ? o.days.filter(d => Number.isInteger(d) && d >= 0 && d < 7) : [];
  o.ex = Array.isArray(o.ex) ? o.ex.filter(d => RX.date.test(d)) : [];
  o.media = Array.isArray(o.media) ? o.media.filter(m => m && RX.id.test(String(m.id)) && ['audio', 'img', 'draw'].includes(m.t)).map(m => ({ id: m.id, t: m.t, dur: +m.dur || 0 })) : [];
  for (const k of ['c', 'u', 'del', 'doneAt']) if (o[k] != null) o[k] = +o[k] || 0;
  if (o.k === 'diary' && !RX.date.test(o.date)) return null;
  return o;
}
const isNote = x => x.k === 'note' && !x.gone, isEv = x => x.k === 'ev' && !x.del, isTask = x => x.k === 'task' && !x.del;
const notes = () => [...ITEMS.values()].filter(isNote);
const events = () => [...ITEMS.values()].filter(isEv);
const tasks = () => [...ITEMS.values()].filter(isTask);
let tab = 'hoy', selDay = today(), calMonth = today().slice(0, 7), noteFilter = 'todas', noteTag = '', query = '', capOver = null, showDone = false;

async function save(it, opt) {
  opt = opt || {};
  it.u = Date.now();
  if ((it.k === 'ev' || it.k === 'task') && !opt.fromRemote) it.dirty = true;
  ITEMS.set(it.id, it);
  await DB.put('items', it);
  if (opt.fromRemote) return;
  if (it.k === 'note' || it.k === 'diary') cloudSoon(); else gSoon();
  bridge();
  if (!opt.quiet) render();
}
async function drop(id) { ITEMS.delete(id); await DB.del('items', id); }

/* ---------- archivos (audio, imagen, dibujo) ---------- */
const URLS = new Map();
async function blobUrl(id) {
  if (URLS.has(id)) return URLS.get(id);
  const b = await DB.get('blobs', id);
  if (!b) return '';
  const u = URL.createObjectURL(b); URLS.set(id, u); return u;
}
function hydrate(root) {
  $$('[data-blob]', root || document).forEach(async el => {
    const u = await blobUrl(el.dataset.blob);
    if (!u) { el.classList.add('missing'); return; }
    if (el.tagName === 'IMG') el.src = u; else if (el.tagName === 'AUDIO') el.src = u;
  });
}
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const dataToBlob = async d => (await fetch(d)).blob();

async function shrink(file) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const w = src.width, h = src.height, k = Math.min(1, 1600 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.82));
}
async function addMedia(note, t, blob, extra) {
  const id = uid();
  await DB.put('blobs', blob, id);
  note.media = note.media || [];
  note.media.push(Object.assign({ id, t }, extra || {}));
  return id;
}

/* ---------- carga rápida ---------- */
function capMode(text) {
  if (capOver) return capOver;
  const p = P.parse(text || '');
  if (p.task) return 'task';
  if (tab === 'cal') return 'ev';
  if (tab === 'tareas') return 'task';
  if (tab === 'notas') return 'note';
  if (p.time) return 'ev';
  if (p.hasDate) return 'task';
  return 'note';
}
const MODE_TXT = { note: 'Nota', task: 'Tarea', ev: 'Evento' };
function capUI() {
  const v = $('#capIn').value, m = capMode(v);
  const b = $('#capMode'); b.textContent = MODE_TXT[m]; b.dataset.m = m; b.classList.toggle('fixed', !!capOver);
  $('#capIn').placeholder = m === 'task' ? 'Nueva tarea…' : m === 'ev' ? 'Nuevo evento… (vie 21 cena)' : '¿Qué tenés en mente?';
}
let lastCap = null;
async function capture(text) {
  text = text.trim(); if (!text) return;
  const m = capMode(text), p = P.parse(text);
  let it;
  if (m === 'note') it = { id: uid(), k: 'note', text: text.replace(/^\s*-\s+/, ''), c: Date.now(), color: '', pin: false, arch: false, media: [] };
  else if (m === 'task') it = { id: uid(), k: 'task', title: p.title || text, due: p.date || (tab === 'cal' ? selDay : null), done: false, notes: '', lb: 'auto', c: Date.now() };
  else {
    const date = p.date || (tab === 'cal' ? selDay : today());
    it = { id: uid(), k: 'ev', title: p.title || text, date, start: p.time, end: p.end || (p.time ? plusHour(p.time) : null), color: '', notes: '', rep: '', lb: 'auto', ex: [], c: Date.now() };
  }
  lastCap = it.id; capOver = null;
  await save(it);
  document.dispatchEvent(new CustomEvent('myndvs:cap', { detail: { k: m, id: it.id } }));
  const where = m === 'note' ? 'Nota guardada' : m === 'task' ? `Tarea${it.due ? ' · ' + fmtShort(it.due) : ''}` : `Evento · ${fmtShort(it.date)}${it.start ? ' ' + it.start : ''}`;
  toast(where, { label: 'Deshacer', fn: async () => { const x = ITEMS.get(lastCap); if (x) { if (x.k === 'note') await drop(x.id); else if (x.gid || x.tid) { x.del = true; await save(x); } else await drop(x.id); render(); } } });
}

/* ---------- vistas ---------- */
function render() {
  // si está escribiendo el diario, no se le pisa el texto
  if (tab === 'diario' && !query && document.activeElement && document.activeElement.id === 'dTx') { syncDot(); return; }
  document.body.dataset.tab = query ? 'buscar' : tab;
  $$('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  $('#topDate').textContent = new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  const v = $('#view');
  v.innerHTML = query ? vSearch() : tab === 'hoy' ? vHoy() : tab === 'notas' ? vNotas() : tab === 'cal' ? vCal() : tab === 'diario' ? vDiario() : vTareas();
  if (tab === 'diario' && !query) bindDiary();
  hydrate(v);
  syncDot(); capUI();
}

/* tarjeta de nota */
function noteBody(n, max) {
  const lines = (n.text || '').split('\n');
  const out = []; let used = 0;
  for (let i = 0; i < lines.length && used < (max || 99); i++) {
    const L = lines[i], m = L.match(/^\s*\[( |x)\]\s?(.*)$/i);
    if (m) out.push(`<div class="ck${m[1] !== ' ' ? ' on' : ''}"><input type="checkbox" data-a="nck" data-id="${n.id}" data-l="${i}"${m[1] !== ' ' ? ' checked' : ''} aria-label="Marcar"><span>${linkify(m[2])}</span></div>`);
    else if (L.trim()) out.push(`<p>${linkify(L)}</p>`);
    else if (out.length) out.push('<p class="sp"></p>');
    used++;
  }
  if (lines.length > (max || 99)) out.push('<p class="more">…</p>');
  return out.join('');
}
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/(^|\s)#([\wáéíóúñü]+)/gi, '$1<span class="tag">#$2</span>');
const tagsOf = n => [...new Set(((n.text || '').match(/(?:^|\s)#([\wáéíóúñü]+)/gi) || []).map(t => t.trim().slice(1).toLowerCase()))];
function noteCard(n) {
  const imgs = (n.media || []).filter(m => m.t !== 'audio'), auds = (n.media || []).filter(m => m.t === 'audio');
  return `<article class="note c-${n.color || 'base'}" data-a="openNote" data-id="${n.id}">
    ${n.pin ? `<i class="pinned">${ICO.pin}</i>` : ''}
    ${imgs.length ? `<div class="thumbs n${Math.min(imgs.length, 3)}">${imgs.slice(0, 3).map(m => `<img data-blob="${m.id}" alt="" class="${m.t}">`).join('')}</div>` : ''}
    ${n.text ? `<div class="nb">${noteBody(n, 9)}</div>` : ''}
    ${auds.map(a => `<div class="aud" data-stop="1">${audioPill(a)}</div>`).join('')}
    <footer>${ago(n.u || n.c)}</footer>
  </article>`;
}
function audioPill(a) { return `<button class="play" data-a="play" data-m="${a.id}" aria-label="Reproducir">${ICO.play}</button><span class="wave"></span><span class="dur">${a.dur ? fmtDur(a.dur) : 'audio'}</span>`; }

/* eventos de un día (incluye repeticiones) */
function occurs(e, k) {
  if (!e.rep) return e.date === k;
  if (k < e.date || (e.until && k > e.until) || (e.ex || []).includes(k)) return false;
  if (e.rep === 'd') return true;
  if (e.rep === 'w') return (e.days && e.days.length ? e.days : [dow(e.date)]).includes(dow(k));
  if (e.rep === 'm') return k.slice(8) === e.date.slice(8);
  if (e.rep === 'y') return k.slice(5) === e.date.slice(5);
  return false;
}
const evOn = k => events().filter(e => occurs(e, k)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
const tasksDue = k => tasks().filter(t => t.due === k);
function evRow(e, k) {
  const now = new Date(), nowHM = now.toTimeString().slice(0, 5), past = k === today() && e.end && e.end < nowHM, live = k === today() && e.start && e.start <= nowHM && (!e.end || e.end > nowHM);
  return `<button class="ev${past ? ' past' : ''}${live ? ' live' : ''}" data-a="openEv" data-id="${e.id}" data-day="${k}" style="--c:${ECOL[e.color || '']}">
    <span class="t">${e.start ? `${e.start}${e.end ? '<small>' + e.end + '</small>' : ''}` : '<small>Todo el día</small>'}</span>
    <span class="ti">${esc(e.title)}${e.rep ? ' <i class="rep" title="Se repite">↻</i>' : ''}${e.ro ? ' <i class="rep">' + esc(e.cal || '') + '</i>' : ''}</span>
  </button>`;
}
function taskRow(t) {
  const late = t.due && t.due < today() && !t.done;
  return `<div class="task${t.done ? ' done' : ''}">
    <button class="tick" data-a="tick" data-id="${t.id}" aria-label="${t.done ? 'Desmarcar' : 'Completar'}"></button>
    <button class="ti" data-a="openTask" data-id="${t.id}">${esc(t.title)}${t.notes ? ' <i class="hasn">≡</i>' : ''}</button>
    ${t.due ? `<span class="due${late ? ' late' : ''}">${fmtShort(t.due)}</span>` : ''}
  </div>`;
}
function lbCard() {
  const s = lbState(); if (!s || typeof s.xp !== 'number') return '';
  const L = lvl(s.xp), pct = Math.round(100 * (s.xp - L.lo) / (L.hi - L.lo)), t = today();
  const open = (s.tasks || []).filter(x => x.date === t && x.st === 'open' && x.kind !== 'i').length;
  const xpHoy = (s.xpDay && s.xpDay[t]) || 0;
  return `<a class="lb" href="../Lifebgood/" target="_blank" rel="noopener">
    <b>Lifebgood</b><span>Nivel ${L.L}</span><span class="bar"><i style="width:${pct}%"></i></span>
    <small>${xpHoy ? '+' + xpHoy + ' XP hoy · ' : ''}${open ? open + ' misión' + (open === 1 ? '' : 'es') + ' de tu agenda para hoy' : 'Sin misiones pendientes hoy'}</small></a>`;
}
function vHoy() {
  const t = today(), evs = evOn(t), late = tasks().filter(x => !x.done && x.due && x.due < t), td = tasksDue(t).filter(x => !x.done);
  const pins = notes().filter(n => n.pin && !n.arch && !n.del), recent = notes().filter(n => !n.pin && !n.arch && !n.del).sort((a, b) => (b.u || b.c) - (a.u || a.c)).slice(0, 4);
  const next = []; for (let i = 1; i <= 3; i++) { const k = addDays(t, i); evOn(k).forEach(e => next.push([k, e])); }
  return `<h1 class="day">${fmtLong(t)}</h1>
  ${lbCard()}
  <section><h2>Agenda</h2>${evs.length ? evs.map(e => evRow(e, t)).join('') : '<p class="empty">Nada agendado hoy.</p>'}
    ${next.length ? `<details class="next"><summary>Próximos días (${next.length})</summary>${next.slice(0, 8).map(([k, e]) => `<div class="nx"><span>${fmtShort(k)}</span>${evRow(e, k)}</div>`).join('')}</details>` : ''}</section>
  <section><h2>Tareas${late.length ? ` <em class="late">${late.length} atrasada${late.length === 1 ? '' : 's'}</em>` : ''}</h2>${late.concat(td).length ? late.concat(td).map(taskRow).join('') : '<p class="empty">Nada pendiente para hoy. Escribí <b>- algo</b> abajo para sumar una tarea.</p>'}</section>
  ${pins.length ? `<section><h2>Fijadas</h2><div class="grid">${pins.map(noteCard).join('')}</div></section>` : ''}
  <section><h2>Últimos pensamientos</h2>${recent.length ? `<div class="grid">${recent.map(noteCard).join('')}</div>` : '<p class="empty">Todavía no guardaste nada. Escribí, grabá un audio, sacá una foto o dibujá desde la barra de abajo.</p>'}</section>`;
}
function vNotas() {
  let L = notes();
  const trashN = L.filter(n => n.del).length, archN = L.filter(n => n.arch && !n.del).length;
  L = noteFilter === 'papelera' ? L.filter(n => n.del) : noteFilter === 'archivo' ? L.filter(n => n.arch && !n.del) : L.filter(n => !n.arch && !n.del);
  if (noteFilter === 'audio') L = notes().filter(n => !n.del && (n.media || []).some(m => m.t === 'audio'));
  if (noteFilter === 'img') L = notes().filter(n => !n.del && (n.media || []).some(m => m.t !== 'audio'));
  const tags = {}; notes().filter(n => !n.del).forEach(n => tagsOf(n).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
  if (noteTag) L = L.filter(n => tagsOf(n).includes(noteTag));
  L.sort((a, b) => (b.pin - a.pin) || ((b.u || b.c) - (a.u || a.c)));
  const chip = (id, txt) => `<button class="chip" data-a="nf" data-f="${id}" aria-pressed="${noteFilter === id}">${txt}</button>`;
  return `<div class="chips">${chip('todas', 'Todas')}${chip('audio', 'Audios')}${chip('img', 'Imágenes y dibujos')}${chip('archivo', 'Archivo' + (archN ? ' ' + archN : ''))}${chip('papelera', 'Papelera' + (trashN ? ' ' + trashN : ''))}
    ${Object.keys(tags).sort().map(t => `<button class="chip tagc" data-a="ntag" data-t="${esc(t)}" aria-pressed="${noteTag === t}">#${esc(t)}</button>`).join('')}</div>
    ${noteFilter === 'papelera' && L.length ? '<p class="mute">Se borran solas a los 30 días. <button class="link" data-a="emptyTrash">Vaciar papelera</button></p>' : ''}
    ${L.length ? `<div class="grid">${L.map(noteCard).join('')}</div>` : `<p class="empty">${noteFilter === 'papelera' ? 'La papelera está vacía.' : noteFilter === 'archivo' ? 'No archivaste nada.' : 'No hay notas acá todavía.'}</p>`}`;
}
function vCal() {
  const [y, mo] = calMonth.split('-').map(Number), first = new Date(y, mo - 1, 1), start = (first.getDay() + 6) % 7, days = new Date(y, mo, 0).getDate();
  const cells = [], t = today();
  for (let i = 0; i < start; i++) cells.push('<span class="cd off"></span>');
  for (let d = 1; d <= days; d++) {
    const k = `${calMonth}-${String(d).padStart(2, '0')}`, evs = evOn(k), tk = tasksDue(k).filter(x => !x.done);
    const dots = evs.slice(0, 3).map(e => `<i style="background:${ECOL[e.color || '']}"></i>`).join('') + (tk.length ? '<i class="tk"></i>' : '');
    cells.push(`<button class="cd${k === t ? ' tod' : ''}${k === selDay ? ' sel' : ''}${evs.length > 3 ? ' many' : ''}" data-a="day" data-k="${k}"><b>${d}</b><span>${dots}</span></button>`);
  }
  const evs = evOn(selDay), tk = tasksDue(selDay);
  const title = cap1(first.toLocaleDateString('es-AR', { month: 'long' })) + ' ' + y;
  return `<div class="calhead"><button class="ib" data-a="mprev" aria-label="Mes anterior">${ICO.back}</button><h2>${title}</h2><button class="ib flip" data-a="mnext" aria-label="Mes siguiente">${ICO.back}</button><button class="chip" data-a="mtoday">Hoy</button></div>
  <div class="cal"><div class="wd">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div><div class="cells">${cells.join('')}</div></div>
  <section><h2 class="dh">${fmtLong(selDay)}<button class="chip add" data-a="newEv">${ICO.plus} Evento</button></h2>
    ${evs.length ? evs.map(e => evRow(e, selDay)).join('') : '<p class="empty">Libre. Escribí abajo para agendar (ej: <b>16 a 18 turno médico</b>).</p>'}
    ${tk.length ? '<h3>Tareas que vencen</h3>' + tk.map(taskRow).join('') : ''}</section>`;
}
function vTareas() {
  const t = today(), all = tasks(), open = all.filter(x => !x.done);
  const late = open.filter(x => x.due && x.due < t).sort((a, b) => a.due.localeCompare(b.due));
  const td = open.filter(x => x.due === t), wk = open.filter(x => x.due && x.due > t).sort((a, b) => a.due.localeCompare(b.due)), nod = open.filter(x => !x.due).sort((a, b) => (b.c || 0) - (a.c || 0));
  const done = all.filter(x => x.done).sort((a, b) => (b.doneAt || b.u) - (a.doneAt || a.u)).slice(0, 40);
  const sec = (h, L, cls) => L.length ? `<section${cls ? ` class="${cls}"` : ''}><h2>${h} <em>${L.length}</em></h2>${L.map(taskRow).join('')}</section>` : '';
  return (open.length ? '' : '<p class="empty big">Nada pendiente. 🎉<br>Escribí abajo para sumar una tarea (ej: <b>mañana pagar la luz</b>).</p>')
    + sec('Atrasadas', late, 'warn') + sec('Hoy', td) + sec('Próximas', wk) + sec('Sin fecha', nod)
    + (done.length ? `<section><h2><button class="link" data-a="toggleDone">${showDone ? 'Ocultar' : 'Ver'} hechas (${done.length})</button></h2>${showDone ? done.map(taskRow).join('') : ''}</section>` : '');
}
function vSearch() {
  const q = P.fold(query.trim()); if (!q) return '';
  const has = s => P.fold(s || '').includes(q);
  const D = diary().filter(x => has(x.text)).sort((a, b) => b.date.localeCompare(a.date)), N = notes().filter(n => !n.del && has(n.text)), E = events().filter(e => has(e.title) || has(e.notes)), T = tasks().filter(t => has(t.title) || has(t.notes));
  return `<h2 class="sr">Resultados para “${esc(query)}”</h2>
    ${E.length ? '<section><h2>Eventos</h2>' + E.slice(0, 20).map(e => `<div class="nx"><span>${fmtShort(e.date)}</span>${evRow(e, e.date)}</div>`).join('') + '</section>' : ''}
    ${T.length ? '<section><h2>Tareas</h2>' + T.slice(0, 30).map(taskRow).join('') + '</section>' : ''}
    ${N.length ? '<section><h2>Notas</h2><div class="grid">' + N.slice(0, 40).map(noteCard).join('') + '</div></section>' : ''}
    ${D.length ? '<section><h2>Diario</h2>' + D.slice(0, 20).map(x => `<button class="dent" data-a="dopen" data-id="${x.id}"><b>${DIA.title(x.date)}</b><span>${esc(x.text.replace(/\s+/g, ' ').slice(0, 160))}</span></button>`).join('') + '</section>' : ''}
    ${!E.length && !T.length && !N.length && !D.length ? '<p class="empty">No encontré nada.</p>' : ''}`;
}

/* ---------- hoja (editor) ---------- */
let sheetClose = null;
function openSheet(html, onClose, cls) {
  const sh = $('#sheet'); sh.className = 'sheet' + (cls ? ' ' + cls : ''); sh.innerHTML = html; sh.hidden = false; $('#sheetBg').hidden = false;
  sheetClose = onClose || null; hydrate(sh);
  document.body.classList.add('modal');
}
async function closeSheet() {
  if ($('#sheet').hidden) return;
  const f = sheetClose; sheetClose = null;
  if (f) await f();
  $('#sheet').hidden = true; $('#sheetBg').hidden = true; $('#sheet').innerHTML = '';
  document.body.classList.remove('modal');
  stopAudio(); render();
}

/* editor de nota */
let curNote = null;
function noteEditor(n) {
  curNote = n; if (n._orig === undefined) n._orig = n.text || '';
  const media = (n.media || []).map(m => m.t === 'audio'
    ? `<div class="aud big">${audioPill(m)}<button class="ib" data-a="rmMedia" data-m="${m.id}" aria-label="Quitar">${ICO.x}</button></div>`
    : `<figure class="mf"><img data-blob="${m.id}" alt="" class="${m.t}" data-a="${m.t === 'draw' ? 'editDraw' : 'viewImg'}" data-m="${m.id}"><button class="ib rm" data-a="rmMedia" data-m="${m.id}" aria-label="Quitar">${ICO.x}</button></figure>`).join('');
  openSheet(`<div class="ed c-${n.color || 'base'}" id="noteEd">
    <div class="edbar"><button class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><span class="grow"></span>
      ${n.del ? `<button class="ib" data-a="restore" aria-label="Recuperar">${ICO.restore}</button><button class="ib" data-a="killNote" aria-label="Borrar para siempre">${ICO.trash}</button>` : `
      <button class="ib" data-a="pin" aria-pressed="${!!n.pin}" aria-label="Fijar">${ICO.pin}</button>
      <button class="ib" data-a="archive" aria-pressed="${!!n.arch}" aria-label="Archivar">${ICO.arch}</button>
      <button class="ib" data-a="trashNote" aria-label="A la papelera">${ICO.trash}</button>`}</div>
    <div class="medias">${media}</div>
    <textarea id="noteTx" placeholder="Escribí…  (usá [ ] para una lista y #etiquetas)">${esc(n.text || '')}</textarea>
    <div class="edtools">
      <button class="ib" data-a="nrec" aria-label="Grabar audio">${ICO.mic}</button>
      <button class="ib" data-a="nfoto" aria-label="Imagen">${ICO.cam}</button>
      <button class="ib" data-a="ndibu" aria-label="Dibujar">${ICO.pen}</button>
      <button class="ib" data-a="nlist" aria-label="Lista">${ICO.check}</button>
      <span class="grow"></span>
      ${NCOL.map(c => `<button class="sw c-${c || 'base'}" data-a="ncol" data-c="${c}" aria-pressed="${(n.color || '') === c}" aria-label="Color ${c || 'normal'}"></button>`).join('')}
    </div>
    <p class="mute small">${n.c ? 'Creada ' + ago(n.c) : ''}${n.u && n.u !== n.c ? ' · editada ' + ago(n.u) : ''}</p>
  </div>`, async () => {
    const tx = $('#noteTx'); if (tx) n.text = tx.value;
    const empty = !(n.text || '').trim() && !(n.media || []).length;
    if (empty) { if (ITEMS.has(n.id)) { n.gone = true; await save(n, { quiet: true }); } }
    else if (n._dirty || n._mod || (n.text || '') !== n._orig || !ITEMS.has(n.id)) { for (const k of Object.keys(n)) if (k[0] === '_') delete n[k]; await save(n, { quiet: true }); }
    else delete n._orig;
    curNote = null;
  }, 'full');
  const tx = $('#noteTx'); autoGrow(tx);
}
function autoGrow(tx) { if (!tx) return; const f = () => { tx.style.height = 'auto'; tx.style.height = Math.max(160, tx.scrollHeight) + 'px'; }; tx.addEventListener('input', f); f(); }
function refreshNoteEditor() { if (!curNote) return; const tx = $('#noteTx'); if (tx) curNote.text = tx.value; curNote._mod = true; const f = sheetClose; noteEditor(curNote); sheetClose = f; }

/* editor de evento */
function evEditor(e, day) {
  const isNew = !ITEMS.has(e.id);
  const days = e.days && e.days.length ? e.days : [dow(e.date)];
  openSheet(`<form class="form" id="evForm">
    <div class="edbar"><button type="button" class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><h2>${isNew ? 'Nuevo evento' : 'Evento'}</h2><span class="grow"></span>
      ${!isNew && !e.ro ? `<button type="button" class="ib" data-a="delEv" data-day="${day || ''}" aria-label="Borrar">${ICO.trash}</button>` : ''}</div>
    ${e.ro ? `<p class="mute">Este evento es de “${esc(e.cal || 'otro calendario')}”; se edita en Google.</p>` : ''}
    <input name="title" class="big" placeholder="Título" value="${esc(e.title || '')}" ${e.ro ? 'readonly' : ''} required>
    <div class="row"><label>Fecha<input type="date" name="date" value="${e.date}"></label>
      <label class="sw2"><input type="checkbox" name="allday" ${e.start ? '' : 'checked'}> Todo el día</label></div>
    <div class="row times" ${e.start ? '' : 'hidden'}><label>Empieza<input type="time" name="start" value="${e.start || '09:00'}"></label><label>Termina<input type="time" name="end" value="${e.end || (e.start ? plusHour(e.start) : '10:00')}"></label></div>
    <div class="row"><label>Repetir<select name="rep">${REP.map(([v, t]) => `<option value="${v}"${(e.rep || '') === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="until" ${e.rep ? '' : 'hidden'}>Hasta<input type="date" name="until" value="${e.until || ''}"></label></div>
    <div class="wdays" ${e.rep === 'w' ? '' : 'hidden'}>${WDS.map((d, i) => `<label><input type="checkbox" name="wd" value="${i}" ${days.includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div>
    <div class="row"><label>En Lifebgood<select name="lb">${LBK.map(([v, t]) => `<option value="${v}"${(e.lb || 'auto') === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <div class="cols">${Object.keys(ECOL).map(c => `<label class="sw c-${c || 'base'}"><input type="radio" name="color" value="${c}" ${(e.color || '') === c ? 'checked' : ''}><span></span></label>`).join('')}</div>
    <textarea name="notes" placeholder="Notas">${esc(e.notes || '')}</textarea>
    ${e.ro ? '' : `<button class="primary" type="submit">${isNew ? 'Agendar' : 'Guardar'}</button>`}
    ${!isNew && e.rep && !e.ro && day ? `<button type="button" class="ghost" data-a="skipOcc" data-day="${day}">Borrar solo el ${fmtShort(day)}</button>` : ''}
  </form>`);
  const f = $('#evForm');
  f.allday.onchange = () => { $('.times', f).hidden = f.allday.checked; };
  f.rep.onchange = () => { $('.wdays', f).hidden = f.rep.value !== 'w'; $('.until', f).hidden = !f.rep.value; };
  f.onsubmit = async ev => {
    ev.preventDefault(); if (e.ro) return;
    const fd = new FormData(f);
    e.title = (fd.get('title') || '').trim() || 'Sin título';
    e.date = fd.get('date') || today();
    e.start = f.allday.checked ? null : fd.get('start') || null;
    e.end = f.allday.checked ? null : fd.get('end') || (e.start ? plusHour(e.start) : null);
    if (e.start && e.end && e.end <= e.start) e.end = plusHour(e.start);
    e.rep = fd.get('rep') || ''; e.until = e.rep ? fd.get('until') || '' : '';
    e.days = e.rep === 'w' ? fd.getAll('wd').map(Number) : [];
    e.lb = fd.get('lb') || 'auto'; e.color = fd.get('color') || ''; e.notes = fd.get('notes') || '';
    if (!e.c) e.c = Date.now();
    await save(e, { quiet: true }); selDay = e.date; closeSheet(); toast(isNew ? 'Evento agendado' : 'Evento guardado');
  };
  if (isNew) f.title.focus();
}
/* editor de tarea */
function taskEditor(t) {
  const isNew = !ITEMS.has(t.id);
  openSheet(`<form class="form" id="tkForm">
    <div class="edbar"><button type="button" class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><h2>${isNew ? 'Nueva tarea' : 'Tarea'}</h2><span class="grow"></span>
      ${isNew ? '' : `<button type="button" class="ib" data-a="delTask" aria-label="Borrar">${ICO.trash}</button>`}</div>
    <input name="title" class="big" placeholder="¿Qué hay que hacer?" value="${esc(t.title || '')}" required>
    <div class="row"><label>Vence<input type="date" name="due" value="${t.due || ''}"></label>
      <div class="quick"><button type="button" class="chip" data-q="0">Hoy</button><button type="button" class="chip" data-q="1">Mañana</button><button type="button" class="chip" data-q="7">En 1 semana</button><button type="button" class="chip" data-q="">Sin fecha</button></div></div>
    <div class="row"><label>En Lifebgood<select name="lb">${LBK.map(([v, x]) => `<option value="${v}"${(t.lb || 'auto') === v ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div>
    <textarea name="notes" placeholder="Detalles">${esc(t.notes || '')}</textarea>
    <button class="primary" type="submit">${isNew ? 'Agregar' : 'Guardar'}</button>
  </form>`);
  const f = $('#tkForm');
  $$('[data-q]', f).forEach(b => { b.onclick = () => { f.due.value = b.dataset.q === '' ? '' : addDays(today(), +b.dataset.q); }; });
  f.onsubmit = async ev => {
    ev.preventDefault(); const fd = new FormData(f);
    t.title = (fd.get('title') || '').trim() || 'Sin título'; t.due = fd.get('due') || null; t.lb = fd.get('lb') || 'auto'; t.notes = fd.get('notes') || '';
    if (!t.c) t.c = Date.now();
    await save(t, { quiet: true }); closeSheet();
  };
  if (isNew) f.title.focus();
}
async function toggleTask(id) {
  const t = ITEMS.get(id); if (!t) return;
  t.done = !t.done; t.doneAt = t.done ? Date.now() : 0;
  await save(t);
  if (t.done) document.dispatchEvent(new CustomEvent('myndvs:tick', { detail: { id } }));
  if (t.done) toast('Hecha: ' + t.title, { label: 'Deshacer', fn: () => toggleTask(id) });
}
async function delItem(it) {
  if (it.gid || it.tid) { it.del = true; await save(it, { quiet: true }); } else await drop(it.id);
  bridge();
}

/* ---------- grabar audio ---------- */
let recState = null;
async function record(onDone) {
  if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Este navegador no puede grabar audio');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { return toast('Sin permiso para el micrófono'); }
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : undefined), chunks = [], t0 = Date.now();
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const ov = document.createElement('div'); ov.className = 'recov';
  ov.innerHTML = `<div class="recbox"><i class="rdot"></i><b id="recT">0:00</b><p>Grabando… hablá tranquilo.</p><canvas id="recVu" width="240" height="48"></canvas>
    <div class="btns"><button class="ghost" id="recCancel">Cancelar</button><button class="primary" id="recStop">Guardar</button></div></div>`;
  document.body.appendChild(ov);
  // vúmetro
  let ac, an, raf;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)(); an = ac.createAnalyser(); an.fftSize = 256;
    ac.createMediaStreamSource(stream).connect(an);
    const cv = $('#recVu', ov), g = cv.getContext('2d'), buf = new Uint8Array(an.frequencyBinCount), bars = [];
    const loop = () => { an.getByteTimeDomainData(buf); let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v - 128)); bars.push(pk / 128); if (bars.length > 60) bars.shift();
      g.clearRect(0, 0, 240, 48); g.fillStyle = '#ff6b6b'; bars.forEach((b, i) => { const h = Math.max(2, b * 46); g.fillRect(i * 4, 24 - h / 2, 2.5, h); }); raf = requestAnimationFrame(loop); };
    loop();
  } catch (e) { /* sin vúmetro */ }
  const tick = setInterval(() => { $('#recT', ov).textContent = fmtDur((Date.now() - t0) / 1000); }, 250);
  const end = save => new Promise(res => {
    clearInterval(tick); cancelAnimationFrame(raf); try { ac && ac.close(); } catch (e) { /* nada */ }
    mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); ov.remove(); recState = null; res(); if (save && chunks.length) onDone(new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' }), (Date.now() - t0) / 1000); };
    mr.stop();
  });
  $('#recStop', ov).onclick = () => end(true);
  $('#recCancel', ov).onclick = () => end(false);
  recState = { end };
  mr.start(1000);
}
/* reproductor */
let player = null, playing = null;
async function play(mid, btn) {
  if (playing === mid && player && !player.paused) { player.pause(); return; }
  stopAudio();
  const u = await blobUrl(mid); if (!u) return toast('El audio todavía no bajó de la nube');
  player = new Audio(u); playing = mid;
  const wave = btn.parentElement.querySelector('.wave'), dur = btn.parentElement.querySelector('.dur');
  btn.innerHTML = ICO.pause; btn.parentElement.classList.add('on');
  player.ontimeupdate = () => { if (player.duration && isFinite(player.duration)) { wave.style.setProperty('--p', (100 * player.currentTime / player.duration) + '%'); dur.textContent = fmtDur(player.currentTime); } };
  player.onpause = player.onended = () => { btn.innerHTML = ICO.play; btn.parentElement.classList.remove('on'); if (player && player.ended) { wave.style.setProperty('--p', '0%'); playing = null; } };
  player.play().catch(() => toast('No se pudo reproducir'));
}
function stopAudio() { if (player) { player.pause(); player = null; playing = null; } }

/* ---------- dibujo ---------- */
function drawPad(baseId, onSave) {
  const ov = document.createElement('div'); ov.className = 'drawov';
  const COLS = ['#1d1f24', '#e5484d', '#3b82f6', '#22a565', '#f5a524', '#8b5cf6'];
  ov.innerHTML = `<div class="dbar">
    <button class="ib" data-d="cancel" aria-label="Cancelar">${ICO.x}</button>
    ${COLS.map((c, i) => `<button class="dc" data-d="col" data-c="${c}" style="--c:${c}" aria-pressed="${i === 0}"></button>`).join('')}
    <button class="dc eraser" data-d="eraser" aria-label="Goma" aria-pressed="false"></button>
    <button class="ib" data-d="size" aria-label="Grosor"><b id="dsz">●</b></button>
    <button class="ib" data-d="undo" aria-label="Deshacer">${ICO.undo}</button>
    <button class="ib" data-d="clear" aria-label="Borrar todo">${ICO.trash}</button>
    <button class="primary sm" data-d="save">Listo</button></div><canvas id="dcv"></canvas>`;
  document.body.appendChild(ov);
  const cv = $('#dcv', ov), g = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = ov.clientWidth, H = ov.clientHeight - $('.dbar', ov).offsetHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round';
  const PAPER = '#fbfaf6';
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  let col = COLS[0], sizes = [2.5, 6, 14], si = 0, eraser = false, undo = [], drawing = false, last = null, dirty = false;
  const snap = () => { undo.push(g.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 25) undo.shift(); };
  if (baseId) blobUrl(baseId).then(u => { if (!u) return; const im = new Image(); im.onload = () => { const k = Math.min(W / im.width, H / im.height, 1); g.drawImage(im, 0, 0, im.width * k, im.height * k); }; im.src = u; });
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5 }; };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); snap(); drawing = true; dirty = true; last = pos(e); g.beginPath(); g.fillStyle = eraser ? PAPER : col; g.arc(last.x, last.y, (eraser ? sizes[si] * 2.5 : sizes[si]) / 2, 0, 7); g.fill(); };
  cv.onpointermove = e => {
    if (!drawing) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ce of evs) {
      const p = pos(ce);
      g.strokeStyle = eraser ? PAPER : col; g.lineWidth = (eraser ? sizes[si] * 2.5 : sizes[si]) * (0.6 + p.p * 0.8);
      g.beginPath(); g.moveTo(last.x, last.y);
      const mx = (last.x + p.x) / 2, my = (last.y + p.y) / 2; g.quadraticCurveTo(last.x, last.y, mx, my); g.lineTo(p.x, p.y); g.stroke();
      last = p;
    }
  };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
  const close = () => { ov.remove(); document.removeEventListener('keydown', key); };
  // recorta al dibujo (con margen) para que la tarjeta no quede llena de blanco
  const crop = () => {
    const w = cv.width, h = cv.height, px = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      if (Math.abs(px[i] - 251) + Math.abs(px[i + 1] - 250) + Math.abs(px[i + 2] - 246) > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return cv;
    const pad = 28 * dpr; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(h, y1 + pad);
    const o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0;
    o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o;
  };
  const key = e => { if (e.key === 'Escape') close(); if ((e.ctrlKey || e.metaKey) && e.key === 'z') { const u = undo.pop(); if (u) g.putImageData(u, 0, 0); } };
  document.addEventListener('keydown', key);
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const d = b.dataset.d;
    if (d === 'col') { col = b.dataset.c; eraser = false; $$('[data-d=col],[data-d=eraser]', ov).forEach(x => x.setAttribute('aria-pressed', x === b)); }
    else if (d === 'eraser') { eraser = true; $$('[data-d=col],[data-d=eraser]', ov).forEach(x => x.setAttribute('aria-pressed', x === b)); }
    else if (d === 'size') { si = (si + 1) % 3; $('#dsz', ov).style.fontSize = [9, 14, 20][si] + 'px'; }
    else if (d === 'undo') { const u = undo.pop(); if (u) g.putImageData(u, 0, 0); }
    else if (d === 'clear') { snap(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAPER; g.fillRect(0, 0, cv.width, cv.height); g.scale(dpr, dpr); dirty = true; }
    else if (d === 'cancel') close();
    else if (d === 'save') { if (!dirty && !baseId) return close(); const out = crop(); out.toBlob(b2 => { close(); if (b2) onSave(b2); }, 'image/png'); }
  });
  $('#dsz', ov).style.fontSize = '9px';
}

/* visor de imagen */
async function viewImg(id) {
  const u = await blobUrl(id); if (!u) return;
  const ov = document.createElement('div'); ov.className = 'imgov'; ov.innerHTML = `<img src="${u}" alt=""><button class="ib" aria-label="Cerrar">${ICO.x}</button>`;
  ov.onclick = () => ov.remove(); document.body.appendChild(ov);
}

/* ---------- crear notas con archivos desde la barra ---------- */
async function newNoteWith(kind, extraText) {
  const n = { id: uid(), k: 'note', text: extraText || '', c: Date.now(), color: '', pin: false, arch: false, media: [] };
  const made = () => document.dispatchEvent(new CustomEvent('myndvs:cap', { detail: { k: 'media', id: n.id } }));
  if (kind === 'rec') record(async (b, dur) => { await addMedia(n, 'audio', b, { dur: Math.round(dur) }); await save(n); made(); toast('Audio guardado'); });
  else if (kind === 'dibu') drawPad(null, async b => { await addMedia(n, 'draw', b); await save(n); made(); toast('Dibujo guardado'); });
  else if (kind === 'foto') pickImages(async files => { for (const f of files) await addMedia(n, 'img', await shrink(f)); await save(n); made(); toast(files.length > 1 ? `${files.length} imágenes guardadas` : 'Imagen guardada'); });
}
let pickCb = null;
function pickImages(cb) { pickCb = cb; const i = $('#fileIn'); i.value = ''; i.click(); }
$('#fileIn').onchange = e => { const fs = [...e.target.files]; if (fs.length && pickCb) pickCb(fs); pickCb = null; };

/* ---------- Google Calendar y Tasks ---------- */
const GSCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks';
let gTok = null;
try { gTok = JSON.parse(sessionStorage.getItem('myndvs-gtok') || 'null'); } catch (e) { gTok = null; }
function loadGis() {
  return new Promise((res, rej) => {
    if (window.google && google.accounts && google.accounts.oauth2) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('gis')); document.head.appendChild(s);
  });
}
async function getToken(inter) {
  if (gTok && gTok.exp > Date.now() + 60000) return gTok.v;
  if (!inter) return null;
  if (!gCid()) throw new Error('cid');
  await loadGis();
  return new Promise((res, rej) => {
    const c = google.accounts.oauth2.initTokenClient({
      client_id: gCid(), scope: GSCOPE, include_granted_scopes: true,
      callback: r => {
        if (r.error) return rej(new Error(r.error));
        gTok = { v: r.access_token, exp: Date.now() + (Number(r.expires_in || 3600) - 60) * 1000 };
        try { sessionStorage.setItem('myndvs-gtok', JSON.stringify(gTok)); } catch (e) { /* nada */ }
        res(gTok.v);
      },
      error_callback: e => rej(new Error((e && e.type) || 'popup'))
    });
    c.requestAccessToken({ prompt: cfg.gforce ? 'consent' : '' }); cfg.gforce = false;
  });
}
async function gapi(url, opt, inter, again) {
  const tok = await getToken(inter);
  if (!tok) throw new Error('notoken');
  const r = await fetch(url, Object.assign({}, opt, { headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' } }));
  if (r.status === 401) { gTok = null; try { sessionStorage.removeItem('myndvs-gtok'); } catch (e) { /* nada */ } if (inter && !again) return gapi(url, opt, inter, true); throw new Error('401'); }
  if (!r.ok) { const e = new Error('g' + r.status); e.status = r.status; e.api = url.includes('tasks.googleapis') ? 'tasks' : 'calendar'; try { e.why = JSON.stringify(await r.json()); } catch (x) { /* nada */ } throw e; }
  return r.status === 204 ? null : r.json();
}
const CAL = 'https://www.googleapis.com/calendar/v3', TSK = 'https://tasks.googleapis.com/tasks/v1';
function gErr(e) {
  const m = String(e && e.message || e);
  return m === 'cid' ? 'Falta el ID de cliente de Google'
    : m === 'notoken' ? 'Tocá Sincronizar para conectar con Google'
    : /popup/.test(m) ? 'Se cerró o se bloqueó la ventana de Google'
    : m === 'access_denied' ? 'No le diste permiso a Google'
    : m === '401' ? 'Se venció el permiso de Google: tocá Sincronizar'
    : m === 'g403' ? g403(e)
    : m === 'gis' || m === 'Failed to fetch' ? 'Sin conexión con Google'
    : (cfg.gwhy = ((e && e.api) || '') + ' ' + String((e && e.why) || '').slice(0, 400), 'Error de Google (' + m + ')');
}
// un 403 de Google puede ser la API apagada en el proyecto o un permiso que no se marcó al conectar
const API_N = { calendar: 'Google Calendar API', tasks: 'Google Tasks API' };
function g403(e) {
  const w = (e && e.why) || '';
  cfg.gwhy = (e.api || '') + ' ' + w.slice(0, 400);
  const api = API_N[e && e.api] || 'la API';
  if (/SERVICE_DISABLED|accessNotConfigured|has not been used|is disabled/i.test(w)) { cfg.gfix = { k: 'api', api: e.api }; return `La ${api} está apagada en tu proyecto de Google Cloud: tocá "Habilitarla" en Ajustes, esperá 1 minuto y sincronizá.`; }
  if (/SCOPE_INSUFFICIENT|insufficientPermissions|insufficient authentication scopes/i.test(w)) { cfg.gfix = { k: 'scope', api: e.api }; gTok = null; try { sessionStorage.removeItem('myndvs-gtok'); } catch (x) { /* nada */ } return `Al conectar no quedó marcado el permiso de ${e.api === 'tasks' ? 'Tareas' : 'Calendario'}: tocá "Volver a conectar" en Ajustes y marcá todas las casillas.`; }
  if (/rateLimit|quota/i.test(w)) return 'Google pidió esperar un ratito: probá de nuevo en un minuto.';
  cfg.gfix = { k: 'other', api: e && e.api };
  let msg = ''; try { msg = JSON.parse(w).error.message; } catch (x) { /* nada */ }
  return `Google no dejó usar ${api}${msg ? ': ' + msg.slice(0, 140) : ''}`;
}
const dayCompact = k => k.replace(/-/g, '');
function toGEvent(e) {
  const o = { summary: e.title, description: e.notes || '', extendedProperties: { private: { myndvs: '1', lbk: e.lb || 'auto', color: e.color || '' } } };
  if (e.start) { o.start = { dateTime: `${e.date}T${e.start}:00`, timeZone: TZ }; o.end = { dateTime: `${e.date}T${e.end || plusHour(e.start)}:00`, timeZone: TZ }; }
  else { o.start = { date: e.date }; o.end = { date: addDays(e.date, 1) }; }
  if (e.rep) {
    const F = { d: 'DAILY', w: 'WEEKLY', m: 'MONTHLY', y: 'YEARLY' }[e.rep];
    const BD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    let r = 'RRULE:FREQ=' + F;
    if (e.rep === 'w' && e.days && e.days.length) r += ';BYDAY=' + e.days.map(d => BD[d]).join(',');
    if (e.until) r += ';UNTIL=' + dayCompact(e.until) + (e.start ? 'T235959Z' : '');
    o.recurrence = [r].concat((e.ex || []).map(k => e.start ? `EXDATE;TZID=${TZ}:${dayCompact(k)}T${e.start.replace(':', '')}00` : `EXDATE;VALUE=DATE:${dayCompact(k)}`));
  } else o.recurrence = [];
  return o;
}
const localDT = s => { const d = new Date(s); return { date: dk(d), time: d.toTimeString().slice(0, 5) }; };
function fromGEvent(g, base) {
  const e = base || { id: uid(), k: 'ev', c: Date.now() };
  e.gid = g.id; e.title = g.summary || '(Sin título)'; e.notes = g.description || '';
  const pv = (g.extendedProperties && g.extendedProperties.private) || {};
  if (['auto', 'p', 's', 'i'].includes(pv.lbk)) e.lb = pv.lbk; if (pv.color !== undefined) e.color = NCOL.includes(pv.color) ? pv.color : '';
  if (g.start.date) { e.date = g.start.date; e.start = null; e.end = null; }
  else { const a = localDT(g.start.dateTime), b = localDT(g.end.dateTime); e.date = a.date; e.start = a.time; e.end = b.date === a.date ? b.time : '23:59'; }
  e.rep = ''; e.days = []; e.until = ''; e.ex = [];
  for (const line of g.recurrence || []) {
    if (line.startsWith('RRULE:')) {
      const kv = Object.fromEntries(line.slice(6).split(';').map(x => x.split('=')));
      e.rep = { DAILY: 'd', WEEKLY: 'w', MONTHLY: 'm', YEARLY: 'y' }[kv.FREQ] || '';
      if (kv.BYDAY && e.rep === 'w') e.days = kv.BYDAY.split(',').map(x => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(x.slice(-2))).filter(x => x >= 0);
      if (kv.UNTIL) e.until = `${kv.UNTIL.slice(0, 4)}-${kv.UNTIL.slice(4, 6)}-${kv.UNTIL.slice(6, 8)}`;
      if (kv.INTERVAL && kv.INTERVAL !== '1') e.cplx = true;
    } else if (line.startsWith('EXDATE')) {
      line.split(':')[1].split(',').forEach(v => e.ex.push(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`));
    }
  }
  e.lb = e.lb || 'auto'; e.dirty = false;
  return e;
}
const byGid = gid => [...ITEMS.values()].find(x => x.k === 'ev' && x.gid === gid);
const byTid = tid => [...ITEMS.values()].find(x => x.k === 'task' && x.tid === tid);

async function calPush(inter) {
  for (const e of [...ITEMS.values()].filter(x => x.k === 'ev' && x.dirty && !x.ro)) {
    if (e.del) { if (e.gid) { try { await gapi(`${CAL}/calendars/primary/events/${encodeURIComponent(e.gid)}`, { method: 'DELETE' }, inter); } catch (x) { if (x.status !== 404 && x.status !== 410) throw x; } } await drop(e.id); continue; }
    const body = JSON.stringify(toGEvent(e));
    let g;
    if (e.gid) { try { g = await gapi(`${CAL}/calendars/primary/events/${encodeURIComponent(e.gid)}`, { method: 'PATCH', body }, inter); } catch (x) { if (x.status === 404 || x.status === 410) e.gid = null; else throw x; } }
    if (!e.gid) g = await gapi(`${CAL}/calendars/primary/events`, { method: 'POST', body }, inter);
    e.gid = g.id; e.dirty = false; await DB.put('items', e);
  }
}
async function calPull(inter) {
  let page = '', token = cfg.gsync, guard = 0;
  const items = [];
  const min = new Date(); min.setMonth(min.getMonth() - 6);
  for (;;) {
    let url = `${CAL}/calendars/primary/events?maxResults=2500&singleEvents=false`;
    url += token ? '&syncToken=' + encodeURIComponent(token) : '&timeMin=' + encodeURIComponent(min.toISOString());
    if (page) url += '&pageToken=' + encodeURIComponent(page);
    let j;
    try { j = await gapi(url, {}, inter); }
    catch (x) { if (x.status === 410 && token) { cfg.gsync = ''; token = ''; page = ''; items.length = 0; continue; } throw x; }
    items.push(...(j.items || []));
    if (j.nextPageToken && ++guard < 20) { page = j.nextPageToken; continue; }
    cfg.gsync = j.nextSyncToken || ''; break;
  }
  items.sort((a, b) => (a.recurringEventId ? 1 : 0) - (b.recurringEventId ? 1 : 0));
  let n = 0;
  for (const g of items) {
    const loc = byGid(g.id);
    if (g.recurringEventId) {
      // una fecha de un evento que se repite: se borró o se movió
      const m = byGid(g.recurringEventId), os = g.originalStartTime || {};
      const ok = os.date || (os.dateTime ? localDT(os.dateTime).date : '');
      if (m && ok && !(m.ex || []).includes(ok)) { m.ex = (m.ex || []).concat(ok); await DB.put('items', m); }
      if (g.status === 'cancelled') { if (loc && !loc.dirty) await drop(loc.id); continue; }
      if (loc && loc.dirty) continue;
      const e = fromGEvent(g, loc);
      e.inst = true; e.u = Date.now(); ITEMS.set(e.id, e); await DB.put('items', e); n++;
      continue;
    }
    if (g.status === 'cancelled') { if (loc && !loc.dirty) { await drop(loc.id); n++; } continue; }
    if (loc && loc.dirty) continue; // lo de acá gana: se sube en la próxima
    const e = fromGEvent(g, loc);
    e.u = Date.now(); ITEMS.set(e.id, e); await DB.put('items', e); n++;
  }
  return n;
}
function toGTask(t) {
  const mk = t.lb && t.lb !== 'auto' ? `\n[lb:${t.lb}]` : '';
  return { title: t.title, notes: (t.notes || '').replace(/\n?\[lb:[psi]\]/g, '') + mk, due: t.due ? t.due + 'T00:00:00.000Z' : null, status: t.done ? 'completed' : 'needsAction' };
}
async function taskPush(inter) {
  for (const t of [...ITEMS.values()].filter(x => x.k === 'task' && x.dirty)) {
    const base = `${TSK}/lists/${encodeURIComponent(t.lid || '@default')}/tasks`;
    if (t.del) { if (t.tid) { try { await gapi(`${base}/${encodeURIComponent(t.tid)}`, { method: 'DELETE' }, inter); } catch (x) { if (x.status !== 404) throw x; } } await drop(t.id); continue; }
    const body = JSON.stringify(toGTask(t));
    let r;
    if (t.tid) { try { r = await gapi(`${base}/${encodeURIComponent(t.tid)}`, { method: 'PATCH', body }, inter); } catch (x) { if (x.status === 404) t.tid = null; else throw x; } }
    if (!t.tid) r = await gapi(`${TSK}/lists/@default/tasks`, { method: 'POST', body }, inter);
    t.tid = r.id; t.lid = t.lid || '@default'; t.dirty = false; await DB.put('items', t);
  }
}
async function taskPull(inter) {
  const seen = new Set(); let page = '', guard = 0, n = 0;
  do {
    const j = await gapi(`${TSK}/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100${page ? '&pageToken=' + page : ''}`, {}, inter);
    for (const k of j.items || []) {
      if (k.deleted || !k.title || !k.title.trim()) continue;
      seen.add(k.id);
      let t = byTid(k.id);
      if (t && t.dirty) continue;
      if (!t) { if (k.status === 'completed' && k.completed && Date.now() - Date.parse(k.completed) > 30 * 864e5) continue; t = { id: uid(), k: 'task', c: Date.now(), tid: k.id, lid: '@default' }; }
      const mk = (k.notes || '').match(/\[lb:([psi])\]/);
      Object.assign(t, { title: k.title, notes: (k.notes || '').replace(/\n?\[lb:[psi]\]/g, ''), due: k.due ? k.due.slice(0, 10) : null, done: k.status === 'completed', doneAt: k.completed ? Date.parse(k.completed) : 0, lb: mk ? mk[1] : 'auto', dirty: false, u: Date.now() });
      ITEMS.set(t.id, t); await DB.put('items', t); n++;
    }
    page = j.nextPageToken || '';
  } while (page && ++guard < 10);
  for (const t of [...ITEMS.values()].filter(x => x.k === 'task' && x.tid && !x.dirty && (x.lid || '@default') === '@default' && !seen.has(x.tid))) await drop(t.id);
  return n;
}
let gBusy = false, gT = null;
function gSoon() { if (!gCid()) return; clearTimeout(gT); gT = setTimeout(() => gsync(false), 3000); syncDot(); }
async function gsync(inter) {
  if (!gCid()) { if (inter) openSettings(); return; }
  if (gBusy) return; gBusy = true; syncDot();
  // calendario y tareas por separado: si una falla, la otra igual se sincroniza
  const errs = [];
  for (const part of [async () => { await calPush(inter); await calPull(inter); }, async () => { await taskPush(inter); await taskPull(inter); }]) {
    try { await part(); } catch (e) { errs.push(e); if (String(e && e.message) === 'notoken' || /popup|access_denied|cid/.test(String(e && e.message))) break; }
  }
  if (!errs.length) { cfg.glast = Date.now(); cfg.gerr = ''; cfg.gfix = null; cfg.gwhy = ''; if (inter) toast('Google al día'); }
  else {
    const e = errs[0], m = String(e && e.message);
    if (m === 'notoken' && !inter) cfg.gerr = 'notoken';
    else { cfg.gwhy = ''; cfg.gerr = errs.map(gErr).filter((x, i, a) => a.indexOf(x) === i).join(' · '); if (errs.length < 2 && m.startsWith('g')) cfg.glast = Date.now(); if (inter) toast(cfg.gerr); }
  }
  saveCfg(); gBusy = false; bridge(); if ($('#sheet').hidden) render(); else syncDot();
}

/* ---------- nube de notas: Gist privado (texto) + Gist de archivos ---------- */
const GFILE = 'myndvs.json', MFILE = 'myndvs-media.json';
async function gh(path, opt) {
  const r = await fetch('https://api.github.com' + path, Object.assign({}, opt, { headers: { Authorization: 'Bearer ' + ghTok(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }));
  if (!r.ok) { const e = new Error('gh' + r.status); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}
async function findGists() {
  if (cfg.gist && cfg.mgist && cfg.login) return;
  for (let p = 1; p <= 5 && !(cfg.gist && cfg.mgist); p++) {
    const L = await gh(`/gists?per_page=100&page=${p}`);
    for (const g of L) { if (g.files[GFILE]) cfg.gist = g.id; if (g.files[MFILE]) cfg.mgist = g.id; if (g.owner) cfg.login = g.owner.login; }
    if (L.length < 100) break;
  }
  if (!cfg.login) cfg.login = (await gh('/user')).login;
  if (!cfg.gist) cfg.gist = (await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Myndvs: notas y diario (no borrar)', public: false, files: { [GFILE]: { content: '{"v":1,"notes":[]}' } } }) })).id;
  if (!cfg.mgist) cfg.mgist = (await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Myndvs: audios, imágenes y dibujos (no borrar)', public: false, files: { [MFILE]: { content: '{"v":1}' } } }) })).id;
  saveCfg();
}
const cleanNote = n => { const o = Object.assign({}, n); for (const k of Object.keys(o)) if (k[0] === '_') delete o[k]; return o; };
let cBusy = false, cT = null;
async function readRemote() {
  await findGists();
  let g;
  try { g = await gh('/gists/' + cfg.gist); }
  catch (e) { if (e.status !== 404) throw e; cfg.gist = ''; cfg.mgist = ''; cfg.up = []; await findGists(); g = await gh('/gists/' + cfg.gist); } // la borró otro aparato
  const f = g.files[GFILE];
  return f ? JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content) : { notes: [] };
}
async function remoteLock() { const r = await readRemote(); return r.lock || null; }
// borra los Gists y los vuelve a crear (al poner o sacar la contraseña, así no queda nada viejo en el historial del Gist)
async function cloudRestart() {
  for (const id of [cfg.gist, cfg.mgist]) if (id) { try { await gh('/gists/' + id, { method: 'DELETE' }); } catch (e) { /* ya no estaba */ } }
  cfg.gist = ''; cfg.mgist = ''; cfg.up = []; cfg.mdel = []; saveCfg();
  await cloudSync(false);
}
function cloudSoon() { if (!ghTok()) return; clearTimeout(cT); cT = setTimeout(() => cloudSync(false), 15000); syncDot(); }
async function cloudSync(inter) {
  if (!ghTok()) { if (inter) openSettings(); return; }
  if (cBusy) return; cBusy = true; syncDot();
  try {
    const remote = await readRemote();
    if (remote.lock && !CK) { cfg.rlock = remote.lock; throw Object.assign(new Error('rlock'), { status: 'rlock' }); }
    if (remote.lock && CK && remote.lock.salt !== cfg.lock.salt) throw Object.assign(new Error('rsalt'), { status: 'rsalt' });
    if (remote.enc) remote.notes = JSON.parse(await LOCK.decStr(CK, remote.enc));
    let pulled = 0;
    for (const raw of remote.notes || []) {
      const rn = clean(raw); if (!rn || (rn.k !== 'note' && rn.k !== 'diary')) continue;
      const ln = ITEMS.get(rn.id);
      if (!ln || (rn.u || 0) > (ln.u || 0)) { ITEMS.set(rn.id, rn); await DB.put('items', rn); pulled++; }
    }
    const up = new Set([...(cfg.up || []), ...(remote.up || [])]);
    // borrar de la nube los archivos de notas borradas para siempre
    if ((cfg.mdel || []).length) {
      const files = {}; cfg.mdel.forEach(id => { files['m-' + id] = null; up.delete(id); });
      try { await gh('/gists/' + cfg.mgist, { method: 'PATCH', body: JSON.stringify({ files }) }); } catch (e) { if (e.status !== 422) throw e; }
      cfg.mdel = [];
    }
    // subir archivos nuevos (de a uno)
    const have = new Set(await DB.keys('blobs'));
    for (const n of notes()) for (const m of n.media || []) {
      if (up.has(m.id) || !have.has(m.id)) continue;
      const b = await DB.get('blobs', m.id); if (!b) continue;
      const data = await blobToData(b);
      await gh('/gists/' + cfg.mgist, { method: 'PATCH', body: JSON.stringify({ files: { ['m-' + m.id]: { content: CK ? 'enc1:' + await LOCK.encStr(CK, data) : data } } }) });
      up.add(m.id);
    }
    cfg.up = [...up];
    // bajar archivos que faltan en este aparato
    for (const n of notes()) for (const m of n.media || []) {
      if (have.has(m.id) || !up.has(m.id)) continue;
      try {
        const r = await fetch(`https://gist.githubusercontent.com/${cfg.login}/${cfg.mgist}/raw/m-${m.id}?t=${Date.now()}`);
        if (r.ok) {
          let t = await r.text();
          if (t.startsWith('enc1:')) { if (!CK) continue; t = await LOCK.decStr(CK, t.slice(5)); }
          if (!/^data:(image|audio)\/[\w.+-]+(;[\w=.+-]+)*;base64,/.test(t)) continue;
          await DB.put('blobs', await dataToBlob(t), m.id); have.add(m.id);
        }
      } catch (e) { /* la próxima */ }
    }
    // subir el índice si cambió algo
    const mine = [...ITEMS.values()].filter(x => x.k === 'note' || x.k === 'diary').map(cleanNote);
    const rmap = new Map((remote.notes || []).map(x => [x.id, x.u || 0]));
    const differs = mine.length !== rmap.size || mine.some(x => rmap.get(x.id) !== (x.u || 0)) || (remote.up || []).length !== up.size;
    if (differs || (CK && !remote.lock)) {
      const body = CK ? { v: 2, u: Date.now(), up: [...up], lock: cfg.lock, enc: await LOCK.encStr(CK, JSON.stringify(mine)) } : { v: 1, u: Date.now(), up: [...up], notes: mine };
      await gh('/gists/' + cfg.gist, { method: 'PATCH', body: JSON.stringify({ files: { [GFILE]: { content: JSON.stringify(body) } } }) });
    }
    cfg.clast = Date.now(); cfg.cerr = '';
    if (inter) toast(pulled ? `Nube al día (${pulled} nota${pulled === 1 ? '' : 's'} nueva${pulled === 1 ? '' : 's'})` : 'Nube al día');
  } catch (e) { cfg.cerr = e.status === 'rlock' ? 'Tu nube está protegida con contraseña: activá la misma en Ajustes → Contraseña' : e.status === 'rsalt' ? 'En otro aparato la nube tiene otra contraseña' : e.status === 401 ? 'El token de GitHub no sirve o se venció' : e.status === 403 || e.status === 404 ? 'El token no tiene permiso de "gist"' : 'Sin conexión con GitHub'; if (inter) toast(cfg.cerr); }
  saveCfg(); cBusy = false; if ($('#sheet').hidden) render(); else syncDot();
}
async function purgeTrash(all) {
  const lim = Date.now() - 30 * 864e5;
  for (const n of [...ITEMS.values()].filter(x => x.k === 'note' && x.del && !x.gone && (all || x.del < lim))) {
    for (const m of n.media || []) { await DB.del('blobs', m.id); if ((cfg.up || []).includes(m.id)) cfg.mdel.push(m.id); }
    Object.assign(n, { gone: true, text: '', media: [] }); await save(n, { quiet: true });
  }
  saveCfg();
}

/* ---------- puente con Lifebgood: le deja un resumen en el mismo navegador ---------- */
function bridge() {
  try {
    const t = today(), end = addDays(t, 7);
    const ev = []; for (let k = t; k <= end; k = addDays(k, 1)) evOn(k).forEach(e => ev.push({ id: e.id, gid: e.gid || '', title: e.title, date: k, time: e.start, lb: e.lb || 'auto' }));
    const tk = tasks().filter(x => !x.done && (!x.due || x.due <= end)).map(x => ({ id: x.id, tid: x.tid || '', title: x.title, date: x.due, lb: x.lb || 'auto' }));
    localStorage.setItem('myndvs-bridge', JSON.stringify({ v: 1, at: Date.now(), ev, tk, notes: notes().filter(n => !n.del).length }));
  } catch (e) { /* nada */ }
}

/* ---------- indicador de sincronización ---------- */
function syncDot() {
  const d = $('#syncDot'); if (!d) return;
  const dirty = [...ITEMS.values()].some(x => x.dirty);
  const on = gCid() || ghTok();
  d.className = 'dot ' + (gBusy || cBusy ? 'busy' : !on ? 'off' : (cfg.gerr && cfg.gerr !== 'notoken') || cfg.cerr ? 'err' : dirty || cfg.gerr === 'notoken' ? 'pend' : 'ok');
  $('#syncBtn').title = gBusy || cBusy ? 'Sincronizando…' : !on ? 'Sin conectar' : cfg.gerr === 'notoken' ? 'Tocá para conectar con Google' : cfg.gerr || cfg.cerr || 'Sincronizado';
}

/* ---------- ajustes ---------- */
function openSettings() {
  const lbHas = !!lbCid(), tokAuto = !cfg.ghtok && !!ghTok();
  openSheet(`<div class="form">
    <div class="edbar"><button class="ib" data-a="close" aria-label="Cerrar">${ICO.back}</button><h2>Ajustes</h2></div>
    <section class="card" id="cardG"><h3>Google Calendar y Tasks</h3>
      ${gCid() ? `<p class="mute">${cfg.gcid ? 'ID de cliente propio guardado.' : 'Encontré el ID de cliente de Lifebgood en este navegador y lo uso.'} ${cfg.glast ? 'Última sincronización ' + ago(cfg.glast) + '.' : 'Todavía no sincronizaste.'}</p>
        ${cfg.gerr && cfg.gerr !== 'notoken' ? `<p class="warn">⚠ ${esc(cfg.gerr)}</p>${cfg.gwhy ? `<details class="guide"><summary>Detalle técnico (para pasárselo a Claude)</summary><code>${esc(cfg.gwhy)}</code></details>` : ''}` : ''}
        ${cfg.gfix && cfg.gfix.k === 'api' ? `<div class="btns"><a class="primary" href="https://console.cloud.google.com/apis/library/${cfg.gfix.api === 'tasks' ? 'tasks' : 'calendar-json'}.googleapis.com" target="_blank" rel="noopener">Habilitarla en Google Cloud</a></div><p class="mute small">Se abre con tu Gmail: elegí arriba el proyecto <b>Lifebgood</b> y tocá <b>Habilitar</b>. Después volvé y tocá Sincronizar.</p>` : ''}
        <div class="btns"><button class="primary" data-a="gsync">Sincronizar ahora</button><button class="ghost" data-a="greconnect">Volver a conectar</button>${cfg.gcid ? '<button class="ghost" data-a="gforget">Quitar ID</button>' : ''}</div>
        <p class="mute small">Se sincroniza tu calendario principal y tu lista de tareas principal. Los avisos del celu los sigue dando Google Calendar.</p>`
      : `<p class="mute">Pegá el <b>ID de cliente</b> de tu proyecto de Google Cloud. Es el mismo de Lifebgood: sirve tal cual porque las dos apps están en el mismo sitio.</p>
        <div class="row"><input id="gcidIn" placeholder="…apps.googleusercontent.com" autocomplete="off"><button class="primary" data-a="gcidSave">Guardar</button></div>`}
      <details class="guide"${gCid() ? '' : ' open'}><summary>¿Dónde lo consigo?</summary><ol>
        <li>Abrí <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud → Credenciales</a> con tu Gmail. Arriba, elegí el proyecto <b>Lifebgood</b>.</li>
        <li>En <b>IDs de clientes de OAuth 2.0</b> tocá el que creaste (tipo <i>Aplicación web</i>).</li>
        <li>Copiá el <b>ID de cliente</b> (termina en <code>.apps.googleusercontent.com</code>). No es secreto: no hace falta el "secreto del cliente".</li>
        <li>Fijate que en <b>Orígenes autorizados de JavaScript</b> esté <code>https://klasito7.github.io</code> (ya está si Lifebgood te funciona).</li>
        <li>En <a href="https://console.cloud.google.com/apis/library/tasks.googleapis.com" target="_blank" rel="noopener">Biblioteca</a> tienen que estar habilitadas <b>Google Calendar API</b> y <b>Google Tasks API</b>.</li>
        <li>Pegalo acá arriba → <b>Guardar</b>. Se abre la ventana de Google: elegí tu cuenta y, si dice "Google no verificó esta app", tocá <b>Continuar</b> (es tu propia app).</li>
      </ol>${gCid() && !cfg.gcid ? '<p class="mute small">¿Querés usar otro ID? <button class="link" data-a="gOwn">Pegar uno propio</button></p>' : ''}</details>
      ${ORIGIN_OK ? '' : '<p class="warn small">Esta vista previa no está en klasito7.github.io, así que Google no la va a dejar entrar. Funciona desde la versión publicada en GitHub Pages.</p>'}
    </section>
    <section class="card" id="cardC"><h3>Nube para notas, diario, audios e imágenes</h3>
      ${ghTok() ? `<p class="mute">${tokAuto ? 'Encontré el token de GitHub de Lifebgood/FUNVS en este navegador y lo uso.' : 'Token propio guardado.'} ${cfg.clast ? 'Última copia ' + ago(cfg.clast) + '.' : ''}</p>
        ${cfg.cerr ? `<p class="warn">⚠ ${esc(cfg.cerr)}</p>` : ''}
        <div class="btns"><button class="primary" data-a="csync">Sincronizar ahora</button>${cfg.ghtok ? '<button class="ghost" data-a="cforget">Quitar token</button>' : ''}</div>
        <p class="mute small">Se guardan en dos Gists privados de tu cuenta (texto y archivos). Así lo que anotás en el celu aparece en la compu.</p>`
      : `<p class="mute">Pegá un <b>token de GitHub</b> con permiso <b>gist</b>. Sirve el mismo de FUNVS y Lifebgood.</p><div class="row"><input id="ghIn" placeholder="ghp_… o github_pat_…" autocomplete="off"><button class="primary" data-a="ghSave">Guardar</button></div>`}
      <details class="guide"${ghTok() ? '' : ' open'}><summary>¿Dónde lo consigo?</summary><ol>
        <li>Si lo tenés guardado (el de FUNVS), pegalo y listo. GitHub muestra cada token una sola vez, así que si no lo tenés, hacé uno nuevo:</li>
        <li>Abrí <a href="https://github.com/settings/tokens/new?scopes=gist&description=Myndvs" target="_blank" rel="noopener">GitHub → token nuevo</a> (ya viene con el permiso <b>gist</b> marcado y el nombre "Myndvs").</li>
        <li>En <b>Expiration</b> elegí <b>No expiration</b> (o la fecha que quieras; cuando venza, hacés otro).</li>
        <li>No marques nada más: solo <b>gist</b>. Abajo de todo: <b>Generate token</b>.</li>
        <li>Copiá el token (empieza con <code>ghp_</code>) y pegalo acá arriba → <b>Guardar</b>. Guardalo también en un lugar seguro para tus otros aparatos.</li>
      </ol><p class="mute small">El token solo puede tocar tus Gists: no tus repos ni tu cuenta. Queda guardado en este navegador, nada más.</p>${ghTok() && !cfg.ghtok ? '<p class="mute small">¿Querés usar otro token? <button class="link" data-a="ghOwn">Pegar uno propio</button></p>' : ''}</details>
    </section>
    <section class="card" id="cardL"><h3>Contraseña</h3>
      ${cfg.lock ? `<p class="mute">Activada: todo lo que guardás (en este aparato, en la nube y en las copias) está cifrado. Se pide una vez por día.</p>
        <div class="btns"><button class="primary" data-a="lockNow">Bloquear ahora</button><button class="ghost" data-a="lockOff">Quitar contraseña</button></div>`
      : `<p class="mute">Cifra notas, diario, audios, imágenes y dibujos con una contraseña que se pide una vez por día. Ni GitHub ni nadie puede leer tu nube sin ella.</p>
        ${cfg.rlock ? '<p class="warn small">Tu nube ya está protegida desde otro aparato: poné la misma contraseña.</p>' : ''}
        <div class="row"><input type="password" id="lkA" placeholder="Contraseña (mínimo 8)" autocomplete="new-password"></div>
        <div class="row"><input type="password" id="lkB" placeholder="Repetila" autocomplete="new-password"><button class="primary" data-a="lockOn">Activar</button></div>
        <p class="warn small">Si te la olvidás no hay forma de recuperar lo cifrado. Anotala en un lugar seguro.</p>`}
    </section>
    <section class="card"><h3>Copia de seguridad</h3><p class="mute">Un archivo con todo (incluye audios, imágenes y dibujos)${cfg.lock ? ', cifrado con tu contraseña' : ''}.</p>
      <div class="btns"><button class="ghost" data-a="export">Exportar</button><button class="ghost" data-a="import">Importar</button></div></section>
    <section class="card"><h3>Lifebgood</h3><p class="mute">${lbState() ? 'Conectado: ves tu nivel en Hoy, y lo que agendás acá le llega como misión (por Google). En cada evento o tarea elegís si es Principal, Secundaria o Solo aviso.' : 'Abrí Lifebgood una vez en este navegador y se conectan solas.'}</p></section>
    <section class="card"><h3>Tutorial</h3><p class="mute">Un recorrido interactivo por todo lo que hace la app.</p>
      <div class="btns"><button class="primary" data-a="tour">Ver el tutorial completo</button>${+(localStorage.getItem('myndvs-tour') || 0) < TOUR_V ? '<button class="ghost" data-a="tourNew">Solo las novedades</button>' : ''}</div></section>
    <p class="mute small center">Myndvs v${APP_V} · ${notes().filter(n => !n.del).length} notas · ${diary().length} días de diario · ${events().length} eventos · ${tasks().length} tareas</p>
  </div>`);
}
async function exportAll() {
  toast('Armando la copia…');
  const blobs = {};
  for (const k of await DB.keys('blobs')) blobs[k] = await blobToData(await DB.get('blobs', k));
  const inner = JSON.stringify({ items: [...ITEMS.values()], blobs });
  const data = JSON.stringify(CK ? { app: 'Myndvs', v: 2, at: Date.now(), lock: cfg.lock, enc: await LOCK.encStr(CK, inner) } : Object.assign({ app: 'Myndvs', v: 1, at: Date.now() }, JSON.parse(inner)));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = `myndvs-${today()}.json`; a.click();
}
async function importAll(file) {
  try {
    let d = JSON.parse(await file.text()); if (d.app !== 'Myndvs' && d.app !== 'Mente') throw new Error('x');
    if (d.enc) {
      if (!CK || !cfg.lock || d.lock.salt !== cfg.lock.salt) { toast('Esa copia está cifrada con otra contraseña'); return; }
      d = JSON.parse(await LOCK.decStr(CK, d.enc));
    }
    let n = 0;
    for (const raw of d.items || []) { const it = clean(raw); if (!it) continue; const l = ITEMS.get(it.id); if (!l || (it.u || 0) > (l.u || 0)) { ITEMS.set(it.id, it); await DB.put('items', it); n++; } }
    for (const [k, v] of Object.entries(d.blobs || {})) if (RX.id.test(k) && /^data:(image|audio)\//.test(v) && !(await DB.get('blobs', k))) await DB.put('blobs', await dataToBlob(v), k);
    toast(`Importado: ${n} cosas`); render();
  } catch (e) { toast('Ese archivo no es una copia de Myndvs'); }
}

/* ---------- toast ---------- */
let toastT = null;
function toast(msg, act) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${act ? `<button class="link">${esc(act.label)}</button>` : ''}`; t.hidden = false;
  if (act) $('button', t).onclick = () => { t.hidden = true; act.fn(); };
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, act ? 5000 : 2200);
}

/* ---------- clics ---------- */
document.addEventListener('click', async e => {
  const tb = e.target.closest('#tabs button');
  if (tb) { tab = tb.dataset.tab; query = ''; $('#searchBox').hidden = true; $('#brand').hidden = false; capOver = null; render(); $('#view').scrollTop = 0; window.scrollTo(0, 0); return; }
  if (e.target.closest('[data-stop]') && !e.target.closest('[data-a=play]')) { e.stopPropagation(); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id;
  switch (a) {
    case 'capmode': { const order = ['note', 'task', 'ev'], cur = capMode($('#capIn').value); capOver = order[(order.indexOf(cur) + 1) % 3]; capUI(); $('#capIn').focus(); break; }
    case 'rec': case 'foto': case 'dibu': { const v = $('#capIn').value.trim(); $('#capIn').value = ''; capUI(); newNoteWith(a, v); break; }
    case 'search': { const open = $('#searchBox').hidden; $('#searchBox').hidden = !open; $('#brand').hidden = open; if (open) $('#searchIn').focus(); else { query = ''; $('#searchIn').value = ''; render(); } break; }
    case 'settings': openSettings(); break;
    case 'sync': if (!gCid() && !ghTok()) openSettings(); else { gsync(true); cloudSync(false); } break;
    case 'close': closeSheet(); break;
    case 'openNote': { const n = ITEMS.get(id); if (n && !e.target.closest('a,input,.aud')) noteEditor(n); break; }
    case 'nck': { e.stopPropagation(); const n = ITEMS.get(id); if (!n) break; const L = n.text.split('\n'), i = +b.dataset.l; L[i] = L[i].replace(/^(\s*)\[( |x)\]/i, (m0, s, x) => `${s}[${x === ' ' ? 'x' : ' '}]`); n.text = L.join('\n'); await save(n); break; }
    case 'play': e.stopPropagation(); play(b.dataset.m, b); break;
    case 'nf': noteFilter = b.dataset.f; noteTag = ''; render(); break;
    case 'ntag': noteTag = noteTag === b.dataset.t ? '' : b.dataset.t; if (noteFilter === 'papelera') noteFilter = 'todas'; render(); break;
    case 'emptyTrash': await purgeTrash(true); render(); toast('Papelera vacía'); break;
    case 'pin': curNote.pin = !curNote.pin; b.setAttribute('aria-pressed', curNote.pin); curNote._dirty = true; break;
    case 'archive': { const arch = curNote.arch = !curNote.arch; curNote._dirty = true; await closeSheet(); toast(arch ? 'Archivada' : 'Volvió a tus notas'); break; }
    case 'trashNote': { const n = curNote; n.del = Date.now(); n._dirty = true; await closeSheet(); toast('A la papelera', { label: 'Deshacer', fn: async () => { delete n.del; await save(n); } }); break; }
    case 'restore': delete curNote.del; curNote._dirty = true; await closeSheet(); toast('Nota recuperada'); break;
    case 'killNote': { const n = curNote; sheetClose = null; for (const m of n.media || []) { await DB.del('blobs', m.id); if ((cfg.up || []).includes(m.id)) cfg.mdel.push(m.id); } saveCfg(); Object.assign(n, { gone: true, text: '', media: [] }); await save(n, { quiet: true }); await closeSheet(); toast('Borrada para siempre'); break; }
    case 'ncol': curNote.color = b.dataset.c; refreshNoteEditor(); break;
    case 'nlist': { const tx = $('#noteTx'), pos = tx.selectionStart, v = tx.value, ls = v.lastIndexOf('\n', pos - 1) + 1; tx.value = v.slice(0, ls) + '[ ] ' + v.slice(ls); tx.focus(); tx.selectionStart = tx.selectionEnd = pos + 4; break; }
    case 'nrec': record(async (bl, dur) => { await addMedia(curNote, 'audio', bl, { dur: Math.round(dur) }); refreshNoteEditor(); }); break;
    case 'nfoto': pickImages(async fs => { for (const f of fs) await addMedia(curNote, 'img', await shrink(f)); refreshNoteEditor(); }); break;
    case 'ndibu': drawPad(null, async bl => { await addMedia(curNote, 'draw', bl); refreshNoteEditor(); }); break;
    case 'editDraw': { const mid = b.dataset.m; drawPad(mid, async bl => { const m = curNote.media.find(x => x.id === mid), nid = uid(); await DB.put('blobs', bl, nid); m.id = nid; await DB.del('blobs', mid); const u = URLS.get(mid); if (u) { URL.revokeObjectURL(u); URLS.delete(mid); } if ((cfg.up || []).includes(mid)) { cfg.mdel.push(mid); saveCfg(); } refreshNoteEditor(); }); break; }
    case 'viewImg': viewImg(b.dataset.m); break;
    case 'rmMedia': { const mid = b.dataset.m; curNote.media = curNote.media.filter(x => x.id !== mid); await DB.del('blobs', mid); if ((cfg.up || []).includes(mid)) { cfg.mdel.push(mid); saveCfg(); } refreshNoteEditor(); break; }
    case 'openEv': { const ev = ITEMS.get(id); if (ev) evEditor(ev, b.dataset.day); break; }
    case 'newEv': evEditor({ id: uid(), k: 'ev', title: '', date: selDay, start: null, end: null, color: '', notes: '', rep: '', lb: 'auto', ex: [] }); break;
    case 'day': selDay = b.dataset.k; render(); break;
    case 'mprev': case 'mnext': { const [y, m] = calMonth.split('-').map(Number), d = new Date(y, m - 1 + (a === 'mnext' ? 1 : -1), 1); calMonth = dk(d).slice(0, 7); render(); break; }
    case 'mtoday': calMonth = today().slice(0, 7); selDay = today(); render(); break;
    case 'tick': toggleTask(id); break;
    case 'openTask': { const t = ITEMS.get(id); if (t) taskEditor(t); break; }
    case 'toggleDone': showDone = !showDone; render(); break;
    case 'gsync': await gsync(true); if (!$('#sheet').hidden) openSettings(); break;
    case 'greconnect': gTok = null; try { sessionStorage.removeItem('myndvs-gtok'); } catch (x) { /* nada */ } cfg.gforce = true; saveCfg(); await gsync(true); openSettings(); break;
    case 'csync': cloudSync(true); break;
    case 'gcidSave': { const v = ($('#gcidIn').value || '').trim().replace(/^https?:\/\//, ''); if (!/\.apps\.googleusercontent\.com$/.test(v)) { toast('Eso no parece un ID de cliente'); break; } cfg.gcid = v; saveCfg(); openSettings(); gsync(true); break; }
    case 'gforget': cfg.gcid = ''; cfg.gsync = ''; cfg.glast = 0; cfg.gerr = ''; gTok = null; try { sessionStorage.removeItem('myndvs-gtok'); } catch (x) { /* nada */ } saveCfg(); openSettings(); toast(lbCid() ? 'Desconectado (Lifebgood tiene su propio ID: se sigue usando)' : 'Google desconectado'); break;
    case 'ghSave': { const v = ($('#ghIn').value || '').trim(); if (!/^(ghp_|github_pat_|gho_)/.test(v)) { toast('Eso no parece un token de GitHub'); break; } cfg.ghtok = v; saveCfg(); openSettings(); cloudSync(true); break; }
    case 'gOwn': { const d = b.closest('details'); d.insertAdjacentHTML('beforeend', '<div class="row"><input id="gcidIn" placeholder="…apps.googleusercontent.com" autocomplete="off"><button class="primary" data-a="gcidSave">Guardar</button></div>'); b.parentElement.remove(); $('#gcidIn').focus(); break; }
    case 'ghOwn': { const d = b.closest('details'); d.insertAdjacentHTML('beforeend', '<div class="row"><input id="ghIn" placeholder="ghp_… o github_pat_…" autocomplete="off"><button class="primary" data-a="ghSave">Guardar</button></div>'); b.parentElement.remove(); $('#ghIn').focus(); break; }
    case 'cforget': cfg.ghtok = ''; saveCfg(); openSettings(); break;
    case 'export': exportAll(); break;
    case 'lockOn': {
      const a1 = $('#lkA').value, a2 = $('#lkB').value;
      if (a1.length < 8) { toast('Tiene que tener al menos 8 caracteres'); break; }
      if (a1 !== a2) { toast('Las dos no coinciden'); break; }
      b.disabled = true; b.textContent = 'Cifrando…';
      const err = await lockEnable(a1);
      if (err) { toast(err); b.disabled = false; b.textContent = 'Activar'; break; }
      cfg.rlock = null; saveCfg(); openSettings(); toast('Contraseña activada: todo quedó cifrado'); break;
    }
    case 'lockNow': lockNow(); break;
    case 'lockOff': { if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = 'Tocá de nuevo para quitarla'; break; } b.disabled = true; await lockDisable(); openSettings(); toast('Contraseña quitada'); break; }
    case 'import': $('#importIn').value = ''; $('#importIn').click(); break;
  }
});
$('#importIn').onchange = e => { const f = e.target.files[0]; if (f) importAll(f); };
$('#sheetBg').onclick = () => closeSheet();
$('#cap').onsubmit = e => { e.preventDefault(); const v = $('#capIn').value; $('#capIn').value = ''; capture(v); capUI(); };
$('#capIn').oninput = capUI;
$('#searchIn').oninput = e => { query = e.target.value; render(); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (recState) return; if (!$('#sheet').hidden) closeSheet(); else if (query) { query = ''; $('#searchIn').value = ''; $('#searchBox').hidden = true; $('#brand').hidden = false; render(); } }
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#capIn').focus(); }
});
window.addEventListener('storage', e => { if (e.key === 'lifebgood-v1' && tab === 'hoy' && $('#sheet').hidden) render(); });
window.addEventListener('online', () => { gSoon(); cloudSoon(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (cT) { clearTimeout(cT); cloudSync(false); } }
  else { if (gTok && gTok.exp > Date.now()) gsync(false); if (ghTok() && Date.now() - cfg.clast > 120000) cloudSync(false); if ($('#sheet').hidden) render(); }
});

/* borrar evento/tarea: se resuelven acá porque necesitan saber cuál está abierto */
let openId = null;
const _evEditor = evEditor, _taskEditor = taskEditor;
evEditor = (ev, day) => { openId = ev.id; _evEditor(ev, day); };
taskEditor = t => { openId = t.id; _taskEditor(t); };
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a=delEv],[data-a=delTask],[data-a=skipOcc]'); if (!b) return;
  e.stopImmediatePropagation();
  const it = ITEMS.get(openId); if (!it) return;
  if (b.dataset.a === 'skipOcc') { it.ex = (it.ex || []).concat(b.dataset.day); await save(it, { quiet: true }); await closeSheet(); toast('Se borró solo ese día'); return; }
  await delItem(it); await closeSheet();
  toast(it.k === 'task' ? 'Tarea borrada' : it.rep ? 'Se borró el evento y sus repeticiones' : 'Evento borrado');
}, true);

/* ---------- arranque ---------- */
(async function start() {
  try { await DB.open(); } catch (e) { $('#view').innerHTML = '<p class="empty">Este navegador no deja guardar datos (¿modo incógnito?).</p>'; return; }
  await lockAtStart();
  for (const raw of await DB.all('items')) { const it = clean(raw); if (it) ITEMS.set(it.id, it); }
  if (!ITEMS.size && !localStorage.getItem('myndvs-hello')) {
    const n = { id: 'bienvenida', k: 'note', c: 1764072000000, u: 1764072000000, color: 'violeta', pin: true, arch: false, media: [],
      text: 'Bienvenido a Myndvs 👋\nEscribí abajo y apretá Enter:\n[ ] Un pensamiento → queda como nota\n[ ] "- comprar alimento" → tarea\n[ ] "vie 21 cena con Ulises" → evento\n[ ] El micrófono graba, la cámara guarda fotos y el lápiz abre para dibujar\n#myndvs' };
    ITEMS.set(n.id, n); await DB.put('items', n); localStorage.setItem('myndvs-hello', '1');
  }
  await purgeTrash(false);
  render(); bridge();
  if (typeof tourAuto === 'function' && !location.hash) tourAuto();
  if (gCid() && gTok && gTok.exp > Date.now()) gsync(false); else if (gCid()) { cfg.gerr = cfg.glast ? 'notoken' : cfg.gerr; syncDot(); }
  if (ghTok()) cloudSync(false);
  if (location.hash === '#audio') newNoteWith('rec'); else if (location.hash === '#nota') $('#capIn').focus();
  if (location.hash) history.replaceState(null, '', location.pathname);
  if ('serviceWorker' in navigator && ORIGIN_OK) {
    // cuando hay versión nueva, se recarga sola una vez (así no hace falta abrirla dos veces)
    const had = !!navigator.serviceWorker.controller; let done = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done && !$('.lockov') && $('#sheet').hidden && !recState) { done = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { /* sin modo offline */ });
  }
})();
