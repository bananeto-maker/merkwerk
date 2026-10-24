/* Oberflächen-Bausteine: Icons, Dialoge, Hinweise, Klänge und Effekte */
const Icons = (() => {
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2.2h7.5A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    folderPlus: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2.2h7.5A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M12 10v6M9 13h6"/>',
    chart: '<path d="M3 20h18M6.5 16v-5M11.5 16V6M16.5 16v-8"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    move: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2.2h7.5A2.5 2.5 0 0 1 21 8.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M9 13h6M12.5 10.5 15 13l-2.5 2.5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16.5-5-5-10 8.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
    volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    sword: '<path d="M20 4v5L9.5 19.5l-5-5L15 4zM6.5 12.5l5 5M3 21l3.5-3.5"/>',
    flame: '<path d="M12 3c.8 3.2 5.5 5.4 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.4 1.2-4 2.3-5 .1 2.1 1.1 3.2 2.2 3.3-.3-3.4.2-6.2 1-8.8z"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
    flip: '<path d="M4 8h13.5L14 4.5M20 16H6.5l3.5 3.5"/>',
    list: '<path d="M9.5 6H20M9.5 12H20M9.5 18H20"/><circle cx="5" cy="6" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="18" r="1.2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    cloze: '<path d="M3 7h18M3 17h5M16 17h5"/><rect x="9.5" y="14.5" width="5" height="5" rx="1" stroke-dasharray="2 2"/>',
    scale: '<path d="M12 4v16M7 20h10M4.5 8h15M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/>',
    sort: '<path d="M8 4v16M4.5 7.5 8 4l3.5 3.5M16 20V4M12.5 16.5 16 20l3.5-3.5"/>',
    grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    zap: '<path d="M13 3 4.5 13.5H11L10 21l8.5-10.5H12z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
    text: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    shuffle: '<path d="M3 7h3.5c4 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.9-1.6 4-3.5M14 9.5c1-1.5 2.2-2.5 3.5-2.5H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    rotate: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    helm: '<path d="M4 15a8 8 0 0 1 16 0v3h-5v-4H9v4H4z"/><path d="M12 7V3"/>',
    armor: '<path d="M8 3 4 5v6l2 1v9h12v-9l2-1V5l-4-2-4 3z"/><path d="M12 6v15"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6z"/>',
    amulet: '<path d="M7 3c0 5 2 7 5 8 3-1 5-3 5-8"/><circle cx="12" cy="16" r="4.5"/><path d="M12 14v4M10 16h4"/>',
    chest: '<path d="M3.5 11h17v8.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M3.5 11V9a5 5 0 0 1 5-5h7a5 5 0 0 1 5 5v2"/><rect x="10" y="9.5" width="4" height="4.5" rx="1"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.6-2.5 2-2.5.9-2.5 2.2 1.1 2.3 2.5 2.3 2.5-.9 2.5-2"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8C10 4 6.5 4.5 7 7c.3 1.3 2.7 1 5 1zM12 8c2-4 5.5-3.5 5-1-.3 1.3-2.7 1-5 1z"/>',
    bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
  };
  function get(name, cls = '') {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.info}</svg>`;
    return t.content.firstChild;
  }
  return { get, has: (n) => !!P[n] };
})();

/* ---------- Dialoge ---------- */
const Modal = {
  stack: [],
  open({ title, body, actions = [], size = '', onClose, dismissable = true, className = '' }) {
    const prevFocus = document.activeElement;
    const close = (result) => {
      if (!overlay.isConnected) return;
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), prefersReducedMotion() ? 0 : 160);
      this.stack = this.stack.filter((m) => m !== api);
      document.removeEventListener('keydown', onKey, true);
      if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* egal */ }
      onClose && onClose(result);
    };
    const onKey = (e) => {
      if (this.stack[this.stack.length - 1] !== api) return;
      if (e.key === 'Escape' && dismissable) { e.preventDefault(); e.stopPropagation(); close(null); }
      if (e.key === 'Tab') {
        const f = $$('button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), a[href]', dialog).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    const footer = actions.length ? h('div', { class: 'modal-actions' }, actions.map((a) => h('button', {
      class: `btn ${a.kind ? 'btn-' + a.kind : 'btn-quiet'}`, type: 'button', disabled: a.disabled,
      onClick: async () => { const r = a.onClick ? await a.onClick() : undefined; if (r !== false && a.close !== false) close(a.value ?? r); },
    }, a.icon ? Icons.get(a.icon) : null, a.label))) : null;
    const dialog = h('div', { class: `modal ${size ? 'modal-' + size : ''} ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
      title ? h('div', { class: 'modal-head' }, h('h2', {}, title), dismissable ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Schließen', onClick: () => close(null) }, Icons.get('x')) : null) : null,
      h('div', { class: 'modal-body' }, body), footer);
    const overlay = h('div', { class: 'overlay', onClick: (e) => { if (e.target === overlay && dismissable) close(null); } }, dialog);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey, true);
    const api = { close, el: dialog, footer };
    this.stack.push(api);
    requestAnimationFrame(() => {
      const first = dialog.querySelector('[autofocus], input:not([type=checkbox]):not([type=radio]), textarea, select') || footer?.querySelector('.btn-primary, .btn-danger') || dialog.querySelector('button');
      first && first.focus({ preventScroll: true });
    });
    return api;
  },
  closeAll() { [...this.stack].forEach((m) => m.close(null)); },
};

