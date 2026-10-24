"""Automatische End-to-End-Tests für Merkwerk (Playwright, Chromium).
Aufruf:  python3 tests/test_app.py   (die App muss unter http://localhost:8765/ laufen)
Prüft alle Erfolgskriterien: 8 Kartentypen erstellen/lernen/bewerten, Speicherung nach Neuladen,
Export → Import auf "anderem Gerät" (frischer Browser), Tastatur & Wischgesten, keine Konsolenfehler."""
import json, os, sys, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('MERKWERK_URL', 'http://localhost:8765/index.html')
HERE = Path(__file__).parent
IMG = str(HERE / 'testbild.png')
IMG_SMALL = str(HERE / 'klein.png')
OUT = Path(os.environ.get('MERKWERK_OUT', HERE / 'out'))
OUT.mkdir(exist_ok=True, parents=True)
OFFLINE_FILE = (HERE.parent / 'dist' / 'Merkwerk-Offline.html').resolve()

RESULTS, CONSOLE = [], []
DESKTOP = dict(viewport={'width': 1280, 'height': 860}, accept_downloads=True)
MOBILE = dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2, accept_downloads=True)


def test(name):
    def deco(fn):
        def run(*a, **k):
            t0 = time.time()
            try:
                fn(*a, **k)
                RESULTS.append((name, True, f'{time.time() - t0:.1f}s'))
                print(f'  ✔ {name}')
            except Exception as e:
                RESULTS.append((name, False, f'{e}'))
                print(f'  ✘ {name}: {e}')
                traceback.print_exc()
        return run
    return deco


