'use strict';
/* Allgemeine Hilfsfunktionen */
const APP_VERSION = '__APP_VERSION__';
const MIN = 60e3, HOUR = 36e5, DAY = 864e5;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/** Kleiner DOM-Baukasten: h('div', {class:'x', onClick: fn}, kinder...) */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  appendKids(el, kids);
  return el;
}
function appendKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false || k === '') continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
/* append() ignoriert leere Werte (null/false), damit optionale Elemente einfach weggelassen werden können */
const nativeAppend = Element.prototype.append;
Element.prototype.append = function (...nodes) { return nativeAppend.apply(this, nodes.filter((n) => n != null && n !== false && n !== '')); };
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n) => Number(n || 0).toLocaleString('de-AT');
const plural = (n, one, many) => `${fmtNum(n)} ${n === 1 ? one : many}`;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function deepClone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

/* ---------- Tage (ein Lerntag beginnt um DAY_START_HOUR Uhr) ---------- */
let DAY_START_HOUR = 4;
function dayKey(ts = Date.now()) {
  const d = new Date(ts - DAY_START_HOUR * HOUR);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function keyToDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
function dayStartTs(key) { return keyToDate(key).getTime() + DAY_START_HOUR * HOUR; }
function addDaysKey(key, n) { const d = keyToDate(key); d.setDate(d.getDate() + n); return dayKey(d.getTime() + DAY_START_HOUR * HOUR + HOUR); }
function daysBetweenKeys(a, b) { return Math.round((keyToDate(b) - keyToDate(a)) / DAY); }
function endOfToday() { return dayStartTs(addDaysKey(dayKey(), 1)); }
function fmtDate(key) { return keyToDate(key).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' }); }

function formatInterval(ms) {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} Min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} Std`;
  const d = ms / DAY;
  if (d < 30) return `${Math.round(d)} T`;
  if (d < 365) return `${(d / 30.4).toFixed(d < 304 ? 1 : 0).replace('.', ',').replace(',0', '')} Mon`;
  return `${(d / 365).toFixed(1).replace('.', ',').replace(',0', '')} J`;
}

/* ---------- Antworten tolerant vergleichen ---------- */
function normalizeAnswer(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
/** Vergleicht eine Eingabe mit einer oder mehreren richtigen Antworten.
 *  Ergebnis: 'exact' | 'close' (kleiner Tippfehler) | 'wrong' */
function matchAnswer(given, accepted) {
  const g = normalizeAnswer(given);
  if (!g) return 'wrong';
  let best = 'wrong';
  for (const acc of accepted) {
    const a = normalizeAnswer(acc);
    if (!a) continue;
    if (g === a) return 'exact';
    const gn = g.replace(/\s/g, ''), an = a.replace(/\s/g, '');
    if (gn === an) return 'exact';
    if (/^-?\d+([.,]\d+)?$/.test(String(given).trim()) && /^-?\d+([.,]\d+)?$/.test(String(acc).trim())) {
      if (parseFloat(String(given).replace(',', '.')) === parseFloat(String(acc).replace(',', '.'))) return 'exact';
      continue;
    }
    if (an.length >= 4) {
      const tol = Math.max(1, Math.floor(an.length / 6));
      if (levenshtein(gn, an) <= tol) best = 'close';
    }
  }
  return best;
}

/* ---------- Dateien ---------- */
function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, style: { display: 'none' } });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
function readFileAsText(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file); });
}
function readFileAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
}
function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Bild konnte nicht geladen werden')); im.src = src; });
}
/** Verkleinert Bilder (max. Kantenlänge) und speichert sie platzsparend als WebP/JPEG. */
async function compressImage(file, maxDim = 1400) {
  const src = await readFileAsDataURL(file);
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return src;
  const im = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.round(im.naturalWidth * scale), hgt = Math.round(im.naturalHeight * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = hgt;
  c.getContext('2d').drawImage(im, 0, 0, w, hgt);
  let out = c.toDataURL('image/webp', 0.86);
  if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.86);
  return out.length < src.length ? out : src;
}
function pickFile(accept) {
  return new Promise((res) => {
    const inp = h('input', { type: 'file', accept, style: { display: 'none' } });
    inp.addEventListener('change', () => { res(inp.files[0] || null); inp.remove(); });
    document.body.appendChild(inp);
    inp.click();
  });
}
const isTouch = () => matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
