// Capa de almacenamiento. Misma API para IndexedDB (producción) y memoria (tests).
export const STORES = ['logs', 'routines', 'plans', 'customExercises', 'settings'];
const DB_NAME = 'mimiGym';
const DB_VERSION = 1;

function req(r) {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export class IdbAdapter {
  constructor() { this.db = null; }

  async open() {
    this.db = await new Promise((res, rej) => {
      const o = indexedDB.open(DB_NAME, DB_VERSION);
      o.onupgradeneeded = () => {
        const db = o.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) {
            db.createObjectStore(s, { keyPath: s === 'settings' ? 'key' : 'id' });
          }
        }
      };
      o.onsuccess = () => res(o.result);
      o.onerror = () => rej(o.error);
      o.onblocked = () => rej(new Error('IndexedDB bloqueada por otra pestaña'));
    });
    return this;
  }

  async getAll(store) {
    return req(this.db.transaction(store).objectStore(store).getAll());
  }
  async get(store, key) {
    return req(this.db.transaction(store).objectStore(store).get(key));
  }
  async put(store, value) {
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    return new Promise((res, rej) => { tx.oncomplete = () => res(value); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  }
  async putMany(store, values) {
    const tx = this.db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    values.forEach(v => os.put(v));
    return new Promise((res, rej) => { tx.oncomplete = () => res(values.length); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  }
  async delete(store, key) {
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  }
  async clear(store) {
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  }
}

export class MemoryAdapter {
  constructor() { this.data = {}; STORES.forEach(s => this.data[s] = new Map()); }
  keyOf(store, v) { return store === 'settings' ? v.key : v.id; }
  async open() { return this; }
  async getAll(store) { return structuredClone([...this.data[store].values()]); }
  async get(store, key) { const v = this.data[store].get(key); return v === undefined ? undefined : structuredClone(v); }
  async put(store, v) { this.data[store].set(this.keyOf(store, v), structuredClone(v)); return v; }
  async putMany(store, vs) { vs.forEach(v => this.data[store].set(this.keyOf(store, v), structuredClone(v))); return vs.length; }
  async delete(store, key) { this.data[store].delete(key); }
  async clear(store) { this.data[store].clear(); }
}
