/* Oberfläche des RPG: Held, Inventar, Shop, Charakter-Editor, Truhen */
let heroTab = 'held';

function goldChip(extra = '') {
  return h('span', { class: `gold-chip ${extra}`, title: 'Gold' }, Icons.get('coin'), h('strong', {}, fmtNum(RPG.d.gold)));
}
function hpBar(boss, cls = '') {
  return h('div', { class: `hpbar ${cls}`, role: 'progressbar', 'aria-label': 'Lebenspunkte des Bosses', 'aria-valuemin': '0', 'aria-valuemax': String(boss.maxHp), 'aria-valuenow': String(boss.hp) },
    h('div', { class: 'hpbar-fill', style: { width: `${(boss.hp / boss.maxHp) * 100}%` } }));
}
function bossCard(compact = false) {
  const b = RPG.ensureBoss();
  if (!b) return null;
  const today = dayKey();
  const assaultUsed = RPG.d.lastAssault === today;
  return h('div', { class: `boss-card ${compact ? 'is-compact' : ''}` },
    h('div', { class: 'boss-portrait', 'aria-hidden': 'true' }, b.emoji),
    h('div', { class: 'boss-card-main' },
      h('div', { class: 'boss-card-name' }, h('strong', {}, b.name), ` ${b.title}`),
      hpBar(b),
      h('div', { class: 'muted small' }, `${fmtNum(b.hp)} / ${fmtNum(b.maxHp)} Lebenspunkte · noch etwa ${plural(RPG.hitsLeft(), 'richtige Antwort', 'richtige Antworten')}`),
      compact ? null : h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => startStudy({ folderId: null, mode: 'learn' }) }, Icons.get('play'), 'Lernrunde'),
        h('button', { class: 'btn btn-sm', type: 'button', onClick: () => chooseModeFolder('boss'), title: 'Die schwersten Karten, doppelter Schaden, einmal pro Tag' }, Icons.get('sword'), assaultUsed ? 'Bossangriff (heute schon genutzt)' : 'Bossangriff ×2'))));
}

/* ---------- Seite „Held“ ---------- */
function renderHero(main, tab) {
  clear(main);
  if (tab) heroTab = tab;
  if (!RPG.hasHero()) { renderHeroCreate(main); return; }
  RPG.ensureBoss();
  const tabs = h('div', { class: 'tabs page-tabs', role: 'tablist' }, [['held', 'Held'], ['inventar', 'Inventar'], ['shop', 'Shop']].map(([k, l]) => h('button', {
    class: `tab ${heroTab === k ? 'is-active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(heroTab === k),
    onClick: () => { heroTab = k; history.replaceState(null, '', `#/hero/${k}`); renderHero(main); },
  }, l, k === 'held' && RPG.pointsFree() ? h('span', { class: 'tab-dot', title: 'Fähigkeitspunkte frei' }) : null, k === 'inventar' ? h('span', { class: 'tab-count' }, String(RPG.d.inventory.length)) : null)));
  main.append(
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Held'), h('p', { class: 'muted' }, 'Jede richtige Antwort ist ein Treffer gegen den Boss.')), goldChip('big')),
    tabs);
  const body = h('div', { class: 'hero-body' });
  main.appendChild(body);
  if (heroTab === 'inventar') renderInventory(body);
  else if (heroTab === 'shop') renderShop(body);
  else renderHeroMain(body);
}

