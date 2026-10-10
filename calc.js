/* =========================================================
   GARAGE — calc.js
   Elenchi, periodi e tutti i calcoli (consumi, costi, statistiche).
   Le funzioni qui non toccano la grafica: in futuro le userà
   anche l'assistente AI del garage.
   ========================================================= */

const CONFIG = {
  tipiVeicolo: ['Auto', 'Moto', 'Scooter', 'Ciclomotore', 'Trattorino / attrezzo', 'Altro'],
  alimentazioni: ['Benzina', 'Diesel', 'GPL', 'Metano', 'Elettrico', 'Ibrido', 'Altro'],
  carburanti: ['Benzina', 'Diesel', 'GPL', 'Metano', 'Elettrico', 'Altro'],
  unitaCarburante: { Benzina: 'L', Diesel: 'L', GPL: 'L', Metano: 'kg', Elettrico: 'kWh', Altro: 'L' },
  tipiManutenzione: ['Tagliando', 'Cambio olio', 'Filtri', 'Gomme', 'Freni', 'Pastiglie freno', 'Batteria',
    'Distribuzione', 'Revisione', 'Catena moto', 'Liquidi', 'Manutenzione GPL', 'Altro'],
  categorieSpesa: ['Assicurazione', 'Bollo', 'Revisione', 'Pneumatici', 'Ricambi', 'Lavaggio', 'Parcheggi',
    'Pedaggi', 'Accessori', 'Multe', 'Altro'],
  emojiCarburante: { Benzina: '⛽', Diesel: '🛢️', GPL: '🔥', Metano: '💨', Elettrico: '⚡', Altro: '⛽' },
  emojiManutenzione: { 'Tagliando': '🧰', 'Cambio olio': '🛢️', 'Filtri': '🌀', 'Gomme': '🛞', 'Freni': '🛑', 'Pastiglie freno': '🛑',
    'Batteria': '🔋', 'Distribuzione': '⛓️', 'Revisione': '✅', 'Catena moto': '⛓️', 'Liquidi': '💧', 'Manutenzione GPL': '🔥', 'Altro': '🔧' },
  emojiSpesa: { 'Carburante': '⛽', 'Manutenzione': '🔧', 'Assicurazione': '🛡️', 'Bollo': '📄', 'Revisione': '✅', 'Pneumatici': '🛞',
    'Ricambi': '⚙️', 'Lavaggio': '🧽', 'Parcheggi': '🅿️', 'Pedaggi': '🛣️', 'Accessori': '🎒', 'Multe': '🚨', 'Altro': '📦' },
  iconaTipo: { 'Auto': '🚗', 'Moto': '🏍️', 'Scooter': '🛵', 'Ciclomotore': '🛵', 'Trattorino / attrezzo': '🚜', 'Altro': '🚙' },
  periodi: [
    ['oggi', 'Oggi'], ['settimana', 'Settimana'], ['mese', 'Mese'], ['trimestre', 'Trimestre'],
    ['semestre', 'Semestre'], ['anno', 'Anno'], ['tutto', 'Tutto'], ['custom', 'Personalizzato']
  ],
  giorniAvviso: 30,    // scadenza "in arrivo" se mancano meno di 30 giorni
  kmAvviso: 1000       // manutenzione "in arrivo" se mancano meno di 1000 km
};

/* ---------- Date ---------- */
const D = {
  today() { return this.iso(new Date()); },
  iso(d) {
    const z = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  addDays(s, n) { const d = this.parse(s); d.setDate(d.getDate() + n); return this.iso(d); },
  diffDays(a, b) { return Math.round((this.parse(b) - this.parse(a)) / 86400000); },
  fmt(s) { if (!s) return '—'; const [y, m, d] = s.split('-'); return d + '/' + m + '/' + y; },
  monthName(i) { return ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][i]; },
  monthLong(i) { return ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][i]; }
};

