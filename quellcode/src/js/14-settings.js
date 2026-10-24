/* Einstellungen, Daten & Tastaturkürzel */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; Bus.emit('installable'); });

function applyTheme() {
  const t = State.settings.theme === 'gaming' ? 'gaming' : 'clean';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('merkwerk-theme', t); } catch (e) { /* egal */ }
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'gaming' ? '#140F33' : '#2F5BEA');
}

function settingRow(label, help, control) {
  return h('div', { class: 'setting' }, h('div', { class: 'setting-text' }, h('div', { class: 'setting-label' }, label), help ? h('div', { class: 'muted small' }, help) : null), h('div', { class: 'setting-control' }, control));
}
function toggle(checked, onChange, label) {
  const inp = h('input', { type: 'checkbox', role: 'switch', checked, 'aria-label': label });
  inp.addEventListener('change', () => onChange(inp.checked));
  return h('label', { class: 'switch' }, inp, h('span', { class: 'switch-track' }, h('span', { class: 'switch-thumb' })));
}
function rangeCtl(value, min, max, step, fmt, onChange, label) {
  const out = h('output', { class: 'range-out' }, fmt(value));
  const inp = h('input', { type: 'range', min, max, step, value, 'aria-label': label });
  inp.addEventListener('input', () => { out.textContent = fmt(Number(inp.value)); });
  inp.addEventListener('change', () => onChange(Number(inp.value)));
  return h('div', { class: 'range' }, inp, out);
}

