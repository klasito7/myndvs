/* Tutorial interactivo de Myndvs.
   Cada paso tiene la versión de la app en la que apareció (v). Cuando se agrega algo nuevo a la app,
   se suman sus pasos con un v nuevo y se sube TOUR_V: la próxima vez que se abra, ofrece "Novedades"
   con solo esos pasos. El tutorial completo siempre muestra todos. */
'use strict';
const TOUR_V = 3;
const TOUR_KEY = 'myndvs-tour';
const firstNote = () => notes().filter(n => !n.del && !n.arch).sort((a, b) => (b.pin - a.pin) || ((b.u || b.c) - (a.u || a.c)))[0];
const STEPS = [
  { v: 1, t: 'Bienvenido a Myndvs', x: 'Un solo lugar para tus pensamientos, tu diario, tu calendario y tus tareas. Te muestro todo en un par de minutos, y en algunos pasos lo vas a hacer vos. Podés salir cuando quieras con la ✕.' },
  { v: 1, tab: 'hoy', sel: '#capIn', wait: 'note', t: 'Anotá un pensamiento', x: 'Esta barra está siempre abajo. Escribí cualquier cosa que tengas en la cabeza y apretá <b>Enter</b>. Queda guardada como nota.' },
  { v: 1, tab: 'hoy', sel: '#capMode', t: 'La app adivina qué es', x: 'Este botón muestra si lo que escribís va a ser <b>Nota</b>, <b>Tarea</b> o <b>Evento</b>. Cambia solo mientras escribís; si le pifia, tocalo y lo elegís vos.' },
  { v: 1, tab: 'hoy', sel: '#capIn', wait: 'task', t: 'Ahora una tarea', x: 'Escribí <b>- comprar yerba</b> (con el guion adelante) y Enter. El guion la hace tarea. Si le ponés día (<b>- mañana pagar la luz</b>) queda con vencimiento.' },
  { v: 1, tab: 'hoy', sel: '#capIn', wait: 'ev', t: 'Y un evento', x: 'Escribí <b>mañana 16 dentista</b> y Enter. Entiende <i>hoy, mañana, el viernes, 24/11, a las 16, 16:30, 19hs, de 16 a 18, 3 de la tarde</i>.' },
  { v: 1, tab: 'hoy', sel: '#cap [data-a=rec]', t: 'Grabá lo que pensás', x: 'El micrófono graba un audio y lo guarda como nota. Ideal caminando o en el tren. Si escribiste algo antes de tocarlo, queda como texto de la nota.' },
  { v: 1, tab: 'hoy', sel: '#cap [data-a=foto]', t: 'Fotos e imágenes', x: 'Sacá una foto o elegí varias de la galería. Se achican solas para no ocupar de más.' },
  { v: 1, tab: 'hoy', sel: '#cap [data-a=dibu]', t: 'Dibujá', x: 'Abre una hoja para dibujar con el dedo: 6 colores, 3 grosores, goma y deshacer. Se recorta sola y después la podés seguir editando tocándola.' },
  { v: 1, tab: 'hoy', sel: 'h1.day', t: 'Hoy', x: 'Tu día de un vistazo: la agenda (el evento en curso se resalta), tareas atrasadas y de hoy, notas fijadas y tus últimos pensamientos. Si usás Lifebgood en este navegador, arriba ves tu nivel y tus misiones.' },
  { v: 1, tab: 'notas', sel: '.chips', t: 'Notas', x: 'Filtrá por audios, imágenes, archivo o papelera. Cada <b>#etiqueta</b> que escribas en una nota aparece acá como filtro.' },
  { v: 1, tab: 'notas', sel: '.grid .note', t: 'Abrí una nota', x: 'Tocándola se abre. Las listas con <b>[ ]</b> se tildan directo desde la tarjeta.' },
  { v: 1, sheet: () => { const n = firstNote(); if (n) noteEditor(n); }, sel: '.edtools', t: 'Dentro de una nota', x: 'Sumale audio, foto, dibujo o una lista (el tilde), y elegí el color. Arriba: <b>fijar</b>, <b>archivar</b> y <b>papelera</b> (se vacía sola a los 30 días).' },
  { v: 1, tab: 'cal', sel: '.cal', t: 'Calendario', x: 'Los puntitos son eventos (de su color) y el círculo vacío, tareas que vencen. Tocá un día para ver lo que tiene abajo. Con las flechas cambiás de mes.' },
  { v: 1, tab: 'cal', sel: '[data-a=newEv]', t: 'Eventos completos', x: 'Desde acá (o tocando un evento) elegís horario o todo el día, repetición (diaria, semanal con días, mensual, anual, hasta cuándo), color y si en <b>Lifebgood</b> es misión Principal, Secundaria o Solo aviso. En uno que se repite podés borrar un solo día.' },
  { v: 1, tab: 'tareas', sel: '.task .tick', wait: 'tick', t: 'Completá una tarea', x: 'Tocá el círculo para marcarla como hecha. Si te equivocaste, tocá <b>Deshacer</b>. Las tareas se ordenan en atrasadas, hoy, próximas y sin fecha.' },
  { v: 1, tab: 'diario', sel: '.dtoday', t: 'Tu diario', x: 'Una página por día, con el nombre del día como título. Escribís y se guarda solo. Arriba ves cuántos días llevás y tu racha.' },
  { v: 1, tab: 'diario', sel: '[data-a=dimp]', t: 'Traé tu diario viejo', x: 'Pegá el texto o elegí los archivos de tu otra app (.txt, .md, .json o .csv). Detecta las fechas, te muestra qué días encontró antes de importar y no duplica si importás dos veces.' },
  { v: 1, tab: 'hoy', sel: '[data-a=search]', t: 'Buscar en todo', x: 'Busca en notas, diario, eventos y tareas a la vez. En la compu, la tecla <b>/</b> te lleva directo a la barra de carga.' },
  { v: 1, tab: 'hoy', sel: '#syncBtn', t: 'Sincronización', x: 'Este puntito te dice cómo está todo: <b style="color:#5fd39a">verde</b> al día, <b style="color:#f4b740">amarillo</b> falta subir algo o conectar Google (tocalo), <b style="color:#ff7b7b">rojo</b> hubo un error, gris sin conectar.' },
  { v: 1, sheet: () => openSettings(), sel: '#sheet .card', t: 'Ajustes', x: 'Calendario y tareas se sincronizan con Google; notas, audios y diario, con tu GitHub en Gists privados. Si ya usás Lifebgood en este navegador, se conecta solo. También podés exportar una copia con todo.' },
  { v: 2, sheet: () => openSettings(), sel: '#cardG', t: 'Conectá Google', x: 'Si Lifebgood está en este navegador, el ID de cliente se toma solo. Si no, tocá <b>¿Dónde lo consigo?</b>: te lleva directo a Google Cloud → Credenciales para copiar el <b>ID de cliente</b> (el mismo de Lifebgood) y pegarlo acá.' },
  { v: 2, sheet: () => openSettings(), sel: '#cardC', t: 'Conectá la nube', x: 'Para que tus notas y tu diario estén en el celu y en la compu hace falta un <b>token de GitHub</b> con permiso <b>gist</b> (sirve el de FUNVS). La guía tiene un link que lo crea con todo ya marcado.' },
  { v: 3, sheet: () => openSettings(), sel: '#cardL', t: 'Protegé tu Myndvs', x: 'Con una <b>contraseña</b>, todo lo que guardás queda cifrado: en el celu, en la nube y en las copias. Se pide una vez por día (dura hasta la medianoche). Si te la olvidás no se puede recuperar, así que anotala en un lugar seguro.' },
  { v: 1, t: 'Instalala en el celu', x: 'En Chrome: menú <b>⋮</b> → <b>Agregar a la pantalla principal</b> (o <b>Instalar app</b>). Queda como una app más, abre al instante y funciona sin señal.' },
  { v: 1, end: true, t: '¡Listo!', x: 'Ya sabés usar todo. Podés volver a ver este tutorial cuando quieras desde <b>Ajustes → Tutorial</b>. Cuando sume cosas nuevas, te aviso y te muestro solo las novedades.' }
];

