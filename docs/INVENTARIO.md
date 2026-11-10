# Garage — inventario dell'app esistente (base per Garage 2)

Fotografia della versione 4.0.1 (ramo `main`), fatta leggendo tutto il codice.
Serve a non perdere niente nella ricostruzione: ogni voce "✅ funziona" deve esserci anche in Garage 2.

Legenda: ✅ funziona davvero · 🟡 funziona in parte · ❌ non c'è (solo grafica o mai fatto)

## 1. Com'è fatta

| Parte | File | Cosa fa |
|---|---|---|
| Interfaccia | `app.js` (~2400 righe), `index.html` | tutte le schermate e i moduli |
| Calcoli | `calc.js` | consumi, costi, periodi, scadenze, mezzi di famiglia |
| Dati sul telefono | `db.js` | IndexedDB `garage-db`, 8 tabelle |
| Sincronizzazione | `sync.js` | invio/ricezione col foglio Google |
| Grafici | `charts.js` | barre e linee SVG fatte in casa |
| Viaggi | `viaggi.js` | GPX, mappe, tappe |
| Import | `drivvo.js` | CSV di Drivvo |
| Grafica | `style.css`, `minimal.css`, `glass.css` | 6 stili + 12 colori |
| Foglio Google | `apps-script/GarageSync.gs`, `Calendario.gs` | server e calendario scadenze |
| App di famiglia | `facile/` | "La mia auto" |
| Android | repo `LeMieApp`, flavor `garage` | APK che apre il sito |

Non ci sono framework né passaggi di build: i file si pubblicano così come sono su GitHub Pages.

## 2. Dati (non vanno persi)

Tabelle: `veicoli`, `rifornimenti`, `manutenzioni`, `spese`, `bolli`, `assicurazioni`, `documenti`, `viaggi`.
Ogni riga ha `id`, `updatedAt`, `deleted`; sul telefono anche `_dirty` e `_sync`.

- Le date sono testo `AAAA-MM-GG`.
- La foto del mezzo (`foto`) resta **solo sul telefono**, non va nel foglio.
- "Di chi è" il mezzo sta nelle note: `[famiglia: Nome]`. "Nascosta in La mia auto" idem.
- Preferenze in `localStorage`: `garage-ui`, `garage-tema`, `garage-stile`, `garage-sync`, `garage-colore-css`.

**Regola per Garage 2:** stesso database, stesse tabelle, stessi nomi dei campi, stesso protocollo col foglio. Così la versione nuova e quella vecchia leggono gli stessi dati.

## 3. Funzioni

