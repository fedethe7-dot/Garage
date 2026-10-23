/* =========================================================
   GARAGE — Calendario.gs
   Mette nel calendario Google "Garage" le scadenze dei mezzi:
   assicurazione, bollo, revisione e (per la moto) la data in cui
   riattivare l'assicurazione sospesa.

   Avvisi: solo 7 giorni prima e 1 giorno prima, alle 9:00.
   Ogni notte controlla il foglio: se una data cambia, sposta
   l'evento; se una scadenza sparisce, cancella l'evento.

   COME SI USA (una volta sola):
   1. Incolla questo file nel progetto Apps Script del foglio
      "Gestione Mezzi" come nuovo file chiamato "Calendario".
   2. In alto scegli la funzione  installaCalendario  e premi Esegui.
   3. Dai il permesso al Calendario quando Google lo chiede.
   Fatto. Non serve ripubblicare l'app web.
   ========================================================= */

const CAL_NOME = 'Garage';
const CAL_AVVISI_GIORNI = [7, 1];   // quanti giorni prima arriva la notifica
const CAL_ORA_AVVISO = 9;           // a che ora (9 = 9:00 del mattino)
const CAL_PROP = 'garageCalEventi'; // dove ricordo gli eventi creati

/** Da eseguire UNA volta: prepara le colonne, crea l'aggiornamento notturno e riempie il calendario */
function installaCalendario() {
  preparaColonneSospensione_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'aggiornaCalendario')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('aggiornaCalendario').timeBased().everyDays(1).atHour(5).create();
  const n = aggiornaCalendario();
  Logger.log('Fatto! Calendario "' + CAL_NOME + '" pronto con ' + n + ' scadenze. Si aggiorna da solo ogni notte.');
}

/** Gira ogni notte: allinea gli eventi del calendario alle scadenze del foglio */
function aggiornaCalendario() {
  const cal = calendario_();
  const voluti = scadenzeDalFoglio_();
  const props = PropertiesService.getScriptProperties();
  const salvati = JSON.parse(props.getProperty(CAL_PROP) || '{}');
  const nuovi = {};

  Object.keys(voluti).forEach(chiave => {
    const s = voluti[chiave];
    let ev = null;
    if (salvati[chiave]) { try { ev = cal.getEventById(salvati[chiave]); } catch (e) { ev = null; } }
    if (ev) {
      const giorno = ev.getAllDayStartDate();
      if (!giorno || iso_(giorno) !== iso_(s.data)) ev.setAllDayDate(s.data);
      if (ev.getTitle() !== s.titolo) ev.setTitle(s.titolo);
      if (ev.getDescription() !== s.nota) ev.setDescription(s.nota);
    } else {
      ev = cal.createAllDayEvent(s.titolo, s.data, { description: s.nota });
    }
    ev.removeAllReminders();
    CAL_AVVISI_GIORNI.forEach(g => ev.addPopupReminder(g * 1440 - CAL_ORA_AVVISO * 60));
    nuovi[chiave] = ev.getId();
  });

  // scadenze che non ci sono più (pagate, sostituite, eliminate)
  Object.keys(salvati).forEach(chiave => {
    if (nuovi[chiave]) return;
    try { const ev = cal.getEventById(salvati[chiave]); if (ev) ev.deleteEvent(); } catch (e) {}
  });

  props.setProperty(CAL_PROP, JSON.stringify(nuovi));
  return Object.keys(nuovi).length;
}

/** Per controllare senza toccare il calendario: mostra nel registro cosa verrebbe creato */
function provaCalendario() {
  const v = scadenzeDalFoglio_();
  const righe = Object.keys(v).map(k => iso_(v[k].data) + '  ' + v[k].titolo);
  Logger.log(righe.length ? righe.join('\n') : 'Nessuna scadenza trovata: controlla i nomi delle schede (veicoli, assicurazioni, bolli, manutenzioni).');
}

/* ---------- lettura del foglio ---------- */