let T = null;
function tourStart(onlyNew) {
  const seen = +(localStorage.getItem(TOUR_KEY) || 0);
  const steps = onlyNew ? STEPS.filter(s => s.v > seen || s.end) : STEPS.slice();
  if (!steps.length) return;
  tourStop(true);
  const root = document.createElement('div'); root.className = 'tour';
  root.innerHTML = '<div class="tour-catch"></div><div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(root);
  T = { steps, i: 0, root, made: [], onlyNew };
  document.addEventListener('myndvs:cap', onCap); document.addEventListener('myndvs:tick', onTick);
  window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
  root.querySelector('.tour-card').addEventListener('click', onCard);
  show();
}
function tourStop(silent) {
  if (!T) return;
  T.root.remove();
  document.removeEventListener('myndvs:cap', onCap); document.removeEventListener('myndvs:tick', onTick);
  window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
  try { localStorage.setItem(TOUR_KEY, String(TOUR_V)); } catch (e) { /* nada */ }
  T = null;
  if (!silent && !$('#sheet').hidden) closeSheet();
}
function onCap(e) { if (!T) return; T.made.push(e.detail.id); const s = T.steps[T.i]; if (s.wait && s.wait === e.detail.k) setTimeout(() => go(1), 500); }
function onTick() { if (!T) return; const s = T.steps[T.i]; if (s.wait === 'tick') setTimeout(() => go(1), 600); }
async function go(d) { if (!T) return; T.i = Math.max(0, Math.min(T.steps.length - 1, T.i + d)); await show(); }
async function show() {
  const s = T.steps[T.i];
  if (!s.sheet && !$('#sheet').hidden) await closeSheet();
  if (s.tab && (tab !== s.tab || query)) { query = ''; $('#searchBox').hidden = true; $('#brand').hidden = false; tab = s.tab; render(); window.scrollTo(0, 0); }
  if (s.sheet) { if (!$('#sheet').hidden) await closeSheet(); s.sheet(); }
  if (!T) return;
  const card = T.root.querySelector('.tour-card'), n = T.steps.length;
  const target = s.sel ? $(s.sel) : null;
  T.target = target;
  T.root.classList.toggle('free', !!s.wait && !!target);
  card.innerHTML = `<div class="tc-top"><span>${T.onlyNew ? 'Novedades · ' : ''}${T.i + 1} de ${n}</span><button class="ib" data-t="x" aria-label="Salir del tutorial">${ICO.x}</button></div>
    <h3>${s.t}</h3><p>${s.x}</p>
    ${s.wait && target ? '<p class="tc-wait">Hacelo y sigo solo 👆</p>' : ''}
    ${s.end && T.made.length ? `<p class="tc-wait">Creaste ${T.made.length} ejemplo${T.made.length === 1 ? '' : 's'} durante el tutorial.</p>` : ''}
    <div class="tc-bar"><span class="tc-dots">${T.steps.map((x, j) => `<i class="${j === T.i ? 'on' : j < T.i ? 'ok' : ''}"></i>`).join('')}</span>
      ${T.i ? '<button class="ghost sm" data-t="back">Atrás</button>' : ''}
      ${s.end ? (T.made.length ? '<button class="ghost sm" data-t="clean">Borrar ejemplos</button>' : '') + '<button class="primary sm" data-t="done">Terminar</button>'
        : s.wait && target ? '<button class="ghost sm" data-t="next">Saltear</button>' : `<button class="primary sm" data-t="next">${T.i || T.onlyNew ? 'Siguiente' : 'Empezar'}</button>`}</div>`;
  if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
  requestAnimationFrame(place);
  if (s.wait && target && /INPUT|TEXTAREA/.test(target.tagName)) setTimeout(() => target.focus(), 250);
}
function place() {
  if (!T) return;
  const hole = T.root.querySelector('.tour-hole'), card = T.root.querySelector('.tour-card'), t = T.target;
  const W = innerWidth, H = innerHeight, cw = Math.min(360, W - 24);
  card.style.width = cw + 'px';
  if (!t || !t.isConnected) { hole.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = (W - cw) / 2 + 'px'; card.style.top = Math.max(12, (H - card.offsetHeight) / 2) + 'px'; return; }
  const r = t.getBoundingClientRect(), p = 6;
  const hh = Math.min(r.height + p * 2, H * 0.55);
  hole.style.cssText = `left:${r.left - p}px;top:${r.top - p}px;width:${r.width + p * 2}px;height:${hh}px`;
  const below = r.top + hh / 2 < H / 2;
  let top = below ? r.top - p + hh + 12 : r.top - p - 12 - card.offsetHeight;
  top = Math.max(10, Math.min(H - card.offsetHeight - 10, top));
  card.style.top = top + 'px';
  card.style.left = Math.max(12, Math.min(W - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
}
async function onCard(e) {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const a = b.dataset.t;
  if (a === 'next') go(1);
  else if (a === 'back') go(-1);
  else if (a === 'x' || a === 'done') { tourStop(); tab = 'hoy'; render(); }
  else if (a === 'clean') {
    for (const id of T.made) { const it = ITEMS.get(id); if (!it) continue; if (it.k === 'note') { for (const m of it.media || []) await DB.del('blobs', m.id); it.gone = true; it.text = ''; it.media = []; await save(it, { quiet: true }); } else await delItem(it); }
    T.made = []; toast('Ejemplos borrados'); tourStop(); tab = 'hoy'; render();
  }
}
document.addEventListener('keydown', e => { if (T && e.key === 'Escape') { e.stopImmediatePropagation(); tourStop(); render(); } }, true);
document.addEventListener('click', e => { const b = e.target.closest('[data-a=tour],[data-a=tourNew]'); if (!b) return; e.stopImmediatePropagation(); closeSheet().then(() => tourStart(b.dataset.a === 'tourNew')); }, true);
function tourAuto() {
  const seen = +(localStorage.getItem(TOUR_KEY) || 0);
  if (!seen) setTimeout(() => tourStart(false), 600);
  else if (seen < TOUR_V) toast('Hay novedades en Myndvs', { label: 'Mostrame', fn: () => tourStart(true) });
}
