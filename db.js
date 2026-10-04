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
    r._dirty = true;   // da inviare al foglio Google
    await this._put(table, r);
    const arr = this.data[table];
    const i = arr.findIndex(x => x.id === r.id);
    if (i >= 0) arr[i] = r; else arr.push(r);
    if (typeof Sync !== 'undefined') Sync.schedule();
    return r;
  },

  /** Eliminazione "morbida": il record resta marcato come eliminato
      così la sincronizzazione futura saprà di doverlo cancellare anche dal foglio */
  async remove(table, id) {
    const arr = this.data[table];
    const i = arr.findIndex(x => x.id === id);
    if (i < 0) return;
    const r = { ...arr[i], deleted: true, _dirty: true, updatedAt: new Date().toISOString() };
    if (table === 'veicoli') delete r.foto;
    await this._put(table, r);
    arr[i] = r;
    if (typeof Sync !== 'undefined') Sync.schedule();
  },

  _delete(table, id) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(table, 'readwrite');
      tx.objectStore(table).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Unisce i dati arrivati dal foglio Google.
      sent = {id: updatedAt} dei record inviati in questa sincronizzazione */
  async mergeFromServer(server, sent) {
    let cambiati = 0;
    for (const t of TABLES) {
      const srv = server[t] || [];
      const sMap = {};
      srv.forEach(r => sMap[r.id] = r);
      const keep = [];
      for (const loc of this.data[t]) {
        const inviato = sent[t] && sent[t][loc.id] === loc.updatedAt;
        const cambiatoNelFrattempo = loc._dirty && !inviato;
        const s = sMap[loc.id];
        delete sMap[loc.id];
        if (cambiatoNelFrattempo) { keep.push(loc); continue; }       // lo invierà la prossima volta
        if (loc.deleted) { await this._delete(t, loc.id); cambiati++; continue; } // eliminazione confermata
        if (!s) {
          if (loc._sync || inviato) { await this._delete(t, loc.id); cambiati++; continue; } // eliminato nel foglio
          keep.push(loc); continue;
        }
        const nuovo = { ...s, deleted: false, _sync: true, _dirty: false };
        if (t === 'veicoli' && loc.foto) nuovo.foto = loc.foto;      // la foto resta solo sul dispositivo
        if (s.updatedAt !== loc.updatedAt || loc._dirty || !loc._sync) { await this._put(t, nuovo); if (s.updatedAt !== loc.updatedAt) cambiati++; }
        keep.push(nuovo);
      }
      for (const id in sMap) {   // nuovi record arrivati dal foglio
        const nuovo = { ...sMap[id], deleted: false, _sync: true, _dirty: false };
        await this._put(t, nuovo); keep.push(nuovo); cambiati++;
      }
      this.data[t] = keep;
    }
    return cambiati;
  },

  /** Record da inviare al foglio */
  pending(all) {
    const out = {}, sent = {};
    let n = 0;
    for (const t of TABLES) {
      out[t] = []; sent[t] = {};
      for (const r of this.data[t]) {
        if (!(all || r._dirty)) continue;
        if (r.deleted && !r._sync && !all) {   // creato ed eliminato senza mai sincronizzare
          out[t].push({ id: r.id, deleted: true, updatedAt: r.updatedAt });
        } else {
          const { foto, _dirty, _sync, ...pulito } = r;
          out[t].push(pulito);
        }
        sent[t][r.id] = r.updatedAt; n++;
      }
    }
    return { changes: out, sent, n };
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
    const dati = {};
    for (const t of TABLES) dati[t] = this.data[t].filter(r => !r.deleted).map(({ _dirty, _sync, ...r }) => r);
    return JSON.stringify({ app: 'Garage', versione: 2, esportatoIl: new Date().toISOString(), dati }, null, 1);
  },

  async importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || !obj.dati) throw new Error('File non valido');
    for (const t of TABLES) {
      await this._clear(t);
      const rows = (Array.isArray(obj.dati[t]) ? obj.dati[t] : []).map(r => ({ ...r, _dirty: true }));
      for (const r of rows) await this._put(t, r);
      this.data[t] = rows;
    }
    if (typeof Sync !== 'undefined') Sync.schedule();
  }
};