function renderHeroMain(body) {
  const d = RPG.d, ch = d.char, st = RPG.stats(), li = Gami.levelInfo();
  const free = RPG.pointsFree();
  const charCard = h('section', { class: 'panel hero-card' },
    heroEl(200),
    h('div', { class: 'hero-id' },
      h('h2', {}, ch.name),
      h('p', { class: 'muted' }, `${CLASSES[ch.cls].name} · Level ${li.level} · ${li.title}`),
      h('div', { class: 'xpbar' }, h('div', { class: 'xpbar-fill', style: { width: `${(li.into / li.need) * 100}%` } })),
      h('p', { class: 'muted small' }, `${fmtNum(li.into)} / ${fmtNum(li.need)} XP · Klassenbonus: ${CLASSES[ch.cls].bonus}`),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: () => openHeroEditor() }, Icons.get('edit'), 'Held bearbeiten'))));

  const statRows = STATS.map((s) => {
    const base = CLASSES[ch.cls].base[s.id], alloc = d.alloc[s.id] || 0;
    const gear = st[s.id] - base - alloc;
    return h('div', { class: 'stat-row' },
      h('div', { class: 'stat-name' }, h('strong', {}, s.name), h('span', { class: 'muted small' }, s.desc)),
      h('div', { class: 'stat-val', title: `Klasse ${base} + verteilt ${alloc} + Ausrüstung ${gear}` }, String(st[s.id]), gear ? h('span', { class: 'stat-gear' }, `+${gear}`) : null),
      free ? h('button', { class: 'icon-btn stat-plus', type: 'button', 'aria-label': `${s.name} erhöhen`, onClick: async () => { await RPG.allocate(s.id); route(); } }, Icons.get('plus')) : null);
  });
  const statsCard = h('section', { class: 'panel stats-card' },
    h('div', { class: 'section-row' }, h('h2', { class: 'section-title' }, 'Fähigkeitswerte'),
      free ? h('span', { class: 'points-free' }, plural(free, 'Punkt', 'Punkte'), ' frei') : null),
    statRows,
    h('div', { class: 'dmg-summary' },
      h('div', {}, h('strong', {}, fmtNum(RPG.avgDamage())), h('span', {}, 'Ø Schaden pro Treffer')),
      h('div', {}, h('strong', {}, `${Math.round(RPG.critChance() * 100)} %`), h('span', {}, `Krit-Chance (×${String(RPG.critMult()).replace('.', ',')})`)),
      h('div', {}, h('strong', {}, fmtNum(d.bestHit)), h('span', {}, 'Bester Treffer'))),
    h('p', { class: 'muted small' }, 'Pro Levelaufstieg bekommst du 2 Fähigkeitspunkte.',
      (d.alloc.str + d.alloc.wis + d.alloc.luck) ? h('button', { class: 'linkish', type: 'button', onClick: async () => { if (await confirmDialog({ title: 'Punkte neu verteilen?', text: 'Alle verteilten Fähigkeitspunkte werden zurückgegeben.', ok: 'Zurücksetzen' })) { await RPG.resetPoints(); route(); } } }, 'Neu verteilen') : null));

  const chests = d.chests.length ? h('section', { class: 'section' }, h('div', { class: 'chest-banner' },
    h('div', { class: 'chest-icon', html: chestSVG(false) }),
    h('div', {}, h('strong', {}, plural(d.chests.length, 'Truhe wartet', 'Truhen warten'), ' auf dich'), h('p', { class: 'muted small' }, `Beute von ${d.chests[0].from}`)),
    h('button', { class: 'btn btn-primary', type: 'button', onClick: () => openChestDialog(d.chests[0].id) }, Icons.get('chest'), 'Truhe öffnen'))) : null;

  const equip = h('section', { class: 'section' }, h('h2', { class: 'section-title' }, 'Ausrüstung'),
    h('div', { class: 'slot-grid' }, SLOTS.map((s) => {
      const it = RPG.item(d.equipped[s.id]);
      return h('button', { class: `slot-tile ${it ? `r-${it.rarity}` : 'is-empty'}`, type: 'button', onClick: () => (it ? openItemDialog(it.id) : (heroTab = 'inventar', inventoryFilter = s.id, renderHero($('#main')))) },
        h('span', { class: 'slot-icon' }, Icons.get(s.icon)),
        h('span', { class: 'slot-label muted small' }, s.name),
        it ? h('span', { class: 'slot-item' }, it.name) : h('span', { class: 'slot-item muted' }, 'leer'),
        it ? h('span', { class: 'slot-stats small' }, itemStatsText(it)) : null);
    })));

  body.append(chests, h('div', { class: 'hero-grid' }, charCard, statsCard),
    h('section', { class: 'section' }, h('h2', { class: 'section-title' }, 'Aktueller Boss'), bossCard()),
    equip,
    h('section', { class: 'section' }, h('div', { class: 'hero-records' },
      h('div', {}, h('strong', {}, fmtNum(d.kills)), h('span', {}, 'Bosse besiegt')),
      h('div', {}, h('strong', {}, fmtNum(d.totalDamage)), h('span', {}, 'Schaden gesamt')),
      h('div', {}, h('strong', {}, fmtNum(d.chestsOpened)), h('span', {}, 'Truhen geöffnet')))));
}

