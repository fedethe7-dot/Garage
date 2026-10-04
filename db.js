/* =========================================================
   GARAGE — db.js
   Database locale (IndexedDB). Tutti i dati restano sul dispositivo.
   Ogni record ha: id, updatedAt, deleted (servono alla futura
   sincronizzazione con Google Sheets).
   ========================================================= */

const DB_NAME = 'garage-db';
const DB_VERSION = 1;
const TABLES = ['veicoli', 'rifornimenti', 'manutenzioni', 'spese', 'bolli', 'assicurazioni'];

const DB = {
  _db: null,
  data: {},   // copia in memoria di tutte le tabelle

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        TABLES.forEach(t => {
          if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' });
        });
      };
      req.onsuccess = () => { this._db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  },

  async loadAll() {
    for (const t of TABLES) this.data[t] = await this._getAll(t);
  },

  _getAll(table) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(table, 'readonly');
      const req = tx.objectStore(table).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  _put(table, rec) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(table, 'readwrite');
      tx.objectStore(table).put(rec);
      tx.oncomplete = () => resolve(rec);
      tx.onerror = () => reject(tx.error);
    });
  },

  _clear(table) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(table, 'readwrite');
      tx.objectStore(table).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  },

  /** Record attivi (non eliminati) di una tabella */
  list(table) {
    return (this.data[table] || []).filter(r => !r.deleted);
  },

  get(table, id) {
    return (this.data[table] || []).find(r => r.id === id && !r.deleted);
  },

  async save(table, rec) {
    const r = { ...rec };
    if (!r.id) r.id = this.newId();
    r.updatedAt = new Date().toISOString();
    r.deleted = false;
    await this._put(table, r);
    const arr = this.data[table];
    const i = arr.findIndex(x => x.id === r.id);
    if (i >= 0) arr[i] = r; else arr.push(r);
    return r;
  },

  /** Eliminazione "morbida": il record resta marcato come eliminato
      così la sincronizzazione futura saprà di doverlo cancellare anche dal foglio */
  async remove(table, id) {
    const arr = this.data[table];
    const i = arr.findIndex(x => x.id === id);
    if (i < 0) return;
    const r = { ...arr[i], deleted: true, updatedAt: new Date().toISOString() };
    if (table === 'veicoli') delete r.foto;
    await this._put(table, r);
    arr[i] = r;
  },

  /** Elimina un veicolo e tutti i suoi dati collegati */
  async removeVehicle(id) {
    for (const t of TABLES) {
      if (t === 'veicoli') continue;
      for (const r of this.list(t).filter(x => x.veicoloId === id)) await this.remove(t, r.id);
    }
    await this.remove('veicoli', id);
  },

  exportJSON() {
    return JSON.stringify({ app: 'Garage', versione: 1, esportatoIl: new Date().toISOString(), dati: this.data }, null, 1);
  },

  async importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || !obj.dati) throw new Error('File non valido');
    for (const t of TABLES) {
      await this._clear(t);
      const rows = Array.isArray(obj.dati[t]) ? obj.dati[t] : [];
      for (const r of rows) await this._put(t, r);
      this.data[t] = rows;
    }
  }
};
