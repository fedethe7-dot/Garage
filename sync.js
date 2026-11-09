/* =========================================================
   GARAGE — sync.js
   Sincronizzazione con Google Sheets (tramite Apps Script).
   L'app scrive sempre prima sul dispositivo; quando c'è
   internet invia le modifiche al foglio e riceve quelle
   fatte nel foglio.
   ========================================================= */

const Sync = {
  KEY: 'garage-sync',
  stato: 'off',      // off | ok | sync | errore | offline
  errore: '',
  _busy: false,
  _again: false,
  _t: null,

  cfg() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch (e) { return {}; }
  },
  saveCfg(c) {
    try { localStorage.setItem(this.KEY, JSON.stringify(c)); } catch (e) {}
  },
  attivo() { const c = this.cfg(); return !!(c.url && c.token); },

  init() {
    window.addEventListener('online', () => this.schedule(300));
    window.addEventListener('offline', () => this.setStato('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const c = this.cfg();
      if (!c.lastSync || Date.now() - new Date(c.lastSync).getTime() > 20000) this.schedule(300);
    });
    if (this.attivo()) { this.setStato(navigator.onLine ? 'ok' : 'offline'); this.schedule(500); }
    else this.setStato('off');
  },

  /** Avvia una sincronizzazione tra poco (raggruppa più modifiche ravvicinate) */
  schedule(ms = 1500) {
    if (!this.attivo()) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.run(), ms);
  },

  setStato(s, err = '') {
    this.stato = s; this.errore = err;
    if (typeof UI !== 'undefined' && UI.updateSyncIcon) UI.updateSyncIcon();
  },

  /** Prova il collegamento: risponde se URL e codice sono giusti */
  async test(url, token) {
    const res = await this._post(url, { token, changes: {} });
    if (!res.ok) throw new Error(res.error || 'Risposta non valida');
    return res;
  },

  async _post(url, body) {
    let r;
    try {
      // text/plain evita i blocchi CORS di Google
      r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
    } catch (e) {
      throw new Error('Impossibile raggiungere il foglio. Controlla la connessione e l\'indirizzo.');
    }
    const txt = await r.text();
    try { return JSON.parse(txt); }
    catch (e) {
      if (/accedi|sign in|login/i.test(txt)) throw new Error('Il foglio chiede l\'accesso: nel deployment imposta "Chi ha accesso: Chiunque".');
      throw new Error('Risposta non valida dal foglio (controlla l\'indirizzo /exec).');
    }
  },

  async run(manuale = false) {
    if (!this.attivo()) return;
    if (!navigator.onLine) { this.setStato('offline'); if (manuale) UI.toast('Sei offline: sincronizzerò appena torna la rete'); return; }
    if (this._busy) { this._again = true; return; }
    this._busy = true;
    this.soloFile = false;
    this.setStato('sync');
    const c = this.cfg();
    try {
      // i documenti che non si caricano NON bloccano più il resto: rifornimenti, spese ecc. arrivano comunque al foglio
      const erroriFile = await this.caricaFile(c);
      const escludi = c.tabelleNo || [];
      const { changes, sent, n } = DB.pending(!c.lastSync, escludi);
      const res = await this._post(c.url, { token: c.token, changes });
      if (!res.ok) throw new Error(res.error || 'Errore sconosciuto');
      const cambiati = await DB.mergeFromServer(res.data || {}, sent);
      const c2 = this.cfg();
      // tabelle che lo script del foglio non gestisce ancora: le riprovo ogni tanto
      const prima = (c2.tabelleNo || []).length;
      c2.tabelleNo = TABLES.filter(t => !Array.isArray((res.data || {})[t]));
      if (prima && !c2.tabelleNo.length) setTimeout(() => this.schedule(300), 0);
      if (c2.tabelleNo.length && (!c2.provaTabelle || Date.now() - c2.provaTabelle > 6 * 3600e3)) { c2.provaTabelle = Date.now(); c2.tabelleNo = []; }
      // il foglio (Garage Sync v4) manda i codici di mamma e Beatrice per i link d'invito di "La mia auto"
      if (res.codiciFamiglia) c2.codiciFamiglia = res.codiciFamiglia;
      c2.lastSync = new Date().toISOString();
      c2.ultimoInvio = n;
      this.saveCfg(c2);
      if (erroriFile.length) {
        const msg = `Dati sincronizzati ✓, ma ${erroriFile.length === 1 ? '1 documento non si è caricato' : erroriFile.length + ' documenti non si sono caricati'} su Drive (riprovo alla prossima): ${erroriFile[0]}`;
        this.soloFile = true;
        this.setStato('errore', msg);
        if (manuale) UI.toast(msg);
      } else {
        this.setStato('ok');
        if (manuale) UI.toast(cambiati || n ? `Sincronizzato ✓ (${n} inviati, ${cambiati} ricevuti)` : 'Già tutto aggiornato ✓');
      }
      if (cambiati) UI.refresh();
      // se ho corretto qualcosa arrivato dal foglio (es. date con l'ora), lo rimando subito: una volta sola
      const daRimandare = TABLES.some(t => (DB.data[t] || []).some(r => r._dirty && !r._file));
      if (daRimandare && !this._seguito) { this._seguito = true; setTimeout(() => this.schedule(500), 0); }
      else this._seguito = false;
    } catch (e) {
      this.setStato('errore', e.message);
      if (manuale) UI.toast('Errore: ' + e.message);
    } finally {
      this._busy = false;
      if (this._again) { this._again = false; this.schedule(300); }
    }
  },

  /** Carica su Google Drive i file dei documenti salvati sul dispositivo
      (foto, scansioni, PDF). Se un caricamento non riesce, riprova alla prossima sincronizzazione.
      Restituisce l'elenco degli errori (vuoto se è andato tutto bene). */
  async caricaFile(c) {
    const daCaricare = (DB.data.documenti || []).filter(d => d._file && !d.deleted);
    const errori = [];
    let caricati = 0;
    for (const d of daCaricare) {
      const m = /^data:([^;]*);base64,(.*)$/.exec(d._file);
      if (!m) continue;
      const nome = d.fileNome || d.titolo || 'Documento';
      try {
        const res = await this._post(c.url, {
          token: c.token, azione: 'caricaFile',
          veicoloId: d.veicoloId, nomeVeicolo: UI.nomeVeicolo(DB.get('veicoli', d.veicoloId)), categoria: d.categoria, cartella: d.cartella || '',
          nome, mime: m[1] || d.mime || 'application/octet-stream', base64: m[2],
          sostituisci: d._vecchioFile || ''
        });
        if (!res.ok) throw new Error(res.error || 'errore');
        // lo script vecchio risponde "ok" ma non salva il file: inutile provare gli altri
        if (!res.fileId) { errori.push('per caricare i documenti aggiorna lo script nel foglio Google (Garage Sync v3)'); break; }
        await DB.patch('documenti', d.id, { _file: undefined, _vecchioFile: undefined, fileId: res.fileId, url: res.url, fileNome: res.nome || d.fileNome });
        caricati++;
      } catch (e) {
        errori.push('«' + nome + '»: ' + e.message);
      }
    }
    if (caricati && typeof UI !== 'undefined') UI.refresh();
    return errori;
  },

  async collega(url, token) {
    url = url.trim(); token = token.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+\/exec/.test(url) && !/^http:\/\/localhost/.test(url)) {
      throw new Error('L\'indirizzo deve iniziare con https://script.google.com/ e finire con /exec');
    }
    await this.test(url, token);
    this.saveCfg({ url, token, lastSync: null });
    this.setStato('ok');
    await this.run();
    if (this.stato === 'errore' && !this.soloFile) throw new Error(this.errore);
  },

  scollega() {
    this.saveCfg({});
    this.setStato('off');
  }
};
