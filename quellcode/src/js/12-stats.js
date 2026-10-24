/* Statistik: Kennzahlen, Lernkalender, Vorschau, Fortschritt pro Ordner und Kartentyp */
async function renderStats(main) {
  clear(main);
  const cards = Array.from(State.cards.values());
  const days = State.profile.days;
  const today = dayKey();
  const last = (n) => Array.from({ length: n }, (_, i) => addDaysKey(today, -i));
  const sum30 = last(30).reduce((a, k) => { const d = days[k]; if (d) { a.r += d.reviews; a.c += d.correct; a.ms += d.ms; } return a; }, { r: 0, c: 0, ms: 0 });
  const mature = cards.filter((c) => FSRS.maturity(c.srs) === 'mature').length;
  const fresh = cards.filter((c) => c.srs.state === 'new').length;
  const t = State.profile.totals;

  const kpi = (value, label, sub) => h('div', { class: 'kpi' }, h('strong', {}, value), h('span', {}, label), sub ? h('span', { class: 'muted small' }, sub) : null);
  const kpis = h('div', { class: 'kpis' },
    kpi(fmtNum(t.reviews), 'Antworten gesamt', `${fmtNum(sum30.r)} in den letzten 30 Tagen`),
    kpi(sum30.r ? `${Math.round((sum30.c / sum30.r) * 100)} %` : '–', 'Trefferquote', 'letzte 30 Tage'),
    kpi(`${fmtNum(mature)}`, 'Karten sitzen sicher', `von ${fmtNum(cards.length)} · ${fmtNum(fresh)} noch neu`),
    kpi(`${Math.round(sum30.ms / MIN)} Min`, 'Lernzeit', 'letzte 30 Tage'),
    kpi(String(Gami.streakAlive()), 'Tage Serie', `Bestwert: ${State.profile.bestStreak}`));

  // Lernkalender (18 Wochen)
  const weeks = 18;
  const start = (() => { let k = addDaysKey(today, -(weeks * 7 - 1)); const wd = (keyToDate(k).getDay() + 6) % 7; return addDaysKey(k, -wd); })();
  const maxR = Math.max(10, ...Object.values(days).map((d) => d.reviews));
  const heat = h('div', { class: 'heatmap', role: 'img', 'aria-label': 'Lernkalender der letzten Wochen' });
  const total = daysBetweenKeys(start, today) + 1;
  for (let i = 0; i < total; i++) {
    const k = addDaysKey(start, i);
    const d = days[k];
    const r = d ? d.reviews : 0;
    const lvl = r === 0 ? 0 : r < maxR * 0.25 ? 1 : r < maxR * 0.5 ? 2 : r < maxR * 0.75 ? 3 : 4;
    const frozen = State.profile.frozenDays.includes(k);
    heat.appendChild(h('div', { class: `hm-cell l${lvl} ${frozen ? 'is-frozen' : ''} ${d?.goalHit ? 'is-goal' : ''}`, title: `${fmtDate(k)}: ${r} Antworten${d?.goalHit ? ' · Ziel erreicht' : ''}${frozen ? ' · Freeze-Tag' : ''}` }));
  }

  // Vorschau 14 Tage
  const fc = Array.from({ length: 14 }, () => 0);
  const startToday = dayStartTs(today);
  for (const c of cards) {
    if (c.srs.state === 'new') continue;
    const idx = c.srs.due < startToday + DAY ? 0 : Math.floor((c.srs.due - startToday) / DAY);
    if (idx >= 0 && idx < 14) fc[idx]++;
  }
  const fmax = Math.max(1, ...fc);
  const forecast = h('div', { class: 'bars', role: 'img', 'aria-label': 'Fällige Karten in den nächsten 14 Tagen' }, fc.map((n, i) => {
    const k = addDaysKey(today, i);
    const label = `${keyToDate(k).getDate()}.`;
    return h('div', { class: `bar-col ${i === 0 ? 'is-today' : ''}`, title: `${i === 0 ? 'Heute' : i === 1 ? 'Morgen' : fmtDate(k)}: ${n} Karten` },
      h('span', { class: 'bar-val' }, n ? String(n) : ''),
      h('div', { class: 'bar-v', style: { height: `${(n / fmax) * 100}%` } }),
      h('span', { class: 'bar-lab' }, label));
  }));

  // Ordner
  const tops = Store.childFolders(null);
  const folderRows = h('div', { class: 'fold-progress' }, tops.map((f) => {
    const st = folderStats(f.id);
    return h('div', { class: 'fp-row' },
      h('div', { class: 'fp-name' }, `${f.emoji || '📁'} ${f.name}`, h('span', { class: 'muted small' }, ` · ${st.total}`)),
      h('div', { class: 'stackbar big' },
        h('span', { class: 'sb-mature', style: { flexGrow: st.mature } }), h('span', { class: 'sb-learning', style: { flexGrow: st.learning } }), h('span', { class: 'sb-new', style: { flexGrow: st.fresh || (st.total ? 0 : 1) } })),
      h('div', { class: 'muted small' }, `${st.total ? Math.round((st.mature / st.total) * 100) : 0} % sicher`));
  }));
  const legend = h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'sb-mature' }), 'sicher (≥ 21 Tage)'), h('span', {}, h('i', { class: 'sb-learning' }), 'lernend'), h('span', {}, h('i', { class: 'sb-new' }), 'neu'));

  // Kartentypen
  const typeBox = h('div', { class: 'type-acc' }, h('p', { class: 'muted small' }, 'Wird geladen …'));

  main.append(
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Statistik'), h('p', { class: 'muted' }, 'So entwickelt sich dein Gedächtnis.'))),
    kpis,
    h('section', { class: 'section panel' }, h('h2', { class: 'section-title' }, 'Lernkalender'), h('div', { class: 'heat-wrap' }, heat),
      h('div', { class: 'legend' }, h('span', {}, 'weniger'), [0, 1, 2, 3, 4].map((l) => h('i', { class: `hm-cell l${l}` })), h('span', {}, 'mehr'), h('span', {}, h('i', { class: 'hm-cell l0 is-frozen' }), 'Freeze-Tag'))),
    h('div', { class: 'two-col' },
      h('section', { class: 'section panel' }, h('h2', { class: 'section-title' }, 'Fällig in den nächsten 14 Tagen'), forecast),
      h('section', { class: 'section panel' }, h('h2', { class: 'section-title' }, 'Trefferquote nach Kartentyp'), typeBox)),
    tops.length ? h('section', { class: 'section panel' }, h('h2', { class: 'section-title' }, 'Fortschritt pro Ordner'), folderRows, legend) : null);

  const logs = await Store.getLogs();
  const since = Date.now() - 90 * DAY;
  const per = {};
  logs.filter((l) => l.ts >= since).forEach((l) => { const p = (per[l.type] ||= { n: 0, ok: 0 }); p.n++; if (l.rating >= 2) p.ok++; });
  clear(typeBox);
  const types = TYPE_ORDER.filter((tp) => per[tp]);
  if (!types.length) typeBox.appendChild(h('p', { class: 'muted' }, 'Sobald du gelernt hast, siehst du hier, welche Kartentypen dir am meisten liegen.'));
  types.forEach((tp) => {
    const p = per[tp], pct = Math.round((p.ok / p.n) * 100);
    typeBox.appendChild(h('div', { class: 'ta-row' },
      h('span', { class: 'ta-name' }, Icons.get(CardTypes[tp].icon), CardTypes[tp].label),
      h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${pct}%` } })),
      h('span', { class: 'ta-val' }, `${pct} %`, h('span', { class: 'muted small' }, ` (${p.n})`))));
  });
  typeBox.appendChild(h('p', { class: 'muted small' }, 'Letzte 90 Tage. „Schwer“ zählt als gewusst.'));
}
