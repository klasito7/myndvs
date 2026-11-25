/* Contraseña de Myndvs: cifra todo lo guardado (en el celu y en la nube) con AES-GCM de 256 bits.
   La clave sale de la contraseña con PBKDF2 (SHA-256, 600.000 vueltas) y nunca se guarda la contraseña.
   Al desbloquear, la clave (no exportable) queda guardada hasta la medianoche: se pide una vez por día. */
'use strict';
const LOCK = (() => {
  const ITER = 600000, enc8 = new TextEncoder(), dec8 = new TextDecoder();
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function derive(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', enc8.encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter || ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encBytes(key, bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return o; }
  async function decBytes(key, all) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12))); }
  const encStr = async (key, s) => b64(await encBytes(key, enc8.encode(s)));
  const decStr = async (key, s) => dec8.decode(await decBytes(key, unb64(s)));
  const midnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
  async function check(key, lk) { try { return (await decStr(key, lk.check)) === 'myndvs-ok'; } catch (e) { return false; } }
  async function create(pass, salt) {
    salt = salt || crypto.getRandomValues(new Uint8Array(16));
    const key = await derive(pass, salt, ITER);
    return { key, lock: { v: 1, salt: b64(salt), iter: ITER, check: await encStr(key, 'myndvs-ok') } };
  }
  async function open(pass, lk) { const key = await derive(pass, unb64(lk.salt), lk.iter); return (await check(key, lk)) ? key : null; }
  return { b64, unb64, encBytes, decBytes, encStr, decStr, create, open, midnight };
})();

/* ---------- guardar / leer cifrado (lo usa DB en app.js) ---------- */
let CK = null; // la clave del día, si hay contraseña
async function sealVal(store, v) {
  if (!CK) return v;
  if (store === 'items') return { id: v.id, x: await LOCK.encBytes(CK, new TextEncoder().encode(JSON.stringify(v))) };
  if (store === 'blobs') return { x: await LOCK.encBytes(CK, new Uint8Array(await v.arrayBuffer())), type: v.type };
  return v;
}
async function openVal(store, r) {
  if (!r || !r.x) return r; // sin cifrar (de antes de poner contraseña)
  if (!CK) throw new Error('locked');
  const bytes = await LOCK.decBytes(CK, r.x);
  return store === 'items' ? JSON.parse(new TextDecoder().decode(bytes)) : new Blob([bytes], { type: r.type || '' });
}
const keyRec = () => DB.run('kv', 'readonly', o => o.get('key'));
async function keepKey(key) { await DB.run('kv', 'readwrite', o => o.put({ key, exp: LOCK.midnight() }, 'key')); }
async function forgetKey() { await DB.run('kv', 'readwrite', o => o.delete('key')); }

/* ---------- pantalla de bloqueo ---------- */
function lockScreen() {
  return new Promise(resolve => {
    const ov = document.createElement('div'); ov.className = 'lockov';
    ov.innerHTML = `<form class="lockbox" autocomplete="off">
      <img src="icon.svg" alt="" width="64" height="64"><h2>Myndvs</h2><p class="mute">Ingresá tu contraseña. Queda abierta hasta la medianoche.</p>
      <input type="password" id="lkIn" placeholder="Contraseña" autocomplete="current-password" required>
      <p class="warn small" id="lkErr" hidden></p>
      <button class="primary" type="submit" id="lkGo">Abrir</button>
      <details class="lkforgot"><summary>Me olvidé la contraseña</summary><p class="mute small">No hay forma de recuperarla: tus datos están cifrados con ella y nadie más la tiene (ni Google ni GitHub ni yo). Lo único posible es borrar todo lo de este aparato y empezar de cero.</p>
        <button type="button" class="ghost" id="lkWipe">Borrar todo en este aparato</button></details></form>`;
    document.body.appendChild(ov);
    const inp = $('#lkIn', ov), err = $('#lkErr', ov); let fails = 0, wipeArm = false;
    setTimeout(() => inp.focus(), 100);
    $('form', ov).onsubmit = async e => {
      e.preventDefault(); const btn = $('#lkGo', ov); btn.disabled = true; btn.textContent = 'Abriendo…'; err.hidden = true;
      const key = await LOCK.open(inp.value, cfg.lock).catch(() => null);
      if (key) { await keepKey(key); CK = key; ov.remove(); resolve(); return; }
      fails++; inp.value = '';
      const wait = fails >= 5 ? Math.min(300, 15 * 2 ** (fails - 5)) : 0;
      err.textContent = wait ? `Contraseña incorrecta. Esperá ${wait} segundos.` : 'Contraseña incorrecta.'; err.hidden = false;
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Abrir'; inp.focus(); }, wait * 1000);
    };
    $('#lkWipe', ov).onclick = async e => {
      if (!wipeArm) { wipeArm = true; e.target.textContent = 'Tocá de nuevo para borrar TODO'; return; }
      DB.db.close(); await new Promise(r => { const q = indexedDB.deleteDatabase('myndvs'); q.onsuccess = q.onerror = q.onblocked = r; });
      for (const k of Object.keys(localStorage)) if (k.startsWith('myndvs')) localStorage.removeItem(k);
      location.reload();
    };
  });
}
async function lockAtStart() {
  if (!cfg.lock) return;
  const r = await keyRec().catch(() => null);
  if (r && r.key && r.exp > Date.now()) { CK = r.key; return; }
  await forgetKey().catch(() => {});
  await lockScreen();
}
/* pasada la medianoche con la app abierta: se bloquea */
document.addEventListener('visibilitychange', async () => {
  if (document.hidden || !cfg.lock) return;
  const r = await keyRec().catch(() => null);
  if (!r || r.exp <= Date.now()) location.reload();
});

/* ---------- poner / sacar la contraseña ---------- */
async function rewriteAll() {
  for (const it of ITEMS.values()) await DB.put('items', it);
  for (const k of await DB.keys('blobs')) { const raw = await DB.run('blobs', 'readonly', o => o.get(k)); const b = await openVal('blobs', raw); await DB.put('blobs', b, k); }
}
async function lockEnable(pass) {
  // si otro aparato ya protegió la nube, hay que usar la misma contraseña
  let remote = null;
  if (ghTok()) { try { remote = await remoteLock(); } catch (e) { /* sin nube ahora */ } }
  let key, lock;
  if (remote) { key = await LOCK.open(pass, remote); if (!key) return 'Tu nube ya está protegida con otra contraseña (la que pusiste en otro aparato). Usá esa.'; lock = remote; }
  else ({ key, lock } = await LOCK.create(pass));
  if (ghTok() && !remote) { try { await cloudSync(false); } catch (e) { /* nada */ } } // primero se trae lo de la nube sin cifrar
  CK = key; cfg.lock = lock; saveCfg();
  await rewriteAll(); await keepKey(key);
  if (ghTok() && !remote) await cloudRestart(); // la nube vieja (sin cifrar) se borra y se vuelve a subir cifrada
  else if (ghTok()) cloudSync(false);
  return '';
}
async function lockDisable() {
  const all = [...ITEMS.values()];
  const blobs = []; for (const k of await DB.keys('blobs')) blobs.push([k, await DB.get('blobs', k)]);
  CK = null; cfg.lock = null; saveCfg(); await forgetKey();
  for (const it of all) await DB.put('items', it);
  for (const [k, b] of blobs) if (b) await DB.put('blobs', b, k);
  if (ghTok()) await cloudRestart();
}
async function lockNow() { await forgetKey(); location.reload(); }
