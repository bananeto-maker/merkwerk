# Merkwerk – Anleitung

Merkwerk ist eine Web-App: dieselben Dateien laufen auf Windows und Android, auch ohne Internet.
Du hast zwei Möglichkeiten, sie zu nutzen:

| | **A) Als installierte App (empfohlen)** | **B) Offline-Einzeldatei** |
|---|---|---|
| Datei | Ordner `merkwerk-app/` | `Merkwerk-Offline.html` |
| Eigenes App-Symbol, ohne Browserleiste | ✅ | ❌ |
| Funktioniert ohne Internet | ✅ (nach dem ersten Öffnen) | ✅ |
| Einrichtung | einmalig ins Web stellen (kostenlos, ca. 5 Min.) | keine – Doppelklick genügt |
| Am Handy gut nutzbar | ✅ | eingeschränkt (Android öffnet lokale HTML-Dateien je nach Browser unterschiedlich) |

> **Wichtig:** Deine Karten werden im Browser gespeichert – getrennt je Gerät, je Browser und je Adresse.
> Die installierte App und die Einzeldatei haben also **getrennte** Daten. Entscheide dich am besten pro Gerät für eine Variante.

---

## A) App kostenlos bereitstellen, damit sie installierbar ist

Damit Android und Windows Merkwerk als App installieren können, muss der Ordner `merkwerk-app/` einmal unter einer `https://`-Adresse erreichbar sein. Danach läuft die App offline; deine Karten bleiben trotzdem nur auf deinem Gerät (es werden keine Lerndaten hochgeladen).

### Variante 1: GitHub Pages
1. Kostenloses Konto auf **github.com** anlegen und anmelden.
2. Oben rechts **+ → New repository**. Name z. B. `merkwerk`, Sichtbarkeit **Public**, **Create repository**.
3. Auf der neuen Seite **uploading an existing file** anklicken und den **Inhalt** des Ordners `merkwerk-app` hineinziehen (`index.html`, `manifest.webmanifest`, `sw.js` und den Ordner `icons`). **Commit changes**.
4. **Settings → Pages**. Bei *Source* „Deploy from a branch“, Branch **main** und Ordner **/(root)** wählen, **Save**.
5. Nach 1–2 Minuten steht oben die Adresse, z. B. `https://deinname.github.io/merkwerk/`. Diese öffnest du auf PC und Handy.

### Variante 2: Netlify Drop (noch schneller)
1. **app.netlify.com/drop** öffnen.
2. Den Ordner `merkwerk-app` auf die Fläche ziehen.
3. Du bekommst sofort eine Adresse auf `….netlify.app`. Damit sie dauerhaft bleibt, mit einem kostenlosen Konto anmelden bzw. das Projekt „claimen“.

### Auf Windows installieren (Edge oder Chrome)
1. Die Adresse in **Microsoft Edge** oder **Google Chrome** öffnen.
2. In der Adressleiste erscheint ein **App-installieren-Symbol** (Bildschirm mit Pfeil) – anklicken → **Installieren**.
   Alternativ: Menü **⋯ → Apps → Diese Website als App installieren** (Edge) bzw. **⋮ → Streamen, speichern und teilen → Seite als App installieren** (Chrome).
   In Merkwerk selbst findest du unter **Einstellungen → App → Installieren** ebenfalls einen Knopf, sobald der Browser es anbietet.
3. Merkwerk erscheint im Startmenü und kann an die Taskleiste angeheftet werden.

### Auf Android installieren (Chrome)
1. Die Adresse in **Chrome** öffnen.
2. Menü **⋮ → App installieren** (oder **Zum Startbildschirm hinzufügen**) → **Installieren**.
3. Das Merkwerk-Symbol liegt jetzt auf dem Startbildschirm.

**Updates:** Wenn du eine neue Version hochlädst, holt sich die App das Update beim nächsten Öffnen mit Internet und meldet „Merkwerk wurde aktualisiert“.

---

## B) Offline-Einzeldatei
`Merkwerk-Offline.html` per Doppelklick öffnen (am besten in Edge oder Chrome). Fertig. Alles ist in der einen Datei enthalten, auch die Formeldarstellung.
Lege die Datei an einen festen Ort (z. B. Dokumente) – wird sie verschoben, sieht der Browser sie als neue Seite mit leerem Speicher.