function renderSettings(main) {
  clear(main);
  const S = State.settings;
  const save = async (patch, rerender = false) => { Object.assign(S, patch); await Store.saveSettings(); if (rerender) renderSettings(main); };

  const themeCards = h('div', { class: 'theme-pick', role: 'radiogroup', 'aria-label': 'Design' },
    [['clean', 'Clean', 'hell, ruhig, dezente Animationen'], ['gaming', 'Gaming', 'dunkel, Neon, mehr Effekte']].map(([k, l, d]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(S.theme === k), class: `theme-opt theme-${k} ${S.theme === k ? 'is-selected' : ''}`,
      onClick: async () => { await save({ theme: k }); applyTheme(); renderSettings(main); },
    }, h('div', { class: 'theme-swatch' }, h('i'), h('i'), h('i')), h('strong', {}, l), h('span', { class: 'muted small' }, d))));

  const ttsSel = h('select', { class: 'input', 'aria-label': 'Vorlese-Sprache' }, TTS_LANGS.map(([v, l]) => h('option', { value: v, selected: S.ttsLang === v }, l)));
  ttsSel.addEventListener('change', () => save({ ttsLang: ttsSel.value }));

  const storageInfo = h('span', { class: 'muted small' }, '…');
  (async () => {
    try {
      const est = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      storageInfo.textContent = `${est ? `${(est.usage / 1048576).toFixed(1).replace('.', ',')} MB belegt` : ''}${persisted ? ' · dauerhaft gespeichert' : ''}`;
    } catch (e) { storageInfo.textContent = ''; }
  })();

  const shortcuts = [
    ['Leertaste', 'Karte umdrehen'], ['1 · 2 · 3 · 4', 'Nochmal · Schwer · Gut · Leicht'], ['→ / ← / ↑', 'wischen: gewusst / nochmal / schwer'],
    ['Enter', 'prüfen bzw. Vorschlag übernehmen'], ['1–9', 'Multiple Choice: Antwort wählen'], ['1–8 + A–H', 'Zuordnen'],
    ['← / →', 'Wahr oder falsch'], ['Zahl, dann ↑/↓', 'Reihenfolge verschieben'], ['H', 'Tipp zeigen'], ['S', 'Vorlesen'], ['E', 'Karte bearbeiten'], ['Z', 'Bewertung rückgängig'], ['Esc', 'Lernrunde beenden'],
    ['L', 'Startseite: Lernrunde starten'], ['N', 'Ordner: neue Karte'], ['/', 'Ordner: suchen'], ['Strg + Enter', 'Editor: speichern'],
  ];

  main.append(
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Einstellungen'))),
    h('section', { class: 'panel settings-group' }, h('h2', { class: 'section-title' }, 'Darstellung'),
      themeCards,
      settingRow('Klänge', 'Kurze Töne bei richtigen und falschen Antworten.', toggle(S.sound, (v) => save({ sound: v }), 'Klänge'))),
    h('section', { class: 'panel settings-group' }, h('h2', { class: 'section-title' }, 'Lernen'),
      settingRow('Tagesziel', 'So viele Antworten pro Tag halten deine Serie am Leben.', rangeCtl(S.dailyGoal, 5, 200, 5, (v) => `${v} Karten`, (v) => save({ dailyGoal: v }), 'Tagesziel')),
      settingRow('Neue Karten pro Tag', 'Wie viele unbekannte Karten pro Tag dazukommen. Mehr neue Karten = mehr Wiederholungen in den Folgetagen.', rangeCtl(S.newPerDay, 0, 100, 5, (v) => `${v}`, (v) => save({ newPerDay: v }), 'Neue Karten pro Tag')),
      settingRow('Ziel-Behaltensrate', 'Wie sicher du dich bei einer Wiederholung erinnern sollst. Höher = öfter wiederholen.', rangeCtl(Math.round(S.retention * 100), 80, 97, 1, (v) => `${v} %`, (v) => save({ retention: v / 100 }), 'Ziel-Behaltensrate')),
      settingRow('Themen mischen (Interleaving)', 'Karten aus verschiedenen Ordnern abwechseln – das festigt Wissen nachweislich besser als Blocklernen.', toggle(S.interleave, (v) => save({ interleave: v }), 'Themen mischen')),
      settingRow('Kartentyp-Abwechslung', 'Klassische Karten werden manchmal als Eintipp- oder Multiple-Choice-Frage gestellt.', toggle(S.variety, (v) => save({ variety: v }), 'Kartentyp-Abwechslung')),
      settingRow('Problemkarten erkennen ab', 'Nach so vielen „Nochmal“ bei einer gelernten Karte wird sie als Problemkarte markiert.', rangeCtl(S.leechThreshold, 3, 12, 1, (v) => `${v}× vergessen`, (v) => save({ leechThreshold: v }), 'Problemkarten-Schwelle')),
      settingRow('Neuer Lerntag beginnt um', 'Wer nach Mitternacht lernt, zählt so noch zum Vortag.', rangeCtl(S.dayStartHour, 0, 8, 1, (v) => `${v}:00 Uhr`, (v) => save({ dayStartHour: v }), 'Tagesbeginn')),
      settingRow('Vorlese-Sprache', 'Standard für alle Ordner. Pro Ordner änderbar (Ordner bearbeiten).', ttsSel)),
    h('section', { class: 'panel settings-group' }, h('h2', { class: 'section-title' }, 'Daten & Sicherung'),
      h('p', { class: 'muted small' }, 'Deine Daten liegen nur auf diesem Gerät, in diesem Browser. Um sie aufs Handy oder den PC zu übertragen, exportiere eine Sicherung und importiere sie auf dem anderen Gerät.'),
      settingRow('Sicherung exportieren', 'Alle Ordner, Karten, Bilder, dein Lernfortschritt und Erfolge in einer Datei.', h('button', { class: 'btn', type: 'button', onClick: exportBackup }, Icons.get('download'), 'Sicherung speichern')),
      settingRow('Sicherung oder Stapel importieren', 'Eine Sicherung ersetzt alle Daten. Ein Stapel wird hinzugefügt.', h('button', { class: 'btn', type: 'button', onClick: () => openImportDialog(null) }, Icons.get('upload'), 'Datei importieren')),
      settingRow('Speicher', State.persistent ? 'Gespeichert in IndexedDB.' : 'Achtung: Dieser Browser erlaubt keinen dauerhaften Speicher. Daten gehen beim Schließen verloren – bitte regelmäßig exportieren.', storageInfo),
      settingRow('Alle Daten löschen', 'Entfernt alle Ordner, Karten und deinen Fortschritt von diesem Gerät.', h('button', { class: 'btn btn-danger', type: 'button', onClick: async () => {
        if (!(await confirmDialog({ title: 'Wirklich alles löschen?', text: 'Alle Ordner, Karten, Bilder und dein Lernfortschritt werden von diesem Gerät entfernt. Das kann nicht rückgängig gemacht werden.', ok: 'Alles löschen', danger: true }))) return;
        await Store.wipeAll(); toast('Alle Daten gelöscht.', 'ok'); go('home');
      } }, Icons.get('trash'), 'Alles löschen'))),
    h('section', { class: 'panel settings-group' }, h('h2', { class: 'section-title' }, 'Tastatur & Gesten'),
      h('div', { class: 'shortcut-grid' }, shortcuts.map(([k, d]) => h('div', { class: 'shortcut' }, h('kbd', {}, k), h('span', {}, d)))),
      h('p', { class: 'muted small' }, 'Am Handy: Tippe auf die Karte zum Umdrehen. Danach nach rechts wischen = gewusst, nach links = nochmal, nach oben = schwer. Bei Wahr/Falsch: rechts = wahr, links = falsch.')),
    h('section', { class: 'panel settings-group' }, h('h2', { class: 'section-title' }, 'App'),
      installPrompt ? settingRow('Als App installieren', 'Merkwerk bekommt ein eigenes Symbol und startet ohne Browserleiste.', h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderSettings(main); } }, Icons.get('download'), 'Installieren')) : null,
      settingRow('Version', location.protocol === 'file:' ? 'Offline-Einzeldatei' : (navigator.serviceWorker?.controller ? 'Offline verfügbar' : 'Wird für die Offline-Nutzung vorbereitet …'), h('span', { class: 'muted' }, `Merkwerk ${APP_VERSION}`)),
      settingRow('Einführung', 'Zeigt die kurze Tour noch einmal.', h('button', { class: 'btn btn-quiet', type: 'button', onClick: () => showWelcome(true) }, 'Tour zeigen'))));
}
