/* Beispielstapel mit allen 8 Kartentypen */
function svgData(svg) { return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); }

function demoDeck() {
  const labels = [['Zellwand', 60], ['Zellkern', 120], ['Chloroplast', 180], ['Vakuole', 240], ['Mitochondrium', 300], ['Zellmembran', 360]];
  const targets = [[388, 70], [178, 112], [312, 96], [300, 220], [212, 296], [374, 330]];
  const cell = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" font-family="Segoe UI, Roboto, sans-serif">
  <rect width="600" height="400" fill="#ffffff"/>
  <rect x="50" y="35" width="345" height="320" rx="44" fill="#e9f6e4" stroke="#3b7d3b" stroke-width="10"/>
  <rect x="64" y="49" width="317" height="292" rx="34" fill="none" stroke="#8cc48c" stroke-width="4"/>
  <ellipse cx="255" cy="215" rx="88" ry="66" fill="#cfe5ff" stroke="#6d9bd1" stroke-width="3"/>
  <circle cx="140" cy="118" r="46" fill="#dccaf2" stroke="#7a5bd6" stroke-width="4"/><circle cx="150" cy="110" r="13" fill="#9d7fe0"/>
  <ellipse cx="312" cy="96" rx="34" ry="17" fill="#55b355" stroke="#2f7d2f" stroke-width="3" transform="rotate(-18 312 96)"/>
  <ellipse cx="118" cy="268" rx="30" ry="15" fill="#55b355" stroke="#2f7d2f" stroke-width="3" transform="rotate(24 118 268)"/>
  <ellipse cx="212" cy="296" rx="30" ry="15" fill="#f2a35f" stroke="#c4732f" stroke-width="3"/>
  <path d="M190 296c8-8 14 8 22 0s14 8 22 0" stroke="#c4732f" stroke-width="2.5" fill="none"/>
  ${labels.map(([t, y], i) => `<line x1="${targets[i][0]}" y1="${targets[i][1]}" x2="425" y2="${y}" stroke="#1C2740" stroke-width="1.6"/><circle cx="${targets[i][0]}" cy="${targets[i][1]}" r="3.5" fill="#1C2740"/><text x="432" y="${y + 7}" font-size="21" fill="#1C2740">${t}</text>`).join('')}
</svg>`);
  const shape = (inner) => svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="16" fill="#F6F8FB"/>${inner}</svg>`);
  const circle = shape('<circle cx="60" cy="60" r="38" fill="#2F5BEA"/>');
  const tri = shape('<path d="M60 20 102 96H18z" fill="#179C6B"/>');
  const square = shape('<rect x="24" y="24" width="72" height="72" fill="#D98A1C"/>');
  const hexagon = shape('<path d="M60 18 97 39v42l-37 21-37-21V39z" fill="#D6404A"/>');

  return {
    format: 'merkwerk', version: 1, kind: 'deck',
    folders: [
      { path: 'Beispielstapel', emoji: '⭐' },
      { path: 'Beispielstapel/Biologie', emoji: '🧬', color: '#179C6B' },
      { path: 'Beispielstapel/Geografie', emoji: '🌍', color: '#0E9AA7' },
      { path: 'Beispielstapel/Mathematik', emoji: '📐', color: '#2F5BEA' },
      { path: 'Beispielstapel/Englisch', emoji: '🇬🇧', color: '#D6404A', lang: 'en-GB' },
    ],
    cards: [
      { type: 'occlusion', folder: 'Beispielstapel/Biologie', image: cell, prompt: 'Pflanzenzelle: Wie heißt der markierte Teil?',
        masks: labels.map(([t, y], i) => ({ id: `m${i + 1}`, x: 425 / 600, y: (y - 18) / 400, w: 168 / 600, h: 34 / 400, label: t })) },
      { type: 'typing', folder: 'Beispielstapel/Biologie', question: 'Wie heißt das „Kraftwerk“ der Zelle?', answer: 'Mitochondrium', alternatives: ['Mitochondrien', 'Mitochondrion'], note: 'Mitochondrien erzeugen ATP durch Zellatmung.' },
      { type: 'mc', folder: 'Beispielstapel/Biologie', question: 'In welcher Organelle findet die Fotosynthese statt?', options: ['Chloroplast', 'Zellkern', 'Ribosom', 'Vakuole'], correct: ['Chloroplast'], explanation: 'Chloroplasten enthalten das grüne Chlorophyll.' },
      { type: 'match', folder: 'Beispielstapel/Biologie', prompt: 'Ordne jeder Organelle ihre Aufgabe zu.', pairs: [
        { left: 'Zellkern', right: 'enthält die Erbinformation (DNA)' }, { left: 'Ribosom', right: 'baut Proteine' },
        { left: 'Mitochondrium', right: 'gewinnt Energie (ATP)' }, { left: 'Vakuole', right: 'speichert Wasser und Stoffe' }] },
      { type: 'order', folder: 'Beispielstapel/Biologie', prompt: 'Bringe die Phasen der Mitose in die richtige Reihenfolge.', items: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'], note: 'Eselsbrücke: **P**apa **M**acht **A**bends **T**ee.' },
      { type: 'basic', folder: 'Beispielstapel/Geografie', front: 'Hauptstadt von Australien?', back: 'Canberra', hint: 'Es ist nicht Sydney.', note: 'Canberra wurde als Kompromiss zwischen Sydney und Melbourne gegründet.' },
      { type: 'truefalse', folder: 'Beispielstapel/Geografie', statement: 'Der Großglockner ist der höchste Berg Österreichs.', answer: true, explanation: 'Mit 3.798 m ist er der höchste Gipfel Österreichs.' },
      { type: 'truefalse', folder: 'Beispielstapel/Geografie', statement: 'Die Donau mündet in die Nordsee.', answer: false, explanation: 'Sie mündet ins Schwarze Meer.' },
      { type: 'cloze', folder: 'Beispielstapel/Geografie', text: 'Österreich hat {{9|neun}} Bundesländer. Die Landeshauptstadt von Tirol ist {{Innsbruck}}.' },
      { type: 'basic', folder: 'Beispielstapel/Mathematik', front: 'Satz des Pythagoras', back: '$a^2 + b^2 = c^2$\n(im rechtwinkligen Dreieck, $c$ = Hypotenuse)' },
      { type: 'mc', folder: 'Beispielstapel/Mathematik', question: 'Was ist die Ableitung von $f(x) = x^2$?', options: ['$2x$', '$x$', '$2$', '$\\frac{x^3}{3}$'], correct: [0], explanation: 'Potenzregel: $(x^n)\' = n \\cdot x^{n-1}$' },
      { type: 'match', folder: 'Beispielstapel/Mathematik', prompt: 'Ordne die Formen ihren Namen zu.', pairs: [
        { left: circle, right: 'Kreis' }, { left: tri, right: 'Dreieck' }, { left: square, right: 'Quadrat' }, { left: hexagon, right: 'Sechseck' }] },
      { type: 'order', folder: 'Beispielstapel/Mathematik', prompt: 'Ordne von klein nach groß.', items: ['$\\frac{1}{3}$', '$0{,}4$', '$\\frac{1}{2}$', '$0{,}75$'] },
      { type: 'basic', folder: 'Beispielstapel/Englisch', front: 'nachhaltig', back: 'sustainable', reverse: true },
      { type: 'basic', folder: 'Beispielstapel/Englisch', front: 'zuverlässig', back: 'reliable', reverse: true },
      { type: 'basic', folder: 'Beispielstapel/Englisch', front: 'die Bibliothek', back: 'the library', reverse: true, note: 'Achtung, falscher Freund: *library* ≠ Buchhandlung (*bookshop*).' },
      { type: 'typing', folder: 'Beispielstapel/Englisch', question: 'Übersetze: **die Erfahrung**', answer: 'experience', alternatives: ['the experience'] },
    ],
  };
}
