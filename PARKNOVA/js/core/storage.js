/* The ONLY file that touches localStorage. Swap these for fetch() when a backend is added.
   NOTE: localStorage is per-browser, not secure, and does not sync across devices. */
PN.storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(PN.config.prefix + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { console.error('Storage read failed', e); return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PN.config.prefix + key, JSON.stringify(value)); return true; }
    catch (e) { console.error('Storage write failed (quota?)', e); PN.toast && PN.toast('Storage is full. Remove some images.', 'error'); return false; }
  },
  remove(key) { localStorage.removeItem(PN.config.prefix + key); },
  clearAll() {
    Object.keys(localStorage).filter(k => k.startsWith(PN.config.prefix)).forEach(k => localStorage.removeItem(k));
  },
  /* Generic table helpers: each "table" is an array of records with an id */
  all(table) { return this.get(table, []); },
  find(table, id) { return this.all(table).find(r => r.id === id) || null; },
  where(table, fn) { return this.all(table).filter(fn); },
  insert(table, record) { const rows = this.all(table); rows.push(record); this.set(table, rows); return record; },
  update(table, id, changes) {
    const rows = this.all(table); const i = rows.findIndex(r => r.id === id);
    if (i < 0) return null; rows[i] = Object.assign({}, rows[i], changes); this.set(table, rows); return rows[i];
  },
  delete(table, id) { this.set(table, this.all(table).filter(r => r.id !== id)); }
};