/* ---------- Inventar ---------- */
let inventoryFilter = 'all';
function itemTile(it, onClick) {
  const eq = RPG.isEquipped(it.id);
  return h('button', { class: `item-tile r-${it.rarity}`, type: 'button', onClick, dataset: { id: it.id } },
    h('span', { class: 'item-icon' }, Icons.get(SLOT[it.slot].icon)),
    h('span', { class: 'item-main' }, h('span', { class: 'item-name' }, it.name), h('span', { class: 'small muted' }, itemStatsText(it))),
    h('span', { class: 'item-side' }, rarityBadge(it.rarity), eq ? h('span', { class: 'equipped-tag' }, 'angelegt') : null));
}
function renderInventory(body) {
  const d = RPG.d;
  const filters = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Filter' }, [['all', 'Alle'], ...SLOTS.map((s) => [s.id, s.name])].map(([k, l]) => h('button', {
    type: 'button', class: `chip ${inventoryFilter === k ? 'is-active' : ''}`, role: 'radio', 'aria-checked': String(inventoryFilter === k),
    onClick: () => { inventoryFilter = k; renderHero($('#main')); },
  }, l)));
  let items = d.inventory.filter((i) => inventoryFilter === 'all' || i.slot === inventoryFilter);
  items = items.sort((a, b) => (RPG.isEquipped(b.id) - RPG.isEquipped(a.id)) || RARITY[b.rarity].rank - RARITY[a.rarity].rank || RPG.power(b) - RPG.power(a));
  body.append(filters,
    items.length ? h('div', { class: 'item-list' }, items.map((it) => itemTile(it, () => openItemDialog(it.id))))
      : emptyState('bag', 'Noch nichts in dieser Kategorie', 'Besiege Bosse für Truhen oder kauf dir Ausrüstung im Shop.',
        h('button', { class: 'btn', type: 'button', onClick: () => { heroTab = 'shop'; renderHero($('#main')); } }, Icons.get('coin'), 'Zum Shop')));
}
function compareLine(it) {
  const cur = RPG.item(RPG.d.equipped[it.slot]);
  if (!cur || cur.id === it.id) return null;
  const rows = [['Schaden', it.atk || 0, cur.atk || 0], ...STATS.map((s) => [s.name, it.stats?.[s.id] || 0, cur.stats?.[s.id] || 0])].filter(([, a, b]) => a || b);
  return h('div', { class: 'compare' }, h('p', { class: 'small muted' }, 'Im Vergleich zu ', h('strong', {}, cur.name), ':'),
    h('div', { class: 'compare-rows' }, rows.map(([n, a, b]) => {
      const dlt = a - b;
      return h('div', { class: 'compare-row' }, h('span', {}, n), h('span', { class: dlt > 0 ? 'up' : dlt < 0 ? 'down' : 'muted' }, dlt > 0 ? `+${dlt}` : dlt < 0 ? String(dlt) : '±0'));
    })));
}
function openItemDialog(id) {
  const it = RPG.item(id);
  if (!it) return;
  const eq = RPG.isEquipped(it.id);
  Modal.open({
    title: it.name, size: 'sm', className: `item-modal r-${it.rarity}`,
    body: h('div', { class: 'item-detail' },
      h('div', { class: 'item-detail-head' }, h('span', { class: 'item-icon big' }, Icons.get(SLOT[it.slot].icon)),
        h('div', {}, rarityBadge(it.rarity), h('p', { class: 'muted small' }, `${SLOT[it.slot].name} · Stufe ${it.level}`))),
      h('p', { class: 'item-detail-stats' }, itemStatsText(it)),
      compareLine(it)),
    actions: [
      { label: `Verkaufen (${RPG.sellPrice(it)} Gold)`, kind: 'danger-quiet', icon: 'coin', onClick: async () => {
        if (RARITY[it.rarity].rank >= 2 && !(await confirmDialog({ title: 'Wirklich verkaufen?', text: `${it.name} ist ${RARITY[it.rarity].name.toLowerCase()}. Du bekommst ${RPG.sellPrice(it)} Gold.`, ok: 'Verkaufen' }))) return false;
        const g = await RPG.sell(it.id); toast(`Verkauft für ${g} Gold.`, 'ok'); Sound.good(); route(); return true;
      } },
      eq ? { label: 'Ablegen', onClick: async () => { await RPG.unequip(it.slot); route(); } }
        : { label: 'Anlegen', kind: 'primary', icon: 'check', onClick: async () => { await RPG.equip(it.id); toast(`${it.name} angelegt.`, 'ok'); Sound.flip(); route(); } },
    ],
  });
}

