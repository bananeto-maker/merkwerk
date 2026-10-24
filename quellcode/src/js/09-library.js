/* Bibliothek: Ordner verwalten, Karten auflisten, suchen, verschieben, importieren & exportieren */
const FOLDER_EMOJIS = ['📁', '📘', '📗', '📕', '📙', '🧬', '🧪', '⚗️', '🧮', '📐', '🌍', '🗺️', '🏛️', '⚖️', '💼', '💊', '🫀', '🧠', '🗣️', '🇬🇧', '🇫🇷', '🇪🇸', '🇮🇹', '💻', '🎵', '🎨', '⚽', '⭐'];
const FOLDER_COLORS = ['#2F5BEA', '#179C6B', '#D98A1C', '#D6404A', '#7A5BD6', '#0E9AA7', '#5A6782'];
const TTS_LANGS = [['de-DE', 'Deutsch'], ['de-AT', 'Deutsch (Österreich)'], ['en-GB', 'Englisch (UK)'], ['en-US', 'Englisch (US)'], ['fr-FR', 'Französisch'], ['es-ES', 'Spanisch'], ['it-IT', 'Italienisch'], ['la', 'Latein'], ['pt-PT', 'Portugiesisch'], ['nl-NL', 'Niederländisch'], ['ru-RU', 'Russisch'], ['ja-JP', 'Japanisch'], ['zh-CN', 'Chinesisch']];

const Lib = { selectMode: false, selected: new Set(), query: '', shown: 60, folderId: null };

function maturityLabel(card) {
  if (card.leech) return ['Problemkarte', 'st-leech'];
  const m = FSRS.maturity(card.srs);
  if (m === 'new') return ['Neu', 'st-new'];
  if (Store.isDue(card)) return ['Fällig', 'st-due'];
  if (m === 'mature') return ['Sicher', 'st-mature'];
  return ['Lernend', 'st-learning'];
}

function cardRow(card, { onEdit, selectable = false, selected = false, onToggle, showFolder = false } = {}) {
  const def = CardTypes[card.type];
  const [q, a] = def.summary(card.data);
  const [stLabel, stCls] = maturityLabel(card);
  const due = card.srs.state !== 'new' && !Store.isDue(card) ? `in ${formatInterval(card.srs.due - Date.now())}` : '';
  const row = h('div', { class: `card-row ${selected ? 'is-selected' : ''}`, role: 'button', tabindex: '0', dataset: { id: card.id } },
    selectable ? h('input', { type: 'checkbox', class: 'row-check', checked: selected, 'aria-label': 'Karte auswählen', onClick: (e) => e.stopPropagation(), onChange: () => onToggle && onToggle() }) : null,
    h('span', { class: 'type-icon', title: def.label }, Icons.get(def.icon)),
    h('div', { class: 'card-row-main' },
      h('div', { class: 'card-row-q' }, q.length > 140 ? q.slice(0, 140) + '…' : q),
      h('div', { class: 'card-row-a muted' }, a.length > 120 ? a.slice(0, 120) + '…' : a),
      showFolder ? h('div', { class: 'card-row-folder muted small' }, Icons.get('folder'), Store.folderPathString(card.folderId)) : null),
    h('div', { class: 'card-row-side' }, h('span', { class: `status ${stCls}` }, stLabel), due ? h('span', { class: 'muted small' }, due) : null));
  const activate = () => (selectable ? onToggle && onToggle() : onEdit ? onEdit() : openEditor({ cardId: card.id }));
  row.addEventListener('click', activate);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  return row;
}

function folderStats(folderId) {
  const cards = Store.cardsIn(folderId);
  let fresh = 0, mature = 0, due = 0;
  const now = Date.now(), end = endOfToday();
  for (const c of cards) {
    const m = FSRS.maturity(c.srs);
    if (m === 'new') fresh++; else if (m === 'mature') mature++;
    if (c.srs.state !== 'new' && c.srs.due <= end) due++;
  }
  return { total: cards.length, fresh, mature, learning: cards.length - fresh - mature, due, now };
}