function confirmDialog({ title, text, ok = 'OK', danger = false, cancel = 'Abbrechen' }) {
  return new Promise((res) => {
    Modal.open({
      title, body: h('p', {}, text), size: 'sm', onClose: (r) => res(r === true),
      actions: [{ label: cancel, value: false }, { label: ok, kind: danger ? 'danger' : 'primary', value: true, onClick: () => true }],
    });
  });
}
function promptDialog({ title, label, value = '', ok = 'Speichern', placeholder = '' }) {
  return new Promise((res) => {
    const inp = h('input', { class: 'input', type: 'text', value, placeholder, autofocus: true, 'aria-label': label || title });
    let m;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); m.close(inp.value.trim()); } });
    m = Modal.open({
      title, size: 'sm', body: h('label', { class: 'field' }, label ? h('span', { class: 'field-label' }, label) : null, inp),
      onClose: (r) => res(typeof r === 'string' ? r : null),
      actions: [{ label: 'Abbrechen' }, { label: ok, kind: 'primary', onClick: () => (inp.value.trim() ? inp.value.trim() : (inp.focus(), false)) }],
    });
    inp.focus(); inp.select();
  });
}
/** Ordner auswählen. exclude: Ordner-IDs, die nicht wählbar sind (z. B. der Ordner selbst) */
function folderPickerDialog({ title = 'Ordner wählen', ok = 'Hierher', allowRoot = true, exclude = [], current = null }) {
  return new Promise((res) => {
    let chosen = current ?? (allowRoot ? '__root' : null);
    const tree = h('div', { class: 'picker-tree', role: 'listbox', 'aria-label': 'Ordner' });
    const render = () => {
      clear(tree);
      const row = (id, label, depth, emoji) => {
        const disabled = id !== '__root' && exclude.includes(id);
        return h('button', {
          class: `picker-row ${chosen === id ? 'is-selected' : ''}`, type: 'button', role: 'option', 'aria-selected': String(chosen === id), disabled,
          style: { paddingLeft: `${12 + depth * 18}px` }, onClick: () => { chosen = id; render(); },
        }, h('span', { class: 'emoji' }, emoji), label);
      };
      if (allowRoot) tree.appendChild(row('__root', 'Oberste Ebene', 0, '🏠'));
      const walk = (parent, depth) => Store.childFolders(parent).forEach((f) => {
        tree.appendChild(row(f.id, f.name, depth, f.emoji || '📁'));
        if (!exclude.includes(f.id)) walk(f.id, depth + 1);
      });
      walk(null, allowRoot ? 1 : 0);
      if (!State.folders.size && !allowRoot) tree.appendChild(h('p', { class: 'muted' }, 'Noch keine Ordner vorhanden.'));
    };
    render();
    Modal.open({
      title, body: tree, onClose: (r) => res(r === undefined ? null : r),
      actions: [{ label: 'Abbrechen', value: null }, {
        label: ok, kind: 'primary',
        onClick: () => (chosen ? (chosen === '__root' ? '__root' : chosen) : false),
      }],
    });
  }).then((r) => (r === '__root' ? { root: true } : r ? { id: r } : null));
}

