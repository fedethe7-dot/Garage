/* =========================================================
   GARAGE — app.js  (v2.1 · grafica morbida + temi colore)
   Interfaccia: schermate, moduli, navigazione.
   ========================================================= */

const APP_VERSION = '2.4.4';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Temi colore (tavolozza in alto a destra) ---------- */
const TEMI = [
  { k: 'oceano', n: 'Oceano', e: '🌊', d: '#6b95ff', l: '#2a62f0', a2: '#8b5cf6' },
  { k: 'lavanda', n: 'Lavanda', e: '💜', d: '#b39cff', l: '#7c3aed', a2: '#ec4899' },
  { k: 'salvia', n: 'Salvia', e: '🌿', d: '#5fd4a8', l: '#0f9b74', a2: '#38bdf8' },
  { k: 'menta', n: 'Menta', e: '🍃', d: '#6ee7d6', l: '#0d9488', a2: '#a3e635' },
  { k: 'cielo', n: 'Cielo', e: '☁️', d: '#5cc8ff', l: '#0284c7', a2: '#818cf8' },
  { k: 'tramonto', n: 'Tramonto', e: '🌅', d: '#ff9d57', l: '#ea580c', a2: '#f43f5e' },
  { k: 'pesca', n: 'Pesca', e: '🍑', d: '#ff978a', l: '#e2513f', a2: '#ffb86b' },
  { k: 'ciliegia', n: 'Ciliegia', e: '🍒', d: '#ff7eb6', l: '#db2777', a2: '#fb7185' },
  { k: 'sole', n: 'Sole', e: '☀️', d: '#ffcb47', l: '#c27803', a2: '#fb923c' },
  { k: 'bosco', n: 'Bosco', e: '🌲', d: '#8ee6a4', l: '#15803d', a2: '#2dd4bf' },
  { k: 'rubino', n: 'Rubino', e: '❤️', d: '#ff7a7a', l: '#dc2626', a2: '#fb923c' },
  { k: 'grafite', n: 'Grafite', e: '🖤', d: '#c3cad6', l: '#475569', a2: '#94a3b8' }
];

const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/></svg>',
  cloudOff: '<svg viewBox="0 0 24 24"><path d="M7 18a5 5 0 0 1-.6-9.96M10 4.3A6 6 0 0 1 18 9a4.5 4.5 0 0 1 2.4 8.3M3 3l18 18"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/></svg>'
};

const TIPI_MOV = {
  rifornimenti: { e: '⛽', t: 't-fuel', n: 'Rifornimenti' },
  manutenzioni: { e: '🔧', t: 't-maint', n: 'Manutenzioni' },
  spese: { e: '🧾', t: 't-exp', n: 'Spese' },
  bolli: { e: '📄', t: 't-doc', n: 'Bolli' },
  assicurazioni: { e: '🛡️', t: 't-doc', n: 'Assicurazioni' }
};

