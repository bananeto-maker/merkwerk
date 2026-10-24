/* Import & Export: Kartenstapel (ohne Fortschritt) und vollständige Sicherung (mit Fortschritt) */
const FORMAT = 'merkwerk';
const IO = {
  /** Kartenstapel eines Ordners (inkl. Unterordner) – oder alles, wenn folderId null ist */
  exportDeck(folderId = null) {
    const folderIds = folderId ? Store.descendantIds(folderId) : Array.from(State.folders.keys());
    const baseDepth = folderId ? Store.folderPath(folderId).length - 1 : 0;
    const relPath = (id) => Store.folderPath(id).slice(baseDepth).map((f) => f.name.replace(/\//g, '-')).join('/');
    const folders = folderIds.map((id) => {
      const f = State.folders.get(id);
      return { path: relPath(id), emoji: f.emoji || null, color: f.color || null, examDate: f.examDate || null, lang: f.lang || null };
    });
    const media = {};
    const seenGroups = new Set();
    const cards = [];
    for (const c of Store.cardsIn(folderId)) {
      if (c.type === 'occlusion' && c.groupId) {
        if (seenGroups.has(c.groupId)) continue;
        seenGroups.add(c.groupId);
      }
      const data = deepClone(c.data);
      if (c.type === 'occlusion') delete data.target;
      collectMediaRefs(data, { add: (id) => { if (State.media.has(id)) media[id] = State.media.get(id); } });
      cards.push({ type: c.type, folder: relPath(c.folderId), ...data, ...(c.tags?.length ? { tags: c.tags } : {}) });
    }
    return { format: FORMAT, version: 1, kind: 'deck', exported: new Date().toISOString(), folders, cards, media };
  },

  async exportBackup() {
    const logs = await Store.getLogs();
    return {
      format: FORMAT, version: 1, kind: 'backup', exported: new Date().toISOString(), app: APP_VERSION,
      folders: Array.from(State.folders.values()),
      cards: Array.from(State.cards.values()),
      media: Object.fromEntries(State.media),
      logs, profile: State.profile, settings: State.settings,
    };
  },

  parse(text) {
    let json;
    try { json = JSON.parse(String(text).replace(/^﻿/, '')); }
    catch (e) { throw new Error('Die Datei ist kein gültiges JSON. Prüfe, ob sie vollständig ist (z. B. fehlende Klammern oder Kommas).'); }
    if (Array.isArray(json)) json = { cards: json };
    if (!json || typeof json !== 'object') throw new Error('Unbekanntes Dateiformat.');
    if (json.kind === 'backup') {
      if (!Array.isArray(json.cards) || !Array.isArray(json.folders)) throw new Error('Die Sicherung ist unvollständig (Karten oder Ordner fehlen).');
      return json;
    }
    if (!Array.isArray(json.cards)) throw new Error('In der Datei fehlt die Liste "cards" mit den Karten.');
    return json;
  },

  /** Importiert einen Kartenstapel in den Zielordner (null = oberste Ebene). */
  async importDeck(json, targetFolderId = null) {
    const report = { cards: 0, folders: 0, skipped: [], warnings: [] };
    const folderCountBefore = State.folders.size;
    const media = json.media || {};
    const resolve = (v) => {
      if (typeof v === 'string') {
        if (v.startsWith('media:')) {
          const id = v.slice(6);
          if (media[id]) return media[id];
          if (State.media.has(id)) return v;
          report.warnings.push(`Bild "${id}" fehlt in der Datei und wurde weggelassen.`);
          return null;
        }
        return v;
      }
      if (Array.isArray(v)) return v.map(resolve);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
      return v;
    };
    for (const f of json.folders || []) {
      const path = f.path || f.name;
      if (!path) continue;
      const id = await Store.folderByPath(path, targetFolderId);
      const patch = {};
      for (const k of ['emoji', 'color', 'examDate', 'lang']) if (f[k]) patch[k] = f[k];
      if (Object.keys(patch).length) await Store.updateFolder(id, patch);
    }
    let fallbackFolder = targetFolderId;
    for (let i = 0; i < json.cards.length; i++) {
      const raw = json.cards[i];
      try {
        if (!raw || typeof raw !== 'object') throw new Error('Eintrag ist kein Objekt.');
        const type = raw.type || 'basic';
        if (!CardTypes[type]) throw new Error(`Unbekannter Kartentyp "${type}". Erlaubt: ${TYPE_ORDER.join(', ')}.`);
        let folderId;
        const path = raw.folder || raw.deck || json.folder;
        if (path) folderId = await Store.folderByPath(path, targetFolderId);
        else {
          if (!fallbackFolder) fallbackFolder = await Store.folderByPath(json.title || json.name || 'Importiert', null);
          folderId = fallbackFolder;
        }
        const { type: _t, folder: _f, deck: _d, tags, ...data } = raw;
        const created = await Store.createCards(type, folderId, resolve(data), { silent: true, tags: Array.isArray(tags) ? tags : [] });
        report.cards += created.length;
      } catch (e) {
        report.skipped.push({ index: i + 1, reason: e.message });
      }
    }
    report.folders = State.folders.size - folderCountBefore;
    if (report.cards) {
      State.profile.totals.imports++;
      State.profile.totals.created += report.cards;
      await Store.saveProfile();
    }
    Bus.emit('data');
    Badges.evaluate();
    return report;
  },

  /** Stellt eine vollständige Sicherung wieder her (ersetzt alle Daten). */
  async restoreBackup(json) {
    await DB.clearAll();
    await DB.putMany('folders', json.folders);
    await DB.putMany('cards', json.cards.map((c) => ({ ...c, srs: c.srs || FSRS.newState() })));
    await DB.putMany('media', Object.entries(json.media || {}).map(([id, data]) => ({ id, data })));
    await DB.putMany('logs', json.logs || []);
    await DB.put('meta', { key: 'profile', value: mergeProfile(json.profile) });
    await DB.put('meta', { key: 'settings', value: { ...DEFAULT_SETTINGS, ...(json.settings || {}), onboarded: true } });
    await Store.load();
    Bus.emit('data'); Bus.emit('profile');
    return { cards: json.cards.length, folders: json.folders.length };
  },

  /** Schnellimport aus Text: eine Karte pro Zeile, "Frage ; Antwort" (auch Tab oder " :: ") */
  parseText(text) {
    const cards = [], errors = [];
    String(text).split(/\r?\n/).forEach((line, i) => {
      const l = line.trim();
      if (!l || l.startsWith('#')) return;
      const sep = l.includes('\t') ? '\t' : l.includes(' :: ') ? ' :: ' : l.includes(';') ? ';' : null;
      if (!sep) { errors.push(`Zeile ${i + 1}: kein Trennzeichen (; oder Tab) gefunden`); return; }
      const idx = l.indexOf(sep);
      const front = l.slice(0, idx).trim(), back = l.slice(idx + sep.length).trim();
      if (!front || !back) { errors.push(`Zeile ${i + 1}: Frage oder Antwort fehlt`); return; }
      cards.push({ type: 'basic', front, back });
    });
    return { cards, errors };
  },

  fileName(base, kind) {
    const safe = String(base || 'merkwerk').normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'merkwerk';
    return `${safe}-${kind}-${dayKey()}.json`;
  },
};