/* ---------- Shop ---------- */
function renderShop(body) {
  const d = RPG.d;
  const gear = h('section', { class: 'section' }, h('h2', { class: 'section-title' }, 'Ausrüstung kaufen'),
    h('p', { class: 'muted small shop-note' }, 'Du bekommst einen zufälligen Gegenstand der gewählten Seltenheit, passend zu deinem Level.'),
    h('div', { class: 'shop-grid' }, RARITIES.map((r) => h('div', { class: `shop-card r-${r.id}` },
      h('span', { class: 'shop-gem', 'aria-hidden': 'true' }, Icons.get('chest')),
      h('h3', {}, r.name),
      h('p', { class: 'muted small' }, `etwa ${r.mult === 1 ? 'Grundwerte' : `${String(r.mult).replace('.', ',')}× so stark wie Gewöhnlich`}`),
      h('button', { class: `btn ${d.gold >= r.price ? 'btn-primary' : ''}`, type: 'button', onClick: async () => {
        try {
          const it = await RPG.buyRandom(r.id);
          Sound.great();
          if (r.id === 'legendary') Fx.confetti(140);
          showLootDialog('Gekauft', [it], 0);
        } catch (e) { toast(e.message, 'warn'); }
      } }, Icons.get('coin'), `${fmtNum(r.price)} Gold`)))));

  const rewardRows = d.rewards.map((rw) => h('div', { class: 'reward-row' },
    h('span', { class: 'reward-icon' }, Icons.get('gift')),
    h('div', { class: 'reward-main' }, h('strong', {}, rw.name), h('span', { class: 'muted small' }, `${fmtNum(rw.price)} Gold`)),
    h('button', { class: `btn btn-sm ${d.gold >= rw.price ? 'btn-primary' : ''}`, type: 'button', onClick: async () => {
      if (!(await confirmDialog({ title: `„${rw.name}“ kaufen?`, text: `Kostet ${fmtNum(rw.price)} Gold. Danach hast du noch ${fmtNum(d.gold - rw.price)} Gold.`, ok: 'Kaufen' }))) return;
      try { await RPG.buyReward(rw.id); toast(`Gönn dir: ${rw.name}`, 'badge', { duration: 4500 }); Fx.confetti(80); Sound.great(); route(); } catch (e) { toast(e.message, 'warn'); }
    } }, 'Kaufen'),
    menuButton([
      { icon: 'edit', label: 'Bearbeiten', onClick: () => rewardDialog(rw) },
      { icon: 'trash', label: 'Löschen', danger: true, onClick: async () => { if (await confirmDialog({ title: 'Belohnung löschen?', text: `„${rw.name}“ wird entfernt.`, ok: 'Löschen', danger: true })) { await RPG.deleteReward(rw.id); route(); } } },
    ], `Aktionen für ${rw.name}`)));
  const rewards = h('section', { class: 'section' },
    h('div', { class: 'section-row' }, h('h2', { class: 'section-title' }, 'Eigene Belohnungen'),
      h('button', { class: 'btn btn-sm', type: 'button', id: 'add-reward', onClick: () => rewardDialog() }, Icons.get('plus'), 'Belohnung hinzufügen')),
    d.rewards.length ? h('div', { class: 'reward-list' }, rewardRows)
      : emptyState('gift', 'Belohne dich selbst', 'Leg fest, was dir dein Gold im echten Leben wert ist – zum Beispiel eine Folge deiner Serie oder ein Lieblingssnack.',
        h('button', { class: 'btn', type: 'button', onClick: async () => {
          for (const [name, price] of [['1 Folge meiner Serie', 120], ['30 Minuten Zocken', 150], ['Lieblingssnack', 200], ['Ein freier Abend', 600]]) await RPG.saveReward({ name, price });
          route();
        } }, Icons.get('sparkle'), 'Beispiele hinzufügen')));
  const hist = d.purchases.length ? h('section', { class: 'section' }, h('h2', { class: 'section-title' }, 'Verlauf'),
    h('div', { class: 'history' }, d.purchases.slice(0, 30).map((p) => h('div', { class: 'history-row' },
      h('span', {}, p.kind === 'item' ? Icons.get('bag') : Icons.get('gift')),
      h('span', { class: 'history-name' }, p.name, p.rarity ? h('span', { class: `rarity-dot r-${p.rarity}` }) : null),
      h('span', { class: 'muted small' }, new Date(p.ts).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })),
      h('span', { class: 'history-price' }, `−${fmtNum(p.price)}`))))) : null;
  body.append(h('div', { class: 'gold-panel' }, Icons.get('coin'), h('div', {}, h('strong', {}, `${fmtNum(d.gold)} Gold`),
    h('span', { class: 'muted small' }, 'Gold gibt’s für richtige Antworten (1), das Tagesziel (25), Truhen und verkaufte Ausrüstung.'))), gear, rewards, hist);
}
function rewardDialog(rw = null) {
  const name = h('input', { class: 'input', type: 'text', value: rw?.name || '', placeholder: '1 Folge meiner Serie', 'aria-label': 'Name' });
  const price = h('input', { class: 'input', type: 'number', min: '1', step: '1', value: rw?.price || 100, 'aria-label': 'Preis in Gold' });
  Modal.open({
    title: rw ? 'Belohnung bearbeiten' : 'Neue Belohnung', size: 'sm',
    body: h('div', { class: 'form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Was gönnst du dir?'), name),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Preis in Gold'), price, h('span', { class: 'field-help' }, 'Richtwert: Ein Lerntag bringt etwa 50 Gold, eine Truhe 80 Gold und mehr.'))),
    actions: [{ label: 'Abbrechen' }, { label: 'Speichern', kind: 'primary', onClick: async () => {
      try { await RPG.saveReward({ id: rw?.id, name: name.value, price: price.value }); route(); return true; } catch (e) { toast(e.message, 'warn'); return false; }
    } }],
  });
}