def watch(page, label):
    page.on('console', lambda m: CONSOLE.append(f'[{label}] console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: CONSOLE.append(f'[{label}] pageerror: {e}'))
    return page


def new_page(browser, opts, label):
    ctx = browser.new_context(**opts)
    return ctx, watch(ctx.new_page(), label)


def start_fresh(page, url=BASE):
    page.goto(url)
    page.get_by_role('button', name='Leer starten').click()
    page.wait_for_timeout(250)


def state(page):
    return page.evaluate('''() => {
      const S = window.Merkwerk.State;
      const byId = (a, b) => (a.id < b.id ? -1 : 1);
      return { cards: [...S.cards.values()].sort(byId), folders: [...S.folders.values()].sort(byId), media: Object.fromEntries([...S.media].sort()), profile: S.profile };
    }''')


def logs(page):
    return page.evaluate('() => window.Merkwerk.Store.getLogs()')


def modal_btn(page, name):
    return page.locator('.overlay:not(.is-closing) .modal').last.get_by_role('button', name=name, exact=True)


def menu(page, item):
    page.get_by_role('button', name='Weitere Aktionen').first.click()
    page.locator('.menu-pop').get_by_role('menuitem', name=item).click()


def folder_id(page, name):
    return page.evaluate('(n) => [...window.Merkwerk.State.folders.values()].find(f => f.name === n)?.id', name)


def cur(page):
    return page.evaluate('''() => { const s = window.Merkwerk.Study.s; if (!s || !s.current) return null;
      return { id: s.current.id, type: s.current.shownType || s.current.type, base: s.current.type, data: s.current.data, result: s.result, mode: s.mode, summary: !!s.summary }; }''')


def wait_card_change(page, old_id, timeout=4000):
    t0 = time.time()
    while time.time() - t0 < timeout / 1000:
        if page.locator('.summary').count():
            return
        c = cur(page)
        if c and c['id'] != old_id and not c['result']:
            return
        if c and c['id'] == old_id and not c['result']:
            return  # gleiche Karte erneut (Lernschritt)
        page.wait_for_timeout(60)


def answer_with_keyboard(page, c):
    """Beantwortet die aktuelle Karte korrekt über die Tastatur."""
    t, d = c['type'], c['data']
    kb = page.keyboard
    if t == 'basic':
        kb.press(' ')
    elif t == 'occlusion':
        kb.press('Enter')
    elif t == 'typing':
        page.fill('.answer-input', d['answer'])
        page.press('.answer-input', 'Enter')
    elif t == 'mc':
        opts = page.locator('.option')
        correct = set(d['correct'])
        n = opts.count()
        for pos in range(n):
            if int(opts.nth(pos).get_attribute('data-oi')) in correct:
                kb.press(str(pos + 1))
        if len(correct) > 1:
            kb.press('Enter')
    elif t == 'match':
        left = page.locator('.match-col').nth(0).locator('.match-item')
        right = page.locator('.match-col').nth(1).locator('.match-item')
        rp = {right.nth(i).get_attribute('data-pi'): i for i in range(right.count())}
        for i in range(left.count()):
            kb.press(str(i + 1))
            kb.press('abcdefgh'[rp[left.nth(i).get_attribute('data-pi')]])
        kb.press('Enter')
    elif t == 'cloze':
        inputs = page.locator('.cloze-input')
        import re
        gaps = re.findall(r'\{\{(?:c\d+::)?([\s\S]+?)(?:::[^}]*)?\}\}', d['text'])
        for i, g in enumerate(gaps):
            inputs.nth(i).fill(g.split('|')[0].strip())
        inputs.nth(len(gaps) - 1).press('Enter')
    elif t == 'truefalse':
        kb.press('ArrowRight' if d['answer'] else 'ArrowLeft')
    elif t == 'order':
        for target in range(len(d['items'])):
            items = page.locator('.order-item')
            pos = next(p for p in range(items.count()) if int(items.nth(p).get_attribute('data-ii')) == target)
            if pos != target:
                kb.press(str(pos + 1))
                for _ in range(pos - target):
                    kb.press('ArrowUp')
        kb.press('Enter')
    try:
        page.wait_for_function('() => !!window.Merkwerk.Study.s && !!window.Merkwerk.Study.s.result', timeout=3000)
    except Exception:
        dump(page, 'antwort')
        raise


def dump(page, tag):
    info = page.evaluate('''() => { const s = window.Merkwerk.Study.s; return { cur: s && s.current && { type: s.current.shownType || s.current.type, data: s.current.data }, result: s && s.result, rating: s && s.rating, mode: s && s.mode, active: document.activeElement && (document.activeElement.className || document.activeElement.tagName), modals: document.querySelectorAll('.modal').length }; }''')
    p = OUT / f'fehler-{tag}-{int(time.time())}.png'
    page.screenshot(path=str(p))
    print('    DUMP', tag, json.dumps(info, ensure_ascii=False)[:600], p.name)


def run_learn_session_keyboard(page, rate_key=None, max_cards=80):
    """Spielt eine komplette Lernrunde per Tastatur. Gibt die Anzahl der Bewertungen und gesehene Typen zurück."""
    n, seen = 0, set()
    for _ in range(max_cards):
        if page.locator('.summary').count():
            break
        c = cur(page)
        if not c:
            page.wait_for_timeout(100); continue
        if c['summary']:
            page.wait_for_selector('.summary')
            break
        seen.add(c['type'])
        answer_with_keyboard(page, c)
        res = cur(page)['result']
        if res.get('correct') is False:
            raise AssertionError(f"Karte {c['type']} wurde trotz korrekter Eingabe als falsch gewertet: {c['data']}")
        key = rate_key or {'basic': '3', 'occlusion': 'ArrowRight'}.get(c['type'], 'Enter')
        page.keyboard.press(key)
        n += 1
        page.wait_for_function('(id) => { const s = window.Merkwerk.Study.s; return !s || s.summary || !s.result; }', arg=c['id'], timeout=4000)
        page.wait_for_timeout(30)
    return n, seen


# ---------------------------------------------------------------------------------------------
@test('Start ohne Fehler, Willkommensdialog')
def t_start(page):
    page.goto(BASE)
    expect(page.locator('.modal h2')).to_have_text('Willkommen bei Merkwerk')
    page.get_by_role('button', name='Leer starten').click()
    expect(page.locator('.onboard-card')).to_be_visible()


@test('Ordner erstellen, Unterordner, umbenennen, verschieben, löschen')
def t_folders(page):
    page.goto(BASE + '#/library')
    page.click('#new-folder'); page.keyboard.type('Biologie'); page.keyboard.press('Enter')
    expect(page.locator('h1')).to_contain_text('Biologie')
    page.click('#new-folder'); page.keyboard.type('Zelle'); page.keyboard.press('Enter')
    expect(page.locator('h1')).to_contain_text('Zelle')
    menu(page, 'Ordner bearbeiten')
    page.locator('.modal input[aria-label="Name"]').fill('Zellbiologie')
    page.locator('.modal .emoji-opt', has_text='🧬').click()
    modal_btn(page, 'Speichern').click()
    expect(page.locator('h1')).to_contain_text('Zellbiologie')
    page.goto(BASE + '#/library')
    page.click('#new-folder'); page.keyboard.type('Temp'); page.keyboard.press('Enter')
    expect(page.locator('h1')).to_contain_text('Temp')
    menu(page, 'Ordner verschieben')
    page.locator('.picker-row', has_text='Biologie').first.click()
    modal_btn(page, 'Verschieben').click()
    page.wait_for_timeout(200)
    st = state(page)
    bio = next(f for f in st['folders'] if f['name'] == 'Biologie')
    temp = next(f for f in st['folders'] if f['name'] == 'Temp')
    zelle = next(f for f in st['folders'] if f['name'] == 'Zellbiologie')
    assert temp['parentId'] == bio['id'], 'Temp wurde nicht verschoben'
    assert zelle['parentId'] == bio['id'] and zelle['emoji'] == '🧬'
    expect(page.locator('.crumbs')).to_contain_text('Biologie')
    menu(page, 'Ordner löschen')
    modal_btn(page, 'Endgültig löschen').click()
    page.wait_for_timeout(200)
    assert not any(f['name'] == 'Temp' for f in state(page)['folders']), 'Temp nicht gelöscht'
    # Ordner kann nicht in sich selbst verschoben werden
    ok = page.evaluate('(id) => window.Merkwerk.Store.canMoveFolder(id, id)', bio['id'])
    assert ok is False


@test('Alle 8 Kartentypen im Editor erstellen (inkl. Bildern)')
def t_create_cards(page):
    zid = folder_id(page, 'Zellbiologie')
    page.goto(BASE + f'#/library/{zid}')
    page.click('#new-card')
    m = page.locator('.overlay:not(.is-closing) .modal').last

    def typ(label):
        m.locator('.type-opt', has_text=label).click()

    def save_next():
        modal_btn(page, 'Speichern & nächste').click()
        page.wait_for_timeout(250)

    def upload(button):
        with page.expect_file_chooser() as fc:
            button.click()
        fc.value.set_files(IMG)
        page.wait_for_timeout(400)

    typ('Klassisch')
    m.get_by_placeholder('Frage oder Begriff').fill('Zellkern')
    m.get_by_placeholder('Antwort', exact=True).fill('enthält die **DNA**')
    upload(m.get_by_role('button', name='Bild vorne hinzufügen'))
    m.get_by_text('Auch umgekehrt abfragen').click()
    save_next()

    typ('Antwort eintippen')
    m.locator('textarea').first.fill('Wie heißt das Kraftwerk der Zelle?')
    m.get_by_placeholder('z. B. Mitochondrium').fill('Mitochondrium')
    m.get_by_placeholder('durch Komma getrennt', exact=False).fill('Mitochondrien')
    save_next()

    typ('Multiple Choice')
    m.get_by_placeholder('Frage', exact=True).fill('Wo werden Proteine gebaut? $E=mc^2$')
    m.get_by_placeholder('Antwort 1').fill('Ribosom')
    m.get_by_placeholder('Antwort 2').fill('Zellkern')
    m.get_by_placeholder('Antwort 3').fill('Vakuole')
    save_next()

    typ('Zuordnen')
    ins = m.get_by_placeholder('Begriff oder Bild')
    with page.expect_file_chooser() as fc:
        m.get_by_role('button', name='Bild verwenden').first.click()
    fc.value.set_files(IMG_SMALL)
    page.wait_for_timeout(400)
    ins = m.get_by_placeholder('Begriff oder Bild')
    ins.nth(0).fill('Ribosom'); ins.nth(1).fill('Golgi-Apparat')
    outs = m.get_by_placeholder('passende Antwort')
    outs.nth(0).fill('grünes Quadrat'); outs.nth(1).fill('Proteinsynthese'); outs.nth(2).fill('Verpackung')
    save_next()

    typ('Lückentext')
    m.locator('textarea').first.fill('Die {{Mitochondrien|Mitochondrium}} sind die Kraftwerke der {{Zelle}}.')
    save_next()

    typ('Wahr oder falsch')
    m.locator('textarea').first.fill('Bakterien haben einen Zellkern.')
    m.locator('.seg-btn', has_text='Falsch').click()
    save_next()

    typ('Reihenfolge')
    for i, t in enumerate(['Prophase', 'Metaphase', 'Anaphase']):
        m.get_by_placeholder(f'Schritt {i + 1}').fill(t)
    m.get_by_role('button', name='Element hinzufügen').click()
    m.get_by_placeholder('Schritt 4').fill('Telophase')
    save_next()

    typ('Bildbereiche abdecken')
    upload(m.get_by_role('button', name='Bild wählen'))
    for (x0, y0, x1, y1) in [(0.1, 0.1, 0.4, 0.3), (0.55, 0.5, 0.85, 0.7)]:
        m.locator('.occ-editor').scroll_into_view_if_needed()
        box = m.locator('.occ-editor').bounding_box()
        page.mouse.move(box['x'] + box['width'] * x0, box['y'] + box['height'] * y0)
        page.mouse.down()
        page.mouse.move(box['x'] + box['width'] * x1, box['y'] + box['height'] * y1, steps=6)
        page.mouse.up()
        page.wait_for_timeout(100)
    labels = m.get_by_placeholder('Was steht darunter? (Antwort)')
    assert labels.count() == 2, f'{labels.count()} Bereiche statt 2'
    labels.nth(0).fill('Kreis'); labels.nth(1).fill('Rechteck')
    modal_btn(page, 'Vorschau').click()
    expect(m.locator('.editor-preview .occ-mask')).to_have_count(2)
    modal_btn(page, 'Speichern').click()
    page.wait_for_timeout(400)

    st = state(page)
    types = {}
    for c in st['cards']:
        types[c['type']] = types.get(c['type'], 0) + 1
    assert types == {'basic': 2, 'typing': 1, 'mc': 1, 'match': 1, 'cloze': 1, 'truefalse': 1, 'order': 1, 'occlusion': 2}, types
    assert len(st['media']) >= 2, f"Bilder fehlen: {len(st['media'])}"
    basic = [c for c in st['cards'] if c['type'] == 'basic']
    assert any(c['data']['front'] == 'enthält die **DNA**' for c in basic), 'Umkehrkarte fehlt'
    expect(page.locator('.card-row')).to_have_count(10)
    page.screenshot(path=str(OUT / 'desktop-ordner.png'), full_page=True)


@test('Validierung verhindert unvollständige Karten')
def t_validation(page):
    zid = folder_id(page, 'Zellbiologie')
    page.goto(BASE + f'#/library/{zid}')
    page.click('#new-card')
    page.locator('.modal .type-opt', has_text='Klassisch').click()
    modal_btn(page, 'Speichern').click()
    expect(page.locator('.toast-warn')).to_contain_text('Vorderseite')
    page.keyboard.press('Escape')
    assert len(state(page)['cards']) == 10


@test('Lernrunde mit allen 8 Typen per Tastatur (FSRS, XP, Zusammenfassung)')
def t_study_keyboard(page):
    zid = folder_id(page, 'Zellbiologie')
    page.goto(BASE + f'#/library/{zid}')
    page.get_by_role('button', name='Lernen', exact=True).click()
    expect(page.locator('.study-card')).to_be_visible()
    page.screenshot(path=str(OUT / 'desktop-lernen.png'))
    n, seen = run_learn_session_keyboard(page)
    expect(page.locator('.summary')).to_be_visible()
    page.screenshot(path=str(OUT / 'desktop-zusammenfassung.png'))
    assert {'basic', 'typing', 'mc', 'match', 'cloze', 'truefalse', 'order', 'occlusion'} <= seen, seen
    st = state(page)
    lg = logs(page)
    assert len(lg) == n, f'{len(lg)} Protokolleinträge, {n} Bewertungen'
    assert all(c['srs']['state'] == 'review' for c in st['cards']), [c['srs']['state'] for c in st['cards']]
    assert all(c['srs']['due'] > time.time() * 1000 + 20 * 3600e3 for c in st['cards']), 'Fälligkeit nicht in der Zukunft'
    assert st['profile']['totals']['reviews'] == n and st['profile']['xp'] > 0
    page.get_by_role('button', name='Fertig').click()
    expect(page.locator('h1')).to_contain_text('Zellbiologie')


@test('Daten bleiben nach Neuladen erhalten')
def t_persist(page):
    before = state(page)
    page.reload()
    page.wait_for_function('() => !!window.Merkwerk')
    after = state(page)
    assert json.dumps(before, sort_keys=True) == json.dumps(after, sort_keys=True), 'Daten unterscheiden sich nach Neuladen'


@test('Karte bearbeiten, Problemkarte wird entschärft, Karte löschen')
def t_edit(page):
    st = state(page)
    tf = next(c for c in st['cards'] if c['type'] == 'truefalse')
    page.evaluate('(id) => { const c = window.Merkwerk.State.cards.get(id); c.leech = true; }', tf['id'])
    page.evaluate('(id) => window.Merkwerk.Store.updateCard(id, { statement: "Bakterien haben keinen echten Zellkern.", answer: true })', tf['id'])
    c = next(c for c in state(page)['cards'] if c['id'] == tf['id'])
    assert c['data']['statement'].startswith('Bakterien haben keinen') and c['leech'] is False
    zid = folder_id(page, 'Zellbiologie')
    page.goto(BASE + '#/home')
    page.goto(BASE + f'#/library/{zid}')
    page.locator('.card-row', has_text='Bakterien haben keinen').click()
    m = page.locator('.overlay:not(.is-closing) .modal').last
    m.locator('textarea').first.fill('Bakterien sind Prokaryoten.')
    modal_btn(page, 'Speichern').click()
    expect(page.locator('.card-row', has_text='Bakterien sind Prokaryoten')).to_be_visible()
    # Suche
    page.fill('.search-input', 'prokaryot')
    expect(page.locator('.card-row')).to_have_count(1)
    page.fill('.search-input', '')


@test('Sicherung exportieren → auf frischem Gerät importieren (1:1 inkl. Bildern & Fortschritt)')
def t_backup(browser, page):
    page.goto(BASE + '#/settings')
    with page.expect_download() as dl:
        page.get_by_role('button', name='Sicherung speichern').click()
    path = OUT / 'sicherung.json'
    dl.value.save_as(path)
    original = state(page)
    ctx2, p2 = new_page(browser, DESKTOP, 'Gerät 2')
    start_fresh(p2)
    p2.goto(BASE + '#/settings')
    p2.get_by_role('button', name='Datei importieren').click()
    p2.set_input_files('#import-file', str(path))
    modal_btn(p2, 'Importieren').click()
    modal_btn(p2, 'Wiederherstellen').click()
    p2.wait_for_timeout(500)
    restored = state(p2)
    for key in ('cards', 'folders', 'media'):
        a = json.dumps(sorted(original[key], key=lambda x: x['id']) if isinstance(original[key], list) else original[key], sort_keys=True)
        b = json.dumps(sorted(restored[key], key=lambda x: x['id']) if isinstance(restored[key], list) else restored[key], sort_keys=True)
        assert a == b, f'{key} unterscheidet sich nach Wiederherstellung'
    assert original['profile']['xp'] == restored['profile']['xp']
    assert len(logs(p2)) == len(logs(page))
    p2.reload()
    p2.wait_for_function('() => !!window.Merkwerk')
    assert len(state(p2)['cards']) == len(original['cards'])
    ctx2.close()


@test('Ordner als Stapel exportieren → in frischen Browser importieren')
def t_deck(browser, page):
    zid = folder_id(page, 'Zellbiologie')
    page.goto(BASE + f'#/library/{zid}')
    with page.expect_download() as dl:
        menu(page, 'Ordner exportieren')
    path = OUT / 'stapel.json'
    dl.value.save_as(path)
    deck = json.loads(path.read_text())
    assert deck['kind'] == 'deck' and len(deck['cards']) == 9, len(deck['cards'])  # Bildbereiche = 1 Eintrag
    orig = state(page)
    ctx2, p2 = new_page(browser, DESKTOP, 'Gerät 3')
    start_fresh(p2)
    p2.goto(BASE + '#/library')
    menu(p2, 'Importieren')
    p2.set_input_files('#import-file', str(path))
    modal_btn(p2, 'Importieren').click()
    expect(p2.locator('.report-big')).to_contain_text('10 Karten importiert')
    modal_btn(p2, 'OK').click()
    st = state(p2)
    assert sorted(f['name'] for f in st['folders']) == ['Zellbiologie']
    assert sorted(c['type'] for c in st['cards']) == sorted(c['type'] for c in orig['cards'])
    assert all(c['srs']['state'] == 'new' for c in st['cards']), 'Stapel sollte ohne Fortschritt importiert werden'
    assert set(st['media'].values()) == set(orig['media'].values()), 'Bilder nicht identisch'
    ctx2.close()


@test('Import: Textzeilen und fehlerhafte Datei')
def t_import_text(page):
    page.goto(BASE + '#/library')
    menu(page, 'Importieren')
    page.locator('.modal .tab', has_text='Text einfügen').click()
    page.locator('.modal textarea').fill('Hund ; dog\nKatze\tcat\n# Kommentar\nVogel :: bird')
    modal_btn(page, 'Importieren').click()
    expect(page.locator('.report-big')).to_contain_text('3 Karten importiert')
    modal_btn(page, 'OK').click()
    menu(page, 'Importieren')
    page.locator('.modal .tab', has_text='Text einfügen').click()
    page.locator('.modal textarea').fill('{"cards": [ {"type":"basic","front":"a"} ')
    modal_btn(page, 'Importieren').click()
    expect(page.locator('.toast-bad')).to_contain_text('kein gültiges JSON')
    page.locator('.modal .modal-head button').last.click()
    report = page.evaluate('''() => window.Merkwerk.IO.importDeck({cards:[{type:"mc",question:"x",options:["a"],correct:[0]},{type:"wurst"},{type:"truefalse",statement:"Erde ist rund",answer:"wahr"}]}, null)''')
    assert report['cards'] == 1 and len(report['skipped']) == 2, report


@test('Beispieldatei aus der Doku importiert fehlerfrei und ist lernbar')
def t_example_file(browser):
    ctx, page = new_page(browser, DESKTOP, 'Beispieldatei')
    start_fresh(page)
    page.goto(BASE + '#/library')
    menu(page, 'Importieren')
    page.set_input_files('#import-file', str(HERE.parent / 'docs' / 'beispiel-alle-kartentypen.json'))
    modal_btn(page, 'Importieren').click()
    expect(page.locator('.report-big')).to_contain_text('13 Karten importiert')
    assert page.locator('.report-list').count() == 0, 'Beim Import gab es Warnungen oder übersprungene Karten'
    modal_btn(page, 'OK').click()
    fid = folder_id(page, 'Import-Beispiel')
    page.goto(BASE + f'#/library/{fid}')
    page.get_by_role('button', name='Lernen', exact=True).click()
    n, seen = run_learn_session_keyboard(page)
    assert len(seen) == 8 and n >= 13, (n, seen)
    ctx.close()


@test('Rückgängig (Z), Freies Üben ändert Plan nicht')
def t_undo_cram(page):
    page.evaluate('() => window.Merkwerk.Store.childFolders(null)')
    fid = folder_id(page, 'Importiert')
    page.goto(BASE + f'#/library/{fid}')
    page.get_by_role('button', name='Lernen', exact=True).click()
    page.keyboard.press(' ')
    page.keyboard.press('1')
    page.wait_for_function('() => !window.Merkwerk.Study.s.result')
    n_before = len(logs(page))
    page.keyboard.press('z')
    page.wait_for_timeout(300)
    assert len(logs(page)) == n_before - 1, 'Rückgängig hat den Protokolleintrag nicht entfernt'
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    if page.locator('.summary').count():
        page.get_by_role('button', name='Fertig').click()
    snap = {c['id']: c['srs'] for c in state(page)['cards']}
    menu(page, 'Freies Üben')
    for _ in range(3):
        page.keyboard.press(' ')
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(300)
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    if page.locator('.summary').count():
        page.get_by_role('button', name='Fertig').click()
    after = {c['id']: c['srs'] for c in state(page)['cards']}
    assert snap == after, 'Freies Üben hat den Lernplan verändert'


@test('Prüfungsdatum begrenzt Intervalle, Problemkarten-Erkennung, FSRS plausibel')
def t_logic(page):
    r = page.evaluate('''async () => {
      const { Store, FSRS, State } = window.Merkwerk;
      const f = await Store.createFolder({ name: 'Logiktest' });
      const exam = (() => { const d = new Date(Date.now() + 6 * 864e5); return d.toISOString().slice(0, 10); })();
      await Store.updateFolder(f.id, { examDate: exam });
      const [c] = await Store.createCards('basic', f.id, { front: 'q', back: 'a' });
      c.srs = { state: 'review', due: Date.now(), s: 200, d: 3, last: Date.now() - 100 * 864e5, reps: 5, lapses: 0, ivl: 100 };
      await Store.applyReview(c.id, 4);
      const capOk = State.cards.get(c.id).srs.due <= new Date(exam).getTime();
      const [l] = await Store.createCards('basic', f.id, { front: 'leech', back: 'x' });
      let leech = false;
      for (let i = 0; i < 8 && !leech; i++) {
        const card = State.cards.get(l.id);
        card.srs = { ...card.srs, state: 'review', s: 2, d: 8, last: Date.now() - 3 * 864e5, due: Date.now() };
        const res = await Store.applyReview(l.id, 1);
        leech = res.becameLeech;
      }
      const p = FSRS.preview(FSRS.newState());
      const rv = { state: 'review', s: 10, d: 5, last: Date.now() - 10 * 864e5, due: Date.now(), reps: 3, lapses: 0 };
      const q = FSRS.preview(rv);
      await Store.deleteFolder(f.id);
      return { capOk, leech, lapses: State.cards.get(l.id) ? null : 'ok', mono: q[1] < q[2] && q[2] < q[3] && q[3] < q[4], newSteps: [p[1], p[2], p[3], p[4]] };
    }''')
    assert r['capOk'], 'Prüfungsdatum wurde nicht berücksichtigt'
    assert r['leech'], 'Problemkarte nicht erkannt'
    assert r['mono'], 'Intervalle nicht aufsteigend (Nochmal < Schwer < Gut < Leicht)'
    assert r['newSteps'][0] == 60000 and r['newSteps'][3] >= 864e5, r['newSteps']


@test('Bossangriff gewinnen & Zeit-Challenge (Beispielstapel)')
def t_modes(browser):
    ctx, page = new_page(browser, DESKTOP, 'Modi')
    page.goto(BASE)
    page.get_by_role('button', name='Mit Beispielstapel starten').click()
    page.wait_for_timeout(600)
    fid = folder_id(page, 'Beispielstapel')
    page.goto(BASE + f'#/library/{fid}')
    page.evaluate("() => window.Merkwerk.RPG.saveHero({ name: 'Testheld', cls: 'warrior', look: {} })")
    page.evaluate('() => { window.Merkwerk.RPG.d.boss.hp = 40; }')
    menu(page, 'Bossangriff')
    expect(page.locator('.boss-bar')).to_be_visible()
    page.screenshot(path=str(OUT / 'desktop-boss.png'))
    for _ in range(12):
        if page.locator('.summary').count():
            break
        c = cur(page)
        if c is None or c['summary']:
            page.wait_for_selector('.summary')
            break
        answer_with_keyboard(page, c)
        if cur(page) and cur(page)['result'] and cur(page)['result'].get('correct') is None:
            page.keyboard.press('ArrowRight')
        page.wait_for_function('(id) => { const s = window.Merkwerk.Study.s; return !s || s.summary || !s.result; }', arg=c['id'], timeout=4000)
    expect(page.locator('.summary h1')).to_have_text('Boss besiegt!')
    assert state(page)['profile']['high']['bossWins'] == 1
    assert len(state(page)['profile']['rpg']['chests']) == 1, 'Nach dem Sieg fehlt die Truhe'
    page.get_by_role('button', name='Fertig').click()
    menu(page, 'Zeit-Challenge')
    page.wait_for_timeout(2300)
    for _ in range(3):
        c = cur(page)
        answer_with_keyboard(page, c)
        if cur(page)['result'].get('correct') is None:
            page.keyboard.press('ArrowRight')
        page.wait_for_function('(id) => { const s = window.Merkwerk.Study.s; return s && !s.result; }', arg=c['id'], timeout=4000)
    page.screenshot(path=str(OUT / 'desktop-challenge.png'))
    page.evaluate('() => window.Merkwerk.Study.finish(true)')
    expect(page.locator('.summary h1')).to_have_text('Neuer Rekord!')
    assert state(page)['profile']['high']['challenge'] >= 30
    page.get_by_role('button', name='Fertig').click()
    menu(page, 'Zeit-Challenge')
    page.wait_for_timeout(500)
    page.keyboard.press('Escape')
    modal_btn(page, 'Abbrechen').click()
    expect(page.locator('.study-screen')).to_have_count(0)
    ctx.close()


@test('Handy: Tippen zum Umdrehen und Wischen (rechts/links/hoch, Wahr/Falsch)')
def t_mobile(browser):
    ctx, page = new_page(browser, MOBILE, 'Handy')
    page.goto(BASE)
    page.get_by_role('button', name='Mit Beispielstapel starten').click()
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / 'handy-ordner.png'), full_page=True)
    page.goto(BASE + '#/home')
    page.screenshot(path=str(OUT / 'handy-heute.png'), full_page=True)
    cdp = ctx.new_cdp_session(page)

    def swipe(dx, dy):
        b = page.locator('.study-card').bounding_box()
        x, y = b['x'] + b['width'] / 2, b['y'] + min(b['height'] / 2, 200)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        for i in range(1, 9):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx * i / 8, 'y': y + dy * i / 8}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        page.wait_for_timeout(450)

    def tap_card():
        b = page.locator('.study-card').bounding_box()
        page.touchscreen.tap(b['x'] + 30, b['y'] + 75)
        try:
            page.wait_for_function('() => !!window.Merkwerk.Study.s.result', timeout=1500)
        except Exception:
            pass

    page.click('#start-learning')
    expect(page.locator('.study-card')).to_be_visible()
    if os.environ.get('DBG'):
        page.on('console', lambda m: print('   ', m.text) if m.type == 'log' else None)
        page.evaluate("""() => ['pointerdown','pointerup','pointercancel','click'].forEach(t => document.addEventListener(t, e => console.log(t, (e.target.className && e.target.className.baseVal === undefined ? e.target.className : e.target.tagName), e.isTrusted), true))""")
    seen = {'right': 0, 'left': 0, 'up': 0, 'tf': 0}
    for i in range(30):
        if page.locator('.summary').count():
            break
        c = cur(page)
        if c is None or c['summary']:
            break
        t = c['type']
        if os.environ.get('DBG'): print('CARD', i, t, c['data'].get('front') or c['data'].get('statement') or '')
        n_logs = len(logs(page))
        if t in ('basic', 'occlusion'):
            tap_card()
            assert cur(page)['result'] is not None, f"Tippen hat die Karte nicht umgedreht ({t}, {c['data']})"
            if i == 1:
                page.screenshot(path=str(OUT / 'handy-umgedreht.png'))
        elif t == 'truefalse':
            swipe(170 if c['data']['answer'] else -170, 0)
            r = cur(page)['result']
            assert r and r['correct'] is True, 'Wahr/Falsch per Wischen nicht korrekt erkannt'
            seen['tf'] += 1
        else:
            answer_with_keyboard(page, c)
        direction = ['right', 'left', 'up'][i % 3]
        if direction == 'up' and page.locator('.study-card.is-scrollable').count():
            # Lange Karten scrollen vertikal – dort bewertet man „Schwer“ per Knopf
            b = page.locator('.rate-btn.r-hard').bounding_box()
            page.touchscreen.tap(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)
        else:
            swipe(*{'right': (180, 0), 'left': (-180, 0), 'up': (0, -200)}[direction])
        try:
            page.wait_for_function('(id) => { const s = window.Merkwerk.Study.s; return !s || s.summary || !s.result; }', arg=c['id'], timeout=4000)
        except Exception:
            dump(page, f'wischen-{direction}')
            raise
        lg = sorted(logs(page), key=lambda l: l['ts'])
        assert len(lg) == n_logs + 1, 'Wischen hat keine Bewertung gespeichert'
        expected = {'right': 3, 'left': 1, 'up': 2}[direction]
        if expected:
            assert lg[-1]['rating'] == expected, f"Wischen {direction}: Bewertung {lg[-1]['rating']} statt {expected}"
        seen[direction] += 1
    assert seen['right'] and seen['left'] and seen['up'] and seen['tf'], seen
    page.get_by_role('button', name='Beenden (Esc)').click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'handy-zusammenfassung.png'))
    ctx.close()