function scadenzeDalFoglio_() {
  const veicoli = leggi_('veicoli');
  const nomi = {};
  veicoli.forEach(v => { nomi[v.id] = v.nome || [v.marca, v.modello].filter(String).join(' ') || 'Mezzo'; });
  const out = {};
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const limite = new Date(oggi); limite.setDate(limite.getDate() - 30); // le scadute da più di un mese non servono

  const ultima = (righe, campo) => {
    const per = {};
    righe.forEach(r => {
      const d = data_(r[campo]);
      if (!d || !r.veicoloId) return;
      if (!per[r.veicoloId] || d > per[r.veicoloId].d) per[r.veicoloId] = { r, d };
    });
    return per;
  };
  const metti = (chiave, d, titolo, nota) => { if (d && d >= limite) out[chiave] = { data: d, titolo, nota }; };

  // assicurazione (o riattivazione se è sospesa)
  const ass = ultima(leggi_('assicurazioni'), 'scadenza');
  Object.keys(ass).forEach(vid => {
    const r = ass[vid].r, n = nomi[vid] || 'Mezzo';
    if (data_(r.sospesaDal)) {
      metti('riatt-' + vid, data_(r.riattivoPrevisto), '▶️ Riattivare assicurazione ' + n,
        'Assicurazione sospesa dal ' + fmt_(data_(r.sospesaDal)) + '. Ricordati di riattivarla, poi tocca "Riattiva" in Garage.');
    } else {
      metti('ass-' + vid, ass[vid].d, '🛡️ Scade assicurazione ' + n,
        'Assicurazione' + (r.compagnia ? ' ' + r.compagnia : '') + ' in scadenza.');
    }
  });

  // bollo
  const bol = ultima(leggi_('bolli'), 'scadenza');
  Object.keys(bol).forEach(vid => metti('bollo-' + vid, bol[vid].d, '📄 Scade bollo ' + (nomi[vid] || 'Mezzo'), 'Bollo da pagare.'));

  // revisione: l'ultima registrata con la data della prossima
  const rev = ultima(leggi_('manutenzioni').filter(r => String(r.tipo) === 'Revisione'), 'prossimaData');
  Object.keys(rev).forEach(vid => metti('rev-' + vid, rev[vid].d, '✅ Revisione ' + (nomi[vid] || 'Mezzo'), 'Revisione da fare.'));

  return out;
}

/** Legge una scheda come elenco di oggetti {colonna: valore}, saltando le righe eliminate */
function leggi_(nome) {
  const sh = scheda_(nome);
  if (!sh || sh.getLastRow() < 2) return [];
  const val = sh.getDataRange().getValues();
  const h = val[0].map(x => String(x).trim());
  return val.slice(1).map(riga => {
    const o = {}; h.forEach((k, i) => { if (k) o[k] = riga[i]; }); return o;
  }).filter(o => o.id && !(o.deleted === true || String(o.deleted).toLowerCase() === 'true'));
}

function scheda_(nome) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(nome) || ss.getSheets().find(s => s.getName().toLowerCase() === nome.toLowerCase()) || null;
}

/** Aggiunge alla scheda assicurazioni le colonne della sospensione, se mancano */
function preparaColonneSospensione_() {
  const sh = scheda_('assicurazioni');
  if (!sh) return;
  const ultimaCol = Math.max(1, sh.getLastColumn());
  const h = sh.getRange(1, 1, 1, ultimaCol).getValues()[0].map(x => String(x).trim());
  const servono = ['sospesaDal', 'riattivoPrevisto', 'giorniSospesi', 'storiaSospensioni'].filter(k => h.indexOf(k) < 0);
  if (servono.length) sh.getRange(1, ultimaCol + 1, 1, servono.length).setValues([servono]);
}

function calendario_() {
  const c = CalendarApp.getCalendarsByName(CAL_NOME)[0];
  return c || CalendarApp.createCalendar(CAL_NOME, { color: CalendarApp.Color.RED });
}

/* ---------- date ---------- */
function data_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') { if (isNaN(v)) return null; const d = new Date(v); d.setHours(0, 0, 0, 0); return d; }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const it = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(v));
  if (it) return new Date(+it[3], +it[2] - 1, +it[1]);
  return null;
}
function iso_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function fmt_(d) { return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy') : ''; }