---

## Daten zwischen Handy und PC übertragen

Es gibt bewusst keine automatische Synchronisierung. Stattdessen:

- **Alles übertragen (mit Lernfortschritt):** *Einstellungen → Sicherung speichern* → Datei aufs andere Gerät bringen (z. B. per Mail, Cloud, USB) → dort *Einstellungen → Datei importieren*. **Achtung:** Eine Sicherung **ersetzt** alle Daten auf dem Zielgerät.
- **Nur Karten übertragen (ohne Fortschritt):** im Ordner *⋯ → Ordner exportieren* → auf dem anderen Gerät *⋯ → Hierher importieren*. Wird **hinzugefügt**.
- Am Handy bietet Merkwerk beim Export „Teilen“ an – so kannst du die Datei direkt an dich selbst schicken.

**Tipp:** Lerne hauptsächlich auf einem Gerät, oder übertrage die Sicherung immer in dieselbe Richtung, damit kein Fortschritt überschrieben wird. Mach außerdem ab und zu eine Sicherung – falls du Browserdaten löschst, sind die Karten sonst weg.

---

## Karten von Claude erstellen lassen

1. Lade deine Unterlagen in den Chat und bitte um Karten im **Merkwerk-Import-Format** (Vorlage siehe `IMPORT-FORMAT.md`, Abschnitt 5).
2. Die erhaltene `.json`-Datei in Merkwerk importieren: **Ordner → ⋯ → Importieren**.
3. Der Import-Bericht zeigt, wie viele Karten angekommen sind und ob etwas übersprungen wurde.

---

## Bedienung

### PC (Tastatur)
| Taste | Funktion |
|---|---|
| Leertaste | Karte umdrehen |
| 1 · 2 · 3 · 4 | Nochmal · Schwer · Gut · Leicht |
| → / ← / ↑ | „wischen“: gewusst / nochmal / schwer |
| Enter | Antwort prüfen bzw. vorgeschlagene Bewertung übernehmen |
| 1–9 | Multiple Choice: Antwort wählen |
| Zahl + Buchstabe | Zuordnen (z. B. 1 dann B) |
| ← / → | Wahr oder falsch |
| Zahl, dann ↑/↓ | Reihenfolge: Eintrag wählen und verschieben |
| H · S · E · Z | Tipp · Vorlesen · Bearbeiten · Rückgängig |
| Esc | Lernrunde beenden |
| L / N / / | Lernen starten (Heute) · Neue Karte · Suchen (Ordner) |
| Strg + Enter | Im Editor speichern |

### Handy (Gesten)
- **Tippen** auf die Karte dreht sie um
- **Nach rechts wischen** = gewusst, **nach links** = nochmal, **nach oben** = schwer
- Bei **Wahr/Falsch**: rechts = wahr, links = falsch
- Bei **Reihenfolge**: am Griff ziehen oder zwei Einträge nacheinander antippen, um sie zu tauschen

---

## Was die App für dich plant

- **Spaced Repetition (FSRS):** Jede Karte kommt kurz bevor du sie vergessen würdest. Die Knöpfe zeigen, wann die Karte je nach Bewertung wiederkommt.
- **Tagesziel & Serie:** Erreichst du dein Tagesziel, wächst deine Serie. Alle 7 Tage gibt's einen Freeze-Tag (max. 2), der einen ausgelassenen Tag rettet.
- **Prüfungsdatum** (Ordner bearbeiten): Wiederholungen werden so geplant, dass alles bis zur Prüfung sitzt; die Startseite zeigt einen Countdown und wie viele neue Karten pro Tag sinnvoll sind.
- **Interleaving:** Karten aus verschiedenen Ordnern werden gemischt (abschaltbar).
- **Kartentyp-Abwechslung:** Klassische Karten kommen manchmal als Eintipp- oder Multiple-Choice-Frage (abschaltbar).
- **Problemkarten:** Karten, die du oft vergisst, werden markiert – mit Tipps zum Umformulieren.
- **Herausforderungen:** Zeit-Challenge (60 Sekunden, Combos), Bossangriff (siehe unten) und Freies Üben (ohne Einfluss auf den Lernplan).
- **XP, Level & 29 Abzeichen**, Lernkalender und Statistiken.