@test('Gaming-Design umschalten')
def t_theme(page):
    page.goto(BASE + '#/home')
    page.click('#theme-toggle')
    assert page.evaluate("document.documentElement.dataset.theme") == 'gaming'
    page.screenshot(path=str(OUT / 'gaming-heute.png'), full_page=True)
    fid = folder_id(page, 'Zellbiologie')
    page.goto(BASE + f'#/library/{fid}')
    menu(page, 'Freies Üben')
    page.keyboard.press(' ')
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / 'gaming-lernen.png'))
    page.keyboard.press('Escape')
    page.reload()
    assert page.evaluate("document.documentElement.dataset.theme") == 'gaming', 'Design wurde nicht gespeichert'
    page.click('#theme-toggle')


@test('Offline: App startet ohne Netzwerk (Service Worker)')
def t_offline(browser):
    ctx, page = new_page(browser, DESKTOP, 'Offline')
    page.goto(BASE)
    page.wait_for_function('() => navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true)')
    page.reload()
    page.wait_for_function('() => !!navigator.serviceWorker.controller', timeout=5000)
    ctx.set_offline(True)
    page.reload()
    expect(page.locator('.nav')).to_be_visible()
    ctx.set_offline(False)
    ctx.close()


@test('Offline-Einzeldatei (file://) funktioniert und speichert')
def t_file(browser):
    ctx, page = new_page(browser, DESKTOP, 'Einzeldatei')
    url = OFFLINE_FILE.as_uri()
    start_fresh(page, url)
    page.goto(url + '#/library')
    page.click('#new-folder'); page.keyboard.type('Datei-Test'); page.keyboard.press('Enter')
    expect(page.locator('h1')).to_contain_text('Datei-Test')
    page.reload()
    page.wait_for_function('() => !!window.Merkwerk')
    assert any(f['name'] == 'Datei-Test' for f in state(page)['folders'])
    ctx.close()


