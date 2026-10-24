/* Speicherung in IndexedDB (mit Notfall-Speicher im Arbeitsspeicher, falls der Browser IndexedDB blockiert) */
const DB = {
  db: null,
  mem: null,
  STORES: ['folders', 'cards', 'media', 'logs', 'meta'],

  async open() {
    if (this.db) return true;
    if (this.mem) return false;
    try {
      if (!('indexedDB' in window)) throw new Error('kein IndexedDB');
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('merkwerk', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains('folders')) d.createObjectStore('folders', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('cards')) d.createObjectStore('cards', { keyPath: 'id' }).createIndex('folderId', 'folderId');
          if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('logs')) {
            const l = d.createObjectStore('logs', { keyPath: 'id' });
            l.createIndex('ts', 'ts');
            l.createIndex('cardId', 'cardId');
          }
          if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(new Error('Datenbank blockiert'));
      });
      this.db.onversionchange = () => this.db.close();
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
      return true;
    } catch (e) {
      this.mem = Object.fromEntries(this.STORES.map((s) => [s, new Map()]));
      return false;
    }
  },

  _tx(stores, mode, fn) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction(stores, mode);
      let out;
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('Speichern abgebrochen'));
      out = fn(tx);
    });
  },

  async getAll(store) {
    if (this.mem) return Array.from(this.mem[store].values()).map(deepClone);
    return this._tx([store], 'readonly', (tx) => {
      const holder = [];
      tx.objectStore(store).getAll().onsuccess = (e) => holder.push(...e.target.result);
      return holder;
    });
  },
  async get(store, key) {
    if (this.mem) return deepClone(this.mem[store].get(key));
    return this._tx([store], 'readonly', (tx) => {
      const holder = { v: undefined };
      tx.objectStore(store).get(key).onsuccess = (e) => { holder.v = e.target.result; };
      return holder;
    }).then((h2) => h2.v);
  },
  async put(store, obj) { return this.putMany(store, [obj]); },
  async putMany(store, arr) {
    if (!arr.length) return;
    if (this.mem) { arr.forEach((o) => this.mem[store].set(o.id ?? o.key, deepClone(o))); return; }
    return this._tx([store], 'readwrite', (tx) => { const s = tx.objectStore(store); arr.forEach((o) => s.put(o)); });
  },
  async del(store, key) { return this.delMany(store, [key]); },
  async delMany(store, keys) {
    if (!keys.length) return;
    if (this.mem) { keys.forEach((k) => this.mem[store].delete(k)); return; }
    return this._tx([store], 'readwrite', (tx) => { const s = tx.objectStore(store); keys.forEach((k) => s.delete(k)); });
  },
  async clearAll() {
    if (this.mem) { this.STORES.forEach((s) => this.mem[s].clear()); return; }
    return this._tx(this.STORES, 'readwrite', (tx) => { this.STORES.forEach((s) => tx.objectStore(s).clear()); });
  },
};