### A. Veicoli
- ✅ Più mezzi: auto, moto, scooter, ciclomotore, trattorino/attrezzo, altro.
- ✅ Alimentazioni: benzina, diesel, GPL, metano, elettrico, ibrido; secondo carburante (GPL/metano + benzina).
- ✅ Contatore a km oppure a ore.
- ✅ Scheda, storico e statistiche per ogni mezzo; foto; targa, anno, cilindrata, potenza, serbatoi, note.
- ✅ Mezzi di famiglia separati dai propri (fuori dai conti).
- ❌ Ordinamento manuale dei mezzi (il campo `ordine` esiste ma non c'è modo di cambiarlo).

### B. Rifornimenti
- ✅ Data, km, carburante, litri, prezzo, totale, pieno sì/no, distributore, note.
- ✅ Calcolo automatico del terzo valore tra litri, prezzo e totale.
- ✅ Consumo "da pieno a pieno", separato per carburante; su auto GPL/metano la benzina non ha consumo.
- ✅ Prezzo medio, spesa, litri, km con un pieno (mediana), media per rifornimento.
- ✅ Controlli sui km (più bassi di prima, salto enorme, più alti di una lettura successiva).
- ❌ Autonomia residua stimata (c'è solo "km con un pieno").

### C. Manutenzioni
- ✅ Tipo (13 tipi), data, km, costo, officina, descrizione, note, allegati.
- 🟡 "Prossima manutenzione": solo la **revisione** ha la data successiva. Per tagliando, olio, gomme ecc. non c'è promemoria né per data né per km (il campo `prossimiKm` esiste nel foglio ma l'app non lo usa).

### D. Spese e scadenze
- ✅ Spese per categoria (11 categorie), con allegati.
- ✅ Bollo (periodo, scadenza) e assicurazione (compagnia, polizza, copertura, scadenza).
- ✅ Sospensione e riattivazione dell'assicurazione, con spostamento della scadenza.
- ✅ Scadenziario: revisione, bollo, assicurazione, documenti con scadenza; avviso a 30 giorni.
- 🟡 Notifiche: solo tramite il **calendario Google** (`Calendario.gs`, 7 giorni e 1 giorno prima). L'app non manda notifiche sue.

### E. Dashboard
- ✅ Home con spesa del mese, confronto col mese prima, mezzi, scadenze vicine, ultimi movimenti (grafica di prima).
- ✅ Garage con foto, scadenze, grafico a 6 mesi (grafiche nuove).
- ❌ Widget personalizzabili (non si può scegliere cosa vedere).

### F. Statistiche e report
- ✅ Periodi: oggi, settimana, mese, trimestre, semestre, anno, tutto, personalizzato.
- ✅ Filtro per mezzo; confronto col periodo precedente.
- ✅ Schede Riepilogo, Carburante, Costi, Utilizzo; grafici con valore al tocco.
- ✅ €/km con assicurazione e bollo divisi sui giorni coperti.
- ❌ Confronto tra due periodi scelti a piacere.
- ❌ Esportazione PDF, CSV, Excel: la voce "Report PDF / Excel" in Altro è **solo grafica** (mostra "In arrivo").

### G. Altro che esiste
- ✅ Documenti: foto e PDF su Google Drive, in cartelle per mezzo, categoria e anno.
- ✅ Viaggi: GPX, km, durata, dislivello, mappa, tappe automatiche, link a Maps.
- ✅ Import da Drivvo (CSV); backup e ripristino su file JSON.
- ✅ "La mia auto" con un codice per ogni famigliare.
- ✅ Funziona offline; APK Android.

## 4. Foglio Google

Schede gestite dallo script: VEICOLI, RIFORNIMENTI, MANUTENZIONI, SPESE, BOLLI, ASSICURAZIONI, DOCUMENTI, VIAGGI.

- ✅ STATISTICHE: riscritta a ogni sincronizzazione (per anno e mezzo: km, litri, costi, €/km).
- ❌ REPORT: **non esiste** nello script.
- ✅ Sincronizzazione nei due sensi; le modifiche a mano nel foglio arrivano all'app (`onEdit`).
- ✅ Calendario Google con le scadenze.

Limiti noti:
- A ogni sincronizzazione il foglio rimanda **tutti** i dati (tracciati GPX compresi): con gli anni rallenta.
- Lo script riscrive ogni scheda per intero a ogni modifica.
- Le foto dei mezzi non si sincronizzano.

## 5. Problemi di struttura

- `app.js` è un file unico molto lungo: schermate, moduli e logica insieme.
- Le schermate esistono in **due copie** (grafica di prima e grafiche nuove, funzioni `…C`): ogni modifica va fatta due volte.
- I tre fogli di stile si sovrascrivono a strati; un tema nuovo oggi vuol dire un altro strato.
- "La mia auto" ha una copia sua dei calcoli (consumo, km).
- Nessun test automatico: le prove sono fatte a mano nel browser.

## 6. Cosa chiede Garage 2 che oggi manca

| Richiesta | Oggi |
|---|---|
| 5 temi veri (Liquid Glass, Cyber, Dark Cinematic, Minimal, Notebook) | 2 su 5 (Glass, Minimal) + 4 stili di prima |
| Colori, sfumature, sfondi, schede, densità a scelta | solo 12 colori e chiaro/scuro |
| Dashboard a widget | ❌ |
| Prossima manutenzione per data e km | solo revisione |
| Autonomia | ❌ |
| Confronto tra periodi a scelta | solo col periodo precedente |
| Export PDF / CSV / Excel | ❌ |
| Scheda REPORT nel foglio | ❌ |
| Notifiche | solo calendario Google |