/* ---------- Hinweise (Toasts) ---------- */
function toast(msg, kind = 'info', opts = {}) {
  let host = $('#toasts');
  if (!host) { host = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(host); }
  const icon = { info: 'info', ok: 'check', warn: 'alert', bad: 'alert', xp: 'sparkle', fire: 'flame', snow: 'snow', badge: 'trophy' }[kind] || 'info';
  const t = h('div', { class: `toast toast-${kind}` }, Icons.get(icon), h('span', { class: 'toast-msg' }, msg),
    opts.action ? h('button', { class: 'toast-action', type: 'button', onClick: () => { opts.action.fn(); remove(); } }, opts.action.label) : null);
  host.appendChild(t);
  const all = $$('.toast:not(.is-leaving)', host);
  if (all.length > 3) all.slice(0, all.length - 3).forEach((x) => x.remove());
  const remove = () => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 250); };
  setTimeout(remove, opts.duration || (opts.action ? 6000 : 3200));
  return remove;
}

/* ---------- Klänge (Web Audio, ohne Dateien) ---------- */
const Sound = {
  ctx: null,
  ensure() {
    if (!State.settings.sound) return null;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  tone(freq, start, dur, type = 'sine', vol = 0.12) {
    const c = this.ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.02);
  },
  good() { this.tone(660, 0, 0.12, 'triangle'); this.tone(990, 0.08, 0.18, 'triangle'); },
  great() { this.tone(660, 0, 0.1, 'triangle'); this.tone(880, 0.07, 0.1, 'triangle'); this.tone(1320, 0.14, 0.22, 'triangle'); },
  bad() { this.tone(220, 0, 0.22, 'sine', 0.1); this.tone(165, 0.1, 0.25, 'sine', 0.08); },
  flip() { this.tone(520, 0, 0.05, 'sine', 0.05); },
  level() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.3, 'triangle', 0.1)); },
  hit() { this.tone(140, 0, 0.12, 'square', 0.06); this.tone(90, 0.04, 0.16, 'square', 0.05); },
};

/* ---------- Effekte ---------- */
const Fx = {
  confetti(amount = 120) {
    if (prefersReducedMotion()) return;
    const c = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
    const css = getComputedStyle(document.documentElement);
    const colors = ['--accent', '--good', '--hard', '--again', '--easy', '--red-line'].map((v) => css.getPropertyValue(v).trim() || '#2F5BEA');
    const parts = Array.from({ length: amount }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 14 - 6) * dpr,
      r: (Math.random() * 5 + 4) * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() < 0.5,
    }));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
        if (p.shape) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (++frame < 150) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  },
  floatText(text, anchor, cls = '') {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const el = h('div', { class: `float-text ${cls}`, style: { left: `${r.left + r.width / 2}px`, top: `${r.top + 10}px` } }, text);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  },
};

/* Kleine wiederverwendbare Elemente */
function progressRing(value, size = 64, stroke = 7, label = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = clamp(value, 0, 1);
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(label)}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}" fill="none" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  return t.content.firstChild;
}
function emptyState(icon, title, text, action) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty-icon' }, Icons.get(icon)), h('h3', {}, title), text ? h('p', { class: 'muted' }, text) : null, action || null);
}
function iconBtn(icon, label, onClick, cls = '') {
  return h('button', { class: `icon-btn ${cls}`, type: 'button', 'aria-label': label, title: label, onClick }, Icons.get(icon));
}
/** Aufklappmenü */
function menuButton(items, label = 'Weitere Aktionen', icon = 'more') {
  const btn = iconBtn(icon, label, (e) => {
    e.stopPropagation();
    const existing = $('.menu-pop');
    if (existing) { existing.remove(); if (existing._owner === btn) return; }
    const pop = h('div', { class: 'menu-pop', role: 'menu' }, items.filter(Boolean).map((it) => h('button', {
      class: `menu-item ${it.danger ? 'is-danger' : ''}`, type: 'button', role: 'menuitem',
      onClick: (ev) => { ev.stopPropagation(); pop.remove(); it.onClick(); },
    }, Icons.get(it.icon || 'right'), it.label)));
    pop._owner = btn;
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = `${clamp(r.right - pw, 8, innerWidth - pw - 8)}px`;
    pop.style.top = `${r.bottom + ph + 8 > innerHeight ? Math.max(8, r.top - ph - 6) : r.bottom + 6}px`;
    const off = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('pointerdown', off, true); } };
    setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    pop.querySelector('button')?.focus();
    pop.addEventListener('keydown', (ev) => {
      const bs = $$('button', pop); const i = bs.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); pop.remove(); btn.focus(); }
    });
  });
  btn.setAttribute('aria-haspopup', 'menu');
  return btn;
}
