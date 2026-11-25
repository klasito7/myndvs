/* Wrapped del mes: el último día de cada mes (y hasta el 3 del siguiente, por si te lo perdiste)
   aparece en Hoy un resumen tipo historias de todo lo que hiciste en Myndvs ese mes. */
'use strict';
const WR = (() => {
  const monthKey = d => dk(d).slice(0, 7);
  const lastDay = m => { const [y, mo] = m.split('-').map(Number); return dk(new Date(y, mo, 0, 12)); };
  const mName = m => { const [y, mo] = m.split('-').map(Number); return cap1(new Date(y, mo - 1, 15).toLocaleDateString('es-AR', { month: 'long' })); };
  const inM = (ts, m) => ts && dk(new Date(ts)).slice(0, 7) === m;
  const words = s => ((s || '').match(/\S+/g) || []).length;
  // ¿qué mes toca mostrar hoy?
  function due() {
    const t = today(), m = t.slice(0, 7);
    if (t === lastDay(m)) return m;
    if (+t.slice(8) <= 3) { const d = new Date(t + 'T12:00'); d.setDate(0); return monthKey(d); }
    return null;
  }
  function stats(m) {
    const all = [...ITEMS.values()];
    const N = all.filter(x => x.k === 'note' && !x.gone && inM(x.c, m));
    const med = N.flatMap(n => n.media || []);
    const aud = med.filter(x => x.t === 'audio'), img = med.filter(x => x.t === 'img'), drw = med.filter(x => x.t === 'draw');
    const tags = {}; N.forEach(n => tagsOf(n).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
    const D = all.filter(x => x.k === 'diary' && !x.gone && (x.text || '').trim() && x.date.slice(0, 7) === m).sort((a, b) => a.date.localeCompare(b.date));
    let best = 0, run = 0, prev = null;
    for (const x of D) { run = prev && addDays(prev, 1) === x.date ? run + 1 : 1; best = Math.max(best, run); prev = x.date; }
    const dw = D.reduce((a, x) => a + words(x.text), 0), longest = D.slice().sort((a, b) => words(b.text) - words(a.text))[0];
    const TD = all.filter(x => x.k === 'task' && !x.del && x.done && inM(x.doneAt, m)), TC = all.filter(x => x.k === 'task' && !x.del && inM(x.c, m));
    // eventos del mes (con repeticiones), sin feriados
    const [y, mo] = m.split('-').map(Number), n = new Date(y, mo, 0).getDate(), perDay = {}, perCal = {}; let ev = 0, mins = 0;
    for (let d = 1; d <= n; d++) {
      const k = `${m}-${String(d).padStart(2, '0')}`, L = evOn(k).filter(e => !e.hol);
      perDay[k] = L.length; ev += L.length;
      for (const e of L) { if (e.start) mins += Math.max(15, ((e.end ? +e.end.slice(0, 2) * 60 + +e.end.slice(3) : +e.start.slice(0, 2) * 60 + +e.start.slice(3) + 60) - (+e.start.slice(0, 2) * 60 + +e.start.slice(3)))); const c = e.cal || 'primary'; perCal[c] = (perCal[c] || 0) + 1; }
    }
    const busy = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0];
    const topCal = Object.entries(perCal).sort((a, b) => b[1] - a[1])[0];
    let fer = 0; for (let d = 1; d <= n; d++) fer += ferEvents(`${m}-${String(d).padStart(2, '0')}`).filter(f => f.tp !== 'n').length;
    const lb = lbState(); let xp = 0; if (lb && lb.xpDay) for (const [k, v] of Object.entries(lb.xpDay)) if (k.slice(0, 7) === m) xp += +v || 0;
    // el mes anterior, para comparar
    const pm = (() => { const d = new Date(y, mo - 2, 15); return monthKey(d); })();
    const prevN = all.filter(x => x.k === 'note' && !x.gone && inM(x.c, pm)).length;
    return { m, name: mName(m), notes: N.length, prevN, aud: aud.length, audMin: Math.round(aud.reduce((a, x) => a + (x.dur || 0), 0) / 60), img: img.length, drw: drw.length,
      tags: Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 3), dDays: D.length, dWords: dw, dStreak: best, longest, tDone: TD.length, tNew: TC.length,
      ev, evHours: Math.round(mins / 60), busy: busy && busy[1] ? busy : null, topCal: topCal ? [calName(topCal[0]), topCal[1]] : null, fer, xp, lvl: lb && typeof lb.xp === 'number' ? lvl(lb.xp).L : 0, days: n };
  }
  const fmtDayLong = k => cap1(new Date(k + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' }));
  function slides(S) {
    const L = [];
    L.push({ bg: 'a', big: S.name, small: 'Tu mes en Myndvs', sub: 'Tocá para avanzar →', emoji: '✨' });
    if (S.notes) L.push({ bg: 'b', emoji: '💭', num: S.notes, small: S.notes === 1 ? 'pensamiento guardado' : 'pensamientos guardados',
      sub: S.prevN ? (S.notes >= S.prevN ? `${S.notes - S.prevN ? '+' + (S.notes - S.prevN) + ' más' : 'Los mismos'} que el mes pasado` : `${S.prevN - S.notes} menos que el mes pasado`) : 'Tu mente, a salvo.' });
    if (S.aud || S.img || S.drw) L.push({ bg: 'c', emoji: '🎙️', list: [[S.aud, S.aud === 1 ? 'audio' : 'audios', S.audMin ? `${S.audMin} min hablando` : ''], [S.img, S.img === 1 ? 'foto' : 'fotos', ''], [S.drw, S.drw === 1 ? 'dibujo' : 'dibujos', '']].filter(x => x[0]) });
    if (S.tags.length) L.push({ bg: 'd', emoji: '#️⃣', small: 'De lo que más hablaste', tags: S.tags });
    if (S.dDays) L.push({ bg: 'e', emoji: '📖', num: S.dDays, small: S.dDays === 1 ? 'día escrito en tu diario' : 'días escritos en tu diario',
      sub: `${S.dWords.toLocaleString('es-AR')} palabras${S.dWords >= 250 ? ` (unas ${Math.round(S.dWords / 250)} páginas de libro)` : ''}${S.dStreak > 1 ? ` · racha de ${S.dStreak} días` : ''}` });
    if (S.ev) L.push({ bg: 'f', emoji: '📅', num: S.ev, small: S.ev === 1 ? 'evento en tu calendario' : 'eventos en tu calendario',
      sub: [S.evHours ? `${S.evHours} h agendadas` : '', S.busy && S.busy[1] > 1 ? `El día más cargado: ${fmtDayLong(S.busy[0])} (${S.busy[1]})` : '', S.topCal && S.topCal[0] !== 'Principal' ? `El que más usaste: ${S.topCal[0]}` : ''].filter(Boolean).join(' · ') });
    if (S.tDone || S.tNew) L.push({ bg: 'g', emoji: '✅', num: S.tDone, small: S.tDone === 1 ? 'tarea cumplida' : 'tareas cumplidas', sub: S.tNew ? `De ${S.tNew} que anotaste este mes` : '' });
    if (S.xp) L.push({ bg: 'h', emoji: '⚔️', num: S.xp, small: 'XP en Lifebgood', sub: S.lvl ? `Vas por el nivel ${S.lvl}` : '' });
    const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    const parts = [S.notes && pl(S.notes, 'pensamiento', 'pensamientos'), S.dDays && pl(S.dDays, 'día de diario', 'días de diario'), S.tDone && pl(S.tDone, 'tarea hecha', 'tareas hechas'), S.ev && pl(S.ev, 'evento', 'eventos')].filter(Boolean);
    L.push({ bg: 'a', emoji: '🌙', big: parts.length ? 'Gran mes' : 'Mes tranquilo', small: parts.length ? parts.join(' · ') : 'El mes que viene, a llenarla de ideas.', sub: S.fer ? `Y ${S.fer} feriado${S.fer === 1 ? '' : 's'} para descansar 🇦🇷` : '', end: true });
    return L;
  }
  function slideHTML(x) {
    if (x.list) return `<div class="wem">${x.emoji}</div><div class="wlist">${x.list.map(([n, t, s]) => `<div><b data-n="${n}">0</b><span>${t}</span>${s ? `<small>${s}</small>` : ''}</div>`).join('')}</div>`;
    if (x.tags) return `<div class="wem">${x.emoji}</div><p class="wsm">${x.small}</p><div class="wtags">${x.tags.map(([t, n], i) => `<div style="--i:${i}"><b>#${esc(t)}</b><small>${n} nota${n === 1 ? '' : 's'}</small></div>`).join('')}</div>`;
    return `<div class="wem">${x.emoji}</div>${x.big ? `<h2 class="wbig">${esc(x.big)}</h2>` : ''}${x.num != null ? `<b class="wnum" data-n="${x.num}">0</b>` : ''}<p class="wsm">${esc(x.small || '')}</p>${x.sub ? `<p class="wsub">${esc(x.sub)}</p>` : ''}${x.end ? '<div class="wend"><button class="ghost" data-w="save">Guardarlo como nota</button><button class="primary" data-w="close">Cerrar</button></div>' : ''}`;
  }
  function countUp(root) {
    $$('[data-n]', root).forEach(el => {
      const N = +el.dataset.n, t0 = performance.now(), D = document.documentElement.classList.contains('rm') ? 0 : 900;
      const f = t => { const p = D ? Math.min(1, (t - t0) / D) : 1; el.textContent = Math.round(N * (1 - Math.pow(1 - p, 3))).toLocaleString('es-AR'); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
  }
  function open(m) {
    const S = stats(m || due() || today().slice(0, 7)), L = slides(S);
    const ov = document.createElement('div'); ov.className = 'wrov';
    ov.innerHTML = `<div class="wbars">${L.map(() => '<i><b></b></i>').join('')}</div><button class="ib wx" data-w="close" aria-label="Cerrar">${ICO.x}</button><div class="wslide"></div>`;
    document.body.appendChild(ov);
    let i = 0, timer = null, x0 = null, y0 = 0;
    const go = n => {
      if (n >= L.length) return close(); i = Math.max(0, n);
      const sl = $('.wslide', ov); sl.className = `wslide bg-${L[i].bg}`; sl.innerHTML = `<div class="win">${slideHTML(L[i])}</div>`; countUp(sl);
      $$('.wbars i', ov).forEach((b, j) => b.className = j < i ? 'done' : j === i ? 'now' : '');
      clearTimeout(timer); if (!L[i].end) timer = setTimeout(() => go(i + 1), 5500);
    };
    const onBack = () => { clearTimeout(timer); ov.remove(); };
    const close = () => { clearTimeout(timer); ov.classList.add('out'); setTimeout(() => ov.remove(), 200); popBack(onBack); localStorage.setItem('myndvs-wr-' + S.m, '1'); render(); };
    pushBack(onBack);
    ov.addEventListener('click', async e => {
      const w = e.target.closest('[data-w]');
      if (w && w.dataset.w === 'close') return close();
      if (w && w.dataset.w === 'save') {
        const txt = `✨ Mi ${S.name} en Myndvs\n` + [S.notes && `💭 ${S.notes} pensamientos`, S.aud && `🎙️ ${S.aud} audios`, S.img && `📷 ${S.img} fotos`, S.drw && `✏️ ${S.drw} dibujos`, S.dDays && `📖 ${S.dDays} días de diario (${S.dWords} palabras)`, S.ev && `📅 ${S.ev} eventos`, S.tDone && `✅ ${S.tDone} tareas hechas`, S.xp && `⚔️ ${S.xp} XP en Lifebgood`, S.tags.length && `De lo que más hablé: ${S.tags.map(t => '#' + t[0]).join(' ')}`].filter(Boolean).join('\n') + '\n#wrapped';
        const n = { id: uid(), k: 'note', text: txt, c: Date.now(), color: 'violeta', pin: false, arch: false, media: [] };
        await save(n, { quiet: true }); toast('Guardado en tus notas'); return;
      }
      if (e.target.closest('button')) return;
      const r = ov.getBoundingClientRect(); go(e.clientX < r.width * 0.3 ? i - 1 : i + 1);
    });
    ov.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    ov.addEventListener('touchend', e => { if (x0 == null) return; const dy = e.changedTouches[0].clientY - y0; x0 = null; if (dy > 110) close(); }, { passive: true });
    const key = e => { if (!document.body.contains(ov)) return document.removeEventListener('keydown', key); if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    go(0);
  }
  function card() {
    const m = due(); if (!m) return '';
    const seen = localStorage.getItem('myndvs-wr-' + m), S = stats(m);
    return `<button class="wrcard${seen ? ' seen' : ''}" data-a="wrapped" data-m="${m}"><span class="wrsp">✨</span><span><b>Tu ${S.name} en Myndvs</b><small>${seen ? 'Volvé a verlo' : 'Ya está listo tu resumen del mes'}</small></span><span class="wrgo">${seen ? '↻' : 'Ver'}</span></button>`;
  }
  return { open, card, stats, due };
})();
function wrappedCard() { return WR.card(); }
document.addEventListener('click', e => { const b = e.target.closest('[data-a=wrapped]'); if (b) WR.open(b.dataset.m); });
