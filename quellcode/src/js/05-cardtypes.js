/* Die 8 Kartentypen: Datenprüfung, Darstellung im Lernmodus und Bewertungsvorschlag */
const str = (v) => (v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const LETTERS = 'abcdefgh';

function sideContent(text, image, alt) {
  return [
    image ? h('div', { class: 'face-img' }, imgEl(image, alt || plainText(text) || 'Bild')) : null,
    text ? richEl('div', text, 'face-text') : null,
  ];
}
function hintButton(hint) {
  if (!hint) return null;
  const box = h('div', { class: 'hint-box', hidden: true }, richEl('span', hint));
  const btn = h('button', {
    class: 'btn btn-quiet btn-sm hint-btn', type: 'button',
    onClick: (e) => { e.stopPropagation(); box.hidden = false; btn.remove(); },
  }, Icons.get('bulb'), 'Tipp zeigen');
  return h('div', { class: 'hint-wrap' }, btn, box);
}
function noteBox(note) { return note ? h('div', { class: 'note-box' }, Icons.get('info'), richEl('div', note)) : null; }
function feedbackLine(kind, text) {
  const icon = { ok: 'check', close: 'alert', bad: 'x' }[kind];
  return h('div', { class: `feedback feedback-${kind}` }, Icons.get(icon), h('span', { html: text }));
}
function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
function parseCloze(text) {
  const re = /\{\{(?:c(\d+)::)?([\s\S]+?)(?:::([^}]*))?\}\}/g;
  const parts = [];
  let last = 0, m;
  while ((m = re.exec(text))) {
    parts.push({ text: text.slice(last, m.index) });
    parts.push({ gap: true, answers: m[2].split('|').map((s) => s.trim()).filter(Boolean), hint: m[3] || '' });
    last = re.lastIndex;
  }
  parts.push({ text: text.slice(last) });
  return parts;
}
function toBool(v) {
  if (typeof v === 'boolean') return v;
  return ['wahr', 'true', 'richtig', 'ja', 'yes', '1', 'w', 'r'].includes(String(v).trim().toLowerCase());
}