@test('Alle Seiten rendern auf Handy & PC ohne horizontales Scrollen')
def t_layout(browser):
    for label, opts in [('PC', DESKTOP), ('Handy', MOBILE)]:
        ctx, page = new_page(browser, opts, f'Layout {label}')
        page.goto(BASE)
        page.get_by_role('button', name='Mit Beispielstapel starten').click()
        page.wait_for_timeout(500)
        page.evaluate("() => window.Merkwerk.RPG.saveHero({ name: 'Layout', cls: 'ranger', look: {} })")
        for r in ['home', 'library', 'hero', 'hero/inventar', 'hero/shop', 'stats', 'badges', 'settings']:
            page.goto(BASE + f'#/{r}')
            page.wait_for_timeout(250)
            w = page.evaluate('() => [document.documentElement.scrollWidth, window.innerWidth]')
            assert w[0] <= w[1] + 1, f'{label} {r}: horizontal scrollbar ({w})'
            page.screenshot(path=str(OUT / f"{label.lower()}-{r.replace('/', '-')}.png"), full_page=True)
        ctx.close()


# ============================== RPG ==============================
def rpg(page):
    return page.evaluate('() => JSON.parse(JSON.stringify(window.Merkwerk.State.profile.rpg))')


def demo_page(browser, opts=DESKTOP, label='RPG'):
    ctx, page = new_page(browser, opts, label)
    page.goto(BASE)
    page.get_by_role('button', name='Mit Beispielstapel starten').click()
    page.wait_for_timeout(600)
    return ctx, page


