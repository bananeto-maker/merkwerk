/* Startseite „Heute“: fällige Karten, Tagesziel, Serie, Herausforderungen, Prüfungen */
function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Noch wach?' : hr < 11 ? 'Guten Morgen' : hr < 17 ? 'Hallo' : hr < 22 ? 'Guten Abend' : 'Späte Lernrunde?';
}

function levelChip() {
  const li = Gami.levelInfo();
  return h('div', { class: 'level-chip', title: `${fmtNum(State.profile.xp)} XP gesamt` },
    h('div', { class: 'level-num' }, String(li.level)),
    h('div', { class: 'level-meta' },
      h('div', { class: 'level-title' }, li.title),
      h('div', { class: 'xpbar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(li.need), 'aria-valuenow': String(li.into), 'aria-label': 'Fortschritt zum nächsten Level' },
        h('div', { class: 'xpbar-fill', style: { width: `${(li.into / li.need) * 100}%` } })),
      h('div', { class: 'level-xp' }, `${fmtNum(li.into)} / ${fmtNum(li.need)} XP`)));
}
function streakChip() {
  const s = Gami.streakAlive();
  const hit = todayStats().goalHit;
  return h('div', { class: `streak-chip ${hit ? 'is-hot' : ''}`, title: hit ? 'Tagesziel heute erreicht' : 'Erreiche dein Tagesziel, um die Serie zu verlängern' },
    Icons.get('flame'), h('strong', {}, String(s)), h('span', {}, s === 1 ? 'Tag' : 'Tage'),
    State.profile.freezes ? h('span', { class: 'freeze', title: `${State.profile.freezes} Freeze-Tag(e) – retten deine Serie, wenn du einen Tag aussetzt` }, Icons.get('snow'), String(State.profile.freezes)) : null);
}

function examInfo(folder) {
  const cards = Store.cardsIn(folder.id);
  const today = dayKey();
  const daysLeft = daysBetweenKeys(today, folder.examDate);
  const examTs = dayStartTs(folder.examDate);
  const safe = cards.filter((c) => FSRS.retrievability(c.srs, examTs) >= 0.85).length;
  const fresh = cards.filter((c) => c.srs.state === 'new').length;
  const perDay = daysLeft > 0 ? Math.ceil(fresh / daysLeft) : fresh;
  return { cards: cards.length, daysLeft, safe, fresh, perDay };
}

function renderHome(main) {
  clear(main);
  const counts = Store.dueCounts(null);
  const todayTotal = counts.due + counts.learning + counts.newToday;
  const ts = todayStats();
  const goal = State.settings.dailyGoal;

  if (Gami.pendingNotice) { toast(Gami.pendingNotice, Gami.pendingNotice.includes('Freeze') ? 'snow' : 'info', { duration: 6000 }); Gami.pendingNotice = null; }

  const head = h('header', { class: 'page-head home-head' },
    h('div', {}, h('p', { class: 'eyebrow-quiet' }, new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })),
      h('h1', {}, greeting())),
    h('div', { class: 'head-chips' }, streakChip(), levelChip()));

  if (!State.cards.size) {
    main.append(head, h('section', { class: 'onboard' },
      h('div', { class: 'onboard-card index-card' },
        h('h2', {}, 'Deine Kartei ist noch leer'),
        h('p', {}, 'Leg einen Ordner an und schreib deine ersten Karten – oder importiere einen fertigen Stapel, zum Beispiel einen, den Claude aus deinen Unterlagen erstellt hat.'),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => { const f = await Store.createFolder({ name: 'Mein erster Ordner', emoji: '📘' }); go(`library/${f.id}`); openEditor({ folderId: f.id }); } }, Icons.get('plus'), 'Erste Karte schreiben'),
          h('button', { class: 'btn', type: 'button', onClick: () => openImportDialog(null) }, Icons.get('upload'), 'Stapel importieren'),
          h('button', { class: 'btn btn-quiet', type: 'button', onClick: loadDemoDeck }, Icons.get('sparkle'), 'Beispielstapel ansehen')))));
    return;
  }

  // Hero: Kartenstapel mit fälligen Karten
  const stack = h('div', { class: 'hero-stack', 'aria-hidden': 'true' }, h('div', { class: 'stack-sheet s3' }), h('div', { class: 'stack-sheet s2' }));
  const heroCard = h('div', { class: 'hero-card index-card' },
    h('div', { class: 'hero-count' }, String(todayTotal)),
    h('div', { class: 'hero-label' }, todayTotal === 1 ? 'Karte für heute' : 'Karten für heute'),
    h('div', { class: 'hero-split' },
      h('span', { class: 'pill pill-review' }, `${counts.due} Wiederholen`),
      h('span', { class: 'pill pill-learn' }, `${counts.learning} Im Lernen`),
      h('span', { class: 'pill pill-new' }, `${counts.newToday} Neu`)));
  stack.appendChild(heroCard);
  const startBtn = todayTotal
    ? h('button', { class: 'btn btn-primary btn-xl', type: 'button', id: 'start-learning', onClick: () => startStudy({ folderId: null, mode: 'learn' }) }, Icons.get('play'), 'Jetzt lernen')
    : h('button', { class: 'btn btn-xl', type: 'button', onClick: () => chooseModeFolder('cram') }, Icons.get('rotate'), 'Freiwillig weiterüben');
  const goalBox = h('div', { class: 'goal-box' },
    h('div', { class: 'goal-ring' }, progressRing(ts.reviews / goal, 92, 9, `Tagesziel ${ts.reviews} von ${goal}`),
      h('div', { class: 'goal-ring-num' }, h('strong', {}, String(Math.min(ts.reviews, 999))), h('span', {}, `/ ${goal}`))),
    h('div', {}, h('h3', {}, ts.goalHit ? 'Tagesziel geschafft' : 'Tagesziel'),
      h('p', { class: 'muted' }, ts.goalHit ? 'Deine Serie ist für heute gesichert. Alles Weitere ist Bonus.' : `Noch ${Math.max(0, goal - ts.reviews)} Antworten bis zum Ziel.`)));

  const hero = h('section', { class: 'hero' },
    stack,
    h('div', { class: 'hero-side' },
      todayTotal ? h('p', { class: 'hero-lead' }, counts.due + counts.learning ? 'Wiederhole jetzt, solange die Karten noch frisch abrufbar sind.' : 'Keine Wiederholungen offen – Zeit für neue Karten.')
        : h('p', { class: 'hero-lead' }, 'Für heute ist alles erledigt. Morgen warten die nächsten Karten.'),
      startBtn,
      !isTouch() && todayTotal ? h('p', { class: 'muted small kbd-hint' }, 'Tipp: ', h('kbd', {}, 'L'), ' startet die Lernrunde.') : null,
      goalBox));

  // Herausforderungen
  const challenge = h('section', { class: 'section' },
    h('h2', { class: 'section-title' }, 'Herausforderungen'),
    h('div', { class: 'tiles' },
      modeTile('clock', 'Zeit-Challenge', '60 Sekunden, so viele Karten wie möglich. Combos geben Bonuspunkte.',
        State.profile.high.challenge ? `Rekord: ${fmtNum(State.profile.high.challenge)} Punkte` : 'Noch kein Rekord', () => chooseModeFolder('challenge'), 'tile-time'),
      modeTile('sword', 'Bossangriff', 'Deine 10 schwersten Karten gegen den Boss. Einmal am Tag doppelter Schaden, drei Leben.',
        State.profile.high.bossWins ? `${State.profile.high.bossWins} Bosse besiegt` : 'Noch kein Boss besiegt', () => (RPG.hasHero() ? chooseModeFolder('boss') : go('hero')), 'tile-boss'),
      modeTile('rotate', 'Freies Üben', 'Ohne Auswirkung auf deinen Lernplan – ideal kurz vor einer Prüfung.', 'Beliebiger Ordner', () => chooseModeFolder('cram'), 'tile-cram')));

  // Prüfungen
  const exams = Array.from(State.folders.values()).filter((f) => f.examDate && f.examDate >= dayKey()).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const examSec = exams.length ? h('section', { class: 'section' },
    h('h2', { class: 'section-title' }, 'Prüfungen'),
    h('div', { class: 'exam-list' }, exams.map((f) => {
      const ei = examInfo(f);
      const pct = ei.cards ? ei.safe / ei.cards : 0;
      return h('button', { class: 'exam-row', type: 'button', onClick: () => go(`library/${f.id}`) },
        h('div', { class: 'exam-days' }, h('strong', {}, ei.daysLeft === 0 ? 'Heute' : String(ei.daysLeft)), ei.daysLeft === 0 ? null : h('span', {}, ei.daysLeft === 1 ? 'Tag' : 'Tage')),
        h('div', { class: 'exam-main' },
          h('div', { class: 'exam-name' }, `${f.emoji || '📁'} ${f.name}`, h('span', { class: 'muted' }, ` · ${fmtDate(f.examDate)}`)),
          h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${pct * 100}%` } })),
          h('div', { class: 'muted small' }, `${ei.safe} von ${ei.cards} Karten sitzen bis zur Prüfung`, ei.fresh ? ` · empfohlen: ${ei.perDay} neue Karten pro Tag` : '')));
    }))) : null;

  // Problemkarten
  const leeches = Array.from(State.cards.values()).filter((c) => c.leech);
  const leechSec = leeches.length ? h('section', { class: 'section' },
    h('div', { class: 'leech-banner' }, Icons.get('alert'),
      h('div', {}, h('strong', {}, plural(leeches.length, 'Problemkarte', 'Problemkarten')),
        h('p', { class: 'muted small' }, 'Diese Karten vergisst du immer wieder. Meist hilft es, sie umzuformulieren, aufzuteilen oder eine Eselsbrücke zu ergänzen.')),
      h('button', { class: 'btn', type: 'button', onClick: () => showLeeches() }, 'Ansehen'))) : null;

  const rpgSec = h('section', { class: 'section' }, h('h2', { class: 'section-title' }, RPG.hasHero() ? `${RPG.d.char.name} gegen …` : 'Abenteuer'),
    RPG.hasHero()
      ? h('div', { class: 'home-rpg' }, h('a', { class: 'home-hero-link', href: '#/hero', 'aria-label': 'Zum Helden' }, heroEl(110)), bossCard(),
        RPG.d.chests.length ? h('button', { class: 'btn btn-primary chest-cta', type: 'button', onClick: () => openChestDialog(RPG.d.chests[0].id) }, Icons.get('chest'), RPG.d.chests.length > 1 ? `${RPG.d.chests.length} Truhen öffnen` : 'Truhe öffnen') : null)
      : h('button', { class: 'tile tile-hero', type: 'button', onClick: () => go('hero') },
        h('div', { class: 'tile-icon' }, Icons.get('shield')), h('h3', {}, 'Erschaffe deinen Helden'),
        h('p', {}, 'Mach aus jeder richtigen Antwort einen Treffer gegen Fantasy-Bosse. Besiegte Bosse lassen Truhen mit Gold und Ausrüstung zurück.'),
        h('div', { class: 'tile-meta' }, 'Held erstellen')));
  main.append(head, hero, leechSec, rpgSec, examSec, challenge);
}

function modeTile(icon, title, text, meta, onClick, cls) {
  return h('button', { class: `tile ${cls}`, type: 'button', onClick },
    h('div', { class: 'tile-icon' }, Icons.get(icon)),
    h('h3', {}, title), h('p', {}, text), h('div', { class: 'tile-meta' }, meta));
}

async function chooseModeFolder(mode) {
  if (!State.cards.size) { toast('Erstelle zuerst ein paar Karten.', 'warn'); return; }
  const titles = { challenge: 'Zeit-Challenge: Ordner wählen', boss: 'Bossangriff: Ordner wählen', cram: 'Freies Üben: Ordner wählen', learn: 'Lernen: Ordner wählen' };
  const r = await folderPickerDialog({ title: titles[mode], ok: 'Los geht’s' });
  if (!r) return;
  startStudy({ folderId: r.root ? null : r.id, mode });
}

function showLeeches() {
  const leeches = Array.from(State.cards.values()).filter((c) => c.leech);
  const list = h('div', { class: 'card-list' }, leeches.map((c) => cardRow(c, { onEdit: () => { m.close(); openEditor({ cardId: c.id }); } })));
  const m = Modal.open({
    title: 'Problemkarten', size: 'lg',
    body: h('div', {},
      h('div', { class: 'tips' },
        h('p', {}, h('strong', {}, 'So bekommst du sie in den Griff:')),
        h('ul', {},
          h('li', {}, 'Teile die Karte in mehrere kleinere Fragen auf (eine Information pro Karte).'),
          h('li', {}, 'Ergänze eine Eselsbrücke, ein Bild oder ein Beispiel.'),
          h('li', {}, 'Stelle die Frage anders, z. B. als Lückentext oder Zuordnung.'),
          h('li', {}, 'Sobald du eine Karte bearbeitest, verschwindet die Markierung.'))),
      list),
    actions: [{ label: 'Schließen', kind: 'primary' }],
  });
}
