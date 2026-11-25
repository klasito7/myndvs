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
  if (calView === 'y') return String(y);
  if (calView === 'm') return `${monthName(y, m)} ${y}`;
  if (calView === 'w') { const a = mon(selDay), b = addDays(a, 6), A = new Date(a + 'T12:00'), B = new Date(b + 'T12:00');
    return A.getMonth() === B.getMonth() ? `${A.getDate()} al ${B.getDate()} de ${monthName(B.getFullYear(), B.getMonth() + 1).toLowerCase()}` : `${A.getDate()} ${monthName(0, A.getMonth() + 1).slice(0, 3).toLowerCase()} al ${B.getDate()} ${monthName(0, B.getMonth() + 1).slice(0, 3).toLowerCase()}`; }
  if (calView === '2d') return selDay === today() ? 'Hoy y mañana' : `${fmtShort(selDay)} y ${fmtShort(addDays(selDay, 1)).toLowerCase()}`;
  return fmtLong(selDay);
}
function vCal() {
  const head = `<div class="cvtabs" role="tablist">${CV.map(([k, n]) => `<button role="tab" data-a="cview" data-v="${k}" aria-selected="${calView === k}">${n}</button>`).join('')}</div>
    <div class="calhead"><button class="ib" data-a="cprev" aria-label="Anterior">${ICO.back}</button><h2>${calTitle()}</h2><button class="ib flip" data-a="cnext" aria-label="Siguiente">${ICO.back}</button>
      <button class="chip" data-a="ctoday">Hoy</button><button class="chip add" data-a="newEv" aria-label="Nuevo evento">${ICO.plus}</button></div>`;
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
          ? `<span class="mev${x.start ? '' : ' all'}" style="--c:${ECOL[x.color || '']}" data-a="openEv" data-id="${x.id}" data-day="${k}">${x.start ? `<i>${x.start.replace(':00', '')}</i>` : ''}${esc(x.title)}</span>`
          : `<span class="mev tk" data-a="openTask" data-id="${x.id}">○ ${esc(x.title)}</span>`).join('')}
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
  const allday = days.map(k => { const ev = evOn(k).filter(e => !e.start), tk = tasksDue(k);
    return `<div class="gall">${ev.map(e => `<span class="mev all" style="--c:${ECOL[e.color || '']}" data-a="openEv" data-id="${e.id}" data-day="${k}">${esc(e.title)}</span>`).join('')}${tk.map(x => `<span class="mev tk${x.done ? ' done' : ''}" data-a="openTask" data-id="${x.id}">${x.done ? '✓' : '○'} ${esc(x.title)}</span>`).join('')}</div>`; });
  const hasAll = allday.some(h => h !== '<div class="gall"></div>');
  const hours = [...Array(24)].map((_, h) => `<div class="ghr" style="top:${h * HH}px"><span>${h ? String(h).padStart(2, '0') + ':00' : ''}</span></div>`).join('');
  const cols = days.map(k => {
    const evs = lanes(evOn(k).filter(e => e.start));
    return `<div class="gcol${k === t ? ' tod' : ''}" data-k="${k}">
      ${[...Array(24)].map((_, h) => `<button class="gslot" style="top:${h * HH}px" data-a="slot" data-k="${k}" data-h="${h}" aria-label="Agendar a las ${h}"></button>`).join('')}
      ${evs.map(x => { const h = Math.max(22, (x.f - x.s) * HH / 60 - 2);
        // con muchas columnas (semana) los que se pisan se apilan corridos; con pocas, lado a lado
        const pos = many && x.n > 1 ? `left:${x.c * 7}px;width:calc(100% - ${x.c * 7 + 2}px);z-index:${1 + x.c}` : `left:calc(${x.c} * 100% / ${x.n});width:calc(100% / ${x.n} - 2px)`;
        return `<button class="gev${h < 40 ? ' tiny' : h < 62 ? ' short' : ''}" style="--c:${ECOL[x.e.color || '']};top:${x.s * HH / 60}px;height:${h}px;${pos}" data-a="openEv" data-id="${x.e.id}" data-day="${k}"><b>${esc(x.e.title)}</b><small>${x.e.start}${x.e.end ? '–' + x.e.end : ''}</small></button>`; }).join('')}
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
