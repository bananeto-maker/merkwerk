/* Datenhaltung: Ordner, Karten, Bilder, Lernprotokoll, Profil & Einstellungen */
const DEFAULT_SETTINGS = {
  theme: 'clean',
  dailyGoal: 30,
  newPerDay: 20,
  retention: 0.9,
  interleave: true,
  variety: true,
  sound: true,
  leechThreshold: 6,
  dayStartHour: 4,
  ttsLang: 'de-DE',
  onboarded: false,
};
const DEFAULT_PROFILE = {
  xp: 0, streak: 0, bestStreak: 0, freezes: 0, lastGoalDay: null, frozenDays: [],
  days: {}, badges: {},
  high: { challenge: 0, bossWins: 0, bossLosses: 0 },
  totals: { reviews: 0, correct: 0, created: 0, imports: 0, perfectSessions: 0, leechFixed: 0, typesLearned: {} },
};

const State = {
  folders: new Map(),
  cards: new Map(),
  media: new Map(),
  mediaIndex: new Map(),
  settings: { ...DEFAULT_SETTINGS },
  profile: deepClone(DEFAULT_PROFILE),
  persistent: true,
};

const Bus = {
  handlers: {},
  on(ev, fn) { (this.handlers[ev] ||= []).push(fn); },
  emit(ev, data) { (this.handlers[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.warn(e); } }); },
};

