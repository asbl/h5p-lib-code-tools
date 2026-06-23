/**
 * Persists a CodeTools workspace in IndexedDB, with a small localStorage
 * fallback for browsers where IndexedDB is disabled. The state deliberately
 * stays local to the browser; it is not an H5P submission or an LMS upload.
 */
export default class WorkspaceAutosave {
  constructor(key, { debounceMs = 700 } = {}) {
    this.key = String(key || '').trim();
    this.debounceMs = debounceMs;
    this.timer = null;
    this.dbName = 'miniworlds-code-workspaces';
    this.storeName = 'workspaces';
    this.fallbackKey = `miniworlds:workspace:${this.key}`;
  }

  isEnabled() {
    return Boolean(this.key);
  }

  schedule(snapshot) {
    if (!this.isEnabled() || !snapshot) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(snapshot), this.debounceMs);
  }

  async save(snapshot) {
    if (!this.isEnabled() || !snapshot) return;
    const entry = { key: this.key, snapshot, updatedAt: Date.now(), version: 1 };

    try {
      const db = await this.open();
      await this.request(db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).put(entry));
      db.close();
    } catch {
      try { localStorage.setItem(this.fallbackKey, JSON.stringify(entry)); } catch { /* storage unavailable */ }
    }
  }

  async load() {
    if (!this.isEnabled()) return null;
    try {
      const db = await this.open();
      const entry = await this.request(db.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(this.key));
      db.close();
      return entry?.snapshot || null;
    } catch {
      try { return JSON.parse(localStorage.getItem(this.fallbackKey) || 'null')?.snapshot || null; } catch { return null; }
    }
  }

  open() {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName, { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  request(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  destroy() {
    clearTimeout(this.timer);
  }
}
