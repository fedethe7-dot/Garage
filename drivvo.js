/* =========================================================
   GARAGE — drivvo.js
   Legge l'export CSV di Drivvo (sezioni ##Refuelling, ##Service,
   ##Expense) e lo trasforma in rifornimenti, manutenzioni e spese.
   ========================================================= */

const Drivvo = {
  /** CSV con campi tra virgolette (anche su più righe) → righe di celle */
  _righe(testo) {
    const out = []; let riga = [], cella = '', q = false;
    for (let i = 0; i < testo.length; i++) {
      const c = testo[i];
      if (q) {
        if (c === '"') { if (testo[i + 1] === '"') { cella += '"'; i++; } else q = false; }
        else cella += c;
      } else if (c === '"') q = true;
      else if (c === ',') { riga.push(cella); cella = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && testo[i + 1] === '\n') i++;
        riga.push(cella); out.push(riga); riga = []; cella = '';
      } else cella += c;
    }
    if (cella !== '' || riga.length) { riga.push(cella); out.push(riga); }
    return out;
  },

  /** Divide il file nelle sezioni "##Nome": { Refuelling: [{colonna: valore}], ... } */
  _sezioni(testo) {
    const sez = {}; let nome = null, intest = null;
    for (const r of this._righe(testo.replace(/^﻿/, ''))) {
      if (r.length === 1 && r[0].trim().startsWith('##')) { nome = r[0].trim().slice(2).trim(); intest = null; sez[nome] = []; continue; }
      if (!nome || r.every(x => !x.trim())) continue;
      if (!intest) { intest = r.map(h => h.trim()); continue; }
      const o = {};
      // le colonne con lo stesso nome (es. "Prezzo / L" del secondo carburante) diventano "Prezzo / L#2"
      const visti = {};
      intest.forEach((h, i) => { visti[h] = (visti[h] || 0) + 1; o[visti[h] > 1 ? h + '#' + visti[h] : h] = (r[i] || '').trim(); });
      sez[nome].push(o);
    }
    return sez;
  },

  _n(v) { const x = parseFloat(String(v || '').replace(',', '.')); return isFinite(x) ? x : 0; },
  _data(v) { return String(v || '').slice(0, 10); },

  /** Nome del carburante come lo usa Garage */
  _carb(nome, prezzo) {
    const n = (nome || '').toLowerCase();
    if (n.includes('gpl') || n.includes('lpg')) return 'GPL';
    if (n.includes('benz') || n.includes('gasol') || n.includes('petrol')) return 'Benzina';
    if (n.includes('diesel') || n.includes('gasolio')) return 'Diesel';
    if (n.includes('metano') || n.includes('cng')) return 'Metano';
    if (n.includes('elettr') || n.includes('electric')) return 'Elettrico';
    // nome sconosciuto (es. "Non Usare"): lo deduco dal prezzo
    return prezzo && prezzo < 1.2 ? 'GPL' : 'Benzina';
  },

  _tipoMan(t) {
    const s = (t || '').toLowerCase();
    if (s.includes('tagliando')) return 'Tagliando';
    if (s.includes('olio')) return 'Cambio olio';
    if (s.includes('gpl')) return 'Manutenzione GPL';
    if (s.includes('pastigl')) return 'Pastiglie freno';
    if (s.includes('fren')) return s.includes('liquido') ? 'Liquidi' : 'Freni';
    if (s.includes('liquid')) return 'Liquidi';
    if (s.includes('filtr')) return 'Filtri';
    if (s.includes('pneum') || s.includes('gomm')) return 'Gomme';
    if (s.includes('batter')) return 'Batteria';
    if (s.includes('distribuz')) return 'Distribuzione';
    if (s.includes('revision')) return 'Revisione';
    if (s.includes('catena')) return 'Catena moto';
    return 'Altro';
  },

  _catSpesa(t) {
    const s = (t || '').toLowerCase();
    const m = [['assicur', 'Assicurazione'], ['bollo', 'Bollo'], ['tassa', 'Bollo'], ['revision', 'Revisione'], ['pneum', 'Pneumatici'], ['gomm', 'Pneumatici'],
      ['ricamb', 'Ricambi'], ['lavagg', 'Lavaggio'], ['parchegg', 'Parcheggi'], ['pedagg', 'Pedaggi'], ['autostrad', 'Pedaggi'], ['access', 'Accessori'], ['mult', 'Multe']];
    const f = m.find(([k]) => s.includes(k));
    return f ? f[1] : 'Altro';
  },

  /** Legge il testo del CSV → { rifornimenti, manutenzioni, spese, avvisi } (senza veicoloId) */
  leggi(testo) {
    const sez = this._sezioni(testo);
    const trova = nomi => Object.keys(sez).find(k => nomi.includes(k.toLowerCase()));
    const kR = trova(['refuelling', 'refueling', 'rifornimenti']);
    const kS = trova(['service', 'services', 'manutenzione', 'manutenzioni']);
    const kE = trova(['expense', 'expenses', 'spese', 'spesa']);
    if (!kR && !kS && !kE) throw new Error('non sembra un export di Drivvo');
    const rif = [], man = [], spe = [], avvisi = [];

    for (const r of (kR ? sez[kR] : [])) {
      const data = this._data(r['Data']), km = Math.round(this._n(r['Contachilometri (km)']));
      const nota = [r['Note'], r['Motivo'] ? 'Motivo: ' + r['Motivo'] : ''].filter(Boolean).join(' · ');
      const distributore = r['Distributore di benzina'] || '';
      // fino a tre carburanti nella stessa riga
      [['', 'Carburante', 'Pieno'], ['#2', 'Secondo carburante', 'Pieno 2'], ['#3', 'Terzo carburante', 'Pieno 3']].forEach(([suf, kc, kp], idx) => {
        const litri = this._n(r['Volume' + suf]), totale = this._n(r['Costo totale' + suf]), prezzo = this._n(r['Prezzo / L' + suf]);
        if (!litri && !totale) return;
        if (idx > 0 && !r[kc]) return;
        const carburante = this._carb(r[kc], prezzo);
        const o = { data, km, carburante, litri: Math.round(litri * 100) / 100, prezzo, totale, pieno: (r[kp] || '').toLowerCase().startsWith('s'), distributore, note: nota };
        if (!o.prezzo && litri) o.prezzo = Math.round(totale / litri * 1000) / 1000;
        rif.push(o);
        const quando = D.fmt(data) + ' · ' + F.num(km) + ' km';
        if (litri > 70) avvisi.push(`${quando}: ${F.num(litri, 1)} litri di ${carburante} per ${F.eur(totale)} — forse un errore di battitura`);
        else if (carburante === 'GPL' && prezzo > 1.2) avvisi.push(`${quando}: GPL a ${F.num(prezzo, 3)} €/L — forse era benzina`);
        else if (/non usare/i.test(r[kc] || '')) avvisi.push(`${quando}: carburante "${r[kc]}" in Drivvo, l'ho importato come ${carburante}`);
      });
    }

    // in Drivvo ogni voce di un intervento è una riga a parte: le unisco per data e km
    const gruppi = {};
    for (const r of (kS ? sez[kS] : [])) {
      const data = this._data(r['Data']), km = Math.round(this._n(r['Contachilometri (km)']));
      const g = gruppi[data + '|' + km] = gruppi[data + '|' + km] || { data, km, voci: [], costo: 0, officina: '', note: [] };
      g.voci.push({ t: r['Tipologia di manutenzione'] || r['Titolo'] || 'Manutenzione', c: this._n(r['Costo totale']) });
      g.costo += this._n(r['Costo totale']);
      if (!g.officina && r['Manutenzione locale']) g.officina = r['Manutenzione locale'];
      if (r['Note']) g.note.push(r['Note']);
    }
    for (const g of Object.values(gruppi)) {
      const tipi = g.voci.map(v => this._tipoMan(v.t));
      // più voci con dentro il cambio olio = tagliando; altrimenti la prima voce riconosciuta
      const tipo = tipi.includes('Tagliando') || (tipi.length > 1 && tipi.includes('Cambio olio')) ? 'Tagliando' : (tipi.find(t => t !== 'Altro') || 'Altro');
      man.push({ data: g.data, km: g.km, tipo, descrizione: g.voci.map(v => v.t + (v.c ? ' (' + F.eur(v.c) + ')' : '')).join(', '), costo: Math.round(g.costo * 100) / 100, officina: g.officina, note: g.note.join('\n') });
    }

    for (const r of (kE ? sez[kE] : [])) {
      const t = r['Tipo di spesa'] || r['Tipologia di spesa'] || r['Titolo'] || '';
      spe.push({ data: this._data(r['Data']), km: Math.round(this._n(r['Contachilometri (km)'])) || '', categoria: this._catSpesa(t), descrizione: t, importo: this._n(r['Costo totale']), note: r['Note'] || '' });
    }

    return { rifornimenti: rif, manutenzioni: man, spese: spe, avvisi };
  }
};
