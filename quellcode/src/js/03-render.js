/* Text mit einfacher Formatierung und Formeln darstellen.
 * Unterstützt: **fett**, *kursiv*, ==markiert==, `code`, Zeilenumbrüche, $Formel$ und $$Formel$$ (LaTeX via KaTeX) */
function renderInline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\n/g, '<br>');
  return s;
}
function renderMath(tex, display) {
  try {
    if (window.katex) return window.katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
  } catch (e) { /* fällt auf Text zurück */ }
  return `<code>${escapeHtml(tex)}</code>`;
}
function renderRich(text) {
  if (text == null) return '';
  const parts = String(text).split(/(\$\$[\s\S]+?\$\$|(?<!\\)\$[^$\n]+?(?<!\\)\$)/g);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      if (p.startsWith('$$')) return renderMath(p.slice(2, -2), true);
      return renderMath(p.slice(1, -1), false);
    }
    return renderInline(p.replace(/\\\$/g, '$'));
  }).join('');
}
/** Klartext ohne Formatierung (für Listen, Vorlesen, Suche) */
function plainText(text) {
  return String(text ?? '').replace(/\$\$?([^$]+)\$\$?/g, '$1').replace(/\*\*|==|`/g, '').replace(/\{\{c\d+::([^}]*?)(::[^}]*)?\}\}/g, '$1');
}
function richEl(tag, text, cls) { return h(tag, { class: cls ? `rich ${cls}` : 'rich', html: renderRich(text) }); }

/* ---------- Bilder ---------- */
function mediaSrc(ref) {
  if (!ref) return '';
  if (ref.startsWith('media:')) return State.media.get(ref.slice(6)) || '';
  return ref;
}
function imgEl(ref, alt = '', cls = '') {
  const src = mediaSrc(ref);
  if (!src) return null;
  return h('img', { src, alt, class: cls, draggable: 'false', loading: 'lazy' });
}
function isImageRef(v) { return typeof v === 'string' && (v.startsWith('media:') || v.startsWith('data:image/')); }

/* ---------- Vorlesen (Text-to-Speech) ---------- */
const Speech = {
  available: () => 'speechSynthesis' in window,
  speak(text, lang) {
    if (!this.available() || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plainText(text));
    u.lang = lang || State.settings.ttsLang || 'de-DE';
    const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(u.lang.toLowerCase().slice(0, 2)));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  },
};