@test('RPG: Held erstellen (Name, Klasse, Aussehen) und bearbeiten')
def t_rpg_create(page):
    page.goto(BASE + '#/hero')
    expect(page.locator('h1')).to_have_text('Erschaffe deinen Helden')
    page.click('#create-hero')
    expect(page.locator('.toast-warn')).to_contain_text('Namen')
    page.fill('#hero-name', 'Lyra Funkenherz')
    page.locator('.class-opt[data-cls="ranger"]').click()
    page.locator('.chip', has_text='Zopf').click()
    page.locator('.swatch[aria-label="Hautfarbe #C98E62"]').click()
    page.locator('.chip', has_text='Fröhlich').click()
    page.click('#create-hero')
    expect(page.locator('.hero-id h2')).to_have_text('Lyra Funkenherz')
    r = rpg(page)
    assert r['char']['cls'] == 'ranger' and r['char']['look']['hair'] == 'Zopf' and r['char']['look']['skin'] == '#C98E62' and r['char']['look']['face'] == 'Fröhlich'
    assert r['gold'] == 50 and r['equipped']['weapon'] and len(r['inventory']) == 1, r
    assert r['boss'] and r['boss']['hp'] == r['boss']['maxHp'] > 0
    assert page.locator('.hero-figure svg').count() >= 1
    page.screenshot(path=str(OUT / 'rpg-held.png'), full_page=True)
    page.get_by_role('button', name='Held bearbeiten').click()
    m = page.locator('.overlay:not(.is-closing) .modal').last
    m.locator('#hero-name').fill('Lyra die Kühne')
    m.locator('.class-opt[data-cls="mage"]').click()
    modal_btn(page, 'Speichern').click()
    expect(page.locator('.hero-id h2')).to_have_text('Lyra die Kühne')
    r2 = rpg(page)
    assert r2['char']['cls'] == 'mage' and r2['gold'] == 50 and len(r2['inventory']) == 1, 'Bearbeiten hat Daten verändert'


