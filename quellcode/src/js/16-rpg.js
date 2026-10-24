/* Fantasy-RPG: Held, Werte, Ausrüstung, Bosskampf, Truhen, Gold, Shop und eigene Belohnungen */
const RARITIES = [
  { id: 'common', name: 'Gewöhnlich', mult: 1, weight: 60, price: 60, sell: 8 },
  { id: 'rare', name: 'Selten', mult: 1.8, weight: 28, price: 150, sell: 25 },
  { id: 'epic', name: 'Episch', mult: 3, weight: 10, price: 400, sell: 70 },
  { id: 'legendary', name: 'Legendär', mult: 5, weight: 2, price: 1000, sell: 200 },
];
const RARITY = Object.fromEntries(RARITIES.map((r, i) => [r.id, { ...r, rank: i }]));
const SLOTS = [
  { id: 'weapon', name: 'Waffe', icon: 'sword' },
  { id: 'helm', name: 'Helm', icon: 'helm' },
  { id: 'armor', name: 'Rüstung', icon: 'armor' },
  { id: 'shield', name: 'Schild', icon: 'shield' },
  { id: 'amulet', name: 'Amulett', icon: 'amulet' },
];
const SLOT = Object.fromEntries(SLOTS.map((s) => [s.id, s]));
const STATS = [
  { id: 'str', name: 'Stärke', short: 'STR', desc: 'Erhöht den Grundschaden jeder richtigen Antwort.' },
  { id: 'wis', name: 'Weisheit', short: 'WEI', desc: 'Bonusschaden bei Combos (ab 5 in Folge) und bei schweren Karten.' },
  { id: 'luck', name: 'Glück', short: 'GLÜ', desc: 'Chance auf kritische Treffer und bessere Beute in Truhen.' },
];
const CLASSES = {
  warrior: { name: 'Krieger', base: { str: 5, wis: 2, luck: 2 }, bonus: '+15 % Grundschaden', desc: 'Schwer gerüstet, trifft hart und zuverlässig.', tunic: '#7D8BA6', weapon: ['Schwert', 'Streitaxt', 'Kriegshammer', 'Breitschwert'] },
  mage: { name: 'Magier', base: { str: 2, wis: 5, luck: 2 }, bonus: 'Weisheits-Bonus ×1,5', desc: 'Stark bei langen Combos und schwierigen Karten.', tunic: '#6B54D6', weapon: ['Zauberstab', 'Runenstab', 'Grimoire', 'Kristallstab'] },
  ranger: { name: 'Waldläufer', base: { str: 2, wis: 2, luck: 5 }, bonus: 'Kritische Treffer ×2,5', desc: 'Glücksjäger mit verheerenden kritischen Treffern.', tunic: '#3E8E5A', weapon: ['Langbogen', 'Jagddolch', 'Elfenbogen', 'Speer'] },
};
const SLOT_NOUNS = {
  helm: ['Helm', 'Kapuze', 'Stirnreif', 'Kriegshelm'],
  armor: ['Brustpanzer', 'Kettenhemd', 'Robe', 'Lederwams'],
  shield: ['Schild', 'Rundschild', 'Turmschild', 'Faustschild'],
  amulet: ['Amulett', 'Talisman', 'Anhänger', 'Siegelring'],
};
const SUFFIXES = {
  common: ['des Lehrlings', 'des Wanderers', 'der Wache', 'aus Eichenholz', 'des Knappen'],
  rare: ['des Nordwinds', 'der Eule', 'des Silbermonds', 'der Waldhüter', 'des Bergkönigs'],
  epic: ['der Sternenglut', 'des Sturmbrechers', 'der Runenmagie', 'des Phönix', 'der Nebelkrone'],
  legendary: ['des Drachenkönigs', 'der Ewigen Flamme', 'der Weltenesche', 'des Lichtbringers', 'der Tausend Sterne'],
};
const BOSSES = [
  { name: 'Grimmzahn', title: 'der Waldtroll', emoji: '🧌' },
  { name: 'Morwen', title: 'die Spinnenkönigin', emoji: '🕷️' },
  { name: 'Varrak', title: 'der Knochenfürst', emoji: '💀' },
  { name: 'Fenrok', title: 'der Schattenwolf', emoji: '🐺' },
  { name: 'Brumm', title: 'der Ogerhäuptling', emoji: '👹' },
  { name: 'Vespera', title: 'die Blutgräfin', emoji: '🧛' },
  { name: 'Thalassor', title: 'der Kraken der Tiefe', emoji: '🐙' },
  { name: 'Ignarax', title: 'der Feuerdrache', emoji: '🐉' },
];
const LOOKS = {
  skin: ['#F6D3B3', '#E8B48A', '#C98E62', '#9A6440', '#6B4428', '#B9D9C8'],
  hair: ['Kurz', 'Lang', 'Zopf', 'Stachelig', 'Glatze', 'Bart'],
  hairColor: ['#2B1D14', '#6A3E1F', '#B5651D', '#E3C16F', '#D9D9D9', '#C0392B', '#2E6FD8'],
  cloak: ['#B3263A', '#2F5BEA', '#1E7A50', '#6B54D6', '#D98A1C', '#2B2F3A'],
  face: ['Freundlich', 'Entschlossen', 'Fröhlich', 'Zwinkernd'],
};
const DEFAULT_RPG = {
  char: null,            // { name, cls, look: { skin, hair, hairColor, cloak, face }, created }
  alloc: { str: 0, wis: 0, luck: 0 },
  gold: 0,
  inventory: [],         // Gegenstände
  equipped: { weapon: null, helm: null, armor: null, shield: null, amulet: null },
  boss: null,            // { idx, tier, name, title, emoji, hp, maxHp, started }
  kills: 0,
  chests: [],            // ungeöffnete Truhen
  rewards: [],           // eigene Belohnungen { id, name, price }
  purchases: [],         // Kaufverlauf
  totalDamage: 0, bestHit: 0, chestsOpened: 0, lastAssault: null, legendaryFound: 0,
};

