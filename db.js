/* =========================================================
   GARAGE — db.js
   Database locale (IndexedDB). Tutti i dati restano sul dispositivo.
   Ogni record ha: id, updatedAt, deleted (servono alla futura
   sincronizzazione con Google Sheets).
   ========================================================= */

const DB_NAME = 'garage-db';
const DB_VERSION = 3;
const TABLES = ['veicoli', 'rifornimenti', 'manutenzioni', 'spese', 'bolli', 'assicurazioni', 'documenti', 'viaggi'];

/* Date: l'app usa sempre AAAA-MM-GG. Se ne arriva una con l'ora (es. "2026-10-28T23:00:00.000Z",
   che è la mezzanotte del 29 in Italia) la riporto al giorno giusto, sul telefono. */
const CAMPI_DATA = ['data', 'dataFine', 'dataPagamento', 'periodoDa', 'periodoA', 'scadenza', 'inizio', 'prossimaData', 'sospesaDal', 'riattivoPrevisto'];
function giornoLocale(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d)) return v.slice(0, 10);
  const z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
/** Sistema le date di un record; restituisce true se ne ha cambiata qualcuna */
function sistemaDate(r) {
  let cambiato = false;
  for (const k of CAMPI_DATA) { const x = giornoLocale(r[k]); if (x !== r[k]) { r[k] = x; cambiato = true; } }
  return cambiato;
}

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
    for (const t of TABLES) {
      this.data[t] = await this._getAll(t);
      // date con l'ora dentro: le correggo e le rimando al foglio già giuste
      for (const r of this.data[t]) if (sistemaDate(r)) { r._dirty = true; r.updatedAt = new Date().toISOString(); await this._put(t, r); }
    }
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
    sistemaDate(r);
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

  /** Aggiorna un record già salvato (es. dopo il caricamento del file su Drive) */
  async patch(table, id, changes) {
    const arr = this.data[table];
    const i = arr.findIndex(x => x.id === id);
    if (i < 0) return null;
    const r = { ...arr[i], ...changes, updatedAt: new Date().toISOString(), _dirty: true };
    Object.keys(r).forEach(k => r[k] === undefined && delete r[k]);
    await this._put(table, r);
    arr[i] = r;
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
      // se lo script del foglio non conosce ancora questa tabella (es. viaggi), i dati restano sul dispositivo
      if (!Array.isArray(server[t])) continue;
      const srv = server[t];
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
        // data arrivata dal foglio con l'ora dentro: la correggo e la rimando giusta
        if (sistemaDate(nuovo)) { nuovo._dirty = true; nuovo.updatedAt = new Date().toISOString(); }
        if (t === 'veicoli' && loc.foto) nuovo.foto = loc.foto;      // la foto resta solo sul dispositivo
        if (s.updatedAt !== loc.updatedAt || loc._dirty || !loc._sync) { await this._put(t, nuovo); if (s.updatedAt !== loc.updatedAt) cambiati++; }
        keep.push(nuovo);
      }
      for (const id in sMap) {   // nuovi record arrivati dal foglio
        const nuovo = { ...sMap[id], deleted: false, _sync: true, _dirty: false };
        if (sistemaDate(nuovo)) { nuovo._dirty = true; nuovo.updatedAt = new Date().toISOString(); }
        await this._put(t, nuovo); keep.push(nuovo); cambiati++;
      }
      this.data[t] = keep;
    }
    return cambiati;
  },

  /** Record da inviare al foglio */
  pending(all, escludi = []) {
    const out = {}, sent = {};
    let n = 0;
    for (const t of TABLES) {
      if (escludi.includes(t)) continue;
      out[t] = []; sent[t] = {};
      for (const r of this.data[t]) {
        if (!(all || r._dirty)) continue;
        if (r._file && !r.deleted) continue;   // documento il cui file non è ancora su Drive
        if (r.deleted && !r._sync && !all) {   // creato ed eliminato senza mai sincronizzare
          out[t].push({ id: r.id, deleted: true, updatedAt: r.updatedAt });
        } else {
          const { foto, _dirty, _sync, _file, _vecchioFile, ...pulito } = r;
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
    const ora = new Date().toISOString();
    for (const t of TABLES) {
      // data di modifica = adesso, così il foglio prende la versione del backup
      const rows = (Array.isArray(obj.dati[t]) ? obj.dati[t] : []).map(r => ({ ...r, _dirty: true, updatedAt: ora }));
      const nelBackup = new Set(rows.map(r => r.id));
      // quello che è già nel foglio ma non nel backup va eliminato anche dal foglio,
      // altrimenti con la sincronizzazione tornerebbe indietro
      const daTogliere = (this.data[t] || []).filter(r => r._sync && !r.deleted && !nelBackup.has(r.id))
        .map(r => { const { foto, _file, ...x } = r; return { ...x, deleted: true, _dirty: true, updatedAt: ora }; });
      // i record già presenti nel foglio restano "sincronizzati": il foglio li aggiorna invece di duplicarli
      const giaNelFoglio = new Set((this.data[t] || []).filter(r => r._sync).map(r => r.id));
      rows.forEach(r => { if (giaNelFoglio.has(r.id)) r._sync = true; });
      await this._clear(t);
      for (const r of rows.concat(daTogliere)) await this._put(t, r);
      this.data[t] = rows.concat(daTogliere);
    }
    if (typeof Sync !== 'undefined') Sync.schedule();
  }
};