@test('RPG: Schadensformel (Stärke, Weisheit, Glück, Ausrüstung, Klassen) und Balancing')
def t_rpg_damage(page):
    r = page.evaluate("""() => {
      const { RPG, State } = window.Merkwerk;
      const d = RPG.d, save = JSON.parse(JSON.stringify(d));
      const noCrit = () => 0.999, crit = () => 0;
      const out = {};
      d.char.cls = 'warrior'; d.alloc = { str: 0, wis: 0, luck: 0 };
      const lvl = RPG.level();
      const st = RPG.stats();
      out.base = RPG.damage({ rating: 3, combo: 0 }, noCrit).dmg;
      out.expected = Math.round((4 + lvl + st.str * 1.5 + RPG.gearAtk()) * 1.15 + 0);
      d.alloc.str = 2;
      out.moreStr = RPG.damage({ rating: 3, combo: 0 }, noCrit).dmg;
      d.alloc.str = 0;
      out.hard = RPG.damage({ rating: 2, combo: 0 }, noCrit).dmg;
      out.combo = RPG.damage({ rating: 3, combo: 6 }, noCrit).dmg;
      out.crit = RPG.damage({ rating: 3, combo: 0 }, crit);
      d.char.cls = 'ranger';
      out.rangerCrit = RPG.damage({ rating: 3, combo: 0 }, crit).dmg;
      out.rangerNo = RPG.damage({ rating: 3, combo: 0 }, noCrit).dmg;
      d.char.cls = 'mage';
      out.mageHard = RPG.damage({ rating: 2, combo: 0 }, noCrit).dmg - RPG.damage({ rating: 3, combo: 0 }, noCrit).dmg;
      d.char.cls = 'warrior';
      out.warHard = RPG.damage({ rating: 2, combo: 0 }, noCrit).dmg - RPG.damage({ rating: 3, combo: 0 }, noCrit).dmg;
      const before = RPG.damage({}, noCrit).dmg;
      const legendary = RPG.makeItem({ slot: 'weapon', rarity: 'legendary' }), common = RPG.makeItem({ slot: 'weapon', rarity: 'common' });
      out.rarityOrder = legendary.atk > common.atk;
      d.inventory.push(legendary); d.equipped.weapon = legendary.id;
      out.withLegendary = RPG.damage({}, noCrit).dmg;
      out.beforeGear = before;
      out.luckCrit = [RPG.critChance()];
      d.alloc.luck = 10; out.luckCrit.push(RPG.critChance()); d.alloc.luck = 0;
      // Balancing: frischer Held je Klasse, Startwaffe, Tagesziel
      out.days = {};
      for (const cls of ['warrior', 'mage', 'ranger']) {
        d.char.cls = cls; d.alloc = { str: 0, wis: 0, luck: 0 };
        const w = RPG.makeItem({ slot: 'weapon', rarity: 'common', level: 1 });
        d.inventory = [w]; d.equipped = { weapon: w.id, helm: null, armor: null, shield: null, amulet: null };
        const realLevel = RPG.level; RPG.level = () => 1;
        out.days[cls] = RPG.bossMaxHp(0) / (RPG.avgDamage() * State.settings.dailyGoal * 0.85);
        RPG.level = realLevel;
      }
      out.tierGrowth = RPG.bossMaxHp(1) > RPG.bossMaxHp(0);
      Object.assign(d, save);
      return out;
    }""")
    assert r['base'] == r['expected'], r
    assert r['moreStr'] > r['base'], 'Stärke erhöht den Schaden nicht'
    assert r['hard'] > r['base'] and r['combo'] > r['base'], 'Weisheit-Bonus fehlt'
    assert r['crit']['crit'] and r['crit']['dmg'] >= r['base'] * 2 - 1, r['crit']
    assert r['rangerCrit'] >= round(r['rangerNo'] * 2.5) - 1, 'Waldläufer-Krit nicht ×2,5'
    assert r['mageHard'] > r['warHard'], 'Magier-Bonus fehlt'
    assert r['rarityOrder'] and r['withLegendary'] > r['beforeGear'], 'Ausrüstung wirkt nicht'
    assert r['luckCrit'][1] > r['luckCrit'][0], 'Glück wirkt nicht'
    assert all(3 <= v <= 5 for v in r['days'].values()), f"Balancing außerhalb 3–5 Tage: {r['days']}"
    assert r['tierGrowth']
    print('     Tage bis zum ersten Boss:', {k: round(v, 1) for k, v in r['days'].items()})


