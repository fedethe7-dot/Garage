/* =========================================================
   GARAGE SYNC v4 — Google Apps Script
   Collega l'app Garage (e "La mia auto") al foglio Google "Garage".
   Sincronizzazione nei due sensi: app → foglio e foglio → app.
   Documenti e ricevute salvati su Google Drive in
   Garage / <mezzo> / <categoria> / <anno o periodo>.

   NOVITÀ v4:
   - CODICI FAMIGLIA: in "La mia auto" ognuno (Mamma, Beatrice) entra con il suo codice
     e vede/modifica SOLO i suoi mezzi (quelli segnati in Garage con "Di chi è?"),
     con i loro rifornimenti e manutenzioni. Niente spese, assicurazioni, bolli,
     documenti o viaggi. Con il codice segreto (Garage) vedi e modifichi tutto.
   - la sospensione dell'assicurazione ora si salva nel foglio (prima spariva)
   - nuova scheda VIAGGI: i viaggi e i giri arrivano anche nel foglio

   ⚠️ DA SCRIVERE QUI SOTTO (solo nel tuo foglio, MAI su GitHub):
   - CODICE_SEGRETO: quello che usi in Garage (vede tutto)
   - CODICI_FAMIGLIA: un codice lungo e diverso per ogni persona
   ========================================================= */

const CODICE_SEGRETO = 'METTI-QUI-IL-TUO-CODICE-SEGRETO';
const CODICI_FAMIGLIA = {
  'Mamma': 'METTI-QUI-IL-CODICE-DELLA-MAMMA',
  'Beatrice': 'METTI-QUI-IL-CODICE-DI-BEATRICE'
};

/** Cosa può toccare chi entra con un codice famiglia (La mia auto) */
const TABELLE_FAMIGLIA = ['veicoli', 'rifornimenti', 'manutenzioni'];
/** In Garage il mezzo di un famigliare ha nelle note il segno "[famiglia: Nome]" */
const RE_FAMIGLIA = /\s*\[famiglia:\s*([^\]]+)\]/i;
function diChi_(v) { const m = RE_FAMIGLIA.exec(String((v && v.note) || '')); return m ? m[1].trim() : ''; }
function segnaDi_(note, nome) { const n = String(note || '').replace(RE_FAMIGLIA, '').trim(); return (n ? n + ' ' : '') + '[famiglia: ' + nome + ']'; }
function codiceValido_(c) { return !!c && String(c).indexOf('METTI-QUI') !== 0; }

/* ---------- Struttura del foglio ----------
   [chiave nell'app, intestazione colonna, tipo]
   tipi: t = testo, n = numero, d = data, b = sì/no, v = nome veicolo, x = tecnico (testo) */
