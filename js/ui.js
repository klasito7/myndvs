/* Interfaz viva: deslizar entre pestañas, transiciones breves, cerrar hojas deslizando,
   indicador que se mueve en la barra de abajo y pequeñas animaciones de respuesta.
   Todo se apaga si el celu tiene "reducir movimiento". */
'use strict';
const TABS = ['hoy', 'notas', 'cal', 'diario', 'tareas'];
(() => {
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setRM = () => root.classList.toggle('rm', mq.matches); setRM(); mq.addEventListener && mq.addEventListener('change', setRM);

  // saludo según la hora, arriba de la fecha en Hoy
  window.greet = () => { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; };

  // indicador de la pestaña activa
  const nav = $('#tabs'), pill = document.createElement('i'); pill.className = 'tabpill'; nav.appendChild(pill);
  const movePill = () => { const b = nav.querySelector('[aria-current="page"]'); if (!b) return; pill.style.transform = `translateX(${b.offsetLeft + b.offsetWidth / 2 - 18}px)`; };
  new MutationObserver(movePill).observe(nav, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
  window.addEventListener('resize', movePill); setTimeout(movePill, 50);

  // al cambiar de pestaña: el contenido entra desde el costado que corresponde
  let lastTab = null;
  window.uiAfterRender = () => {
    const v = $('#view');
    if (lastTab !== null && lastTab !== tab && !root.classList.contains('rm')) {
      const dir = TABS.indexOf(tab) > TABS.indexOf(lastTab) ? 1 : -1;
      v.style.setProperty('--dir', dir); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
      // las tarjetas aparecen en cascada
      $$('.note, .task, .ev, .dent, section > h2, .lb, .ferban, .wrcard, .mday, .ymon', v).slice(0, 24).forEach((el, i) => { el.style.setProperty('--d', i * 22 + 'ms'); el.classList.add('pop'); });
      setTimeout(() => { $$('.pop', v).forEach(el => el.classList.remove('pop')); v.classList.remove('enter'); }, 700);
    }
    lastTab = tab;
  };

  // deslizar el dedo a los costados para cambiar de pestaña (en Calendario cambia el período)
  let sx = null, sy = 0, st = 0, ok = false;
  const view = $('#view');
  view.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || !$('#sheet').hidden) { sx = null; return; }
    const t = e.target;
    ok = !t.closest('.chips, .cvtabs, .gbody, .mgrid, textarea, input, .tc, [data-noswipe]') && tab !== 'cal';
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  view.addEventListener('touchmove', e => {
    if (sx == null || !ok) return;
    const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) { view.style.transform = `translateX(${dx * 0.35}px)`; view.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 900)); }
  }, { passive: true });
  view.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy, fast = Date.now() - st < 300;
    view.style.transform = ''; view.style.opacity = ''; sx = null;
    if (!ok || Math.abs(dx) < (fast ? 45 : 90) || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const i = TABS.indexOf(tab) + (dx < 0 ? 1 : -1); if (i < 0 || i >= TABS.length) return;
    const b = $(`#tabs [data-tab="${TABS[i]}"]`); if (b) b.click();
  }, { passive: true });

  // cerrar las hojas deslizando hacia abajo (desde la manija o el borde de arriba)
  const sh = $('#sheet'); let dy0 = null, dragY = 0;
  sh.addEventListener('touchstart', e => {
    if (sh.classList.contains('full') && !e.target.closest('.edbar')) { dy0 = null; return; }
    if (!e.target.closest('.edbar, .grab') && sh.scrollTop > 0) { dy0 = null; return; }
    if (e.target.closest('input, textarea, select, button')) { dy0 = null; return; }
    dy0 = e.touches[0].clientY; dragY = 0;
  }, { passive: true });
  sh.addEventListener('touchmove', e => { if (dy0 == null) return; dragY = Math.max(0, e.touches[0].clientY - dy0); if (dragY > 4) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dragY}px)`; } }, { passive: true });
  sh.addEventListener('touchend', () => { if (dy0 == null) return; dy0 = null; sh.style.transition = ''; sh.style.transform = ''; if (dragY > 110) closeSheet(); }, { passive: true });

  // tirar para abajo en Hoy = sincronizar
  let py = null, pd = 0; const ptr = document.createElement('div'); ptr.className = 'ptr'; ptr.innerHTML = '<i></i>'; document.body.appendChild(ptr);
  view.addEventListener('touchstart', e => { py = window.scrollY <= 0 && tab === 'hoy' && $('#sheet').hidden ? e.touches[0].clientY : null; pd = 0; }, { passive: true });
  view.addEventListener('touchmove', e => { if (py == null) return; pd = Math.max(0, e.touches[0].clientY - py); if (pd > 10) { ptr.classList.add('on'); ptr.style.setProperty('--p', Math.min(1, pd / 110)); } }, { passive: true });
  view.addEventListener('touchend', () => { if (py == null) return; py = null; ptr.classList.remove('on'); if (pd > 110) { ptr.classList.add('spin'); Promise.all([gCid() ? gsync(true) : 0, ghTok() ? cloudSync(false) : 0]).finally(() => ptr.classList.remove('spin')); } }, { passive: true });

  // un saltito en la pestaña adonde fue lo que guardaste
  document.addEventListener('myndvs:cap', e => {
    const to = { note: 'notas', media: 'notas', task: 'tareas', ev: 'cal' }[e.detail.k]; const b = to && $(`#tabs [data-tab="${to}"]`);
    if (!b || to === tab) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  });
  // tilde de tarea: animación antes de que se vaya
  document.addEventListener('click', e => { const t = e.target.closest('.tick'); if (t) { t.classList.add('ticking'); const row = t.closest('.task'); if (row && !row.classList.contains('done')) row.classList.add('going'); } }, true);
})();
