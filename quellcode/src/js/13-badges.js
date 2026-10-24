/* Abzeichen (Erfolge) */
const BADGES = [
  { id: 'first_card', icon: 'plus', name: 'Erste Karte', desc: 'Erstelle deine erste Karte.', test: () => State.cards.size >= 1 },
  { id: 'cards_100', icon: 'book', name: 'Kartensammler:in', desc: 'Habe 100 Karten in deiner Kartei.', test: () => State.cards.size >= 100 },
  { id: 'cards_1000', icon: 'book', name: 'Wandelnde Bibliothek', desc: 'Habe 1.000 Karten in deiner Kartei.', test: () => State.cards.size >= 1000 },
  { id: 'folders_5', icon: 'folder', name: 'Ordnungsprofi', desc: 'Lege 5 Ordner an.', test: () => State.folders.size >= 5 },
  { id: 'importer', icon: 'upload', name: 'Lieferung angekommen', desc: 'Importiere zum ersten Mal einen Kartenstapel.', test: () => State.profile.totals.imports >= 1 },
  { id: 'reviews_100', icon: 'check', name: 'Warm gelaufen', desc: 'Beantworte 100 Karten.', test: () => State.profile.totals.reviews >= 100 },
  { id: 'reviews_1000', icon: 'check', name: 'Tausendsassa', desc: 'Beantworte 1.000 Karten.', test: () => State.profile.totals.reviews >= 1000 },
  { id: 'reviews_5000', icon: 'star', name: 'Wissensmaschine', desc: 'Beantworte 5.000 Karten.', test: () => State.profile.totals.reviews >= 5000 },
  { id: 'streak_3', icon: 'flame', name: 'Angezündet', desc: 'Erreiche 3 Tage in Folge dein Tagesziel.', test: () => State.profile.bestStreak >= 3 },
  { id: 'streak_7', icon: 'flame', name: 'Wochenflamme', desc: '7 Tage Serie.', test: () => State.profile.bestStreak >= 7 },
  { id: 'streak_30', icon: 'flame', name: 'Monatsfeuer', desc: '30 Tage Serie.', test: () => State.profile.bestStreak >= 30 },
  { id: 'streak_100', icon: 'flame', name: 'Unauslöschlich', desc: '100 Tage Serie.', test: () => State.profile.bestStreak >= 100 },
  { id: 'perfect', icon: 'target', name: 'Fehlerfrei', desc: 'Schließe eine Lernrunde mit mindestens 10 Karten ohne „Nochmal“ ab.', test: () => State.profile.totals.perfectSessions >= 1 },
  { id: 'combo_15', icon: 'zap', name: 'Im Flow', desc: 'Schaffe eine 15er-Combo.', test: (c) => c.session && c.session.bestCombo >= 15 },
  { id: 'night_owl', icon: 'moon', name: 'Nachteule', desc: 'Lerne nach 23 Uhr.', test: (c) => c.session && c.session.done >= 5 && (new Date().getHours() >= 23 || new Date().getHours() < 4) },
  { id: 'early_bird', icon: 'sun', name: 'Frühaufsteher:in', desc: 'Lerne vor 7 Uhr morgens.', test: (c) => c.session && c.session.done >= 5 && new Date().getHours() >= 4 && new Date().getHours() < 7 },
  { id: 'boss_1', icon: 'sword', name: 'Bossbezwinger:in', desc: 'Besiege deinen ersten Boss.', test: () => State.profile.high.bossWins >= 1 },
  { id: 'boss_10', icon: 'sword', name: 'Drachentöter:in', desc: 'Besiege 10 Bosse.', test: () => State.profile.high.bossWins >= 10 },
  { id: 'challenge_150', icon: 'clock', name: 'Blitzdenker:in', desc: 'Erreiche 150 Punkte in der Zeit-Challenge.', test: () => State.profile.high.challenge >= 150 },
  { id: 'challenge_400', icon: 'clock', name: 'Lichtgeschwindigkeit', desc: 'Erreiche 400 Punkte in der Zeit-Challenge.', test: () => State.profile.high.challenge >= 400 },
  { id: 'all_types', icon: 'sparkle', name: 'Allrounder:in', desc: 'Lerne mit allen 8 Kartentypen.', test: () => TYPE_ORDER.every((t) => State.profile.totals.typesLearned[t]) },
  { id: 'leech_fix', icon: 'bulb', name: 'Problemlöser:in', desc: 'Überarbeite eine Problemkarte.', test: () => State.profile.totals.leechFixed >= 1 },
  { id: 'hero', icon: 'shield', name: 'Ein Held erwacht', desc: 'Erschaffe deinen Helden.', test: () => RPG.hasHero() },
  { id: 'chest_1', icon: 'chest', name: 'Schatzjäger:in', desc: 'Öffne deine erste Schatztruhe.', test: () => (State.profile.rpg?.chestsOpened || 0) >= 1 },
  { id: 'legendary', icon: 'star', name: 'Legendärer Fund', desc: 'Besitze einen legendären Gegenstand.', test: () => (State.profile.rpg?.legendaryFound || 0) >= 1 },
  { id: 'reward_1', icon: 'gift', name: 'Gönn dir was', desc: 'Kaufe eine eigene Belohnung im Shop.', test: () => (State.profile.rpg?.purchases || []).some((p) => p.kind === 'reward') },
  { id: 'level_5', icon: 'trophy', name: 'Level 5', desc: 'Erreiche Level 5.', test: () => Gami.levelInfo().level >= 5 },
  { id: 'level_15', icon: 'trophy', name: 'Level 15', desc: 'Erreiche Level 15.', test: () => Gami.levelInfo().level >= 15 },
  { id: 'level_30', icon: 'trophy', name: 'Legende', desc: 'Erreiche Level 30.', test: () => Gami.levelInfo().level >= 30 },
];