/* ---------- Formattazione numeri ---------- */
const F = {
  eur(n, dec = 2) { return (n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }); },
  num(n, dec = 0) { return (n || 0).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }); },
  km(n, unita = 'km') { return this.num(n) + ' ' + unita; },
  pct(n) { return (n > 0 ? '+' : '') + this.num(n, 0) + '%'; }
};

const num = v => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s|€/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isFinite(n) ? n : 0;
};

/* ---------- Periodi ---------- */
const Periodi = {
  /** Restituisce {from, to, label} — from/to in formato AAAA-MM-GG */
  range(key, custom = {}) {
    const t = D.parse(D.today());
    const y = t.getFullYear(), m = t.getMonth();
    let from, to = D.today(), label;
    switch (key) {
      case 'oggi': from = to; label = 'Oggi'; break;
      case 'settimana': {
        const dow = (t.getDay() + 6) % 7; // lunedì = 0
        from = D.addDays(to, -dow); to = D.addDays(from, 6); label = 'Questa settimana'; break;
      }
      case 'mese': from = D.iso(new Date(y, m, 1)); to = D.iso(new Date(y, m + 1, 0)); label = D.monthLong(m) + ' ' + y; break;
      case 'trimestre': { const q = Math.floor(m / 3); from = D.iso(new Date(y, q * 3, 1)); to = D.iso(new Date(y, q * 3 + 3, 0)); label = (q + 1) + 'º trimestre ' + y; break; }
      case 'semestre': { const s = m < 6 ? 0 : 1; from = D.iso(new Date(y, s * 6, 1)); to = D.iso(new Date(y, s * 6 + 6, 0)); label = (s + 1) + 'º semestre ' + y; break; }
      case 'anno': from = y + '-01-01'; to = y + '-12-31'; label = 'Anno ' + y; break;
      case 'custom': from = custom.from || D.addDays(to, -30); to = custom.to || to; label = D.fmt(from) + ' – ' + D.fmt(to); break;
      default: from = null; to = null; label = 'Tutto il periodo';
    }
    return { key, from, to, label };
  },

  /** Periodo precedente equivalente (per i confronti) */
  previous(r) {
    if (!r.from) return null;
    const f = D.parse(r.from), t = D.parse(r.to);
    const y = f.getFullYear(), m = f.getMonth();
    const mk = (from, to, label) => ({ key: r.key, from: D.iso(from), to: D.iso(to), label });
    switch (r.key) {
      case 'mese': return mk(new Date(y, m - 1, 1), new Date(y, m, 0), D.monthLong((m + 11) % 12) + ' ' + (m === 0 ? y - 1 : y));
      case 'trimestre': { const a = new Date(y, m - 3, 1); return mk(a, new Date(y, m, 0), (Math.floor(a.getMonth() / 3) + 1) + 'º trimestre ' + a.getFullYear()); }
      case 'semestre': { const a = new Date(y, m - 6, 1); return mk(a, new Date(y, m, 0), (a.getMonth() < 6 ? 1 : 2) + 'º semestre ' + a.getFullYear()); }
      case 'anno': return mk(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), 'Anno ' + (y - 1));
      default: {
        const len = D.diffDays(r.from, r.to) + 1;
        const to = D.addDays(r.from, -1), from = D.addDays(to, -(len - 1));
        return { key: r.key, from, to, label: D.fmt(from) + ' – ' + D.fmt(to) };
      }
    }
  },

  inRange(date, r) {
    if (!date) return false;
    if (r.from && date < r.from) return false;
    if (r.to && date > r.to) return false;
    return true;
  }
};

