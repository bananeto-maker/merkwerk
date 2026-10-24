# Merkwerk – Import-Format

Merkwerk importiert Karteikarten aus einer **JSON-Datei** (Endung `.json`).
Dieses Dokument beschreibt das Format so genau, dass Claude (oder du selbst) aus beliebigen Unterlagen Karten erstellen kann, die sich direkt importieren lassen.

Eine fertige Beispieldatei mit allen 8 Kartentypen liegt bei: **`beispiel-alle-kartentypen.json`**.

---

## 1. Grundaufbau

```json
{
  "format": "merkwerk",
  "version": 1,
  "kind": "deck",
  "folders": [
    { "path": "Biologie", "emoji": "🧬" },
    { "path": "Biologie/Zelle", "examDate": "2027-01-31" }
  ],
  "cards": [
    { "type": "basic", "folder": "Biologie/Zelle", "front": "Frage", "back": "Antwort" }
  ]
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `format`, `version`, `kind` | nein | Kennzeichnung. `kind` ist `"deck"` (Kartenstapel). `"backup"` ist für vollständige Sicherungen reserviert. |
| `folders` | nein | Ordner mit Zusatzinfos (siehe unten). Ordner, die nur in `cards` vorkommen, werden automatisch angelegt. |
| `cards` | **ja** | Liste der Karten. |
| `media` | nein | Bild-Sammlung `{ "id": "data:image/…" }`, auf die Karten mit `"media:id"` verweisen können (macht Merkwerk beim Export automatisch). |

**Kürzeste gültige Datei:** einfach eine Liste von Karten:
`[ { "front": "Hund", "back": "dog" } ]` – ohne `type` gilt `"basic"`, ohne `folder` landet alles im Zielordner bzw. im Ordner „Importiert“.

### Ordner (`folders` und `folder`)

- `folder` bei einer Karte ist ein **Pfad mit Schrägstrichen**: `"Jus/Zivilrecht/Vertragsrecht"`. Fehlende Ordner werden angelegt.
- Beim Import wählst du einen Zielordner. Die Pfade gelten **relativ** dazu (bei „Oberste Ebene“ ganz oben).
- Optionale Felder in `folders`:
  - `emoji` – Symbol, z. B. `"⚖️"`
  - `color` – Farbe als Hex, z. B. `"#179C6B"`
  - `examDate` – Prüfungsdatum `"JJJJ-MM-TT"`. Merkwerk plant die Wiederholungen dann so, dass bis dahin alles sitzt (gilt auch für Unterordner).
  - `lang` – Vorlese-Sprache, z. B. `"en-GB"`, `"fr-FR"`, `"es-ES"`, `"it-IT"`, `"de-DE"`

### Gemeinsame Felder jeder Karte

| Feld | Bedeutung |
|---|---|
| `type` | Einer der 8 Kartentypen (siehe Abschnitt 3). Standard: `"basic"`. |
| `folder` | Ordnerpfad (siehe oben). |
| `tags` | optional, Liste von Stichwörtern, z. B. `["Kapitel 3"]`. |

---

## 2. Textformatierung (in allen Textfeldern)

| Schreibweise | Ergebnis |
|---|---|
| `**fett**` | **fett** |
| `*kursiv*` | *kursiv* |
| `==markiert==` | gelb hervorgehoben |
| `` `code` `` | Code-Schrift |
| `$a^2+b^2=c^2$` | Formel im Text (LaTeX) |
| `$$\frac{a}{b}$$` | Formel als eigene Zeile |
| `\n` | Zeilenumbruch |

**Wichtig für JSON:** Backslashes in LaTeX müssen verdoppelt werden: `"$\\frac{1}{2}$"` statt `"$\frac{1}{2}$"`.
Ein echtes Dollarzeichen schreibst du als `\\$`.

### Bilder

Bildfelder (`image`, `frontImage`, `backImage`, Zuordnen-Seiten, Multiple-Choice-Antworten) akzeptieren:
- **Data-URL** (empfohlen, funktioniert offline): `"data:image/png;base64,iVBOR…"`, auch `image/jpeg`, `image/webp`, `image/svg+xml`
- Verweis auf `media`: `"media:abc123"`
- Web-Adresse `"https://…"` (wird nur mit Internet angezeigt)

---

## 3. Die 8 Kartentypen

### 3.1 `basic` – Klassisch (umdrehen & selbst bewerten)

```json
{ "type": "basic", "folder": "Englisch",
  "front": "die Nachhaltigkeit", "back": "sustainability",
  "reverse": true,
  "hint": "beginnt mit s",
  "note": "Adjektiv: sustainable",
  "frontImage": null, "backImage": null }