const CardTypes = {
  /* 1 ---------------------------------------------------------------- */
  basic: {
    label: 'Klassisch', icon: 'flip', desc: 'Vorderseite lesen, umdrehen, selbst bewerten',
    normalize: (r) => ({
      front: str(r.front ?? r.question), back: str(r.back ?? r.answer),
      frontImage: r.frontImage || r.image || null, backImage: r.backImage || null,
      hint: str(r.hint), note: str(r.note), reverse: !!r.reverse,
    }),
    validate: (d) => (!d.front && !d.frontImage ? 'Die Vorderseite braucht Text oder ein Bild.' : !d.back && !d.backImage ? 'Die Rückseite braucht Text oder ein Bild.' : null),
    searchText: (d) => `${d.front} ${d.back} ${d.hint} ${d.note}`,
    summary: (d) => [plainText(d.front) || '(Bild)', plainText(d.back) || '(Bild)'],
    study(card, ctx) {
      const d = card.data;
      let flipped = false;
      const front = h('div', { class: 'face face-front' }, sideContent(d.front, d.frontImage), hintButton(d.hint));
      const back = h('div', { class: 'face face-back' },
        h('div', { class: 'face-q' }, sideContent(d.front, null)),
        h('div', { class: 'face-divider' }),
        sideContent(d.back, d.backImage), noteBox(d.note));
      const el = h('div', { class: 'flip', onClick: () => flip() }, h('div', { class: 'flip-inner' }, front, back));
      function flip() {
        if (flipped) return;
        flipped = true;
        el.classList.add('flipped');
        ctx.done({ suggested: null, speakText: d.back });
      }
      return { el, needsReveal: true, reveal: flip, speakText: () => (flipped ? d.back : d.front),
        onKey(e) { if (!flipped && (e.key === ' ' || e.key === 'Enter')) { flip(); return true; } return false; } };
    },
  },

  /* 2 ---------------------------------------------------------------- */
  typing: {
    label: 'Antwort eintippen', icon: 'keyboard', desc: 'Antwort tippen, kleine Tippfehler werden toleriert',
    normalize: (r) => {
      let answer = str(r.answer ?? r.back);
      let alternatives = arr(r.alternatives ?? r.accept).map(str).filter(Boolean);
      if (answer.includes('|')) { const [a, ...rest] = answer.split('|').map((s) => s.trim()); answer = a; alternatives = [...rest, ...alternatives]; }
      return { question: str(r.question ?? r.front), answer, alternatives, image: r.image || null, hint: str(r.hint), note: str(r.note) };
    },
    validate: (d) => (!d.question && !d.image ? 'Die Frage braucht Text oder ein Bild.' : !d.answer ? 'Bitte gib die richtige Antwort ein.' : null),
    searchText: (d) => `${d.question} ${d.answer} ${d.alternatives.join(' ')} ${d.note}`,
    summary: (d) => [plainText(d.question) || '(Bild)', d.answer],
    study(card, ctx) {
      const d = card.data;
      let checked = false;
      const input = h('input', { class: 'answer-input', type: 'text', placeholder: 'Deine Antwort …', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Deine Antwort' });
      const result = h('div', { class: 'result-area' });
      const checkBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: () => check() }, 'Prüfen');
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });
      const el = h('div', { class: 'face face-single' },
        h('div', { class: 'face-q' }, sideContent(d.question, d.image)), hintButton(d.hint),
        h('div', { class: 'answer-row' }, input, checkBtn), result);
      function check() {
        if (checked) return;
        checked = true;
        const given = input.value;
        const status = given.trim() ? matchAnswer(given, [d.answer, ...d.alternatives]) : 'wrong';
        input.disabled = true; checkBtn.remove(); input.blur();
        input.classList.add(status === 'exact' ? 'is-ok' : status === 'close' ? 'is-close' : 'is-bad');
        const correctHtml = `<strong>${renderRich(d.answer)}</strong>`;
        result.append(
          status === 'exact' ? feedbackLine('ok', 'Richtig!')
            : status === 'close' ? feedbackLine('close', `Fast richtig – korrekt geschrieben: ${correctHtml}`)
              : feedbackLine('bad', given.trim() ? `Richtig wäre: ${correctHtml}` : `Lösung: ${correctHtml}`),
          noteBox(d.note));
        ctx.done({ suggested: status === 'exact' ? 3 : status === 'close' ? 2 : 1, correct: status !== 'wrong', speakText: d.answer });
      }
      return { el, focus: () => input.focus(), speakText: () => (checked ? d.answer : d.question),
        onKey(e) { if (!checked && e.key === 'Enter') { check(); return true; } return false; } };
    },
  },

  /* 3 ---------------------------------------------------------------- */
  mc: {
    label: 'Multiple Choice', icon: 'list', desc: 'Aus mehreren Antworten die richtige(n) wählen',
    normalize: (r) => {
      const options = arr(r.options ?? r.answers).map(str);
      let correct = arr(r.correct ?? r.right);
      correct = correct.map((c) => (typeof c === 'number' ? c : /^\d+$/.test(String(c)) ? Number(c) : options.indexOf(String(c)))).filter((i) => i >= 0);
      return { question: str(r.question ?? r.front), options, correct: Array.from(new Set(correct)).sort((a, b) => a - b), explanation: str(r.explanation ?? r.note), image: r.image || null, shuffle: r.shuffle !== false };
    },
    validate: (d) => {
      if (!d.question && !d.image) return 'Die Frage braucht Text oder ein Bild.';
      if (d.options.filter(Boolean).length < 2) return 'Multiple Choice braucht mindestens 2 Antworten.';
      if (d.options.some((o) => !o)) return 'Leere Antwortmöglichkeiten bitte entfernen.';
      if (!d.correct.length) return 'Markiere mindestens eine richtige Antwort.';
      if (d.correct.some((i) => i >= d.options.length)) return 'Eine richtige Antwort verweist auf eine Option, die es nicht gibt.';
      return null;
    },
    searchText: (d) => `${d.question} ${d.options.filter((o) => !isImageRef(o)).join(' ')} ${d.explanation}`,
    summary: (d) => [plainText(d.question) || '(Bild)', d.correct.map((i) => (isImageRef(d.options[i]) ? '(Bild)' : plainText(d.options[i]))).join(', ')],
    study(card, ctx) {
      const d = card.data;
      const multi = d.correct.length > 1;
      let checked = false;
      const order = d.shuffle ? shuffle(d.options.map((_, i) => i)) : d.options.map((_, i) => i);
      const selected = new Set();
      const result = h('div', { class: 'result-area' });
      const buttons = order.map((oi, pos) => {
        const opt = d.options[oi];
        const b = h('button', { class: 'option', type: 'button', dataset: { oi }, onClick: (e) => { e.stopPropagation(); choose(pos); } },
          h('span', { class: 'key-badge' }, String(pos + 1)),
          isImageRef(opt) ? h('span', { class: 'option-img' }, imgEl(opt, `Antwort ${pos + 1}`)) : richEl('span', opt, 'option-text'));
        return b;
      });
      const checkBtn = multi ? h('button', { class: 'btn btn-primary', type: 'button', onClick: () => check() }, 'Prüfen') : null;
      const el = h('div', { class: 'face face-single' },
        h('div', { class: 'face-q' }, sideContent(d.question, d.image)),
        multi ? h('p', { class: 'muted small' }, `Mehrere Antworten sind richtig (${d.correct.length}).`) : null,
        h('div', { class: `options ${order.some((oi) => isImageRef(d.options[oi])) ? 'options-grid' : ''}` }, buttons),
        checkBtn ? h('div', { class: 'center-row' }, checkBtn) : null, result);
      function choose(pos) {
        if (checked || pos >= buttons.length) return;
        if (!multi) { selected.clear(); selected.add(order[pos]); check(); return; }
        const oi = order[pos];
        selected.has(oi) ? selected.delete(oi) : selected.add(oi);
        buttons[pos].classList.toggle('is-selected', selected.has(oi));
      }
      function check() {
        if (checked) return;
        checked = true;
        const right = new Set(d.correct);
        let allOk = selected.size === right.size;
        buttons.forEach((b) => {
          const oi = Number(b.dataset.oi);
          b.disabled = true;
          if (right.has(oi)) b.classList.add(selected.has(oi) ? 'is-ok' : 'is-missed');
          else if (selected.has(oi)) { b.classList.add('is-bad'); allOk = false; }
          if (right.has(oi) && !selected.has(oi)) allOk = false;
        });
        checkBtn?.remove();
        result.append(allOk ? feedbackLine('ok', 'Richtig!') : feedbackLine('bad', multi ? 'Nicht ganz – die richtigen Antworten sind markiert.' : 'Leider falsch – die richtige Antwort ist markiert.'), noteBox(d.explanation));
        ctx.done({ suggested: allOk ? 3 : 1, correct: allOk });
      }
      return { el, speakText: () => d.question,
        onKey(e) {
          if (checked) return false;
          if (/^[1-9]$/.test(e.key)) { choose(Number(e.key) - 1); return true; }
          if (e.key === 'Enter' && multi) { check(); return true; }
          return false;
        } };
    },
  },

  /* 4 ---------------------------------------------------------------- */
  match: {
    label: 'Zuordnen', icon: 'link', desc: 'Bilder oder Begriffe einander zuordnen',
    normalize: (r) => ({
      prompt: str(r.prompt ?? r.question ?? 'Ordne richtig zu.'),
      pairs: arr(r.pairs).map((p) => (Array.isArray(p) ? { left: str(p[0]), right: str(p[1]) }
        : { left: str(p.left ?? p.image ?? p.term ?? p.a), right: str(p.right ?? p.label ?? p.definition ?? p.b ?? (p.image != null ? p.term : null)) })),
      note: str(r.note),
    }),
    validate: (d) => (d.pairs.length < 2 ? 'Zuordnen braucht mindestens 2 Paare.' : d.pairs.length > 8 ? 'Maximal 8 Paare pro Karte.' : d.pairs.some((p) => !p.left || !p.right) ? 'Jedes Paar braucht eine linke und eine rechte Seite.' : null),
    searchText: (d) => `${d.prompt} ${d.pairs.map((p) => `${isImageRef(p.left) ? '' : p.left} ${isImageRef(p.right) ? '' : p.right}`).join(' ')}`,
    summary: (d) => [plainText(d.prompt), `${d.pairs.length} Paare`],
    study(card, ctx) {
      const d = card.data;
      const n = d.pairs.length;
      const leftOrder = shuffle(d.pairs.map((_, i) => i));
      let rightOrder = shuffle(d.pairs.map((_, i) => i));
      if (n > 1 && rightOrder.every((v, i) => v === leftOrder[i])) rightOrder = rightOrder.slice(1).concat(rightOrder[0]);
      const assign = new Map(); // linker Index -> rechter Index
      let activeLeft = null, checked = false;
      const result = h('div', { class: 'result-area' });
      const content = (v, alt) => (isImageRef(v) ? h('span', { class: 'match-img' }, imgEl(v, alt)) : richEl('span', v, 'match-text'));
      const leftBtns = leftOrder.map((pi, pos) => h('button', { class: 'match-item', type: 'button', dataset: { pi }, onClick: (e) => { e.stopPropagation(); pickLeft(pos); } },
        h('span', { class: 'key-badge' }, String(pos + 1)), content(d.pairs[pi].left, `Element ${pos + 1}`)));
      const rightBtns = rightOrder.map((pi, pos) => h('button', { class: 'match-item', type: 'button', dataset: { pi }, onClick: (e) => { e.stopPropagation(); pickRight(pos); } },
        h('span', { class: 'key-badge' }, LETTERS[pos].toUpperCase()), content(d.pairs[pi].right, `Ziel ${LETTERS[pos].toUpperCase()}`)));
      const checkBtn = h('button', { class: 'btn btn-primary', type: 'button', disabled: true, onClick: () => check() }, 'Prüfen');
      const el = h('div', { class: 'face face-single face-wide' },
        h('div', { class: 'face-q' }, richEl('div', d.prompt, 'face-text')),
        h('p', { class: 'muted small' }, isTouch() ? 'Tippe links, dann rechts.' : 'Klicke links, dann rechts – oder Zahl + Buchstabe tippen.'),
        h('div', { class: 'match-grid' }, h('div', { class: 'match-col' }, leftBtns), h('div', { class: 'match-col' }, rightBtns)),
        h('div', { class: 'center-row' }, checkBtn), result);
      function paint() {
        leftBtns.forEach((b, pos) => {
          b.classList.toggle('is-active', activeLeft === pos);
          const r = assign.get(pos);
          b.dataset.pair = r == null ? '' : String(pos % 6);
        });
        rightBtns.forEach((b, rpos) => {
          let owner = null;
          for (const [l, r] of assign) if (r === rpos) owner = l;
          b.dataset.pair = owner == null ? '' : String(owner % 6);
        });
        checkBtn.disabled = assign.size !== n;
      }
      function pickLeft(pos) {
        if (checked || pos >= n) return;
        if (assign.has(pos)) assign.delete(pos);
        activeLeft = pos;
        paint();
      }
      function pickRight(rpos) {
        if (checked || rpos >= n) return;
        if (activeLeft == null) {
          for (const [l, r] of assign) if (r === rpos) { assign.delete(l); activeLeft = l; }
          paint(); return;
        }
        for (const [l, r] of assign) if (r === rpos) assign.delete(l);
        assign.set(activeLeft, rpos);
        activeLeft = null;
        const free = leftOrder.findIndex((_, p) => !assign.has(p));
        if (free >= 0 && assign.size < n) activeLeft = free;
        paint();
      }
      function check() {
        if (checked || assign.size !== n) return;
        checked = true;
        let wrong = 0;
        leftBtns.forEach((b, pos) => {
          const pi = leftOrder[pos];
          const ok = rightOrder[assign.get(pos)] === pi;
          b.disabled = true;
          b.classList.add(ok ? 'is-ok' : 'is-bad');
          if (!ok) {
            wrong++;
            const right = d.pairs[pi].right;
            b.appendChild(h('span', { class: 'match-fix' }, '→ ', isImageRef(right) ? '(Bild ' + LETTERS[rightOrder.indexOf(pi)].toUpperCase() + ')' : plainText(right)));
          }
        });
        rightBtns.forEach((b) => { b.disabled = true; });
        checkBtn.remove();
        result.append(wrong === 0 ? feedbackLine('ok', 'Alles richtig zugeordnet!') : feedbackLine(wrong === 1 ? 'close' : 'bad', `${wrong} von ${n} falsch – die richtige Zuordnung steht daneben.`), noteBox(d.note));
        ctx.done({ suggested: wrong === 0 ? 3 : wrong === 1 && n >= 4 ? 2 : 1, correct: wrong === 0 });
      }
      paint();
      if (!isTouch()) { activeLeft = 0; paint(); }
      return { el, speakText: () => d.prompt,
        onKey(e) {
          if (checked) return false;
          if (/^[1-8]$/.test(e.key)) { pickLeft(Number(e.key) - 1); return true; }
          const li = LETTERS.indexOf(e.key.toLowerCase());
          if (e.key.length === 1 && li >= 0 && li < n) { pickRight(li); return true; }
          if (e.key === 'Enter') { check(); return true; }
          return false;
        } };
    },
  },

  /* 5 ---------------------------------------------------------------- */
  cloze: {
    label: 'Lückentext', icon: 'cloze', desc: 'Lücken im Text ausfüllen',
    normalize: (r) => ({ text: str(r.text ?? r.front), image: r.image || null, note: str(r.note) }),
    validate: (d) => (!parseCloze(d.text).some((p) => p.gap) ? 'Markiere mindestens eine Lücke mit {{…}}, z. B. „Die Hauptstadt ist {{Wien}}“.' : null),
    searchText: (d) => `${plainText(d.text)} ${d.note}`,
    summary: (d) => [parseCloze(d.text).map((p) => (p.gap ? '[…]' : plainText(p.text))).join(''), parseCloze(d.text).filter((p) => p.gap).map((p) => p.answers[0]).join(', ')],
    study(card, ctx) {
      const d = card.data;
      const parts = parseCloze(d.text);
      let checked = false;
      const inputs = [];
      const textEl = h('div', { class: 'rich face-text cloze-text' });
      parts.forEach((p) => {
        if (!p.gap) { textEl.appendChild(h('span', { html: renderRich(p.text) })); return; }
        const len = Math.max(...p.answers.map((a) => a.length), 3);
        const inp = h('input', { class: 'cloze-input', type: 'text', placeholder: p.hint || '…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': `Lücke ${inputs.length + 1}`, style: { width: `${Math.min(len + 2, 24)}ch` } });
        inp.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault(); e.stopPropagation();
          const i = inputs.findIndex((x) => x.inp === inp);
          if (i < inputs.length - 1 && !inputs[i + 1].inp.value) inputs[i + 1].inp.focus(); else check();
        });
        inputs.push({ inp, answers: p.answers });
        textEl.appendChild(inp);
      });
      const result = h('div', { class: 'result-area' });
      const btnRow = h('div', { class: 'center-row' },
        h('button', { class: 'btn btn-quiet', type: 'button', onClick: () => check(true) }, 'Lösung zeigen'),
        h('button', { class: 'btn btn-primary', type: 'button', onClick: () => check() }, 'Prüfen'));
      const el = h('div', { class: 'face face-single' }, d.image ? h('div', { class: 'face-img' }, imgEl(d.image, 'Bild zur Karte')) : null, textEl, btnRow, result);
      function check(giveUp = false) {
        if (checked) return;
        checked = true;
        let wrong = 0, close = 0;
        inputs.forEach(({ inp, answers }) => {
          const st = giveUp ? 'wrong' : matchAnswer(inp.value, answers);
          inp.disabled = true;
          inp.classList.add(st === 'exact' ? 'is-ok' : st === 'close' ? 'is-close' : 'is-bad');
          if (st !== 'exact') {
            if (st === 'wrong') wrong++; else close++;
            inp.insertAdjacentElement('afterend', h('span', { class: 'cloze-fix' }, answers[0]));
          }
        });
        btnRow.remove();
        document.activeElement?.blur?.();
        result.append(wrong === 0 && close === 0 ? feedbackLine('ok', 'Alle Lücken richtig!')
          : wrong === 0 ? feedbackLine('close', 'Fast – achte auf die Schreibweise.')
            : feedbackLine('bad', `${wrong} von ${inputs.length} Lücken falsch.`), noteBox(d.note));
        ctx.done({ suggested: wrong ? 1 : close ? 2 : 3, correct: wrong === 0 });
      }
      return { el, focus: () => inputs[0]?.inp.focus(), speakText: () => plainText(d.text),
        onKey(e) { if (!checked && e.key === 'Enter') { check(); return true; } return false; } };
    },
  },

  /* 6 ---------------------------------------------------------------- */
  truefalse: {
    label: 'Wahr oder falsch', icon: 'scale', desc: 'Aussage beurteilen – wischen oder Pfeiltasten',
    normalize: (r) => ({ statement: str(r.statement ?? r.question ?? r.front), answer: toBool(r.answer ?? r.correct ?? r.true), explanation: str(r.explanation ?? r.note), image: r.image || null }),
    validate: (d) => (!d.statement && !d.image ? 'Bitte gib eine Aussage ein.' : null),
    searchText: (d) => `${d.statement} ${d.explanation}`,
    summary: (d) => [plainText(d.statement) || '(Bild)', d.answer ? 'Wahr' : 'Falsch'],
    study(card, ctx) {
      const d = card.data;
      let answered = false;
      const result = h('div', { class: 'result-area' });
      const bFalse = h('button', { class: 'tf-btn tf-false', type: 'button', onClick: (e) => { e.stopPropagation(); answer(false); } }, Icons.get('x'), 'Falsch', h('kbd', {}, '←'));
      const bTrue = h('button', { class: 'tf-btn tf-true', type: 'button', onClick: (e) => { e.stopPropagation(); answer(true); } }, Icons.get('check'), 'Wahr', h('kbd', {}, '→'));
      const row = h('div', { class: 'tf-row' }, bFalse, bTrue);
      const el = h('div', { class: 'face face-single' }, h('div', { class: 'face-q' }, sideContent(d.statement, d.image)),
        h('p', { class: 'muted small' }, isTouch() ? 'Wische nach rechts für „wahr“, nach links für „falsch“.' : 'Pfeil rechts = wahr, Pfeil links = falsch.'), row, result);
      function answer(v) {
        if (answered) return;
        answered = true;
        const ok = v === d.answer;
        bFalse.disabled = bTrue.disabled = true;
        (v ? bTrue : bFalse).classList.add(ok ? 'is-ok' : 'is-bad');
        if (!ok) (d.answer ? bTrue : bFalse).classList.add('is-missed');
        result.append(ok ? feedbackLine('ok', `Richtig – die Aussage ist ${d.answer ? 'wahr' : 'falsch'}.`) : feedbackLine('bad', `Leider nein – die Aussage ist ${d.answer ? 'wahr' : 'falsch'}.`), noteBox(d.explanation));
        ctx.done({ suggested: ok ? 3 : 1, correct: ok });
      }
      return { el, speakText: () => d.statement,
        onSwipe(dir) { if (answered) return false; if (dir === 'right') { answer(true); return true; } if (dir === 'left') { answer(false); return true; } return false; },
        onKey(e) {
          if (answered) return false;
          if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'w') { answer(true); return true; }
          if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'f') { answer(false); return true; }
          return false;
        } };
    },
  },

  /* 7 ---------------------------------------------------------------- */
  order: {
    label: 'Reihenfolge', icon: 'sort', desc: 'Elemente in die richtige Reihenfolge bringen',
    normalize: (r) => ({ prompt: str(r.prompt ?? r.question ?? 'Bringe in die richtige Reihenfolge.'), items: arr(r.items ?? r.steps).map(str).filter(Boolean), note: str(r.note) }),
    validate: (d) => (d.items.length < 2 ? 'Reihenfolge braucht mindestens 2 Elemente.' : d.items.length > 10 ? 'Maximal 10 Elemente pro Karte.' : null),
    searchText: (d) => `${d.prompt} ${d.items.join(' ')}`,
    summary: (d) => [plainText(d.prompt), d.items.map(plainText).join(' → ')],
    study(card, ctx) {
      const d = card.data;
      const n = d.items.length;
      let order = shuffle(d.items.map((_, i) => i));
      let guard = 0;
      while (n > 1 && order.every((v, i) => v === i) && guard++ < 10) order = shuffle(order);
      let selected = null, checked = false;
      const list = h('ol', { class: 'order-list' });
      const result = h('div', { class: 'result-area' });
      const checkBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: () => check() }, 'Prüfen');
      const el = h('div', { class: 'face face-single' }, h('div', { class: 'face-q' }, richEl('div', d.prompt, 'face-text')),
        h('p', { class: 'muted small' }, isTouch() ? 'Ziehe am Griff oder tippe zwei Einträge an, um sie zu tauschen.' : 'Ziehen, Pfeile klicken – oder Zahl wählen und mit ↑/↓ verschieben.'),
        list, h('div', { class: 'center-row' }, checkBtn), result);
      function move(pos, dir) {
        const to = pos + dir;
        if (to < 0 || to >= n) return;
        [order[pos], order[to]] = [order[to], order[pos]];
        if (selected === pos) selected = to;
        paint();
      }
      function tap(pos) {
        if (checked) return;
        if (selected == null) selected = pos;
        else if (selected === pos) selected = null;
        else { [order[pos], order[selected]] = [order[selected], order[pos]]; selected = null; }
        paint();
      }
      function paint() {
        clear(list);
        order.forEach((ii, pos) => {
          const li = h('li', { class: `order-item${selected === pos ? ' is-active' : ''}`, dataset: { pos, ii } },
            h('span', { class: 'drag-handle', title: 'Ziehen', 'aria-hidden': 'true' }, Icons.get('grip')),
            h('span', { class: 'key-badge' }, String(pos + 1)),
            richEl('span', d.items[ii], 'order-text'),
            checked ? null : h('span', { class: 'order-btns' },
              h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'nach oben', onClick: (e) => { e.stopPropagation(); move(pos, -1); } }, Icons.get('up')),
              h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'nach unten', onClick: (e) => { e.stopPropagation(); move(pos, 1); } }, Icons.get('down'))));
          if (!checked) li.addEventListener('click', () => tap(pos));
          if (checked) {
            const ok = ii === pos;
            li.classList.add(ok ? 'is-ok' : 'is-bad');
            if (!ok) li.appendChild(h('span', { class: 'order-fix' }, `richtig: Platz ${ii + 1}`));
          }
          list.appendChild(li);
        });
      }
      // Ziehen mit Maus oder Finger
      list.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest('.drag-handle');
        if (!handle || checked) return;
        e.preventDefault(); e.stopPropagation();
        const li = handle.closest('.order-item');
        const from = Number(li.dataset.pos);
        li.classList.add('is-dragging');
        let to = from;
        const rows = $$('.order-item', list);
        const mids = rows.map((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2; });
        const startY = e.clientY;
        const onMove = (ev) => {
          ev.preventDefault();
          li.style.transform = `translateY(${ev.clientY - startY}px)`;
          let t = mids.findIndex((m) => ev.clientY < m);
          if (t < 0) t = n - 1;
          to = t;
          rows.forEach((r, i) => r.classList.toggle('drop-target', i === to && i !== from));
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          if (to !== from) { const [x] = order.splice(from, 1); order.splice(to, 0, x); }
          selected = null;
          paint();
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
      function check() {
        if (checked) return;
        checked = true;
        selected = null;
        paint();
        checkBtn.remove();
        const right = order.filter((v, i) => v === i).length;
        const frac = right / n;
        result.append(frac === 1 ? feedbackLine('ok', 'Perfekte Reihenfolge!') : feedbackLine(frac >= 0.6 ? 'close' : 'bad', `${right} von ${n} an der richtigen Stelle.`),
          h('div', { class: 'order-solution' }, h('strong', {}, 'Richtig: '), d.items.map((x, i) => `${i + 1}. ${plainText(x)}`).join('  ·  ')), noteBox(d.note));
        ctx.done({ suggested: frac === 1 ? 3 : frac >= 0.6 ? 2 : 1, correct: frac === 1 });
      }
      paint();
      return { el, speakText: () => d.prompt,
        onKey(e) {
          if (checked) return false;
          if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) { selected = Number(e.key) - 1; paint(); return true; }
          if (e.key === 'ArrowUp' && selected != null) { move(selected, -1); return true; }
          if (e.key === 'ArrowDown' && selected != null) { move(selected, 1); return true; }
          if (e.key === 'Enter') { check(); return true; }
          return false;
        } };
    },
  },

  /* 8 ---------------------------------------------------------------- */
  occlusion: {
    label: 'Bildbereiche abdecken', icon: 'image', desc: 'Teile eines Bildes verdecken und erraten',
    normalize: (r) => ({
      image: r.image || null,
      prompt: str(r.prompt ?? 'Was ist unter dem markierten Bereich?'),
      masks: arr(r.masks).map((m, i) => ({
        id: str(m.id || `m${i + 1}`),
        x: clamp(Number(m.x) || 0, 0, 1), y: clamp(Number(m.y) || 0, 0, 1),
        w: clamp(Number(m.w ?? m.width) || 0.1, 0.01, 1), h: clamp(Number(m.h ?? m.height) || 0.1, 0.01, 1),
        label: str(m.label ?? m.answer),
      })),
      target: r.target ? str(r.target) : undefined,
      note: str(r.note),
    }),
    validate: (d) => (!d.image ? 'Bitte lade ein Bild hoch.' : !d.masks.length ? 'Zeichne mindestens einen Bereich auf dem Bild.' : d.masks.some((m) => !m.label) ? 'Jeder Bereich braucht eine Beschriftung (die Antwort).' : null),
    searchText: (d) => `${d.prompt} ${d.masks.map((m) => m.label).join(' ')}`,
    summary: (d) => [plainText(d.prompt), (d.masks.find((m) => m.id === d.target) || d.masks[0] || {}).label || ''],
    study(card, ctx) {
      const d = card.data;
      const target = d.masks.find((m) => m.id === d.target) || d.masks[0];
      let revealed = false;
      const masks = d.masks.map((m) => h('div', {
        class: `occ-mask ${m.id === target.id ? 'is-target' : ''}`,
        style: { left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.w * 100}%`, height: `${m.h * 100}%` },
      }, m.id === target.id ? h('span', {}, '?') : null));
      const answer = h('div', { class: 'occ-answer', hidden: true }, richEl('div', target.label, 'face-text'));
      const el = h('div', { class: 'face face-single face-wide', onClick: () => reveal() },
        h('div', { class: 'face-q' }, richEl('div', d.prompt, 'face-text small-q')),
        h('div', { class: 'occ-wrap' }, imgEl(d.image, 'Bild mit verdeckten Bereichen', 'occ-img'), masks),
        answer, noteBox(revealed ? d.note : null));
      function reveal() {
        if (revealed) return;
        revealed = true;
        masks.forEach((m) => m.classList.contains('is-target') && m.classList.add('is-revealed'));
        answer.hidden = false;
        if (d.note) el.appendChild(noteBox(d.note));
        ctx.done({ suggested: null, speakText: target.label });
      }
      return { el, needsReveal: true, reveal, speakText: () => (revealed ? target.label : d.prompt),
        onKey(e) { if (!revealed && (e.key === ' ' || e.key === 'Enter')) { reveal(); return true; } return false; } };
    },
  },
};
const TYPE_ORDER = ['basic', 'typing', 'mc', 'match', 'cloze', 'truefalse', 'order', 'occlusion'];

/** Kartentyp-Abwechslung: klassische Karten manchmal als Eintipp- oder Multiple-Choice-Frage stellen */
function presentAs(card, pool) {
  if (!State.settings.variety || card.type !== 'basic' || card.srs.state === 'new') return card;
  const d = card.data;
  if (d.frontImage && !d.front) return card;
  const back = plainText(d.back).trim();
  if (!back || d.backImage || /\$/.test(d.back) || back.length > 60) return card;
  const roll = Math.random();
  if (roll < 0.2 && back.length <= 30) {
    return { ...card, shownType: 'typing', data: { question: d.front, answer: back, alternatives: [], image: d.frontImage, hint: d.hint, note: d.note } };
  }
  if (roll < 0.4) {
    const others = shuffle(pool.filter((c) => c.id !== card.id && c.type === 'basic' && !c.data.backImage && plainText(c.data.back).trim() && plainText(c.data.back).trim().toLowerCase() !== back.toLowerCase())
      .map((c) => plainText(c.data.back).trim()).filter((v, i, a) => v.length <= 80 && a.indexOf(v) === i)).slice(0, 3);
    if (others.length >= 2) {
      return { ...card, shownType: 'mc', data: { question: d.front, options: [back, ...others], correct: [0], explanation: d.note, image: d.frontImage, shuffle: true } };
    }
  }
  return card;
}
