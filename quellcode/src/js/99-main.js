/* App-Gerüst: Navigation, Router, Start */
const NAV = [
  ['home', 'home', 'Heute'],
  ['library', 'folder', 'Ordner'],
  ['hero', 'shield', 'Held'],
  ['stats', 'chart', 'Statistik'],
  ['badges', 'trophy', 'Erfolge'],
  ['settings', 'settings', 'Einstellungen', 'Optionen'],
];

function go(path) {
  const target = `#/${path}`;
  if (location.hash === target) route(); else location.hash = target;
}

function buildShell() {
  const app = $('#app');
  clear(app);
  const nav = h('nav', { class: 'nav', 'aria-label': 'Hauptnavigation' },
    h('a', { class: 'brand', href: '#/home', 'aria-label': 'Merkwerk – Startseite' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'brand-name' }, 'Merkwerk')),
    h('div', { class: 'nav-links' }, NAV.map(([r, icon, label, short]) => h('a', { class: 'nav-link', href: `#/${r}`, dataset: { route: r }, 'aria-label': label }, Icons.get(icon),
      h('span', { class: short ? 'nl-long' : '' }, label), short ? h('span', { class: 'nl-short', 'aria-hidden': 'true' }, short) : null,
      r === 'hero' ? h('span', { class: 'nav-dot', id: 'hero-dot', hidden: true }) : null))),
    h('div', { class: 'nav-foot' },
      h('div', { class: 'nav-level', id: 'nav-level' }),
      h('button', { class: 'nav-theme', type: 'button', id: 'theme-toggle', onClick: async () => {
        State.settings.theme = State.settings.theme === 'gaming' ? 'clean' : 'gaming';
        applyTheme(); paintNavFoot();
        await Store.saveSettings();
        if (location.hash.startsWith('#/settings')) route();
      } })));
  app.append(nav, h('main', { class: 'main', id: 'main', tabindex: '-1' }));
  paintNavFoot();
}
function paintNavFoot() {
  const li = Gami.levelInfo();
  const lv = $('#nav-level');
  if (lv) {
    clear(lv);
    lv.append(h('span', { class: 'nl-badge' }, String(li.level)), h('span', { class: 'nl-text' }, h('span', {}, RPG.hasHero() ? RPG.d.char.name : li.title), h('span', { class: 'xpbar' }, h('span', { class: 'xpbar-fill', style: { width: `${(li.into / li.need) * 100}%` } }))),
      RPG.hasHero() ? h('span', { class: 'nl-gold', title: 'Gold' }, Icons.get('coin'), fmtNum(RPG.d.gold)) : null);
  }
  const dot = $('#hero-dot');
  if (dot) dot.hidden = !(RPG.hasHero() && (RPG.d.chests.length || RPG.pointsFree()));
  const tt = $('#theme-toggle');
  if (tt) {
    clear(tt);
    const gaming = State.settings.theme === 'gaming';
    tt.append(Icons.get(gaming ? 'sun' : 'moon'), h('span', {}, gaming ? 'Clean-Design' : 'Gaming-Design'));
    tt.setAttribute('aria-label', gaming ? 'Zum Clean-Design wechseln' : 'Zum Gaming-Design wechseln');
  }
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [view, arg] = hash.split('/');
  if (view === 'study') {
    if (!Study.active) { history.replaceState(null, '', '#/home'); route(); }
    return;
  }
  if (Study.active) {
    if (Study.s?.timer) clearInterval(Study.s.timer);
    Study.s = null; Study.active = false;
    document.body.classList.remove('is-studying');
  }
  $$('.menu-pop').forEach((m) => m.remove());
  const main = $('#main');
  if (!main) return;
  $$('.nav-link').forEach((a) => a.classList.toggle('is-active', a.dataset.route === view || (view === '' && a.dataset.route === 'home')));
  $$('.nav-link').forEach((a) => (a.classList.contains('is-active') ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const titles = { home: 'Heute', library: 'Ordner', hero: 'Held', stats: 'Statistik', badges: 'Erfolge', settings: 'Einstellungen' };
  document.title = `${titles[view] || 'Merkwerk'} · Merkwerk`;
  try {
    if (view === 'library') renderLibrary(main, arg || null);
    else if (view === 'hero') renderHero(main, arg || null);
    else if (view === 'stats') renderStats(main);
    else if (view === 'badges') renderBadges(main);
    else if (view === 'settings') renderSettings(main);
    else renderHome(main);
  } catch (e) {
    console.error(e);
    clear(main).append(emptyState('alert', 'Da ist etwas schiefgelaufen', `Fehler: ${e.message}. Lade die Seite neu – deine Daten sind gespeichert.`));
  }
  paintNavFoot();
  if (!Modal.stack.length) window.scrollTo(0, 0);
}

function showWelcome(force = false) {
  if (State.settings.onboarded && !force) return;
  const steps = [
    ['folder', 'Ordner & Karten', 'Sortiere deine Karten in Ordner und Unterordner. 8 Kartentypen sorgen für Abwechslung – von klassisch bis Bildbereiche abdecken.'],
    ['calendar', 'Clever wiederholen', 'Der FSRS-Algorithmus plant jede Karte genau dann ein, kurz bevor du sie vergessen würdest. Mit Prüfungsdatum sitzt alles rechtzeitig.'],
    ['zap', 'Spielerisch dranbleiben', 'Sammle XP, halte deine Serie und erschaffe einen Helden: Jede richtige Antwort trifft einen Fantasy-Boss, der Truhen mit Gold und Ausrüstung hinterlässt.'],
    ['keyboard', 'PC & Handy', isTouch() ? 'Tippe zum Umdrehen und wische: rechts = gewusst, links = nochmal, hoch = schwer.' : 'Leertaste dreht um, 1–4 bewertet, Pfeiltasten wischen. Am Handy wischst du mit dem Finger.'],
  ];
  Modal.open({
    title: 'Willkommen bei Merkwerk', size: 'md', className: 'welcome',
    body: h('div', { class: 'welcome-steps' }, steps.map(([icon, t, d]) => h('div', { class: 'welcome-step' }, h('div', { class: 'ws-icon' }, Icons.get(icon)), h('div', {}, h('h3', {}, t), h('p', { class: 'muted' }, d))))),
    onClose: async () => { if (!State.settings.onboarded) { State.settings.onboarded = true; await Store.saveSettings(); } },
    actions: force ? [{ label: 'Schließen', kind: 'primary' }] : [
      { label: 'Leer starten' },
      { label: 'Mit Beispielstapel starten', kind: 'primary', icon: 'sparkle', onClick: () => { loadDemoDeck(); } },
    ],
  });
}

function onGlobalKey(e) {
  if (Study.active) { Study.onKey(e); return; }
  if (Modal.stack.length || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const view = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  const k = e.key.toLowerCase();
  if (k === 'l' && view[0] === 'home') { const b = $('#start-learning'); if (b) { e.preventDefault(); b.click(); } }
  else if (k === 'n' && view[0] === 'library' && view[1]) { e.preventDefault(); openEditor({ folderId: view[1] }); }
  else if (e.key === '/' && view[0] === 'library') { const s = $('.search-input'); if (s) { e.preventDefault(); s.focus(); } }
}

async function init() {
  const app = $('#app');
  app.append(h('div', { class: 'boot' }, h('div', { class: 'brand-mark big', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('p', {}, 'Merkwerk lädt …')));
  await Store.load();
  applyTheme();
  buildShell();
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', () => { if (Study.active && !location.hash.startsWith('#/study')) route(); });
  document.addEventListener('keydown', onGlobalKey);
  window.addEventListener('resize', debounce(() => { if (Study.active) Study.updateTouchMode(); }, 150));
  Bus.on('profile', paintNavFoot);
  Bus.on('levelup', (lvl) => {
    const li = Gami.levelInfo();
    setTimeout(() => { toast(`Level ${lvl} erreicht – ${li.title}!${RPG.hasHero() ? ' +2 Fähigkeitspunkte für deinen Helden.' : ''}`, 'xp', { duration: 5000 }); Fx.confetti(140); Sound.level(); }, 300);
  });
  Bus.on('installable', () => { if (location.hash.startsWith('#/settings')) route(); });
  if (location.hash.startsWith('#/study')) history.replaceState(null, '', '#/home');
  route();
  if (!State.persistent) toast('Dein Browser blockiert den dauerhaften Speicher. Exportiere regelmäßig eine Sicherung.', 'warn', { duration: 9000 });
  showWelcome();
  if ((location.protocol === 'https:' || location.protocol === 'http:') && 'serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'activated' && hadController) toast('Merkwerk wurde aktualisiert.', 'ok', { action: { label: 'Neu laden', fn: () => location.reload() } });
        });
      });
    }).catch(() => { /* Offline-Modus nicht verfügbar, App funktioniert trotzdem */ });
  }
  window.Merkwerk = { State, Store, IO, FSRS, Study, CardTypes, DB, RPG, version: APP_VERSION };
}

init().catch((e) => {
  console.error(e);
  const app = $('#app');
  clear(app).append(h('div', { class: 'boot' }, h('h1', {}, 'Merkwerk konnte nicht starten'), h('p', {}, e.message)));
});