function folderTile(f) {
  const st = folderStats(f.id);
  const subs = Store.childFolders(f.id).length;
  const tile = h('div', { class: 'folder-tile', role: 'link', tabindex: '0', style: f.color ? { '--folder-color': f.color } : null, dataset: { id: f.id } },
    h('div', { class: 'folder-tab' }),
    h('div', { class: 'folder-top' }, h('span', { class: 'folder-emoji' }, f.emoji || '📁'), st.due ? h('span', { class: 'due-badge', title: 'heute fällig' }, String(st.due)) : null),
    h('h3', { class: 'folder-name' }, f.name),
    h('div', { class: 'muted small' }, plural(st.total, 'Karte', 'Karten'), subs ? ` · ${plural(subs, 'Unterordner', 'Unterordner')}` : '', f.examDate && f.examDate >= dayKey() ? ` · Prüfung ${fmtDate(f.examDate)}` : ''),
    h('div', { class: 'stackbar', title: `${st.mature} sicher · ${st.learning} lernend · ${st.fresh} neu` },
      h('span', { class: 'sb-mature', style: { flexGrow: st.mature } }), h('span', { class: 'sb-learning', style: { flexGrow: st.learning } }), h('span', { class: 'sb-new', style: { flexGrow: st.fresh || (st.total ? 0 : 1) } })));
  const open = () => go(`library/${f.id}`);
  tile.addEventListener('click', open);
  tile.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  return tile;
}

function renderLibrary(main, folderId) {
  if (folderId && !State.folders.has(folderId)) { go('library'); return; }
  if (Lib.folderId !== folderId) { Lib.folderId = folderId; Lib.selectMode = false; Lib.selected.clear(); Lib.shown = 60; Lib.query = ''; }
  clear(main);
  const folder = folderId ? State.folders.get(folderId) : null;
  const path = folderId ? Store.folderPath(folderId) : [];

  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Ordnerpfad' },
    h('a', { href: '#/library' }, 'Alle Ordner'),
    path.map((f, i) => [h('span', { class: 'crumb-sep' }, '/'), i === path.length - 1 ? h('span', { 'aria-current': 'page' }, f.name) : h('a', { href: `#/library/${f.id}` }, f.name)]));

  const st = folderStats(folderId);
  const headActions = h('div', { class: 'btn-row' },
    st.total ? h('button', { class: 'btn btn-primary', type: 'button', onClick: () => startStudy({ folderId, mode: 'learn' }) }, Icons.get('play'), 'Lernen') : null,
    folderId ? h('button', { class: 'btn', type: 'button', id: 'new-card', onClick: () => openEditor({ folderId }) }, Icons.get('plus'), 'Neue Karte') : null,
    h('button', { class: 'btn', type: 'button', id: 'new-folder', onClick: () => newFolder(folderId) }, Icons.get('folderPlus'), folderId ? 'Unterordner' : 'Neuer Ordner'),
    menuButton(folderId ? [
      { icon: 'edit', label: 'Ordner bearbeiten', onClick: () => editFolderDialog(folderId) },
      { icon: 'move', label: 'Ordner verschieben', onClick: () => moveFolderDialog(folderId) },
      { icon: 'upload', label: 'Hierher importieren', onClick: () => openImportDialog(folderId) },
      { icon: 'download', label: 'Ordner exportieren', onClick: () => exportDeck(folderId) },
      st.total ? { icon: 'clock', label: 'Zeit-Challenge', onClick: () => startStudy({ folderId, mode: 'challenge' }) } : null,
      st.total ? { icon: 'sword', label: 'Bossangriff', onClick: () => startStudy({ folderId, mode: 'boss' }) } : null,
      st.total ? { icon: 'rotate', label: 'Freies Üben', onClick: () => startStudy({ folderId, mode: 'cram' }) } : null,
      st.total ? { icon: 'undo', label: 'Lernfortschritt zurücksetzen', onClick: () => resetFolderProgress(folderId) } : null,
      { icon: 'trash', label: 'Ordner löschen', danger: true, onClick: () => deleteFolderFlow(folderId) },
    ] : [
      { icon: 'upload', label: 'Importieren', onClick: () => openImportDialog(null) },
      State.cards.size ? { icon: 'download', label: 'Alles als Stapel exportieren', onClick: () => exportDeck(null) } : null,
      { icon: 'sparkle', label: 'Beispielstapel laden', onClick: loadDemoDeck },
    ]));

  const head = h('header', { class: 'page-head lib-head', style: folder?.color ? { '--folder-color': folder.color } : null },
    h('div', {}, crumbs, h('h1', {}, folder ? `${folder.emoji || '📁'} ${folder.name}` : 'Ordner'),
      h('p', { class: 'muted' }, plural(st.total, 'Karte', 'Karten'), st.due ? ` · ${st.due} heute fällig` : '', folder?.examDate && folder.examDate >= dayKey() ? ` · Prüfung am ${fmtDate(folder.examDate)}` : '')),
    headActions);

  const searchInput = h('input', { class: 'input search-input', type: 'search', placeholder: folder ? `In „${folder.name}“ suchen …` : 'Alle Karten durchsuchen …', value: Lib.query, 'aria-label': 'Karten suchen' });
  const searchBox = h('div', { class: 'search-box' }, Icons.get('search'), searchInput);
  const body = h('div', { class: 'lib-body' });
  searchInput.addEventListener('input', debounce(() => { Lib.query = searchInput.value; Lib.shown = 60; renderLibBody(body, folderId); }, 150));

  main.append(head, searchBox, body);
  renderLibBody(body, folderId);
}

