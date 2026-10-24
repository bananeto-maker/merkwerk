/* FSRS-5 (Free Spaced Repetition Scheduler) – berechnet, wann eine Karte wieder drankommt.
 * Bewertungen: 1 = Nochmal, 2 = Schwer, 3 = Gut, 4 = Leicht */
const FSRS = (() => {
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
    1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const DECAY = -0.5, FACTOR = 19 / 81, MAX_IVL = 36500;
  const LEARN_STEPS = { 1: 1, 2: 5, 3: 10 }; // Minuten für neue Karten
  const RELEARN_STEPS = { 1: 5, 2: 10 };

  const clampD = (d) => clamp(d, 1, 10);
  const R = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
  const intervalFor = (s, ret) => clamp(Math.round(s / FACTOR * (Math.pow(ret, 1 / DECAY) - 1)), 1, MAX_IVL);
  const initS = (g) => Math.max(W[g - 1], 0.1);
  const initD = (g) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);
  const nextD = (d, g) => {
    const dp = d + (-W[6] * (g - 3)) * (10 - d) / 9;
    return clampD(W[7] * initD(4) + (1 - W[7]) * dp);
  };
  const recallS = (d, s, r, g) => s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1)
    * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
  const forgetS = (d, s, r) => Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
  const shortS = (s, g) => Math.max(0.1, s * Math.exp(W[17] * (g - 3 + W[18])));
  const fuzz = (ivl) => {
    if (ivl < 3) return ivl;
    const delta = Math.max(1, Math.round(ivl * 0.05));
    return clamp(ivl + Math.round((Math.random() * 2 - 1) * delta), 2, MAX_IVL);
  };

  function newState() { return { state: 'new', due: 0, s: 0, d: 0, last: 0, reps: 0, lapses: 0, ivl: 0 }; }

  /** Liefert den neuen Lernzustand nach einer Bewertung (ohne Zufallsstreuung, wenn exact=true). */
  function review(srs, g, now = Date.now(), ret = 0.9, exact = false) {
    const cur = srs && srs.state ? srs : newState();
    const n = { ...cur, reps: (cur.reps || 0) + 1, last: now };
    if (cur.state === 'new') {
      n.d = initD(g); n.s = initS(g);
      if (g === 4) { n.state = 'review'; n.ivl = intervalFor(n.s, ret); n.due = now + n.ivl * DAY; }
      else { n.state = 'learning'; n.ivl = 0; n.due = now + LEARN_STEPS[g] * MIN; }
    } else if (cur.state === 'learning' || cur.state === 'relearning') {
      n.d = nextD(cur.d, g); n.s = shortS(cur.s, g);
      if (g <= 2 && cur.state === 'relearning') { n.due = now + RELEARN_STEPS[g] * MIN; n.ivl = 0; }
      else if (g <= 2) { n.due = now + (g === 1 ? 1 : 6) * MIN; n.ivl = 0; }
      else {
        n.state = 'review';
        let ivl = intervalFor(n.s, ret);
        if (g === 4) ivl = Math.max(ivl, 2);
        n.ivl = ivl; n.due = now + ivl * DAY;
      }
    } else {
      const t = Math.max(0, (now - (cur.last || now)) / DAY);
      const r = R(t, cur.s);
      n.d = nextD(cur.d, g);
      if (g === 1) {
        n.s = Math.max(0.1, forgetS(cur.d, cur.s, r));
        n.lapses = (cur.lapses || 0) + 1;
        n.state = 'relearning'; n.ivl = 0; n.due = now + 10 * MIN;
      } else {
        const sH = recallS(cur.d, cur.s, r, 2), sG = recallS(cur.d, cur.s, r, 3), sE = recallS(cur.d, cur.s, r, 4);
        let iH = intervalFor(sH, ret), iG = intervalFor(sG, ret), iE = intervalFor(sE, ret);
        iH = Math.min(iH, iG); iG = Math.max(iG, iH + 1); iE = Math.max(iE, iG + 1);
        const pick = { 2: [sH, iH], 3: [sG, iG], 4: [sE, iE] }[g];
        n.s = pick[0];
        n.ivl = exact ? pick[1] : fuzz(pick[1]);
        n.due = now + n.ivl * DAY;
      }
    }
    return n;
  }

  /** Vorschau: in wie vielen ms kommt die Karte je Bewertung wieder? */
  function preview(srs, now = Date.now(), ret = 0.9) {
    const out = {};
    for (const g of [1, 2, 3, 4]) out[g] = review(srs, g, now, ret, true).due - now;
    return out;
  }

  /** Wahrscheinlichkeit (0–1), dass du die Karte zum Zeitpunkt `at` noch weißt. */
  function retrievability(srs, at = Date.now()) {
    if (!srs || srs.state === 'new' || !srs.s) return 0;
    return R(Math.max(0, (at - srs.last) / DAY), srs.s);
  }

  /** neu | lernend | sicher (Stabilität ≥ 21 Tage) */
  function maturity(srs) {
    if (!srs || srs.state === 'new') return 'new';
    if (srs.state === 'review' && srs.s >= 21) return 'mature';
    return 'learning';
  }

  return { review, preview, retrievability, maturity, newState };
})();
