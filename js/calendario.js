/* Calendario de Myndvs: vistas Hoy y mañana, Día, Semana, Mes y Año.
   Los eventos se dibujan adentro del calendario. selDay es el día de referencia de todas las vistas. */
'use strict';
const CV = [['2d', 'Hoy y mañana'], ['d', 'Día'], ['w', 'Semana'], ['m', 'Mes'], ['y', 'Año']];
let calView = (() => { try { return localStorage.getItem('myndvs-calview') || '2d'; } catch (e) { return '2d'; } })();
const HH = 48; // alto de una hora en px
const mon = k => addDays(k, -((dow(k) + 6) % 7)); // lunes de esa semana
const mins = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const monthName = (y, m) => cap1(new Date(y, m - 1, 15).toLocaleDateString('es-AR', { month: 'long' }));

function calTitle() {
  const d = new Date(selDay + 'T12:00'), y = d.getFullYear(), m = d.getMonth() + 1;
  const sm = k => new Date(k + 'T12:00').toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  const wd = k => cap1(new Date(k + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''));
  if (calView === 'y') return String(y);
  if (calView === 'm') return `${monthName(y, m)} ${y !== +today().slice(0, 4) ? y : ''}`.trim();
  if (calView === 'w') { const a = mon(selDay), b = addDays(a, 6); return sm(a) === sm(b) ? `${+a.slice(8)} – ${+b.slice(8)} ${sm(b)}` : `${+a.slice(8)} ${sm(a)} – ${+b.slice(8)} ${sm(b)}`; }
  if (calView === '2d') { const b = addDays(selDay, 1); return selDay === today() ? 'Hoy y mañana' : `${wd(selDay)} ${+selDay.slice(8)} y ${wd(b).toLowerCase()} ${+b.slice(8)} ${sm(b)}`; }
  return selDay === today() ? 'Hoy' : `${wd(selDay)} ${+selDay.slice(8)} ${sm(selDay)}`;
}
function vCal() {
  const head = `<div class="cvtabs" role="tablist">${CV.map(([k, n]) => `<button role="tab" data-a="cview" data-v="${k}" aria-selected="${calView === k}">${n}</button>`).join('')}</div>
    <div class="calhead"><button class="ib" data-a="cprev" aria-label="Anterior">${ICO.back}</button><h2>${calTitle()}</h2><button class="ib flip" data-a="cnext" aria-label="Siguiente">${ICO.back}</button>
      <button class="chip" data-a="ctoday">Hoy</button><button class="chip add" data-a="cals" aria-label="Calendarios"><svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg></button><button class="chip add" data-a="newEv" aria-label="Nuevo evento">${ICO.plus}</button></div>`;
  const body = calView === 'm' ? vMonth() : calView === 'y' ? vYear() : vGrid(calView === 'w' ? [...Array(7)].map((_, i) => addDays(mon(selDay), i)) : calView === '2d' ? [selDay, addDays(selDay, 1)] : [selDay]);
  return `<div class="calwrap" id="calwrap">${head}${body}</div>`;
}

/* ---- Mes: los eventos escritos en cada día ---- */
function vMonth() {
  const [y, m] = selDay.split('-').map(Number), first = `${selDay.slice(0, 7)}-01`, start = mon(first), t = today();
  const weeks = Math.ceil(((dow(first) + 6) % 7 + new Date(y, m, 0).getDate()) / 7);
  let html = `<div class="mgrid"><div class="mwd">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => `<span>${x}</span>`).join('')}</div>`;
  for (let w = 0; w < weeks; w++) {
    html += '<div class="mweek">';
    for (let i = 0; i < 7; i++) {
      const k = addDays(start, w * 7 + i), evs = evOn(k), tk = tasksDue(k).filter(x => !x.done), items = [...evs.map(e => ['e', e]), ...tk.map(x => ['t', x])];
      const show = items.slice(0, items.length > 4 ? 3 : 4);
      html += `<div class="mday${k.slice(0, 7) !== selDay.slice(0, 7) ? ' out' : ''}${k === t ? ' tod' : ''}" data-a="cday" data-k="${k}">
        <b>${+k.slice(8)}</b>${show.map(([ty, x]) => ty === 'e'
          ? `<span class="mev${x.start ? '' : ' all'}" style="--c:${evColor(x)};--ink:${evInk(x)}" data-a="openEv" data-id="${x.id}" data-day="${k}">${x.start ? `<i>${x.start.replace(':00', '')}</i>` : ''}${esc(x.title)}</span>`
          : `<span class="mev tk" data-a="openTask" data-id="${x.id}">○ ${x.time ? x.time.replace(':00', '') + ' ' : ''}${esc(x.title)}</span>`).join('')}
        ${items.length > show.length ? `<span class="more">+${items.length - show.length} más</span>` : ''}</div>`;
    }
    html += '</div>';
  }
  return html + '</div>';
}