function renderLibBody(body, folderId) {
  clear(body);
  if (Lib.query.trim()) {
    const res = Store.search(Lib.query, folderId);
    body.append(h('h2', { class: 'section-title' }, `${plural(res.length, 'Treffer', 'Treffer')}`),
      res.length ? h('div', { class: 'card-list' }, res.slice(0, 200).map((c) => cardRow(c, { showFolder: true }))) : emptyState('search', 'Nichts gefunden', 'Probier ein anderes Stichwort.'));
    return;
  }
  const subs = Store.childFolders(folderId);
  if (subs.length) body.append(h('section', { class: 'section' }, folderId ? h('h2', { class: 'section-title' }, 'Unterordner') : null, h('div', { class: 'folder-grid' }, subs.map(folderTile))));
  if (!folderId) {
    if (!subs.length) body.append(emptyState('folder', 'Noch keine Ordner', 'Ordner halten deine Karten nach Fach oder Thema zusammen. Unterordner sind möglich.',
      h('div', { class: 'btn-row center' }, h('button', { class: 'btn btn-primary', type: 'button', onClick: () => newFolder(null) }, Icons.get('folderPlus'), 'Ordner erstellen'),
        h('button', { class: 'btn', type: 'button', onClick: () => openImportDialog(null) }, Icons.get('upload'), 'Importieren'))));
    return;
  }
  const cards = Store.cardsIn(folderId, false).sort((a, b) => b.created - a.created);
  const visible = cards;
  const sec = h('section', { class: 'section' });
  const titleRow = h('div', { class: 'section-row' }, h('h2', { class: 'section-title' }, `Karten in diesem Ordner (${cards.length})`),
    cards.length ? h('button', { class: `btn btn-sm ${Lib.selectMode ? 'btn-primary' : 'btn-quiet'}`, type: 'button', onClick: () => { Lib.selectMode = !Lib.selectMode; Lib.selected.clear(); renderLibBody(body, folderId); } }, Lib.selectMode ? 'Fertig' : 'Auswählen') : null);
  sec.appendChild(titleRow);
  if (!cards.length) {
    sec.appendChild(emptyState('plus', 'Noch keine Karten hier', 'Schreib deine erste Karte oder importiere einen Stapel in diesen Ordner.',
      h('div', { class: 'btn-row center' }, h('button', { class: 'btn btn-primary', type: 'button', onClick: () => openEditor({ folderId }) }, Icons.get('plus'), 'Neue Karte'),
        h('button', { class: 'btn', type: 'button', onClick: () => openImportDialog(folderId) }, Icons.get('upload'), 'Importieren'))));
  } else {
    if (Lib.selectMode) {
      const n = Lib.selected.size;
      sec.appendChild(h('div', { class: 'bulk-bar' },
        h('label', { class: 'check-all' }, h('input', { type: 'checkbox', checked: n === visible.length && n > 0, onChange: (e) => { Lib.selected = new Set(e.target.checked ? visible.map((c) => c.id) : []); renderLibBody(body, folderId); } }), `${n} ausgewählt`),
        h('button', { class: 'btn btn-sm', type: 'button', disabled: !n, onClick: async () => {
          const r = await folderPickerDialog({ title: `${plural(n, 'Karte', 'Karten')} verschieben`, allowRoot: false, ok: 'Verschieben' });
          if (!r) return;
          await Store.moveCards([...Lib.selected], r.id);
          toast(`${plural(n, 'Karte', 'Karten')} verschoben.`, 'ok'); Lib.selected.clear(); renderLibBody(body, folderId);
        } }, Icons.get('move'), 'Verschieben'),
        h('button', { class: 'btn btn-sm', type: 'button', disabled: !n, onClick: async () => {
          if (!(await confirmDialog({ title: 'Fortschritt zurücksetzen?', text: `Die ${plural(n, 'Karte', 'Karten')} gelten danach wieder als neu.`, ok: 'Zurücksetzen' }))) return;
          await Store.resetProgress([...Lib.selected]); toast('Fortschritt zurückgesetzt.', 'ok'); renderLibBody(body, folderId);
        } }, Icons.get('undo'), 'Zurücksetzen'),
        h('button', { class: 'btn btn-sm btn-danger', type: 'button', disabled: !n, onClick: async () => {
          if (!(await confirmDialog({ title: 'Karten löschen?', text: `${plural(n, 'Karte wird', 'Karten werden')} endgültig gelöscht.`, ok: 'Löschen', danger: true }))) return;
          await Store.deleteCards([...Lib.selected]); toast('Gelöscht.', 'ok'); Lib.selected.clear(); renderLibBody(body, folderId);
        } }, Icons.get('trash'), 'Löschen')));
    }
    const list = h('div', { class: 'card-list' }, visible.slice(0, Lib.shown).map((c) => cardRow(c, {
      selectable: Lib.selectMode, selected: Lib.selected.has(c.id),
      onToggle: () => { Lib.selected.has(c.id) ? Lib.selected.delete(c.id) : Lib.selected.add(c.id); renderLibBody(body, folderId); },
    })));
    sec.appendChild(list);
    if (visible.length > Lib.shown) sec.appendChild(h('div', { class: 'center-row' }, h('button', { class: 'btn btn-quiet', type: 'button', onClick: () => { Lib.shown += 100; renderLibBody(body, folderId); } }, `${visible.length - Lib.shown} weitere anzeigen`)));
  }
  body.appendChild(sec);
}