@test('RPG: Fähigkeitspunkte verteilen, Ausrüstung anlegen, vergleichen, verkaufen')
def t_rpg_equip(page):
    page.evaluate("""() => { const { RPG, State } = window.Merkwerk; State.profile.xp = 400;
      RPG.d.inventory.push(RPG.makeItem({ slot: 'helm', rarity: 'epic' })); return RPG.save(); }""")
    page.goto(BASE + '#/hero/held')
    expect(page.locator('.points-free')).to_be_visible()
    wis0 = page.evaluate('() => window.Merkwerk.RPG.stats().wis')
    page.get_by_role('button', name='Weisheit erhöhen').click()
    page.wait_for_timeout(200)
    assert page.evaluate('() => window.Merkwerk.RPG.stats().wis') == wis0 + 1
    page.goto(BASE + '#/hero/inventar')
    tile = page.locator('.item-tile.r-epic').first
    tile.click()
    expect(page.locator('.modal .item-detail')).to_be_visible()
    luck0 = page.evaluate('() => window.Merkwerk.RPG.stats().luck')
    modal_btn(page, 'Anlegen').click()
    page.wait_for_timeout(250)
    r = rpg(page)
    helm = next(i for i in r['inventory'] if i['slot'] == 'helm')
    assert r['equipped']['helm'] == helm['id']
    assert page.evaluate('() => window.Merkwerk.RPG.stats().wis') > wis0 + 1, 'Helm-Werte zählen nicht'
    page.evaluate("() => { const { RPG } = window.Merkwerk; RPG.d.inventory.push(RPG.makeItem({ slot: 'helm', rarity: 'common' })); return RPG.save(); }")
    page.goto(BASE + '#/hero/held'); page.goto(BASE + '#/hero/inventar')
    page.locator('.item-tile.r-common', has_text='').filter(has=page.locator('.item-icon')).last.click()
    expect(page.locator('.modal .compare')).to_be_visible()
    gold0 = rpg(page)['gold']
    page.locator('.overlay:not(.is-closing) .modal').last.get_by_role('button', name='Verkaufen', exact=False).click()
    page.wait_for_timeout(300)
    if page.locator('.modal h2', has_text='Wirklich verkaufen?').count():
        modal_btn(page, 'Verkaufen').click(); page.wait_for_timeout(200)
    assert rpg(page)['gold'] > gold0, 'Verkaufen bringt kein Gold'
    page.screenshot(path=str(OUT / 'rpg-inventar.png'), full_page=True)


@test('RPG: Lernrunde macht Schaden, Rückgängig nimmt ihn zurück, Boss besiegen, Truhe öffnen')
def t_rpg_fight(page):
    page.goto(BASE + '#/home')
    expect(page.locator('.boss-card')).to_be_visible()
    hp0 = rpg(page)['boss']['hp']
    page.click('#start-learning')
    expect(page.locator('.boss-bar.is-slim')).to_be_visible()
    c = cur(page); answer_with_keyboard(page, c)
    page.keyboard.press('3' if c['type'] in ('basic', 'occlusion') else 'Enter')
    page.wait_for_function('() => !window.Merkwerk.Study.s.result')
    r = rpg(page)
    assert r['boss']['hp'] < hp0, 'Kein Schaden'
    assert r['totalDamage'] == hp0 - r['boss']['hp']
    page.keyboard.press('z')
    page.wait_for_timeout(300)
    assert rpg(page)['boss']['hp'] == hp0, 'Rückgängig hat den Schaden nicht zurückgenommen'
    page.evaluate('() => { window.Merkwerk.RPG.d.boss.hp = 1; }')
    kills0, gold0, inv0, maxhp0 = r['kills'], rpg(page)['gold'], len(r['inventory']), r['boss']['maxHp']
    c = cur(page); answer_with_keyboard(page, c)
    page.keyboard.press('3' if c['type'] in ('basic', 'occlusion') else 'Enter')
    page.wait_for_function('() => !window.Merkwerk.Study.s.result')
    r = rpg(page)
    assert r['kills'] == kills0 + 1 and len(r['chests']) == 1, 'Kein Sieg / keine Truhe'
    assert r['boss']['tier'] == kills0 + 1 and r['boss']['maxHp'] > maxhp0 and r['boss']['hp'] == r['boss']['maxHp'], 'Neuer Boss nicht stärker'
    page.screenshot(path=str(OUT / 'rpg-lernen-sieg.png'))
    page.keyboard.press('Escape')
    expect(page.locator('.chest-cta')).to_be_visible()
    page.locator('.chest-cta').click()
    expect(page.locator('.chest-stage')).to_be_visible()
    chest = rpg(page)['chests'][0]
    gold1 = rpg(page)['gold']
    modal_btn(page, 'Öffnen').click()
    expect(page.locator('.loot-item')).to_have_count(len(chest['items']), timeout=6000)
    page.screenshot(path=str(OUT / 'rpg-truhe.png'))
    r = rpg(page)
    assert r['gold'] == gold1 + chest['gold'] and len(r['inventory']) == inv0 + len(chest['items']) and not r['chests']
    assert all(it['rarity'] in ('common', 'rare', 'epic', 'legendary') for it in chest['items'])
    assert any(it['rarity'] != 'common' for it in chest['items']), 'Truhe ohne seltenen Gegenstand'
    modal_btn(page, 'Ins Inventar').click()