const RPG = {
  get d() { return State.profile.rpg; },
  hasHero() { return !!(State.profile.rpg && State.profile.rpg.char); },
  level() { return Gami.levelInfo().level; },

  /* ---------- Werte ---------- */
  pointsTotal() { return (this.level() - 1) * 2; },
  pointsFree() { const a = this.d.alloc; return Math.max(0, this.pointsTotal() - a.str - a.wis - a.luck); },
  item(id) { return this.d.inventory.find((i) => i.id === id) || null; },
  equippedItems() { return SLOTS.map((s) => this.item(this.d.equipped[s.id])).filter(Boolean); },
  gearAtk() { return this.equippedItems().reduce((a, i) => a + (i.atk || 0), 0); },
  stats() {
    const base = this.hasHero() ? CLASSES[this.d.char.cls].base : { str: 0, wis: 0, luck: 0 };
    const out = {};
    for (const s of STATS) {
      out[s.id] = (base[s.id] || 0) + (this.d.alloc[s.id] || 0) + this.equippedItems().reduce((a, i) => a + (i.stats?.[s.id] || 0), 0);
    }
    return out;
  },
  critChance(st = this.stats()) { return Math.min(0.5, 0.05 + st.luck * 0.01); },
  critMult() { return this.d.char?.cls === 'ranger' ? 2.5 : 2; },
  baseDamage(st = this.stats()) {
    let base = 4 + this.level() + st.str * 1.5 + this.gearAtk();
    if (this.d.char?.cls === 'warrior') base *= 1.15;
    return base;
  },
  /** Schaden für eine richtige Antwort. rnd ist austauschbar (für Tests). */
  damage({ rating = 3, combo = 0, card = null } = {}, rnd = Math.random) {
    const st = this.stats();
    const hard = rating === 2 || (card?.srs?.d >= 7) || ((card?.srs?.lapses || 0) >= 2) || !!card?.leech;
    let wisBonus = st.wis * ((combo >= 5 ? 1 : 0) + (hard ? 1.5 : 0));
    if (this.d.char?.cls === 'mage') wisBonus *= 1.5;
    let dmg = this.baseDamage(st) + wisBonus;
    const crit = rnd() < this.critChance(st);
    if (crit) dmg *= this.critMult();
    return { dmg: Math.max(1, Math.round(dmg)), crit, hard, combo: combo >= 5 };
  },
  /** Durchschnittlicher Schaden pro richtiger Antwort (Anzeige) */
  avgDamage() {
    const st = this.stats();
    const wis = st.wis * (0.35 + 0.3) * (this.d.char?.cls === 'mage' ? 1.5 : 1);
    const c = this.critChance(st);
    return Math.round((this.baseDamage(st) + wis) * (1 - c + c * this.critMult()));
  },

  /* ---------- Boss ---------- */
  bossMaxHp(tier) {
    const refDmg = 18 * Math.pow(1.2, tier);
    const hitsPerDay = Math.max(5, State.settings.dailyGoal) * 0.85;
    return Math.round(refDmg * hitsPerDay * 4);
  },
  spawnBoss() {
    const tier = this.d.kills;
    const b = BOSSES[tier % BOSSES.length];
    const round = Math.floor(tier / BOSSES.length);
    const maxHp = this.bossMaxHp(tier);
    this.d.boss = { idx: tier % BOSSES.length, tier, name: b.name, title: round ? `${b.title} (Stufe ${round + 1})` : b.title, emoji: b.emoji, hp: maxHp, maxHp, started: Date.now() };
    return this.d.boss;
  },
  ensureBoss() { if (this.hasHero() && !this.d.boss) this.spawnBoss(); return this.d.boss; },
  hitsLeft() { const b = this.d.boss; return b ? Math.ceil(b.hp / Math.max(1, this.avgDamage())) : 0; },
  /** Wendet einen Treffer an. Gibt Schaden, Krit und ggf. Sieg samt Truhe zurück. */
  hit(ctx, factor = 1) {
    if (!this.hasHero()) return null;
    const boss = this.ensureBoss();
    const r = this.damage(ctx);
    r.dmg = Math.round(r.dmg * factor);
    boss.hp = Math.max(0, boss.hp - r.dmg);
    this.d.totalDamage += r.dmg;
    this.d.bestHit = Math.max(this.d.bestHit, r.dmg);
    if (boss.hp <= 0) r.killed = this.defeatBoss();
    return r;
  },
  defeatBoss() {
    const boss = this.d.boss;
    this.d.kills++;
    State.profile.high.bossWins = (State.profile.high.bossWins || 0) + 1;
    const chest = this.makeChest(boss);
    this.d.chests.push(chest);
    this.spawnBoss();
    return { boss, chest };
  },

  /* ---------- Beute ---------- */
  rollRarity(minRank = 0, rnd = Math.random) {
    const luck = this.stats().luck;
    const w = { common: 60, rare: 28 + luck * 0.5, epic: 10 + luck * 0.5, legendary: 2 + luck * 0.2 };
    const pool = RARITIES.filter((r) => RARITY[r.id].rank >= minRank);
    const sum = pool.reduce((a, r) => a + w[r.id], 0);
    let x = rnd() * sum;
    for (const r of pool) { x -= w[r.id]; if (x <= 0) return r.id; }
    return pool[pool.length - 1].id;
  },
  makeItem({ slot = null, rarity = null, level = this.level() } = {}) {
    slot = slot || SLOTS[Math.floor(Math.random() * SLOTS.length)].id;
    rarity = rarity || this.rollRarity();
    const R = RARITY[rarity];
    const cls = this.d.char?.cls || 'warrior';
    const nouns = slot === 'weapon' ? CLASSES[cls].weapon : SLOT_NOUNS[slot];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const name = `${pick(nouns)} ${pick(SUFFIXES[rarity])}`;
    const lvl = Math.max(1, level);
    const atk = slot === 'weapon' ? Math.round((3 + lvl * 0.6) * R.mult) : Math.round((0.6 + lvl * 0.15) * R.mult);
    const main = { weapon: 'str', helm: 'wis', armor: 'str', shield: 'luck', amulet: 'luck' }[slot];
    const second = { weapon: 'luck', helm: 'luck', armor: 'wis', shield: 'str', amulet: 'wis' }[slot];
    const stats = { [main]: Math.max(1, Math.round((1 + lvl * 0.12) * R.mult * (slot === 'weapon' ? 0.5 : 1))) };
    if (R.rank >= 2) stats[second] = Math.max(1, Math.round((0.5 + lvl * 0.08) * R.mult * 0.6));
    return { id: uid(), slot, rarity, name, atk, stats, level: lvl, found: Date.now() };
  },
  power(item) { return item ? (item.atk || 0) + 1.5 * Object.values(item.stats || {}).reduce((a, v) => a + v, 0) : 0; },
  sellPrice(item) { return Math.round(RARITY[item.rarity].sell * (1 + (item.level - 1) * 0.05)); },
  makeChest(boss) {
    const tier = boss ? boss.tier : this.d.kills;
    const luck = this.stats().luck;
    const gold = Math.round((80 + tier * 30) * (1 + luck * 0.03) * (0.85 + Math.random() * 0.3));
    const count = 2 + (Math.random() < 0.3 + luck * 0.01 ? 1 : 0);
    const items = Array.from({ length: count }, (_, i) => this.makeItem({ rarity: this.rollRarity(i === 0 ? 1 : 0) }));
    return { id: uid(), gold, items, from: boss ? `${boss.name}, ${boss.title}` : 'Schatz', emoji: boss?.emoji || '🎁', ts: Date.now() };
  },
  async openChest(id) {
    const i = this.d.chests.findIndex((c) => c.id === id);
    if (i < 0) return null;
    const [chest] = this.d.chests.splice(i, 1);
    this.d.gold += chest.gold;
    this.d.inventory.push(...chest.items);
    this.d.chestsOpened++;
    this.d.legendaryFound += chest.items.filter((x) => x.rarity === 'legendary').length;
    await this.save();
    return chest;
  },

  /* ---------- Inventar ---------- */
  async equip(itemId) {
    const it = this.item(itemId);
    if (!it) return;
    this.d.equipped[it.slot] = it.id;
    await this.save();
  },
  async unequip(slot) { this.d.equipped[slot] = null; await this.save(); },
  isEquipped(itemId) { return Object.values(this.d.equipped).includes(itemId); },
  async sell(itemId) {
    const it = this.item(itemId);
    if (!it) return 0;
    if (this.isEquipped(itemId)) this.d.equipped[it.slot] = null;
    this.d.inventory = this.d.inventory.filter((x) => x.id !== itemId);
    const price = this.sellPrice(it);
    this.d.gold += price;
    await this.save();
    return price;
  },

  /* ---------- Shop & Belohnungen ---------- */
  async buyRandom(rarity) {
    const price = RARITY[rarity].price;
    if (this.d.gold < price) throw new Error(`Dir fehlen noch ${price - this.d.gold} Gold.`);
    this.d.gold -= price;
    const it = this.makeItem({ rarity });
    this.d.inventory.push(it);
    if (rarity === 'legendary') this.d.legendaryFound++;
    this.d.purchases.unshift({ id: uid(), kind: 'item', name: it.name, rarity, price, ts: Date.now() });
    await this.save();
    return it;
  },
  async saveReward({ id = null, name, price }) {
    name = String(name || '').trim();
    price = Math.round(Number(price));
    if (!name) throw new Error('Gib der Belohnung einen Namen.');
    if (!Number.isFinite(price) || price < 1) throw new Error('Der Preis muss mindestens 1 Gold sein.');
    if (id) Object.assign(this.d.rewards.find((r) => r.id === id) || {}, { name, price });
    else this.d.rewards.push({ id: uid(), name, price });
    await this.save();
  },
  async deleteReward(id) { this.d.rewards = this.d.rewards.filter((r) => r.id !== id); await this.save(); },
  async buyReward(id) {
    const r = this.d.rewards.find((x) => x.id === id);
    if (!r) return null;
    if (this.d.gold < r.price) throw new Error(`Dir fehlen noch ${r.price - this.d.gold} Gold.`);
    this.d.gold -= r.price;
    this.d.purchases.unshift({ id: uid(), kind: 'reward', name: r.name, price: r.price, ts: Date.now() });
    this.d.purchases = this.d.purchases.slice(0, 200);
    await this.save();
    return r;
  },

  /* ---------- Held ---------- */
  async saveHero({ name, cls, look }) {
    name = String(name || '').trim().slice(0, 24);
    if (!name) throw new Error('Gib deinem Helden einen Namen.');
    if (!CLASSES[cls]) throw new Error('Wähle eine Klasse.');
    const first = !this.d.char;
    this.d.char = { name, cls, look: { ...look }, created: this.d.char?.created || Date.now() };
    if (first) {
      const starter = this.makeItem({ slot: 'weapon', rarity: 'common', level: 1 });
      this.d.inventory.push(starter);
      this.d.equipped.weapon = starter.id;
      this.d.gold += 50;
      this.spawnBoss();
    }
    await this.save();
    return first;
  },
  async allocate(stat, n = 1) {
    if (this.pointsFree() < n) return;
    this.d.alloc[stat] = (this.d.alloc[stat] || 0) + n;
    await this.save();
  },
  async resetPoints() { this.d.alloc = { str: 0, wis: 0, luck: 0 }; await this.save(); },
  async save() { await Store.saveProfile(); Bus.emit('profile'); Badges.evaluate(); },
};