```
- Pflicht: `front` (oder `frontImage`) und `back` (oder `backImage`)
- `reverse: true` erzeugt automatisch eine zweite Karte in Gegenrichtung (ideal für Vokabeln)
- `hint`: Tipp, der erst auf Wunsch erscheint · `note`: Eselsbrücke/Erklärung nach dem Umdrehen
- Statt `front`/`back` gehen auch `question`/`answer`

### 3.2 `typing` – Antwort eintippen

```json
{ "type": "typing", "question": "Wie heißt das Kraftwerk der Zelle?",
  "answer": "Mitochondrium", "alternatives": ["Mitochondrien"],
  "hint": "", "note": "Erzeugt ATP." , "image": null }
```
- Pflicht: `question` (oder `image`), `answer`
- Toleriert automatisch Groß-/Kleinschreibung, Satzzeichen, ä↔ae und kleine Tippfehler
- Weitere richtige Antworten in `alternatives` oder in `answer` mit `|` trennen: `"Wien|Vienna"`
- Am besten für **kurze** Antworten (ein Wort bis kurzer Ausdruck)

### 3.3 `mc` – Multiple Choice

```json
{ "type": "mc", "question": "In welcher Organelle findet die Fotosynthese statt?",
  "options": ["Chloroplast", "Zellkern", "Ribosom", "Vakuole"],
  "correct": ["Chloroplast"],
  "explanation": "Chloroplasten enthalten Chlorophyll.",
  "shuffle": true, "image": null }
```
- Pflicht: `question`, mindestens 2 `options`, mindestens 1 richtige Antwort
- `correct`: **Antworttext(e)** wie in `options` (empfohlen) **oder** Positionen **ab 0** (`[0, 2]`)
- Mehrere richtige Antworten sind erlaubt – die App zeigt dann „Mehrere Antworten sind richtig“
- `shuffle: false` behält die Reihenfolge (z. B. bei „alle oben genannten“)
- Antworten dürfen auch Bilder sein (Data-URL)
- Bis zu 8 Antworten pro Karte

### 3.4 `match` – Zuordnen (Bilder oder Begriffe)

```json
{ "type": "match", "prompt": "Ordne jeder Organelle ihre Aufgabe zu.",
  "pairs": [
    { "left": "Zellkern", "right": "enthält die DNA" },
    { "left": "Ribosom", "right": "baut Proteine" },
    { "left": "data:image/png;base64,…", "right": "Mitochondrium" }
  ],
  "note": "" }
```
- 2 bis 8 Paare. `left` darf Text **oder Bild** sein, `right` ist Text (oder Bild)
- Kurzformen werden auch erkannt: `["Begriff", "Bedeutung"]`, `{ "term": …, "definition": … }`, `{ "image": …, "label": … }`

### 3.5 `cloze` – Lückentext

```json
{ "type": "cloze",
  "text": "Die Hauptstadt von Tirol ist {{Innsbruck}}. Österreich hat {{9|neun::Zahl}} Bundesländer.",
  "note": "", "image": null }
```
- Lücken in **doppelten geschweiften Klammern**: `{{Antwort}}`
- Mehrere richtige Antworten: `{{9|neun}}` · Hinweis im Eingabefeld: `{{Innsbruck::Stadt}}`
- Anki-Schreibweise `{{c1::Antwort}}` funktioniert ebenfalls
- Mindestens eine Lücke pro Karte; alle Lücken einer Karte werden gemeinsam abgefragt

### 3.6 `truefalse` – Wahr oder falsch

```json
{ "type": "truefalse", "statement": "Die Donau mündet in die Nordsee.",
  "answer": false, "explanation": "Sie mündet ins Schwarze Meer.", "image": null }
