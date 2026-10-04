/* =========================================================
   GARAGE — charts.js
   Piccola libreria di grafici SVG fatta in casa: nessun file
   esterno, quindi funziona anche offline.
   Charts.bar(el, opts)  /  Charts.line(el, opts)
   opts = { labels: [...], series: [{name, color, data:[...]}], fmt: v => testo, stacked }
   ========================================================= */

const Charts = {
  _list: [],

  clear() { this._list = []; },

  redrawAll() { this._list.forEach(c => c.draw()); },

  bar(el, opts) { return this._make(el, { ...opts, type: 'bar' }); },
  line(el, opts) { return this._make(el, { ...opts, type: 'line' }); },

  _make(el, opts) {
    const c = { el, opts, draw: () => this._draw(el, opts) };
    this._list.push(c);
    c.draw();
    return c;
  },

  _nice(max) {
    if (max <= 0) return { max: 1, step: 0.25 };
    const raw = max / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    return { max: step * Math.ceil(max / step), step };
  },

  _draw(el, o) {
    const W = Math.max(260, el.clientWidth || 320), H = el.clientHeight || 220;
    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue('--text-3').trim();
    const grid = css.getPropertyValue('--grid').trim();
    const surface = css.getPropertyValue('--surface').trim();
    const fmt = o.fmt || (v => String(Math.round(v)));
    const n = o.labels.length;
    const series = o.series;

    // massimo valore
    let max = 0, min = Infinity;
    for (let i = 0; i < n; i++) {
      if (o.type === 'bar' && o.stacked) {
        const s = series.reduce((a, se) => a + (se.data[i] || 0), 0);
        if (s > max) max = s;
      } else {
        for (const se of series) { const v = se.data[i]; if (v != null) { if (v > max) max = v; if (v < min) min = v; } }
      }
    }
    let lo = 0;
    if (o.type === 'line' && o.zoom && isFinite(min) && min > 0) lo = Math.max(0, min - (max - min) * 0.4 - max * 0.02);
    const nice = this._nice(max - lo);
    let step = nice.step;
    if (lo) lo = Math.floor(lo / step) * step;
    const top = lo + nice.max;

    // margini
    const yLabels = [];
    for (let v = lo; v <= top + 1e-9; v += step) yLabels.push(v);
    const yTxt = yLabels.map(v => (o.fmtAxis || fmt)(v));
    const ml = Math.min(64, 8 + Math.max(...yTxt.map(t => t.length)) * 6.6), mr = 8, mt = 8, mb = 24;
    const pw = W - ml - mr, ph = H - mt - mb;
    const X = i => ml + (n === 1 ? pw / 2 : (o.type === 'bar' ? (i + 0.5) * pw / n : i * pw / (n - 1)));
    const Y = v => mt + ph - ((v - lo) / (top - lo)) * ph;

    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:100%;height:100%;stroke:none;display:block" role="img">`;
    // griglia
    yLabels.forEach((v, k) => {
      svg += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${grid}" stroke-width="1"/>`;
      svg += `<text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="${muted}">${yTxt[k]}</text>`;
    });
    // etichette asse X (diradate)
    const every = Math.max(1, Math.ceil(n / Math.floor(pw / 46)));
    o.labels.forEach((l, i) => {
      if (i % every !== 0 && i !== n - 1) return;
      if (i === n - 1 && i % every !== 0 && (n - 1) % every < every * 0.6) return;
      svg += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${muted}">${l}</text>`;
    });

    if (o.type === 'bar') {
      const bw = Math.max(3, Math.min(22, pw / n * (o.stacked || series.length === 1 ? 0.6 : 0.8) / (o.stacked ? 1 : series.length)));
      for (let i = 0; i < n; i++) {
        let acc = 0;
        series.forEach((se, si) => {
          const v = se.data[i] || 0;
          if (!v) return;
          let x, y0, y1;
          if (o.stacked) { x = X(i) - bw / 2; y0 = Y(acc); acc += v; y1 = Y(acc); }
          else { x = X(i) - (bw * series.length) / 2 + si * bw; y0 = Y(0); y1 = Y(v); }
          const h = Math.max(1, y0 - y1);
          const isTop = !o.stacked || series.slice(si + 1).every(s2 => !(s2.data[i] > 0));
          const r = isTop ? Math.min(4, bw / 2, h) : 0;
          // rettangolo con angoli superiori arrotondati
          svg += `<path d="M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y0} Z" fill="${se.color}" stroke="${surface}" stroke-width="${o.stacked ? 1 : 0}"/>`;
        });
      }
    } else {
      series.forEach(se => {
        let d = '', pen = false;
        se.data.forEach((v, i) => {
          if (v == null) return;
          d += (pen ? 'L' : 'M') + X(i) + ',' + Y(v) + ' ';
          pen = true;
        });
        svg += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
        se.data.forEach((v, i) => {
          if (v == null) return;
          svg += `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${se.color}" stroke="${surface}" stroke-width="2"/>`;
        });
      });
    }
    svg += `<line class="xhair" x1="0" x2="0" y1="${mt}" y2="${mt + ph}" stroke="${muted}" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>`;
    svg += `</svg><div class="ctip" hidden></div>`;
    el.innerHTML = svg;

    // tooltip (mouse e dito)
    const svgEl = el.querySelector('svg'), tip = el.querySelector('.ctip'), xh = el.querySelector('.xhair');
    const show = ev => {
      const rect = svgEl.getBoundingClientRect();
      const px = (ev.clientX - rect.left) * (W / rect.width);
      let i;
      if (o.type === 'bar') i = Math.floor((px - ml) / (pw / n));
      else i = n === 1 ? 0 : Math.round((px - ml) / (pw / (n - 1)));
      if (i < 0 || i >= n) { hide(); return; }
      const rows = series.map(se => ({ se, v: se.data[i] })).filter(r => r.v != null && (o.type === 'line' || r.v !== 0));
      let html = `<b>${o.tipLabels ? o.tipLabels[i] : o.labels[i]}</b>`;
      if (!rows.length) html += `<div>Nessun dato</div>`;
      rows.forEach(r => { html += `<div><i style="background:${r.se.color}"></i>${series.length > 1 ? r.se.name + ': ' : ''}<b>${fmt(r.v)}</b></div>`; });
      if (o.stacked && rows.length > 1) html += `<div class="tot">Totale: <b>${fmt(rows.reduce((a, r) => a + r.v, 0))}</b></div>`;
      tip.innerHTML = html; tip.hidden = false;
      const cx = X(i) * rect.width / W;
      xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.setAttribute('opacity', '1');
      const tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(0, cx - tw / 2), rect.width - tw) + 'px';
    };
    const hide = () => { tip.hidden = true; xh.setAttribute('opacity', '0'); };
    svgEl.addEventListener('pointermove', show);
    svgEl.addEventListener('pointerdown', show);
    svgEl.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hide(); });
  }
};

window.addEventListener('resize', () => {
  clearTimeout(Charts._t);
  Charts._t = setTimeout(() => Charts.redrawAll(), 150);
});