/* ---------- Calcoli ---------- */
const Calc = {
  unita(v) { return v && v.unita === 'ore' ? 'ore' : 'km'; },

  /** Tutte le letture del contachilometri di un veicolo, ordinate per data */
  letture(vid) {
    const out = [];
    for (const t of ['rifornimenti', 'manutenzioni', 'spese']) {
      for (const r of DB.list(t)) if (r.veicoloId === vid && num(r.km) > 0) out.push({ data: r.data, km: num(r.km) });
    }
    return out.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : a.km - b.km);
  },

  kmAttuali(v) {
    let max = num(v.kmIniziali);
    for (const l of this.letture(v.id)) if (l.km > max) max = l.km;
    return max;
  },

  /** Km percorsi nel periodo, calcolati dalle letture del contachilometri */
  kmNelPeriodo(v, r) {
    const lett = this.letture(v.id);
    const dentro = lett.filter(l => Periodi.inRange(l.data, r));
    if (!dentro.length) return 0;
    let base = num(v.kmIniziali);
    if (r.from) {
      for (const l of lett) if (l.data < r.from && l.km > base) base = l.km;
    }
    if (!base) base = dentro[0].km;
    const fine = Math.max(...dentro.map(l => l.km));
    return Math.max(0, fine - base);
  },

  /** Rifornimenti di un veicolo, ordinati per km */
  rifornimenti(vid, carburante) {
    return DB.list('rifornimenti')
      .filter(r => r.veicoloId === vid && (!carburante || r.carburante === carburante))
      .sort((a, b) => num(a.km) - num(b.km) || (a.data < b.data ? -1 : 1));
  },

  /** Consumo con metodo "pieno → pieno". Restituisce anche i singoli tratti. */
  consumo(vid, carburante, r = {}) {
    // Auto GPL/metano: la benzina è di riserva, i km non sono attribuibili → niente consumo
    const v = DB.get('veicoli', vid);
    if (v && carburante && v.carburante2 === carburante && ['GPL', 'Metano'].includes(v.alimentazione)) {
      return { km: 0, qta: 0, kmL: 0, l100: 0, tratti: [], secondario: true };
    }
    const list = this.rifornimenti(vid, carburante);
    let km = 0, qta = 0, ultimoPieno = null, accum = 0;
    const tratti = [];
    for (const f of list) {
      accum += num(f.litri);
      if (f.pieno !== false) {
        if (ultimoPieno !== null && num(f.km) > ultimoPieno) {
          const dk = num(f.km) - ultimoPieno;
          if (Periodi.inRange(f.data, r)) {
            km += dk; qta += accum;
            tratti.push({ id: f.id, data: f.data, km: dk, qta: accum, kmL: dk / accum, l100: accum / dk * 100 });
          }
        }
        ultimoPieno = num(f.km); accum = 0;
      }
    }
    return { km, qta, kmL: qta ? km / qta : 0, l100: km ? qta / km * 100 : 0, tratti };
  },

  carburantiVeicolo(v) {
    const set = [];
    const add = c => { if (c && !set.includes(c)) set.push(c); };
    const map = { Ibrido: 'Benzina' };
    add(map[v.alimentazione] || (CONFIG.carburanti.includes(v.alimentazione) ? v.alimentazione : 'Altro'));
    add(v.carburante2);
    for (const f of DB.list('rifornimenti')) if (f.veicoloId === v.id) add(f.carburante);
    return set;
  },

  /** Statistiche complete di un elenco di veicoli in un periodo */
  stats(vids, r) {
    const veicoli = vids.map(id => DB.get('veicoli', id)).filter(Boolean);
    const ids = new Set(veicoli.map(v => v.id));
    const sel = t => DB.list(t).filter(x => ids.has(x.veicoloId));

    const rif = sel('rifornimenti').filter(x => Periodi.inRange(x.data, r));
    const man = sel('manutenzioni').filter(x => Periodi.inRange(x.data, r));
    const spe = sel('spese').filter(x => Periodi.inRange(x.data, r));
    const bol = sel('bolli').filter(x => Periodi.inRange(x.dataPagamento, r));
    const ass = sel('assicurazioni').filter(x => Periodi.inRange(x.inizio, r));

    // km (solo veicoli a km; i trattorini a ore sono esclusi dai totali)
    let km = 0;
    const perVeicolo = {};
    for (const v of veicoli) {
      const k = this.kmNelPeriodo(v, r);
      perVeicolo[v.id] = { km: k, costo: 0, carburante: 0 };
      if (this.unita(v) === 'km') km += k;
    }

    // carburante
    const perCarb = {};
    let costoCarb = 0, litriL = 0, costoL = 0;
    for (const f of rif) {
      const c = f.carburante || 'Altro';
      perCarb[c] = perCarb[c] || { qta: 0, costo: 0, n: 0, unita: CONFIG.unitaCarburante[c] || 'L' };
      perCarb[c].qta += num(f.litri); perCarb[c].costo += num(f.totale); perCarb[c].n++;
      costoCarb += num(f.totale);
      if ((CONFIG.unitaCarburante[c] || 'L') === 'L') { litriL += num(f.litri); costoL += num(f.totale); }
      perVeicolo[f.veicoloId].costo += num(f.totale);
      perVeicolo[f.veicoloId].carburante += num(f.totale);
    }
    for (const c in perCarb) {
      const p = perCarb[c];
      p.prezzoMedio = p.qta ? p.costo / p.qta : 0;
      let ck = 0, cq = 0;
      for (const v of veicoli) { const x = this.consumo(v.id, c, r); ck += x.km; cq += x.qta; }
      p.kmL = cq ? ck / cq : 0; p.l100 = ck ? cq / ck * 100 : 0;
    }

    // costi per categoria
    const cat = { Carburante: costoCarb, Manutenzione: 0, Bollo: 0, Assicurazione: 0 };
    for (const x of man) { cat.Manutenzione += num(x.costo); perVeicolo[x.veicoloId].costo += num(x.costo); }
    for (const x of bol) { cat.Bollo += num(x.importo); perVeicolo[x.veicoloId].costo += num(x.importo); }
    for (const x of ass) { cat.Assicurazione += num(x.costo); perVeicolo[x.veicoloId].costo += num(x.costo); }
    for (const x of spe) {
      const c = x.categoria || 'Altro';
      cat[c] = (cat[c] || 0) + num(x.importo);
      perVeicolo[x.veicoloId].costo += num(x.importo);
    }
    const costoTot = Object.values(cat).reduce((a, b) => a + b, 0);

    // giorni del periodo
    let from = r.from, to = r.to;
    const oggi = D.today();
    if (!from) {
      const date = [...rif, ...man, ...spe].map(x => x.data).concat(bol.map(x => x.dataPagamento), ass.map(x => x.inizio)).filter(Boolean).sort();
      from = date[0] || oggi;
      to = oggi;
    }
    if (to > oggi) to = oggi;
    const giorni = Math.max(1, D.diffDays(from, to) + 1);
    const giorniUso = new Set([...rif, ...man, ...spe].map(x => x.data)).size;

    // costo/km solo sui veicoli a km
    const costoKmVeicoli = veicoli.filter(v => this.unita(v) === 'km').reduce((a, v) => a + perVeicolo[v.id].costo, 0);
    const carbKmVeicoli = veicoli.filter(v => this.unita(v) === 'km').reduce((a, v) => a + perVeicolo[v.id].carburante, 0);

    // consumo medio complessivo (solo litri)
    let ck = 0, cq = 0;
    for (const v of veicoli) for (const c of Object.keys(perCarb)) {
      if ((CONFIG.unitaCarburante[c] || 'L') !== 'L') continue;
      const x = this.consumo(v.id, c, r); ck += x.km; cq += x.qta;
    }

    return {
      km, giorni, giorniUso,
      kmGiorno: km / giorni, kmSettimana: km / giorni * 7, kmMese: km / giorni * 30.44,
      litri: litriL, litriGiorno: litriL / giorni, litriMese: litriL / giorni * 30.44,
      prezzoMedio: litriL ? costoL / litriL : 0,
      kmL: cq ? ck / cq : 0, l100: ck ? cq / ck * 100 : 0,
      costoCarb, costoTot,
      costoGiorno: costoTot / giorni, costoMese: costoTot / giorni * 30.44,
      costoKm: km ? costoKmVeicoli / km : 0,
      costoCarbKm: km ? carbKmVeicoli / km : 0,
      perCarb, cat, perVeicolo,
      nRif: rif.length, nMan: man.length
    };
  },

  /** Suddivide un periodo in "secchielli" giornalieri o mensili per i grafici */
  buckets(r, vids) {
    let from = r.from, to = r.to;
    if (!from) {
      const ids = new Set(vids);
      const date = ['rifornimenti', 'manutenzioni', 'spese'].flatMap(t => DB.list(t).filter(x => ids.has(x.veicoloId)).map(x => x.data)).filter(Boolean).sort();
      from = date[0] || D.today(); to = D.today();
    }
    const out = [];
    if (D.diffDays(from, to) <= 31) {
      for (let d = from; d <= to; d = D.addDays(d, 1)) out.push({ from: d, to: d, label: d.slice(8) + '/' + d.slice(5, 7) });
    } else {
      let a = D.parse(from); a = new Date(a.getFullYear(), a.getMonth(), 1);
      const end = D.parse(to);
      while (a <= end) {
        const b = new Date(a.getFullYear(), a.getMonth() + 1, 0);
        out.push({ from: D.iso(a), to: D.iso(b), label: D.monthName(a.getMonth()) + ' ' + String(a.getFullYear()).slice(2) });
        a = new Date(a.getFullYear(), a.getMonth() + 1, 1);
      }
    }
    return out;
  },

  /** Scadenze: manutenzioni programmate, bollo, assicurazione, revisione */
  scadenze(vid) {
    const out = [];
    const oggi = D.today();
    const veicoli = vid ? [DB.get('veicoli', vid)].filter(Boolean) : DB.list('veicoli');
    for (const v of veicoli) {
      const kmNow = this.kmAttuali(v);
      const u = this.unita(v);
      // per ogni tipo di manutenzione vale solo l'intervento più recente
      const ultimi = {};
      for (const m of DB.list('manutenzioni').filter(x => x.veicoloId === v.id)) {
        const k = m.tipo || 'Altro';
        if (!ultimi[k] || m.data > ultimi[k].data) ultimi[k] = m;
      }
      for (const m of Object.values(ultimi)) {
        if (!m.prossimaData && !num(m.prossimiKm)) continue;
        out.push(this._scad(v, m.tipo || 'Manutenzione', m.prossimaData, num(m.prossimiKm), kmNow, u, oggi, m.tipo === 'Revisione' ? 'revisione' : 'manutenzione'));
      }
      const last = (t, f) => DB.list(t).filter(x => x.veicoloId === v.id && x[f]).sort((a, b) => a[f] < b[f] ? 1 : -1)[0];
      const b = last('bolli', 'scadenza');
      if (b) out.push(this._scad(v, 'Bollo', b.scadenza, 0, kmNow, u, oggi, 'bollo'));
      const a = last('assicurazioni', 'scadenza');
      if (a) out.push(this._scad(v, 'Assicurazione' + (a.compagnia ? ' · ' + a.compagnia : ''), a.scadenza, 0, kmNow, u, oggi, 'assicurazione'));
    }
    const peso = { scaduta: 0, vicina: 1, ok: 2 };
    return out.sort((x, y) => peso[x.stato] - peso[y.stato] || (x.giorni ?? 99999) - (y.giorni ?? 99999));
  },

  _scad(v, titolo, data, km, kmNow, u, oggi, tipo) {
    const giorni = data ? D.diffDays(oggi, data) : null;
    const kmMancanti = km ? km - kmNow : null;
    let stato = 'ok';
    if ((giorni !== null && giorni < 0) || (kmMancanti !== null && kmMancanti < 0)) stato = 'scaduta';
    else if ((giorni !== null && giorni <= CONFIG.giorniAvviso) || (kmMancanti !== null && kmMancanti <= CONFIG.kmAvviso)) stato = 'vicina';
    return { veicoloId: v.id, veicolo: v.nome || (v.marca + ' ' + v.modello), titolo, tipo, data, km, giorni, kmMancanti, stato, unita: u };
  }
};