const Badges = {
  evaluate(ctx = {}) {
    const got = State.profile.badges;
    const fresh = BADGES.filter((b) => !got[b.id] && (() => { try { return b.test(ctx); } catch (e) { return false; } })());
    if (!fresh.length) return;
    fresh.forEach((b) => { got[b.id] = Date.now(); });
    Store.saveProfile();
    fresh.forEach((b, i) => setTimeout(() => { toast(`Abzeichen freigeschaltet: ${b.name}`, 'badge', { duration: 4500 }); Sound.level(); }, 400 + i * 900));
    Bus.emit('profile');
  },
};

function renderBadges(main) {
  clear(main);
  const got = State.profile.badges;
  const li = Gami.levelInfo();
  const earned = BADGES.filter((b) => got[b.id]).length;
  main.append(
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Erfolge'), h('p', { class: 'muted' }, `${earned} von ${BADGES.length} Abzeichen freigeschaltet`))),
    h('section', { class: 'level-panel panel' },
      h('div', { class: 'level-big' }, h('span', { class: 'muted' }, 'Level'), h('strong', {}, String(li.level))),
      h('div', { class: 'level-panel-main' },
        h('h2', {}, li.title),
        h('div', { class: 'xpbar big' }, h('div', { class: 'xpbar-fill', style: { width: `${(li.into / li.need) * 100}%` } })),
        h('p', { class: 'muted small' }, `${fmtNum(li.need - li.into)} XP bis Level ${li.level + 1} · ${fmtNum(State.profile.xp)} XP gesamt`),
        h('p', { class: 'muted small' }, 'XP gibt’s für jede Antwort (Gut: 10, Leicht: 12, Schwer: 6, Nochmal: 2), Combo-Boni, fehlerfreie Runden, Challenges und Bosskämpfe.'))),
    h('section', { class: 'section' }, h('div', { class: 'badge-grid' }, BADGES.map((b) => h('div', { class: `badge ${got[b.id] ? 'is-earned' : ''}` },
      h('div', { class: 'badge-medal' }, Icons.get(b.icon)),
      h('div', {}, h('h3', {}, b.name), h('p', { class: 'muted small' }, b.desc),
        got[b.id] ? h('p', { class: 'small badge-date' }, `am ${new Date(got[b.id]).toLocaleDateString('de-AT')}`) : null))))));
}