/* ---------- Truhe ---------- */
function chestSVG(open) {
  return `<svg viewBox="0 0 120 100" aria-hidden="true"><ellipse cx="60" cy="94" rx="44" ry="5" fill="#000" opacity=".15"/>
    <g class="chest-lid" style="transform-origin:60px 44px">${open
    ? '<path d="M14 44 Q14 8 60 6 Q106 8 106 44 L100 38 Q100 16 60 14 Q20 16 20 38Z" fill="#8A5A2B" stroke="#4A2E12" stroke-width="3" transform="rotate(-24 20 44)"/>'
    : '<path d="M14 46 Q14 12 60 10 Q106 12 106 46Z" fill="#9C6630" stroke="#4A2E12" stroke-width="3"/><path d="M14 46 Q14 12 60 10 Q106 12 106 46" fill="none" stroke="#E0A93A" stroke-width="5" stroke-dasharray="0 18 200"/>'}</g>
    ${open ? '<ellipse cx="60" cy="48" rx="40" ry="10" fill="#FFD95A"/><circle cx="46" cy="44" r="5" fill="#F0A020"/><circle cx="70" cy="42" r="6" fill="#F0A020"/><circle cx="58" cy="40" r="4" fill="#FFE89A"/>' : ''}
    <rect x="14" y="46" width="92" height="44" rx="5" fill="#8A5A2B" stroke="#4A2E12" stroke-width="3"/>
    <path d="M14 58 H106" stroke="#4A2E12" stroke-width="2" opacity=".5"/><rect x="26" y="46" width="8" height="44" fill="#E0A93A"/><rect x="86" y="46" width="8" height="44" fill="#E0A93A"/>
    <rect x="51" y="50" width="18" height="18" rx="3" fill="#E0A93A" stroke="#4A2E12" stroke-width="2"/><circle cx="60" cy="58" r="3" fill="#4A2E12"/></svg>`;
}
function openChestDialog(id) {
  const chest = RPG.d.chests.find((c) => c.id === id);
  if (!chest) return;
  const stage = h('div', { class: 'chest-stage' }, h('div', { class: 'chest-big is-shaking', html: chestSVG(false) }), h('p', { class: 'muted' }, `Beute von ${chest.from}`));
  const loot = h('div', { class: 'loot' });
  let opened = false;
  const m = Modal.open({
    title: 'Schatztruhe', size: 'md', className: 'chest-modal',
    body: h('div', {}, stage, loot),
    actions: [{ label: 'Öffnen', kind: 'primary', icon: 'chest', onClick: async () => {
      if (opened) return true;
      opened = true;
      const c = await RPG.openChest(id);
      const big = $('.chest-big', stage);
      big.classList.remove('is-shaking'); big.innerHTML = chestSVG(true); big.classList.add('is-open');
      Sound.level();
      const btn = m.footer.querySelector('.btn-primary');
      btn.lastChild.textContent = 'Ins Inventar';
      await revealLoot(loot, c.items, c.gold);
      route();
      return false;
    } }],
    onClose: () => { if (opened) route(); },
  });
  stage.addEventListener('click', () => !opened && m.footer.querySelector('.btn-primary').click());
}
async function revealLoot(host, items, gold) {
  if (gold) {
    const g = h('div', { class: 'loot-gold' }, Icons.get('coin'), h('strong', {}, '0'), ' Gold');
    host.appendChild(g);
    const steps = 20;
    for (let i = 1; i <= steps; i++) { $('strong', g).textContent = fmtNum(Math.round(gold * i / steps)); await sleep(prefersReducedMotion() ? 0 : 25); }
  }
  const sorted = items.slice().sort((a, b) => RARITY[a.rarity].rank - RARITY[b.rarity].rank);
  for (const it of sorted) {
    await sleep(prefersReducedMotion() ? 0 : 380);
    host.appendChild(h('div', { class: `loot-item r-${it.rarity}` }, itemTile(it, () => {})));
    if (it.rarity === 'legendary') { Fx.confetti(160); Sound.great(); } else if (it.rarity === 'epic') Sound.great(); else Sound.good();
  }
}
function showLootDialog(title, items, gold) {
  const loot = h('div', { class: 'loot' });
  Modal.open({ title, size: 'sm', body: loot, actions: [{ label: 'Anlegen', onClick: async () => { await RPG.equip(items[0].id); route(); } }, { label: 'Ins Inventar', kind: 'primary', onClick: () => route() }] });
  revealLoot(loot, items, gold);
}

