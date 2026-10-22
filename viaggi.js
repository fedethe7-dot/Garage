/* =========================================================
   GARAGE — viaggi.js
   Registro dei viaggi e dei giri: lettura dei file GPX,
   tracciato semplificato, mappe (Leaflet + OpenStreetMap)
   e tappe trovate dal percorso.
   ========================================================= */

const Viaggi = {
  MAX_PUNTI: 600,          // punti del tracciato salvati nel foglio (semplificato)
  COLORI: ['#ff6b4a', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444', '#6366f1', '#84cc16'],

  /* ---------- Dati ---------- */
  lista(vid) {
    return DB.list('viaggi').filter(v => !vid || v.veicoloId === vid)
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },
  gpxDoc(id) { return id ? DB.list('documenti').find(d => d.rifTabella === 'viaggi-gpx' && d.rifId === id) : null; },
  tappe(v) { return String(v.tappe || '').split(/\s*→\s*|\n/).map(s => s.trim()).filter(Boolean); },
  totali(lista) {
    const t = { n: lista.length, km: 0, disl: 0, lungo: null };
    for (const v of lista) {
      const k = num(v.km); t.km += k; t.disl += num(v.dislivello);
      if (!t.lungo || k > num(t.lungo.km)) t.lungo = v;
    }
    return t;
  },
  colore(i) { return this.COLORI[i % this.COLORI.length]; },

  /** "4:30" / "4h 30m" / "270" → minuti */
  minuti(s) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return 0;
    let m = s.match(/^(\d+)\s*[:.h]\s*(\d{1,2})\s*m?$/); if (m) return +m[1] * 60 + +m[2];
    m = s.match(/^(\d+)\s*h$/); if (m) return +m[1] * 60;
    m = s.match(/^(\d+)\s*(m|min)?$/); if (m) return +m[1];
    return 0;
  },
  fmtDurata(min) { if (!min) return ''; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}:${String(m).padStart(2, '0')}` : `${m} min`; },
  media(v) { const m = this.minuti(v.durata); return m && num(v.km) ? num(v.km) / (m / 60) : 0; },

  /* ---------- GPX ---------- */
  async leggiGpx(file) {
    if (file.size > 15 * 1048576) throw new Error('Il GPX è troppo grande (max 15 MB)');
    const testo = await file.text();
    const info = this.analizza(testo);
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(new Blob([testo], { type: 'application/gpx+xml' }));
    });
    return { ...info, dataUrl, nomeFile: file.name, dimensione: file.size };
  },

  analizza(testo) {
    const xml = new DOMParser().parseFromString(testo, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('Il file non sembra un GPX valido');
    let nodi = [...xml.getElementsByTagName('trkpt')];
    if (nodi.length < 2) nodi = [...xml.getElementsByTagName('rtept')];
    if (nodi.length < 2) throw new Error('Nel GPX non c\'è un tracciato');
    const figlio = (n, tag) => { const e = n.getElementsByTagName(tag)[0]; return e ? e.textContent.trim() : ''; };
    const pts = nodi.map(n => ({ lat: +n.getAttribute('lat'), lon: +n.getAttribute('lon'), ele: parseFloat(figlio(n, 'ele')), t: figlio(n, 'time') }))
      .filter(p => isFinite(p.lat) && isFinite(p.lon));

    let m = 0, salita = 0, rif = null;
    for (let i = 1; i < pts.length; i++) m += this.dist(pts[i - 1], pts[i]);
    for (const p of pts) {   // dislivello con soglia di 5 m per ignorare il "rumore" del GPS
      if (!isFinite(p.ele)) continue;
      if (rif === null) { rif = p.ele; continue; }
      if (p.ele - rif >= 5) { salita += p.ele - rif; rif = p.ele; }
      else if (rif - p.ele >= 5) rif = p.ele;
    }
    const tempi = pts.map(p => Date.parse(p.t)).filter(isFinite);
    const durata = tempi.length > 1 ? Math.round((tempi[tempi.length - 1] - tempi[0]) / 60000) : 0;
    const nomeEl = xml.getElementsByTagName('name')[0];
    const semplici = this.semplifica(pts, this.MAX_PUNTI);
    return {
      km: Math.round(m / 100) / 10,
      dislivello: Math.round(salita),
      durataMin: durata > 0 && durata < 60 * 72 ? durata : 0,
      data: tempi.length ? D.iso(new Date(tempi[0])) : '',
      nome: nomeEl ? nomeEl.textContent.trim() : '',
      punti: semplici,
      enc: this.encode(semplici),
      nPunti: pts.length
    };
  },

  dist(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  },

  /** Douglas-Peucker: alza la tolleranza finché i punti sono al massimo "max" */
  semplifica(pts, max) {
    if (pts.length <= max) return pts.map(p => [p.lat, p.lon]);
    const k = Math.cos(pts[0].lat * Math.PI / 180);
    const xy = pts.map(p => [p.lon * k, p.lat]);
    let tol = 0.00008, out;
    do { out = this._dp(xy, tol); tol *= 1.6; } while (out.length > max);
    return out.map(i => [pts[i].lat, pts[i].lon]);
  },
  _dp(xy, tol) {
    const keep = new Uint8Array(xy.length); keep[0] = keep[xy.length - 1] = 1;
    const stack = [[0, xy.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let maxD = 0, idx = -1;
      const [x1, y1] = xy[a], [x2, y2] = xy[b], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
      for (let i = a + 1; i < b; i++) {
        const [x, y] = xy[i];
        let t = L ? ((x - x1) * dx + (y - y1) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
        const ex = x1 + t * dx - x, ey = y1 + t * dy - y, d = ex * ex + ey * ey;
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (idx > 0 && maxD > tol * tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    const out = []; keep.forEach((v, i) => v && out.push(i)); return out;
  },

  /* Polyline di Google (5 decimali): occupa poco spazio nel foglio */
  encode(pts) {
    let out = '', pLat = 0, pLon = 0;
    const enc = v => { v = v < 0 ? ~(v << 1) : v << 1; let s = ''; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
    for (const [la, lo] of pts) {
      const a = Math.round(la * 1e5), b = Math.round(lo * 1e5);
      out += enc(a - pLat) + enc(b - pLon); pLat = a; pLon = b;
    }
    return out;
  },
  decode(s) {
    const pts = []; let i = 0, lat = 0, lon = 0;
    s = String(s || '');
    while (i < s.length) {
      for (const k of [0, 1]) {
        let res = 0, sh = 0, b;
        do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
        const d = res & 1 ? ~(res >> 1) : res >> 1;
        if (k === 0) lat += d; else lon += d;
      }
      pts.push([lat / 1e5, lon / 1e5]);
    }
    return pts;
  },

  /** GPX ricostruito dal tracciato semplificato (se il file originale non c'è) */
  gpxDaTracciato(v) {
    const pts = this.decode(v.tracciato);
    const nome = esc(v.titolo || 'Viaggio');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Garage" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${nome}</name><trkseg>\n` +
      pts.map(([a, b]) => `<trkpt lat="${a.toFixed(5)}" lon="${b.toFixed(5)}"/>`).join('\n') + '\n</trkseg></trk>\n</gpx>';
  },

  scaricaGpx(v) {
    const d = this.gpxDoc(v.id);
    if (d && d.url && !d._file) { window.open(d.url, '_blank', 'noopener'); return; }
    let blob, nome;
    if (d && d._file) {
      const b64 = d._file.split(',')[1], bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      blob = new Blob([arr], { type: 'application/gpx+xml' }); nome = d.fileNome || 'viaggio.gpx';
    } else if (v.tracciato) {
      blob = new Blob([this.gpxDaTracciato(v)], { type: 'application/gpx+xml' }); nome = (v.titolo || 'viaggio').replace(/[\\/:*?"<>|]/g, '') + '.gpx';
    } else { UI.toast('Questo viaggio non ha un tracciato'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  },

  /** Salva / sostituisce / toglie il file GPX collegato al viaggio (finisce su Drive con la sincronizzazione) */
  async salvaGpx(v, nuovo, rimosso) {
    const esiste = this.gpxDoc(v.id);
    const titolo = 'Viaggio ' + (v.titolo || '') + ' - ' + D.fmt(v.data).replace(/\//g, '-');
    const meta = { veicoloId: v.veicoloId, categoria: 'Viaggi', data: v.data, cartella: Docs.anno(v.data), titolo, rifTabella: 'viaggi-gpx', rifId: v.id };
    if (nuovo) {
      const file = { _file: nuovo.dataUrl, mime: 'application/gpx+xml', dimensione: nuovo.dimensione, fileNome: titolo + '.gpx', fileId: '', url: '' };
      if (esiste) await DB.save('documenti', { ...esiste, ...meta, ...file, _vecchioFile: esiste.fileId || undefined });
      else await DB.save('documenti', { ...meta, ...file });
    } else if (rimosso && esiste) {
      await DB.remove('documenti', esiste.id);
    } else if (esiste && (esiste.veicoloId !== meta.veicoloId || esiste.data !== meta.data || esiste.titolo !== meta.titolo || esiste.cartella !== meta.cartella)) {
      await DB.save('documenti', { ...esiste, ...meta });
    }
  },

  /* ---------- Tappe dal tracciato (OpenStreetMap) ---------- */
  async trovaTappe(punti, quante = 6) {
    if (!punti || punti.length < 2) throw new Error('Serve un tracciato');
    const idx = [...new Set(Array.from({ length: quante }, (_, i) => Math.round(i * (punti.length - 1) / (quante - 1))))];
    const nomi = [];
    for (const [n, i] of idx.entries()) {
      if (n) await new Promise(r => setTimeout(r, 1100));   // regola di Nominatim: 1 richiesta al secondo
      const [lat, lon] = punti[i];
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=it&lat=${lat}&lon=${lon}`);
        const j = await r.json(), a = j.address || {};
        const nome = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || j.name;
        if (nome && nomi[nomi.length - 1] !== nome) nomi.push(nome);
      } catch (e) { /* salto il punto */ }
    }
    if (!nomi.length) throw new Error('Non riesco a trovare i paesi (sei online?)');
    return nomi;
  },

  linkMaps(v) {
    const t = this.tappe(v);
    return t.length >= 2 ? 'https://www.google.com/maps/dir/' + t.slice(0, 10).map(encodeURIComponent).join('/') : '';
  },

  /* ---------- Mappe ---------- */
  _leaflet: null,
  _mappe: [],
  carica() {
    if (window.L) return Promise.resolve();
    if (this._leaflet) return this._leaflet;
    this._leaflet = new Promise((ok, ko) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      const errore = () => { this._leaflet = null; s.remove(); ko(new Error('Mappa non disponibile: controlla la connessione')); };
      s.onload = () => window.L ? ok() : errore(); s.onerror = errore;
      document.head.appendChild(s);
    });
    return this._leaflet;
  },
  pulisci() { this._mappe.forEach(m => { try { m.remove(); } catch (e) {} }); this._mappe = []; },

  /** Apre la mappa a tutto schermo; si chiude con la X o col tasto indietro del telefono */
  schermoIntero(viaggi, singolo, titolo) {
    if (document.querySelector('.map-full')) return;
    const box = document.createElement('div');
    box.className = 'map-full';
    box.innerHTML = `<div class="map-full-bar"><b>${esc(titolo || 'Mappa')}</b><button type="button" class="icon-btn" aria-label="Chiudi">✕</button></div><div class="map-full-map"></div>`;
    document.body.appendChild(box);
    document.body.style.overflow = 'hidden';
    const prima = this._mappe.length;
    const chiudi = () => {
      if (!box.isConnected) return;
      window.removeEventListener('popstate', chiudi);
      this._mappe.splice(prima).forEach(m => { try { m.remove(); } catch (e) {} });
      box.remove();
      if (!document.querySelector('.sheet:not([hidden])')) document.body.style.overflow = '';
    };
    box.querySelector('button').onclick = () => { if (history.state && history.state.mappaFull) history.back(); else chiudi(); };
    history.pushState({ mappaFull: true }, '', location.href);
    window.addEventListener('popstate', chiudi);
    this.mappa(box.querySelector('.map-full-map'), viaggi, singolo).then(() => {
      const m = this._mappe[prima]; if (m) { m.scrollWheelZoom.enable(); setTimeout(() => m.invalidateSize(), 300); }
    });
  },

  /** Disegna uno o più viaggi nel contenitore indicato.
      anteprima = mappa ferma (si tocca per aprirla a tutto schermo) */
  async mappa(el, viaggi, singolo, anteprima) {
    if (!el) return;
    const conTraccia = viaggi.filter(v => v.tracciato);
    if (!conTraccia.length) { el.innerHTML = '<div class="map-empty">🗺️ Nessun tracciato GPX da mostrare</div>'; return; }
    try { await this.carica(); } catch (e) { el.innerHTML = `<div class="map-empty">📡 ${esc(e.message)}</div>`; return; }
    if (!document.body.contains(el)) return;
    const scuro = UI.isDark();
    const fermo = !!anteprima;
    const map = L.map(el, {
      zoomControl: !fermo, attributionControl: true, scrollWheelZoom: false, tap: !fermo,
      dragging: !fermo, touchZoom: !fermo, doubleClickZoom: !fermo, boxZoom: false, keyboard: !fermo
    });
    this._mappe.push(map);
    // mappa OpenStreetMap; in tema scuro è solo un po' attenuata, così strade e tracciato restano leggibili
    if (scuro) el.classList.add('map-dim');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const gruppo = L.featureGroup().addTo(map);
    conTraccia.forEach((v, i) => {
      const pts = this.decode(v.tracciato);
      if (pts.length < 2) return;
      const col = singolo ? '#ff4d2e' : this.colore(i);
      const w = singolo ? 5 : 4;
      // bordo scuro sotto la linea colorata: si legge su qualsiasi sfondo
      L.polyline(pts, { color: scuro ? '#000' : '#fff', weight: w + 4, opacity: .75, interactive: false }).addTo(gruppo);
      const linea = L.polyline(pts, { color: col, weight: w, opacity: 1 }).addTo(gruppo);
      if (singolo) {
        L.circleMarker(pts[0], { radius: 8, color: '#fff', weight: 3, fillColor: '#22c55e', fillOpacity: 1 }).bindTooltip('Partenza').addTo(gruppo);
        L.circleMarker(pts[pts.length - 1], { radius: 8, color: '#fff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }).bindTooltip('Arrivo').addTo(gruppo);
      } else {
        const veic = DB.get('veicoli', v.veicoloId);
        linea.bindPopup(`<b>${esc(v.titolo || 'Viaggio')}</b><br>${D.fmt(v.data)} · ${F.num(num(v.km))} km<br>${esc(UI.nomeVeicolo(veic))}<br><a href="#viaggio/${v.id}">Apri il viaggio ›</a>`);
      }
    });
    const inquadra = () => {
      if (gruppo.getLayers().length) map.fitBounds(gruppo.getBounds(), { padding: [28, 28] });
      else map.setView([45.4, 11.9], 8);
    };
    inquadra();
    setTimeout(() => { map.invalidateSize(); inquadra(); }, 300);
  }
};