/* ---------- Gezeichnete Heldenfigur (SVG) ---------- */
const RARITY_COLORS = { common: '#8A94A6', rare: '#2F7FEA', epic: '#8B4FE0', legendary: '#F0A020' };
function heroSVG(look, cls, equipped = {}, size = 160) {
  const L = { skin: LOOKS.skin[0], hair: 'Kurz', hairColor: LOOKS.hairColor[1], cloak: LOOKS.cloak[0], face: 'Freundlich', ...(look || {}) };
  const C = CLASSES[cls] || CLASSES.warrior;
  const it = (slot) => (equipped[slot] ? RPG.item(equipped[slot]) : null);
  const col = (slot, fallback) => (it(slot) ? RARITY_COLORS[it(slot).rarity] : fallback);
  const hc = L.hairColor;
  const hair = {
    Kurz: `<path d="M40 38 Q41 17 60 16 Q79 17 80 38 Q74 27 60 26 Q46 27 40 38Z" fill="${hc}"/>`,
    Lang: `<path d="M38 40 Q38 15 60 15 Q82 15 82 40 L84 66 Q78 62 76 50 Q74 28 60 27 Q46 28 44 50 Q42 62 36 66Z" fill="${hc}"/>`,
    Zopf: `<path d="M40 38 Q41 17 60 16 Q79 17 80 38 Q74 27 60 26 Q46 27 40 38Z" fill="${hc}"/><path d="M78 30 Q92 40 86 66 Q83 72 80 66 Q86 46 76 36Z" fill="${hc}"/>`,
    Stachelig: `<path d="M39 36 L42 18 L49 26 L54 12 L60 24 L67 11 L71 25 L78 17 L81 36 Q72 26 60 26 Q48 26 39 36Z" fill="${hc}"/>`,
    Glatze: '',
    Bart: `<path d="M41 37 Q42 19 60 18 Q78 19 79 37 Q72 29 60 29 Q48 29 41 37Z" fill="${hc}"/><path d="M45 44 Q47 64 60 66 Q73 64 75 44 Q70 54 60 54 Q50 54 45 44Z" fill="${hc}"/>`,
  }[L.hair] || '';
  const face = {
    Freundlich: '<circle cx="53" cy="40" r="2.6" fill="#1C2740"/><circle cx="67" cy="40" r="2.6" fill="#1C2740"/><path d="M54 49 Q60 54 66 49" stroke="#1C2740" stroke-width="2" fill="none" stroke-linecap="round"/>',
    Entschlossen: '<path d="M49 35 L57 37 M71 35 L63 37" stroke="#1C2740" stroke-width="2.2" stroke-linecap="round"/><circle cx="53" cy="41" r="2.4" fill="#1C2740"/><circle cx="67" cy="41" r="2.4" fill="#1C2740"/><path d="M55 50 L65 50" stroke="#1C2740" stroke-width="2" stroke-linecap="round"/>',
    Fröhlich: '<path d="M50 41 Q53 37 56 41 M64 41 Q67 37 70 41" stroke="#1C2740" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M53 47 Q60 56 67 47 Z" fill="#1C2740"/>',
    Zwinkernd: '<circle cx="53" cy="40" r="2.6" fill="#1C2740"/><path d="M64 41 L70 40" stroke="#1C2740" stroke-width="2.2" stroke-linecap="round"/><path d="M54 49 Q61 53 66 48" stroke="#1C2740" stroke-width="2" fill="none" stroke-linecap="round"/>',
  }[L.face] || '';
  const helm = it('helm') ? `<path d="M37 40 Q37 12 60 12 Q83 12 83 40 L83 44 L75 44 L75 34 Q60 28 45 34 L45 44 L37 44Z" fill="${col('helm')}" stroke="#1C2740" stroke-width="1.5"/><path d="M60 10 L60 28" stroke="#1C2740" stroke-opacity=".35" stroke-width="2"/>` : '';
  const armor = it('armor') ? `<path d="M45 66 Q60 60 75 66 L77 98 Q60 104 43 98Z" fill="${col('armor')}" stroke="#1C2740" stroke-width="1.5"/><path d="M60 64 L60 100" stroke="#1C2740" stroke-opacity=".25" stroke-width="2"/>` : '';
  const wc = col('weapon', '#9AA3B5');
  const weapon = cls === 'mage'
    ? `<path d="M93 26 L93 130" stroke="#7A4E2A" stroke-width="5" stroke-linecap="round"/><circle cx="93" cy="22" r="9" fill="${wc}" stroke="#1C2740" stroke-width="1.5"/>`
    : cls === 'ranger'
      ? `<path d="M90 40 Q112 80 90 120" stroke="#7A4E2A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M90 40 L90 120" stroke="${wc}" stroke-width="2"/>`
      : `<path d="M92 36 L92 92" stroke="${wc}" stroke-width="7" stroke-linecap="round"/><path d="M84 92 L100 92" stroke="#7A4E2A" stroke-width="5" stroke-linecap="round"/><path d="M92 92 L92 104" stroke="#7A4E2A" stroke-width="5" stroke-linecap="round"/>`;
  const shield = it('shield') ? `<path d="M14 76 Q14 70 22 68 L36 66 Q42 68 42 76 L40 98 Q34 112 28 114 Q20 110 16 98Z" fill="${col('shield')}" stroke="#1C2740" stroke-width="1.5"/><path d="M28 72 L28 110" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>` : '';
  const amulet = it('amulet') ? `<circle cx="60" cy="72" r="4.5" fill="${col('amulet')}" stroke="#1C2740" stroke-width="1.2"/>` : '';
  return `<svg class="hero-svg" viewBox="0 0 120 160" width="${size * 0.75}" height="${size}" role="img" aria-label="Heldenfigur">
    <ellipse cx="60" cy="152" rx="34" ry="5" fill="#1C2740" opacity=".12"/>
    <path d="M38 62 Q60 52 82 62 L96 144 Q60 154 24 144Z" fill="${L.cloak}"/>
    <rect x="47" y="112" width="11" height="34" rx="4" fill="#3A3F4D"/><rect x="62" y="112" width="11" height="34" rx="4" fill="#3A3F4D"/>
    <path d="M42 64 Q60 56 78 64 L82 120 Q60 128 38 120Z" fill="${C.tunic}"/>
    <path d="M38 118 L82 118" stroke="#5A3A20" stroke-width="5"/>
    ${armor}${amulet}
    <path d="M42 66 Q30 80 30 96" stroke="${C.tunic}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M78 66 Q90 76 91 92" stroke="${C.tunic}" stroke-width="10" stroke-linecap="round" fill="none"/>
    ${weapon}
    <circle cx="91" cy="94" r="6" fill="${L.skin}"/>
    ${shield}<circle cx="30" cy="97" r="6" fill="${L.skin}" ${it('shield') ? 'opacity="0"' : ''}/>
    <rect x="54" y="52" width="12" height="12" rx="4" fill="${L.skin}"/>
    <circle cx="60" cy="40" r="21" fill="${L.skin}"/>
    <circle cx="48" cy="47" r="3.5" fill="#E26B6B" opacity=".25"/><circle cx="72" cy="47" r="3.5" fill="#E26B6B" opacity=".25"/>
    ${face}${helm ? '' : hair}${helm}
  </svg>`;
}
function heroEl(size = 160, look = null, cls = null, equipped = null) {
  const d = State.profile.rpg;
  return h('div', { class: 'hero-figure', html: heroSVG(look || d.char?.look, cls || d.char?.cls, equipped || d.equipped, size) });
}
function rarityBadge(rarity) { return h('span', { class: `rarity r-${rarity}` }, RARITY[rarity].name); }
function itemStatsText(it) {
  const parts = [];
  if (it.atk) parts.push(`+${it.atk} Schaden`);
  for (const s of STATS) if (it.stats?.[s.id]) parts.push(`+${it.stats[s.id]} ${s.name}`);
  return parts.join(' · ');
}