---

## Fantasy-RPG (ab Version 1.1)

Im Menüpunkt **Held** erschaffst du einmalig deinen Helden: Name, Klasse und Aussehen (alles später unter *Held bearbeiten* änderbar).

| Klasse | Startwerte | Stärke der Klasse |
|---|---|---|
| Krieger | Stärke 5, Weisheit 2, Glück 2 | +15 % Grundschaden |
| Magier | Stärke 2, Weisheit 5, Glück 2 | Weisheits-Bonus ×1,5 |
| Waldläufer | Stärke 2, Weisheit 2, Glück 5 | Kritische Treffer ×2,5 statt ×2 |

**So funktioniert der Kampf**
- Es gibt immer einen Boss, der über mehrere Tage lebt. **Jede richtige Antwort** in einer Lernrunde ist ein Treffer. Den Lebensbalken siehst du auf der Startseite und oben in der Lernrunde.
- Schaden = Charakter-Level + **Stärke** + Schaden der angelegten Ausrüstung. **Weisheit** gibt Bonusschaden ab einer 5er-Combo und bei schweren Karten (Bewertung „Schwer“, oft vergessene oder schwierige Karten). **Glück** erhöht die Chance auf kritische Treffer und auf seltene Beute.
- Mit dem Standard-Tagesziel ist ein Boss in etwa 3–5 Tagen besiegt. Jeder weitere Boss hat 20 % mehr Lebenspunkte.
- **Bossangriff:** deine 10 schwersten Karten, 3 Leben. Einmal pro Tag zählt jeder Treffer doppelt. Er verändert deinen Lernplan nicht.
- Das bisherige XP-Level ist das Level deines Helden. Pro Levelaufstieg bekommst du **2 Fähigkeitspunkte**, die du im Held-Bereich verteilst (jederzeit neu verteilbar).
- **Rückgängig (Z)** nimmt auch den Schaden und das Gold der letzten Antwort zurück.

**Beute, Gold und Shop**
- Ein besiegter Boss hinterlässt eine **Truhe** mit Gold und 2–3 Ausrüstungsteilen, mindestens eines davon selten oder besser.
- Seltenheiten: **Gewöhnlich** (grau), **Selten** (blau), **Episch** (lila), **Legendär** (orange). Legendäre Teile sind etwa 5-mal so stark wie gewöhnliche.
- 5 Ausrüstungsplätze: Waffe, Helm, Rüstung, Schild, Amulett. Angelegte Teile erscheinen an deiner Figur. Im Inventar kannst du Teile vergleichen, anlegen und verkaufen.
- Gold bekommst du außerdem für jede richtige Antwort in Lernrunden (1 Gold) und für das erreichte Tagesziel (25 Gold).
- Im **Shop** kaufst du eine zufällige Ausrüstung der gewünschten Seltenheit: 60 / 150 / 400 / 1.000 Gold.
- Unter **Eigene Belohnungen** legst du echte Belohnungen mit einem Goldpreis an (z. B. „1 Folge meiner Serie – 120 Gold“) und kaufst sie dir, wenn du genug gespart hast. Der Verlauf zeigt alle Käufe.
- Held, Ausrüstung, Gold, Belohnungen und Verlauf sind Teil der **Sicherung** und werden beim Wiederherstellen mit übertragen.

---

## Probleme?

- **„Dein Browser blockiert den dauerhaften Speicher“:** passiert in privaten/Inkognito-Fenstern. Normales Fenster verwenden.
- **Installieren-Knopf fehlt:** Die App muss über `https://` geöffnet sein (nicht als Datei) und du musst Chrome bzw. Edge verwenden.
- **Vorlesen stumm:** Das Gerät braucht eine installierte Stimme für die Sprache (Android: Einstellungen → Text-in-Sprache; Windows: Einstellungen → Zeit und Sprache → Sprache).
