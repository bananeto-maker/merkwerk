/* Lernmodus: Lernrunde (Spaced Repetition), Freies Üben, Zeit-Challenge und Bossrunde */
const RATINGS = {
  1: { label: 'Nochmal', cls: 'r-again', key: '1', swipe: '←' },
  2: { label: 'Schwer', cls: 'r-hard', key: '2', swipe: '↑' },
  3: { label: 'Gut', cls: 'r-good', key: '3', swipe: '→' },
  4: { label: 'Leicht', cls: 'r-easy', key: '4', swipe: '' },
};

const Study = {
  active: false,
  s: null, // aktuelle Sitzung

  start({ folderId = null, mode = 'learn' }) {
    const pool = Store.cardsIn(folderId);
    if (!pool.length) { toast('In diesem Ordner sind noch keine Karten.', 'warn'); return false; }
    const s = {
      mode, folderId, pool, queue: [], learnQ: [], current: null, ctl: null, result: null, shownAt: 0,
      done: 0, correct: 0, xp: 0, combo: 0, bestCombo: 0, again: 0, startedAt: Date.now(), undo: null, answered: new Set(),
      score: 0, timeLeft: 60, timer: null, lives: 3, total: 0, dmg: 0, gold: 0, kills: [], assaultFactor: 1,
    };
    const now = Date.now(), end = endOfToday();
    if (mode === 'learn') {
      const reviews = pool.filter((c) => c.srs.state === 'review' && c.srs.due <= end);
      const learning = pool.filter((c) => (c.srs.state === 'learning' || c.srs.state === 'relearning') && c.srs.due <= end);
      const newLeft = Math.max(0, State.settings.newPerDay - (todayStats().newCards || 0));
      let fresh = pool.filter((c) => c.srs.state === 'new').sort((a, b) => a.created - b.created);
      fresh = (State.settings.interleave ? interleaveByFolder(fresh) : fresh).slice(0, newLeft);
      let revs = State.settings.interleave ? interleaveByFolder(shuffle(reviews)) : reviews.sort((a, b) => a.folderId.localeCompare(b.folderId) || a.srs.due - b.srs.due);
      const q = [];
      let ni = 0;
      revs.forEach((c, i) => { q.push(c.id); if ((i + 1) % 4 === 0 && ni < fresh.length) q.push(fresh[ni++].id); });
      while (ni < fresh.length) q.push(fresh[ni++].id);
      s.queue = q;
      s.learnQ = learning.sort((a, b) => a.srs.due - b.srs.due).map((c) => c.id);
      if (!s.queue.length && !s.learnQ.length) {
        toast('Hier ist gerade nichts fällig. Du kannst frei üben – ohne Einfluss auf deinen Lernplan.', 'info', { action: { label: 'Freies Üben', fn: () => startStudy({ folderId, mode: 'cram' }) }, duration: 7000 });
        return false;
      }
      s.total = s.queue.length + s.learnQ.length;
    } else if (mode === 'cram') {
      s.queue = shuffle(pool).slice(0, 60).map((c) => c.id);
      s.total = s.queue.length;
    } else if (mode === 'challenge') {
      s.queue = shuffle(pool).map((c) => c.id);
      s.timeLeft = 60;
    } else if (mode === 'boss') {
      if (!RPG.hasHero()) { toast('Erschaffe zuerst deinen Helden – dann kannst du den Boss angreifen.', 'info', { action: { label: 'Zum Helden', fn: () => go('hero') }, duration: 6000 }); return false; }
      if (pool.length < 3) { toast('Für einen Bossangriff brauchst du mindestens 3 Karten in diesem Ordner.', 'warn'); return false; }
      const hardness = (c) => (c.srs.state === 'new' ? 0 : c.srs.d) + (c.srs.lapses || 0) * 2 + (c.leech ? 5 : 0) + (c.srs.state === 'relearning' ? 2 : 0) + Math.random() * 0.5;
      const picked = pool.slice().sort((a, b) => hardness(b) - hardness(a)).slice(0, 10);
      s.queue = shuffle(picked).map((c) => c.id);
      s.total = s.queue.length;
      s.lives = 3;
      RPG.ensureBoss();
      if (RPG.d.lastAssault !== dayKey()) { s.assaultFactor = 2; RPG.d.lastAssault = dayKey(); Store.saveProfile(); }
    }
    this.s = s;
    this.active = true;
    document.body.classList.add('is-studying');
    this.buildScreen();
    if (mode === 'challenge') this.countdown();
    else this.next();
    return true;
  },

  /* ---------- Bildschirm ---------- */
  buildScreen() {
    const s = this.s;
    const main = $('#main');
    clear(main);
    const modeName = { learn: 'Lernrunde', cram: 'Freies Üben', challenge: 'Zeit-Challenge', boss: 'Bossangriff' }[s.mode];
    this.el = {};
    const E = this.el;
    E.progress = h('div', { class: 'study-progress', role: 'progressbar', 'aria-label': 'Fortschritt' }, h('div', { class: 'study-progress-fill' }));
    E.count = h('span', { class: 'study-count' });
    E.combo = h('span', { class: 'combo-chip', hidden: true }, Icons.get('zap'), h('span', {}));
    E.xp = h('span', { class: 'xp-chip' }, Icons.get('sparkle'), h('span', {}, '0 XP'));
    E.undo = iconBtn('undo', 'Letzte Bewertung rückgängig (Z)', () => this.undo(), 'undo-btn');
    E.undo.disabled = true;
    E.speak = Speech.available() ? iconBtn('volume', 'Vorlesen (S)', () => this.speak()) : null;
    E.edit = s.mode === 'challenge' ? null : iconBtn('edit', 'Karte bearbeiten (E)', () => this.edit());
    const top = h('div', { class: 'study-top' },
      iconBtn('x', 'Beenden (Esc)', () => this.finish()),
      h('div', { class: 'study-top-mid' }, h('div', { class: 'study-mode' }, h('span', { class: 'study-mode-name' }, modeName), s.mode === 'challenge' ? null : E.count), E.progress),
      E.combo, E.xp, s.mode === 'learn' ? E.undo : null, E.speak, E.edit);
    const showBoss = (s.mode === 'boss' || s.mode === 'learn') && RPG.hasHero();
    E.boss = showBoss ? h('div', { class: `boss-bar ${s.mode === 'learn' ? 'is-slim' : ''}` },
      h('div', { class: 'boss-avatar', 'aria-hidden': 'true' }, RPG.ensureBoss().emoji),
      h('div', { class: 'boss-info' }, h('div', { class: 'boss-name' }),
        h('div', { class: 'boss-hp', role: 'progressbar', 'aria-label': 'Lebenspunkte des Bosses' }, h('div', { class: 'boss-hp-fill' }))),
      s.mode === 'boss' ? h('div', { class: 'lives', 'aria-label': 'Deine Leben' }) : h('div', { class: 'boss-dmg-total' })) : null;
    E.timer = s.mode === 'challenge' ? h('div', { class: 'challenge-bar' },
      h('div', { class: 'timer-num' }, Icons.get('clock'), h('strong', {}, '60')),
      h('div', { class: 'timer-track' }, h('div', { class: 'timer-fill' })),
      h('div', { class: 'score' }, h('span', { class: 'muted' }, 'Punkte '), h('strong', {}, '0'))) : null;
    E.card = h('div', { class: 'study-card index-card', tabindex: '-1' });
    E.stampL = h('div', { class: 'stamp stamp-again', 'aria-hidden': 'true' }, s.mode === 'learn' ? 'Nochmal' : 'Nicht gewusst');
    E.stampR = h('div', { class: 'stamp stamp-good', 'aria-hidden': 'true' }, s.mode === 'learn' ? 'Gewusst' : 'Gewusst');
    E.stampU = h('div', { class: 'stamp stamp-hard', 'aria-hidden': 'true' }, 'Schwer');
    E.cardWrap = h('div', { class: 'card-wrap' }, E.card, E.stampL, E.stampR, E.stampU);
    E.stage = h('div', { class: 'study-stage' }, E.cardWrap);
    E.actions = h('div', { class: 'study-actions' });
    E.screen = h('div', { class: `study-screen mode-${s.mode}` }, top, E.boss, E.timer, E.stage, E.actions);
    main.appendChild(E.screen);
    this.attachSwipe();
    this.paintTop();
    this.paintBoss();
  },

  paintTop() {
    const s = this.s, E = this.el;
    if (!E) return;
    const doneCount = s.mode === 'learn' ? s.answered.size : s.done;
    if (s.mode === 'challenge') E.count.textContent = '';
    else {
      const left = s.mode === 'learn' ? new Set([...s.queue, ...s.learnQ, ...(s.current ? [s.current.id] : [])]).size : s.queue.length + (s.current ? 1 : 0);
      E.count.textContent = `noch ${left}`;
      const total = Math.max(1, doneCount + left);
      $('.study-progress-fill', E.progress).style.width = `${(doneCount / total) * 100}%`;
    }
    E.combo.hidden = s.combo < 3;
    $('span', E.combo).textContent = `${s.combo}er-Combo`;
    $('span', E.xp).textContent = s.mode === 'challenge' ? `×${this.multiplier()}` : `${s.xp} XP`;
    if (E.undo) E.undo.disabled = !s.undo;
  },
  paintBoss() {
    const s = this.s, E = this.el;
    if (E.boss && RPG.d.boss) {
      const b = RPG.d.boss;
      $('.boss-avatar', E.boss).textContent = b.emoji;
      $('.boss-name', E.boss).textContent = `${b.name} ${b.title} · ${fmtNum(b.hp)} LP${s.mode === 'boss' && s.assaultFactor === 2 ? ' · doppelter Schaden' : ''}`;
      $('.boss-hp-fill', E.boss).style.width = `${(b.hp / b.maxHp) * 100}%`;
      const lives = $('.lives', E.boss);
      if (lives) { clear(lives); for (let i = 0; i < 3; i++) lives.appendChild(h('span', { class: `life ${i < s.lives ? '' : 'is-lost'}` }, Icons.get('heart'))); }
      const tot = $('.boss-dmg-total', E.boss);
      if (tot) tot.textContent = s.dmg ? `−${fmtNum(s.dmg)}` : '';
    }
    if (E.timer) {
      $('.timer-num strong', E.timer).textContent = String(Math.max(0, Math.ceil(s.timeLeft)));
      $('.timer-fill', E.timer).style.width = `${(s.timeLeft / 60) * 100}%`;
      $('.score strong', E.timer).textContent = fmtNum(s.score);
      E.timer.classList.toggle('is-urgent', s.timeLeft <= 10);
    }
  },
  multiplier() { const c = this.s.combo; return c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1; },

  /* ---------- Nächste Karte ---------- */
  pickNext() {
    const s = this.s;
    const now = Date.now();
    if (s.mode === 'learn') {
      s.learnQ.sort((a, b) => (State.cards.get(a)?.srs.due || 0) - (State.cards.get(b)?.srs.due || 0));
      const lq = s.learnQ.find((id) => (State.cards.get(id)?.srs.due || 0) <= now);
      if (lq) { s.learnQ = s.learnQ.filter((x) => x !== lq); return lq; }
      if (s.queue.length) return s.queue.shift();
      if (s.learnQ.length) {
        const first = s.learnQ[0];
        if ((State.cards.get(first)?.srs.due || 0) <= now + 20 * MIN) { s.learnQ.shift(); return first; }
      }
      return null;
    }
    if (s.mode === 'challenge' && !s.queue.length) s.queue = shuffle(s.pool).map((c) => c.id);
    return s.queue.shift() || null;
  },
  next() {
    const s = this.s;
    let id = this.pickNext();
    while (id && !State.cards.has(id)) id = this.pickNext();
    if (!id) { this.finish(true); return; }
    const card = State.cards.get(id);
    s.current = (s.mode === 'learn' || s.mode === 'cram') ? presentAs(card, s.pool) : card;
    s.result = null;
    s.shownAt = Date.now();
    this.renderCard();
    this.paintTop();
  },
  renderCard() {
    const s = this.s, E = this.el;
    const card = s.current;
    E.card.classList.remove('is-ok', 'is-bad', 'shake', 'fly-left', 'fly-right', 'fly-up');
    E.card.style.transform = '';
    E.card.style.opacity = '';
    [E.stampL, E.stampR, E.stampU].forEach((x) => { x.style.opacity = 0; });
    clear(E.card);
    const def = CardTypes[card.shownType || card.type];
    const tag = h('div', { class: 'card-tag' }, Icons.get(def.icon), def.label,
      card.leech ? h('span', { class: 'leech-tag' }, 'Problemkarte') : null,
      card.srs.state === 'new' && s.mode === 'learn' ? h('span', { class: 'new-tag' }, 'Neu') : null);
    const ctl = def.study(card, { done: (r) => this.onDone(r), mode: s.mode });
    s.ctl = ctl;
    E.card.append(tag, ctl.el);
    E.card.classList.add('enter');
    setTimeout(() => E.card.classList.remove('enter'), 260);
    this.renderActions();
    requestAnimationFrame(() => {
      if (ctl.focus && !isTouch()) ctl.focus(); else E.card.focus({ preventScroll: true });
      this.updateTouchMode();
    });
  },
  updateTouchMode() {
    const c = this.el.card;
    c.classList.toggle('is-scrollable', c.scrollHeight > c.clientHeight + 4);
  },

  renderActions() {
    const s = this.s, E = this.el;
    clear(E.actions);
    const ctl = s.ctl;
    if (!s.result) {
      if (ctl.needsReveal) {
        E.actions.append(h('button', { class: 'btn btn-primary btn-xl reveal-btn', type: 'button', onClick: () => ctl.reveal() }, Icons.get('flip'), 'Umdrehen',
          !isTouch() ? h('kbd', {}, 'Leertaste') : null));
        if (isTouch()) E.actions.append(h('p', { class: 'muted small center' }, 'Tippe auf die Karte zum Umdrehen'));
      }
      return;
    }
    if (s.mode === 'learn') {
      const prev = FSRS.preview(State.cards.get(s.current.id).srs, Date.now(), State.settings.retention);
      const sug = s.result.suggested;
      const bar = h('div', { class: 'rating-bar', role: 'group', 'aria-label': 'Wie gut wusstest du es?' }, [1, 2, 3, 4].map((g) => h('button', {
        class: `rate-btn ${RATINGS[g].cls} ${sug === g ? 'is-suggested' : ''}`, type: 'button', onClick: () => this.rate(g),
      }, h('span', { class: 'rate-label' }, RATINGS[g].label), h('span', { class: 'rate-ivl' }, formatInterval(prev[g])),
        !isTouch() ? h('kbd', {}, RATINGS[g].key) : null)));
      E.actions.append(bar,
        h('p', { class: 'muted small center rate-hint' }, isTouch() ? 'Wischen: rechts = gewusst · links = nochmal · hoch = schwer'
          : sug ? `Enter übernimmt den Vorschlag „${RATINGS[sug].label}“ · Pfeile: → gut, ← nochmal, ↑ schwer` : 'Enter = Gut · Pfeile: → gut, ← nochmal, ↑ schwer'));
    } else if (s.mode === 'cram') {
      E.actions.append(h('div', { class: 'rating-bar two' },
        h('button', { class: 'rate-btn r-again', type: 'button', onClick: () => this.rate(1) }, h('span', { class: 'rate-label' }, 'Nochmal'), h('span', { class: 'rate-ivl' }, 'kommt gleich wieder'), !isTouch() ? h('kbd', {}, '←') : null),
        h('button', { class: `rate-btn r-good ${s.result.suggested !== 1 ? 'is-suggested' : ''}`, type: 'button', onClick: () => this.rate(3) }, h('span', { class: 'rate-label' }, 'Gewusst'), h('span', { class: 'rate-ivl' }, 'abhaken'), !isTouch() ? h('kbd', {}, '→') : null)));
    } else {
      if (s.result.correct == null) {
        E.actions.append(h('div', { class: 'rating-bar two' },
          h('button', { class: 'rate-btn r-again', type: 'button', onClick: () => this.rate(1) }, h('span', { class: 'rate-label' }, 'Nicht gewusst'), !isTouch() ? h('kbd', {}, '←') : null),
          h('button', { class: 'rate-btn r-good is-suggested', type: 'button', onClick: () => this.rate(3) }, h('span', { class: 'rate-label' }, 'Gewusst'), !isTouch() ? h('kbd', {}, '→') : null)));
      } else {
        E.actions.append(h('button', { class: 'btn btn-primary btn-xl', type: 'button', id: 'next-btn', onClick: () => this.rate(s.result.correct ? 3 : 1) }, 'Weiter', !isTouch() ? h('kbd', {}, 'Enter') : null));
      }
    }
  },

  onDone(result) {
    const s = this.s;
    if (!s || s.result) return;
    s.result = result;
    if (result.correct === true) { this.el.card.classList.add('is-ok'); Sound.good(); }
    else if (result.correct === false) { this.el.card.classList.add('is-bad', 'shake'); Sound.bad(); }
    else Sound.flip();
    this.renderActions();
    requestAnimationFrame(() => this.updateTouchMode());
    if ((s.mode === 'challenge' || s.mode === 'boss') && result.correct === true) setTimeout(() => { if (this.s === s && s.result === result) this.rate(3); }, s.mode === 'challenge' ? 450 : 700);
  },

  /* ---------- Bewerten ---------- */
  async rate(g) {
    const s = this.s;
    if (!s || !s.result || s.rating) return;
    s.rating = true;
    try {
      const card = s.current;
      const ms = Date.now() - s.shownAt;
      const ok = g >= 2;
      if (s.mode === 'learn') {
        const profileBefore = deepClone(State.profile);
        const leechBefore = State.cards.get(card.id).leech;
        const sessBefore = { done: s.done, correct: s.correct, again: s.again, dmg: s.dmg, gold: s.gold, killsLen: s.kills.length };
        const res = await Store.applyReview(card.id, g, { ms, shownType: card.shownType });
        s.combo = g >= 3 ? s.combo + 1 : g === 2 ? s.combo : 0;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        let hitRes = null;
        if (RPG.hasHero()) {
          if (ok) { hitRes = RPG.hit({ rating: g, combo: s.combo, card: State.cards.get(card.id) }); RPG.d.gold += 1; s.gold += 1; }
          if (res.goal) { RPG.d.gold += 25; s.gold += 25; }
        }
        const xp = Gami.xpForAnswer(g, s.combo);
        s.xp += xp;
        s.done++; if (ok) s.correct++; else s.again++;
        s.answered.add(card.id);
        s.undo = { cardId: card.id, before: res.before, logId: res.log.id, profileBefore, leechBefore, combo: s.combo, xp, sess: sessBefore };
        Fx.floatText(`+${xp} XP`, this.el.xp, 'float-xp');
        if (res.card.srs.due <= Date.now() + 4 * HOUR && res.card.srs.due <= endOfToday()) s.learnQ.push(card.id);
        if (res.becameLeech) toast('Problemkarte erkannt: Diese Karte vergisst du oft. Formuliere sie um oder teile sie auf.', 'warn', { duration: 6000, action: { label: 'Bearbeiten', fn: () => openEditor({ cardId: card.id }) } });
        if (res.goal) {
          toast(`Tagesziel erreicht! Serie: ${res.goal.streak} ${res.goal.streak === 1 ? 'Tag' : 'Tage'}`, 'fire', { duration: 4500 });
          Fx.confetti(90); Sound.great();
          if (res.goal.freeze) setTimeout(() => toast('Du hast einen Freeze-Tag verdient. Er rettet deine Serie, wenn du einmal aussetzt.', 'snow', { duration: 6000 }), 800);
        }
        await Gami.addXp(xp);
        if (RPG.hasHero()) { await Store.saveProfile(); this.showHit(hitRes); }
      } else if (s.mode === 'cram') {
        s.done++;
        if (ok) { s.correct++; s.combo++; } else { s.again++; s.combo = 0; s.queue.splice(Math.min(4, s.queue.length), 0, card.id); }
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        const xp = ok ? 3 : 1; s.xp += xp; await Gami.addXp(xp);
      } else if (s.mode === 'challenge') {
        s.done++;
        if (ok) { s.correct++; s.combo++; const pts = Math.round(10 * this.multiplier()); s.score += pts; Fx.floatText(`+${pts}`, $('.score', this.el.timer), 'float-xp'); }
        else s.combo = 0;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
      } else if (s.mode === 'boss') {
        s.done++;
        if (ok) {
          s.correct++; s.combo++;
          const r = RPG.hit({ rating: g, combo: s.combo, card: State.cards.get(card.id) }, s.assaultFactor);
          RPG.d.gold += 1; s.gold += 1;
          await RPG.save();
          this.showHit(r);
        } else {
          s.combo = 0; s.lives--;
          this.el.screen.classList.remove('flash'); void this.el.screen.offsetWidth; this.el.screen.classList.add('flash');
        }
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        this.paintBoss();
        if (s.lives <= 0) { await this.animateOut(g); this.finish(true); return; }
      }
      this.paintTop();
      await this.animateOut(g);
      if (this.s !== s) return;
      this.next();
    } finally { s.rating = false; }
  },
  /** Schaden am Boss anzeigen (schwebende Zahl, Wackeln, Sieg) */
  showHit(r) {
    const s = this.s;
    if (!r || !s) return;
    s.dmg += r.dmg;
    const av = this.el.boss && $('.boss-avatar', this.el.boss);
    if (av) {
      av.classList.remove('hit'); void av.offsetWidth; av.classList.add('hit');
      Fx.floatText(r.crit ? `Kritisch! −${r.dmg}` : `−${r.dmg}`, av, r.crit ? 'float-dmg is-crit' : 'float-dmg');
    }
    Sound.hit();
    if (r.killed) {
      s.kills.push(r.killed.boss);
      toast(`${r.killed.boss.name} ${r.killed.boss.title} ist besiegt! Eine Schatztruhe wartet auf dich.`, 'badge', { duration: 6000 });
      Fx.confetti(160); Sound.level();
      setTimeout(() => toast(`Ein neuer Gegner erscheint: ${RPG.d.boss.name} ${RPG.d.boss.title}`, 'info', { duration: 5000 }), 1200);
    }
    this.paintBoss();
  },
  animateOut(g) {
    const c = this.el.card;
    if (prefersReducedMotion()) return Promise.resolve();
    const cls = g === 1 ? 'fly-left' : g === 2 && this.s.mode === 'learn' ? 'fly-up' : 'fly-right';
    c.classList.add(cls);
    return sleep(220);
  },

  async undo() {
    const s = this.s;
    if (!s || !s.undo || s.mode !== 'learn') return;
    const u = s.undo;
    await Store.undoReview(u);
    s.learnQ = s.learnQ.filter((x) => x !== u.cardId);
    s.queue = s.queue.filter((x) => x !== u.cardId);
    if (s.current && s.current.id !== u.cardId) s.queue.unshift(s.current.id);
    s.queue.unshift(u.cardId);
    s.answered.delete(u.cardId);
    s.xp = Math.max(0, s.xp - u.xp);
    s.combo = Math.max(0, u.combo - 1);
    Object.assign(s, u.sess);
    s.kills.length = u.sess.killsLen;
    delete s.killsLen;
    this.paintBoss();
    s.undo = null;
    toast('Letzte Bewertung rückgängig gemacht.', 'info');
    this.next();
  },
  speak() {
    const s = this.s;
    if (!s?.ctl) return;
    const txt = s.result?.speakText || s.ctl.speakText?.();
    Speech.speak(txt, Store.langFor(s.current.folderId));
  },
  edit() {
    const s = this.s;
    if (!s?.current) return;
    const id = s.current.id;
    openEditor({ cardId: id, onSaved: () => {
      if (!this.s) return;
      const c = State.cards.get(id);
      if (!c) { this.next(); return; }
      s.current = c; s.result = null; this.renderCard();
    } });
  },

  /* ---------- Wischen ---------- */
  attachSwipe() {
    const card = this.el.card;
    let st = null, suppressClick = false;
    card.addEventListener('pointerdown', (e) => {
      if (!this.s || e.button > 0) return;
      if (e.target.closest('input, textarea, select, .drag-handle, .occ-editor')) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, dragging: false };
    });
    card.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.dragging) {
        if (Math.hypot(dx, dy) < 12) return;
        if (!this.canSwipe() ) { st = null; return; }
        if (card.classList.contains('is-scrollable') && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
        st.dragging = true;
        try { card.setPointerCapture(e.pointerId); } catch (er) { /* egal */ }
        card.classList.add('dragging');
      }
      const allowUp = this.s.mode === 'learn' && !!this.s.result && !card.classList.contains('is-scrollable');
      const ty = allowUp ? Math.min(0, dy) : 0;
      card.style.transform = `translate(${dx}px, ${ty}px) rotate(${dx / 22}deg)`;
      const E = this.el;
      E.stampR.style.opacity = clamp(dx / 110, 0, 1);
      E.stampL.style.opacity = clamp(-dx / 110, 0, 1);
      E.stampU.style.opacity = allowUp && Math.abs(dx) < 60 ? clamp(-dy / 110, 0, 1) : 0;
    });
    const end = (e) => {
      if (!st || e.pointerId !== st.id) return;
      const wasDragging = st.dragging;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      st = null;
      card.classList.remove('dragging');
      if (!wasDragging) { if (e.pointerType !== 'mouse') this.tapReveal(e.target); return; }
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 50);
      const allowUp = this.s.mode === 'learn' && !!this.s.result && !card.classList.contains('is-scrollable');
      let dir = null;
      if (dx > 90) dir = 'right'; else if (dx < -90) dir = 'left'; else if (allowUp && dy < -90 && Math.abs(dx) < 70) dir = 'up';
      [this.el.stampL, this.el.stampR, this.el.stampU].forEach((x) => { x.style.opacity = 0; });
      if (!dir) { card.style.transform = ''; return; }
      this.swipe(dir, true);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', (e) => { if (st && e.pointerId === st.id) { st = null; card.classList.remove('dragging'); card.style.transform = ''; [this.el.stampL, this.el.stampR, this.el.stampU].forEach((x) => { x.style.opacity = 0; }); } });
    card.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
    card.addEventListener('click', (e) => this.tapReveal(e.target));
  },
  /** Tippen/Klicken auf die Karte deckt sie auf (außer auf Schaltflächen und Eingabefeldern) */
  tapReveal(target) {
    const s = this.s;
    if (!s || s.result || !s.ctl?.needsReveal) return;
    if (target && target.closest && target.closest('button, input, textarea, a, .hint-box')) return;
    s.ctl.reveal();
  },
  canSwipe() {
    const s = this.s;
    if (!s) return false;
    if (!s.result) return !!s.ctl?.onSwipe;
    return true;
  },
  /** Wischen (Finger) oder Pfeiltasten */
  swipe(dir, fromGesture = false) {
    const s = this.s;
    if (!s) return false;
    if (!s.result) {
      if (s.ctl?.onSwipe && s.ctl.onSwipe(dir)) { if (fromGesture) this.el.card.style.transform = ''; return true; }
      if (fromGesture) this.el.card.style.transform = '';
      return false;
    }
    let g;
    if (s.mode === 'learn') g = dir === 'right' ? 3 : dir === 'left' ? 1 : dir === 'up' ? 2 : null;
    else if (s.result.correct == null || s.mode === 'cram') g = dir === 'right' ? 3 : dir === 'left' ? 1 : null;
    else g = s.result.correct ? 3 : 1;
    if (!g) { this.el.card.style.transform = ''; return false; }
    this.el.card.style.transform = '';
    this.rate(g);
    return true;
  },

  /* ---------- Tastatur ---------- */
  onKey(e) {
    const s = this.s;
    if (!s || Modal.stack.length || e.ctrlKey && e.key.toLowerCase() !== 'z' || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') { e.preventDefault(); this.finish(); return; }
    if (s.summary) { if (e.key === 'Enter') { e.preventDefault(); $('.summary .btn-primary')?.click(); } return; }
    if (!s.result && s.ctl?.onKey && !(isTyping(e) && e.key !== 'Enter')) {
      if (s.ctl.onKey(e)) { e.preventDefault(); return; }
    }
    if (isTyping(e)) return;
    const k = e.key;
    if (k.toLowerCase() === 'z' && s.mode === 'learn') { e.preventDefault(); this.undo(); return; }
    if (k.toLowerCase() === 's' && !e.ctrlKey) { e.preventDefault(); this.speak(); return; }
    if (k.toLowerCase() === 'e' && s.mode !== 'challenge') { e.preventDefault(); this.edit(); return; }
    if (k.toLowerCase() === 'h') { const hb = $('.hint-btn', this.el.card); if (hb) { e.preventDefault(); hb.click(); } return; }
    if (!s.result) return;
    if (s.mode === 'learn' && /^[1-4]$/.test(k)) { e.preventDefault(); this.rate(Number(k)); return; }
    if (k === 'ArrowRight') { e.preventDefault(); this.swipe('right'); return; }
    if (k === 'ArrowLeft') { e.preventDefault(); this.swipe('left'); return; }
    if (k === 'ArrowUp' && s.mode === 'learn') { e.preventDefault(); this.swipe('up'); return; }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (s.mode === 'learn') this.rate(s.result.suggested || 3);
      else if (s.mode === 'cram') this.rate(s.result.suggested === 1 ? 1 : 3);
      else this.rate(s.result.correct === false ? 1 : 3);
    }
  },

  /* ---------- Zeit-Challenge ---------- */
  async countdown() {
    const E = this.el, s = this.s;
    E.actions.append(h('p', { class: 'muted center' }, 'Gleich geht’s los …'));
    for (const n of ['3', '2', '1']) {
      if (this.s !== s) return;
      clear(E.card); E.card.append(h('div', { class: 'countdown' }, n));
      Sound.flip();
      await sleep(650);
    }
    if (this.s !== s) return;
    clear(E.actions);
    const t0 = Date.now();
    s.timer = setInterval(() => {
      s.timeLeft = 60 - (Date.now() - t0) / 1000;
      this.paintBoss();
      if (s.timeLeft <= 0) { clearInterval(s.timer); this.finish(true); }
    }, 100);
    this.next();
  },

  /* ---------- Ende & Zusammenfassung ---------- */
  async finish(natural = false) {
    const s = this.s;
    if (!s || s.summary) { this.exit(); return; }
    if (s.timer) clearInterval(s.timer);
    if (!natural && s.mode === 'learn' && s.done === 0) { this.exit(); return; }
    if (!natural && s.mode === 'boss' && s.done === 0) { this.exit(); return; }
    if (!natural && s.mode === 'challenge') {
      const ok = await confirmDialog({ title: 'Runde abbrechen?', text: 'Dein Ergebnis dieser Runde wird nicht gewertet.', ok: 'Abbrechen', cancel: 'Weiterspielen', danger: true });
      if (!ok) return;
      this.exit(); return;
    }
    s.summary = true;
    const minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / MIN));
    const acc = s.done ? Math.round((s.correct / s.done) * 100) : 0;
    let title = 'Runde geschafft', sub = '', extra = null, win = false, bonusXp = 0;
    if (s.mode === 'learn') {
      const more = Store.dueCounts(s.folderId);
      title = s.done ? (acc >= 90 ? 'Stark gelernt!' : acc >= 70 ? 'Gute Runde!' : 'Dranbleiben lohnt sich!') : 'Pause';
      sub = more.due + more.learning + more.newToday && natural === false ? 'Den Rest kannst du jederzeit fortsetzen.' : 'Für heute ist dieser Stapel erledigt.';
      if (s.done >= 10 && s.again === 0) { State.profile.totals.perfectSessions++; await Store.saveProfile(); bonusXp = 25; extra = 'Fehlerfreie Runde: +25 XP Bonus'; }
    } else if (s.mode === 'cram') {
      title = 'Übungsrunde beendet'; sub = 'Freies Üben verändert deinen Lernplan nicht.';
    } else if (s.mode === 'challenge') {
      const prev = State.profile.high.challenge || 0;
      const record = s.score > prev;
      if (record) { State.profile.high.challenge = s.score; await Store.saveProfile(); }
      title = record ? 'Neuer Rekord!' : 'Zeit ist um!';
      sub = record && prev ? `Alter Rekord: ${fmtNum(prev)} Punkte` : prev ? `Dein Rekord: ${fmtNum(prev)} Punkte` : '';
      bonusXp = Math.round(s.score / 5);
      win = record;
    } else if (s.mode === 'boss') {
      win = s.kills.length > 0;
      if (!win) { State.profile.high.bossLosses++; await Store.saveProfile(); }
      title = win ? 'Boss besiegt!' : s.lives <= 0 ? 'Rückzug!' : 'Angriff beendet';
      sub = win ? `Du hast ${s.kills.map((b) => `${b.name} ${b.title}`).join(' und ')} bezwungen.`
        : `${RPG.d.boss.name} hat noch ${fmtNum(RPG.d.boss.hp)} Lebenspunkte. Jede richtige Antwort in deinen Lernrunden schwächt ihn weiter.`;
      bonusXp = win ? 100 : 15;
    }
    if (bonusXp) { s.xp += bonusXp; await Gami.addXp(bonusXp); }
    Badges.evaluate({ session: s });
    if ((s.mode === 'learn' && s.done >= 5 && acc >= 80) || win) { Fx.confetti(); Sound.great(); }
    const stats = s.mode === 'challenge'
      ? [['Punkte', fmtNum(s.score)], ['Richtig', `${s.correct} / ${s.done}`], ['Beste Combo', String(s.bestCombo)], ['XP', `+${s.xp}`]]
      : [['Karten', String(s.done)], ['Trefferquote', `${acc} %`], ['Beste Combo', String(s.bestCombo)], ['XP', `+${s.xp}`]];
    if (s.mode === 'learn') stats.splice(3, 0, ['Zeit', `${minutes} Min`]);
    if (s.dmg) stats.splice(1, 0, ['Schaden', fmtNum(s.dmg)]);
    if (s.gold) stats.push(['Gold', `+${fmtNum(s.gold)}`]);
    if (s.mode === 'learn' && s.kills.length) win = true;
    const more = s.mode === 'learn' ? Store.dueCounts(s.folderId) : null;
    const moreCount = more ? more.due + more.learning + more.newToday : 0;
    const E = this.el;
    clear(E.screen);
    E.screen.appendChild(h('div', { class: 'summary' },
      h('div', { class: 'summary-card index-card' },
        h('div', { class: 'summary-icon' }, Icons.get(s.mode === 'boss' ? (win ? 'trophy' : 'sword') : s.mode === 'challenge' ? 'clock' : 'check')),
        h('h1', {}, title), sub ? h('p', { class: 'muted' }, sub) : null,
        h('div', { class: 'summary-stats' }, stats.map(([l, v]) => h('div', { class: 'sstat' }, h('strong', {}, v), h('span', {}, l)))),
        extra ? h('p', { class: 'summary-extra' }, Icons.get('star'), extra) : null,
        RPG.hasHero() && RPG.d.chests.length ? h('button', { class: 'btn btn-primary chest-cta', type: 'button', onClick: () => { this.exit(); setTimeout(() => openChestDialog(RPG.d.chests[0].id), 50); } }, Icons.get('chest'), RPG.d.chests.length > 1 ? `${RPG.d.chests.length} Truhen öffnen` : 'Truhe öffnen') : null,
        h('div', { class: 'btn-row center' },
          s.mode === 'learn' && moreCount ? h('button', { class: 'btn', type: 'button', onClick: () => { this.exit(); startStudy({ folderId: s.folderId, mode: 'learn' }); } }, `Weiterlernen (${moreCount})`) : null,
          s.mode === 'challenge' || s.mode === 'boss' ? h('button', { class: 'btn', type: 'button', onClick: () => { this.exit(); startStudy({ folderId: s.folderId, mode: s.mode }); } }, Icons.get('rotate'), 'Nochmal') : null,
          h('button', { class: 'btn btn-primary', type: 'button', onClick: () => this.exit() }, 'Fertig')))));
    $('.summary .btn-primary')?.focus();
  },
  exit() {
    const s = this.s;
    if (s?.timer) clearInterval(s.timer);
    this.s = null;
    this.active = false;
    document.body.classList.remove('is-studying');
    window.speechSynthesis?.cancel?.();
    if (location.hash.startsWith('#/study')) history.back(); else route();
  },
};

function interleaveByFolder(cards) {
  const groups = new Map();
  cards.forEach((c) => { if (!groups.has(c.folderId)) groups.set(c.folderId, []); groups.get(c.folderId).push(c); });
  const lists = shuffle(Array.from(groups.values()));
  const out = [];
  let added = true;
  for (let i = 0; added; i++) { added = false; for (const l of lists) if (i < l.length) { out.push(l[i]); added = true; } }
  return out;
}

function startStudy(opts) {
  Modal.closeAll();
  if (Study.active) Study.exit();
  const ok = Study.start(opts);
  if (ok && !location.hash.startsWith('#/study')) history.pushState(null, '', '#/study');
}