/* ---------- Ordner-Aktionen ---------- */
async function newFolder(parentId) {
  const name = await promptDialog({ title: parentId ? 'Neuer Unterordner' : 'Neuer Ordner', label: 'Name', placeholder: 'z. B. Biologie', ok: 'Erstellen' });
  if (!name) return;
  const parent = parentId ? State.folders.get(parentId) : null;
  const f = await Store.createFolder({ name, parentId, emoji: parent?.emoji || '📁', color: parent?.color || null });
  toast(`Ordner „${f.name}“ erstellt.`, 'ok');
  go(`library/${f.id}`);
}

function editFolderDialog(id) {
  const f = State.folders.get(id);
  let emoji = f.emoji || '📁', color = f.color || null;
  const name = h('input', { class: 'input', type: 'text', value: f.name, 'aria-label': 'Name' });
  const emojiGrid = h('div', { class: 'emoji-grid', role: 'radiogroup', 'aria-label': 'Symbol' });
  const paintEmoji = () => { clear(emojiGrid); FOLDER_EMOJIS.forEach((e) => emojiGrid.appendChild(h('button', { type: 'button', class: `emoji-opt ${e === emoji ? 'is-selected' : ''}`, role: 'radio', 'aria-checked': String(e === emoji), onClick: () => { emoji = e; paintEmoji(); } }, e))); };
  paintEmoji();
  const colorRow = h('div', { class: 'color-row', role: 'radiogroup', 'aria-label': 'Farbe' });
  const paintColor = () => {
    clear(colorRow);
    colorRow.appendChild(h('button', { type: 'button', class: `color-opt none ${!color ? 'is-selected' : ''}`, 'aria-label': 'Keine Farbe', onClick: () => { color = null; paintColor(); } }, Icons.get('x')));
    FOLDER_COLORS.forEach((c) => colorRow.appendChild(h('button', { type: 'button', class: `color-opt ${c === color ? 'is-selected' : ''}`, style: { background: c }, 'aria-label': `Farbe ${c}`, onClick: () => { color = c; paintColor(); } })));
  };
  paintColor();
  const exam = h('input', { class: 'input', type: 'date', value: f.examDate || '', 'aria-label': 'Prüfungsdatum' });
  const lang = h('select', { class: 'input', 'aria-label': 'Vorlese-Sprache' }, h('option', { value: '' }, 'Wie in den Einstellungen'), TTS_LANGS.map(([v, l]) => h('option', { value: v, selected: f.lang === v }, l)));
  Modal.open({
    title: 'Ordner bearbeiten',
    body: h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Name'), name),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Symbol'), emojiGrid),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Farbe'), colorRow),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Prüfungsdatum (optional)'), exam,
        h('span', { class: 'field-help' }, 'Bis zu diesem Tag plant die App die Wiederholungen so, dass alles rechtzeitig sitzt. Gilt auch für Unterordner.')),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Vorlese-Sprache'), lang,
        h('span', { class: 'field-help' }, 'Für Vokabeln: In welcher Sprache sollen die Karten vorgelesen werden?'))),
    actions: [{ label: 'Abbrechen' }, {
      label: 'Speichern', kind: 'primary', onClick: async () => {
        if (!name.value.trim()) { name.focus(); return false; }
        await Store.updateFolder(id, { name: name.value.trim(), emoji, color, examDate: exam.value || null, lang: lang.value || null });
        toast('Ordner gespeichert.', 'ok');
        route();
      },
    }],
  });
}
async function moveFolderDialog(id) {
  const f = State.folders.get(id);
  const r = await folderPickerDialog({ title: `„${f.name}“ verschieben nach …`, exclude: Store.descendantIds(id), ok: 'Verschieben' });
  if (!r) return;
  await Store.moveFolder(id, r.root ? null : r.id);
  toast('Ordner verschoben.', 'ok');
  route();
}
async function deleteFolderFlow(id) {
  const f = State.folders.get(id);
  const n = Store.cardsIn(id).length, subs = Store.descendantIds(id).length - 1;
  const ok = await confirmDialog({
    title: `„${f.name}“ löschen?`, danger: true, ok: 'Endgültig löschen',
    text: `Dabei werden ${plural(n, 'Karte', 'Karten')}${subs ? ` und ${plural(subs, 'Unterordner', 'Unterordner')}` : ''} samt Lernfortschritt gelöscht. Tipp: Exportiere den Ordner vorher, wenn du ihn vielleicht noch brauchst.`,
  });
  if (!ok) return;
  const parent = f.parentId;
  await Store.deleteFolder(id);
  toast('Ordner gelöscht.', 'ok');
  go(parent ? `library/${parent}` : 'library');
}
async function resetFolderProgress(id) {
  const cards = Store.cardsIn(id);
  if (!(await confirmDialog({ title: 'Lernfortschritt zurücksetzen?', text: `Alle ${plural(cards.length, 'Karte', 'Karten')} in diesem Ordner gelten danach wieder als neu.`, ok: 'Zurücksetzen', danger: true }))) return;
  await Store.resetProgress(cards.map((c) => c.id));
  toast('Fortschritt zurückgesetzt.', 'ok');
  route();
}