/* ---------- Documenti: nomi file e cartelle su Google Drive ---------- */
const Docs = {
  MAX_MB: 15,
  meseAnno(data) { if (!data) return ''; const d = D.parse(data); return D.monthLong(d.getMonth()) + ' ' + d.getFullYear(); },
  anno(data) { return data ? data.slice(0, 4) : ''; },

  /** Categoria del documento allegato a un evento */
  categoria(table, r) {
    if (table === 'manutenzioni') return r.tipo === 'Revisione' ? 'Revisione' : 'Manutenzione';
    if (table === 'spese') return ['Assicurazione', 'Bollo', 'Revisione'].includes(r.categoria) ? r.categoria : 'Spese';
    if (table === 'bolli') return 'Bollo';
    if (table === 'assicurazioni') return 'Assicurazione';
    return 'Altro';
  },
  dataEvento(table, r) { return { bolli: r.dataPagamento, assicurazioni: r.inizio }[table] || r.data || D.today(); },

  /** Sottocartella: anno (2025) o periodo assicurativo (2025-2026) */
  cartella(categoria, data, scadenza) {
    const y = this.anno(data);
    if (!y) return '';
    if (categoria === 'Assicurazione') {
      const y2 = this.anno(scadenza);
      return y + '-' + (y2 && y2 > y ? y2 : +y + 1);
    }
    if (['Manutenzione', 'Revisione', 'Bollo', 'Spese', 'Viaggi'].includes(categoria)) return y;
    return '';
  },
  cartellaEvento(table, r, cat) {
    if (table === 'bolli') return this.anno(r.periodoDa || r.dataPagamento);
    return this.cartella(cat, this.dataEvento(table, r), r.scadenza);
  },

  /** Nome del file su Drive, es. "Manutenzione Tagliando - Febbraio 2025" */
  titoloEvento(table, r) {
    const quando = this.meseAnno(this.dataEvento(table, r));
    switch (table) {
      case 'manutenzioni': return r.tipo === 'Revisione' ? 'Revisione - ' + quando : 'Manutenzione ' + (r.tipo || '') + ' - ' + quando;
      case 'spese': return 'Spesa ' + (r.categoria || '') + ' - ' + quando;
      case 'bolli': return 'Bollo ' + (this.anno(r.periodoDa || r.dataPagamento));
      case 'assicurazioni': return 'Assicurazione' + (r.compagnia ? ' ' + r.compagnia : '') + ' ' + this.cartella('Assicurazione', r.inizio, r.scadenza);
    }
    return 'Documento - ' + quando;
  },

  collegati(table, id) { return id ? DB.list('documenti').filter(d => d.rifTabella === table && d.rifId === id) : []; },

  emojiFile(d) {
    const m = d.mime || (d._file ? d._file.slice(5, 30) : '');
    if (/pdf/.test(m)) return '📕';
    if (/image/.test(m)) return '🖼️';
    return '📄';
  },

  /** Legge un file scelto dall'utente: le foto vengono rimpicciolite, i PDF restano così */
  async leggi(file) {
    if (file.size > this.MAX_MB * 1048576) throw new Error(`"${file.name}" è troppo grande (max ${this.MAX_MB} MB)`);
    let dataUrl = null, mime = file.type || 'application/octet-stream';
    if (/^image\//.test(mime) && !/gif|svg/.test(mime)) {
      try { dataUrl = await UI.resizeImage(file, 1800, 0.82); mime = 'image/jpeg'; } catch (e) { dataUrl = null; }
    }
    if (!dataUrl) dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
    const est = mime === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || '').toLowerCase();
    return { dataUrl, mime, est, nomeOriginale: file.name, dimensione: Math.round(dataUrl.length * 0.75) };
  },

  scegli(multipli = true) {
    return new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*,application/pdf'; inp.multiple = multipli;
      inp.onchange = () => resolve([...inp.files]);
      inp.click();
    });
  },

  /** Apre il documento: da Drive se è già caricato, altrimenti la copia sul telefono */
  apri(d) {
    if (!d) return;
    if (d.url) { window.open(d.url, '_blank', 'noopener'); return; }
    if (d._file) {
      const [h, b64] = d._file.split(',');
      const bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: (h.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    UI.toast('Il file non è disponibile');
  },

  statoChip(d) {
    if (d.url) return '';
    if (d._file) return `<span class="chip warn">${Sync.attivo() ? '⏳ da caricare' : '📱 solo sul telefono'}</span>`;
    return '';
  }
};

const UI = {
  state: {
    statPeriodo: 'mese', statVeicolo: 'tutti', statCustom: {}, statTab: 'riepilogo',
    vehTab: 'panoramica', ultimoVeicolo: null, movTipo: 'tutti', movVeicolo: 'tutti',
    nome: '', colore: 'oceano', docVeicolo: 'tutti', viaVeicolo: 'tutti', viaAnno: 'tutti'
  },

  /* ---------- Avvio ---------- */
  async init() {
    try { Object.assign(this.state, JSON.parse(localStorage.getItem('garage-ui') || '{}')); } catch (e) {}
    this.applyColor();
    await DB.open();
    await DB.loadAll();

    window.addEventListener('hashchange', () => this.render());
    document.addEventListener('click', e => this.onClick(e));
    $('#btnAdd').onclick = () => this.quickAdd();
    $('#btnTheme').onclick = () => this.openThemeSheet();
    $('#btnBack').onclick = () => history.length > 1 ? history.back() : (location.hash = '#home');
    $('#sheetClose').onclick = () => this.closeSheet();
    $('#sheetBackdrop').onclick = () => this.closeSheet();
    $('#btnSync').onclick = () => Sync.run(true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeSheet(); });
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.applyColor(); this.render(); }); } catch (e) {}
    this.render();
    Sync.init();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
      // quando arriva una versione nuova, ricarico una volta sola per mostrarla subito
      let ricaricato = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (ricaricato) return; ricaricato = true; location.reload(); });
    }
  },

  saveUi() { try { localStorage.setItem('garage-ui', JSON.stringify(this.state)); } catch (e) {} },

  /* ---------- Tema e colori ---------- */
  modo() { try { return localStorage.getItem('garage-tema') || 'dark'; } catch (e) { return 'dark'; } },
  isDark() {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return matchMedia('(prefers-color-scheme: dark)').matches;
  },
  setModo(t) {
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try { localStorage.setItem('garage-tema', t); } catch (e) {}
    this.applyColor();
  },
  applyColor() {
    const t = TEMI.find(x => x.k === this.state.colore) || TEMI[0];
    const dark = this.isDark();
    const vars = { '--accent': dark ? t.d : t.l, '--accent-2': t.a2 };
    for (const k in vars) document.documentElement.style.setProperty(k, vars[k]);
    try { localStorage.setItem('garage-colore-css', JSON.stringify(vars)); } catch (e) {}
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || (dark ? '#0f1117' : '#f5f6fa');
  },

  openThemeSheet() {
    const modo = this.modo();
    this.openSheet('Temi e colori', `
      <div class="field"><span class="lbl">Aspetto</span>
        <div class="seg" id="segModo">
          ${[['dark', '🌙 Scuro'], ['light', '☀️ Chiaro'], ['auto', '📱 Auto']].map(([k, l]) => `<button class="${modo === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="field" style="margin-top:18px"><span class="lbl">Colore</span>
        <div class="themes">
          ${TEMI.map(t => `<button class="theme-btn ${this.state.colore === t.k ? 'on' : ''}" data-c="${t.k}">
            <span class="sw" style="background:linear-gradient(140deg, ${this.isDark() ? t.d : t.l}, ${t.a2})">${t.e}</span>${t.n}</button>`).join('')}
        </div>
      </div>
      <p class="muted" style="text-align:center;margin:18px 0 4px">Il tema si applica subito, prova! ✨</p>`);
    const body = $('#sheetBody');
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { this.setModo(b.dataset.m); this._needRender = true; this.openThemeSheet(); });
    body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { this.state.colore = b.dataset.c; this.saveUi(); this.applyColor(); this._needRender = true; this.openThemeSheet(); });
  },

  /* ---------- Router ---------- */
  render() {
    const hash = location.hash.replace('#', '') || 'home';
    const [route, param] = hash.split('/');
    Charts.clear();
    if (typeof Viaggi !== 'undefined') Viaggi.pulisci();
    const parent = { veicolo: 'mezzi', scadenze: 'altro', movimenti: 'home', documenti: 'altro', viaggi: 'altro', viaggio: 'altro' }[route] || route;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === parent));
    $('#btnBack').hidden = !['veicolo', 'scadenze', 'movimenti', 'documenti', 'viaggi', 'viaggio'].includes(route);
    const view = $('#view');
    const nuovaPagina = this._lastHash !== hash;
    if (nuovaPagina) { view.style.animation = 'none'; void view.offsetWidth; view.style.animation = ''; }

    const views = {
      home: () => this.vHome(),
      mezzi: () => this.vMezzi(),
      veicolo: () => this.vVeicolo(param),
      statistiche: () => this.vStatistiche(),
      altro: () => this.vAltro(),
      scadenze: () => this.vScadenze(),
      movimenti: () => this.vMovimenti(),
      documenti: () => this.vDocumenti(),
      viaggi: () => this.vViaggi(),
      viaggio: () => this.vViaggio(param)
    };
    (views[route] || views.home)();
    if (nuovaPagina) window.scrollTo(0, 0);
    this._lastHash = hash;
  },

  setTitle(t) { $('#pageTitle').textContent = t; document.title = t === 'Garage' ? 'Garage' : t + ' · Garage'; },

  /* ---------- Click globali ---------- */
  onClick(e) {
    const el = e.target.closest('[data-edit],[data-go],[data-act]');
    if (!el || el.closest('#frm')) return;
    if (el.dataset.edit) { const [t, id] = el.dataset.edit.split(':'); this.openForm(t, id); }
    else if (el.dataset.go) { location.hash = el.dataset.go; }
    else if (el.dataset.act) { this.action(el.dataset.act, el); }
  },

  action(act, el) {
    const d = el.dataset;
    const set = (k, v) => { this.state[k] = v; this.saveUi(); this.render(); };
    switch (act) {
      case 'new-veicolo': this.openForm('veicoli'); break;
      case 'new': this.openForm(d.table, null, { veicoloId: d.vid }); break;
      case 'tab': set('vehTab', d.tab); break;
      case 'stab': set('statTab', d.tab); break;
      case 'periodo': set('statPeriodo', d.p); break;
      case 'sveicolo': set('statVeicolo', d.v); break;
      case 'mtipo': set('movTipo', d.v); break;
      case 'mveicolo': set('movVeicolo', d.v); break;
      case 'export': this.exportBackup(); break;
      case 'import': this.importBackup(); break;
      case 'temi': this.openThemeSheet(); break;
      case 'nome': this.openNomeSheet(); break;
      case 'sheets': this.openSyncSheet(); break;
      case 'sync-now': Sync.run(true).then(() => this.openSyncSheet()); break;
      case 'soon': this.toast('In arrivo nel prossimo aggiornamento 🚀'); break;
      case 'doc-open': Docs.apri(DB.get('documenti', d.id)); break;
      case 'dveicolo': set('docVeicolo', d.v); break;
      case 'vveicolo': set('viaVeicolo', d.v); break;
      case 'vanno': set('viaAnno', d.v); break;
      case 'via-mappa': this.state.viaVeicolo = d.v; this.state.viaAnno = 'tutti'; this.saveUi(); location.hash = '#viaggi'; break;
      case 'via-gpx': { const v = DB.get('viaggi', d.id); if (v) Viaggi.scaricaGpx(v); break; }
      case 'via-import': this.importaGpx(d.v); break;
      case 'drivvo': this.importaDrivvo(); break;
    }
  },

  /* ---------- Helpers ---------- */
  nomeVeicolo(v) { return v ? (v.nome || [v.marca, v.modello].filter(Boolean).join(' ') || 'Veicolo') : '—'; },
  emojiVeicolo(v) { return CONFIG.iconaTipo[v && v.tipo] || '🚗'; },
  avatar(v, cls = '') {
    return `<div class="vavatar ${cls}">${v.foto ? `<img src="${v.foto}" alt="">` : this.emojiVeicolo(v)}</div>`;
  },
  veicoliOrdinati() { return DB.list('veicoli').sort((a, b) => (a.ordine || 0) - (b.ordine || 0) || (a.createdAt || '').localeCompare(b.createdAt || '')); },

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.hidden = true, 2600);
  },

  /** Variazione in % come chip colorato. costo=true: salire è "male" */
  deltaChip(cur, prev, costo = true) {
    if (!prev && !cur) return '';
    if (!prev) return '<span class="chip">nuovo</span>';
    const p = (cur - prev) / prev * 100;
    if (Math.abs(p) < 0.5) return '<span class="chip">= uguale</span>';
    const cls = costo ? (p > 0 ? 'bad' : 'good') : 'acc';
    return `<span class="chip ${cls}">${p > 0 ? '▲' : '▼'} ${F.num(Math.abs(p), 0)}%</span>`;
  },
  delta(cur, prev, costo = true) { return this.deltaChip(cur, prev, costo) ? `<div class="d" style="margin-top:6px">${this.deltaChip(cur, prev, costo)}</div>` : ''; },

  stat(k, v, extra = '') { return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div>${extra}</div>`; },

  riepilogoVeicolo(v) {
    const s = Calc.stats([v.id], Periodi.range('tutto'));
    const carbs = Calc.carburantiVeicolo(v);
    const princ = carbs.map(c => ({ c, x: Calc.consumo(v.id, c) })).sort((a, b) => b.x.qta - a.x.qta)[0];
    const kmNow = Calc.kmAttuali(v);
    const rif = DB.list('rifornimenti').filter(x => x.veicoloId === v.id).sort((a, b) => b.data.localeCompare(a.data) || num(b.km) - num(a.km))[0];
    const man = DB.list('manutenzioni').filter(x => x.veicoloId === v.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    const scad = Calc.scadenze(v.id)[0];
    const lett = Calc.letture(v.id);
    const base = lett.length || num(v.kmIniziali) ? Calc.kmBase(v) : kmNow;
    const kmPercorsi = Math.max(0, kmNow - base);
    return { s, kmNow, princ, rif, man, scad, kmPercorsi, costoKm: kmPercorsi && s.costoTot ? s.costoTot / kmPercorsi : 0,
      costoCarbKm: kmPercorsi && s.costoCarb ? s.costoCarb / kmPercorsi : 0 };
  },

  testoConsumo(r) {
    return r.princ && r.princ.x.qta ? `${F.num(r.princ.x.kmL, 1)} km/${CONFIG.unitaCarburante[r.princ.c] || 'L'}` : '—';
  },

  testoScadenza(sc) {
    if (!sc) return '—';
    const parts = [];
    if (sc.data) parts.push(sc.giorni < 0 ? `scaduta da ${-sc.giorni} gg` : sc.giorni === 0 ? 'oggi!' : sc.giorni === 1 ? 'domani' : `tra ${sc.giorni} gg`);
    if (sc.km) parts.push(sc.kmMancanti < 0 ? `superata di ${F.num(-sc.kmMancanti)} ${sc.unita}` : `tra ${F.num(sc.kmMancanti)} ${sc.unita}`);
    return parts.join(' · ');
  },
  chipScadenza(sc) {
    const cls = { ok: 'good', vicina: 'warn', scaduta: 'bad' }[sc.stato];
    return `<span class="chip ${cls}">${esc(this.testoScadenza(sc))}</span>`;
  },
  emojiScadenza(sc) {
    return { bollo: '📄', assicurazione: '🛡️', revisione: '✅', documento: '📁' }[sc.tipo] || CONFIG.emojiManutenzione[sc.titolo] || '🔧';
  },

  oggiLungo() {
    const d = new Date();
    const g = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'][d.getDay()];
    return g.charAt(0).toUpperCase() + g.slice(1) + ' ' + d.getDate() + ' ' + D.monthLong(d.getMonth()).toLowerCase();
  },

  saluto() {
    const h = new Date().getHours();
    const s = h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    return s + (this.state.nome ? ' ' + esc(this.state.nome) : '') + ' 👋';
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
        <div class="hello"><h2>${this.saluto()}</h2><p>${this.oggiLungo()}</p></div>
        <div class="card empty">
          <div class="e-ic">🏁</div>
          <h4>Benvenuto nel tuo Garage!</h4>
          <p>Inizia aggiungendo il tuo primo mezzo: auto, moto, scooter… anche il trattorino 🚜</p>
          <button class="btn" data-act="new-veicolo">${ICON.plus} Aggiungi un mezzo</button>
        </div>`;
      return;
    }
    const ids = veicoli.map(v => v.id);
    const rM = Periodi.range('mese'), rP = Periodi.previous(rM);
    const s = Calc.stats(ids, rM), p = Calc.stats(ids, rP);
    const scad = Calc.scadenze().filter(x => x.stato !== 'ok').slice(0, 3);
    const mesePrec = D.monthLong(D.parse(rP.from).getMonth()).toLowerCase();

    view.innerHTML = `
      <div class="hello"><h2>${this.saluto()}</h2><p>${this.oggiLungo()}</p></div>

      <div class="quick-row">
        <button class="qa" data-act="new" data-table="rifornimenti"><span class="em t-fuel">⛽</span>Rifornimento</button>
        <button class="qa" data-act="new" data-table="spese"><span class="em t-exp">🧾</span>Spesa</button>
        <button class="qa" data-act="new" data-table="manutenzioni"><span class="em t-maint">🔧</span>Manutenzione</button>
      </div>

      <div class="hero" style="margin-top:14px" data-go="#statistiche">
        <div class="label">Speso a ${esc(D.monthLong(D.parse(rM.from).getMonth()).toLowerCase())}</div>
        <div class="big">${F.eur(s.costoTot)}</div>
        <div>${p.costoTot || s.costoTot ? this.deltaChip(s.costoTot, p.costoTot) + ` <span class="muted">rispetto a ${esc(mesePrec)} (${F.eur(p.costoTot, 0)})</span>` : ''}</div>
        <div class="mini">
          <div><span>Carburante</span><b>${F.eur(s.costoCarb, 0)}</b></div>
          <div><span>Km</span><b>${F.num(s.km)}</b></div>
          <div><span>€/km</span><b>${s.costoKm ? F.num(s.costoKm, 3) : '—'}</b></div>
        </div>
      </div>

      ${scad.length ? `
        <div class="section-title"><h3>Da ricordare</h3><a href="#scadenze">Tutte</a></div>
        <div class="list">${scad.map(sc => this.itemScadenza(sc)).join('')}</div>` : ''}

      <div class="section-title"><h3>I tuoi mezzi</h3><a href="#mezzi">Vedi tutti</a></div>
      <div class="hscroll">
        ${veicoli.map(v => this.miniVeicolo(v)).join('')}
        <div class="mini-v add" data-act="new-veicolo">${ICON.plus}<span>Aggiungi</span></div>
      </div>

      <div class="section-title"><h3>Ultimi movimenti</h3><a href="#movimenti">Vedi tutti</a></div>
      ${this.listaMovimenti(null, 5)}

      <div class="section-title"><h3>🗺️ Viaggi e giri</h3><a href="#viaggi">${DB.list('viaggi').length ? 'Vedi tutti' : 'Apri'}</a></div>
      ${DB.list('viaggi').length ? `<div class="list">${Viaggi.lista().slice(0, 3).map(x => this.itemViaggio(x, true)).join('')}</div>`
        : `<div class="list"><div class="item" data-act="new" data-table="viaggi"><div class="ic t-exp">🗺️</div><div class="main"><div class="t">Registra il primo giro</div><div class="s">Tappe, km e tracciato GPX</div></div>${ICON.chevron}</div></div>`}
    `;
  },

  miniVeicolo(v) {
    const r = this.riepilogoVeicolo(v);
    const u = Calc.unita(v);
    return `
      <div class="mini-v" data-go="#veicolo/${v.id}">
        <div class="top">${this.avatar(v)}<div style="min-width:0"><div class="name">${esc(this.nomeVeicolo(v))}</div><div class="sub">${F.num(r.kmNow)} ${u}</div></div></div>
        <div class="nums">
          <div><span>Costo/${u === 'ore' ? 'ora' : 'km'}</span><b>${r.costoKm ? F.eur(r.costoKm, u === 'ore' ? 2 : 3) : '—'}</b></div>
          <div style="text-align:right"><span>Consumo</span><b>${this.testoConsumo(r)}</b></div>
        </div>
        <div>${r.scad && r.scad.stato !== 'ok' ? `<span class="chip ${r.scad.stato === 'scaduta' ? 'bad' : 'warn'}">${this.emojiScadenza(r.scad)} ${esc(r.scad.titolo.split(' · ')[0])} ${esc(this.testoScadenza(r.scad))}</span>` : '<span class="chip good">✓ Tutto in ordine</span>'}</div>
      </div>`;
  },

  vcard(v) {
    const r = this.riepilogoVeicolo(v);
    const u = Calc.unita(v);
    return `
      <div class="card vcard" data-go="#veicolo/${v.id}">
        <div class="vhead">
          ${this.avatar(v)}
          <div style="flex:1;min-width:0">
            <div class="vname">${esc(this.nomeVeicolo(v))}</div>
            <div class="vsub">${esc([v.marca, v.modello].filter(Boolean).join(' '))}${v.targa ? ' · ' + esc(v.targa) : ''}</div>
          </div>
          <span class="chip acc">${CONFIG.emojiCarburante[v.alimentazione] || '⛽'} ${esc(v.alimentazione || '')}${v.carburante2 ? ' + ' + esc(v.carburante2) : ''}</span>
        </div>
        <div class="vmetrics">
          <div><span>${u === 'ore' ? 'Ore motore' : 'Km attuali'}</span><b>${F.num(r.kmNow)}</b></div>
          <div><span>Speso in tutto</span><b>${F.eur(r.s.costoTot, 0)}</b></div>
          <div><span>Costo/${u === 'ore' ? 'ora' : 'km'}</span><b>${r.costoKm ? F.eur(r.costoKm, u === 'ore' ? 2 : 3) : '—'}</b></div>
        </div>
        <div class="vfoot">
          <div><span>⛽ Ultimo rifornimento</span><b>${r.rif ? D.fmt(r.rif.data) : '—'}</b></div>
          <div><span>📈 Consumo medio</span><b>${this.testoConsumo(r)}</b></div>
          <div><span>🗓️ Prossima scadenza</span>${r.scad ? this.chipScadenza(r.scad) : '<b>—</b>'}</div>
        </div>
      </div>`;
  },

  itemScadenza(sc) {
    return `
      <div class="item" data-go="#veicolo/${sc.veicoloId}">
        <div class="ic ${sc.stato === 'ok' ? 't-exp' : sc.stato === 'vicina' ? 't-maint' : 't-doc'}" style="${sc.stato === 'scaduta' ? 'background:var(--bad-soft)' : ''}">${this.emojiScadenza(sc)}</div>
        <div class="main">
          <div class="t">${esc(sc.titolo)}</div>
          <div class="s">${esc(sc.veicolo)}${sc.data ? ' · ' + D.fmt(sc.data) : ''}${sc.km ? ' · a ' + F.num(sc.km) + ' ' + sc.unita : ''}</div>
        </div>
        <div class="r">${this.chipScadenza(sc)}</div>
      </div>`;
  },

  /* ---------- Movimenti ---------- */
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

  consumiMap() {
    const m = {};
    for (const v of DB.list('veicoli')) for (const c of Calc.carburantiVeicolo(v)) for (const tr of Calc.consumo(v.id, c).tratti) m[tr.id] = tr;
    return m;
  },

  listaMovimenti(vid, limit, tipo, raggruppa) {
    let list = this.movimenti(vid);
    if (tipo) list = list.filter(m => tipo.includes(m.t));
    if (limit) list = list.slice(0, limit);
    if (!list.length) return `<div class="card empty"><div class="e-ic">📭</div><h4>Ancora niente qui</h4><p>Tocca il pulsante <b>+</b> in basso per aggiungere il primo.</p></div>`;
    const cm = this.consumiMap();
    if (!raggruppa) return `<div class="list">${list.map(m => this.itemMovimento(m, !vid, cm)).join('')}</div>`;
    // raggruppati per mese
    const gruppi = [];
    for (const m of list) {
      const k = (m.data || '').slice(0, 7);
      if (!gruppi.length || gruppi[gruppi.length - 1].k !== k) gruppi.push({ k, items: [] });
      gruppi[gruppi.length - 1].items.push(m);
    }
    return gruppi.map(g => {
      const tot = g.items.reduce((a, m) => a + this.importo(m), 0);
      const lab = g.k ? D.monthLong(+g.k.slice(5) - 1) + ' ' + g.k.slice(0, 4) : 'Senza data';
      return `<div class="day-label" style="display:flex;justify-content:space-between"><span>${lab}</span><span>${F.eur(tot, 0)}</span></div>
        <div class="list">${g.items.map(m => this.itemMovimento(m, !vid, cm)).join('')}</div>`;
    }).join('');
  },

  importo(m) {
    const r = m.r;
    return num({ rifornimenti: r.totale, manutenzioni: r.costo, spese: r.importo, bolli: r.importo, assicurazioni: r.costo }[m.t]);
  },

  itemMovimento(m, mostraVeicolo, cm = {}) {
    const r = m.r;
    const v = DB.get('veicoli', r.veicoloId);
    const vn = mostraVeicolo ? esc(this.nomeVeicolo(v)) + ' · ' : '';
    const u = Calc.unita(v);
    const kmTxt = num(r.km) ? ' · ' + F.num(num(r.km)) + ' ' + u : '';
    let em = TIPI_MOV[m.t].e, t, s, extra = '';
    switch (m.t) {
      case 'rifornimenti': {
        const un = CONFIG.unitaCarburante[r.carburante] || 'L';
        em = CONFIG.emojiCarburante[r.carburante] || '⛽';
        t = `${esc(r.carburante || 'Rifornimento')} · ${F.num(num(r.litri), 2)} ${un}`;
        s = vn + D.fmt(r.data) + kmTxt;
        const tr = cm[r.id];
        extra = tr ? `${F.num(tr.kmL, 1)} km/${un}` : `${F.num(num(r.prezzo), 3)} €/${un}`;
        break;
      }
      case 'manutenzioni':
        em = CONFIG.emojiManutenzione[r.tipo] || '🔧';
        t = esc(r.tipo || 'Manutenzione') + (r.descrizione ? ' · ' + esc(r.descrizione) : '');
        s = vn + D.fmt(r.data) + kmTxt + (r.officina ? ' · ' + esc(r.officina) : ''); break;
      case 'spese':
        em = CONFIG.emojiSpesa[r.categoria] || '🧾';
        t = esc(r.categoria || 'Spesa') + (r.descrizione ? ' · ' + esc(r.descrizione) : '');
        s = vn + D.fmt(r.data) + kmTxt; break;
      case 'bolli':
        t = 'Bollo' + (r.periodoDa ? ' ' + r.periodoDa.slice(0, 4) : '');
        s = vn + 'pagato ' + D.fmt(r.dataPagamento) + (r.scadenza ? ' · scade ' + D.fmt(r.scadenza) : ''); break;
      case 'assicurazioni':
        t = 'Assicurazione' + (r.compagnia ? ' · ' + esc(r.compagnia) : '');
        s = vn + D.fmt(r.inizio) + ' → ' + D.fmt(r.scadenza); break;
    }
    const nDoc = Docs.collegati(m.t, r.id).length;
    if (nDoc) s += ` · 📎${nDoc > 1 ? ' ' + nDoc : ''}`;
    return `
      <div class="item" data-edit="${m.t}:${r.id}">
        <div class="ic ${TIPI_MOV[m.t].t}">${em}</div>
        <div class="main"><div class="t">${t}</div><div class="s">${s}</div></div>
        <div class="r"><b>${F.eur(this.importo(m))}</b>${extra ? `<span>${extra}</span>` : ''}</div>
      </div>`;
  },

  vMovimenti() {
    this.setTitle('Movimenti');
    const st = this.state;
    const veicoli = this.veicoliOrdinati();
    if (st.movVeicolo !== 'tutti' && !DB.get('veicoli', st.movVeicolo)) st.movVeicolo = 'tutti';
    const tipi = [['tutti', '✨ Tutti']].concat(Object.entries(TIPI_MOV).map(([k, x]) => [k, x.e + ' ' + x.n]));
    $('#view').innerHTML = `
      <div class="pills">${tipi.map(([k, l]) => `<button class="${st.movTipo === k ? 'on' : ''}" data-act="mtipo" data-v="${k}">${l}</button>`).join('')}</div>
      ${veicoli.length > 1 ? `<div class="pills" style="margin-top:6px">
        <button class="${st.movVeicolo === 'tutti' ? 'on' : ''}" data-act="mveicolo" data-v="tutti">🚦 Tutti i mezzi</button>
        ${veicoli.map(v => `<button class="${st.movVeicolo === v.id ? 'on' : ''}" data-act="mveicolo" data-v="${v.id}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}
      </div>` : ''}
      ${this.listaMovimenti(st.movVeicolo === 'tutti' ? null : st.movVeicolo, 0, st.movTipo === 'tutti' ? null : [st.movTipo], true)}`;
  },

  /* ---------- Documenti ---------- */
  itemDocumento(d, mostraVeicolo) {
    const v = DB.get('veicoli', d.veicoloId);
    const sub = [];
    if (mostraVeicolo) sub.push(esc(this.nomeVeicolo(v)));
    if (d.data) sub.push(D.fmt(d.data));
    if (d.scadenza) sub.push('scade ' + D.fmt(d.scadenza));
    if (d.rifId) sub.push(DB.get(d.rifTabella === 'viaggi-gpx' ? 'viaggi' : d.rifTabella, d.rifId) ? '🔗 ' + ({ manutenzioni: 'manutenzione', spese: 'spesa', bolli: 'bollo', assicurazioni: 'assicurazione', 'viaggi-gpx': 'viaggio' }[d.rifTabella] || 'evento') : '🔗 evento eliminato');
    return `
      <div class="item doc" data-act="doc-open" data-id="${d.id}">
        <div class="ic t-doc">${Docs.emojiFile(d)}</div>
        <div class="main"><div class="t">${esc(d.titolo || d.fileNome || 'Documento')}</div><div class="s">${sub.join(' · ')}</div></div>
        <div class="r" style="display:flex;align-items:center;gap:6px">${Docs.statoChip(d)}
          <button class="icon-btn sm" data-edit="documenti:${d.id}" aria-label="Modifica documento">${ICON.edit}</button></div>
      </div>`;
  },

  listaDocumenti(vid) {
    const docs = DB.list('documenti').filter(d => !vid || d.veicoloId === vid);
    if (!docs.length) return `<div class="card empty"><div class="e-ic">🗂️</div><h4>Nessun documento</h4>
      <p>Allega la ricevuta quando registri una manutenzione, oppure aggiungi qui libretto, polizza e altri documenti.</p></div>`;
    const ordine = CONFIG.categorieDocumento;
    const perCat = {};
    docs.forEach(d => { const c = ordine.includes(d.categoria) ? d.categoria : 'Altro'; (perCat[c] = perCat[c] || []).push(d); });
    const v = vid ? DB.get('veicoli', vid) : null;
    return `${v ? `<div class="note-box" style="margin:10px 0 0">📂 Su Google Drive: <b>Garage › ${esc(this.nomeVeicolo(v))}</b>, divisi per categoria e anno.</div>` : ''}` +
      ordine.filter(c => perCat[c]).map(c => {
        const lista = perCat[c].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
        const gruppi = [];
        lista.forEach(d => {
          const k = d.cartella || '';
          let g = gruppi.find(x => x.k === k);
          if (!g) gruppi.push(g = { k, items: [] });
          g.items.push(d);
        });
        gruppi.sort((a, b) => b.k.localeCompare(a.k));
        return `<div class="section-title"><h3>${CONFIG.emojiDocumento[c] || '📁'} ${esc(c)}</h3><span class="muted">${lista.length}</span></div>` +
          gruppi.map(g => `${g.k ? `<div class="day-label">📂 ${esc(g.k)}</div>` : ''}<div class="list">${g.items.map(d => this.itemDocumento(d, !vid)).join('')}</div>`).join('');
      }).join('');
  },

  vDocumenti() {
    this.setTitle('Documenti');
    const st = this.state;
    const veicoli = this.veicoliOrdinati();
    if (st.docVeicolo !== 'tutti' && !DB.get('veicoli', st.docVeicolo)) st.docVeicolo = 'tutti';
    const vid = st.docVeicolo === 'tutti' ? null : st.docVeicolo;
    $('#view').innerHTML = `
      ${veicoli.length > 1 ? `<div class="pills">
        <button class="${!vid ? 'on' : ''}" data-act="dveicolo" data-v="tutti">🚦 Tutti i mezzi</button>
        ${veicoli.map(v => `<button class="${vid === v.id ? 'on' : ''}" data-act="dveicolo" data-v="${v.id}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}
      </div>` : ''}
      <div class="btn-row" style="margin:8px 0 4px"><button class="btn secondary" data-act="new" data-table="documenti" data-vid="${vid || ''}">${ICON.plus} Aggiungi documento</button></div>
      ${this.listaDocumenti(vid)}
      ${!Sync.attivo() ? '<p class="muted" style="margin:14px 6px">⚠️ Collega Google Sheets per salvare i documenti anche su Google Drive. Ora sono solo su questo telefono.</p>' : ''}`;
  },

  /* =========================================================
     MEZZI
     ========================================================= */
  vMezzi() {
    this.setTitle('I miei mezzi');
    const veicoli = this.veicoliOrdinati();
    $('#view').innerHTML = `
      ${veicoli.length ? `<div class="grid grid-auto">${veicoli.map(v => this.vcard(v)).join('')}</div>` :
        `<div class="card empty"><div class="e-ic">🚗</div><h4>Nessun mezzo</h4><p>Aggiungi auto, moto, scooter o altri mezzi.</p></div>`}
      <div class="spacer"></div>
      <button class="btn block" data-act="new-veicolo">${ICON.plus} Nuovo mezzo</button>`;
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
    const tabs = [['panoramica', '📊 Panoramica'], ['rifornimenti', '⛽ Rifornimenti'], ['manutenzioni', '🔧 Manutenzioni'], ['spese', '🧾 Spese'], ['documenti', '📄 Bollo e assicurazione'], ['viaggi', '🗺️ Viaggi'], ['archivio', '📁 Documenti']];
    let body = '';
    if (tab === 'panoramica') body = this.vVeicoloPanoramica(v);
    else if (tab === 'viaggi') {
      const lista = Viaggi.lista(v.id), t = Viaggi.totali(lista);
      body = `<div class="btn-row" style="margin:0 0 12px"><button class="btn secondary" data-act="new" data-table="viaggi" data-vid="${v.id}">${ICON.plus} Nuovo viaggio</button><button class="btn secondary" data-act="via-import" data-v="${v.id}">📥 Importa GPX</button>${lista.length ? `<button class="btn secondary" data-act="via-mappa" data-v="${v.id}">🗺️ Mappa dei giri</button>` : ''}</div>` +
        (lista.length ? `<div class="grid grid-2" style="margin-bottom:12px">${this.stat('🗺️ Viaggi', F.num(t.n))}${this.stat('🛣️ Km in viaggio', F.num(t.km))}</div>` + this.listaViaggi(lista, false) : this.vuotoViaggi());
    }
    else if (tab === 'archivio') body = `<div class="btn-row" style="margin:0 0 4px"><button class="btn secondary" data-act="new" data-table="documenti" data-vid="${v.id}">${ICON.plus} Aggiungi documento</button></div>` + this.listaDocumenti(v.id);
    else {
      const map = { rifornimenti: ['rifornimenti'], manutenzioni: ['manutenzioni'], spese: ['spese'], documenti: ['bolli', 'assicurazioni'] };
      const btns = tab === 'documenti'
        ? `<div class="btn-row" style="margin:0 0 12px"><button class="btn secondary" data-act="new" data-table="bolli" data-vid="${v.id}">📄 Nuovo bollo</button><button class="btn secondary" data-act="new" data-table="assicurazioni" data-vid="${v.id}">🛡️ Nuova assicurazione</button></div>`
        : '';
      body = btns + this.listaMovimenti(v.id, 0, map[tab], true);
    }

    $('#view').innerHTML = `
      <div class="card">
        <div class="vhead">
          ${this.avatar(v, 'lg')}
          <div style="flex:1;min-width:0">
            <div class="vname" style="font-size:21px">${esc(this.nomeVeicolo(v))}</div>
            <div class="vsub">${esc([v.marca, v.modello, v.anno].filter(Boolean).join(' '))}</div>
            <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">
              ${v.targa ? `<span class="chip">${esc(v.targa)}</span>` : ''}
              <span class="chip acc">${CONFIG.emojiCarburante[v.alimentazione] || '⛽'} ${esc(v.alimentazione || '')}${v.carburante2 ? ' + ' + esc(v.carburante2) : ''}</span>
            </div>
          </div>
          <button class="icon-btn" data-edit="veicoli:${v.id}" aria-label="Modifica veicolo">${ICON.edit}</button>
        </div>
      </div>
      <div class="quick-row" style="margin-top:12px">
        <button class="qa" data-act="new" data-table="rifornimenti" data-vid="${v.id}"><span class="em t-fuel">⛽</span>Rifornimento</button>
        <button class="qa" data-act="new" data-table="spese" data-vid="${v.id}"><span class="em t-exp">🧾</span>Spesa</button>
        <button class="qa" data-act="new" data-table="manutenzioni" data-vid="${v.id}"><span class="em t-maint">🔧</span>Manutenzione</button>
      </div>
      <div class="pills" style="margin-top:14px;margin-bottom:6px">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${body}`;
    const on = $('#view .pills button.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  },

  vVeicoloPanoramica(v) {
    const r = this.riepilogoVeicolo(v);
    const u = Calc.unita(v);
    const s = r.s;
    const fuelCards = Calc.carburantiVeicolo(v).map(c => {
      const x = Calc.consumo(v.id, c);
      const pc = s.perCarb[c];
      if (!pc) return '';
      const un = CONFIG.unitaCarburante[c] || 'L';
      return `
        <div class="card">
          <h4>${CONFIG.emojiCarburante[c] || '⛽'} ${esc(c)} <span class="chip" style="float:right">${pc.n} pieni</span></h4>
          <div class="grid grid-2">
            ${this.stat('Consumo medio', x.qta ? F.num(x.kmL, 1) + ' km/' + un : '—')}
            ${this.stat('Prezzo medio', F.num(pc.prezzoMedio, 3) + ' €/' + un)}
            ${this.stat('Spesa', F.eur(pc.costo))}
            ${this.stat('Totale ' + (un === 'L' ? 'litri' : un), F.num(pc.qta, 1))}
            ${x.kmPieno ? this.stat('Km con un pieno', '~' + F.num(x.kmPieno) + ' km') : ''}
            ${pc.n ? this.stat('Spesa media a pieno', F.eur(pc.costo / pc.n)) : ''}
          </div>
          ${x.secondario ? `<p class="muted" style="margin:12px 2px 0">Su un'auto ${esc(v.alimentazione)} la ${esc(c.toLowerCase())} è di supporto: il consumo non si calcola (spesa e litri sì).</p>`
            : !x.qta ? `<p class="muted" style="margin:12px 2px 0">💡 Il consumo appare dopo il secondo pieno.</p>` : ''}
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
        ${this.stat(u === 'ore' ? '⏱️ Ore motore' : '🛣️ Km attuali', F.num(r.kmNow))}
        ${this.stat(u === 'ore' ? '⏱️ Ore registrate' : '🧭 Km percorsi', F.num(r.kmPercorsi))}
        ${this.stat('⛽ Speso in carburante', F.eur(s.costoCarb))}
        ${this.stat('⛽ Carburante/' + (u === 'ore' ? 'ora' : 'km'), r.costoCarbKm ? F.eur(r.costoCarbKm, 3) : '—')}
        ${this.stat('💶 Speso in tutto', F.eur(s.costoTot))}
        ${this.stat('📏 Costo/' + (u === 'ore' ? 'ora' : 'km'), r.costoKm ? F.eur(r.costoKm, 3) : '—')}
      </div>
      ${scad.length ? `<div class="section-title"><h3>Scadenze</h3></div><div class="list">${scad.map(sc => this.itemScadenza(sc)).join('')}</div>` : ''}
      ${fuelCards ? `<div class="section-title"><h3>Carburante</h3></div>${fuelCards}` : ''}
      <div class="section-title"><h3>Dove vanno i soldi</h3></div>
      <div class="card">${this.barreCategorie(s.cat)}</div>
      <div class="section-title"><h3>Ultimi movimenti</h3></div>
      ${this.listaMovimenti(v.id, 5)}
      <div class="section-title"><h3>Dati del mezzo</h3><button class="link" data-edit="veicoli:${v.id}">Modifica</button></div>
      <div class="kv">${kv.map(([k, val]) => `<div><span>${k}</span><b>${esc(val)}</b></div>`).join('')}</div>
      ${v.note ? `<div class="card" style="margin-top:12px"><div class="muted">📝 Note</div>${esc(v.note)}</div>` : ''}`;
  },

  barreCategorie(cat, emoji = CONFIG.emojiSpesa) {
    const rows = Object.entries(cat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '<div class="muted" style="text-align:center;padding:10px">Nessuna spesa in questo periodo 🎉</div>';
    const max = rows[0][1], tot = rows.reduce((a, r) => a + r[1], 0);
    return `<div class="bars">${rows.map(([k, v]) => `
      <div class="bar-row">
        <div class="em">${typeof emoji === 'function' ? emoji(k) : (emoji[k] || '📦')}</div>
        <div class="body">
          <div class="top"><span style="color:var(--text);font-weight:800;overflow:hidden;text-overflow:ellipsis">${esc(k)}</span><span>${F.eur(v, 0)} · ${F.num(v / tot * 100, 0)}%</span></div>
          <div class="track"><div class="fill" style="width:${(v / max * 100).toFixed(1)}%"></div></div>
        </div>
      </div>`).join('')}</div>`;
  },

  /* =========================================================
     STATISTICHE
     ========================================================= */
  etichettaBreve(r) {
    if (!r || !r.from) return '';
    const f = D.parse(r.from);
    switch (r.key) {
      case 'mese': return D.monthLong(f.getMonth()).slice(0, 3) + ' ' + String(f.getFullYear()).slice(2);
      case 'anno': return String(f.getFullYear());
      case 'trimestre': return 'T' + (Math.floor(f.getMonth() / 3) + 1) + ' ' + String(f.getFullYear()).slice(2);
      case 'semestre': return 'S' + (f.getMonth() < 6 ? 1 : 2) + ' ' + String(f.getFullYear()).slice(2);
      default: return D.fmt(r.from).slice(0, 5) + '–' + D.fmt(r.to).slice(0, 5);
    }
  },

  vStatistiche() {
    this.setTitle('Statistiche');
    const veicoli = this.veicoliOrdinati();
    if (!veicoli.length) {
      $('#view').innerHTML = `<div class="card empty"><div class="e-ic">📊</div><h4>Ancora nessun dato</h4><p>Aggiungi un mezzo e qualche rifornimento: qui vedrai quanto usi e quanto spendi.</p><button class="btn" data-act="new-veicolo">${ICON.plus} Aggiungi un mezzo</button></div>`;
      return;
    }
    const st = this.state;
    if (st.statVeicolo !== 'tutti' && !DB.get('veicoli', st.statVeicolo)) st.statVeicolo = 'tutti';
    const ids = st.statVeicolo === 'tutti' ? veicoli.map(v => v.id) : [st.statVeicolo];
    const r = Periodi.range(st.statPeriodo, st.statCustom);
    const prev = Periodi.previous(r);
    const s = Calc.stats(ids, r);
    const p = prev ? Calc.stats(ids, prev) : null;
    const tab = st.statTab || 'riepilogo';

    const filtri = `
      <div class="pills">${CONFIG.periodi.map(([k, l]) => `<button class="${k === st.statPeriodo ? 'on' : ''}" data-act="periodo" data-p="${k}">${l}</button>`).join('')}</div>
      ${st.statPeriodo === 'custom' ? `<div class="custom-range"><div class="field"><label>Dal</label><input type="date" id="cFrom" value="${r.from}"></div><div class="field"><label>Al</label><input type="date" id="cTo" value="${r.to}"></div></div>` : ''}
      ${veicoli.length > 1 ? `<div class="pills" style="margin-top:6px">
        <button class="${st.statVeicolo === 'tutti' ? 'on' : ''}" data-act="sveicolo" data-v="tutti">🚦 Tutti</button>
        ${veicoli.map(v => `<button class="${st.statVeicolo === v.id ? 'on' : ''}" data-act="sveicolo" data-v="${v.id}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}
      </div>` : ''}
      <div class="seg" style="margin:12px 0 14px">
        ${[['riepilogo', 'Riepilogo'], ['carburante', 'Carburante'], ['costi', 'Costi'], ['utilizzo', 'Utilizzo']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="stab" data-tab="${k}">${l}</button>`).join('')}
      </div>`;

    let body = '';
    if (tab === 'riepilogo') body = this.statRiepilogo(s, p, r, prev, ids);
    else if (tab === 'carburante') body = this.statCarburante(s, p);
    else if (tab === 'costi') body = this.statCosti(s, p, ids);
    else body = this.statUtilizzo(s, p);

    $('#view').innerHTML = filtri + body;

    if (st.statPeriodo === 'custom') {
      const upd = () => { st.statCustom = { from: $('#cFrom').value, to: $('#cTo').value }; this.saveUi(); this.render(); };
      $('#cFrom').onchange = upd; $('#cTo').onchange = upd;
    }
    this.drawStatCharts(ids, r, tab);
  },

  statRiepilogo(s, p, r, prev, ids) {
    const facts = [];
    if (s.km) facts.push(['🛣️', 't-fuel', `Hai percorso <b>${F.num(s.km)} km</b>, circa <b>${F.num(s.kmGiorno, 0)}</b> al giorno.`]);
    facts.push(['💶', 't-exp', s.costoTot ? `Hai speso <b>${F.eur(s.costoTot)}</b>, di cui <b>${F.eur(s.costoCarb)}</b> di carburante.` : 'Nessuna spesa in questo periodo. 🎉']);
    if (s.costoKm) facts.push(['📏', 't-doc', `Ogni chilometro ti è costato <b>${F.eur(s.costoKm, 3)}</b>.`]);
    if (s.kmL) facts.push(['⛽', 't-maint', `Consumo medio <b>${F.num(s.kmL, 1)} km/l</b> pagando in media <b>${F.num(s.prezzoMedio, 3)} €/l</b>.`]);
    if (ids.length > 1) {
      const top = ids.map(id => [id, s.perVeicolo[id].costo]).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] > 0) facts.push(['🏆', 't-fuel', `Il mezzo che ti è costato di più è <b>${esc(this.nomeVeicolo(DB.get('veicoli', top[0])))}</b> (${F.eur(top[1], 0)}).`]);
    }

    const cmp = p ? [
      ['🛣️ Km percorsi', s.km, p.km, v => F.num(v) + ' km', false],
      ['💶 Spese totali', s.costoTot, p.costoTot, v => F.eur(v, 0), true],
      ['⛽ Carburante', s.costoCarb, p.costoCarb, v => F.eur(v, 0), true],
      ['📏 Costo al km', s.costoKm, p.costoKm, v => v ? F.eur(v, 3) : '—', true, true],
      ['🏷️ Prezzo medio al litro', s.prezzoMedio, p.prezzoMedio, v => v ? F.num(v, 3) + ' €' : '—', true, true]
    ] : [];
    const a = this.etichettaBreve(r), b = this.etichettaBreve(prev);

    return `
      <div class="hero">
        <div class="label">${esc(r.label)}</div>
        <div class="big">${F.eur(s.costoTot)}</div>
        <div>${p ? this.deltaChip(s.costoTot, p.costoTot) + ` <span class="muted">rispetto a ${esc(prev.label.toLowerCase())}</span>` : ''}</div>
        <div class="mini">
          <div><span>Km</span><b>${F.num(s.km)}</b></div>
          <div><span>Carburante</span><b>${F.eur(s.costoCarb, 0)}</b></div>
          <div><span>€/km</span><b>${s.costoKm ? F.num(s.costoKm, 3) : '—'}</b></div>
        </div>
      </div>

      <div class="section-title"><h3>In breve</h3></div>
      <div class="card"><div class="facts">${facts.map(([e, t, txt]) => `<div class="fact"><div class="em ${t}">${e}</div><p>${txt}</p></div>`).join('')}</div></div>

      ${p ? `
        <div class="section-title"><h3>Confronto</h3><span class="muted">${esc(a)} vs ${esc(b)}</span></div>
        <div class="card" style="padding-top:6px;padding-bottom:6px">
          ${cmp.filter(([, x, y]) => x || y).map(([k, x, y, f, costo, rapporto]) => {
            const mx = Math.max(x, y) || 1;
            return `<div class="cmp-row">
              <div class="top"><span class="k">${k}</span>${rapporto && (!x || !y) ? '' : this.deltaChip(x, y, costo)}</div>
              <div class="duo">
                <span>${esc(a)}</span><div class="track"><div class="fill" style="width:${(x / mx * 100).toFixed(1)}%"></div></div><b>${f(x)}</b>
                <span>${esc(b)}</span><div class="track"><div class="fill prev" style="width:${(y / mx * 100).toFixed(1)}%"></div></div><b>${f(y)}</b>
              </div></div>`;
          }).join('')}
        </div>` : ''}

      <div class="section-title"><h3>Spesa nel tempo</h3></div>
      <div class="card chart-card"><div class="legend" id="lgSpese"></div><div class="chart-box" id="chSpese"></div></div>`;
  },

  statCarburante(s, p) {
    const carbs = Object.keys(s.perCarb);
    if (!carbs.length) return `<div class="card empty"><div class="e-ic">⛽</div><h4>Nessun rifornimento</h4><p>In questo periodo non ci sono rifornimenti.</p></div>`;
    return `
      <div class="grid grid-2 grid-4-lg">
        ${this.stat('⛽ Costo carburante', F.eur(s.costoCarb), this.delta(s.costoCarb, p?.costoCarb))}
        ${this.stat('🧪 Litri', F.num(s.litri, 1), this.delta(s.litri, p?.litri, false))}
        ${this.stat('📈 Consumo medio', s.kmL ? F.num(s.kmL, 1) + ' km/l' : '—')}
        ${this.stat('💧 l/100 km', s.l100 ? F.num(s.l100, 2) : '—')}
        ${this.stat('🏷️ Prezzo medio', s.prezzoMedio ? F.num(s.prezzoMedio, 3) + ' €/l' : '—', this.delta(s.prezzoMedio, p?.prezzoMedio))}
        ${this.stat('📏 Carburante/km', s.costoCarbKm ? F.eur(s.costoCarbKm, 3) : '—')}
        ${this.stat('📅 Litri al mese', F.num(s.litriMese, 1))}
        ${this.stat('☀️ Litri al giorno', F.num(s.litriGiorno, 2))}
      </div>
      ${carbs.length > 1 ? `<div class="section-title"><h3>Per carburante</h3></div>
        <div class="grid grid-auto">${carbs.map(c => { const x = s.perCarb[c]; return `
          <div class="card"><h4>${CONFIG.emojiCarburante[c] || '⛽'} ${esc(c)}</h4>
            <div class="vfoot" style="margin-top:0">
              <div><span>Quantità</span><b>${F.num(x.qta, 1)} ${x.unita}</b></div>
              <div><span>Spesa</span><b>${F.eur(x.costo)}</b></div>
              <div><span>Prezzo medio</span><b>${F.num(x.prezzoMedio, 3)} €/${x.unita}</b></div>
              <div><span>Consumo</span><b>${x.kmL ? F.num(x.kmL, 1) + ' km/' + x.unita : '—'}</b></div>
            </div></div>`; }).join('')}</div>` : ''}
      <div class="section-title"><h3>Prezzo alla pompa</h3></div>
      <div class="card chart-card"><div class="sub">€ al litro, media del periodo</div><div class="legend" id="lgPrezzo"></div><div class="chart-box" id="chPrezzo"></div></div>
      <div class="section-title"><h3>Consumo medio</h3></div>
      <div class="card chart-card"><div class="sub">km/l, calcolato da un pieno all'altro</div><div class="legend" id="lgCons"></div><div class="chart-box" id="chCons"></div></div>`;
  },

  statCosti(s, p, ids) {
    const perVeic = ids.length > 1 ? Object.fromEntries(ids.map(id => [this.nomeVeicolo(DB.get('veicoli', id)), s.perVeicolo[id].costo])) : null;
    const emojiV = {};
    ids.forEach(id => { const v = DB.get('veicoli', id); emojiV[this.nomeVeicolo(v)] = this.emojiVeicolo(v); });
    return `
      <div class="grid grid-2 grid-4-lg">
        ${this.stat('💶 Costo totale', F.eur(s.costoTot), this.delta(s.costoTot, p?.costoTot))}
        ${this.stat('📏 Costo al km', s.costoKm ? F.eur(s.costoKm, 3) : '—', this.delta(s.costoKm, p?.costoKm))}
        ${this.stat('📅 Media al mese', F.eur(s.costoMese, 0))}
        ${this.stat('☀️ Media al giorno', F.eur(s.costoGiorno))}
      </div>
      <div class="section-title"><h3>Dove vanno i soldi</h3></div>
      <div class="card">${this.barreCategorie(s.cat)}</div>
      ${perVeic ? `<div class="section-title"><h3>Confronto tra mezzi</h3></div><div class="card">${this.barreCategorie(perVeic, emojiV)}</div>` : ''}
      <div class="section-title"><h3>Spesa nel tempo</h3></div>
      <div class="card chart-card"><div class="legend" id="lgSpese"></div><div class="chart-box" id="chSpese"></div></div>`;
  },

  statUtilizzo(s, p) {
    return `
      <div class="grid grid-2 grid-4-lg">
        ${this.stat('🛣️ Km totali', F.num(s.km), this.delta(s.km, p?.km, false))}
        ${this.stat('☀️ Km al giorno', F.num(s.kmGiorno, 1))}
        ${this.stat('📆 Km a settimana', F.num(s.kmSettimana, 0))}
        ${this.stat('📅 Km al mese', F.num(s.kmMese, 0))}
        ${this.stat('✍️ Giorni con attività', F.num(s.giorniUso))}
        ${this.stat('🗓️ Giorni nel periodo', F.num(s.giorni))}
      </div>
      <div class="section-title"><h3>Km percorsi</h3></div>
      <div class="card chart-card"><div class="chart-box" id="chKm"></div></div>
      <p class="muted" style="margin:10px 6px">I km si calcolano dal contachilometri che inserisci in rifornimenti, spese e manutenzioni. I mezzi a ore (es. trattorino) non sono inclusi.</p>`;
  },

  drawStatCharts(ids, r, tab) {
    const css = getComputedStyle(document.documentElement);
    const col = i => css.getPropertyValue('--s' + i).trim();
    const accent = css.getPropertyValue('--accent').trim();
    const b = Calc.buckets(r, ids);
    const labels = b.map(x => x.label);
    const tipLabels = b.map(x => x.from === x.to ? D.fmt(x.from) : D.monthLong(D.parse(x.from).getMonth()) + ' ' + x.from.slice(0, 4));
    const legend = (el, series) => { const e = $(el); if (e) e.innerHTML = series.length > 1 ? series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('') : ''; };
    let stats = null;
    const getStats = () => stats || (stats = b.map(x => Calc.stats(ids, x)));

    if ($('#chSpese')) {
      const st = getStats();
      const docs = s => (s.cat.Bollo || 0) + (s.cat.Assicurazione || 0);
      const altre = s => s.costoTot - s.cat.Carburante - s.cat.Manutenzione - docs(s);
      const ser = [
        { name: 'Carburante', color: col(1), data: st.map(s => s.cat.Carburante) },
        { name: 'Manutenzione', color: col(2), data: st.map(s => s.cat.Manutenzione) },
        { name: 'Bollo e assicurazione', color: col(3), data: st.map(docs) },
        { name: 'Altre spese', color: col(4), data: st.map(altre) }
      ].filter(s => s.data.some(v => v > 0));
      legend('#lgSpese', ser);
      Charts.bar($('#chSpese'), { labels, tipLabels, series: ser.length ? ser : [{ name: 'Spese', color: accent, data: labels.map(() => 0) }], stacked: true, fmt: v => F.eur(v), fmtAxis: v => '€' + F.num(v, v < 10 && v % 1 ? 1 : 0) });
    }
    if ($('#chKm')) {
      Charts.bar($('#chKm'), { labels, tipLabels, series: [{ name: 'Km', color: accent, data: getStats().map(s => s.km) }], fmt: v => F.num(v) + ' km', fmtAxis: v => F.num(v) });
    }
    if ($('#chPrezzo')) {
      const st = getStats();
      const carbs = [...new Set(DB.list('rifornimenti').filter(f => ids.includes(f.veicoloId)).map(f => f.carburante))].filter(c => (CONFIG.unitaCarburante[c] || 'L') === 'L');
      const colorFor = c => col({ GPL: 1, Benzina: 2, Diesel: 3 }[c] || 4);
      const sPrezzo = carbs.map(c => ({ name: c, color: colorFor(c), data: st.map(s => s.perCarb[c] ? s.perCarb[c].prezzoMedio : null) }));
      legend('#lgPrezzo', sPrezzo);
      Charts.line($('#chPrezzo'), { labels, tipLabels, series: sPrezzo, zoom: true, fmt: v => F.num(v, 3) + ' €', fmtAxis: v => F.num(v, 2) });
      const sCons = carbs.map(c => ({
        name: c, color: colorFor(c), data: b.map(x => {
          let km = 0, q = 0;
          for (const id of ids) { const k = Calc.consumo(id, c, x); km += k.km; q += k.qta; }
          return q ? km / q : null;
        })
      })).filter(s => s.data.some(v => v != null));
      legend('#lgCons', sCons);
      Charts.line($('#chCons'), { labels, tipLabels, series: sCons, zoom: true, fmt: v => F.num(v, 1) + ' km/l', fmtAxis: v => F.num(v, 1) });
    }
  },


  /* =========================================================
     VIAGGI E GIRI
     ========================================================= */
  itemViaggio(x, mostraVeicolo) {
    const v = DB.get('veicoli', x.veicoloId);
    const tappe = Viaggi.tappe(x);
    const sub = [];
    if (mostraVeicolo) sub.push(esc(this.nomeVeicolo(v)));
    sub.push(D.fmt(x.data));
    if (tappe.length >= 2) sub.push(esc(tappe[0]) + ' → ' + esc(tappe[tappe.length - 1]));
    else if (tappe.length) sub.push(esc(tappe[0]));
    return `
      <div class="item" data-go="#viaggio/${x.id}">
        <div class="ic t-exp">${x.tracciato ? '🗺️' : this.emojiVeicolo(v)}</div>
        <div class="main"><div class="t">${esc(x.titolo || 'Viaggio')}</div><div class="s">${sub.join(' · ')}</div></div>
        <div class="r"><b>${num(x.km) ? F.num(num(x.km)) + ' km' : '—'}</b>${x.durata ? `<span>${esc(x.durata)}</span>` : ''}</div>
      </div>`;
  },

  listaViaggi(lista, mostraVeicolo) {
    const gruppi = [];
    for (const x of lista) {
      const k = (x.data || '').slice(0, 4) || 'Senza data';
      if (!gruppi.length || gruppi[gruppi.length - 1].k !== k) gruppi.push({ k, items: [] });
      gruppi[gruppi.length - 1].items.push(x);
    }
    return gruppi.map(g => `<div class="day-label" style="display:flex;justify-content:space-between"><span>${g.k}</span><span>${g.items.length} ${g.items.length === 1 ? 'giro' : 'giri'} · ${F.num(Viaggi.totali(g.items).km)} km</span></div>
      <div class="list">${g.items.map(x => this.itemViaggio(x, mostraVeicolo)).join('')}</div>`).join('');
  },

  vuotoViaggi() {
    return `<div class="card empty"><div class="e-ic">🗺️</div><h4>Nessun viaggio ancora</h4>
      <p>Segna i giri importanti: tappe, km e, se ce l'hai, il file GPX del tracciato.</p>
      <button class="btn" data-act="new" data-table="viaggi">${ICON.plus} Nuovo viaggio</button>
      <button class="btn secondary" data-act="via-import" data-v="" style="margin-top:10px">📥 Importa più GPX insieme</button></div>`;
  },

  /** Importa l'export CSV di Drivvo in un mezzo: aggiunge rifornimenti, manutenzioni e spese, saltando quelli già presenti */
  importaDrivvo() {
    const vs = this.veicoliOrdinati();
    if (!vs.length) { this.toast('Prima aggiungi un mezzo'); return; }
    let scelto = DB.get('veicoli', this.state.ultimoVeicolo) ? this.state.ultimoVeicolo : vs[0].id, dati = null;
    this.openSheet('📥 Importa da Drivvo', `<div class="form">
      ${vs.length > 1 ? `<div class="field"><span class="lbl">In quale mezzo?</span>
        <div class="chips scroll" id="drvVeic">${vs.map(v => `<button type="button" data-v="${v.id}" class="${scelto === v.id ? 'on' : ''}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}</div></div>` : ''}
      <p class="muted" style="margin:0 4px">In Drivvo: Esporta dati → CSV, un mezzo alla volta. I dati attuali restano: aggiungo solo quello che manca (stessa data, km e importo = già presente).</p>
      <button type="button" class="btn block" id="drvScegli">🗂️ Scegli il file CSV</button>
      <div id="drvAnteprima"></div>
    </div>`);
    const body = $('#sheetBody'), ant = body.querySelector('#drvAnteprima');
    const doppio = (t, o, imp) => DB.list(t).some(x => x.veicoloId === scelto && x.data === o.data && Math.abs(num(x.km) - num(o.km)) < 1 && Math.abs(num(x[imp]) - num(o[imp])) < 0.01);
    const anteprima = () => {
      if (!dati) return;
      const nuovi = {
        rifornimenti: dati.rifornimenti.filter(o => !doppio('rifornimenti', o, 'totale')),
        manutenzioni: dati.manutenzioni.filter(o => !doppio('manutenzioni', o, 'costo')),
        spese: dati.spese.filter(o => !doppio('spese', o, 'importo'))
      };
      const v = DB.get('veicoli', scelto);
      const carbs = [...new Set(nuovi.rifornimenti.map(o => o.carburante))];
      const mancanti = carbs.filter(c => c !== v.alimentazione && c !== v.carburante2);
      const anni = dati.rifornimenti.concat(dati.manutenzioni).map(o => o.data).sort();
      const tot = nuovi.rifornimenti.length + nuovi.manutenzioni.length + nuovi.spese.length;
      ant.innerHTML = `<div class="card" style="margin-top:6px">
        <h4>${esc(this.nomeVeicolo(v))}${anni.length ? ` · ${D.fmt(anni[0])} – ${D.fmt(anni[anni.length - 1])}` : ''}</h4>
        <p>⛽ <b>${nuovi.rifornimenti.length}</b> rifornimenti · 🔧 <b>${nuovi.manutenzioni.length}</b> manutenzioni${dati.spese.length ? ` · 🧾 <b>${nuovi.spese.length}</b> spese` : ''}</p>
        ${tot < dati.rifornimenti.length + dati.manutenzioni.length + dati.spese.length ? `<p class="muted">${dati.rifornimenti.length + dati.manutenzioni.length + dati.spese.length - tot} già presenti, li salto.</p>` : ''}
        ${mancanti.length ? `<p class="muted">Aggiungo <b>${esc(mancanti.join(', '))}</b> ai carburanti del mezzo.</p>` : ''}
        ${dati.avvisi.length ? `<div class="note-box">⚠️ Da controllare dopo l'import:<br>${dati.avvisi.map(esc).join('<br>')}</div>` : ''}
        <button type="button" class="btn block" id="drvVai" ${tot ? '' : 'disabled'}>${tot ? `Importa ${tot} movimenti` : 'Niente di nuovo da importare'}</button></div>`;
      const vai = ant.querySelector('#drvVai');
      vai.onclick = async () => {
        vai.disabled = true; vai.textContent = 'Importo…';
        try {
          if (mancanti.length) {
            const cambi = {};
            if (!v.alimentazione) cambi.alimentazione = mancanti.shift();
            if (!v.carburante2 && mancanti.length) cambi.carburante2 = mancanti.shift();
            if (Object.keys(cambi).length) await DB.save('veicoli', { ...v, ...cambi });
          }
          for (const t of ['rifornimenti', 'manutenzioni', 'spese'])
            for (const o of nuovi[t]) await DB.save(t, { ...o, id: DB.newId(), veicoloId: scelto });
          this.closeSheet(); this.toast(`Importati ${tot} movimenti da Drivvo ✓`); this.render();
        } catch (e) { alert('Import interrotto: ' + e.message); vai.disabled = false; }
      };
    };
    body.querySelectorAll('#drvVeic button').forEach(b => b.onclick = () => {
      scelto = b.dataset.v; body.querySelectorAll('#drvVeic button').forEach(x => x.classList.toggle('on', x === b)); anteprima();
    });
    body.querySelector('#drvScegli').onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain,application/vnd.ms-excel';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        try { dati = Drivvo.leggi(await f.text()); anteprima(); }
        catch (e) { ant.innerHTML = `<div class="note-box">⚠️ Non riesco a leggere il file: ${esc(e.message)}</div>`; }
      };
      inp.click();
    };
  },

  /** Importa tanti file GPX in un colpo solo: ogni file diventa un viaggio col suo tracciato (e il GPX va su Drive) */
  importaGpx(vid) {
    const vs = this.veicoliOrdinati();
    if (!vs.length) { this.toast('Prima aggiungi un mezzo'); return; }
    let scelto = (vid && DB.get('veicoli', vid)) ? vid : (DB.get('veicoli', this.state.ultimoVeicolo) ? this.state.ultimoVeicolo : vs[0].id);
    this.openSheet('📥 Importa più GPX', `<div class="form">
      ${vs.length > 1 ? `<div class="field"><span class="lbl">Con quale mezzo?</span>
        <div class="chips scroll" id="impVeic">${vs.map(v => `<button type="button" data-v="${v.id}" class="${scelto === v.id ? 'on' : ''}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}</div></div>` : ''}
      <label class="check-row" style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="checkbox" id="impTappe" checked style="width:22px;min-height:22px;flex:0 0 22px"><span>Trova le tappe in automatico <span class="muted">(circa 6 secondi a giro)</span></span></label>
      <p class="muted" style="margin:0 4px">Puoi selezionare tutti i file insieme. Nome, data, km, durata e dislivello li prendo dai GPX; i giri già presenti (stessa data e stessi km) li salto.</p>
      <button type="button" class="btn block" id="impScegli">🗂️ Scegli i file GPX</button>
      <div class="list" id="impLog" hidden></div>
    </div>`);
    const body = $('#sheetBody');
    body.querySelectorAll('#impVeic button').forEach(b => b.onclick = () => {
      scelto = b.dataset.v; body.querySelectorAll('#impVeic button').forEach(x => x.classList.toggle('on', x === b));
    });
    body.querySelector('#impScegli').onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true; inp.accept = '.gpx,application/gpx+xml,application/xml,text/xml,application/octet-stream';
      inp.onchange = () => { if (inp.files.length) this._importaFile([...inp.files], scelto, body.querySelector('#impTappe').checked); };
      inp.click();
    };
  },

  async _importaFile(files, vid, conTappe) {
    const body = $('#sheetBody'), log = body.querySelector('#impLog'), btn = body.querySelector('#impScegli');
    btn.disabled = true; log.hidden = false; log.innerHTML = '';
    const riga = (ic, t, s) => { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<div class="ic t-exp">${ic}</div><div class="main"><div class="t">${esc(t)}</div><div class="s">${esc(s)}</div></div>`; log.appendChild(d); d.scrollIntoView({ block: 'nearest' }); return d; };
    files.sort((a, b) => a.name.localeCompare(b.name));
    let ok = 0, saltati = 0, errori = 0;
    for (const [i, f] of files.entries()) {
      const r = riga('⏳', f.name, `${i + 1} di ${files.length} · leggo il file…`);
      try {
        const g = await Viaggi.leggiGpx(f);
        const data = g.data || D.iso(new Date(f.lastModified || Date.now()));
        const doppio = DB.list('viaggi').find(v => v.veicoloId === vid && v.data === data && Math.abs(num(v.km) - g.km) < 0.5);
        if (doppio) { saltati++; r.innerHTML = r.innerHTML.replace('⏳', '⏭️'); r.querySelector('.s').textContent = 'Già presente: «' + (doppio.titolo || 'Viaggio') + '»'; continue; }
        let tappe = '';
        if (conTappe) {
          r.querySelector('.s').textContent = `${i + 1} di ${files.length} · cerco le tappe…`;
          try { tappe = (await Viaggi.trovaTappe(g.punti)).join(' → '); } catch (e) { /* senza tappe */ }
        }
        const titolo = g.nome || f.name.replace(/\.gpx$/i, '').replace(/[_-]+/g, ' ').trim() || 'Giro';
        const o = { id: DB.newId(), veicoloId: vid, titolo, data, km: g.km, durata: g.durataMin ? Viaggi.fmtDurata(g.durataMin) : '', dislivello: g.dislivello || '', tappe, tracciato: g.enc, note: '' };
        await DB.save('viaggi', o);
        await Viaggi.salvaGpx(o, g, false);
        ok++;
        r.querySelector('.ic').textContent = '✅';
        r.querySelector('.t').textContent = titolo;
        r.querySelector('.s').textContent = `${D.fmt(data)} · ${F.num(g.km, 1)} km${tappe ? ' · ' + tappe : ''}`;
      } catch (e) {
        errori++;
        r.querySelector('.ic').textContent = '⚠️';
        r.querySelector('.s').textContent = e.message || 'File non leggibile';
      }
    }
    if (ok) this.state.ultimoVeicolo = vid;
    this.saveUi();
    btn.disabled = false; btn.textContent = '🗂️ Importa altri file';
    this.toast(`Importati ${ok} giri` + (saltati ? ` · ${saltati} già presenti` : '') + (errori ? ` · ${errori} con errori` : ''));
    this._needRender = true;
  },

  vViaggi() {
    this.setTitle('Viaggi e giri');
    const st = this.state;
    const veicoli = this.veicoliOrdinati();
    if (st.viaVeicolo !== 'tutti' && !DB.get('veicoli', st.viaVeicolo)) st.viaVeicolo = 'tutti';
    const vid = st.viaVeicolo === 'tutti' ? null : st.viaVeicolo;
    const delMezzo = Viaggi.lista(vid);
    const anni = [...new Set(delMezzo.map(x => (x.data || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    if (st.viaAnno !== 'tutti' && !anni.includes(st.viaAnno)) st.viaAnno = 'tutti';
    const lista = st.viaAnno === 'tutti' ? delMezzo : delMezzo.filter(x => (x.data || '').startsWith(st.viaAnno));
    const t = Viaggi.totali(lista);
    const conTraccia = lista.filter(x => x.tracciato).length;
    $('#view').innerHTML = `
      ${veicoli.length > 1 ? `<div class="pills">
        <button class="${!vid ? 'on' : ''}" data-act="vveicolo" data-v="tutti">🚦 Tutti i mezzi</button>
        ${veicoli.map(v => `<button class="${vid === v.id ? 'on' : ''}" data-act="vveicolo" data-v="${v.id}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}
      </div>` : ''}
      ${anni.length > 1 ? `<div class="pills" style="margin-top:6px">
        <button class="${st.viaAnno === 'tutti' ? 'on' : ''}" data-act="vanno" data-v="tutti">📅 Sempre</button>
        ${anni.map(a => `<button class="${st.viaAnno === a ? 'on' : ''}" data-act="vanno" data-v="${a}">${a}</button>`).join('')}
      </div>` : ''}
      ${lista.length ? `
        <div class="hero" style="margin-top:10px">
          <div class="label">Km in viaggio ${st.viaAnno === 'tutti' ? '' : 'nel ' + st.viaAnno}</div>
          <div class="big">${F.num(t.km)} km</div>
          <div class="mini">
            <div><span>Giri</span><b>${F.num(t.n)}</b></div>
            <div><span>Il più lungo</span><b>${t.lungo && num(t.lungo.km) ? F.num(num(t.lungo.km)) + ' km' : '—'}</b></div>
            <div><span>Dislivello</span><b>${t.disl ? F.num(t.disl) + ' m' : '—'}</b></div>
          </div>
        </div>
        ${conTraccia ? `<div class="section-title"><h3>Mappa dei giri</h3><span class="muted">${conTraccia} ${conTraccia === 1 ? 'tracciato' : 'tracciati'}</span></div>
          <div class="map-card"><div class="map" id="mappaTutti"></div></div>` : ''}
        <div class="btn-row" style="margin:14px 0 4px"><button class="btn" data-act="new" data-table="viaggi" data-vid="${vid || ''}">${ICON.plus} Nuovo viaggio</button><button class="btn secondary" data-act="via-import" data-v="${vid || ''}">📥 Importa più GPX</button></div>
        ${this.listaViaggi(lista, !vid)}` : this.vuotoViaggi()}`;
    if (conTraccia) Viaggi.mappa($('#mappaTutti'), lista, false);
  },

  vViaggio(id) {
    const x = DB.get('viaggi', id);
    if (!x) { location.hash = '#viaggi'; return; }
    const v = DB.get('veicoli', x.veicoloId);
    this.setTitle(x.titolo || 'Viaggio');
    const tappe = Viaggi.tappe(x);
    const media = Viaggi.media(x);
    const gpx = Viaggi.gpxDoc(x.id);
    const maps = Viaggi.linkMaps(x);
    $('#view').innerHTML = `
      <div class="card">
        <div class="vhead">
          ${v ? this.avatar(v) : ''}
          <div style="flex:1;min-width:0">
            <div class="vname" style="font-size:21px">${esc(x.titolo || 'Viaggio')}</div>
            <div class="vsub">${D.fmt(x.data)}${x.dataFine && x.dataFine !== x.data ? ' → ' + D.fmt(x.dataFine) : ''} · ${esc(this.nomeVeicolo(v))}</div>
          </div>
          <button class="icon-btn" data-edit="viaggi:${x.id}" aria-label="Modifica viaggio">${ICON.edit}</button>
        </div>
      </div>
      <div class="grid grid-2 grid-4-lg" style="margin-top:12px">
        ${this.stat('🛣️ Km', num(x.km) ? F.num(num(x.km), num(x.km) % 1 ? 1 : 0) : '—')}
        ${this.stat('⏱️ Durata', x.durata ? esc(x.durata) : '—')}
        ${this.stat('⛰️ Dislivello', num(x.dislivello) ? F.num(num(x.dislivello)) + ' m' : '—')}
        ${this.stat('🏁 Media', media ? F.num(media, 0) + ' km/h' : '—')}
      </div>
      ${x.tracciato ? `<div class="map-card" style="margin-top:12px"><div class="map tall" id="mappaViaggio"></div></div>` : ''}
      ${tappe.length ? `<div class="section-title"><h3>Tappe</h3>${maps ? `<a href="${maps}" target="_blank" rel="noopener">Apri in Maps</a>` : ''}</div>
        <div class="card"><ol class="tappe">${tappe.map((t, i) => `<li class="${i === 0 ? 'start' : i === tappe.length - 1 ? 'end' : ''}">${esc(t)}</li>`).join('')}</ol></div>` : ''}
      ${x.note ? `<div class="card" style="margin-top:12px"><div class="muted">📝 Note</div>${esc(x.note).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="btn-row" style="margin-top:14px">
        ${gpx || x.tracciato ? `<button class="btn secondary" data-act="via-gpx" data-id="${x.id}">${ICON.download} ${gpx ? (gpx.url && !gpx._file ? 'Apri GPX su Drive' : 'Scarica GPX') : 'Scarica GPX (semplificato)'}</button>` : ''}
        <button class="btn secondary" data-edit="viaggi:${x.id}">${ICON.edit} Modifica</button>
      </div>
      ${gpx ? `<p class="muted" style="margin:10px 6px">${Docs.statoChip(gpx) || '☁️ File GPX salvato su Google Drive'}</p>` : ''}`;
    if (x.tracciato) Viaggi.mappa($('#mappaViaggio'), [x], true);
  },

  /* =========================================================
     ALTRO
     ========================================================= */
  vAltro() {
    this.setTitle('Altro');
    const nScad = Calc.scadenze().filter(x => x.stato !== 'ok').length;
    const conta = ['veicoli', 'rifornimenti', 'manutenzioni', 'spese', 'bolli', 'assicurazioni', 'documenti'].map(t => DB.list(t).length);
    const tema = TEMI.find(x => x.k === this.state.colore) || TEMI[0];
    const modo = { dark: 'scuro', light: 'chiaro', auto: 'automatico' }[this.modo()];
    const item = (act, em, cls, t, s, extra = '') => `<div class="item" ${act}><div class="ic ${cls}">${em}</div><div class="main"><div class="t">${t}</div><div class="s">${s}</div></div>${extra || ICON.chevron}</div>`;
    $('#view').innerHTML = `
      <div class="list">
        ${item('data-go="#scadenze"', '🔔', 't-maint', 'Scadenze e promemoria', nScad ? `${nScad} da controllare` : 'Tutto in regola ✓')}
        ${item('data-go="#movimenti"', '📒', 't-fuel', 'Tutti i movimenti', 'Storico completo con filtri')}
        ${item('data-go="#viaggi"', '🗺️', 't-exp', 'Viaggi e giri', DB.list('viaggi').length ? `${DB.list('viaggi').length} viaggi · ${F.num(Viaggi.totali(DB.list('viaggi')).km)} km` : 'Tappe, km e tracciati GPX')}
        ${item('data-go="#documenti"', '🗂️', 't-doc', 'Documenti', conta[6] ? `${conta[6]} documenti · ricevute, polizze, libretto` : 'Ricevute, polizze, libretto…')}
        ${item('data-act="sheets"', '📗', 't-exp', 'Google Sheets', Sync.attivo() ? (Sync.stato === 'errore' ? '⚠️ Errore di sincronizzazione' : 'Collegato · sincronizzazione automatica') : 'Non collegato · tocca per collegare')}
        ${item('data-act="soon"', '📄', 't-doc', 'Report PDF / Excel', 'In arrivo nel prossimo aggiornamento')}
      </div>

      <div class="section-title"><h3>Personalizza</h3></div>
      <div class="list">
        ${item('data-act="temi"', tema.e, 't-fuel', 'Temi e colori', `${tema.n} · tema ${modo}`)}
        ${item('data-act="nome"', '🙂', 't-exp', 'Il tuo nome', this.state.nome ? esc(this.state.nome) : 'Per il saluto in Home')}
      </div>

      <div class="section-title"><h3>Backup dei dati</h3></div>
      <div class="card">
        <div class="note-box">${Sync.attivo() ? '✅ I dati sono salvati sul dispositivo <b>e</b> nel tuo foglio Google. Il backup su file è una sicurezza in più.' : '⚠️ I dati sono salvati <b>solo su questo dispositivo</b>. Collega Google Sheets oppure fai ogni tanto un backup su file.'}</div>
        <div class="btn-row">
          <button class="btn" data-act="export">${ICON.download} Scarica</button>
          <button class="btn secondary" data-act="import">${ICON.upload} Ripristina</button>
        </div>
        <button class="btn secondary block" data-act="drivvo" style="margin-top:10px">📥 Importa da Drivvo (CSV)</button>
      </div>

      <div class="section-title"><h3>Informazioni</h3></div>
      <div class="kv">
        <div><span>Versione</span><b>${APP_VERSION}</b></div>
        <div><span>Mezzi</span><b>${conta[0]}</b></div>
        <div><span>Rifornimenti</span><b>${conta[1]}</b></div>
        <div><span>Manutenzioni</span><b>${conta[2]}</b></div>
        <div><span>Spese</span><b>${conta[3]}</b></div>
        <div><span>Bolli / Assicurazioni</span><b>${conta[4]} / ${conta[5]}</b></div>
        <div><span>Documenti</span><b>${conta[6]}</b></div>
        <div><span>Viaggi</span><b>${DB.list('viaggi').length}</b></div>
      </div>
      <p class="muted" style="text-align:center;margin:18px 0 4px">Fatto con ❤️ per il tuo garage</p>`;
  },

  openNomeSheet() {
    this.openSheet('Come ti chiami?', `
      <form class="form" id="frmNome">
        <div class="field"><label for="nNome">Il tuo nome</label><input id="nNome" type="text" maxlength="30" value="${esc(this.state.nome)}" placeholder="es. Federico" autocomplete="given-name"></div>
        <p class="muted" style="margin:0 4px">Lo uso solo per salutarti nella Home 😊</p>
        <button class="btn block" type="submit">Salva</button>
      </form>`);
    $('#frmNome').onsubmit = e => {
      e.preventDefault();
      this.state.nome = $('#nNome').value.trim(); this.saveUi();
      this.closeSheet(); this.render(); this.toast(this.state.nome ? `Piacere, ${this.state.nome}! 👋` : 'Salvato ✓');
    };
  },

  vScadenze() {
    this.setTitle('Scadenze');
    const list = Calc.scadenze();
    $('#view').innerHTML = list.length
      ? `<div class="list">${list.map(sc => this.itemScadenza(sc)).join('')}</div>
         <p class="muted" style="margin:14px 6px">🟢 in regola · 🟡 tra meno di ${CONFIG.giorniAvviso} giorni o ${F.num(CONFIG.kmAvviso)} km · 🔴 scaduta.<br>Le scadenze arrivano da manutenzioni con "prossimo intervento", bollo e assicurazione.</p>`
      : `<div class="card empty"><div class="e-ic">✅</div><h4>Nessuna scadenza</h4><p>Quando registri una manutenzione con il "prossimo intervento", un bollo o un'assicurazione, le scadenze compaiono qui.</p></div>`;
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
     FINESTRA DAL BASSO
     ========================================================= */
  openSheet(title, html) {
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = html;
    const wasHidden = $('#sheet').hidden;
    $('#sheet').hidden = false; $('#sheetBackdrop').hidden = false;
    if (wasHidden) $('#sheetBody').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  },
  closeSheet() {
    const eraAperto = !$('#sheet').hidden;
    $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true;
    document.body.style.overflow = '';
    if (eraAperto && this._needRender) { this._needRender = false; this.render(); }
  },
  refresh() { if ($('#sheet').hidden) this.render(); else this._needRender = true; },

  /* ---------- Google Sheets ---------- */
  updateSyncIcon() {
    const b = $('#btnSync');
    if (!b) return;
    b.hidden = Sync.stato === 'off';
    b.className = 'icon-btn sync-' + Sync.stato;
    b.innerHTML = Sync.stato === 'offline' || Sync.stato === 'errore' ? ICON.cloudOff : (Sync.stato === 'sync' ? ICON.refresh : ICON.cloud);
    b.title = { ok: 'Sincronizzato con Google Sheets', sync: 'Sincronizzazione…', errore: 'Errore: ' + Sync.errore, offline: 'Offline: sincronizzerò appena torna la rete' }[Sync.stato] || '';
    const st = document.getElementById('syncStatus');
    if (st) st.innerHTML = this.syncStatusHTML();
  },

  syncStatusHTML() {
    const c = Sync.cfg();
    const quando = c.lastSync ? new Date(c.lastSync).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'mai';
    const map = { ok: ['good', '● Collegato'], sync: ['warn', '↻ Sincronizzazione…'], errore: ['bad', '● Errore'], offline: ['warn', '● Offline'], off: ['', '○ Non collegato'] };
    const [cls, txt] = map[Sync.stato] || map.off;
    return `<span class="chip ${cls}">${txt}</span> <span class="muted">Ultima sincronizzazione: ${quando}</span>${Sync.stato === 'errore' ? `<div class="muted" style="color:var(--bad);margin-top:6px">${esc(Sync.errore)}</div>` : ''}`;
  },

  openSyncSheet() {
    const c = Sync.cfg();
    const on = Sync.attivo();
    this.openSheet('Google Sheets', `
      <div id="syncStatus" style="margin-bottom:14px">${this.syncStatusHTML()}</div>
      ${on ? `
        <div class="note-box">L'app invia ogni modifica al foglio in automatico e riceve quelle fatte nel foglio quando la apri (o quando tocchi la nuvola in alto).</div>
        <div class="btn-row">
          <button class="btn" data-act="sync-now">${ICON.refresh} Sincronizza ora</button>
          <button class="btn secondary" id="btnScollega">Scollega</button>
        </div>
        <p class="muted" style="margin-top:14px;word-break:break-all">Collegato a: ${esc(c.url)}</p>` : `
        <form class="form" id="frmSync">
          <div class="field"><label for="sUrl">Indirizzo dell'app web (Apps Script)</label>
            <input id="sUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" required>
            <div class="hint">Lo trovi in Apps Script → Distribuisci → Gestisci deployment</div></div>
          <div class="field"><label for="sTok">Codice segreto</label>
            <input id="sTok" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" required>
            <div class="hint">Lo stesso che hai scritto in CODICE_SEGRETO nello script</div></div>
          <div class="note-box">Alla prima sincronizzazione i dati già presenti nell'app vengono copiati nel foglio, e quelli del foglio nell'app.</div>
          <button type="submit" class="btn block" id="btnCollega">${ICON.cloud} Collega e sincronizza</button>
        </form>`}
    `);
    const sn = $('#sheetBody').querySelector('[data-act="sync-now"]');
    if (sn) sn.onclick = () => Sync.run(true).then(() => this.openSyncSheet());
    if (on) {
      $('#btnScollega').onclick = () => {
        if (!confirm('Scollegare il foglio Google? I dati restano sia nell\'app sia nel foglio.')) return;
        Sync.scollega(); this.openSyncSheet(); this.toast('Foglio scollegato');
      };
    } else {
      $('#frmSync').onsubmit = async e => {
        e.preventDefault();
        const btn = $('#btnCollega');
        btn.disabled = true; btn.textContent = 'Collegamento in corso…';
        try {
          await Sync.collega($('#sUrl').value, $('#sTok').value);
          this.toast('Collegato a Google Sheets ✓');
          this.openSyncSheet();
          this._needRender = true;
        } catch (err) {
          btn.disabled = false; btn.innerHTML = ICON.cloud + ' Collega e sincronizza';
          alert('Collegamento non riuscito:\n' + err.message);
        }
      };
    }
  },

  quickAdd() {
    if (!DB.list('veicoli').length) { this.openForm('veicoli'); return; }
    const hash = location.hash;
    const vid = hash.startsWith('#veicolo/') ? hash.split('/')[1] : '';
    const opt = (t, em, cls, title, sub) => `<button data-q="${t}"><span class="em ${cls}">${em}</span><div>${title}<small>${sub}</small></div></button>`;
    this.openSheet('Cosa vuoi aggiungere?', `
      <div class="quick">
        ${opt('rifornimenti', '⛽', 't-fuel', 'Rifornimento', 'Litri, prezzo, km')}
        ${opt('spese', '🧾', 't-exp', 'Spesa', 'Lavaggio, pedaggi…')}
        ${opt('manutenzioni', '🔧', 't-maint', 'Manutenzione', 'Tagliando, gomme…')}
        ${opt('bolli', '📄', 't-doc', 'Bollo', 'Pagamento e scadenza')}
        ${opt('assicurazioni', '🛡️', 't-doc', 'Assicurazione', 'Polizza e scadenza')}
        ${opt('viaggi', '🗺️', 't-exp', 'Viaggio / giro', 'Tappe, km, file GPX')}
        ${opt('documenti', '🗂️', 't-doc', 'Documento', 'Libretto, polizza, ricevuta…')}
        ${opt('veicoli', '🚗', 't-fuel', 'Nuovo mezzo', 'Auto, moto, scooter…')}
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

  /* Tipi di campo: text, int, dec (big = grande), date, textarea, chips, veicolo, switch, photo
     Un array = campi affiancati. { more: [...] } = sezione "Altri dettagli" richiudibile */
  forms: {
    veicoli: {
      titolo: ['🚗 Nuovo mezzo', '🚗 Modifica mezzo'],
      campi: () => [
        { k: 'foto', type: 'photo', label: 'Foto' },
        { k: 'tipo', label: 'Che mezzo è?', type: 'chips', options: CONFIG.tipiVeicolo.map(t => ({ v: t, e: CONFIG.iconaTipo[t], l: t.replace(' / attrezzo', '') })), req: true },
        { k: 'nome', label: 'Come lo chiami?', placeholder: 'es. XSR700, Panda GPL', hint: 'Il nome che vedrai nell\'app' },
        [{ k: 'marca', label: 'Marca', placeholder: 'es. Yamaha', req: true }, { k: 'modello', label: 'Modello', placeholder: 'es. XSR700', req: true }],
        { k: 'alimentazione', label: 'Alimentazione', type: 'chips', options: CONFIG.alimentazioni.map(a => ({ v: a, e: CONFIG.emojiCarburante[a] || (a === 'Ibrido' ? '🔋' : '⛽') })), req: true },
        { k: 'carburante2', label: 'Secondo carburante', type: 'chips', options: [{ v: '', l: 'Nessuno' }, 'Benzina', 'GPL', 'Metano'], hint: 'Per auto GPL o metano: la benzina' },
        [{ k: 'unita', label: 'Contatore', type: 'select', options: ['km', 'ore'], labels: { km: 'Chilometri', ore: 'Ore motore' } }, { k: 'kmIniziali', label: 'Km di partenza', type: 'int', hint: 'Il contachilometri di oggi' }],
        { more: [
          [{ k: 'anno', label: 'Anno', type: 'int', placeholder: 'es. 2019' }, { k: 'targa', label: 'Targa', placeholder: 'AB123CD', upper: true }],
          [{ k: 'cilindrata', label: 'Cilindrata (cc)', type: 'int' }, { k: 'potenza', label: 'Potenza (CV)', type: 'int' }],
          [{ k: 'serbatoio', label: 'Serbatoio (L)', type: 'dec' }, { k: 'serbatoio2', label: 'Serbatoio 2 (L)', type: 'dec' }],
          { k: 'note', label: 'Note', type: 'textarea' }
        ] }
      ],
      mount(root) {
        const q = n => root.querySelector(`[name=${n}]`);
        q('alimentazione').addEventListener('change', () => { if (['GPL', 'Metano'].includes(q('alimentazione').value) && !q('carburante2').value) UI.setChip(root, 'carburante2', 'Benzina'); });
        q('tipo').addEventListener('change', () => { if (q('tipo').value.startsWith('Trattorino')) q('unita').value = 'ore'; });
      }
    },

    rifornimenti: {
      titolo: ['⛽ Nuovo rifornimento', '⛽ Modifica rifornimento'],
      campi: () => [
        { k: 'veicoloId', label: 'Mezzo', type: 'veicolo', req: true },
        { k: 'carburante', label: 'Carburante', type: 'chips', options: [], req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'km', label: 'Km totali', type: 'int', req: true, kmHint: true }],
        [{ k: 'litri', label: 'Litri', type: 'dec', big: true, req: true }, { k: 'prezzo', label: '€/litro', type: 'dec', big: true }, { k: 'totale', label: 'Totale €', type: 'dec', big: true, req: true }],
        { k: '_live', type: 'live' },
        { k: 'pieno', label: 'Ho fatto il pieno', type: 'switch', def: true, hint: 'Serve per calcolare bene i consumi' },
        { more: [
          { k: 'distributore', label: 'Distributore', placeholder: 'es. Eni via Roma' },
          { k: 'note', label: 'Note', type: 'textarea' }
        ] }
      ],
      mount(root, rec) {
        const q = n => root.querySelector(`[name=${n}]`);
        const L = q('litri'), P = q('prezzo'), T = q('totale');
        const fillCarb = () => {
          const v = DB.get('veicoli', q('veicoloId').value);
          const list = v ? Calc.carburantiVeicolo(v) : CONFIG.carburanti;
          const cur = q('carburante').value || (rec && rec.carburante);
          const last = DB.list('rifornimenti').filter(f => f.veicoloId === q('veicoloId').value).sort((a, b) => b.data.localeCompare(a.data))[0];
          const val = list.includes(cur) ? cur : (last && list.includes(last.carburante) ? last.carburante : list[0]);
          UI.setChipOptions(root, 'carburante', list.map(c => ({ v: c, e: CONFIG.emojiCarburante[c] })), val);
          setUnit();
        };
        const setUnit = () => {
          const u = CONFIG.unitaCarburante[q('carburante').value] || 'L';
          L.closest('.field').querySelector('label').textContent = u === 'L' ? 'Litri' : u === 'kg' ? 'Kg' : 'kWh';
          P.closest('.field').querySelector('label').textContent = '€/' + (u === 'L' ? 'litro' : u);
          live();
        };
        // anteprima: km dall'ultimo pieno e consumo stimato
        const live = () => {
          const box = root.querySelector('[data-live]');
          const vid = q('veicoloId').value, km = num(q('km').value), c = q('carburante').value;
          const prev = DB.list('rifornimenti').filter(f => f.veicoloId === vid && f.carburante === c && num(f.km) < km && (!rec || f.id !== rec.id) && f.pieno !== false)
            .sort((a, b) => num(b.km) - num(a.km))[0];
          const l = num(L.value);
          if (!km || !prev) { box.hidden = true; return; }
          const dk = km - num(prev.km);
          const v = DB.get('veicoli', vid);
          const sec = v && v.carburante2 === c && ['GPL', 'Metano'].includes(v.alimentazione);
          box.hidden = false;
          box.innerHTML = `🧭 <b>${F.num(dk)} km</b> dall'ultimo pieno${l && !sec && q('pieno').checked && dk / l > 2 && dk / l < 80 ? ` · consumo circa <b>${F.num(dk / l, 1)} km/${CONFIG.unitaCarburante[c] || 'L'}</b>` : ''}`;
        };
        q('veicoloId').addEventListener('change', () => { fillCarb(); UI.updateKmHint(root); });
        q('carburante').addEventListener('change', setUnit);
        q('km').addEventListener('input', live);
        q('pieno').addEventListener('change', live);
        fillCarb();
        // calcolo automatico: il campo toccato meno di recente si ricalcola
        let order = rec ? ['litri', 'totale'] : [];
        const fmt = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
        const recalc = () => {
          const l = num(L.value), p = num(P.value), t = num(T.value);
          [L, P, T].forEach(x => x.classList.remove('calc'));
          const has = { litri: l > 0, prezzo: p > 0, totale: t > 0 };
          if (order.length < 2) {
            if (has.litri && has.prezzo && !order.includes('totale')) { T.value = fmt(l * p, 2); T.classList.add('calc'); }
            else if (has.litri && has.totale && !order.includes('prezzo')) { P.value = fmt(t / l, 3); P.classList.add('calc'); }
            return;
          }
          const target = ['litri', 'prezzo', 'totale'].filter(n => !order.slice(-2).includes(n))[0];
          if (target === 'totale' && has.litri && has.prezzo) { T.value = fmt(l * p, 2); T.classList.add('calc'); }
          else if (target === 'prezzo' && has.litri && has.totale) { P.value = fmt(t / l, 3); P.classList.add('calc'); }
          else if (target === 'litri' && has.prezzo && has.totale) { L.value = fmt(t / p, 2); L.classList.add('calc'); }
        };
        [['litri', L], ['prezzo', P], ['totale', T]].forEach(([n, el]) => el.addEventListener('input', () => {
          order = order.filter(x => x !== n); order.push(n); recalc(); live();
        }));
        live();
      },
      valida(o) {
        if (!o.prezzo && o.litri) o.prezzo = Math.round(o.totale / o.litri * 1000) / 1000;
        return UI.controllaKm(o);
      }
    },

    manutenzioni: {
      titolo: ['🔧 Nuova manutenzione', '🔧 Modifica manutenzione'],
      campi: () => [
        { k: 'veicoloId', label: 'Mezzo', type: 'veicolo', req: true },
        { k: 'tipo', label: 'Cosa hai fatto?', type: 'chips', options: CONFIG.tipiManutenzione.map(t => ({ v: t, e: CONFIG.emojiManutenzione[t] })), req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'km', label: 'Km', type: 'int', kmHint: true }],
        [{ k: 'costo', label: 'Costo €', type: 'dec', big: true }, { k: 'officina', label: 'Officina', placeholder: 'es. da Mario' }],
        { k: 'descrizione', label: 'Descrizione', placeholder: 'es. olio 10W40 + filtro' },
        [{ k: 'prossimaData', label: '🗓️ Prossima volta (data)', type: 'date' }, { k: 'prossimiKm', label: '🧭 Prossima volta (km)', type: 'int' }],
        { k: '_allegati', type: 'allegati', label: '📎 Ricevute e documenti' },
        { more: [{ k: 'note', label: 'Note', type: 'textarea' }] }
      ],
      mount(root) {
        const q = n => root.querySelector(`[name=${n}]`);
        q('tipo').addEventListener('change', () => {
          if (q('tipo').value === 'Revisione' && !q('prossimaData').value && q('data').value) {
            const d = D.parse(q('data').value); d.setFullYear(d.getFullYear() + 2); q('prossimaData').value = D.iso(d);
          }
        });
        q('veicoloId').addEventListener('change', () => UI.updateKmHint(root));
      },
      valida(o) {
        if (!o.costo && !o.descrizione && !o.prossimaData && !o.prossimiKm && !o.km) {
          UI.toast('Aggiungi almeno il costo, i km o una descrizione'); return false;
        }
        return UI.controllaKm(o);
      }
    },

    spese: {
      titolo: ['🧾 Nuova spesa', '🧾 Modifica spesa'],
      campi: () => [
        { k: 'veicoloId', label: 'Mezzo', type: 'veicolo', req: true },
        { k: 'categoria', label: 'Categoria', type: 'chips', options: CONFIG.categorieSpesa.map(c => ({ v: c, e: CONFIG.emojiSpesa[c] })), req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'importo', label: 'Importo €', type: 'dec', big: true, req: true }],
        { k: 'descrizione', label: 'Descrizione', placeholder: 'es. autostrada Milano–Bergamo' },
        { k: '_allegati', type: 'allegati', label: '📎 Ricevute e documenti' },
        { more: [
          { k: 'km', label: 'Km (facoltativo)', type: 'int', kmHint: true },
          { k: 'note', label: 'Note', type: 'textarea' }
        ] }
      ],
      mount(root) { root.querySelector('[name=veicoloId]').addEventListener('change', () => UI.updateKmHint(root)); }
    },

    bolli: {
      titolo: ['📄 Nuovo bollo', '📄 Modifica bollo'],
      campi: () => [
        { k: 'veicoloId', label: 'Mezzo', type: 'veicolo', req: true },
        [{ k: 'dataPagamento', label: 'Pagato il', type: 'date', req: true }, { k: 'importo', label: 'Importo €', type: 'dec', big: true, req: true }],
        [{ k: 'periodoDa', label: 'Valido dal', type: 'date' }, { k: 'periodoA', label: 'Valido al', type: 'date' }],
        { k: 'scadenza', label: '🔔 Prossima scadenza', type: 'date', hint: 'Te la ricordo nelle Scadenze' },
        { k: '_allegati', type: 'allegati', label: '📎 Ricevute e documenti' },
        { more: [{ k: 'note', label: 'Note', type: 'textarea' }] }
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
      titolo: ['🛡️ Nuova assicurazione', '🛡️ Modifica assicurazione'],
      campi: () => [
        { k: 'veicoloId', label: 'Mezzo', type: 'veicolo', req: true },
        [{ k: 'compagnia', label: 'Compagnia', req: true, placeholder: 'es. Allianz' }, { k: 'costo', label: 'Costo €', type: 'dec', big: true, req: true }],
        [{ k: 'inizio', label: 'Dal', type: 'date', req: true }, { k: 'scadenza', label: '🔔 Scade il', type: 'date', req: true }],
        { k: 'copertura', label: 'Copertura', type: 'chips', options: ['RC auto', 'RC + furto/incendio', 'Kasko', 'Mini kasko', 'Altro'] },
        { k: '_allegati', type: 'allegati', label: '📎 Ricevute e documenti' },
        { more: [{ k: 'polizza', label: 'N° polizza' }, { k: 'note', label: 'Note', type: 'textarea' }] }
      ],
      mount(root) {
        const q = n => root.querySelector(`[name=${n}]`);
        q('inizio').addEventListener('change', () => {
          if (q('inizio').value) { const d = D.parse(q('inizio').value); d.setFullYear(d.getFullYear() + 1); q('scadenza').value = D.iso(d); }
        });
      }
    },

    viaggi: {
      titolo: ['🗺️ Nuovo viaggio', '🗺️ Modifica viaggio'],
      campi: () => [
        { k: 'veicoloId', label: 'Con quale mezzo?', type: 'veicolo', req: true },
        { k: '_gpx', type: 'gpx', label: '📍 Tracciato GPX (facoltativo)' },
        { k: 'titolo', label: 'Nome del giro', placeholder: 'es. Giro dei Colli Euganei', req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'dataFine', label: 'Fino al (se più giorni)', type: 'date' }],
        [{ k: 'km', label: 'Km fatti', type: 'dec', big: true }, { k: 'durata', label: 'Durata', placeholder: 'es. 5:30' }],
        { k: 'tappe', label: 'Tappe', type: 'textarea', placeholder: 'Una per riga, es.\nPadova\nAsiago\nPasso Vezzena\nLevico Terme', hint: 'Una tappa per riga, in ordine' },
        { k: '_tappeAuto', type: 'tappeauto' },
        { more: [
          { k: 'dislivello', label: 'Dislivello in salita (m)', type: 'int' },
          { k: 'note', label: 'Note', type: 'textarea', placeholder: 'Com\'è andata, dove avete mangiato, con chi…' }
        ] }
      ],
      mount(root, rec) {
        const q = n => root.querySelector(`[name=${n}]`);
        const box = root.querySelector('#gpxBox');
        const doc = rec ? Viaggi.gpxDoc(rec.id) : null;
        root._gpx = null; root._gpxRimosso = false;
        const draw = () => {
          const g = root._gpx;
          let html = '';
          if (g) html = `<div class="att"><span class="em">🗺️</span><div class="att-name">${esc(g.nomeFile)}<small>nuovo · ${F.num(g.km, 1)} km · ${F.num(g.nPunti)} punti${g.dislivello ? ' · +' + F.num(g.dislivello) + ' m' : ''}</small></div><button type="button" class="att-x" id="gpxX" aria-label="Togli">✕</button></div>`;
          else if (!root._gpxRimosso && (doc || (rec && rec.tracciato))) html = `<div class="att"><span class="em">🗺️</span><div class="att-name">${esc(doc ? doc.fileNome || 'Tracciato GPX' : 'Tracciato salvato')}<small>${doc && doc.url ? 'su Google Drive' : doc ? 'da caricare su Drive' : 'solo tracciato'}</small></div><button type="button" class="att-x" id="gpxX" aria-label="Togli">✕</button></div>`;
          box.innerHTML = html;
          root.querySelector('#gpxAdd').lastChild.textContent = html ? ' Cambia GPX' : ' Carica il file GPX';
          const x = root.querySelector('#gpxX');
          if (x) x.onclick = () => { if (root._gpx) root._gpx = null; else root._gpxRimosso = true; draw(); };
          root.querySelector('#tappeAuto').hidden = !(root._gpx || (!root._gpxRimosso && rec && rec.tracciato));
        };
        root.querySelector('#gpxAdd').onclick = () => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.accept = '.gpx,application/gpx+xml,application/xml,text/xml,application/octet-stream';
          inp.onchange = async () => {
            const f = inp.files[0]; if (!f) return;
            try {
              const g = await Viaggi.leggiGpx(f);
              root._gpx = g; root._gpxRimosso = false;
              // compilo i campi vuoti con i dati del GPX
              if (g.km) q('km').value = String(g.km).replace('.', ',');
              if (g.durataMin && !q('durata').value) q('durata').value = Viaggi.fmtDurata(g.durataMin);
              if (g.dislivello && !q('dislivello').value) q('dislivello').value = g.dislivello;
              if (g.data && (!rec || !rec.id)) q('data').value = g.data;
              if (g.nome && !q('titolo').value) q('titolo').value = g.nome;
              UI.toast(`GPX letto ✓ ${F.num(g.km, 1)} km`);
            } catch (err) { UI.toast(err.message || 'GPX non leggibile'); }
            draw();
          };
          inp.click();
        };
        root.querySelector('#tappeAuto').onclick = async e => {
          const b = e.currentTarget, testo = b.textContent;
          const punti = root._gpx ? root._gpx.punti : Viaggi.decode(rec && rec.tracciato);
          b.disabled = true; b.textContent = '🔎 Cerco i paesi lungo il percorso…';
          try {
            const nomi = await Viaggi.trovaTappe(punti);
            const ta = q('tappe');
            if (!ta.value.trim() || confirm('Sostituire le tappe scritte con quelle trovate?\n\n' + nomi.join(' → '))) ta.value = nomi.join('\n');
          } catch (err) { UI.toast(err.message); }
          b.disabled = false; b.textContent = testo;
        };
        draw();
      },
      valida(o) {
        if (!o.km && !o.tappe && !o._haGpx) { UI.toast('Aggiungi almeno i km, le tappe o il GPX'); return false; }
        if (o.dataFine && o.dataFine < o.data) { UI.toast('La data di fine è prima dell\'inizio'); return false; }
        return true;
      }
    },

    documenti: {
      titolo: ['🗂️ Nuovo documento', '🗂️ Modifica documento'],
      campi: () => [
        { k: 'veicoloId', label: 'Mezzo', type: 'veicolo', req: true },
        { k: '_file', type: 'docfile', label: 'File' },
        { k: 'categoria', label: 'Categoria', type: 'chips', options: CONFIG.categorieDocumento.map(c => ({ v: c, e: CONFIG.emojiDocumento[c] })), req: true },
        { k: 'titolo', label: 'Nome del documento', placeholder: 'es. Carta di circolazione', hint: 'Sarà anche il nome del file su Google Drive' },
        [{ k: 'data', label: 'Data', type: 'date' }, { k: 'cartella', label: 'Anno / periodo', placeholder: 'es. 2025-2026', hint: 'Sottocartella su Drive' }],
        { k: 'scadenza', label: '🔔 Scadenza (facoltativa)', type: 'date', hint: 'Te la ricordo nelle Scadenze' },
        { more: [{ k: 'note', label: 'Note', type: 'textarea' }] }
      ],
      mount(root, rec) {
        const q = n => root.querySelector(`[name=${n}]`);
        // titolo e cartella si compilano da soli finché non li modifichi tu
        let titoloAuto = !rec || !rec.titolo, cartAuto = !rec || !rec.cartella;
        q('titolo').addEventListener('input', () => { titoloAuto = !q('titolo').value; });
        q('cartella').addEventListener('input', () => { cartAuto = !q('cartella').value; });
        const auto = () => {
          const c = q('categoria').value, data = q('data').value;
          if (cartAuto) q('cartella').value = Docs.cartella(c, data, q('scadenza').value);
          if (titoloAuto) q('titolo').value = c ? c + (['Carta di circolazione', 'Certificato di proprietà'].includes(c) || !data ? '' : ' - ' + Docs.meseAnno(data)) : '';
        };
        ['categoria', 'data', 'scadenza'].forEach(n => q(n).addEventListener('change', auto));
        if (!rec) auto();
      }
    }
  },

  ultimaLettura(vid) { const v = DB.get('veicoli', vid); return v ? Calc.kmAttuali(v) : 0; },

  updateKmHint(root) {
    const vid = root.querySelector('[name=veicoloId]')?.value;
    const v = DB.get('veicoli', vid);
    root.querySelectorAll('[data-kmhint]').forEach(inp => {
      const km = this.ultimaLettura(vid);
      inp.placeholder = km ? 'ultimo: ' + F.num(km) : '';
      const lab = inp.closest('.field').querySelector('label');
      if (Calc.unita(v) === 'ore') lab.textContent = lab.textContent.replace(/^Km( totali)?/, 'Ore motore');
      else lab.textContent = lab.textContent.replace(/^Ore motore/, 'Km');
    });
  },

  controllaKm(o) {
    if (!o.km) return true;
    const prec = Calc.letture(o.veicoloId).filter(l => l.data < o.data);
    const maxPrec = prec.length ? Math.max(...prec.map(l => l.km)) : 0;
    if (maxPrec && o.km < maxPrec) {
      return confirm(`Attenzione: hai inserito ${F.num(o.km)} km, ma in una data precedente risultano già ${F.num(maxPrec)} km. Salvare comunque?`);
    }
    return true;
  },

  /* ---------- Pulsanti a scelta (chips) ---------- */
  chipsHTML(k, options, val) {
    return options.map(o => {
      const x = typeof o === 'string' ? { v: o } : o;
      return `<button type="button" data-v="${esc(x.v)}" class="${String(val) === String(x.v) ? 'on' : ''}">${x.e ? `<span>${x.e}</span>` : ''}${esc(x.l ?? x.v)}</button>`;
    }).join('');
  },
  setChipOptions(root, k, options, val) {
    const box = root.querySelector(`.chips[data-for=${k}]`);
    box.innerHTML = this.chipsHTML(k, options, val);
    root.querySelector(`[name=${k}]`).value = val ?? '';
  },
  setChip(root, k, val) {
    const inp = root.querySelector(`[name=${k}]`);
    inp.value = val;
    root.querySelectorAll(`.chips[data-for=${k}] button`).forEach(b => b.classList.toggle('on', b.dataset.v === String(val)));
    inp.dispatchEvent(new Event('change'));
  },

  fieldHTML(f, rec) {
    const val = rec[f.k] ?? (f.def !== undefined ? f.def : '');
    const id = 'f_' + f.k;
    const req = f.req ? ' required' : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
    const lab = `<label for="${id}">${esc(f.label)}</label>`;
    switch (f.type) {
      case 'chips':
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><input type="hidden" name="${f.k}" value="${esc(val)}">
          <div class="chips${f.scroll ? ' scroll' : ''}" data-for="${f.k}">${this.chipsHTML(f.k, f.options, val)}</div>${hint}</div>`;
      case 'veicolo': {
        const vs = this.veicoliOrdinati();
        if (vs.length === 1) return `<input type="hidden" name="${f.k}" value="${esc(vs[0].id)}">`;
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><input type="hidden" name="${f.k}" value="${esc(val)}">
          <div class="chips scroll" data-for="${f.k}">${vs.map(v => `<button type="button" data-v="${v.id}" class="${val === v.id ? 'on' : ''}">${this.avatar(v, 'sm')}${esc(this.nomeVeicolo(v))}</button>`).join('')}</div></div>`;
      }
      case 'select':
        return `<div class="field">${lab}<select id="${id}" name="${f.k}"${req}>${f.options.map(o => `<option value="${esc(o)}" ${String(val) === o ? 'selected' : ''}>${esc(f.labels && f.labels[o] !== undefined ? f.labels[o] : o)}</option>`).join('')}</select>${hint}</div>`;
      case 'date':
        return `<div class="field">${lab}<input type="date" id="${id}" name="${f.k}" value="${esc(val)}"${req}>${hint}</div>`;
      case 'int':
        return `<div class="field">${lab}<input type="number" inputmode="numeric" step="1" min="0" id="${id}" name="${f.k}" value="${esc(val)}"${ph}${req}${f.kmHint ? ' data-kmhint="1"' : ''}>${hint}</div>`;
      case 'dec':
        return `<div class="field">${lab}<input type="text" inputmode="decimal" id="${id}" name="${f.k}" class="${f.big ? 'big' : ''}" value="${val === '' ? '' : esc(String(val).replace('.', ','))}"${ph}${req} autocomplete="off">${hint}</div>`;
      case 'textarea':
        return `<div class="field">${lab}<textarea id="${id}" name="${f.k}"${ph}>${esc(val)}</textarea>${hint}</div>`;
      case 'switch':
        return `<label class="switch"><span>${esc(f.label)}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</span><input type="checkbox" name="${f.k}" ${val !== false ? 'checked' : ''}><span class="tog"></span></label>`;
      case 'live':
        return `<div class="note-box" data-live hidden></div>`;
      case 'allegati':
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="att-list" id="attList"></div>
          <button type="button" class="btn secondary att-add" id="attAdd">${ICON.clip} Allega ricevuta, foto o PDF</button>
          <div class="hint">Puoi scattare una foto o scegliere un file. Finisce anche su Google Drive.</div></div>`;
      case 'docfile':
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="att-list" id="attList"></div>
          <button type="button" class="btn secondary att-add" id="attAdd">${ICON.clip} Scegli foto o PDF</button></div>`;
      case 'gpx':
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="att-list" id="gpxBox"></div>
          <button type="button" class="btn secondary att-add" id="gpxAdd">${ICON.upload} Carica il file GPX</button>
          <div class="hint">Calcolo da solo km, durata e dislivello e disegno il percorso. Il file finisce su Google Drive.</div></div>`;
      case 'tappeauto':
        return `<button type="button" class="btn secondary block" id="tappeAuto" hidden>📍 Trova le tappe dal tracciato</button>`;
      case 'photo':
        return `<div class="field"><div class="photo-pick">
          <div class="vavatar" id="photoPrev">${val ? `<img src="${val}" alt="">` : '📷'}</div>
          <button type="button" class="btn secondary" id="photoBtn">${val ? 'Cambia foto' : 'Aggiungi una foto'}</button>
          ${val ? '<button type="button" class="link" id="photoDel">Rimuovi</button>' : ''}
        </div></div>`;
      default:
        return `<div class="field">${lab}<input type="text" id="${id}" name="${f.k}" value="${esc(val)}"${ph}${req}${f.upper ? ' style="text-transform:uppercase"' : ''}>${hint}</div>`;
    }
  },

  campiHTML(campi, rec) {
    return campi.map(c => {
      if (Array.isArray(c)) return `<div class="${c.length === 3 ? 'row3' : 'row2'}">${c.map(f => this.fieldHTML(f, rec)).join('')}</div>`;
      if (c.more) return `<details class="more"${c.more.some(f => [f].flat().some(x => rec[x.k])) ? ' open' : ''}><summary>Altri dettagli</summary><div class="form">${this.campiHTML(c.more, rec)}</div></details>`;
      return this.fieldHTML(c, rec);
    }).join('');
  },

  appiattisci(campi) {
    return campi.flatMap(c => Array.isArray(c) ? c : c.more ? this.appiattisci(c.more) : [c]);
  },

  openForm(table, id, preset = {}) {
    const def = this.forms[table];
    const rec = id ? { ...DB.get(table, id) } : {};
    if (!id) {
      if (table !== 'veicoli') rec.veicoloId = this.defaultVeicolo(preset.veicoloId);
      const oggi = D.today();
      ['data', 'dataPagamento', 'inizio'].forEach(k => rec[k] = oggi);
      if (table === 'veicoli') { rec.tipo = 'Auto'; rec.alimentazione = 'Benzina'; rec.unita = 'km'; rec.carburante2 = ''; }
      if (table === 'manutenzioni') rec.tipo = 'Tagliando';
      if (table === 'spese') rec.categoria = 'Lavaggio';
      if (table === 'documenti') { rec.categoria = preset.categoria || 'Carta di circolazione'; delete rec.dataPagamento; delete rec.inizio; }
      if (table === 'viaggi') { delete rec.dataPagamento; delete rec.inizio; }
      if (table === 'assicurazioni') {
        rec.copertura = 'RC auto';
        const d = D.parse(oggi); d.setFullYear(d.getFullYear() + 1); rec.scadenza = D.iso(d);
      }
    }
    if (table === 'viaggi' && rec.tappe) rec.tappe = Viaggi.tappe(rec).join('\n');
    const campi = def.campi(rec);
    const flat = this.appiattisci(campi);
    this.openSheet(def.titolo[id ? 1 : 0], `
      <form class="form" id="frm" novalidate>
        ${this.campiHTML(campi, rec)}
        <div class="sheet-foot">
          ${id ? `<button type="button" class="btn danger" id="btnDel" aria-label="Elimina">${ICON.trash}</button>` : ''}
          <button type="submit" class="btn">${id ? 'Salva modifiche' : 'Salva'}</button>
        </div>
      </form>`);
    const root = $('#frm');

    // pulsanti a scelta
    root.addEventListener('click', e => {
      const b = e.target.closest('.chips button');
      if (!b) return;
      const box = b.closest('.chips');
      box.classList.remove('err');
      this.setChip(root, box.dataset.for, b.dataset.v);
    });
    if (def.mount) def.mount(root, id ? rec : null);
    this.updateKmHint(root);
    root.querySelectorAll('.chips button.on').forEach(b => b.scrollIntoView({ block: 'nearest', inline: 'center' }));
    window.scrollTo(0, window.scrollY);

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

    // allegati (ricevute, foto, PDF)
    const isDoc = table === 'documenti';
    const att = { nuovi: [], rimossi: new Set() };
    const esistenti = isDoc ? [] : Docs.collegati(table, id);
    const attList = $('#attList');
    if (attList) {
      const kb = n => n > 1048576 ? F.num(n / 1048576, 1) + ' MB' : F.num(Math.max(1, n / 1024)) + ' KB';
      const riga = (key, em, nome, info, rimuovibile) => `<div class="att">
        <span class="em">${em}</span>
        <button type="button" class="att-name" data-aopen="${key}">${esc(nome)}<small>${info}</small></button>
        ${rimuovibile ? `<button type="button" class="att-x" data-arm="${key}" aria-label="Togli">✕</button>` : ''}</div>`;
      const draw = () => {
        const out = [];
        if (isDoc) {
          if (att.nuovi[0]) out.push(riga('n:0', Docs.emojiFile({ mime: att.nuovi[0].mime }), att.nuovi[0].nomeOriginale, 'nuovo · ' + kb(att.nuovi[0].dimensione), false));
          else if (id && (rec.url || rec._file)) out.push(riga('d:' + id, Docs.emojiFile(rec), rec.fileNome || rec.titolo || 'File', rec.url ? 'su Google Drive · tocca per aprire' : 'sul telefono · tocca per aprire', false));
        } else {
          esistenti.filter(d => !att.rimossi.has(d.id)).forEach(d => out.push(riga('d:' + d.id, Docs.emojiFile(d), d.titolo || d.fileNome, d.url ? 'su Google Drive' : 'da caricare', true)));
          att.nuovi.forEach((n, i) => out.push(riga('n:' + i, Docs.emojiFile({ mime: n.mime }), n.nomeOriginale, 'nuovo · ' + kb(n.dimensione), true)));
        }
        attList.innerHTML = out.join('');
        $('#attAdd').lastChild.textContent = isDoc ? (out.length ? ' Cambia file' : ' Scegli foto o PDF') : (out.length ? ' Allega un altro file' : ' Allega ricevuta, foto o PDF');
      };
      attList.addEventListener('click', e => {
        const o = e.target.closest('[data-aopen]'), x = e.target.closest('[data-arm]');
        const key = (o || x || {}).dataset?.aopen || (x && x.dataset.arm);
        if (!key) return;
        const [k, v] = key.split(':');
        if (x) { if (k === 'n') att.nuovi.splice(+v, 1); else att.rimossi.add(v); draw(); return; }
        Docs.apri(k === 'n' ? { _file: att.nuovi[+v].dataUrl } : (DB.get('documenti', v) || rec));
      });
      $('#attAdd').onclick = async () => {
        const files = await Docs.scegli(!isDoc);
        if (!files.length) return;
        const btn = $('#attAdd'); btn.disabled = true;
        for (const f of files) {
          try { const n = await Docs.leggi(f); if (isDoc) att.nuovi = [n]; else att.nuovi.push(n); }
          catch (err) { this.toast(err.message || 'File non leggibile'); }
        }
        btn.disabled = false; draw();
      };
      draw();
    }

    root.onsubmit = async e => {
      e.preventDefault();
      const o = { ...rec };
      for (const f of flat) {
        if (['photo', 'live', 'gpx', 'tappeauto'].includes(f.type)) continue;
        const el = root.querySelector(`[name=${f.k}]`);
        if (!el) continue;
        if (f.type === 'switch') o[f.k] = el.checked;
        else if (f.type === 'int' || f.type === 'dec') o[f.k] = el.value.trim() === '' ? '' : num(el.value);
        else o[f.k] = f.upper ? el.value.trim().toUpperCase() : el.value.trim();
      }
      if (table === 'veicoli') { o.foto = foto; if (!o.createdAt) o.createdAt = new Date().toISOString(); }
      if (table === 'rifornimenti' && !o.totale && o.litri && o.prezzo) o.totale = Math.round(o.litri * o.prezzo * 100) / 100;
      root.querySelectorAll('.err').forEach(x => x.classList.remove('err'));
      const missing = flat.filter(f => f.req && (o[f.k] === '' || o[f.k] === undefined || (typeof o[f.k] === 'number' && o[f.k] <= 0 && f.k !== 'km')));
      if (missing.length) {
        missing.forEach(f => { const el = root.querySelector(`.chips[data-for=${f.k}]`) || root.querySelector(`[name=${f.k}]`); if (el) el.classList.add('err'); });
        const first = root.querySelector('.err'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
        this.toast('Manca: ' + missing.map(f => f.label.replace(/^\W+\s/, '')).join(', '));
        return;
      }
      if (table === 'viaggi') {
        o.tappe = Viaggi.tappe({ tappe: o.tappe }).join(' → ');
        if (root._gpx) o.tracciato = root._gpx.enc;
        else if (root._gpxRimosso) o.tracciato = '';
        o._haGpx = !!o.tracciato;
      }
      if (def.valida && !def.valida(o)) return;
      delete o._haGpx;
      if (isDoc) {
        if (!att.nuovi.length && !o.url && !o._file) { this.toast('Scegli il file (foto o PDF)'); return; }
        if (!o.titolo) o.titolo = o.categoria;
        const n = att.nuovi[0];
        if (n) {
          if (o.fileId) o._vecchioFile = o.fileId;
          Object.assign(o, { _file: n.dataUrl, mime: n.mime, dimensione: n.dimensione, fileNome: o.titolo + '.' + n.est, fileId: '', url: '' });
        }
      }
      if (!o.id) o.id = DB.newId();
      await DB.save(table, o);
      if (attList && !isDoc) {
        const cat = Docs.categoria(table, o), dataEv = Docs.dataEvento(table, o), cart = Docs.cartellaEvento(table, o, cat);
        const restano = esistenti.filter(d => !att.rimossi.has(d.id));
        const tot = restano.length + att.nuovi.length;
        for (const did of att.rimossi) await DB.remove('documenti', did);
        // se cambi mezzo, data o tipo, aggiorno anche i documenti (il foglio sposta il file nella cartella giusta)
        for (const [i, d] of restano.entries()) {
          const titolo = Docs.titoloEvento(table, o) + (tot > 1 ? ` (${i + 1})` : '');
          if (d.veicoloId !== o.veicoloId || d.data !== dataEv || d.categoria !== cat || d.cartella !== cart || d.titolo !== titolo)
            await DB.save('documenti', { ...d, veicoloId: o.veicoloId, data: dataEv, categoria: cat, cartella: cart, titolo });
        }
        for (const [i, n] of att.nuovi.entries()) {
          const titolo = Docs.titoloEvento(table, o) + (tot > 1 ? ` (${restano.length + i + 1})` : '');
          await DB.save('documenti', { veicoloId: o.veicoloId, categoria: cat, titolo, data: dataEv, cartella: cart, rifTabella: table, rifId: o.id,
            _file: n.dataUrl, mime: n.mime, dimensione: n.dimensione, fileNome: titolo + '.' + n.est });
        }
      }
      if (table === 'viaggi') await Viaggi.salvaGpx(o, root._gpx, root._gpxRimosso);
      if (o.veicoloId) this.state.ultimoVeicolo = o.veicoloId;
      this.saveUi();
      this.closeSheet();
      this.toast(id ? 'Modifiche salvate ✓' : { rifornimenti: 'Rifornimento salvato ⛽', spese: 'Spesa salvata 🧾', manutenzioni: 'Manutenzione salvata 🔧', bolli: 'Bollo salvato 📄', assicurazioni: 'Assicurazione salvata 🛡️', documenti: 'Documento salvato 🗂️', viaggi: 'Viaggio salvato 🗺️', veicoli: 'Benvenuto in garage! 🎉' }[table]);
      this.render();
    };

    const del = $('#btnDel');
    if (del) del.onclick = async () => {
      if (table === 'veicoli') {
        if (!confirm(`Eliminare "${this.nomeVeicolo(rec)}" e TUTTI i suoi rifornimenti, spese, manutenzioni e documenti?\n(I file su Google Drive finiscono nel cestino di Drive.)`)) return;
        await DB.removeVehicle(id);
        this.closeSheet(); this.toast('Mezzo eliminato');
        location.hash = '#mezzi'; this.render();
      } else {
        if (!confirm(isDoc ? 'Eliminare questo documento?\nIl file su Google Drive finisce nel cestino (lo recuperi entro 30 giorni).' : 'Eliminare questo elemento?')) return;
        if (esistenti.length && confirm(`Eliminare anche ${esistenti.length === 1 ? 'il documento allegato' : `i ${esistenti.length} documenti allegati`}?\n\nOK = elimina anche ${esistenti.length === 1 ? 'quello' : 'quelli'}\nAnnulla = tienili nei Documenti`))
          for (const d of esistenti) await DB.remove('documenti', d.id);
        if (table === 'viaggi') { const g = Viaggi.gpxDoc(id); if (g) await DB.remove('documenti', g.id); }
        await DB.remove(table, id);
        if (table === 'viaggi' && location.hash === '#viaggio/' + id) { this.closeSheet(); this.toast('Viaggio eliminato'); location.hash = '#viaggi'; return; }
        this.closeSheet(); this.toast('Eliminato'); this.render();
      }
    };
  },

  resizeImage(file, max, qualita = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        URL.revokeObjectURL(img.src);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qualita));
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