const TABELLE = {
  veicoli: { foglio: 'VEICOLI', ordina: null, colonne: [
    ['nome', 'Nome', 't'], ['tipo', 'Tipo', 't'], ['marca', 'Marca', 't'], ['modello', 'Modello', 't'],
    ['anno', 'Anno', 'n'], ['targa', 'Targa', 't'], ['alimentazione', 'Alimentazione', 't'],
    ['carburante2', 'Secondo carburante', 't'], ['cilindrata', 'Cilindrata (cc)', 'n'], ['potenza', 'Potenza (CV)', 'n'],
    ['serbatoio', 'Serbatoio (L)', 'n'], ['serbatoio2', 'Serbatoio 2 (L)', 'n'], ['unita', 'Contatore (km/ore)', 't'],
    ['kmIniziali', 'Km iniziali', 'n'], ['note', 'Note', 't'],
    ['id', 'ID', 'x'], ['createdAt', 'Creato il', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  rifornimenti: { foglio: 'RIFORNIMENTI', ordina: 'data', colonne: [
    ['data', 'Data', 'd'], ['veicolo', 'Veicolo', 'v'], ['km', 'Km', 'n'], ['carburante', 'Carburante', 't'],
    ['litri', 'Litri', 'n'], ['prezzo', 'Prezzo/L', 'n'], ['totale', 'Totale €', 'n'], ['pieno', 'Pieno', 'b'],
    ['distributore', 'Distributore', 't'], ['note', 'Note', 't'],
    ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  manutenzioni: { foglio: 'MANUTENZIONI', ordina: 'data', colonne: [
    ['data', 'Data', 'd'], ['veicolo', 'Veicolo', 'v'], ['km', 'Km', 'n'], ['tipo', 'Tipo', 't'],
    ['descrizione', 'Descrizione', 't'], ['officina', 'Officina', 't'], ['costo', 'Costo €', 'n'],
    ['prossimaData', 'Prossima data', 'd'], ['prossimiKm', 'Prossimi km', 'n'], ['note', 'Note', 't'],
    ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  spese: { foglio: 'SPESE', ordina: 'data', colonne: [
    ['data', 'Data', 'd'], ['veicolo', 'Veicolo', 'v'], ['categoria', 'Categoria', 't'], ['descrizione', 'Descrizione', 't'],
    ['importo', 'Importo €', 'n'], ['km', 'Km', 'n'], ['note', 'Note', 't'],
    ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  bolli: { foglio: 'BOLLI', ordina: 'dataPagamento', colonne: [
    ['dataPagamento', 'Data pagamento', 'd'], ['veicolo', 'Veicolo', 'v'], ['importo', 'Importo €', 'n'],
    ['periodoDa', 'Periodo dal', 'd'], ['periodoA', 'Periodo al', 'd'], ['scadenza', 'Scadenza', 'd'], ['note', 'Note', 't'],
    ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  assicurazioni: { foglio: 'ASSICURAZIONI', ordina: 'inizio', colonne: [
    ['compagnia', 'Compagnia', 't'], ['veicolo', 'Veicolo', 'v'], ['polizza', 'N° polizza', 't'],
    ['inizio', 'Data inizio', 'd'], ['scadenza', 'Data scadenza', 'd'], ['costo', 'Costo €', 'n'],
    ['copertura', 'Copertura', 't'], ['note', 'Note', 't'],
    // sospensione (es. moto d'inverno): stessi nomi di colonna che usa anche Calendario.gs
    ['sospesaDal', 'sospesaDal', 'd'], ['riattivoPrevisto', 'riattivoPrevisto', 'd'],
    ['giorniSospesi', 'giorniSospesi', 'n'], ['storiaSospensioni', 'storiaSospensioni', 't'],
    ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  documenti: { foglio: 'DOCUMENTI', ordina: 'data', colonne: [
    ['data', 'Data', 'd'], ['veicolo', 'Veicolo', 'v'], ['categoria', 'Categoria', 't'], ['titolo', 'Titolo', 't'],
    ['cartella', 'Anno / periodo', 't'], ['scadenza', 'Scadenza', 'd'], ['url', 'Link file', 't'], ['note', 'Note', 't'],
    ['fileNome', 'Nome file', 'x'], ['mime', 'Tipo file', 'x'], ['rifTabella', 'Collegato a', 'x'], ['rifId', 'ID collegato', 'x'],
    ['fileId', 'ID file', 'x'], ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]},
  viaggi: { foglio: 'VIAGGI', ordina: 'data', colonne: [
    ['data', 'Data', 'd'], ['dataFine', 'Fino al', 'd'], ['veicolo', 'Veicolo', 'v'], ['titolo', 'Titolo', 't'],
    ['km', 'Km', 'n'], ['durata', 'Durata', 't'], ['dislivello', 'Dislivello (m)', 'n'], ['tappe', 'Tappe', 't'], ['note', 'Note', 't'],
    ['tracciato', 'Tracciato (codificato)', 'x'], ['id', 'ID', 'x'], ['veicoloId', 'ID veicolo', 'x'], ['updatedAt', 'Aggiornato', 'x']
  ]}
};

/* ---------- Cartelle su Google Drive ---------- */
const CARTELLA_PRINCIPALE = 'Garage';
const NOMI_CARTELLE = { 'Manutenzione': 'Manutenzioni', 'Revisione': 'Revisioni' };

const FORMATI_NUMERO = {
  km: '#,##0', kmIniziali: '#,##0', prossimiKm: '#,##0', anno: '0', cilindrata: '#,##0', potenza: '0',
  litri: '0.00', prezzo: '0.000', serbatoio: '0.0', serbatoio2: '0.0', giorniSospesi: '0', dislivello: '#,##0'
};

/* =========================================================
   1) PRIMA CONFIGURAZIONE — esegui questa funzione una volta
   ========================================================= */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABELLE).forEach(function (t) { preparaFoglio_(ss, t); });
  const stat = ss.getSheetByName('STATISTICHE') || ss.insertSheet('STATISTICHE');
  // elimina il "Foglio1" vuoto creato da Google
  ss.getSheets().forEach(function (sh) {
    const n = sh.getName();
    if ((n === 'Foglio1' || n === 'Sheet1') && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  aggiornaStatistiche_(ss, leggiTutto_(ss));
  cartellaRadice_();   // crea la cartella "Garage" su Drive (e chiede il permesso la prima volta)
  return 'Foglio pronto ✓';
}

/* =========================================================
   2) L'APP CHIAMA QUESTO INDIRIZZO
   ========================================================= */
function doGet() {
  return json_({ ok: true, messaggio: 'Garage Sync v4 è attivo ✓' });
}

/** Chi sta chiamando: { tutto: true } (Garage, codice segreto) oppure { persona: 'Mamma' } (La mia auto) */
function ruolo_(token) {
  if (!token) return null;
  if (token === CODICE_SEGRETO) return { tutto: true };
  const nomi = Object.keys(CODICI_FAMIGLIA);
  for (let i = 0; i < nomi.length; i++) {
    if (codiceValido_(CODICI_FAMIGLIA[nomi[i]]) && token === CODICI_FAMIGLIA[nomi[i]]) return { persona: nomi[i] };
  }
  return null;
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Richiesta non valida' }); }
  const ruolo = req ? ruolo_(req.token) : null;
  if (!ruolo) return json_({ ok: false, error: 'Codice segreto errato' });
  const famiglia = !ruolo.tutto, persona = ruolo.persona;

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    if (req.azione === 'caricaFile') {
      if (famiglia) return json_({ ok: false, error: 'Non permesso con il codice famiglia' });
      return json_(caricaFile_(req));
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dati = leggiTutto_(ss);
    const modifiche = req.changes || {};
    let cambiato = false;
    // i mezzi di questa persona (per la famiglia conta solo questo elenco)
    const suoi = {};
    if (famiglia) dati.veicoli.forEach(function (v) { if (diChi_(v) === persona) suoi[v.id] = true; });

    Object.keys(TABELLE).forEach(function (t) {
      if (famiglia && TABELLE_FAMIGLIA.indexOf(t) < 0) return;   // la famiglia tocca solo le sue tabelle
      const arrivati = modifiche[t] || [];
      if (!arrivati.length) return;
      const mappa = {};
      dati[t].forEach(function (r) { mappa[r.id] = r; });
      arrivati.forEach(function (r) {
        if (!r || !r.id) return;
        const esistente = mappa[r.id];
        const piuRecente = esistente && esistente.updatedAt && r.updatedAt && esistente.updatedAt > r.updatedAt;
        if (famiglia) {
          if (t === 'veicoli') {
            if (r.deleted) return;                                   // i mezzi li elimina solo Federico
            if (esistente && diChi_(esistente) !== persona) return;  // non può toccare i mezzi degli altri
            r.note = segnaDi_(r.note, persona);                      // un mezzo nuovo diventa suo
          } else {
            if (!suoi[r.veicoloId]) return;                          // solo sui suoi mezzi
            if (esistente && !suoi[esistente.veicoloId]) return;     // e senza spostare righe degli altri
          }
        }
        if (r.deleted) {
          if (!piuRecente) {
            if (t === 'documenti' && esistente && esistente.fileId) cestina_(esistente.fileId);
            delete mappa[r.id];
          }
          return;
        }
        if (piuRecente) return;
        const nuovo = pulisci_(t, r);
        if (t === 'documenti') aggiornaFile_(esistente, nuovo, dati.veicoli);
        mappa[r.id] = nuovo;
        if (famiglia && t === 'veicoli') suoi[nuovo.id] = true;
      });
      dati[t] = Object.keys(mappa).map(function (k) { return mappa[k]; });
      cambiato = true;
    });

    if (cambiato || req.forzaScrittura) {
      Object.keys(TABELLE).forEach(function (t) { scriviTabella_(ss, t, dati[t], dati.veicoli); });
      aggiornaStatistiche_(ss, dati);
    }

    // all'app mandiamo solo i dati con un veicolo valido (alla famiglia solo le sue tabelle)
    const idVeicoli = {};
    dati.veicoli.forEach(function (v) { idVeicoli[v.id] = true; });
    const risposta = {};
    Object.keys(TABELLE).forEach(function (t) {
      if (famiglia && TABELLE_FAMIGLIA.indexOf(t) < 0) return;
      if (famiglia) risposta[t] = dati[t].filter(function (r) { return t === 'veicoli' ? suoi[r.id] : suoi[r.veicoloId]; });
      else risposta[t] = t === 'veicoli' ? dati[t] : dati[t].filter(function (r) { return idVeicoli[r.veicoloId]; });
    });
    const out = { ok: true, data: risposta, serverTime: new Date().toISOString() };
    if (famiglia) out.persona = persona;
    // solo a Garage (codice segreto) mando i codici famiglia, per creare i link d'invito
    else {
      out.codiciFamiglia = {};
      Object.keys(CODICI_FAMIGLIA).forEach(function (n) { if (codiceValido_(CODICI_FAMIGLIA[n])) out.codiciFamiglia[n] = CODICI_FAMIGLIA[n]; });
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   3) MODIFICHE FATTE A MANO NEL FOGLIO
   Quando modifichi o aggiungi una riga, aggiorna "Aggiornato"
   (e crea l'ID se manca) così l'app capisce che è cambiata.
   ========================================================= */
function onEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const t = tabellaDaFoglio_(sh.getName());
  if (!t) return;
  const intest = intestazioni_(sh);
  const colId = intest.indexOf('ID') + 1, colAgg = intest.indexOf('Aggiornato') + 1;
  if (!colId || !colAgg) return;
  const r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow();
  if (r1 < 2) return;
  // se è stata modificata solo la colonna "Aggiornato" non fare nulla
  if (e.range.getColumn() === colAgg && e.range.getLastColumn() === colAgg) return;
  const n = r1 - r0 + 1;
  const ids = sh.getRange(r0, colId, n, 1).getValues();
  const righe = sh.getRange(r0, 1, n, intest.length).getValues();
  const now = new Date().toISOString();
  const agg = [];
  for (let i = 0; i < n; i++) {
    const vuota = righe[i].every(function (c, k) { return c === '' || k + 1 === colId || k + 1 === colAgg; });
    if (vuota) { agg.push(['']); continue; }
    if (!ids[i][0]) ids[i][0] = Utilities.getUuid();
    agg.push([now]);
  }
  // se hai cambiato il nome del veicolo in una riga, la ricolleghiamo al nuovo veicolo
  const colV = intest.indexOf('Veicolo') + 1, colVid = intest.indexOf('ID veicolo') + 1;
  if (colV && colVid && e.range.getColumn() <= colV && e.range.getLastColumn() >= colV) {
    const vuoti = []; for (let i = 0; i < n; i++) vuoti.push(['']);
    sh.getRange(r0, colVid, n, 1).setValues(vuoti);
  }
  sh.getRange(r0, colId, n, 1).setNumberFormat('@').setValues(ids);
  sh.getRange(r0, colAgg, n, 1).setNumberFormat('@').setValues(agg);
}

/* =========================================================
   FUNZIONI INTERNE
   ========================================================= */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function tabellaDaFoglio_(nome) {
  const ks = Object.keys(TABELLE);
  for (let i = 0; i < ks.length; i++) if (TABELLE[ks[i]].foglio === nome) return ks[i];
  return null;
}

function intestazioni_(sh) {
  const lc = sh.getLastColumn();
  if (!lc) return [];
  return sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
}

function preparaFoglio_(ss, t) {
  const def = TABELLE[t];
  let sh = ss.getSheetByName(def.foglio);
  if (!sh) sh = ss.insertSheet(def.foglio);
  const esistenti = intestazioni_(sh).filter(function (h) { return h; });
  const mancanti = def.colonne.map(function (c) { return c[1]; }).filter(function (h) { return esistenti.indexOf(h) < 0; });
  const tutte = esistenti.concat(mancanti);
  if (mancanti.length) sh.getRange(1, 1, 1, tutte.length).setValues([tutte]);
  const head = sh.getRange(1, 1, 1, tutte.length);
  head.setFontWeight('bold').setBackground('#1f3b8f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  // colonne tecniche in grigio
  def.colonne.forEach(function (c) {
    if (c[2] === 'x') {
      const col = tutte.indexOf(c[1]) + 1;
      sh.getRange(1, col).setBackground('#9aa3b5');
    }
  });
  return sh;
}

function leggiTutto_(ss) {
  const dati = {};
  Object.keys(TABELLE).forEach(function (t) { dati[t] = leggiTabella_(ss, t); });
  // collega le righe aggiunte a mano scrivendo solo il nome del veicolo
  const perNome = {};
  dati.veicoli.forEach(function (v) { perNome[nomeVeicolo_(v).toLowerCase()] = v.id; if (v.nome) perNome[String(v.nome).toLowerCase()] = v.id; });
  Object.keys(TABELLE).forEach(function (t) {
    if (t === 'veicoli') return;
    dati[t].forEach(function (r) {
      if (!r.veicoloId && r._nomeVeicolo) r.veicoloId = perNome[String(r._nomeVeicolo).toLowerCase()] || '';
      delete r._nomeVeicolo;
    });
  });
  return dati;
}

function leggiTabella_(ss, t) {
  const def = TABELLE[t];
  const sh = ss.getSheetByName(def.foglio) || preparaFoglio_(ss, t);
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 2) return [];
  const valori = sh.getRange(1, 1, lr, lc).getValues();
  const intest = valori[0].map(function (h) { return String(h).trim(); });
  const tz = ss.getSpreadsheetTimeZone();
  const out = [];
  let daCorreggere = false;
  for (let i = 1; i < valori.length; i++) {
    const riga = valori[i];
    if (riga.every(function (c) { return c === '' || c === null; })) continue;
    const r = {};
    def.colonne.forEach(function (c) {
      const k = intest.indexOf(c[1]);
      if (k < 0) return;
      const v = riga[k];
      switch (c[2]) {
        case 'n': r[c[0]] = numero_(v); break;
        case 'd': r[c[0]] = data_(v, tz); break;
        case 'b': r[c[0]] = (v === '' || v === null) ? true : /^(s[iì]|true|x|1|yes|vero)$/i.test(String(v).trim()) || v === true; break;
        case 'v': r._nomeVeicolo = String(v || '').trim(); break;
        default: r[c[0]] = v === null ? '' : String(v).trim();
      }
    });
    if (!r.id) { r.id = Utilities.getUuid(); daCorreggere = true; }
    if (!r.updatedAt) { r.updatedAt = new Date().toISOString(); daCorreggere = true; }
    out.push(r);
  }
  if (daCorreggere) scriviTabella_(ss, t, out, t === 'veicoli' ? out : leggiTabella_(ss, 'veicoli'));
  return out;
}

function scriviTabella_(ss, t, righe, veicoli) {
  const def = TABELLE[t];
  const sh = preparaFoglio_(ss, t);
  const intest = intestazioni_(sh);
  const nomi = {};
  (veicoli || []).forEach(function (v) { nomi[v.id] = nomeVeicolo_(v); });
  const ordinate = righe.slice();
  if (def.ordina) ordinate.sort(function (a, b) {
    const x = a[def.ordina] || '', y = b[def.ordina] || '';
    return x < y ? -1 : x > y ? 1 : (Number(a.km) || 0) - (Number(b.km) || 0);
  });
  const tipi = {}; def.colonne.forEach(function (c) { tipi[c[1]] = c; });
  const valori = ordinate.map(function (r) {
    return intest.map(function (h) {
      const c = tipi[h];
      if (!c) return '';
      const v = c[2] === 'v' ? (nomi[r.veicoloId] || r._nomeVeicolo || '') : r[c[0]];
      if (v === undefined || v === null || v === '') return '';
      if (c[2] === 'd') { const p = String(v).split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2], 12) : v; }
      if (c[2] === 'b') return v ? 'sì' : 'no';
      if (c[2] === 'n') return Number(v);
      return String(v);
    });
  });
  // cancella i dati vecchi e scrive quelli nuovi
  const vecchie = sh.getLastRow();
  if (vecchie > 1) sh.getRange(2, 1, vecchie - 1, Math.max(intest.length, 1)).clearContent();
  if (!valori.length) return;
  // formati delle colonne
  intest.forEach(function (h, i) {
    const c = tipi[h]; if (!c) return;
    const rg = sh.getRange(2, i + 1, valori.length, 1);
    if (c[2] === 'd') rg.setNumberFormat('dd/mm/yyyy');
    else if (c[2] === 'x' || c[0] === 'targa' || c[0] === 'cartella' || c[0] === 'durata') rg.setNumberFormat('@');
    else if (c[2] === 'n') rg.setNumberFormat(FORMATI_NUMERO[c[0]] || '#,##0.00 "€"');
  });
  sh.getRange(2, 1, valori.length, intest.length).setValues(valori);
}

function pulisci_(t, r) {
  const o = {};
  TABELLE[t].colonne.forEach(function (c) { if (c[2] !== 'v' && r[c[0]] !== undefined) o[c[0]] = r[c[0]]; });
  if (t === 'rifornimenti' && o.pieno === undefined) o.pieno = true;
  return o;
}

function nomeVeicolo_(v) {
  return String(v.nome || [v.marca, v.modello].filter(function (x) { return x; }).join(' ') || 'Veicolo');
}

function numero_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  let s = String(v).replace(/\s|€/g, '');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : '';
}

function data_(v, tz) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); }
  return '';
}

/* ---------- Scheda STATISTICHE (si aggiorna da sola) ---------- */
function aggiornaStatistiche_(ss, dati) {
  const sh = ss.getSheetByName('STATISTICHE') || ss.insertSheet('STATISTICHE');
  const righe = [];
  const anni = {};
  ['rifornimenti', 'manutenzioni', 'spese'].forEach(function (t) { dati[t].forEach(function (r) { if (r.data) anni[r.data.slice(0, 4)] = true; }); });
  dati.bolli.forEach(function (r) { if (r.dataPagamento) anni[r.dataPagamento.slice(0, 4)] = true; });
  dati.assicurazioni.forEach(function (r) { if (r.inizio) anni[r.inizio.slice(0, 4)] = true; });
  const elencoAnni = Object.keys(anni).sort().reverse();

  dati.veicoli.forEach(function (v) {
    const letture = [];
    ['rifornimenti', 'manutenzioni', 'spese'].forEach(function (t) {
      dati[t].forEach(function (r) { if (r.veicoloId === v.id && Number(r.km) > 0) letture.push({ d: r.data, km: Number(r.km) }); });
    });
    elencoAnni.forEach(function (a) {
      const da = a + '-01-01', al = a + '-12-31';
      const dentro = function (d) { return d && d >= da && d <= al; };
      const mie = function (t, campoData) { return dati[t].filter(function (r) { return r.veicoloId === v.id && dentro(r[campoData]); }); };
      const somma = function (arr, k) { return arr.reduce(function (s, r) { return s + (Number(r[k]) || 0); }, 0); };
      const rif = mie('rifornimenti', 'data'), man = mie('manutenzioni', 'data'), spe = mie('spese', 'data');
      const bol = mie('bolli', 'dataPagamento'), ass = mie('assicurazioni', 'inizio');
      const lettAnno = letture.filter(function (l) { return dentro(l.d); });
      let km = 0;
      if (lettAnno.length) {
        let base = Number(v.kmIniziali) || 0;
        letture.forEach(function (l) { if (l.d < da && l.km > base) base = l.km; });
        if (!base) base = Math.min.apply(null, lettAnno.map(function (l) { return l.km; }));
        km = Math.max(0, Math.max.apply(null, lettAnno.map(function (l) { return l.km; })) - base);
      }
      const carb = somma(rif, 'totale'), mt = somma(man, 'costo'), bo = somma(bol, 'importo'), as = somma(ass, 'costo'), al2 = somma(spe, 'importo');
      const tot = carb + mt + bo + as + al2;
      if (!tot && !km) return;
      righe.push([Number(a), nomeVeicolo_(v), km, somma(rif, 'litri'), carb, mt, bo, as, al2, tot, km ? tot / km : '']);
    });
  });

  sh.clearContents();
  const head = ['Anno', 'Veicolo', 'Km percorsi', 'Litri / quantità', 'Carburante €', 'Manutenzione €', 'Bollo €', 'Assicurazione €', 'Altre spese €', 'Totale €', '€/km'];
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1f3b8f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (righe.length) {
    sh.getRange(2, 1, righe.length, head.length).setValues(righe);
    sh.getRange(2, 3, righe.length, 1).setNumberFormat('#,##0');
    sh.getRange(2, 4, righe.length, 1).setNumberFormat('#,##0.0');
    sh.getRange(2, 5, righe.length, 6).setNumberFormat('#,##0.00 "€"');
    sh.getRange(2, 11, righe.length, 1).setNumberFormat('0.000 "€"');
  }
  sh.getRange(righe.length + 3, 1).setValue('Aggiornato automaticamente a ogni sincronizzazione. Non modificare questa scheda.');
}

/* =========================================================
   DOCUMENTI SU GOOGLE DRIVE
   ========================================================= */

/** Riceve un file dall'app e lo salva in Garage / mezzo / categoria / anno */
function caricaFile_(req) {
  if (!req.base64) return { ok: false, error: 'File vuoto' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const v = leggiTabella_(ss, 'veicoli').filter(function (x) { return x.id === req.veicoloId; })[0];
  const nomeV = v ? nomeVeicolo_(v) : (req.nomeVeicolo || 'Senza mezzo');
  const cartella = cartellaDocumento_(nomeV, req.categoria, req.cartella);
  const m = String(req.nome || '').match(/\.[a-z0-9]{2,4}$/i);
  const est = m ? m[0].toLowerCase() : estensione_(req.mime);
  const base = pulisciNome_(String(req.nome || 'Documento').replace(/\.[a-z0-9]{2,4}$/i, ''));
  const nome = nomeLibero_(cartella, base, est, '');
  const blob = Utilities.newBlob(Utilities.base64Decode(req.base64), req.mime || 'application/octet-stream', nome);
  const file = cartella.createFile(blob);
  if (req.sostituisci) cestina_(req.sostituisci);
  return { ok: true, fileId: file.getId(), url: file.getUrl(), nome: nome };
}

/** Se un documento cambia mezzo, categoria, anno o nome, sposta e rinomina il file su Drive */
function aggiornaFile_(vecchio, nuovo, veicoli) {
  if (!vecchio || !nuovo.fileId || vecchio.fileId !== nuovo.fileId) return;
  const cambiato = ['veicoloId', 'categoria', 'cartella', 'titolo'].some(function (k) { return String(vecchio[k] || '') !== String(nuovo[k] || ''); });
  if (!cambiato) return;
  try {
    const file = DriveApp.getFileById(nuovo.fileId);
    const v = veicoli.filter(function (x) { return x.id === nuovo.veicoloId; })[0];
    const dest = cartellaDocumento_(v ? nomeVeicolo_(v) : 'Senza mezzo', nuovo.categoria, nuovo.cartella);
    const m = file.getName().match(/\.[a-z0-9]{2,4}$/i);
    file.moveTo(dest);
    if (nuovo.titolo) {
      const nome = nomeLibero_(dest, pulisciNome_(nuovo.titolo), m ? m[0] : '', file.getId());
      file.setName(nome);
      nuovo.fileNome = nome;
    }
  } catch (e) { /* file non trovato o già spostato a mano: lascio stare */ }
}

/** Il file va nel cestino di Drive (si recupera entro 30 giorni) */
function cestina_(fileId) {
  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
}

function cartellaRadice_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CARTELLA_GARAGE');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const root = DriveApp.getRootFolder();
  const it = root.getFoldersByName(CARTELLA_PRINCIPALE);
  const f = it.hasNext() ? it.next() : root.createFolder(CARTELLA_PRINCIPALE);
  props.setProperty('CARTELLA_GARAGE', f.getId());
  return f;
}

function cartellaDocumento_(nomeVeicolo, categoria, sottocartella) {
  let f = sottocartella_(cartellaRadice_(), nomeVeicolo || 'Senza mezzo');
  f = sottocartella_(f, NOMI_CARTELLE[categoria] || categoria || 'Altro');
  if (sottocartella) f = sottocartella_(f, sottocartella);
  return f;
}

function sottocartella_(padre, nome) {
  nome = pulisciNome_(nome);
  const it = padre.getFoldersByName(nome);
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) return f; }
  return padre.createFolder(nome);
}

function pulisciNome_(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Documento';
}

/** Se esiste già un file con lo stesso nome aggiunge (2), (3)… */
function nomeLibero_(cartella, base, est, escludiId) {
  let nome = base + est, i = 2;
  for (;;) {
    const it = cartella.getFilesByName(nome);
    let occupato = false;
    while (it.hasNext()) { const f = it.next(); if (f.getId() !== escludiId && !f.isTrashed()) { occupato = true; break; } }
    if (!occupato) return nome;
    nome = base + ' (' + (i++) + ')' + est;
  }
}

function estensione_(mime) {
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'application/pdf': '.pdf' })[mime] || '';
}
