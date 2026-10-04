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
    this.setStato('sync');
    const c = this.cfg();
    try {
      const { changes, sent, n } = DB.pending(!c.lastSync);
      const res = await this._post(c.url, { token: c.token, changes });
      if (!res.ok) throw new Error(res.error || 'Errore sconosciuto');
      const cambiati = await DB.mergeFromServer(res.data || {}, sent);
      const c2 = this.cfg();
      c2.lastSync = new Date().toISOString();
      c2.ultimoInvio = n;
      this.saveCfg(c2);
      this.setStato('ok');
      if (cambiati) UI.refresh();
      if (manuale) UI.toast(cambiati || n ? `Sincronizzato ✓ (${n} inviati, ${cambiati} ricevuti)` : 'Già tutto aggiornato ✓');
    } catch (e) {
      this.setStato('errore', e.message);
      if (manuale) UI.toast('Errore: ' + e.message);
    } finally {
      this._busy = false;
      if (this._again) { this._again = false; this.schedule(300); }
    }
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
    if (this.stato === 'errore') throw new Error(this.errore);
  },

  scollega() {
    this.saveCfg({});
    this.setStato('off');
  }
};