@test('RPG: Shop – zufällige Ausrüstung je Seltenheit kaufen, zu wenig Gold')
def t_rpg_shop(page):
    page.evaluate('() => { window.Merkwerk.RPG.d.gold = 1500; return window.Merkwerk.RPG.save(); }')
    page.goto(BASE + '#/hero/shop')
    inv0 = len(rpg(page)['inventory'])
    page.locator('.shop-card.r-epic').get_by_role('button').click()
    expect(page.locator('.modal .loot-item.r-epic')).to_be_visible()
    modal_btn(page, 'Ins Inventar').click()
    r = rpg(page)
    assert r['gold'] == 1100 and len(r['inventory']) == inv0 + 1 and r['purchases'][0]['rarity'] == 'epic'
    page.locator('.shop-card.r-legendary').get_by_role('button').click()
    expect(page.locator('.modal .loot-item.r-legendary')).to_be_visible()
    modal_btn(page, 'Ins Inventar').click()
    assert rpg(page)['gold'] == 100
    page.locator('.shop-card.r-legendary').get_by_role('button').click()
    expect(page.locator('.toast-warn').last).to_contain_text('fehlen')
    assert rpg(page)['gold'] == 100
    page.screenshot(path=str(OUT / 'rpg-shop.png'), full_page=True)


@test('RPG: Eigene Belohnungen anlegen, bearbeiten, kaufen, Verlauf, löschen')
def t_rpg_rewards(page):
    page.goto(BASE + '#/hero/shop')
    page.click('#add-reward')
    m = page.locator('.overlay:not(.is-closing) .modal').last
    m.get_by_label('Name').fill('Kinoabend')
    m.get_by_label('Preis in Gold').fill('80')
    modal_btn(page, 'Speichern').click()
    expect(page.locator('.reward-row', has_text='Kinoabend')).to_be_visible()
    page.locator('.reward-row', has_text='Kinoabend').get_by_role('button', name='Aktionen für Kinoabend').click()
    page.locator('.menu-pop').get_by_role('menuitem', name='Bearbeiten').click()
    m = page.locator('.overlay:not(.is-closing) .modal').last
    m.get_by_label('Preis in Gold').fill('90')
    modal_btn(page, 'Speichern').click()
    expect(page.locator('.reward-row', has_text='90 Gold')).to_be_visible()
    page.locator('.reward-row', has_text='Kinoabend').get_by_role('button', name='Kaufen').click()
    modal_btn(page, 'Kaufen').click()
    page.wait_for_timeout(300)
    r = rpg(page)
    assert r['gold'] == 10 and r['purchases'][0]['name'] == 'Kinoabend' and r['purchases'][0]['kind'] == 'reward'
    expect(page.locator('.history-row', has_text='Kinoabend')).to_be_visible()
    assert 'reward_1' in state(page)['profile']['badges']
    page.locator('.reward-row', has_text='Kinoabend').get_by_role('button', name='Kaufen').click()
    modal_btn(page, 'Kaufen').click()
    expect(page.locator('.toast-warn').last).to_contain_text('fehlen')
    page.locator('.reward-row', has_text='Kinoabend').get_by_role('button', name='Aktionen für Kinoabend').click()
    page.locator('.menu-pop').get_by_role('menuitem', name='Löschen').click()
    modal_btn(page, 'Löschen').click()
    expect(page.locator('.reward-row', has_text='Kinoabend')).to_have_count(0)


@test('RPG: Sicherung enthält Held, Ausrüstung, Gold & Belohnungen; alte Sicherung ohne RPG lädt')
def t_rpg_backup(browser, page):
    page.goto(BASE + '#/settings')
    with page.expect_download() as dl:
        page.get_by_role('button', name='Sicherung speichern').click()
    path = OUT / 'sicherung-rpg.json'
    dl.value.save_as(path)
    orig = rpg(page)
    ctx2, p2 = new_page(browser, MOBILE, 'RPG Gerät 2')
    start_fresh(p2)
    p2.goto(BASE + '#/settings')
    p2.get_by_role('button', name='Datei importieren').click()
    p2.set_input_files('#import-file', str(path))
    modal_btn(p2, 'Importieren').click()
    modal_btn(p2, 'Wiederherstellen').click()
    p2.wait_for_timeout(500)
    assert json.dumps(rpg(p2), sort_keys=True) == json.dumps(orig, sort_keys=True), 'RPG-Daten nach Wiederherstellung verschieden'
    p2.goto(BASE + '#/hero')
    expect(p2.locator('.hero-id h2')).to_have_text(orig['char']['name'])
    p2.screenshot(path=str(OUT / 'rpg-handy-held.png'), full_page=True)
    old = json.loads(path.read_text())
    del old['profile']['rpg']
    old_path = OUT / 'sicherung-alt-ohne-rpg.json'
    old_path.write_text(json.dumps(old))
    p2.goto(BASE + '#/settings')
    p2.get_by_role('button', name='Datei importieren').click()
    p2.set_input_files('#import-file', str(old_path))
    modal_btn(p2, 'Importieren').click()
    modal_btn(p2, 'Wiederherstellen').click()
    p2.wait_for_timeout(500)
    r = rpg(p2)
    assert r['char'] is None and r['gold'] == 0 and r['inventory'] == [], 'Migration alter Sicherung fehlerhaft'
    assert len(state(p2)['cards']) == len(old['cards'])
    p2.goto(BASE + '#/hero')
    expect(p2.locator('h1')).to_have_text('Erschaffe deinen Helden')
    ctx2.close()


def run_rpg(browser):
    ctx, page = demo_page(browser)
    t_rpg_create(page); t_rpg_damage(page); t_rpg_equip(page); t_rpg_fight(page)
    t_rpg_shop(page); t_rpg_rewards(page); t_rpg_backup(browser, page)
    page.goto(BASE + '#/hero'); page.click('#theme-toggle'); page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'rpg-gaming-held.png'), full_page=True)
    page.goto(BASE + '#/hero/shop'); page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'rpg-gaming-shop.png'), full_page=True)
    ctx.close()


def main():
    print(f'Teste {BASE}\n')
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx, page = new_page(browser, DESKTOP, 'PC')
        t_start(page); t_folders(page); t_create_cards(page); t_validation(page); t_study_keyboard(page)
        t_persist(page); t_edit(page); t_backup(browser, page); t_deck(browser, page); t_import_text(page)
        t_undo_cram(page); t_logic(page); t_theme(page)
        ctx.close()
        t_example_file(browser); t_modes(browser); t_mobile(browser); run_rpg(browser); t_offline(browser); t_file(browser); t_layout(browser)
        browser.close()
    ok = sum(1 for r in RESULTS if r[1])
    print(f'\n{ok}/{len(RESULTS)} Tests bestanden')
    real = [c for c in CONSOLE if 'Offline' not in c or 'ERR_INTERNET_DISCONNECTED' not in c]
    print('Konsolenfehler/-warnungen:', len(real))
    for c in real[:40]:
        print('  ', c)
    sys.exit(0 if ok == len(RESULTS) and not real else 1)


if __name__ == '__main__':
    main()