/* ---------- Charakter-Editor ---------- */
function heroForm(initial, onChange) {
  const st = deepClone(initial);
  const preview = h('div', { class: 'creator-preview' });
  const paintPreview = () => { clear(preview); preview.appendChild(heroEl(220, st.look, st.cls, {})); onChange && onChange(st); };
  const name = h('input', { class: 'input', type: 'text', value: st.name, placeholder: 'Aria Sturmwind', maxlength: '24', 'aria-label': 'Name des Helden', id: 'hero-name' });
  name.addEventListener('input', () => { st.name = name.value; });
  const classes = h('div', { class: 'class-pick', role: 'radiogroup', 'aria-label': 'Klasse' });
  const paintClasses = () => {
    clear(classes);
    Object.entries(CLASSES).forEach(([k, c]) => classes.appendChild(h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(st.cls === k), class: `class-opt ${st.cls === k ? 'is-selected' : ''}`, dataset: { cls: k },
      onClick: () => { st.cls = k; paintClasses(); paintPreview(); },
    }, h('strong', {}, c.name), h('span', { class: 'small muted' }, c.desc), h('span', { class: 'class-bonus small' }, c.bonus),
      h('span', { class: 'class-stats small' }, STATS.map((s) => `${s.short} ${c.base[s.id]}`).join('  ')))));
  };
  const swatches = (key, label) => {
    const row = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': label });
    const paint = () => { clear(row); LOOKS[key].forEach((v) => row.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': String(st.look[key] === v), 'aria-label': `${label} ${v}`, class: `swatch ${st.look[key] === v ? 'is-selected' : ''}`, style: { background: v }, onClick: () => { st.look[key] = v; paint(); paintPreview(); } }))); };
    paint();
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), row);
  };
  const chipsFor = (key, label) => {
    const row = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': label });
    const paint = () => { clear(row); LOOKS[key].forEach((v) => row.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': String(st.look[key] === v), class: `chip ${st.look[key] === v ? 'is-active' : ''}`, onClick: () => { st.look[key] = v; paint(); paintPreview(); } }, v))); };
    paint();
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), row);
  };
  const lookBox = h('div', { class: 'look-box' });
  const paintLook = () => { clear(lookBox); lookBox.append(swatches('skin', 'Hautfarbe'), chipsFor('hair', 'Frisur'), swatches('hairColor', 'Haarfarbe'), swatches('cloak', 'Umhang'), chipsFor('face', 'Gesicht')); };
  const randomize = () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    for (const k of Object.keys(LOOKS)) st.look[k] = pick(LOOKS[k]);
    paintLook(); paintPreview();
  };
  paintClasses(); paintLook(); paintPreview();
  const el = h('div', { class: 'creator' },
    h('div', { class: 'creator-left' }, preview, h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: randomize }, Icons.get('dice'), 'Zufälliges Aussehen')),
    h('div', { class: 'creator-right form' },
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Name'), name),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Klasse'), classes),
      lookBox));
  return { el, get: () => st, focus: () => name.focus() };
}
function defaultHero() {
  return { name: '', cls: 'warrior', look: { skin: LOOKS.skin[1], hair: 'Kurz', hairColor: LOOKS.hairColor[1], cloak: LOOKS.cloak[0], face: 'Freundlich' } };
}
function renderHeroCreate(main) {
  const form = heroForm(defaultHero());
  main.append(
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Erschaffe deinen Helden'),
      h('p', { class: 'muted' }, 'Ab jetzt wird jede richtige Antwort zum Schwerthieb, Zauber oder Pfeilschuss gegen einen Boss. Besiegte Bosse lassen Truhen mit Gold und Ausrüstung zurück.'))),
    h('section', { class: 'panel' }, form.el,
      h('div', { class: 'btn-row creator-actions' }, h('button', { class: 'btn btn-primary btn-xl', type: 'button', id: 'create-hero', onClick: async () => {
        try {
          await RPG.saveHero(form.get());
          Fx.confetti(120); Sound.level();
          toast(`${form.get().name} zieht in den Kampf! Ein Startschwert und 50 Gold liegen bereit.`, 'badge', { duration: 5000 });
          Badges.evaluate();
          heroTab = 'held';
          route();
        } catch (e) { toast(e.message, 'warn'); form.focus(); }
      } }, Icons.get('sword'), 'Abenteuer beginnen'))));
  requestAnimationFrame(() => form.focus());
}
function openHeroEditor() {
  const ch = RPG.d.char;
  const form = heroForm({ name: ch.name, cls: ch.cls, look: { ...ch.look } });
  Modal.open({
    title: 'Held bearbeiten', size: 'lg', body: h('div', {}, form.el, h('p', { class: 'muted small' }, 'Ein Klassenwechsel ändert die Grundwerte. Verteilte Punkte, Ausrüstung und Gold bleiben erhalten.')),
    actions: [{ label: 'Abbrechen' }, { label: 'Speichern', kind: 'primary', onClick: async () => {
      try { await RPG.saveHero(form.get()); toast('Held gespeichert.', 'ok'); route(); return true; } catch (e) { toast(e.message, 'warn'); return false; }
    } }],
  });
}