const Store = {
  async load() {
    State.persistent = await DB.open();
    const [folders, cards, media, meta] = await Promise.all([DB.getAll('folders'), DB.getAll('cards'), DB.getAll('media'), DB.getAll('meta')]);
    State.folders = new Map(folders.map((f) => [f.id, f]));
    State.cards = new Map(cards.map((c) => [c.id, c]));
    State.media = new Map(media.map((m) => [m.id, m.data]));
    State.mediaIndex = new Map(media.map((m) => [m.data, m.id]));
    const metaMap = Object.fromEntries(meta.map((m) => [m.key, m.value]));
    State.settings = { ...DEFAULT_SETTINGS, ...(metaMap.settings || {}) };
    State.profile = mergeProfile(metaMap.profile);
    DAY_START_HOUR = State.settings.dayStartHour;
    Gami.checkStreakOnLoad();
  },
  async saveSettings() { DAY_START_HOUR = State.settings.dayStartHour; await DB.put('meta', { key: 'settings', value: State.settings }); },
  async saveProfile() { await DB.put('meta', { key: 'profile', value: State.profile }); },

  /* ---------- Ordner ---------- */
  childFolders(parentId) {
    return Array.from(State.folders.values()).filter((f) => (f.parentId || null) === (parentId || null))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'de'));
  },
  descendantIds(id) {
    const out = [id];
    for (let i = 0; i < out.length; i++) for (const f of State.folders.values()) if (f.parentId === out[i]) out.push(f.id);
    return out;
  },
  folderPath(id) {
    const path = [];
    let f = State.folders.get(id);
    while (f) { path.unshift(f); f = State.folders.get(f.parentId); }
    return path;
  },
  folderPathString(id) { return this.folderPath(id).map((f) => f.name).join(' / '); },
  async createFolder({ name, parentId = null, emoji = '📁', color = null, examDate = null, lang = null }) {
    const f = { id: uid(), name: String(name).trim() || 'Neuer Ordner', parentId: parentId || null, emoji, color, examDate, lang, created: Date.now(), order: Date.now() };
    State.folders.set(f.id, f);
    await DB.put('folders', f);
    Bus.emit('data');
    Badges.evaluate();
    return f;
  },
  async updateFolder(id, patch) {
    const f = State.folders.get(id);
    if (!f) return;
    Object.assign(f, patch);
    await DB.put('folders', f);
    Bus.emit('data');
  },
  canMoveFolder(id, newParentId) {
    if (!newParentId) return true;
    return !this.descendantIds(id).includes(newParentId);
  },
  async moveFolder(id, newParentId) {
    if (!this.canMoveFolder(id, newParentId)) throw new Error('Ein Ordner kann nicht in sich selbst verschoben werden.');
    await this.updateFolder(id, { parentId: newParentId || null });
  },
  async deleteFolder(id) {
    const ids = this.descendantIds(id);
    const cardIds = Array.from(State.cards.values()).filter((c) => ids.includes(c.folderId)).map((c) => c.id);
    ids.forEach((i) => State.folders.delete(i));
    cardIds.forEach((i) => State.cards.delete(i));
    await DB.delMany('folders', ids);
    await DB.delMany('cards', cardIds);
    await this.gcMedia();
    Bus.emit('data');
  },
  /** Findet (oder erstellt) einen Ordner über einen Pfad wie "Biologie/Zelle" */
  async folderByPath(path, rootParentId = null, defaults = {}) {
    let parent = rootParentId || null;
    const names = String(path).split('/').map((s) => s.trim()).filter(Boolean);
    for (const name of names) {
      let f = this.childFolders(parent).find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!f) f = await this.createFolder({ name, parentId: parent, ...defaults });
      parent = f.id;
    }
    return parent;
  },
  examFor(folderId) {
    const today = dayKey();
    let best = null;
    for (const f of this.folderPath(folderId)) {
      if (f.examDate && f.examDate >= today && (!best || f.examDate < best.examDate)) best = f;
    }
    return best;
  },
  langFor(folderId) {
    const path = this.folderPath(folderId).reverse();
    return (path.find((f) => f.lang) || {}).lang || State.settings.ttsLang;
  },

  /* ---------- Bilder ---------- */
  async storeImage(value) {
    if (!value || typeof value !== 'string') return value || null;
    if (!value.startsWith('data:image/')) return value;
    const existing = State.mediaIndex.get(value);
    if (existing) return 'media:' + existing;
    const id = uid();
    State.media.set(id, value);
    State.mediaIndex.set(value, id);
    await DB.put('media', { id, data: value });
    return 'media:' + id;
  },
  async gcMedia() {
    const used = new Set();
    for (const c of State.cards.values()) collectMediaRefs(c.data, used);
    const unused = Array.from(State.media.keys()).filter((id) => !used.has(id));
    unused.forEach((id) => { State.mediaIndex.delete(State.media.get(id)); State.media.delete(id); });
    await DB.delMany('media', unused);
  },

  /* ---------- Karten ---------- */
  cardsIn(folderId, recursive = true) {
    if (folderId == null) return Array.from(State.cards.values());
    const ids = new Set(recursive ? this.descendantIds(folderId) : [folderId]);
    return Array.from(State.cards.values()).filter((c) => ids.has(c.folderId));
  },
  /** Speichert Bilder im Kartendatensatz als Verweis (media:...) */
  async internImages(data) {
    const walk = async (v) => {
      if (typeof v === 'string') return isImageRef(v) && v.startsWith('data:') ? this.storeImage(v) : v;
      if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await walk(x)); return out; }
      if (v && typeof v === 'object') { const out = {}; for (const [k, x] of Object.entries(v)) out[k] = await walk(x); return out; }
      return v;
    };
    return walk(data);
  },
  /** Legt Karten an. Gibt die erzeugten Karten zurück (Umkehrkarten und Bildbereiche erzeugen mehrere). */
  async createCards(type, folderId, rawData, opts = {}) {
    const def = CardTypes[type];
    if (!def) throw new Error(`Unbekannter Kartentyp: ${type}`);
    const data = await this.internImages(def.normalize(rawData));
    const err = def.validate(data);
    if (err) throw new Error(err);
    const now = Date.now();
    const base = { folderId, type, created: now, updated: now, leech: false, tags: opts.tags || [] };
    const out = [];
    if (type === 'occlusion') {
      const groupId = uid();
      for (const m of data.masks) out.push({ ...base, id: uid(), groupId, data: { ...data, target: m.id }, srs: FSRS.newState() });
    } else {
      const { reverse, ...rest } = data;
      out.push({ ...base, id: uid(), data: rest, srs: opts.srs || FSRS.newState() });
      if (type === 'basic' && reverse) {
        out.push({ ...base, id: uid(), data: { front: rest.back, back: rest.front, frontImage: rest.backImage || null, backImage: rest.frontImage || null, hint: '', note: rest.note || '' }, srs: FSRS.newState(), reverseOf: out[0].id });
      }
    }
    out.forEach((c) => State.cards.set(c.id, c));
    await DB.putMany('cards', out);
    if (!opts.silent) {
      State.profile.totals.created += out.length;
      await this.saveProfile();
      Bus.emit('data');
      Badges.evaluate();
    }
    return out;
  },
  /** Ändert eine Karte. Bei Bildbereich-Karten wird die ganze Gruppe angepasst. */
  async updateCard(id, rawData) {
    const card = State.cards.get(id);
    if (!card) throw new Error('Karte nicht gefunden');
    const def = CardTypes[card.type];
    const data = await this.internImages(def.normalize(rawData));
    const err = def.validate(data);
    if (err) throw new Error(err);
    const now = Date.now();
    const fixedLeech = card.leech;
    if (card.type === 'occlusion') {
      const group = Array.from(State.cards.values()).filter((c) => c.groupId === card.groupId);
      const byTarget = new Map(group.map((c) => [c.data.target, c]));
      const keep = [], remove = [];
      for (const m of data.masks) {
        const ex = byTarget.get(m.id);
        if (ex) { ex.data = { ...data, target: m.id }; ex.updated = now; ex.leech = false; keep.push(ex); byTarget.delete(m.id); }
        else keep.push({ ...card, id: uid(), data: { ...data, target: m.id }, srs: FSRS.newState(), created: now, updated: now, leech: false });
      }
      for (const c of byTarget.values()) remove.push(c.id);
      keep.forEach((c) => State.cards.set(c.id, c));
      remove.forEach((i) => State.cards.delete(i));
      await DB.putMany('cards', keep);
      await DB.delMany('cards', remove);
    } else {
      const { reverse, ...rest } = data;
      card.data = rest; card.updated = now;
      if (card.leech) { card.leech = false; card.leechCleared = card.srs.lapses; }
      await DB.put('cards', card);
    }
    if (fixedLeech) { State.profile.totals.leechFixed++; await this.saveProfile(); }
    await this.gcMedia();
    Bus.emit('data');
    Badges.evaluate();
    return State.cards.get(id) || null;
  },
  groupOf(card) {
    if (card.type !== 'occlusion' || !card.groupId) return [card];
    return Array.from(State.cards.values()).filter((c) => c.groupId === card.groupId);
  },
  async deleteCards(ids) {
    const all = new Set();
    for (const id of ids) {
      const c = State.cards.get(id);
      if (!c) continue;
      this.groupOf(c).forEach((g) => all.add(g.id));
    }
    const list = Array.from(all);
    list.forEach((i) => State.cards.delete(i));
    await DB.delMany('cards', list);
    await this.gcMedia();
    Bus.emit('data');
  },
  async moveCards(ids, folderId) {
    const changed = [];
    const all = new Set();
    ids.forEach((id) => { const c = State.cards.get(id); if (c) this.groupOf(c).forEach((g) => all.add(g.id)); });
    for (const id of all) { const c = State.cards.get(id); c.folderId = folderId; changed.push(c); }
    await DB.putMany('cards', changed);
    Bus.emit('data');
  },
  async resetProgress(ids) {
    const changed = [];
    for (const id of ids) { const c = State.cards.get(id); if (!c) continue; c.srs = FSRS.newState(); c.leech = false; changed.push(c); }
    await DB.putMany('cards', changed);
    Bus.emit('data');
  },
  search(query, folderId = null) {
    const q = normalizeAnswer(query);
    if (!q) return [];
    return this.cardsIn(folderId).filter((c) => normalizeAnswer(CardTypes[c.type].searchText(c.data)).includes(q));
  },

  /* ---------- Fällige Karten ---------- */
  isDue(card, now = Date.now()) { return card.srs.state !== 'new' && card.srs.due <= now; },
  dueCounts(folderId = null, now = Date.now()) {
    const cards = this.cardsIn(folderId);
    const endToday = endOfToday();
    let due = 0, learning = 0, fresh = 0;
    for (const c of cards) {
      if (c.srs.state === 'new') fresh++;
      else if (c.srs.due <= endToday) { if (c.srs.state === 'review') due++; else learning++; }
    }
    const newLeft = Math.max(0, State.settings.newPerDay - (todayStats().newCards || 0));
    return { due, learning, fresh, newToday: Math.min(fresh, newLeft), total: cards.length };
  },

  /* ---------- Bewertung ---------- */
  async applyReview(cardId, rating, info = {}) {
    const card = State.cards.get(cardId);
    if (!card) return null;
    const now = Date.now();
    const before = deepClone(card.srs);
    const wasNew = before.state === 'new';
    let n = FSRS.review(card.srs, rating, now, State.settings.retention);
    const exam = this.examFor(card.folderId);
    if (exam && n.state === 'review') {
      const cap = Math.max(now + HOUR, dayStartTs(addDaysKey(exam.examDate, -1)));
      if (n.due > cap) { n.due = cap; n.ivl = Math.max(0, Math.round((cap - now) / DAY)); }
    }
    card.srs = n;
    let becameLeech = false;
    const lapsesSince = n.lapses - (card.leechCleared || 0);
    if (rating === 1 && !card.leech && lapsesSince >= State.settings.leechThreshold) { card.leech = true; becameLeech = true; }
    const log = { id: uid(), cardId, ts: now, rating, ms: info.ms || 0, type: info.shownType || card.type, state: before.state, folderId: card.folderId };
    await DB.put('cards', card);
    await DB.put('logs', log);
    const stats = todayStats(true);
    stats.reviews++;
    if (rating >= 2) stats.correct++;
    if (wasNew) stats.newCards++;
    stats.ms += Math.min(info.ms || 0, 5 * MIN);
    const t = State.profile.totals;
    t.reviews++;
    if (rating >= 2) t.correct++;
    t.typesLearned[log.type] = (t.typesLearned[log.type] || 0) + 1;
    const goal = Gami.checkGoal();
    await this.saveProfile();
    return { card, before, log, becameLeech, goal };
  },
  async undoReview(undo) {
    const card = State.cards.get(undo.cardId);
    if (!card) return;
    card.srs = undo.before;
    card.leech = undo.leechBefore;
    State.profile = undo.profileBefore;
    await DB.put('cards', card);
    await DB.del('logs', undo.logId);
    await this.saveProfile();
    Bus.emit('profile');
  },
  async getLogs() { return DB.getAll('logs'); },

  async wipeAll() {
    await DB.clearAll();
    State.folders.clear(); State.cards.clear(); State.media.clear(); State.mediaIndex.clear();
    State.profile = mergeProfile(null);
    State.settings = { ...DEFAULT_SETTINGS, onboarded: true, theme: State.settings.theme };
    await this.saveSettings();
    await this.saveProfile();
    Bus.emit('data'); Bus.emit('profile');
  },
};