/* ---- Año: 12 meses chiquitos; los días con algo se marcan ---- */
function vYear() {
  const y = +selDay.slice(0, 4), t = today();
  let html = '<div class="ygrid">';
  for (let m = 1; m <= 12; m++) {
    const first = `${y}-${String(m).padStart(2, '0')}-01`, pad = (dow(first) + 6) % 7, n = new Date(y, m, 0).getDate();
    html += `<div class="ymon${y === +today().slice(0, 4) && m === +today().slice(5, 7) ? ' now' : ''}"><button class="yname" data-a="cmonth" data-k="${first}">${monthName(y, m)}</button><div class="ydays">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<i>${x}</i>`).join('')}${'<span></span>'.repeat(pad)}`;
    for (let d = 1; d <= n; d++) {
      const k = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, c = evOn(k).length + tasksDue(k).filter(x => !x.done).length;
      html += `<button class="yd${k === t ? ' tod' : ''}${c ? ' has' : ''}${c > 2 ? ' lots' : ''}" data-a="cgo" data-k="${k}" data-v="d">${d}</button>`;
    }
    html += '</div></div>';
  }
  return html + '</div>';
}

/* ---- Día / Hoy y mañana / Semana: grilla por horas ---- */
function lanes(evs) {
  // reparte los eventos que se pisan en columnas
  const L = evs.map(e => ({ e, s: mins(e.start), f: Math.max(mins(e.start) + 20, e.end ? mins(e.end) : mins(e.start) + 60) })).sort((a, b) => a.s - b.s || b.f - a.f);
  const out = []; let group = [], gEnd = -1;
  const flush = () => { const cols = []; for (const x of group) { let c = cols.findIndex(f => f <= x.s); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = x.f; x.c = c; } group.forEach(x => { x.n = cols.length; out.push(x); }); group = []; };
  for (const x of L) { if (x.s >= gEnd && group.length) flush(); group.push(x); gEnd = Math.max(gEnd, x.f); }
  if (group.length) flush();
  return out;
}
function vGrid(days) {
  const t = today(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes(), many = days.length > 2;
  const head = `<div class="ghead" style="--n:${days.length}"><span></span>${days.map(k => { const d = new Date(k + 'T12:00');
    return `<button class="gday${k === t ? ' tod' : ''}" data-a="cgo" data-k="${k}" data-v="d"><small>${d.toLocaleDateString('es-AR', { weekday: many ? 'narrow' : 'long' }).replace('.', '')}</small><b>${d.getDate()}</b></button>`; }).join('')}</div>`;
  const allday = days.map(k => { const ev = evOn(k).filter(e => !e.start), tk = tasksDue(k).filter(x => !x.time);
    return `<div class="gall">${ev.map(e => `<span class="mev all" style="--c:${evColor(e)};--ink:${evInk(e)}" data-a="openEv" data-id="${e.id}" data-day="${k}">${esc(e.title)}</span>`).join('')}${tk.map(x => `<span class="mev tk${x.done ? ' done' : ''}" data-a="openTask" data-id="${x.id}">${x.done ? '✓' : '○'} ${esc(x.title)}</span>`).join('')}</div>`; });
  const hasAll = allday.some(h => h !== '<div class="gall"></div>');
  const hours = [...Array(24)].map((_, h) => `<div class="ghr" style="top:${h * HH}px"><span>${h ? String(h).padStart(2, '0') + ':00' : ''}</span></div>`).join('');
  const cols = days.map(k => {
    const evs = lanes(evOn(k).filter(e => e.start));
    return `<div class="gcol${k === t ? ' tod' : ''}" data-k="${k}">
      ${[...Array(24)].map((_, h) => `<button class="gslot" style="top:${h * HH}px" data-a="slot" data-k="${k}" data-h="${h}" aria-label="Agendar a las ${h}"></button>`).join('')}
      ${evs.map(x => { const h = Math.max(22, (x.f - x.s) * HH / 60 - 2);
        // con muchas columnas (semana) los que se pisan se apilan corridos; con pocas, lado a lado
        const pos = many && x.n > 1 ? `left:${x.c * 7}px;width:calc(100% - ${x.c * 7 + 2}px);z-index:${1 + x.c}` : `left:calc(${x.c} * 100% / ${x.n});width:calc(100% / ${x.n} - 2px)`;
        const mv = !x.e.ro && !x.e.hol;
        return `<button class="gev${h < 40 ? ' tiny' : h < 62 ? ' short' : h < 95 ? ' mid' : ''}${mv ? ' mv' : ''}" style="--c:${evColor(x.e)};top:${x.s * HH / 60}px;height:${h}px;${pos}" data-a="openEv" data-id="${x.e.id}" data-day="${k}" data-kind="ev"><b>${esc(x.e.title)}</b><small>${x.e.start}${x.e.end ? '–' + x.e.end : ''}${x.e.rep ? ' ↻' : ''}</small>${mv ? '<i class="gres" aria-hidden="true"></i>' : ''}</button>`; }).join('')}
      ${tasksDue(k).filter(x => x.time).map(x => `<button class="gtk mv${x.done ? ' done' : ''}" style="top:${mins(x.time) * HH / 60}px" data-a="openTask" data-id="${x.id}" data-day="${k}" data-kind="task"><span>${x.done ? '✓' : '○'}</span>${esc(x.title)}<small>${x.time}</small></button>`).join('')}
      ${k === t ? `<i class="gnow" style="top:${nowM * HH / 60}px"></i>` : ''}</div>`;
  }).join('');
  return `<div class="gwrap">${head}${hasAll ? `<div class="gallrow" style="--n:${days.length}"><span>todo el día</span>${allday.join('')}</div>` : ''}
    <div class="gbody" id="gbody"><div class="gin" style="--n:${days.length};height:${24 * HH}px"><div class="ghours">${hours}</div>${cols}</div></div></div>`;
}
function calAfter() {
  const gb = $('#gbody'); if (gb) { const n = new Date(); gb.scrollTop = Math.max(0, ((selDay === today() || calView === 'w') ? n.getHours() - 1.5 : 7) * HH); }
  if (calView === 'y' && selDay.slice(0, 4) === today().slice(0, 4)) { const m = $$('.ymon')[+today().slice(5, 7) - 1]; if (m) m.scrollIntoView({ block: 'center' }); }
  const w = $('#calwrap'); if (!w) return;
  let x0 = null, y0 = 0;
  w.addEventListener('touchstart', e => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
  w.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) calStep(dx < 0 ? 1 : -1); }, { passive: true });
}
function calStep(d) {
  if (calView === 'y') selDay = `${+selDay.slice(0, 4) + d}${selDay.slice(4)}`;
  else if (calView === 'm') { const [y, m] = selDay.split('-').map(Number); selDay = dk(new Date(y, m - 1 + d, 1)); }
  else selDay = addDays(selDay, d * (calView === 'w' ? 7 : calView === '2d' ? 2 : 1));
  render();
}
function setView(v) { calView = v; try { localStorage.setItem('myndvs-calview', v); } catch (e) { /* nada */ } render(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || !['cview', 'cprev', 'cnext', 'ctoday', 'cday', 'cmonth', 'cgo', 'slot'].includes(b.dataset.a)) return;
  const a = b.dataset.a;
  if (a === 'cview') setView(b.dataset.v);
  else if (a === 'cprev' || a === 'cnext') calStep(a === 'cnext' ? 1 : -1);
  else if (a === 'ctoday') { selDay = today(); render(); }
  else if (a === 'cday' || a === 'cgo') { selDay = b.dataset.k; setView(b.dataset.v || 'd'); }
  else if (a === 'cmonth') { selDay = b.dataset.k; setView('m'); }
  else if (a === 'slot') { const h = String(b.dataset.h).padStart(2, '0') + ':00'; evEditor({ id: uid(), k: 'ev', title: '', date: b.dataset.k, start: h, end: plusHour(h), color: '', notes: '', rep: '', lb: 'auto', ex: [] }); }
});

/* ---- arrastrar para mover, estirar el borde de abajo para cambiar la duración ----
   Con mouse se arrastra directo; con el dedo, mantené apretado medio segundo (así no se confunde con deslizar). */
const SNAP = 15;
const hm = m => { m = Math.max(0, Math.min(24 * 60 - 1, m)); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
let DR = null;
function dragStart(e) {
  const el = e.target.closest('.mv'); if (!el || e.button > 0) return;
  const resize = !!e.target.closest('.gres'), col = el.closest('.gcol'); if (!col) return;
  const it = ITEMS.get(el.dataset.id); if (!it) return;
  const cols = $$('.gcol'), rects = cols.map(c => c.getBoundingClientRect());
  DR = { el, it, resize, x0: e.clientX, y0: e.clientY, live: false, moved: false, col: cols.indexOf(col), cols, rects, top0: parseFloat(el.style.top), h0: el.offsetHeight, kind: el.dataset.kind, pid: e.pointerId, touch: e.pointerType !== 'mouse' };
  if (DR.touch && !resize) DR.timer = setTimeout(() => { if (DR && !DR.moved) arm(); }, 450);
  else if (resize) arm();
}
function arm() { DR.live = true; DR.el.classList.add('dragging'); document.body.classList.add('dragmode'); try { DR.el.setPointerCapture(DR.pid); } catch (x) { /* nada */ } if (navigator.vibrate) navigator.vibrate(12); }
function dragMove(e) {
  if (!DR) return;
  const dx = e.clientX - DR.x0, dy = e.clientY - DR.y0;
  if (!DR.live) {
    if (Math.abs(dx) + Math.abs(dy) > 8) { DR.moved = true; if (!DR.touch) arm(); else { clearTimeout(DR.timer); DR = null; } }
    return;
  }
  e.preventDefault();
  const step = SNAP * HH / 60, dm = Math.round(dy / step) * SNAP;
  if (DR.resize) {
    const h = Math.max(step, DR.h0 + dm * HH / 60); DR.el.style.height = h + 'px'; DR.dm = dm; DR.dc = 0;
  } else {
    let c = DR.col; DR.rects.forEach((r, i) => { if (e.clientX >= r.left && e.clientX < r.right) c = i; });
    DR.dm = dm; DR.dc = c - DR.col;
    DR.el.style.transform = `translate(${DR.rects[c].left - DR.rects[DR.col].left}px, ${dm * HH / 60}px)`;
  }
  const s0 = DR.kind === 'task' ? mins(DR.it.time) : mins(DR.it.start), dur = DR.kind === 'task' ? 0 : (DR.it.end ? mins(DR.it.end) : s0 + 60) - s0;
  const lab = DR.el.querySelector('small');
  if (lab) lab.textContent = DR.resize ? `${DR.it.start}–${hm(s0 + Math.max(SNAP, dur + DR.dm))}` : DR.kind === 'task' ? hm(s0 + DR.dm) : `${hm(s0 + DR.dm)}–${hm(s0 + DR.dm + dur)}`;
}
async function dragEnd() {
  if (!DR) return;
  clearTimeout(DR.timer);
  const d = DR; DR = null;
  document.body.classList.remove('dragmode');
  if (!d.live) return;
  d.el.classList.remove('dragging');
  window.__noClick = Date.now();
  if (!d.dm && !d.dc) { d.el.style.transform = ''; return; }
  const it = d.it, before = JSON.stringify({ date: it.date, due: it.due, start: it.start, end: it.end, time: it.time });
  const day = d.cols[d.col + d.dc] ? d.cols[d.col + d.dc].dataset.k : null;
  if (d.kind === 'task') { it.time = hm(mins(it.time) + d.dm); if (day) it.due = day; }
  else {
    const s0 = mins(it.start), e0 = it.end ? mins(it.end) : s0 + 60;
    if (d.resize) it.end = hm(Math.max(s0 + SNAP, e0 + d.dm));
    else {
      const ns = Math.max(0, Math.min(24 * 60 - SNAP, s0 + d.dm)); it.start = hm(ns); it.end = hm(Math.min(24 * 60 - 1, ns + (e0 - s0)));
      if (day && day !== d.el.dataset.day && !it.rep) it.date = addDays(it.date, Math.round((new Date(day + 'T12:00') - new Date(d.el.dataset.day + 'T12:00')) / 864e5));
    }
  }
  await save(it);
  const what = d.kind === 'task' ? `Tarea a las ${it.time}` : d.resize ? `Ahora termina ${it.end}` : `${it.rep ? 'Toda la serie' : 'Evento'} a las ${it.start}${it.date !== JSON.parse(before).date ? ' · ' + fmtShort(it.date) : ''}`;
  toast(what, { label: 'Deshacer', fn: async () => { Object.assign(it, JSON.parse(before)); await save(it); } });
}
document.addEventListener('pointerdown', e => { if (tab === 'cal' && e.target.closest('.gcol .mv')) dragStart(e); });
document.addEventListener('pointermove', dragMove, { passive: false });
document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', () => { if (DR && DR.live) { DR.el.style.transform = ''; DR.el.classList.remove('dragging'); document.body.classList.remove('dragmode'); } if (DR) clearTimeout(DR.timer); DR = null; });
// con el dedo: mientras se arrastra, la grilla no se desplaza
document.addEventListener('touchmove', e => { if (DR && DR.live) e.preventDefault(); }, { passive: false });
// después de arrastrar no se abre el evento
document.addEventListener('click', e => { if (window.__noClick && Date.now() - window.__noClick < 200 && e.target.closest('.gcol')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
document.addEventListener('contextmenu', e => { if (e.target.closest('.gcol .mv')) e.preventDefault(); });
