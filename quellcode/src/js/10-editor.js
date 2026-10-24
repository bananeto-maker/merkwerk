/* Karten-Editor für alle 8 Kartentypen */
const TYPE_MAIN_FIELD = { basic: 'front', typing: 'question', mc: 'question', match: 'prompt', cloze: 'text', truefalse: 'statement', order: 'prompt', occlusion: 'prompt' };

function emptyDraft(type) {
  return {
    basic: { front: '', back: '', frontImage: null, backImage: null, hint: '', note: '', reverse: false },
    typing: { question: '', answer: '', alternatives: [], image: null, hint: '', note: '' },
    mc: { question: '', options: ['', '', ''], correct: [0], explanation: '', image: null, shuffle: true },
    match: { prompt: 'Ordne richtig zu.', pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }], note: '' },
    cloze: { text: '', image: null, note: '' },
    truefalse: { statement: '', answer: true, explanation: '', image: null },
    order: { prompt: 'Bringe in die richtige Reihenfolge.', items: ['', '', ''], note: '' },
    occlusion: { image: null, prompt: 'Was ist unter dem markierten Bereich?', masks: [], note: '' },
  }[type];
}

function textArea(value, onInput, { placeholder = '', rows = 2, label = '', id } = {}) {
  const ta = h('textarea', { class: 'input', rows: String(rows), placeholder, 'aria-label': label || placeholder, id });
  ta.value = value || '';
  ta.addEventListener('input', () => { onInput(ta.value); autoGrow(ta); });
  requestAnimationFrame(() => autoGrow(ta));
  return ta;
}
function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight + 2, 320)}px`; }
function textInput(value, onInput, { placeholder = '', label = '' } = {}) {
  const inp = h('input', { class: 'input', type: 'text', placeholder, 'aria-label': label || placeholder });
  inp.value = value || '';
  inp.addEventListener('input', () => onInput(inp.value));
  return inp;
}
function field(label, control, help) {
  return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), control, help ? h('span', { class: 'field-help' }, help) : null);
}
/** Bildfeld mit Hochladen, Ziehen & Ablegen und Entfernen */
function imageField(get, set, label = 'Bild') {
  const wrap = h('div', { class: 'image-field' });
  const paint = () => {
    clear(wrap);
    const v = get();
    if (v) {
      wrap.append(h('div', { class: 'image-thumb' }, imgEl(v, label)),
        h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: () => { set(null); paint(); } }, Icons.get('trash'), 'Bild entfernen'));
    } else {
      wrap.append(h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: async () => { const f = await pickFile('image/*'); if (f) await use(f); } }, Icons.get('image'), `${label} hinzufügen`));
    }
  };
  const use = async (file) => {
    if (!file.type.startsWith('image/')) { toast('Das ist keine Bilddatei.', 'warn'); return; }
    try { set(await compressImage(file)); paint(); } catch (e) { toast(e.message, 'bad'); }
  };
  wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('is-over'); });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('is-over'));
  wrap.addEventListener('drop', (e) => { e.preventDefault(); wrap.classList.remove('is-over'); if (e.dataTransfer.files[0]) use(e.dataTransfer.files[0]); });
  paint();
  return wrap;
}
function listRow(children, { onUp, onDown, onRemove, canRemove = true }) {
  return h('div', { class: 'list-row' }, children,
    h('div', { class: 'list-row-btns' },
      onUp ? iconBtn('up', 'Nach oben', onUp) : null,
      onDown ? iconBtn('down', 'Nach unten', onDown) : null,
      canRemove ? iconBtn('trash', 'Entfernen', onRemove) : null));
}

const EditorForms = {
  basic(d, rerender, isNew) {
    return [
      field('Vorderseite', textArea(d.front, (v) => { d.front = v; }, { placeholder: 'Frage oder Begriff', rows: 2, id: 'ed-main' })),
      imageField(() => d.frontImage, (v) => { d.frontImage = v; }, 'Bild vorne'),
      field('Rückseite', textArea(d.back, (v) => { d.back = v; }, { placeholder: 'Antwort', rows: 3 })),
      imageField(() => d.backImage, (v) => { d.backImage = v; }, 'Bild hinten'),
      h('details', { class: 'more-fields', open: !!(d.hint || d.note) }, h('summary', {}, 'Tipp & Eselsbrücke'),
        field('Tipp (wird erst auf Wunsch gezeigt)', textInput(d.hint, (v) => { d.hint = v; }, { placeholder: 'optional' })),
        field('Eselsbrücke / Notiz (nach dem Umdrehen)', textArea(d.note, (v) => { d.note = v; }, { placeholder: 'optional', rows: 2 }))),
      isNew ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.reverse, onChange: (e) => { d.reverse = e.target.checked; } }), 'Auch umgekehrt abfragen (erstellt eine zweite Karte)') : null,
    ];
  },
  typing(d) {
    return [
      field('Frage', textArea(d.question, (v) => { d.question = v; }, { placeholder: 'z. B. Wie heißt das Kraftwerk der Zelle?', id: 'ed-main' })),
      imageField(() => d.image, (v) => { d.image = v; }),
      field('Richtige Antwort', textInput(d.answer, (v) => { d.answer = v; }, { placeholder: 'z. B. Mitochondrium' })),
      field('Weitere akzeptierte Antworten', textInput(d.alternatives.join(', '), (v) => { d.alternatives = v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean); }, { placeholder: 'durch Komma getrennt, z. B. Mitochondrien, Mitochondrion' }),
        'Kleine Tippfehler, Groß-/Kleinschreibung und ä/ae werden automatisch toleriert.'),
      h('details', { class: 'more-fields', open: !!(d.hint || d.note) }, h('summary', {}, 'Tipp & Erklärung'),
        field('Tipp', textInput(d.hint, (v) => { d.hint = v; }, { placeholder: 'optional' })),
        field('Erklärung nach dem Prüfen', textArea(d.note, (v) => { d.note = v; }, { placeholder: 'optional' }))),
    ];
  },
  mc(d, rerender) {
    const rows = d.options.map((opt, i) => listRow([
      h('label', { class: 'mc-correct', title: 'Richtige Antwort' }, h('input', { type: 'checkbox', checked: d.correct.includes(i), 'aria-label': `Antwort ${i + 1} ist richtig`,
        onChange: (e) => { d.correct = e.target.checked ? [...d.correct, i] : d.correct.filter((x) => x !== i); } })),
      isImageRef(opt)
        ? h('div', { class: 'opt-image' }, imgEl(opt, `Antwort ${i + 1}`), h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: () => { d.options[i] = ''; rerender(); } }, 'Text statt Bild'))
        : h('div', { class: 'opt-text' }, textInput(opt, (v) => { d.options[i] = v; }, { placeholder: `Antwort ${i + 1}` }),
          iconBtn('image', 'Bild als Antwort', async () => { const f = await pickFile('image/*'); if (f) { d.options[i] = await compressImage(f, 700); rerender(); } })),
    ], { canRemove: d.options.length > 2, onRemove: () => { d.options.splice(i, 1); d.correct = d.correct.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)); rerender(); } }));
    return [
      field('Frage', textArea(d.question, (v) => { d.question = v; }, { placeholder: 'Frage', id: 'ed-main' })),
      imageField(() => d.image, (v) => { d.image = v; }),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Antworten – richtige ankreuzen'), h('div', { class: 'list-rows' }, rows),
        d.options.length < 8 ? h('button', { class: 'btn btn-sm btn-quiet add-btn', type: 'button', onClick: () => { d.options.push(''); rerender(); } }, Icons.get('plus'), 'Antwort hinzufügen') : null),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.shuffle, onChange: (e) => { d.shuffle = e.target.checked; } }), 'Antworten beim Lernen mischen'),
      field('Erklärung (optional)', textArea(d.explanation, (v) => { d.explanation = v; }, { placeholder: 'Warum ist das richtig?' })),
    ];
  },
  match(d, rerender) {
    const rows = d.pairs.map((p, i) => listRow([
      h('div', { class: 'pair-side' }, isImageRef(p.left)
        ? h('div', { class: 'opt-image' }, imgEl(p.left, `Bild ${i + 1}`), h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: () => { p.left = ''; rerender(); } }, 'Text'))
        : h('div', { class: 'opt-text' }, textInput(p.left, (v) => { p.left = v; }, { placeholder: 'Begriff oder Bild' }),
          iconBtn('image', 'Bild verwenden', async () => { const f = await pickFile('image/*'); if (f) { p.left = await compressImage(f, 700); rerender(); } }))),
      h('span', { class: 'pair-arrow', 'aria-hidden': 'true' }, '↔'),
      h('div', { class: 'pair-side' }, textInput(p.right, (v) => { p.right = v; }, { placeholder: 'passende Antwort' })),
    ], { canRemove: d.pairs.length > 2, onRemove: () => { d.pairs.splice(i, 1); rerender(); } }));
    return [
      field('Aufgabe', textInput(d.prompt, (v) => { d.prompt = v; }, { placeholder: 'z. B. Ordne die Organellen ihrer Funktion zu.' })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Paare (2–8)'), h('div', { class: 'list-rows' }, rows),
        d.pairs.length < 8 ? h('button', { class: 'btn btn-sm btn-quiet add-btn', type: 'button', onClick: () => { d.pairs.push({ left: '', right: '' }); rerender(); } }, Icons.get('plus'), 'Paar hinzufügen') : null),
      field('Erklärung (optional)', textArea(d.note, (v) => { d.note = v; }, { placeholder: 'optional' })),
    ];
  },
  cloze(d) {
    const ta = textArea(d.text, (v) => { d.text = v; }, { placeholder: 'Die Hauptstadt von Österreich ist {{Wien}}.', rows: 4, id: 'ed-main' });
    const makeGap = () => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      if (s === e) { toast('Markiere zuerst das Wort, das zur Lücke werden soll.', 'warn'); ta.focus(); return; }
      ta.value = `${ta.value.slice(0, s)}{{${ta.value.slice(s, e)}}}${ta.value.slice(e)}`;
      d.text = ta.value;
      autoGrow(ta);
      ta.focus();
      ta.setSelectionRange(e + 4, e + 4);
    };
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); makeGap(); } });
    return [
      field('Text mit Lücken', ta, 'Lücken in doppelte geschweifte Klammern: {{Wien}}. Mehrere richtige Antworten: {{Wien|Vienna}}. Hinweis in der Lücke: {{Wien::Stadt}}.'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-sm', type: 'button', onClick: makeGap }, Icons.get('cloze'), 'Markierung zur Lücke machen'), !isTouch() ? h('span', { class: 'muted small' }, 'Strg + Umschalt + L') : null),
      imageField(() => d.image, (v) => { d.image = v; }),
      field('Erklärung (optional)', textArea(d.note, (v) => { d.note = v; }, { placeholder: 'optional' })),
    ];
  },
  truefalse(d, rerender) {
    return [
      field('Aussage', textArea(d.statement, (v) => { d.statement = v; }, { placeholder: 'z. B. Wien ist die größte Stadt Österreichs.', id: 'ed-main' })),
      imageField(() => d.image, (v) => { d.image = v; }),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Die Aussage ist …'),
        h('div', { class: 'seg', role: 'radiogroup' },
          h('button', { type: 'button', class: `seg-btn ${d.answer ? 'is-active' : ''}`, role: 'radio', 'aria-checked': String(d.answer), onClick: () => { d.answer = true; rerender(); } }, Icons.get('check'), 'Wahr'),
          h('button', { type: 'button', class: `seg-btn ${!d.answer ? 'is-active' : ''}`, role: 'radio', 'aria-checked': String(!d.answer), onClick: () => { d.answer = false; rerender(); } }, Icons.get('x'), 'Falsch'))),
      field('Erklärung (optional)', textArea(d.explanation, (v) => { d.explanation = v; }, { placeholder: 'Warum?' })),
    ];
  },
  order(d, rerender) {
    const rows = d.items.map((it, i) => {
      const inp = textInput(it, (v) => { d.items[i] = v; }, { placeholder: `Schritt ${i + 1}` });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); d.items.splice(i + 1, 0, ''); rerender(`order-${i + 1}`); } });
      inp.dataset.focusKey = `order-${i}`;
      return listRow([h('span', { class: 'key-badge' }, String(i + 1)), inp], {
        onUp: i > 0 ? () => { [d.items[i - 1], d.items[i]] = [d.items[i], d.items[i - 1]]; rerender(); } : null,
        onDown: i < d.items.length - 1 ? () => { [d.items[i + 1], d.items[i]] = [d.items[i], d.items[i + 1]]; rerender(); } : null,
        canRemove: d.items.length > 2, onRemove: () => { d.items.splice(i, 1); rerender(); },
      });
    });
    return [
      field('Aufgabe', textInput(d.prompt, (v) => { d.prompt = v; }, { placeholder: 'z. B. Ordne die Phasen der Mitose.' })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Elemente in der richtigen Reihenfolge'), h('div', { class: 'list-rows' }, rows),
        d.items.length < 10 ? h('button', { class: 'btn btn-sm btn-quiet add-btn', type: 'button', onClick: () => { d.items.push(''); rerender(`order-${d.items.length - 1}`); } }, Icons.get('plus'), 'Element hinzufügen') : null),
      field('Erklärung (optional)', textArea(d.note, (v) => { d.note = v; }, { placeholder: 'optional' })),
    ];
  },
  occlusion(d, rerender) {
    if (!d.image) {
      return [
        h('div', { class: 'occ-empty' }, Icons.get('image'), h('p', {}, 'Lade ein Bild hoch (z. B. ein Diagramm, eine Landkarte oder eine Abbildung aus deinen Unterlagen) und ziehe dann Rechtecke über die Stellen, die abgefragt werden sollen.'),
          h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => { const f = await pickFile('image/*'); if (f) { d.image = await compressImage(f, 1600); rerender(); } } }, Icons.get('upload'), 'Bild wählen')),
      ];
    }
    let selected = d.masks.length ? d.masks[d.masks.length - 1].id : null;
    const stage = h('div', { class: 'occ-editor' }, imgEl(d.image, 'Bild zum Abdecken', 'occ-img'));
    const labelList = h('div', { class: 'list-rows' });
    const paintMasks = () => {
      $$('.occ-mask', stage).forEach((m) => m.remove());
      d.masks.forEach((m, i) => {
        const el = h('div', { class: `occ-mask edit ${m.id === selected ? 'is-target' : ''}`, style: { left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.w * 100}%`, height: `${m.h * 100}%` }, dataset: { id: m.id } }, h('span', {}, String(i + 1)));
        stage.appendChild(el);
      });
      clear(labelList);
      d.masks.forEach((m, i) => {
        const inp = textInput(m.label, (v) => { m.label = v; }, { placeholder: 'Was steht darunter? (Antwort)' });
        inp.addEventListener('focus', () => { selected = m.id; $$('.occ-mask', stage).forEach((x) => x.classList.toggle('is-target', x.dataset.id === m.id)); });
        inp.dataset.maskId = m.id;
        labelList.appendChild(listRow([h('span', { class: 'key-badge' }, String(i + 1)), inp], { onRemove: () => { d.masks.splice(i, 1); paintMasks(); } }));
      });
      if (!d.masks.length) labelList.appendChild(h('p', { class: 'muted small' }, 'Noch keine Bereiche. Ziehe mit der Maus oder dem Finger ein Rechteck über das Bild.'));
    };
    stage.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      const hitMask = e.target.closest('.occ-mask');
      if (hitMask) { selected = hitMask.dataset.id; paintMasks(); $(`input[data-mask-id="${selected}"]`, labelList)?.focus({ preventScroll: true }); return; }
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const sx = (e.clientX - r.left) / r.width, sy = (e.clientY - r.top) / r.height;
      const ghost = h('div', { class: 'occ-mask edit is-drawing' });
      stage.appendChild(ghost);
      stage.setPointerCapture(e.pointerId);
      let box = { x: sx, y: sy, w: 0, h: 0 };
      const mv = (ev) => {
        const cx = clamp((ev.clientX - r.left) / r.width, 0, 1), cy = clamp((ev.clientY - r.top) / r.height, 0, 1);
        box = { x: Math.min(sx, cx), y: Math.min(sy, cy), w: Math.abs(cx - sx), h: Math.abs(cy - sy) };
        Object.assign(ghost.style, { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` });
      };
      const up = () => {
        stage.removeEventListener('pointermove', mv); stage.removeEventListener('pointerup', up); stage.removeEventListener('pointercancel', up);
        ghost.remove();
        if (box.w > 0.015 && box.h > 0.015) {
          const id = `m${uid().slice(-6)}`;
          d.masks.push({ id, ...box, label: '' });
          selected = id;
          paintMasks();
          $(`input[data-mask-id="${id}"]`, labelList)?.focus({ preventScroll: true });
        }
      };
      stage.addEventListener('pointermove', mv);
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
    });
    requestAnimationFrame(paintMasks);
    return [
      field('Frage', textInput(d.prompt, (v) => { d.prompt = v; }, { placeholder: 'Was ist unter dem markierten Bereich?' })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Bereiche einzeichnen'), stage,
        h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: async () => { const f = await pickFile('image/*'); if (f) { d.image = await compressImage(f, 1600); d.masks = []; rerender(); } } }, Icons.get('image'), 'Anderes Bild'))),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Beschriftungen – jeder Bereich wird eine eigene Karte'), labelList),
      field('Erklärung (optional)', textArea(d.note, (v) => { d.note = v; }, { placeholder: 'optional' })),
    ];
  },
};

function openEditor({ cardId = null, folderId = null, type = null, onSaved = null } = {}) {
  const editing = cardId ? State.cards.get(cardId) : null;
  if (cardId && !editing) { toast('Diese Karte gibt es nicht mehr.', 'warn'); return; }
  let curType = editing ? editing.type : type || State.settings.lastType || 'basic';
  let target = editing ? editing.folderId : folderId;
  const drafts = {};
  drafts[curType] = editing ? deepClone({ ...editing.data, ...(editing.type === 'occlusion' ? {} : {}) }) : emptyDraft(curType);
  if (editing && editing.type === 'occlusion') delete drafts[curType].target;

  const typePicker = h('div', { class: 'type-picker', role: 'radiogroup', 'aria-label': 'Kartentyp' });
  const formHost = h('div', { class: 'form editor-form' });
  const preview = h('div', { class: 'editor-preview', hidden: true });
  const folderLabel = h('strong', {});
  const paintFolder = () => { folderLabel.textContent = target ? Store.folderPathString(target) : 'Kein Ordner gewählt'; };

  const switchType = (t) => {
    if (t === curType) return;
    const from = drafts[curType];
    if (!drafts[t]) {
      drafts[t] = emptyDraft(t);
      const mainText = from[TYPE_MAIN_FIELD[curType]];
      if (mainText && mainText !== emptyDraft(curType)[TYPE_MAIN_FIELD[curType]]) drafts[t][TYPE_MAIN_FIELD[t]] = mainText;
      if (t === 'typing' && from.back) drafts[t].answer = plainText(from.back);
      if (t === 'basic' && (from.answer || from.back)) drafts[t].back = from.answer || from.back;
    }
    curType = t;
    State.settings.lastType = t; Store.saveSettings();
    paintTypes(); render();
  };
  const paintTypes = () => {
    clear(typePicker);
    TYPE_ORDER.forEach((t) => typePicker.appendChild(h('button', {
      type: 'button', class: `type-opt ${t === curType ? 'is-selected' : ''}`, role: 'radio', 'aria-checked': String(t === curType), title: CardTypes[t].desc,
      onClick: () => switchType(t), disabled: !!editing && t !== curType,
    }, Icons.get(CardTypes[t].icon), h('span', {}, CardTypes[t].label))));
  };
  const render = (focusKey) => {
    clear(formHost);
    appendKids(formHost, [EditorForms[curType](drafts[curType], render, !editing)]);
    preview.hidden = true;
    if (focusKey) requestAnimationFrame(() => $(`[data-focus-key="${focusKey}"]`, formHost)?.focus());
  };
  const showPreview = () => {
    const def = CardTypes[curType];
    const data = def.normalize(drafts[curType]);
    const err = def.validate(data);
    if (err) { toast(err, 'warn'); return; }
    clear(preview);
    const fake = { id: 'preview', type: curType, data: curType === 'occlusion' ? { ...data, target: data.masks[0]?.id } : data, srs: FSRS.newState() };
    const ctl = def.study(fake, { done: () => {} });
    preview.append(h('div', { class: 'preview-label muted small' }, 'Vorschau – so sieht die Karte beim Lernen aus'), h('div', { class: 'study-card index-card preview-card' }, ctl.el));
    preview.hidden = false;
    preview.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  };

  const save = async (andNext) => {
    if (!target) {
      const r = await folderPickerDialog({ title: 'In welchen Ordner?', allowRoot: false, ok: 'Übernehmen' });
      if (!r) return false;
      target = r.id; paintFolder();
    }
    try {
      if (editing) {
        await Store.updateCard(editing.id, drafts[curType]);
        if (editing.folderId !== target) await Store.moveCards([editing.id], target);
        toast('Karte gespeichert.', 'ok');
      } else {
        const created = await Store.createCards(curType, target, drafts[curType]);
        toast(created.length > 1 ? `${created.length} Karten erstellt.` : 'Karte erstellt.', 'ok');
      }
    } catch (e) { toast(e.message, 'warn', { duration: 5000 }); return false; }
    onSaved && onSaved();
    if (andNext) {
      const keep = curType === 'occlusion' ? {} : {};
      drafts[curType] = { ...emptyDraft(curType), ...keep };
      render();
      requestAnimationFrame(() => $('#ed-main', formHost)?.focus() || $('input, textarea', formHost)?.focus());
      return false;
    }
    if (!Study.active) route();
    return true;
  };

  paintTypes(); paintFolder(); render();
  const body = h('div', { class: 'editor' },
    editing ? null : typePicker,
    h('div', { class: 'target-line' }, Icons.get('folder'), folderLabel,
      h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: async () => { const r = await folderPickerDialog({ title: 'Ordner wählen', allowRoot: false, ok: 'Übernehmen', current: target }); if (r) { target = r.id; paintFolder(); } } }, 'Ändern')),
    formHost,
    h('p', { class: 'muted small format-help' }, 'Formatieren: **fett**, *kursiv*, ==markiert==, Formeln mit $a^2+b^2=c^2$ oder $$\\frac{a}{b}$$'),
    preview);
  const modal = Modal.open({
    title: editing ? 'Karte bearbeiten' : 'Neue Karte', size: 'lg', className: 'editor-modal', body,
    actions: [
      editing ? { label: 'Löschen', kind: 'danger-quiet', icon: 'trash', onClick: async () => {
        const group = Store.groupOf(editing);
        const ok = await confirmDialog({ title: 'Karte löschen?', danger: true, ok: 'Löschen', text: group.length > 1 ? `Diese Bildkarte gehört zu einer Gruppe mit ${group.length} Bereichen – alle werden gelöscht.` : 'Die Karte und ihr Lernfortschritt werden endgültig gelöscht.' });
        if (!ok) return false;
        await Store.deleteCards([editing.id]); toast('Karte gelöscht.', 'ok'); onSaved && onSaved(); if (!Study.active) route(); return true;
      } } : null,
      { label: 'Vorschau', icon: 'eye', onClick: () => { showPreview(); return false; } },
      editing ? null : { label: 'Speichern & nächste', onClick: () => save(true) },
      { label: 'Speichern', kind: 'primary', icon: 'check', onClick: () => save(false) },
    ].filter(Boolean),
  });
  modal.el.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(!editing).then((r) => r && modal.close(true)); }
  });
  requestAnimationFrame(() => $('#ed-main', formHost)?.focus());
}