function mergeProfile(p) {
  const base = deepClone(DEFAULT_PROFILE);
  base.rpg = deepClone(DEFAULT_RPG);
  if (!p) return base;
  const r = p.rpg || {};
  return {
    ...base, ...p,
    high: { ...base.high, ...(p.high || {}) },
    totals: { ...base.totals, ...(p.totals || {}), typesLearned: { ...(p.totals?.typesLearned || {}) } },
    rpg: { ...base.rpg, ...r, alloc: { ...base.rpg.alloc, ...(r.alloc || {}) }, equipped: { ...base.rpg.equipped, ...(r.equipped || {}) } },
  };
}
function collectMediaRefs(v, set) {
  if (typeof v === 'string') { if (v.startsWith('media:')) set.add(v.slice(6)); return; }
  if (Array.isArray(v)) v.forEach((x) => collectMediaRefs(x, set));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectMediaRefs(x, set));
}
function todayStats(create = false) {
  const key = dayKey();
  const days = State.profile.days;
  if (!days[key]) {
    const empty = { reviews: 0, correct: 0, xp: 0, ms: 0, newCards: 0, goalHit: false };
    if (!create) return empty;
    days[key] = empty;
  }
  return days[key];
}

/* ---------- Gamification: XP, Level, Serien ---------- */
const LEVEL_TITLES = [
  [1, 'Neuling'], [3, 'Lernling'], [5, 'Kartenkenner:in'], [8, 'Merkprofi'], [12, 'Merkmeister:in'],
  [17, 'Gedächtniskünstler:in'], [23, 'Wissensmagier:in'], [30, 'Legende'],
];
const Gami = {
  xpForLevel(level) { return 100 + (level - 1) * 60; },
  levelInfo(xp = State.profile.xp) {
    let level = 1, rest = xp;
    while (rest >= this.xpForLevel(level)) { rest -= this.xpForLevel(level); level++; }
    const title = LEVEL_TITLES.filter(([l]) => level >= l).pop()[1];
    return { level, into: rest, need: this.xpForLevel(level), title };
  },
  xpForAnswer(rating, combo) {
    const base = { 1: 2, 2: 6, 3: 10, 4: 12 }[rating] || 0;
    const bonus = rating >= 2 ? (combo >= 10 ? 10 : combo >= 5 ? 5 : 0) : 0;
    return base + bonus;
  },
  /** Vergibt XP und meldet Levelaufstiege. */
  async addXp(amount) {
    if (!amount) return null;
    const before = this.levelInfo().level;
    State.profile.xp += amount;
    todayStats(true).xp += amount;
    const after = this.levelInfo().level;
    await Store.saveProfile();
    Bus.emit('profile');
    if (after > before) { Bus.emit('levelup', after); Badges.evaluate(); return after; }
    return null;
  },
  checkStreakOnLoad() {
    const p = State.profile;
    if (!p.lastGoalDay) return;
    const today = dayKey();
    const gap = daysBetweenKeys(p.lastGoalDay, today);
    if (gap <= 1) return;
    const missed = gap - 1;
    if (p.freezes >= missed) {
      for (let i = 1; i <= missed; i++) p.frozenDays.push(addDaysKey(p.lastGoalDay, i));
      p.freezes -= missed;
      p.lastGoalDay = addDaysKey(today, -1);
      this.pendingNotice = missed === 1 ? 'Ein Freeze-Tag hat deine Serie gerettet.' : `${missed} Freeze-Tage haben deine Serie gerettet.`;
    } else {
      if (p.streak > 0) this.pendingNotice = `Deine Serie von ${p.streak} Tagen ist gerissen. Heute startest du neu.`;
      p.streak = 0;
    }
    Store.saveProfile();
  },
  /** Prüft, ob das Tagesziel gerade erreicht wurde, und aktualisiert die Serie. */
  checkGoal() {
    const p = State.profile;
    const s = todayStats(true);
    if (s.goalHit || s.reviews < State.settings.dailyGoal) return null;
    s.goalHit = true;
    const today = dayKey();
    p.streak = (p.lastGoalDay === addDaysKey(today, -1)) ? p.streak + 1 : 1;
    p.lastGoalDay = today;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    let freeze = false;
    if (p.streak % 7 === 0 && p.freezes < 2) { p.freezes++; freeze = true; }
    return { streak: p.streak, freeze };
  },
  streakAlive() {
    const p = State.profile;
    if (!p.lastGoalDay) return 0;
    return daysBetweenKeys(p.lastGoalDay, dayKey()) <= 1 ? p.streak : 0;
  },
};