```
- `answer`: `true`/`false` (auch `"wahr"`/`"falsch"`)
- Am Handy: nach rechts wischen = wahr, nach links = falsch

### 3.7 `order` – Reihenfolge

```json
{ "type": "order", "prompt": "Bringe die Phasen der Mitose in die richtige Reihenfolge.",
  "items": ["Prophase", "Metaphase", "Anaphase", "Telophase"],
  "note": "Eselsbrücke: Papa Macht Abends Tee." }
```
- `items` in der **richtigen** Reihenfolge angeben (2–10 Elemente) – die App mischt sie selbst

### 3.8 `occlusion` – Bildbereiche abdecken

```json
{ "type": "occlusion", "prompt": "Wie heißt der markierte Teil?",
  "image": "data:image/png;base64,…",
  "masks": [
    { "x": 0.70, "y": 0.10, "w": 0.28, "h": 0.08, "label": "Zellwand" },
    { "x": 0.70, "y": 0.25, "w": 0.28, "h": 0.08, "label": "Zellkern" }
  ],
  "note": "" }
```
- Koordinaten sind **Anteile von 0 bis 1** der Bildbreite/-höhe: `x`,`y` = linke obere Ecke, `w`,`h` = Breite/Höhe
- Jeder Bereich wird beim Import zu **einer eigenen Karte** (alle anderen Bereiche bleiben dabei verdeckt)
- Tipp: Diesen Typ legst du meist bequemer direkt in der App an (Bild hochladen, Rechtecke ziehen)

---

## 4. Regeln & Fehlerbehandlung

- Ungültige Karten werden **übersprungen**, der Rest wird importiert. Nach dem Import siehst du einen Bericht mit Grund und Nummer jeder übersprungenen Karte.
- Häufige Fehler: fehlende Kommas/Klammern im JSON, einfache statt doppelte Anführungszeichen, einfacher statt doppelter Backslash in Formeln, `correct` verweist auf eine Antwort, die es in `options` nicht gibt.
- Ein Import fügt Karten immer **hinzu** (auch doppelt, wenn du dieselbe Datei zweimal importierst).
- Kartenstapel werden **ohne** Lernfortschritt importiert. Fortschritt überträgst du nur mit einer **Sicherung** (Einstellungen → Sicherung speichern).

### Schnellimport ohne JSON

Im Import-Dialog unter „Text einfügen“ geht auch: eine Karte pro Zeile, Frage und Antwort getrennt durch `;`, Tabulator oder ` :: `:

```
Hauptstadt von Frankreich ; Paris
the sustainability ; die Nachhaltigkeit
# Zeilen mit # werden ignoriert
```

---

## 5. Vorlage: So bittest du Claude um Karten

Kopiere diesen Text in den Chat, hänge deine Unterlagen an und passe die Klammern an:

> Erstelle mir aus den angehängten Unterlagen Karteikarten für meine App **Merkwerk** im Merkwerk-Import-Format (JSON, siehe IMPORT-FORMAT.md).
> - Ordnerpfad: **[Fach/Kapitel]**, Prüfungsdatum: **[JJJJ-MM-TT oder keins]**
> - Etwa **[Anzahl]** Karten, eine Information pro Karte, kurze Antworten
> - Mische die Kartentypen sinnvoll: Definitionen als `basic`, Fachbegriffe als `typing`, Verwechslungsgefahr als `mc`, Zusammenhänge als `match`, Merksätze als `cloze`, typische Irrtümer als `truefalse`, Abläufe als `order`
> - Ergänze bei schwierigen Karten eine Eselsbrücke in `note`
> - Formeln in LaTeX mit doppeltem Backslash
> - Gib mir die fertige `.json`-Datei zum Herunterladen

Danach in Merkwerk: **Ordner → ⋯ → Importieren** (oder im gewünschten Ordner: ⋯ → Hierher importieren).
