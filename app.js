/* =========================================================
   GARAGE — app.js
   Interfaccia: schermate, moduli, navigazione.
   ========================================================= */

const APP_VERSION = '1.0.0';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  fuel: '<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 8h5M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/></svg>',
  wrench: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8a2.8 2.8 0 0 1-4-4l8-8-1.3-1.3a4 4 0 0 0-5-5l2.6 2.6-2.1 2.1z" transform="translate(-2 0)"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-9v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  sheet: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" style="width:18px;height:18px;opacity:.5"><path d="M9 6l6 6-6 6"/></svg>'
};

const UI = {
  state: {
    statPeriodo: 'mese', statVeicolo: 'tutti', statCustom: {},
    vehTab: 'panoramica', ultimoVeicolo: null
  },

  /* ---------- Avvio ---------- */
  async init() {
    try {
      const s = JSON.parse(localStorage.getItem('garage-ui') || '{}');
      Object.assign(this.state, s);
    } catch (e) {}
    await DB.open();
    await DB.loadAll();

    window.addEventListener('hashchange', () => this.render());
    document.addEventListener('click', e => this.onClick(e));
    $('#btnAdd').onclick = () => this.quickAdd();
    $('#btnTheme').onclick = () => this.toggleTheme();
    $('#btnBack').onclick = () => history.length > 1 ? history.back() : (location.hash = '#home');
    $('#sheetClose').onclick = () => this.closeSheet();
    $('#sheetBackdrop').onclick = () => this.closeSheet();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeSheet(); });
    this.updateThemeIcon();
    this.render();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  saveUi() {
    try { localStorage.setItem('garage-ui', JSON.stringify(this.state)); } catch (e) {}
  },

  /* ---------- Tema ---------- */
  isDark() {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  setTheme(t) {
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try { localStorage.setItem('garage-tema', t); } catch (e) {}
    this.updateThemeIcon();
    this.render();
  },
  toggleTheme() { this.setTheme(this.isDark() ? 'light' : 'dark'); },
  updateThemeIcon() {
    $('#btnTheme').innerHTML = this.isDark() ? ICON.sun : ICON.moon;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = this.isDark() ? '#0e1014' : '#f3f4f7';
  },

  /* ---------- Router ---------- */
  render() {
    const hash = location.hash.replace('#', '') || 'home';
    const [route, param] = hash.split('/');
    Charts.clear();
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === route || (route === 'veicolo' && a.dataset.nav === 'mezzi') || (route === 'scadenze' && a.dataset.nav === 'altro')));
    const sub = ['veicolo', 'scadenze'].includes(route);
    $('#btnBack').hidden = !sub;
    const view = $('#view');
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';

    const views = {
      home: () => this.vHome(),
      mezzi: () => this.vMezzi(),
      veicolo: () => this.vVeicolo(param),
      statistiche: () => this.vStatistiche(),
      altro: () => this.vAltro(),
      scadenze: () => this.vScadenze()
    };
    (views[route] || views.home)();
    if (route !== 'veicolo') window.scrollTo(0, 0);
  },

  setTitle(t) { $('#pageTitle').textContent = t; document.title = t === 'Garage' ? 'Garage' : t + ' · Garage'; },

  /* ---------- Click globali ---------- */
  onClick(e) {
    const el = e.target.closest('[data-edit],[data-go],[data-act]');
    if (!el) return;
    if (el.dataset.edit) { const [t, id] = el.dataset.edit.split(':'); this.openForm(t, id); }
    else if (el.dataset.go) { location.hash = el.dataset.go; }
    else if (el.dataset.act) { this.action(el.dataset.act, el); }
  },

  action(act, el) {
    const vid = el.dataset.vid;
    switch (act) {
      case 'new-veicolo': this.openForm('veicoli'); break;
      case 'new': this.openForm(el.dataset.table, null, { veicoloId: vid }); break;
      case 'tab': this.state.vehTab = el.dataset.tab; this.saveUi(); this.render(); break;
      case 'export': this.exportBackup(); break;
      case 'import': this.importBackup(); break;
      case 'theme': this.setTheme(el.dataset.theme); break;
      case 'periodo': this.state.statPeriodo = el.dataset.p; this.saveUi(); this.render(); break;
      case 'soon': this.toast('Arriva nella Versione 2 🚀'); break;
    }
  },

  /* ---------- Helpers ---------- */
  nomeVeicolo(v) { return v ? (v.nome || [v.marca, v.modello].filter(Boolean).join(' ') || 'Veicolo') : '—'; },
  avatar(v, cls = '') {
    return `<div class="vavatar ${cls}">${v.foto ? `<img src="${v.foto}" alt="">` : (CONFIG.iconaTipo[v.tipo] || '🚗')}</div>`;
  },
  veicoliOrdinati() { return DB.list('veicoli').sort((a, b) => (a.ordine || 0) - (b.ordine || 0) || (a.createdAt || '').localeCompare(b.createdAt || '')); },

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.hidden = true, 2400);
  },

  delta(cur, prev, costo = true) {
    if (!prev && !cur) return '<div class="d flat">—</div>';
    if (!prev) return '<div class="d flat">nuovo</div>';
    const p = (cur - prev) / prev * 100;
    if (Math.abs(p) < 0.5) return '<div class="d flat">= invariato</div>';
    const cls = costo ? (p > 0 ? 'up' : 'down') : 'flat';
    return `<div class="d ${cls}">${p > 0 ? '▲' : '▼'} ${F.num(Math.abs(p), 0)}%</div>`;
  },

  stat(k, v, extra = '') { return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div>${extra}</div>`; },

  /** Riepilogo "dall'inizio" di un singolo veicolo */
  riepilogoVeicolo(v) {
    const tutto = Periodi.range('tutto');
    const s = Calc.stats([v.id], tutto);
    const carbs = Calc.carburantiVeicolo(v);
    const princ = carbs.map(c => ({ c, x: Calc.consumo(v.id, c) })).sort((a, b) => b.x.qta - a.x.qta)[0];
    const kmNow = Calc.kmAttuali(v);
    const rif = DB.list('rifornimenti').filter(x => x.veicoloId === v.id).sort((a, b) => b.data.localeCompare(a.data) || num(b.km) - num(a.km))[0];
    const man = DB.list('manutenzioni').filter(x => x.veicoloId === v.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    const scad = Calc.scadenze(v.id)[0];
    const lett = Calc.letture(v.id);
    const base = num(v.kmIniziali) || (lett[0] ? lett[0].km : kmNow);
    return { s, kmNow, princ, rif, man, scad, kmPercorsi: Math.max(0, kmNow - base) };
  },

  testoScadenza(sc) {
    if (!sc) return '—';
    const parts = [];
    if (sc.data) parts.push(sc.giorni < 0 ? `scaduta da ${-sc.giorni} gg` : sc.giorni === 0 ? 'oggi' : `tra ${sc.giorni} gg`);
    if (sc.km) parts.push(sc.kmMancanti < 0 ? `superata di ${F.num(-sc.kmMancanti)} ${sc.unita}` : `tra ${F.num(sc.kmMancanti)} ${sc.unita}`);
    return parts.join(' · ');
  },

  chipScadenza(sc) {
    const cls = { ok: 'good', vicina: 'warn', scaduta: 'bad' }[sc.stato];
    return `<span class="chip ${cls}">${esc(this.testoScadenza(sc))}</span>`;
  },

  /* =========================================================
     HOME
     ========================================================= */
  vHome() {
    this.setTitle('Garage');
    const veicoli = this.veicoliOrdinati();
    const view = $('#view');
    if (!veicoli.length) {
      view.innerHTML = `
        <div class="card empty" style="margin-top:12px">
          <div class="e-ic">🏁</div>
          <h4>Benvenuto nel tuo Garage</h4>
          <p>Inizia aggiungendo il tuo primo veicolo. Poi potrai registrare rifornimenti, spese e manutenzioni.</p>
          <button class="btn" data-act="new-veicolo">${ICON.plus} Aggiungi un veicolo</button>
        </div>`;
      return;
    }
    const ids = veicoli.map(v => v.id);
    const rM = Periodi.range('mese'), rP = Periodi.previous(rM);
    const s = Calc.stats(ids, rM), p = Calc.stats(ids, rP);
    const scad = Calc.scadenze().filter(x => x.stato !== 'ok').slice(0, 4);

    view.innerHTML = `
      <div class="hero">
        <div class="label">Spese di ${esc(rM.label)}</div>
        <div class="big">${F.eur(s.costoTot)}</div>
        <div class="row">
          <div>Km percorsi<b>${F.num(s.km)}</b></div>
          <div>Carburante<b>${F.eur(s.costoCarb)}</b></div>
          <div>Costo/km<b>${s.km ? F.eur(s.costoKm, 3) : '—'}</b></div>
        </div>
        <div class="row" style="margin-top:10px;font-size:12.5px;opacity:.85">${esc(rP.label)}: ${F.eur(p.costoTot)} · ${F.num(p.km)} km</div>
      </div>

      ${scad.length ? `
        <div class="section-title"><h3>Scadenze in arrivo</h3><a href="#scadenze">Tutte</a></div>
        <div class="list">${scad.map(sc => this.itemScadenza(sc)).join('')}</div>` : ''}

      <div class="section-title"><h3>I tuoi mezzi</h3><a href="#mezzi">Gestisci</a></div>
      <div class="grid grid-auto">${veicoli.map(v => this.vcard(v)).join('')}</div>

      <div class="section-title"><h3>Ultimi movimenti</h3></div>
      ${this.listaMovimenti(null, 8)}
    `;
  },

  vcard(v) {
    const r = this.riepilogoVeicolo(v);
    const u = Calc.unita(v);
    const cons = r.princ && r.princ.x.qta ? `${F.num(r.princ.x.kmL, 1)} km/${CONFIG.unitaCarburante[r.princ.c] || 'L'} <span class="muted">(${r.princ.c})</span>` : '—';
    return `
      <div class="card vcard" data-go="#veicolo/${v.id}">
        <div class="vhead">
          ${this.avatar(v)}
          <div style="flex:1;min-width:0">
            <div class="vname">${esc(this.nomeVeicolo(v))}</div>
            <div class="vsub">${esc([v.marca, v.modello].filter(Boolean).join(' '))}${v.targa ? ' · ' + esc(v.targa) : ''}</div>
          </div>
          <span class="chip fuel">${esc(v.alimentazione || '')}${v.carburante2 ? ' + ' + esc(v.carburante2) : ''}</span>
        </div>
        <div class="vmetrics">
          <div><span>${u === 'ore' ? 'Ore motore' : 'Km attuali'}</span><b>${F.num(r.kmNow)}</b></div>
          <div><span>${u === 'ore' ? 'Ore registrate' : 'Km percorsi'}</span><b>${F.num(r.kmPercorsi)}</b></div>
          <div><span>Costo/${u === 'ore' ? 'ora' : 'km'}</span><b>${r.kmPercorsi && r.s.costoTot ? F.eur(r.s.costoTot / r.kmPercorsi, u === 'ore' ? 2 : 3) : '—'}</b></div>
        </div>
        <div class="vfoot">
          <div><span>Spesa totale</span><b>${F.eur(r.s.costoTot)} <span class="muted">(carb. ${F.eur(r.s.costoCarb, 0)})</span></b></div>
          <div><span>Consumo medio</span><b>${cons}</b></div>
          <div><span>Ultimo rifornimento</span><b>${r.rif ? D.fmt(r.rif.data) + ' · ' + F.eur(num(r.rif.totale)) : '—'}</b></div>
          <div><span>Ultima manutenzione</span><b>${r.man ? esc(r.man.tipo) + ' · ' + D.fmt(r.man.data) : '—'}</b></div>
          <div><span>Prossima scadenza</span><b>${r.scad ? esc(r.scad.titolo) + ' ' + this.chipScadenza(r.scad) : '—'}</b></div>
        </div>
      </div>`;
  },

  itemScadenza(sc) {
    return `
      <div class="item" data-go="#veicolo/${sc.veicoloId}">
        <div class="due-dot ${sc.stato}"></div>
        <div class="main">
          <div class="t">${esc(sc.titolo)}</div>
          <div class="s">${esc(sc.veicolo)}${sc.data ? ' · ' + D.fmt(sc.data) : ''}${sc.km ? ' · a ' + F.num(sc.km) + ' ' + sc.unita : ''}</div>
        </div>
        <div class="r">${this.chipScadenza(sc)}</div>
      </div>`;
  },

  /** Elenco unificato di rifornimenti, manutenzioni, spese, bolli, assicurazioni */
  movimenti(vid) {
    const f = r => !vid || r.veicoloId === vid;
    const out = [];
    DB.list('rifornimenti').filter(f).forEach(r => out.push({ t: 'rifornimenti', r, data: r.data, km: num(r.km) }));
    DB.list('manutenzioni').filter(f).forEach(r => out.push({ t: 'manutenzioni', r, data: r.data, km: num(r.km) }));
    DB.list('spese').filter(f).forEach(r => out.push({ t: 'spese', r, data: r.data, km: num(r.km) }));
    DB.list('bolli').filter(f).forEach(r => out.push({ t: 'bolli', r, data: r.dataPagamento, km: 0 }));
    DB.list('assicurazioni').filter(f).forEach(r => out.push({ t: 'assicurazioni', r, data: r.inizio, km: 0 }));
    return out.sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.km - a.km);
  },

  listaMovimenti(vid, limit, tipo) {
    let list = this.movimenti(vid);
    if (tipo) list = list.filter(m => tipo.includes(m.t));
    if (limit) list = list.slice(0, limit);
    if (!list.length) return `<div class="card empty"><div class="e-ic">📭</div><p>Nessun dato ancora. Tocca il pulsante <b>+</b> per aggiungere.</p></div>`;
    // km/l dei singoli rifornimenti
    const consMap = {};
    if (!tipo || tipo.includes('rifornimenti')) {
      for (const v of DB.list('veicoli')) for (const c of Calc.carburantiVeicolo(v)) {
        for (const tr of Calc.consumo(v.id, c).tratti) consMap[tr.id] = tr;
      }
    }
    return `<div class="list">${list.map(m => this.itemMovimento(m, !vid, consMap)).join('')}</div>`;
  },

  itemMovimento(m, mostraVeicolo, consMap = {}) {
    const r = m.r;
    const v = DB.get('veicoli', r.veicoloId);
    const vn = mostraVeicolo ? esc(this.nomeVeicolo(v)) + ' · ' : '';
    const u = Calc.unita(v);
    const kmTxt = num(r.km) ? ' · ' + F.num(num(r.km)) + ' ' + u : '';
    let ic, cls, t, s, amount, extra = '';
    switch (m.t) {
      case 'rifornimenti': {
        const un = CONFIG.unitaCarburante[r.carburante] || 'L';
        ic = ICON.fuel; cls = 'fuel';
        t = `${esc(r.carburante || 'Rifornimento')} · ${F.num(num(r.litri), 2)} ${un}`;
        s = vn + D.fmt(r.data) + kmTxt + (r.distributore ? ' · ' + esc(r.distributore) : '');
        amount = num(r.totale);
        const tr = consMap[r.id];
        extra = tr ? `${F.num(tr.kmL, 1)} km/${un}` : `${F.num(num(r.prezzo), 3)} €/${un}`;
        break;
      }
      case 'manutenzioni':
        ic = ICON.wrench; cls = 'maint'; t = esc(r.tipo || 'Manutenzione') + (r.descrizione ? ' · ' + esc(r.descrizione) : '');
        s = vn + D.fmt(r.data) + kmTxt + (r.officina ? ' · ' + esc(r.officina) : ''); amount = num(r.costo); break;
      case 'spese':
        ic = ICON.receipt; cls = 'exp'; t = esc(r.categoria || 'Spesa') + (r.descrizione ? ' · ' + esc(r.descrizione) : '');
        s = vn + D.fmt(r.data) + kmTxt; amount = num(r.importo); break;
      case 'bolli':
        ic = ICON.doc; cls = 'doc'; t = 'Bollo' + (r.periodoDa ? ` ${D.fmt(r.periodoDa)} – ${D.fmt(r.periodoA)}` : '');
        s = vn + 'Pagato ' + D.fmt(r.dataPagamento) + (r.scadenza ? ' · scade ' + D.fmt(r.scadenza) : ''); amount = num(r.importo); break;
      case 'assicurazioni':
        ic = ICON.shield; cls = 'doc'; t = 'Assicurazione' + (r.compagnia ? ' · ' + esc(r.compagnia) : '');
        s = vn + D.fmt(r.inizio) + ' → ' + D.fmt(r.scadenza) + (r.copertura ? ' · ' + esc(r.copertura) : ''); amount = num(r.costo); break;
    }
    return `
      <div class="item" data-edit="${m.t}:${r.id}">
        <div class="ic ${cls}">${ic}</div>
        <div class="main"><div class="t">${t}</div><div class="s">${s}</div></div>
        <div class="r"><b>${F.eur(amount)}</b>${extra ? `<span>${extra}</span>` : ''}</div>
      </div>`;
  },

  /* =========================================================
     MEZZI
     ========================================================= */
  vMezzi() {
    this.setTitle('I miei mezzi');
    const veicoli = this.veicoliOrdinati();
    $('#view').innerHTML = `
      ${veicoli.length ? `<div class="grid grid-auto">${veicoli.map(v => this.vcard(v)).join('')}</div>` :
        `<div class="card empty"><div class="e-ic">🚗</div><h4>Nessun veicolo</h4><p>Aggiungi auto, moto, scooter o altri mezzi.</p></div>`}
      <div class="spacer"></div>
      <button class="btn block" data-act="new-veicolo">${ICON.plus} Nuovo veicolo</button>`;
  },

  /* =========================================================
     SCHEDA VEICOLO
     ========================================================= */
  vVeicolo(id) {
    const v = DB.get('veicoli', id);
    if (!v) { location.hash = '#mezzi'; return; }
    this.state.ultimoVeicolo = id; this.saveUi();
    this.setTitle(this.nomeVeicolo(v));
    const tab = this.state.vehTab || 'panoramica';
    const tabs = [['panoramica', 'Panoramica'], ['rifornimenti', 'Rifornimenti'], ['manutenzioni', 'Manutenzioni'], ['spese', 'Spese'], ['documenti', 'Bollo & Ass.']];
    let body = '';

    if (tab === 'panoramica') body = this.vVeicoloPanoramica(v);
    else {
      const map = { rifornimenti: ['rifornimenti'], manutenzioni: ['manutenzioni'], spese: ['spese'], documenti: ['bolli', 'assicurazioni'] };
      const btns = tab === 'documenti'
        ? `<div class="btn-row" style="margin:0 0 12px"><button class="btn secondary" data-act="new" data-table="bolli" data-vid="${v.id}">${ICON.plus} Bollo</button><button class="btn secondary" data-act="new" data-table="assicurazioni" data-vid="${v.id}">${ICON.plus} Assicurazione</button></div>`
        : `<button class="btn secondary block" style="margin-bottom:12px" data-act="new" data-table="${tab}" data-vid="${v.id}">${ICON.plus} Aggiungi</button>`;
      body = btns + this.listaMovimenti(v.id, 0, map[tab]);
    }

    $('#view').innerHTML = `
      <div class="card">
        <div class="vhead">
          ${this.avatar(v, 'lg')}
          <div style="flex:1;min-width:0">
            <div class="vname" style="font-size:20px">${esc(this.nomeVeicolo(v))}</div>
            <div class="vsub">${esc([v.marca, v.modello, v.anno].filter(Boolean).join(' '))}</div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              ${v.targa ? `<span class="chip">${esc(v.targa)}</span>` : ''}
              <span class="chip fuel">${esc(v.alimentazione || '')}${v.carburante2 ? ' + ' + esc(v.carburante2) : ''}</span>
            </div>
          </div>
          <button class="icon-btn" data-edit="veicoli:${v.id}" aria-label="Modifica veicolo">${ICON.edit}</button>
        </div>
      </div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${body}`;
  },

  vVeicoloPanoramica(v) {
    const r = this.riepilogoVeicolo(v);
    const u = Calc.unita(v);
    const s = r.s;
    const carbs = Calc.carburantiVeicolo(v);
    const fuelCards = carbs.map(c => {
      const x = Calc.consumo(v.id, c);
      const pc = s.perCarb[c];
      if (!pc) return '';
      const un = CONFIG.unitaCarburante[c] || 'L';
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b>${esc(c)}</b><span class="chip fuel">${pc.n} rifornimenti</span>
          </div>
          <div class="grid grid-2">
            ${this.stat('Consumo medio', x.qta ? F.num(x.kmL, 1) + ' km/' + un : '—')}
            ${this.stat(un === 'L' ? 'l/100 km' : un + '/100 km', x.km ? F.num(x.l100, 2) : '—')}
            ${this.stat('Totale ' + (un === 'L' ? 'litri' : un), F.num(pc.qta, 1))}
            ${this.stat('Prezzo medio', F.num(pc.prezzoMedio, 3) + ' €/' + un)}
            ${this.stat('Spesa', F.eur(pc.costo))}
            ${this.stat('Costo carburante/km', x.km ? F.eur(pc.costo / Math.max(x.km, 1), 3) : '—')}
          </div>
          ${x.secondario ? `<div class="muted" style="margin-top:10px">Su un'auto ${esc(v.alimentazione)} la ${esc(c.toLowerCase())} è di supporto: i km non si possono separare, quindi il consumo non viene calcolato (spesa e litri sì).</div>`
            : !x.qta ? `<div class="muted" style="margin-top:10px">Il consumo si calcola tra due pieni: serve almeno un secondo rifornimento "pieno".</div>` : ''}
        </div>`;
    }).join('');

    const scad = Calc.scadenze(v.id);
    const kv = [
      ['Marca', v.marca], ['Modello', v.modello], ['Anno', v.anno], ['Targa', v.targa], ['Tipo', v.tipo],
      ['Alimentazione', v.alimentazione + (v.carburante2 ? ' + ' + v.carburante2 : '')],
      ['Cilindrata', v.cilindrata ? F.num(num(v.cilindrata)) + ' cc' : ''], ['Potenza', v.potenza ? F.num(num(v.potenza)) + ' CV' : ''],
      ['Serbatoio', v.serbatoio ? F.num(num(v.serbatoio)) + ' L' : ''], ['Serbatoio 2', v.serbatoio2 ? F.num(num(v.serbatoio2)) + ' L' : ''],
      [u === 'ore' ? 'Ore iniziali' : 'Km iniziali', F.num(num(v.kmIniziali))]
    ].filter(x => x[1]);

    return `
      <div class="grid grid-2 grid-4-lg">
        ${this.stat(u === 'ore' ? 'Ore motore' : 'Km attuali', F.num(r.kmNow))}
        ${this.stat(u === 'ore' ? 'Ore registrate' : 'Km percorsi', F.num(r.kmPercorsi))}
        ${this.stat('Spesa totale', F.eur(s.costoTot))}
        ${this.stat('Costo/' + (u === 'ore' ? 'ora' : 'km'), r.kmPercorsi && s.costoTot ? F.eur(s.costoTot / r.kmPercorsi, 3) : '—')}
      </div>

      ${scad.length ? `<div class="section-title"><h3>Scadenze</h3></div><div class="list">${scad.map(sc => this.itemScadenza(sc)).join('')}</div>` : ''}

      ${fuelCards ? `<div class="section-title"><h3>Carburante</h3></div>${fuelCards}` : ''}

      <div class="section-title"><h3>Spese per categoria</h3></div>
      <div class="card">${this.barreCategorie(s.cat)}</div>

      <div class="section-title"><h3>Dati del veicolo</h3><button class="link" data-edit="veicoli:${v.id}">Modifica</button></div>
      <div class="kv">${kv.map(([k, val]) => `<div><span>${k}</span><b>${esc(val)}</b></div>`).join('')}</div>
      ${v.note ? `<div class="card" style="margin-top:12px"><div class="muted">Note</div>${esc(v.note)}</div>` : ''}

      <div class="section-title"><h3>Ultimi movimenti</h3></div>
      ${this.listaMovimenti(v.id, 5)}`;
  },

  barreCategorie(cat) {
    const rows = Object.entries(cat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '<div class="muted">Nessuna spesa nel periodo.</div>';
    const max = rows[0][1], tot = rows.reduce((a, r) => a + r[1], 0);
    return `<div class="bars">${rows.map(([k, v]) => `
      <div class="bar-row">
        <div class="top"><b>${esc(k)}</b><span>${F.eur(v)} · ${F.num(v / tot * 100, 0)}%</span></div>
        <div class="track"><div class="fill" style="width:${(v / max * 100).toFixed(1)}%"></div></div>
      </div>`).join('')}</div>`;
  },

  /* =========================================================
     STATISTICHE
     ========================================================= */
  vStatistiche() {
    this.setTitle('Statistiche');
    const veicoli = this.veicoliOrdinati();
    if (!veicoli.length) {
      $('#view').innerHTML = `<div class="card empty"><div class="e-ic">📊</div><h4>Ancora nessun dato</h4><p>Aggiungi un veicolo e qualche rifornimento per vedere le statistiche.</p><button class="btn" data-act="new-veicolo">${ICON.plus} Aggiungi un veicolo</button></div>`;
      return;
    }
    const st = this.state;
    if (st.statVeicolo !== 'tutti' && !DB.get('veicoli', st.statVeicolo)) st.statVeicolo = 'tutti';
    const ids = st.statVeicolo === 'tutti' ? veicoli.map(v => v.id) : [st.statVeicolo];
    const r = Periodi.range(st.statPeriodo, st.statCustom);
    const prev = Periodi.previous(r);
    const s = Calc.stats(ids, r);
    const p = prev ? Calc.stats(ids, prev) : null;
    const d = (a, b, c) => p ? this.delta(a, b, c) : '';
    const carbs = Object.keys(s.perCarb);

    const fuelTable = carbs.length > 1 ? `
      <div class="card" style="margin-top:12px">
        <table class="cmp">
          <tr><th>Carburante</th><th>Quantità</th><th>Spesa</th><th>€/unità</th><th>Consumo</th></tr>
          ${carbs.map(c => { const x = s.perCarb[c]; return `<tr><td><b style="color:var(--text)">${esc(c)}</b></td><td>${F.num(x.qta, 1)} ${x.unita}</td><td>${F.eur(x.costo, 0)}</td><td>${F.num(x.prezzoMedio, 3)}</td><td>${x.kmL ? F.num(x.kmL, 1) + ' km/' + x.unita : '—'}</td></tr>`; }).join('')}
        </table>
      </div>` : '';

    const cmpRows = p ? [
      ['Km percorsi', s.km, p.km, v => F.num(v), false],
      ['Litri', s.litri, p.litri, v => F.num(v, 1), false],
      ['Carburante', s.costoCarb, p.costoCarb, v => F.eur(v, 0), true],
      ['Prezzo medio/L', s.prezzoMedio, p.prezzoMedio, v => v ? F.num(v, 3) + ' €' : '—', true],
      ['Consumo (km/l)', s.kmL, p.kmL, v => v ? F.num(v, 1) : '—', false],
      ['Costo/km', s.costoKm, p.costoKm, v => v ? F.eur(v, 3) : '—', true],
      ['Spese totali', s.costoTot, p.costoTot, v => F.eur(v, 0), true]
    ] : [];

    const perVeic = ids.length > 1 ? Object.fromEntries(ids.map(id => [this.nomeVeicolo(DB.get('veicoli', id)), s.perVeicolo[id].costo])) : null;

    $('#view').innerHTML = `
      <div class="filters">
        <div class="seg">${CONFIG.periodi.map(([k, l]) => `<button class="${k === st.statPeriodo ? 'on' : ''}" data-act="periodo" data-p="${k}">${l}</button>`).join('')}</div>
        ${st.statPeriodo === 'custom' ? `<div class="custom-range"><div class="field"><label>Dal</label><input type="date" id="cFrom" value="${r.from}"></div><div class="field"><label>Al</label><input type="date" id="cTo" value="${r.to}"></div></div>` : ''}
        <select id="statVeicolo">
          <option value="tutti">Tutti i veicoli</option>
          ${veicoli.map(v => `<option value="${v.id}" ${v.id === st.statVeicolo ? 'selected' : ''}>${esc(this.nomeVeicolo(v))}</option>`).join('')}
        </select>
      </div>

      <div class="hero" style="margin-top:6px">
        <div class="label">${esc(r.label)} · costo totale</div>
        <div class="big">${F.eur(s.costoTot)}</div>
        <div class="row">
          <div>Km<b>${F.num(s.km)}</b></div>
          <div>Carburante<b>${F.eur(s.costoCarb)}</b></div>
          <div>Costo/km<b>${s.costoKm ? F.eur(s.costoKm, 3) : '—'}</b></div>
        </div>
      </div>

      <div class="section-title"><h3>Utilizzo</h3></div>
      <div class="grid grid-2 grid-4-lg">
        ${this.stat('Km totali', F.num(s.km), d(s.km, p?.km, false))}
        ${this.stat('Media km/giorno', F.num(s.kmGiorno, 1))}
        ${this.stat('Media km/settimana', F.num(s.kmSettimana, 0))}
        ${this.stat('Media km/mese', F.num(s.kmMese, 0))}
        ${this.stat('Giorni con attività', F.num(s.giorniUso))}
        ${this.stat('Giorni nel periodo', F.num(s.giorni))}
      </div>

      <div class="section-title"><h3>Carburante</h3></div>
      <div class="grid grid-2 grid-4-lg">
        ${this.stat('Litri totali', F.num(s.litri, 1), d(s.litri, p?.litri, false))}
        ${this.stat('Litri/giorno', F.num(s.litriGiorno, 2))}
        ${this.stat('Litri/mese', F.num(s.litriMese, 1))}
        ${this.stat('Consumo medio', s.kmL ? F.num(s.kmL, 1) + ' km/l' : '—')}
        ${this.stat('l/100 km', s.l100 ? F.num(s.l100, 2) : '—')}
        ${this.stat('Prezzo medio/L', s.prezzoMedio ? F.num(s.prezzoMedio, 3) + ' €' : '—', d(s.prezzoMedio, p?.prezzoMedio))}
        ${this.stat('Costo carburante', F.eur(s.costoCarb), d(s.costoCarb, p?.costoCarb))}
        ${this.stat('Carburante/km', s.costoCarbKm ? F.eur(s.costoCarbKm, 3) : '—')}
      </div>
      ${fuelTable}

      <div class="section-title"><h3>Costi</h3></div>
      <div class="grid grid-2 grid-4-lg">
        ${this.stat('Costo totale', F.eur(s.costoTot), d(s.costoTot, p?.costoTot))}
        ${this.stat('Costo medio/giorno', F.eur(s.costoGiorno))}
        ${this.stat('Costo medio/mese', F.eur(s.costoMese, 0))}
        ${this.stat('Costo/km', s.costoKm ? F.eur(s.costoKm, 3) : '—', d(s.costoKm, p?.costoKm))}
      </div>
      <div class="card" style="margin-top:12px"><h4 style="margin:0 0 12px">Spese per categoria</h4>${this.barreCategorie(s.cat)}</div>
      ${perVeic ? `<div class="card" style="margin-top:12px"><h4 style="margin:0 0 12px">Confronto tra veicoli</h4>${this.barreCategorie(perVeic)}</div>` : ''}

      ${p ? `
        <div class="section-title"><h3>Confronto con il periodo precedente</h3></div>
        <div class="card">
          <table class="cmp">
            <tr><th></th><th>${esc(r.label)}</th><th>${esc(prev.label)}</th><th></th></tr>
            ${cmpRows.map(([k, a, b, f, c]) => `<tr><td>${k}</td><td><b>${f(a)}</b></td><td>${f(b)}</td><td class="d">${this.delta(a, b, c).replace(/<\/?div[^>]*>/g, m => m.startsWith('</') ? '</span>' : m.replace('div', 'span'))}</td></tr>`).join('')}
          </table>
        </div>` : ''}

      <div class="section-title"><h3>Grafici</h3></div>
      <div class="grid grid-auto">
        <div class="card chart-card"><h4>Spesa nel tempo</h4><div class="sub">per tipo di spesa</div><div class="legend" id="lgSpese"></div><div class="chart-box" id="chSpese"></div></div>
        <div class="card chart-card"><h4>Km percorsi</h4><div class="sub">${esc(r.label)}</div><div class="chart-box" id="chKm"></div></div>
        <div class="card chart-card"><h4>Prezzo carburante</h4><div class="sub">€ al litro (media del periodo)</div><div class="legend" id="lgPrezzo"></div><div class="chart-box" id="chPrezzo"></div></div>
        <div class="card chart-card"><h4>Consumo medio</h4><div class="sub">km/l, calcolato tra due pieni</div><div class="legend" id="lgCons"></div><div class="chart-box" id="chCons"></div></div>
      </div>
    `;

    $('#statVeicolo').onchange = e => { st.statVeicolo = e.target.value; this.saveUi(); this.render(); };
    if (st.statPeriodo === 'custom') {
      const upd = () => { st.statCustom = { from: $('#cFrom').value, to: $('#cTo').value }; this.saveUi(); this.render(); };
      $('#cFrom').onchange = upd; $('#cTo').onchange = upd;
    }
    this.drawStatCharts(ids, r);
  },

  drawStatCharts(ids, r) {
    const css = getComputedStyle(document.documentElement);
    const col = i => css.getPropertyValue('--s' + i).trim();
    const b = Calc.buckets(r, ids);
    const labels = b.map(x => x.label);
    const tipLabels = b.map(x => x.from === x.to ? D.fmt(x.from) : D.monthLong(D.parse(x.from).getMonth()) + ' ' + x.from.slice(0, 4));
    const stats = b.map(x => Calc.stats(ids, x));
    const legend = (el, series) => { $(el).innerHTML = series.length > 1 ? series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('') : ''; };

    // spese nel tempo
    const docs = s => (s.cat.Bollo || 0) + (s.cat.Assicurazione || 0);
    const altre = s => s.costoTot - s.cat.Carburante - s.cat.Manutenzione - docs(s);
    const sSpese = [
      { name: 'Carburante', color: col(1), data: stats.map(s => s.cat.Carburante) },
      { name: 'Manutenzione', color: col(2), data: stats.map(s => s.cat.Manutenzione) },
      { name: 'Bollo e assicurazione', color: col(3), data: stats.map(docs) },
      { name: 'Altre spese', color: col(4), data: stats.map(altre) }
    ].filter(s => s.data.some(v => v > 0));
    legend('#lgSpese', sSpese);
    const eurAxis = v => '€' + F.num(v, v < 10 && v % 1 ? 1 : 0);
    Charts.bar($('#chSpese'), { labels, tipLabels, series: sSpese.length ? sSpese : [{ name: 'Spese', color: col(1), data: labels.map(() => 0) }], stacked: true, fmt: v => F.eur(v), fmtAxis: eurAxis });

    // km
    Charts.bar($('#chKm'), { labels, tipLabels, series: [{ name: 'Km', color: col(1), data: stats.map(s => s.km) }], fmt: v => F.num(v) + ' km', fmtAxis: v => F.num(v) });

    // prezzo e consumo per carburante (solo carburanti a litri)
    const carbs = [...new Set(DB.list('rifornimenti').filter(f => ids.includes(f.veicoloId)).map(f => f.carburante))]
      .filter(c => (CONFIG.unitaCarburante[c] || 'L') === 'L');
    const colorFor = c => col({ GPL: 1, Benzina: 2, Diesel: 3 }[c] || 4);
    const sPrezzo = carbs.map(c => ({ name: c, color: colorFor(c), data: stats.map(s => s.perCarb[c] ? s.perCarb[c].prezzoMedio : null) }));
    legend('#lgPrezzo', sPrezzo);
    Charts.line($('#chPrezzo'), { labels, tipLabels, series: sPrezzo, zoom: true, fmt: v => F.num(v, 3) + ' €', fmtAxis: v => F.num(v, 2) });

    const sCons = carbs.map(c => ({
      name: c, color: colorFor(c), data: b.map(x => {
        let km = 0, q = 0;
        for (const id of ids) { const k = Calc.consumo(id, c, x); km += k.km; q += k.qta; }
        return q ? km / q : null;
      })
    }));
    legend('#lgCons', sCons);
    Charts.line($('#chCons'), { labels, tipLabels, series: sCons, zoom: true, fmt: v => F.num(v, 1) + ' km/l', fmtAxis: v => F.num(v, 1) });
  },

  /* =========================================================
     ALTRO
     ========================================================= */
  vAltro() {
    this.setTitle('Altro');
    const tema = (() => { try { return localStorage.getItem('garage-tema') || 'auto'; } catch (e) { return 'auto'; } })();
    const nScad = Calc.scadenze().filter(x => x.stato !== 'ok').length;
    const conta = ['veicoli', 'rifornimenti', 'manutenzioni', 'spese', 'bolli', 'assicurazioni'].map(t => DB.list(t).length);
    $('#view').innerHTML = `
      <div class="list">
        <div class="item" data-go="#scadenze"><div class="ic doc">${ICON.bell}</div><div class="main"><div class="t">Scadenze e promemoria</div><div class="s">${nScad ? nScad + ' da controllare' : 'Tutto in regola'}</div></div>${ICON.chevron}</div>
        <div class="item" data-act="soon"><div class="ic exp">${ICON.sheet}</div><div class="main"><div class="t">Google Sheets</div><div class="s">Sincronizzazione · in arrivo nella V2</div></div>${ICON.chevron}</div>
        <div class="item" data-act="soon"><div class="ic fuel">${ICON.doc}</div><div class="main"><div class="t">Report PDF / Excel</div><div class="s">In arrivo nella V2</div></div>${ICON.chevron}</div>
      </div>

      <div class="section-title"><h3>Aspetto</h3></div>
      <div class="seg">
        ${[['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([k, l]) => `<button class="${tema === k ? 'on' : ''}" data-act="theme" data-theme="${k}">${l}</button>`).join('')}
      </div>

      <div class="section-title"><h3>Backup dei dati</h3></div>
      <div class="card">
        <div class="note-box">I dati sono salvati <b>solo su questo dispositivo</b>. Finché non attiviamo Google Sheets, fai ogni tanto un backup: scarica il file e conservalo (es. su Google Drive).</div>
        <div class="btn-row">
          <button class="btn" data-act="export">${ICON.download} Scarica backup</button>
          <button class="btn secondary" data-act="import">${ICON.upload} Ripristina</button>
        </div>
      </div>

      <div class="section-title"><h3>Informazioni</h3></div>
      <div class="kv">
        <div><span>Versione</span><b>${APP_VERSION}</b></div>
        <div><span>Veicoli</span><b>${conta[0]}</b></div>
        <div><span>Rifornimenti</span><b>${conta[1]}</b></div>
        <div><span>Manutenzioni</span><b>${conta[2]}</b></div>
        <div><span>Spese</span><b>${conta[3]}</b></div>
        <div><span>Bolli / Assicurazioni</span><b>${conta[4]} / ${conta[5]}</b></div>
      </div>`;
  },

  vScadenze() {
    this.setTitle('Scadenze');
    const list = Calc.scadenze();
    $('#view').innerHTML = list.length
      ? `<div class="list">${list.map(sc => this.itemScadenza(sc)).join('')}</div>
         <p class="muted" style="margin:12px 4px">Le scadenze arrivano da: manutenzioni con "prossima data/km", bollo e assicurazione. Avviso in giallo ${CONFIG.giorniAvviso} giorni o ${F.num(CONFIG.kmAvviso)} km prima.</p>`
      : `<div class="card empty"><div class="e-ic">✅</div><h4>Nessuna scadenza</h4><p>Quando registri una manutenzione con la "prossima data", un bollo o un'assicurazione, le scadenze compaiono qui.</p></div>`;
  },

  /* =========================================================
     BACKUP
     ========================================================= */
  exportBackup() {
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'garage-backup-' + D.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.toast('Backup scaricato ✓');
  },

  importBackup() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      if (!confirm('Il ripristino SOSTITUISCE tutti i dati attuali con quelli del file. Continuare?')) return;
      try { await DB.importJSON(await f.text()); this.toast('Dati ripristinati ✓'); this.render(); }
      catch (e) { alert('Impossibile leggere il file: ' + e.message); }
    };
    inp.click();
  },

  /* =========================================================
     SHEET (finestra dal basso)
     ========================================================= */
  openSheet(title, html) {
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = html;
    $('#sheet').hidden = false; $('#sheetBackdrop').hidden = false;
    $('#sheetBody').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  },
  closeSheet() {
    $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true;
    document.body.style.overflow = '';
  },

  quickAdd() {
    if (!DB.list('veicoli').length) { this.openForm('veicoli'); return; }
    const hash = location.hash;
    const vid = hash.startsWith('#veicolo/') ? hash.split('/')[1] : '';
    const opt = (t, ic, cls, title, sub) => `<button data-q="${t}"><div class="ic ${cls}" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center">${ic}</div><div>${title}<small>${sub}</small></div></button>`;
    this.openSheet('Aggiungi', `
      <div class="quick">
        ${opt('rifornimenti', ICON.fuel, 'fuel', 'Rifornimento', 'Carburante, litri, km')}
        ${opt('spese', ICON.receipt, 'exp', 'Spesa', 'Lavaggio, pedaggi, ricambi…')}
        ${opt('manutenzioni', ICON.wrench, 'maint', 'Manutenzione', 'Tagliando, gomme, olio…')}
        ${opt('bolli', ICON.doc, 'doc', 'Bollo', 'Pagamento e scadenza')}
        ${opt('assicurazioni', ICON.shield, 'doc', 'Assicurazione', 'Polizza e scadenza')}
        ${opt('veicoli', ICON.car, '', 'Veicolo', 'Aggiungi un nuovo mezzo')}
      </div>`);
    $('#sheetBody').querySelectorAll('[data-q]').forEach(b => b.onclick = () => this.openForm(b.dataset.q, null, { veicoloId: vid }));
  },

  /* =========================================================
     MODULI
     ========================================================= */
  defaultVeicolo(pref) {
    const vs = this.veicoliOrdinati();
    if (pref && DB.get('veicoli', pref)) return pref;
    if (this.state.ultimoVeicolo && DB.get('veicoli', this.state.ultimoVeicolo)) return this.state.ultimoVeicolo;
    return vs[0] ? vs[0].id : '';
  },

  forms: {
    veicoli: {
      titolo: ['Nuovo veicolo', 'Modifica veicolo'],
      campi: () => [
        { k: 'foto', type: 'photo', label: 'Foto' },
        { k: 'nome', label: 'Nome breve', placeholder: 'es. XSR700, Panda GPL', hint: 'Il nome che vedrai nell\'app' },
        { k: 'tipo', label: 'Tipo', type: 'select', options: CONFIG.tipiVeicolo, req: true },
        [{ k: 'marca', label: 'Marca', placeholder: 'es. Yamaha', req: true }, { k: 'modello', label: 'Modello', placeholder: 'es. XSR700', req: true }],
        [{ k: 'anno', label: 'Anno', type: 'int', placeholder: 'es. 2019' }, { k: 'targa', label: 'Targa', placeholder: 'AB123CD', upper: true }],
        [{ k: 'alimentazione', label: 'Alimentazione', type: 'select', options: CONFIG.alimentazioni, req: true }, { k: 'carburante2', label: 'Secondo carburante', type: 'select', options: ['', 'Benzina', 'Diesel', 'GPL', 'Metano', 'Elettrico'], labels: { '': 'Nessuno' } }],
        [{ k: 'cilindrata', label: 'Cilindrata (cc)', type: 'int' }, { k: 'potenza', label: 'Potenza (CV)', type: 'int' }],
        [{ k: 'serbatoio', label: 'Serbatoio (L)', type: 'dec' }, { k: 'serbatoio2', label: 'Serbatoio 2 (L)', type: 'dec', hint: 'es. bombola GPL' }],
        [{ k: 'unita', label: 'Contatore', type: 'select', options: ['km', 'ore'], labels: { km: 'Chilometri', ore: 'Ore motore' } }, { k: 'kmIniziali', label: 'Km / ore iniziali', type: 'int', hint: 'Quando inizi a usare l\'app' }],
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      mount(root) {
        const al = root.querySelector('[name=alimentazione]'), c2 = root.querySelector('[name=carburante2]');
        al.addEventListener('change', () => { if (['GPL', 'Metano'].includes(al.value) && !c2.value) c2.value = 'Benzina'; });
        const tipo = root.querySelector('[name=tipo]'), un = root.querySelector('[name=unita]');
        tipo.addEventListener('change', () => { if (tipo.value.startsWith('Trattorino')) un.value = 'ore'; });
      }
    },

    rifornimenti: {
      titolo: ['Nuovo rifornimento', 'Modifica rifornimento'],
      campi: rec => [
        { k: 'veicoloId', label: 'Veicolo', type: 'veicolo', req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'km', label: 'Km totali', type: 'int', req: true, kmHint: true }],
        { k: 'carburante', label: 'Carburante', type: 'select', options: [], req: true },
        [{ k: 'litri', label: 'Litri', type: 'dec', req: true }, { k: 'prezzo', label: 'Prezzo/litro (€)', type: 'dec' }],
        { k: 'totale', label: 'Totale (€)', type: 'dec', req: true, hint: 'Inserisci due valori su tre: il terzo si calcola da solo' },
        { k: 'pieno', label: 'Ho fatto il pieno', type: 'check', def: true, hint: 'Serve per calcolare i consumi in modo preciso' },
        { k: 'distributore', label: 'Distributore', placeholder: 'es. Eni via Roma' },
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      mount(root, rec) {
        const q = n => root.querySelector(`[name=${n}]`);
        const vSel = q('veicoloId'), cSel = q('carburante');
        const L = q('litri'), P = q('prezzo'), T = q('totale');
        const fillCarb = () => {
          const v = DB.get('veicoli', vSel.value);
          const list = v ? Calc.carburantiVeicolo(v) : CONFIG.carburanti;
          const cur = cSel.value || (rec && rec.carburante);
          const last = DB.list('rifornimenti').filter(f => f.veicoloId === vSel.value).sort((a, b) => b.data.localeCompare(a.data))[0];
          cSel.innerHTML = list.map(c => `<option>${c}</option>`).join('');
          cSel.value = list.includes(cur) ? cur : (last && list.includes(last.carburante) ? last.carburante : list[0]);
          setUnit();
        };
        const setUnit = () => {
          const u = CONFIG.unitaCarburante[cSel.value] || 'L';
          L.closest('.field').querySelector('label').textContent = u === 'L' ? 'Litri' : 'Quantità (' + u + ')';
          P.closest('.field').querySelector('label').textContent = 'Prezzo/' + (u === 'L' ? 'litro' : u) + ' (€)';
        };
        vSel.addEventListener('change', () => { fillCarb(); UI.updateKmHint(root); });
        cSel.addEventListener('change', setUnit);
        fillCarb();
        // calcolo automatico
        let order = [];
        const touch = n => { order = order.filter(x => x !== n); order.push(n); };
        const fmt = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
        const recalc = () => {
          const l = num(L.value), p = num(P.value), t = num(T.value);
          [L, P, T].forEach(x => x.classList.remove('calc'));
          const has = { litri: l > 0, prezzo: p > 0, totale: t > 0 };
          // il campo da calcolare è quello toccato meno di recente
          const target = ['litri', 'prezzo', 'totale'].filter(n => !order.slice(-2).includes(n))[0];
          if (order.length < 2) {
            if (has.litri && has.prezzo && !order.includes('totale')) { T.value = fmt(l * p, 2); T.classList.add('calc'); }
            else if (has.litri && has.totale && !order.includes('prezzo')) { P.value = fmt(t / l, 3); P.classList.add('calc'); }
            return;
          }
          if (target === 'totale' && has.litri && has.prezzo) { T.value = fmt(l * p, 2); T.classList.add('calc'); }
          else if (target === 'prezzo' && has.litri && has.totale) { P.value = fmt(t / l, 3); P.classList.add('calc'); }
          else if (target === 'litri' && has.prezzo && has.totale) { L.value = fmt(t / p, 2); L.classList.add('calc'); }
        };
        [['litri', L], ['prezzo', P], ['totale', T]].forEach(([n, el]) => el.addEventListener('input', () => { touch(n); recalc(); }));
        if (rec) order = ['litri', 'totale'];
      },
      valida(o) {
        if (!o.prezzo && o.litri) o.prezzo = Math.round(o.totale / o.litri * 1000) / 1000;
        return UI.controllaKm(o);
      }
    },

    manutenzioni: {
      titolo: ['Nuova manutenzione', 'Modifica manutenzione'],
      campi: () => [
        { k: 'veicoloId', label: 'Veicolo', type: 'veicolo', req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'km', label: 'Km', type: 'int', kmHint: true }],
        { k: 'tipo', label: 'Tipo di manutenzione', type: 'select', options: CONFIG.tipiManutenzione, req: true },
        { k: 'descrizione', label: 'Descrizione', placeholder: 'es. olio 10W40 + filtro' },
        [{ k: 'officina', label: 'Officina' }, { k: 'costo', label: 'Costo (€)', type: 'dec' }],
        [{ k: 'prossimaData', label: 'Prossima (data)', type: 'date' }, { k: 'prossimiKm', label: 'Prossima (km)', type: 'int' }],
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      mount(root) {
        const q = n => root.querySelector(`[name=${n}]`);
        const tipo = q('tipo'), pd = q('prossimaData'), data = q('data');
        tipo.addEventListener('change', () => {
          if (tipo.value === 'Revisione' && !pd.value && data.value) {
            const d = D.parse(data.value); d.setFullYear(d.getFullYear() + 2); pd.value = D.iso(d);
          }
        });
        q('veicoloId').addEventListener('change', () => UI.updateKmHint(root));
      },
      valida(o) { return UI.controllaKm(o); }
    },

    spese: {
      titolo: ['Nuova spesa', 'Modifica spesa'],
      campi: () => [
        { k: 'veicoloId', label: 'Veicolo', type: 'veicolo', req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'importo', label: 'Importo (€)', type: 'dec', req: true }],
        { k: 'categoria', label: 'Categoria', type: 'select', options: CONFIG.categorieSpesa, req: true, hint: 'Carburante e manutenzione hanno le loro sezioni: non vanno inseriti qui' },
        { k: 'descrizione', label: 'Descrizione' },
        { k: 'km', label: 'Km (facoltativo)', type: 'int', kmHint: true },
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      mount(root) { root.querySelector('[name=veicoloId]').addEventListener('change', () => UI.updateKmHint(root)); }
    },

    bolli: {
      titolo: ['Nuovo bollo', 'Modifica bollo'],
      campi: () => [
        { k: 'veicoloId', label: 'Veicolo', type: 'veicolo', req: true },
        [{ k: 'dataPagamento', label: 'Data pagamento', type: 'date', req: true }, { k: 'importo', label: 'Importo (€)', type: 'dec', req: true }],
        [{ k: 'periodoDa', label: 'Periodo dal', type: 'date' }, { k: 'periodoA', label: 'Periodo al', type: 'date' }],
        { k: 'scadenza', label: 'Prossima scadenza', type: 'date', hint: 'Riceverai l\'avviso nelle Scadenze' },
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      mount(root) {
        const q = n => root.querySelector(`[name=${n}]`);
        q('periodoA').addEventListener('change', () => { if (!q('scadenza').value && q('periodoA').value) q('scadenza').value = q('periodoA').value; });
        q('periodoDa').addEventListener('change', () => {
          if (!q('periodoA').value && q('periodoDa').value) { const d = D.parse(q('periodoDa').value); d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); q('periodoA').value = D.iso(d); q('periodoA').dispatchEvent(new Event('change')); }
        });
      }
    },

    assicurazioni: {
      titolo: ['Nuova assicurazione', 'Modifica assicurazione'],
      campi: () => [
        { k: 'veicoloId', label: 'Veicolo', type: 'veicolo', req: true },
        [{ k: 'compagnia', label: 'Compagnia', req: true }, { k: 'polizza', label: 'N° polizza' }],
        [{ k: 'inizio', label: 'Data inizio', type: 'date', req: true }, { k: 'scadenza', label: 'Data scadenza', type: 'date', req: true }],
        [{ k: 'costo', label: 'Costo (€)', type: 'dec', req: true }, { k: 'copertura', label: 'Copertura', type: 'select', options: ['RC auto', 'RC + furto/incendio', 'Kasko', 'Mini kasko', 'Altro'] }],
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      mount(root) {
        const q = n => root.querySelector(`[name=${n}]`);
        q('inizio').addEventListener('change', () => {
          if (!q('scadenza').value && q('inizio').value) { const d = D.parse(q('inizio').value); d.setFullYear(d.getFullYear() + 1); q('scadenza').value = D.iso(d); }
        });
      }
    }
  },

  ultimaLettura(vid) {
    const v = DB.get('veicoli', vid);
    return v ? Calc.kmAttuali(v) : 0;
  },

  updateKmHint(root) {
    const vid = root.querySelector('[name=veicoloId]')?.value;
    const v = DB.get('veicoli', vid);
    root.querySelectorAll('[data-kmhint]').forEach(inp => {
      const km = this.ultimaLettura(vid);
      const u = Calc.unita(v);
      inp.placeholder = km ? 'ultimo: ' + F.num(km) : '';
      const lab = inp.closest('.field').querySelector('label');
      if (u === 'ore') lab.textContent = lab.textContent.replace(/^Km( totali)?/, 'Ore motore');
      else lab.textContent = lab.textContent.replace(/^Ore motore/, 'Km');
    });
  },

  controllaKm(o) {
    if (!o.km) return true;
    // avvisa se i km sono minori di una lettura precedente
    const prec = Calc.letture(o.veicoloId).filter(l => l.data < o.data);
    const maxPrec = prec.length ? Math.max(...prec.map(l => l.km)) : 0;
    if (maxPrec && o.km < maxPrec) {
      return confirm(`Attenzione: hai inserito ${F.num(o.km)} km, ma in una data precedente risultano già ${F.num(maxPrec)} km. Salvare comunque?`);
    }
    return true;
  },

  fieldHTML(f, rec) {
    const val = rec[f.k] ?? (f.def !== undefined ? f.def : '');
    const id = 'f_' + f.k;
    const req = f.req ? ' required' : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
    let input;
    switch (f.type) {
      case 'select':
        input = `<select id="${id}" name="${f.k}"${req}>${f.options.map(o => `<option value="${esc(o)}" ${String(val) === o ? 'selected' : ''}>${esc(f.labels && f.labels[o] !== undefined ? f.labels[o] : o)}</option>`).join('')}</select>`;
        break;
      case 'veicolo':
        input = `<select id="${id}" name="${f.k}"${req}>${this.veicoliOrdinati().map(v => `<option value="${v.id}" ${val === v.id ? 'selected' : ''}>${esc(this.nomeVeicolo(v))}</option>`).join('')}</select>`;
        break;
      case 'date':
        input = `<input type="date" id="${id}" name="${f.k}" value="${esc(val)}"${req}>`;
        break;
      case 'int':
        input = `<input type="number" inputmode="numeric" step="1" min="0" id="${id}" name="${f.k}" value="${esc(val)}"${ph}${req}${f.kmHint ? ' data-kmhint="1"' : ''}>`;
        break;
      case 'dec':
        input = `<input type="text" inputmode="decimal" id="${id}" name="${f.k}" value="${val === '' ? '' : esc(String(val).replace('.', ','))}"${ph}${req} autocomplete="off">`;
        break;
      case 'textarea':
        input = `<textarea id="${id}" name="${f.k}"${ph}>${esc(val)}</textarea>`;
        break;
      case 'check':
        return `<div class="field"><label class="check"><input type="checkbox" name="${f.k}" ${val !== false ? 'checked' : ''}> <span>${esc(f.label)}</span></label>${hint}</div>`;
      case 'photo':
        return `<div class="field"><label>${f.label}</label><div class="photo-pick">
          <div class="vavatar" id="photoPrev">${val ? `<img src="${val}" alt="">` : '📷'}</div>
          <input type="hidden" name="foto" value="">
          <button type="button" class="btn secondary" id="photoBtn">Scegli foto</button>
          ${val ? '<button type="button" class="link" id="photoDel">Rimuovi</button>' : ''}
        </div></div>`;
      default:
        input = `<input type="text" id="${id}" name="${f.k}" value="${esc(val)}"${ph}${req}${f.upper ? ' style="text-transform:uppercase"' : ''}>`;
    }
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${hint}</div>`;
  },

  openForm(table, id, preset = {}) {
    const def = this.forms[table];
    const rec = id ? { ...DB.get(table, id) } : {};
    if (!id) {
      if (table !== 'veicoli') rec.veicoloId = this.defaultVeicolo(preset.veicoloId);
      const oggi = D.today();
      ['data', 'dataPagamento', 'inizio'].forEach(k => rec[k] = oggi);
      if (table === 'veicoli') { rec.tipo = 'Auto'; rec.alimentazione = 'Benzina'; rec.unita = 'km'; }
    }
    const campi = def.campi(rec);
    const flat = campi.flat();
    const html = `
      <form class="form" id="frm" novalidate>
        ${campi.map(c => Array.isArray(c) ? `<div class="row2">${c.map(f => this.fieldHTML(f, rec)).join('')}</div>` : this.fieldHTML(c, rec)).join('')}
        <div class="btn-row">
          ${id ? `<button type="button" class="btn danger" id="btnDel">${ICON.trash} Elimina</button>` : ''}
          <button type="submit" class="btn">Salva</button>
        </div>
      </form>`;
    this.openSheet(def.titolo[id ? 1 : 0], html);
    const root = $('#frm');
    if (def.mount) def.mount(root, id ? rec : null);
    this.updateKmHint(root);

    // foto
    let foto = rec.foto || '';
    if (table === 'veicoli') {
      $('#photoBtn').onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => {
          if (!inp.files[0]) return;
          foto = await this.resizeImage(inp.files[0], 640);
          $('#photoPrev').innerHTML = `<img src="${foto}" alt="">`;
        };
        inp.click();
      };
      const del = $('#photoDel');
      if (del) del.onclick = () => { foto = ''; $('#photoPrev').textContent = '📷'; del.remove(); };
    }

    root.onsubmit = async e => {
      e.preventDefault();
      const o = { ...rec };
      for (const f of flat) {
        if (f.type === 'photo') continue;
        const el = root.querySelector(`[name=${f.k}]`);
        if (!el) continue;
        if (f.type === 'check') o[f.k] = el.checked;
        else if (f.type === 'int' || f.type === 'dec') o[f.k] = el.value.trim() === '' ? '' : num(el.value);
        else o[f.k] = f.upper ? el.value.trim().toUpperCase() : el.value.trim();
      }
      if (table === 'veicoli') { o.foto = foto; if (!o.createdAt) o.createdAt = new Date().toISOString(); }
      // campi obbligatori
      const missing = flat.filter(f => f.req && (o[f.k] === '' || o[f.k] === undefined || (typeof o[f.k] === 'number' && o[f.k] <= 0 && f.k !== 'km')));
      root.querySelectorAll('.field input, .field select').forEach(x => x.style.borderColor = '');
      if (table === 'rifornimenti' && !o.totale && o.litri && o.prezzo) o.totale = Math.round(o.litri * o.prezzo * 100) / 100;
      const stillMissing = missing.filter(f => !(f.k === 'totale' && o.totale));
      if (stillMissing.length) {
        stillMissing.forEach(f => { const el = root.querySelector(`[name=${f.k}]`); if (el) el.style.borderColor = 'var(--bad)'; });
        this.toast('Compila: ' + stillMissing.map(f => f.label).join(', '));
        return;
      }
      if (def.valida && !def.valida(o)) return;
      await DB.save(table, o);
      if (o.veicoloId) this.state.ultimoVeicolo = o.veicoloId;
      this.saveUi();
      this.closeSheet();
      this.toast('Salvato ✓');
      this.render();
    };

    const del = $('#btnDel');
    if (del) del.onclick = async () => {
      if (table === 'veicoli') {
        if (!confirm(`Eliminare "${this.nomeVeicolo(rec)}" e TUTTI i suoi rifornimenti, spese e manutenzioni?`)) return;
        await DB.removeVehicle(id);
        this.closeSheet(); this.toast('Veicolo eliminato');
        location.hash = '#mezzi'; this.render();
      } else {
        if (!confirm('Eliminare questo elemento?')) return;
        await DB.remove(table, id);
        this.closeSheet(); this.toast('Eliminato'); this.render();
      }
    };
  },

  resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
};

UI.init().catch(err => {
  document.getElementById('view').innerHTML = `<div class="card"><b>Errore di avvio</b><p class="muted">${esc(err.message || err)}</p></div>`;
  console.error(err);
});