/* ---------- Export ---------- */
async function shareOrDownload(filename, text) {
  try {
    if (isTouch() && navigator.canShare) {
      const file = new File([text], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        const choice = await new Promise((res) => Modal.open({
          title: 'Export bereit', size: 'sm', body: h('p', {}, 'Möchtest du die Datei speichern oder direkt teilen (z. B. per Mail oder in die Cloud)?'),
          onClose: (r) => res(r), actions: [{ label: 'Speichern', value: 'save' }, { label: 'Teilen', kind: 'primary', value: 'share' }],
        }));
        if (choice === 'share') { await navigator.share({ files: [file], title: filename }); return; }
        if (!choice) return;
      }
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  downloadText(filename, text);
  toast(`Gespeichert als ${filename}`, 'ok');
}
async function exportDeck(folderId) {
  const data = IO.exportDeck(folderId);
  const name = folderId ? State.folders.get(folderId).name : 'alle-ordner';
  await shareOrDownload(IO.fileName(name, 'stapel'), JSON.stringify(data, null, 1));
}
async function exportBackup() {
  const data = await IO.exportBackup();
  await shareOrDownload(IO.fileName('merkwerk', 'sicherung'), JSON.stringify(data));
}

/* ---------- Import ---------- */
function openImportDialog(targetFolderId) {
  let target = targetFolderId;
  let tab = 'file';
  const targetLabel = h('strong', {});
  const paintTarget = () => { targetLabel.textContent = target ? Store.folderPathString(target) : 'Oberste Ebene (Ordner laut Datei)'; };
  paintTarget();
  const fileInput = h('input', { type: 'file', accept: '.json,application/json,.txt,.csv,text/plain', class: 'visually-hidden', id: 'import-file' });
  const fileName = h('span', { class: 'muted' }, 'Keine Datei gewählt');
  let fileText = null;
  const drop = h('label', { class: 'dropzone', for: 'import-file' }, Icons.get('upload'), h('span', {}, h('strong', {}, 'Datei wählen'), ' oder hierher ziehen'), fileName, fileInput);
  const handleFile = async (file) => {
    if (!file) return;
    fileText = await readFileAsText(file);
    fileName.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    drop.classList.add('has-file');
  };
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); handleFile(e.dataTransfer.files[0]); });
  const textArea = h('textarea', { class: 'input', rows: '8', placeholder: 'JSON einfügen – oder eine Karte pro Zeile:\nHauptstadt von Frankreich ; Paris\nmitochondrion ; Mitochondrium', 'aria-label': 'Text zum Importieren' });
  const panes = { file: h('div', { class: 'tab-pane' }, drop), text: h('div', { class: 'tab-pane', hidden: true }, textArea, h('p', { class: 'field-help' }, 'Erlaubt: das Merkwerk-JSON-Format oder einfache Zeilen „Frage ; Antwort“ (auch Tabulator oder „ :: “ als Trenner).')) };
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['file', 'Datei'], ['text', 'Text einfügen']].map(([k, l]) => h('button', {
    class: `tab ${k === tab ? 'is-active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(k === tab),
    onClick: (e) => { tab = k; $$('.tab', tabs).forEach((b) => { b.classList.toggle('is-active', b === e.currentTarget); b.setAttribute('aria-selected', String(b === e.currentTarget)); }); panes.file.hidden = k !== 'file'; panes.text.hidden = k !== 'text'; },
  }, l)));
  Modal.open({
    title: 'Karten importieren', size: 'md',
    body: h('div', { class: 'form' }, tabs, panes.file, panes.text,
      h('div', { class: 'field target-row' }, h('span', { class: 'field-label' }, 'Importieren nach'), h('div', { class: 'target-line' }, targetLabel,
        h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onClick: async () => { const r = await folderPickerDialog({ title: 'Ziel wählen', ok: 'Übernehmen' }); if (r) { target = r.root ? null : r.id; paintTarget(); } } }, 'Ändern')))),
    actions: [{ label: 'Abbrechen' }, {
      label: 'Importieren', kind: 'primary', icon: 'upload', onClick: async () => {
        const raw = tab === 'file' ? fileText : textArea.value;
        if (!raw || !raw.trim()) { toast(tab === 'file' ? 'Bitte wähle zuerst eine Datei.' : 'Bitte füge Text ein.', 'warn'); return false; }
        return runImport(raw, target);
      },
    }],
  });
}

async function runImport(raw, target) {
  let json;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { json = IO.parse(trimmed); } catch (e) { toast(e.message, 'bad', { duration: 7000 }); return false; }
  } else {
    const { cards, errors } = IO.parseText(trimmed);
    if (!cards.length) { toast(errors[0] || 'Keine Karten erkannt.', 'bad', { duration: 6000 }); return false; }
    json = { cards };
    if (!target) json.title = 'Importiert';
  }
  if (json.kind === 'backup') {
    const ok = await confirmDialog({ title: 'Sicherung wiederherstellen?', danger: true, ok: 'Wiederherstellen',
      text: `Diese Datei ist eine vollständige Sicherung (${plural(json.cards.length, 'Karte', 'Karten')}, ${plural(json.folders.length, 'Ordner', 'Ordner')}). Beim Wiederherstellen werden ALLE aktuellen Daten auf diesem Gerät ersetzt.` });
    if (!ok) return false;
    const r = await IO.restoreBackup(json);
    applyTheme();
    toast(`Sicherung wiederhergestellt: ${plural(r.cards, 'Karte', 'Karten')}.`, 'ok');
    go('home');
    return true;
  }
  const report = await IO.importDeck(json, target);
  showImportReport(report);
  if (report.cards) route();
  return true;
}

function showImportReport(r) {
  const ok = r.cards > 0;
  Modal.open({
    title: ok ? 'Import abgeschlossen' : 'Nichts importiert', size: 'md',
    body: h('div', {},
      h('p', { class: 'report-big' }, ok ? `${plural(r.cards, 'Karte', 'Karten')} importiert` : 'Es konnte keine Karte importiert werden.', r.folders ? h('span', { class: 'muted' }, ` · ${plural(r.folders, 'neuer Ordner', 'neue Ordner')}`) : null),
      r.skipped.length ? h('div', { class: 'report-list' }, h('p', {}, h('strong', {}, `${plural(r.skipped.length, 'Eintrag wurde', 'Einträge wurden')} übersprungen:`)),
        h('ul', {}, r.skipped.slice(0, 30).map((s) => h('li', {}, `Karte ${s.index}: ${s.reason}`)))) : null,
      r.warnings.length ? h('div', { class: 'report-list' }, h('ul', {}, Array.from(new Set(r.warnings)).slice(0, 10).map((w) => h('li', {}, w)))) : null),
    actions: [{ label: 'OK', kind: 'primary' }],
  });
  if (ok) Sound.good();
}

async function loadDemoDeck() {
  const report = await IO.importDeck(demoDeck(), null);
  toast(`Beispielstapel geladen: ${plural(report.cards, 'Karte', 'Karten')} in allen 8 Kartentypen.`, 'ok');
  const f = Store.childFolders(null).find((x) => x.name === 'Beispielstapel');
  go(f ? `library/${f.id}` : 'library');
}
