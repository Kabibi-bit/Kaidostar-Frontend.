/* =========================================================================
   MISSION CONTROL - chart kit. Plain SVG, no libraries.

   Every chart here is drawn at the width it actually has (re-drawn when that
   changes), so text stays crisp at 10-12px on a phone and a wide screen alike.
   Each one comes with:
     - a tooltip on hover AND on keyboard focus (arrow keys walk the values),
     - a table twin (the same numbers as a plain table - the accessible version),
     - a legend whenever two or more series share a chart.

   Colour is not hand-picked: the categorical palette below was validated
   (lightness band, chroma floor, colour-blind separation, normal-vision floor,
   contrast) against the card surface #171933 in dark mode - the app's only
   mode. Hues follow the brand (comet blue, ember orange, aurora teal, gold,
   rose, green, violet, coral). Status colours are reserved for good/bad states
   and always come with an icon and a word. Text never wears a series colour.
   ========================================================================= */
(function(root){
'use strict';

var P = {
  surface: '#171933', grid: '#232548', axis: '#303463',
  ink: '#FFFFFF', ink2: '#B4B6D6', muted: '#8386BE',
  // categorical - fixed order, never cycled (worst adjacent CVD ΔE 9.3, normal-vision 19.4, all >= 3:1)
  cat: ['#5788e5', '#da6425', '#16a384', '#c48800', '#d25587', '#389230', '#8f7ce3', '#e36864'],
  // ordinal - one hue, dim -> bright: later stage / bigger bucket is brighter (validated --ordinal)
  ord: ['#3e61a4', '#527ed0', '#6d9df5', '#93beff', '#c0dcff'],
  // sequential magnitude (heat cells); zero is the grid colour
  seq: ['#223b6c', '#365ba1', '#507ed3', '#77a4f6', '#a7cbff'],
  other: '#6f739e',   // de-emphasis / "Other" / not enough data yet (3.8:1)
  status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
  statusIcon: { good: '✓', warning: '!', serious: '▲', critical: '✕' }
};

/* ------------------------------------------------------------------ helpers */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function isNum(v){ return typeof v === 'number' && isFinite(v); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function r1(v){ return Math.round(v * 10) / 10; }
function px(v){ return Math.round(v * 2) / 2; }   // half-pixel snap keeps hairlines crisp

function fmtN(v, dp){
  if(!isNum(v)) return '–';
  var a = Math.abs(v), s = v < 0 ? '-' : '';
  if(a >= 1e6) return s + r1(a / 1e6).toString().replace(/\.0$/, '') + 'M';
  if(a >= 1e4) return s + r1(a / 1e3).toString().replace(/\.0$/, '') + 'K';
  if(dp != null) return s + a.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });
  return s + (a % 1 === 0 ? a.toLocaleString('en-US') : r1(a).toLocaleString('en-US'));
}
function fmtPct(v, dp){ return isNum(v) ? (dp ? r1(v) : Math.round(v)) + '%' : '–'; }
function fmtMoney(v){ if(!isNum(v)) return '–'; return '$' + (Math.abs(v) >= 1000 ? r1(v / 1000).toString().replace(/\.0$/, '') + 'K' : Math.round(v)); }
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtDay(ms){ var d = new Date(ms); return MON[d.getMonth()] + ' ' + d.getDate(); }
function fmtMonth(ms){ var d = new Date(ms); return MON[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''); }
function fmtDate(ms, gran){ return gran === 'month' ? fmtMonth(ms) : fmtDay(ms); }
function fmtFull(ms){ var d = new Date(ms); return WD[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }

var _ctx = null;
function textW(s, size, weight){
  s = String(s == null ? '' : s);
  try{
    if(!_ctx && root.document){ _ctx = root.document.createElement('canvas').getContext('2d'); }
    if(_ctx){ _ctx.font = (weight || 500) + ' ' + (size || 11.5) + 'px Manrope, system-ui, sans-serif'; return _ctx.measureText(s).width; }
  }catch(e){}
  return s.length * (size || 11.5) * 0.56;
}
function fit(s, w, size, weight){
  s = String(s == null ? '' : s);
  if(textW(s, size, weight) <= w) return s;
  var lo = 0, hi = s.length;
  while(lo < hi){ var mid = (lo + hi + 1) >> 1; if(textW(s.slice(0, mid) + '…', size, weight) <= w) lo = mid; else hi = mid - 1; }
  return lo > 0 ? s.slice(0, lo).replace(/\s+$/, '') + '…' : '…';
}
function niceStep(range, count){
  var raw = range / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}
function ticks(min, max, count, integer){
  if(!(max > min)){ max = min + (integer ? 4 : 1); }
  var step = niceStep(max - min, count || 4);
  if(integer) step = Math.max(1, Math.ceil(step));
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
  for(var v = lo; v <= hi + step / 1e6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
// a rect whose data end (top for columns, right for bars) is rounded r, square at the baseline
function colPath(x, y, w, h, r){
  if(h <= 0 || w <= 0) return '';
  r = Math.min(r, h, w / 2);
  return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
}
function barPath(x, y, w, h, r){
  if(h <= 0 || w <= 0) return '';
  r = Math.min(r, w, h / 2);
  return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z';
}
function svgOpen(w, h, label){ return '<svg class="mcc-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label || 'Chart') + '"><title>' + esc(label || 'Chart') + '</title>'; }
function tx(x, y, s, o){
  o = o || {};
  return '<text x="' + px(x) + '" y="' + px(y) + '" fill="' + (o.fill || P.muted) + '" font-size="' + (o.size || 10.5) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') +
    (o.weight ? ' font-weight="' + o.weight + '"' : '') + ' font-family="' + (o.mono ? "'JetBrains Mono', ui-monospace, monospace" : "Manrope, system-ui, sans-serif") + '"' + (o.base ? ' dominant-baseline="' + o.base + '"' : '') + '>' + esc(s) + '</text>';
}
function hline(x1, x2, y, c){ return '<line x1="' + px(x1) + '" x2="' + px(x2) + '" y1="' + px(y) + '" y2="' + px(y) + '" stroke="' + (c || P.grid) + '" stroke-width="1"/>'; }
function vline(x, y1, y2, c, wdt){ return '<line x1="' + px(x) + '" x2="' + px(x) + '" y1="' + px(y1) + '" y2="' + px(y2) + '" stroke="' + (c || P.grid) + '" stroke-width="' + (wdt || 1) + '"/>'; }
function dot(x, y, r, c, ring){ return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r + '" fill="' + c + '"' + (ring !== false ? ' stroke="' + P.surface + '" stroke-width="2"' : '') + '/>'; }
// a tooltip record: a title, then rows of {c: key colour, l: label, v: value}
function tip(x, y, title, rows, extra){ return { x: x, y: y, title: title, rows: rows || [], note: extra || '' }; }

/* ------------------------------------------------------------------ y-axis frame shared by columns, histograms and lines */
function frame(spec, W, H, values, opts){
  opts = opts || {};
  var fmt = spec.yFmt || fmtN;
  var vmin = isNum(spec.yMin) ? spec.yMin : Math.min(0, Math.min.apply(null, values.concat([0])));
  var vmax = isNum(spec.yMax) ? spec.yMax : Math.max.apply(null, values.concat([opts.floorMax || 1]));
  var tk = ticks(vmin, vmax, spec.tickCount || 4, spec.integer !== false && values.every(function(v){ return v % 1 === 0; }));
  if(isNum(spec.yMax)) tk = tk.filter(function(t){ return t <= spec.yMax + 1e-9; });
  var lo = tk[0], hi = tk[tk.length - 1];
  if(isNum(spec.yMax) && hi < spec.yMax) hi = spec.yMax;
  var labW = Math.max.apply(null, tk.map(function(t){ return textW(fmt(t), 10.5, 400); })) + 10;
  var m = { l: Math.max(26, labW), r: opts.r || 10, t: opts.t || 12, b: opts.b || 24 };
  var pw = W - m.l - m.r, ph = H - m.t - m.b;
  function y(v){ return m.t + ph - (v - lo) / (hi - lo || 1) * ph; }
  var g = '';
  tk.forEach(function(t){ g += hline(m.l, W - m.r, y(t), t === 0 ? P.axis : P.grid) + tx(m.l - 6, y(t) + 3.5, fmt(t), { anchor: 'end', mono: true }); });
  return { m: m, pw: pw, ph: ph, y: y, lo: lo, hi: hi, grid: g, fmt: fmt };
}
// x labels: as many as fit, always ending on the latest
function xLabels(labels, xs, f, H, minGap){
  var idx = []; labels.forEach(function(l, i){ if(l !== '' && l != null) idx.push(i); });
  if(!idx.length) return '';
  var maxW = Math.max.apply(null, idx.map(function(i){ return textW(labels[i], 10.5, 400); }));
  var slot = idx.length > 1 ? (xs[idx[idx.length - 1]] - xs[idx[0]]) / (idx.length - 1) : 999;
  var stride = Math.max(1, Math.ceil((maxW + (minGap || 10)) / Math.max(1, slot)));
  var out = '';
  for(var k = idx.length - 1; k >= 0; k -= stride) out += tx(xs[idx[k]], H - f.m.b + 15, labels[idx[k]], { anchor: 'middle', mono: true });
  return out;
}

/* ------------------------------------------------------------------ columns (grouped or stacked) */
function drawColumns(spec, W){
  var labels = spec.labels || [], series = (spec.series || []).filter(Boolean), n = labels.length;
  var H = spec.height || 190, stacked = !!spec.stacked && series.length > 1;
  var totals = labels.map(function(_, i){ return series.reduce(function(s, se){ return s + (isNum(se.values[i]) ? se.values[i] : 0); }, 0); });
  var vals = stacked ? totals : [].concat.apply([], series.map(function(se){ return se.values.filter(isNum); }));
  var f = frame(spec, W, H, vals.length ? vals : [0], { t: spec.capLabels === false ? 10 : 18 });
  var band = f.pw / Math.max(1, n), ns = stacked ? 1 : Math.max(1, series.length);
  var bw = Math.min(24, Math.max(2, (band * (n > 40 ? 0.8 : 0.66) - (ns - 1) * 2) / ns));
  var groupW = bw * ns + (ns - 1) * 2;
  var out = svgOpen(W, H, spec.label) + f.grid, tips = [], xs = [];
  var hi = isNum(spec.highlight) ? spec.highlight : null;
  for(var i = 0; i < n; i++){
    var cx = f.m.l + band * i + band / 2; xs.push(cx);
    var x0 = cx - groupW / 2, acc = 0, base = f.y(0);
    var rows = [];
    series.forEach(function(se, k){
      var v = isNum(se.values[i]) ? se.values[i] : 0, color = se.color || P.cat[k % 8];
      if(hi !== null && i !== hi) color = P.other;
      rows.push({ c: se.color || P.cat[k % 8], l: se.label, v: (spec.tipFmt || f.fmt)(isNum(se.values[i]) ? se.values[i] : 0) });
      if(v <= 0) return;
      if(stacked){
        var yTop = f.y(acc + v), yBot = f.y(acc), last = !series.slice(k + 1).some(function(s2){ return isNum(s2.values[i]) && s2.values[i] > 0; });
        var hgt = Math.max(1, yBot - yTop - (acc > 0 ? 2 : 0));
        out += '<path d="' + (last ? colPath(x0, yTop, bw, hgt, 4) : 'M' + x0 + ',' + (yTop + hgt) + 'V' + yTop + 'H' + (x0 + bw) + 'V' + (yTop + hgt) + 'Z') + '" fill="' + color + '"/>';
        acc += v;
      } else {
        var bx = x0 + k * (bw + 2), top = f.y(v);
        out += '<path d="' + colPath(bx, top, bw, Math.max(1, base - top), 4) + '" fill="' + color + '"/>';
      }
    });
    if(stacked && series.length > 1) rows.push({ c: null, l: 'Total', v: (spec.tipFmt || f.fmt)(totals[i]) });
    var tipTitle = spec.tipTitles ? spec.tipTitles[i] : labels[i];
    tips.push(tip(cx, f.y(stacked ? totals[i] : Math.max.apply(null, series.map(function(se){ return isNum(se.values[i]) ? se.values[i] : 0; }).concat([0]))), tipTitle, rows, spec.tipNotes ? spec.tipNotes[i] : ''));
    out += '<rect class="mcc-hit" data-t="' + i + '" x="' + r1(f.m.l + band * i) + '" y="' + f.m.t + '" width="' + r1(band) + '" height="' + r1(f.ph) + '" fill="transparent"/>';
  }
  // selective cap labels: the latest bar and the biggest one
  if(spec.capLabels !== false && n){
    var top = stacked ? totals : labels.map(function(_, i){ return Math.max.apply(null, series.map(function(se){ return isNum(se.values[i]) ? se.values[i] : 0; }).concat([0])); });
    var mx = top.indexOf(Math.max.apply(null, top)), lastI = n - 1, picks = {};
    if(top[lastI] > 0) picks[lastI] = 1;
    if(top[mx] > 0 && Math.abs(mx - lastI) * band > 26) picks[mx] = 1;
    if(series.length === 1 || stacked) Object.keys(picks).forEach(function(k){ k = +k; out += tx(xs[k], f.y(top[k]) - 5, (spec.capFmt || f.fmt)(top[k]), { anchor: 'middle', fill: P.ink2, size: 10.5, weight: 600 }); });
  }
  if(spec.ref && isNum(spec.ref.y)){ var ry = f.y(spec.ref.y); out += hline(f.m.l, W - f.m.r, ry, P.ink2).replace('stroke-width="1"', 'stroke-width="1" opacity="0.55"') + tx(W - f.m.r, ry - 4, spec.ref.label || '', { anchor: 'end', fill: P.ink2 }); }
  out += xLabels(spec.xLabels || labels, xs, f, H) + '</svg>';
  var table = { cols: [spec.xTitle || ''].concat(series.map(function(s){ return s.label; })).concat(stacked ? ['Total'] : []),
    rows: labels.map(function(l, i){ return [spec.tipTitles ? spec.tipTitles[i] : l].concat(series.map(function(s){ return (spec.tipFmt || f.fmt)(isNum(s.values[i]) ? s.values[i] : 0); })).concat(stacked ? [(spec.tipFmt || f.fmt)(totals[i])] : []); }) };
  return { svg: out, tips: tips, table: table, legend: series.length > 1 ? series.map(function(s, k){ return { c: s.color || P.cat[k % 8], l: s.label, shape: 'rect' }; }) : null };
}

/* ------------------------------------------------------------------ histogram (columns on numeric bins + an optional marker) */
function drawHist(spec, W){
  var s = Object.assign({}, spec, { series: [{ label: spec.seriesLabel || 'Count', values: spec.values, color: spec.color || P.cat[0] }], labels: spec.labels });
  if(spec.colors){
    // ordered buckets carry the ordinal ramp: draw each bin as its own series with one value
    s.series = spec.values.map(function(v, i){ var vs = spec.values.map(function(){ return 0; }); vs[i] = v; return { label: spec.labels[i], values: vs, color: spec.colors[i] }; });
    s.stacked = true;
  }
  var res = drawColumns(Object.assign(s, { tipFmt: spec.tipFmt }), W);
  if(spec.colors){
    res.legend = null;
    res.tips.forEach(function(t, i){ t.rows = [{ c: spec.colors[i], l: spec.seriesLabel || 'Count', v: (spec.tipFmt || fmtN)(spec.values[i]) }]; });
    res.table = { cols: [spec.xTitle || 'Range', spec.seriesLabel || 'Count'], rows: spec.labels.map(function(l, i){ return [l, (spec.tipFmt || fmtN)(spec.values[i])]; }) };
  }
  if(spec.mark && isNum(spec.mark.at)){
    var n = spec.labels.length, H = spec.height || 190;
    var f = frame(spec, W, H, spec.values.length ? spec.values : [0], { t: spec.capLabels === false ? 10 : 18 });
    var x = f.m.l + f.pw * clamp(spec.mark.at / n, 0, 1);
    res.svg = res.svg.replace('</svg>', vline(x, f.m.t - 6, H - f.m.b, P.ink2, 1.5) + tx(x + 4, f.m.t - 0, spec.mark.label || '', { fill: P.ink2, size: 10.5 }) + '</svg>');
  }
  return res;
}

/* ------------------------------------------------------------------ horizontal bars (ranked, with optional whiskers, segments, markers) */
function drawBars(spec, W){
  var rows = (spec.rows || []).filter(Boolean), fmt = spec.fmt || fmtN, rowH = spec.rowH || 30, bh = Math.min(16, rowH - 12);
  var top = spec.marks && spec.marks.length ? 18 : 6;
  var H = top + rows.length * rowH + 4;
  var vt = rows.map(function(r){ return r.text != null ? String(r.text) : (r.segs ? fmt(r.segs.reduce(function(s, g){ return s + (g.value || 0); }, 0)) : fmt(r.value)); });
  var labMax = Math.min(W * (spec.labelShare || 0.44), Math.max.apply(null, rows.map(function(r){ return textW(r.label, 11.5, 500); }).concat([40])) + 22);
  var valMax = Math.max.apply(null, vt.map(function(t){ return textW(t, 11, 600); }).concat([16])) + 10;
  var x0 = labMax, x1 = W - valMax, bw = Math.max(20, x1 - x0);
  var vmax = isNum(spec.max) ? spec.max : Math.max.apply(null, rows.map(function(r){ return Math.max(r.value || 0, isNum(r.hi) ? r.hi : 0, r.segs ? r.segs.reduce(function(s, g){ return s + (g.value || 0); }, 0) : 0); }).concat([1]));
  (spec.marks || []).forEach(function(mk){ if(isNum(mk.value)) vmax = Math.max(vmax, mk.value); });
  function X(v){ return x0 + clamp(v / (vmax || 1), 0, 1) * bw; }
  var out = svgOpen(W, H, spec.label), tips = [];
  out += vline(x0, top - 2, H - 2, P.axis);
  rows.forEach(function(r, i){
    var y = top + i * rowH, cy = y + rowH / 2, by = cy - bh / 2;
    out += tx(x0 - 10, cy + 4, fit(r.label, labMax - 12, 11.5, 500), { anchor: 'end', fill: r.muted ? P.muted : P.ink2, size: 11.5, weight: 500 });
    var trows = [];
    if(r.segs && r.segs.length){
      var acc = 0, segsOn = r.segs.filter(function(g){ return g.value > 0; });
      segsOn.forEach(function(g, k){
        var xa = X(acc) + (k ? 1 : 0), xb = X(acc + g.value) - (k < segsOn.length - 1 ? 1 : 0);
        out += '<path d="' + (k === segsOn.length - 1 ? barPath(xa, by, Math.max(1, xb - xa), bh, 4) : 'M' + xa + ',' + by + 'H' + xb + 'V' + (by + bh) + 'H' + xa + 'Z') + '" fill="' + g.color + '"/>';
        acc += g.value;
      });
      r.segs.forEach(function(g){ trows.push({ c: g.color, l: g.label, v: (spec.segFmt || fmt)(g.value) }); });
    } else {
      var v = isNum(r.value) ? r.value : 0, c = r.muted ? P.other : (r.color || spec.color || P.cat[0]);
      if(v > 0) out += '<path d="' + barPath(x0 + 1, by, Math.max(2, X(v) - x0 - 1), bh, 4) + '" fill="' + c + '"/>';
      trows.push({ c: c, l: spec.valueLabel || 'Value', v: vt[i] });
    }
    if(isNum(r.lo) && isNum(r.hi)){
      var wl = X(r.lo), wr = X(r.hi);
      out += '<line x1="' + r1(wl) + '" x2="' + r1(wr) + '" y1="' + r1(cy) + '" y2="' + r1(cy) + '" stroke="' + P.ink + '" stroke-opacity="0.75" stroke-width="1.5"/>' +
        vline(wl, cy - 4, cy + 4, 'rgba(255,255,255,0.75)', 1.5) + vline(wr, cy - 4, cy + 4, 'rgba(255,255,255,0.75)', 1.5);
      trows.push({ c: null, l: spec.rangeLabel || 'Likely range', v: fmt(r.lo) + ' – ' + fmt(r.hi) });
    }
    out += tx(Math.max(X(isNum(r.hi) ? Math.max(r.hi, r.value || 0) : (r.segs ? r.segs.reduce(function(s, g){ return s + (g.value || 0); }, 0) : (r.value || 0))), x0) + 6, cy + 4, vt[i], { fill: r.muted ? P.muted : P.ink, size: 11, weight: 600 });
    if(r.sub) trows.push({ c: null, l: r.sub, v: '' });
    tips.push(tip(X(r.value || 0), cy, r.label, trows, r.note || ''));
    out += '<rect class="mcc-hit" data-t="' + i + '" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
  });
  (spec.marks || []).forEach(function(mk){
    if(!isNum(mk.value)) return;
    var mx = X(mk.value);
    out += vline(mx, top - 4, H - 2, P.ink2, 1.5) + tx(mx, top - 7, mk.label || '', { anchor: mx > W - 60 ? 'end' : 'middle', fill: P.ink2, size: 10.5 });
  });
  out += '</svg>';
  var cols = [spec.labelTitle || ''].concat(rows.some(function(r){ return r.segs; }) ? rows[0].segs.map(function(g){ return g.label; }) : [spec.valueLabel || 'Value']);
  if(rows.some(function(r){ return isNum(r.lo); })) cols.push(spec.rangeLabel || 'Likely range');
  if(rows.some(function(r){ return r.sub; })) cols.push('');
  var table = { cols: cols, rows: rows.map(function(r, i){
    var row = [r.label].concat(r.segs ? r.segs.map(function(g){ return (spec.segFmt || fmt)(g.value); }) : [vt[i]]);
    if(cols.indexOf(spec.rangeLabel || 'Likely range') >= 0) row.push(isNum(r.lo) ? fmt(r.lo) + ' – ' + fmt(r.hi) : '');
    if(rows.some(function(x){ return x.sub; })) row.push(r.sub || '');
    return row;
  }) };
  var legend = null;
  if(rows.some(function(r){ return r.segs; })) legend = rows[0].segs.map(function(g){ return { c: g.color, l: g.label, shape: 'rect' }; });
  return { svg: out, tips: tips, table: table, legend: legend };
}

/* ------------------------------------------------------------------ lines (crosshair finds the x) */
function drawLine(spec, W){
  var series = (spec.series || []).filter(Boolean), H = spec.height || 190;
  var n = Math.max.apply(null, series.map(function(s){ return s.values.length; }).concat([0]));
  var all = [].concat.apply([], series.map(function(s){ return s.values.filter(isNum); }));
  if(spec.band){ all.push(spec.band.lo, spec.band.hi); }
  (spec.refs || []).forEach(function(r){ if(isNum(r.y)) all.push(r.y); });
  var endR = spec.endLabels && series.length <= 3 ? Math.min(130, Math.max.apply(null, series.map(function(s){ return textW(s.label, 10.5, 500); }).concat([20])) + 16) : 12;
  var f = frame(spec, W, H, all.length ? all : [0], { t: 14, r: endR });
  var times = spec.times;   // optional uneven x (ms)
  var xs = [];
  for(var i = 0; i < n; i++){
    if(times && times.length === n){ var t0 = times[0], t1 = times[n - 1]; xs.push(f.m.l + (t1 > t0 ? (times[i] - t0) / (t1 - t0) : 0.5) * f.pw); }
    else xs.push(f.m.l + (n > 1 ? i / (n - 1) : 0.5) * f.pw);
  }
  var out = svgOpen(W, H, spec.label) + f.grid;
  if(spec.band && isNum(spec.band.lo) && isNum(spec.band.hi)){
    var yb1 = f.y(spec.band.hi), yb2 = f.y(spec.band.lo);
    out += '<rect x="' + f.m.l + '" y="' + r1(yb1) + '" width="' + r1(f.pw) + '" height="' + r1(Math.max(0, yb2 - yb1)) + '" fill="' + P.ink + '" opacity="0.05"/>' + tx(f.m.l + 6, yb1 + 12, spec.band.label || '', { fill: P.muted });
  }
  (spec.refs || []).forEach(function(r){ if(!isNum(r.y)) return; var ry = f.y(r.y); out += '<line x1="' + f.m.l + '" x2="' + (W - f.m.r) + '" y1="' + r1(ry) + '" y2="' + r1(ry) + '" stroke="' + P.ink2 + '" stroke-opacity="0.5" stroke-width="1"/>' + tx(f.m.l + 6, ry - 4, r.label || '', { fill: P.ink2 }); });
  var ends = [];
  series.forEach(function(s, k){
    var c = s.color || P.cat[k % 8], d = '', area = '', started = false, lastI = -1, firstI = -1;
    s.values.forEach(function(v, j){
      if(!isNum(v)){ started = false; return; }
      var X = r1(xs[j]), Y = r1(f.y(v));
      d += (started ? 'L' : 'M') + X + ',' + Y; started = true; lastI = j; if(firstI < 0) firstI = j;
    });
    if(spec.area && series.length === 1 && firstI >= 0){
      var base0 = r1(f.y(Math.max(f.lo, 0))), runs = [], cur = [];
      s.values.forEach(function(v, j){ if(isNum(v)) cur.push(j); else if(cur.length){ runs.push(cur); cur = []; } });
      if(cur.length) runs.push(cur);
      runs.forEach(function(run){
        if(run.length < 2) return;
        area += '<path d="M' + r1(xs[run[0]]) + ',' + base0 + 'L' + run.map(function(j){ return r1(xs[j]) + ',' + r1(f.y(s.values[j])); }).join('L') + 'L' + r1(xs[run[run.length - 1]]) + ',' + base0 + 'Z" fill="' + c + '" opacity="0.1"/>';
      });
    }
    out += area + '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    if(spec.markers === 'all') s.values.forEach(function(v, j){ if(isNum(v)) out += dot(xs[j], f.y(v), 4, s.pointColors && s.pointColors[j] || c); });
    else if(lastI >= 0) out += dot(xs[lastI], f.y(s.values[lastI]), 4, c);
    if(lastI >= 0) ends.push({ y: f.y(s.values[lastI]), x: xs[lastI], label: s.label, c: c, v: s.values[lastI] });
  });
  // direct end labels for up to three series that don't collide
  if(spec.endLabels && ends.length <= 3){
    var sorted = ends.slice().sort(function(a, b){ return a.y - b.y; }), ok = true;
    for(var q = 1; q < sorted.length; q++) if(sorted[q].y - sorted[q - 1].y < 13) ok = false;
    if(ok) ends.forEach(function(e){ out += tx(e.x + 8, e.y + 4, fit(e.label, f.m.r - 10, 10.5, 500), { fill: P.ink2 }); });
  }
  var tips = [];
  for(var j = 0; j < n; j++){
    var rows = series.map(function(s, k){ return { c: s.color || P.cat[k % 8], l: s.label, v: isNum(s.values[j]) ? (spec.tipFmt || f.fmt)(s.values[j]) : '–' }; });
    var ys = series.map(function(s){ return isNum(s.values[j]) ? f.y(s.values[j]) : null; }).filter(function(v){ return v != null; });
    tips.push(tip(xs[j], ys.length ? Math.min.apply(null, ys) : f.m.t + f.ph / 2, spec.tipTitles ? spec.tipTitles[j] : (spec.labels ? spec.labels[j] : ''), rows, spec.tipNotes ? spec.tipNotes[j] : ''));
  }
  out += '<line class="mcc-cross" x1="0" x2="0" y1="' + f.m.t + '" y2="' + (f.m.t + f.ph) + '" stroke="' + P.ink2 + '" stroke-opacity="0.55" stroke-width="1" visibility="hidden"/>';
  out += '<rect class="mcc-crosshit" x="' + f.m.l + '" y="' + f.m.t + '" width="' + r1(f.pw) + '" height="' + r1(f.ph) + '" fill="transparent"/>';
  out += xLabels(spec.xLabels || spec.labels || [], xs, f, H) + '</svg>';
  var table = { cols: [spec.xTitle || ''].concat(series.map(function(s){ return s.label; })),
    rows: Array.apply(null, Array(n)).map(function(_, j){ return [spec.tipTitles ? spec.tipTitles[j] : (spec.labels ? spec.labels[j] : String(j + 1))].concat(series.map(function(s){ return isNum(s.values[j]) ? (spec.tipFmt || f.fmt)(s.values[j]) : '–'; })); }) };
  return { svg: out, tips: tips, table: table, cross: { xs: xs }, legend: series.length > 1 ? series.map(function(s, k){ return { c: s.color || P.cat[k % 8], l: s.label, shape: 'line' }; }) : null };
}

/* ------------------------------------------------------------------ calendar heatmap (weeks across, Mon-Sun down) */
function dayKey(ms){ var d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function drawCalendar(spec, W){
  var days = spec.days || {}, to = new Date(spec.to || Date.now()); to.setHours(0, 0, 0, 0);
  var from = new Date(spec.from || (to.getTime() - 180 * 864e5)); from.setHours(0, 0, 0, 0);
  // start on the Monday on or before `from`
  var start = new Date(from); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  var weeks = Math.ceil(((to - start) / 864e5 + 1) / 7), leftW = 30, gap = 2, room = W - leftW - 4;
  var cs = Math.floor(room / Math.max(1, weeks)) - gap;
  if(cs < 6){ gap = 1; cs = Math.floor(room / Math.max(1, weeks)) - gap; }   // a long range on a phone: tighter cells before anything is left out
  cs = clamp(cs, 4, 15);
  var fitWeeks = Math.floor(room / (cs + gap)), cut = 0;
  if(fitWeeks < weeks){ cut = weeks - fitWeeks; start.setDate(start.getDate() + cut * 7); weeks = fitWeeks; }
  var H = 18 + 7 * (cs + gap) + 4 + (cut ? 18 : 0), lastLabelX = -99;
  var counts = Object.keys(days).map(function(k){ return days[k] && days[k].n || 0; }).filter(function(v){ return v > 0; }).sort(function(a, b){ return a - b; });
  // four levels, by the person's own spread (quartiles of the days with something), so a light week still shows
  function q(p){ return counts.length ? counts[Math.min(counts.length - 1, Math.floor(p * counts.length))] : 1; }
  var cuts = [q(0.25), q(0.5), q(0.75)];
  function level(n){ return n <= 0 ? -1 : n <= cuts[0] ? 1 : n <= cuts[1] ? 2 : n <= cuts[2] ? 3 : 4; }
  var out = svgOpen(W, H, spec.label), tips = [], idx = 0, lastMonth = -1;
  ['Mon', '', 'Wed', '', 'Fri', '', ''].forEach(function(l, r){ if(l) out += tx(0, 18 + r * (cs + gap) + cs - 1, l, { size: 9.5, mono: true }); });
  var tableRows = [];
  for(var w = 0; w < weeks; w++){
    for(var r = 0; r < 7; r++){
      var d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
      if(d > to || d < from) continue;
      var key = dayKey(d.getTime()), rec = days[key] || { n: 0 }, lv = level(rec.n);
      var x = leftW + w * (cs + gap), y = 18 + r * (cs + gap);
      if(r === 0 || d.getDate() === 1){ var mo = d.getMonth(); if(mo !== lastMonth && d.getDate() <= 7){ if(x - lastLabelX >= 24){ out += tx(x, 10, MON[mo], { size: 9.5, mono: true }); lastLabelX = x; } lastMonth = mo; } }
      out += '<rect class="mcc-hit mcc-cell" data-t="' + idx + '" x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" rx="2" fill="' + (lv < 0 ? P.grid : P.seq[lv]) + '"/>';
      var parts = rec.parts || {}, trows = Object.keys(parts).filter(function(k){ return parts[k] > 0; }).map(function(k){ return { c: null, l: k, v: fmtN(parts[k]) }; });
      tips.push(tip(x + cs / 2, y, fmtFull(d.getTime()), [{ c: lv < 0 ? P.grid : P.seq[lv], l: spec.unit || 'actions', v: fmtN(rec.n) }].concat(trows)));
      idx++;
    }
  }
  // the table lists every day of the range with something in it, drawn or not
  for(var td = new Date(from); td <= to; td.setDate(td.getDate() + 1)){
    var rk = days[dayKey(td.getTime())];
    if(rk && rk.n > 0){ var pr = rk.parts || {}; tableRows.push([fmtFull(td.getTime()), fmtN(rk.n)].concat(Object.keys(pr).filter(function(k){ return pr[k] > 0; }).map(function(k){ return k + ': ' + pr[k]; }).join(', '))); }
  }
  if(cut) out += tx(0, H - 5, fit('Latest ' + weeks + ' weeks shown - the table has every day', W - 4, 10.5, 400), { size: 10.5, fill: P.muted });
  out += '</svg>';
  var legend = [{ c: P.grid, l: 'None', shape: 'rect' }, { c: P.seq[1], l: '1' + (cuts[0] > 1 ? '–' + cuts[0] : ''), shape: 'rect' }, { c: P.seq[2], l: '…' + cuts[1], shape: 'rect' }, { c: P.seq[3], l: '…' + cuts[2], shape: 'rect' }, { c: P.seq[4], l: 'more', shape: 'rect' }];
  return { svg: out, tips: tips, table: { cols: ['Day', spec.unit || 'Actions', 'What'], rows: tableRows.length ? tableRows : [['No activity in this range', '', '']] }, legend: counts.length ? legend : null, scale: true };
}

/* ------------------------------------------------------------------ timeline (dated items in lanes, with a today marker) */
function drawTimeline(spec, W){
  var lanes = spec.lanes || [], items = (spec.items || []).filter(function(it){ return isNum(it.at); });
  var from = spec.from, to = spec.to, laneH = 30, leftW = Math.min(W * 0.34, Math.max.apply(null, lanes.map(function(l){ return textW(l.label, 11.5, 500); }).concat([40])) + 22);
  var top = 18, H = top + lanes.length * laneH + 24, x0 = leftW, x1 = W - 12;
  function X(t){ return x0 + clamp((t - from) / ((to - from) || 1), 0, 1) * (x1 - x0); }
  var out = svgOpen(W, H, spec.label), tips = [];
  // week ticks
  var tk = new Date(from); tk.setHours(0, 0, 0, 0); tk.setDate(tk.getDate() + ((8 - tk.getDay()) % 7));
  var stepDays = (to - from) / 864e5 > 70 ? 14 : 7, labelsAt = [];
  for(var t = tk.getTime(); t <= to; t += stepDays * 864e5){ out += vline(X(t), top - 4, H - 22, P.grid); labelsAt.push(t); }
  labelsAt.forEach(function(t){ out += tx(X(t), H - 8, fmtDay(t), { anchor: 'middle', mono: true }); });
  lanes.forEach(function(l, i){ var y = top + i * laneH + laneH / 2; out += hline(x0, x1, y, P.grid) + tx(x0 - 10, y + 4, fit(l.label, leftW - 12, 11.5, 500), { anchor: 'end', fill: P.ink2, size: 11.5, weight: 500 }); });
  if(isNum(spec.now) && spec.now >= from && spec.now <= to){ var nx = X(spec.now); out += vline(nx, top - 8, H - 22, P.ink, 1.5) + tx(nx + 4, top - 8, 'Today', { fill: P.ink, size: 10.5, weight: 600 }); }
  // items: a lane's items at nearly the same spot step up and down so each stays visible
  var placed = {};
  items.sort(function(a, b){ return a.at - b.at; }).forEach(function(it, k){
    var li = Math.max(0, lanes.findIndex(function(l){ return l.key === it.lane; })), x = X(it.at), slot = Math.round(x / 9) + ':' + li;
    var nth = placed[slot] = (placed[slot] || 0) + 1, dy = nth === 1 ? 0 : (nth % 2 ? 1 : -1) * Math.ceil((nth - 1) / 2) * 6;
    var y = top + li * laneH + laneH / 2 + dy, c = (lanes[li] && lanes[li].color) || P.cat[li % 8];
    out += dot(x, y, 5, c) + '<circle class="mcc-hit" data-t="' + k + '" cx="' + r1(x) + '" cy="' + r1(y) + '" r="12" fill="transparent"/>';
    tips.push(tip(x, y, it.label, [{ c: c, l: (lanes[li] && lanes[li].label) || '', v: fmtFull(it.at) }].concat(it.sub ? [{ c: null, l: it.sub, v: '' }] : [])));
  });
  out += '</svg>';
  return { svg: out, tips: tips, table: { cols: ['When', 'What', 'Kind'], rows: items.map(function(it){ var l = lanes.find(function(x){ return x.key === it.lane; }); return [fmtFull(it.at), it.label + (it.sub ? ' - ' + it.sub : ''), l ? l.label : '']; }) },
    legend: lanes.length > 1 ? lanes.map(function(l, i){ return { c: l.color || P.cat[i % 8], l: l.label, shape: 'dot' }; }) : null };
}

/* ------------------------------------------------------------------ dumbbell (before -> after per row) */
function drawDumbbell(spec, W){
  var rows = spec.rows || [], rowH = 30, fmt = spec.fmt || function(v){ return r1(v).toString(); };
  var labW = Math.min(W * 0.36, Math.max.apply(null, rows.map(function(r){ return textW(r.label, 11.5, 500); }).concat([40])) + 22);
  var H = 8 + rows.length * rowH + 22, x0 = labW, x1 = W - 40, lo = spec.min, hi = spec.max;
  function X(v){ return x0 + clamp((v - lo) / ((hi - lo) || 1), 0, 1) * (x1 - x0); }
  var out = svgOpen(W, H, spec.label), tips = [];
  ticks(lo, hi, 4).forEach(function(t){ if(t < lo || t > hi) return; out += vline(X(t), 4, H - 20, P.grid) + tx(X(t), H - 6, fmt(t), { anchor: 'middle', mono: true }); });
  rows.forEach(function(r, i){
    var y = 8 + i * rowH + rowH / 2, ca = P.other, cb = spec.color || P.cat[0];
    out += tx(x0 - 10, y + 4, fit(r.label, labW - 12, 11.5, 500), { anchor: 'end', fill: P.ink2, size: 11.5, weight: 500 });
    if(isNum(r.a) && isNum(r.b)) out += '<line x1="' + r1(X(r.a)) + '" x2="' + r1(X(r.b)) + '" y1="' + y + '" y2="' + y + '" stroke="' + P.ink2 + '" stroke-opacity="0.45" stroke-width="2"/>';
    if(isNum(r.a)) out += '<circle cx="' + r1(X(r.a)) + '" cy="' + y + '" r="4.5" fill="' + P.surface + '" stroke="' + ca + '" stroke-width="2"/>';
    if(isNum(r.b)) out += dot(X(r.b), y, 5, cb) + tx(X(Math.max(r.b, isNum(r.a) ? r.a : r.b)) + 10, y + 4, fmt(r.b), { fill: P.ink, size: 11, weight: 600 });
    tips.push(tip(isNum(r.b) ? X(r.b) : x0, y, r.label, [{ c: ca, l: spec.aLabel || 'Before', v: isNum(r.a) ? fmt(r.a) : '–' }, { c: cb, l: spec.bLabel || 'After', v: isNum(r.b) ? fmt(r.b) : '–' }]));
    out += '<rect class="mcc-hit" data-t="' + i + '" x="0" y="' + (y - rowH / 2) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
  });
  out += '</svg>';
  return { svg: out, tips: tips, table: { cols: ['', spec.aLabel || 'Before', spec.bLabel || 'After'], rows: rows.map(function(r){ return [r.label, isNum(r.a) ? fmt(r.a) : '–', isNum(r.b) ? fmt(r.b) : '–']; }) },
    legend: [{ c: P.other, l: spec.aLabel || 'Before', shape: 'ring' }, { c: spec.color || P.cat[0], l: spec.bLabel || 'After', shape: 'dot' }] };
}

/* ------------------------------------------------------------------ meters (value against its own maximum) */
function drawMeters(spec, W){
  var rows = spec.rows || [], rowH = 32;
  var labW = Math.min(W * 0.4, Math.max.apply(null, rows.map(function(r){ return textW(r.label, 11.5, 500); }).concat([40])) + 22);
  var vt = rows.map(function(r){ return r.text != null ? r.text : (fmtN(r.value) + ' / ' + fmtN(r.max)); });
  var valW = Math.max.apply(null, vt.map(function(t){ return textW(t, 11, 600); }).concat([20])) + 12;
  var H = 6 + rows.length * rowH, x0 = labW, x1 = W - valW;
  var out = svgOpen(W, H, spec.label), tips = [];
  rows.forEach(function(r, i){
    var y = 6 + i * rowH + rowH / 2 - 5, w = x1 - x0, frac = r.max > 0 ? clamp(r.value / r.max, 0, 1) : 0, c = r.color || P.ord[2];
    out += tx(x0 - 10, y + 9, fit(r.label, labW - 12, 11.5, 500), { anchor: 'end', fill: P.ink2, size: 11.5, weight: 500 });
    out += '<rect x="' + x0 + '" y="' + y + '" width="' + r1(w) + '" height="10" rx="5" fill="' + P.ord[0] + '" opacity="0.35"/>';
    if(frac > 0) out += '<rect x="' + x0 + '" y="' + y + '" width="' + r1(Math.max(10, w * frac)) + '" height="10" rx="5" fill="' + c + '"/>';
    out += tx(x1 + 8, y + 9, vt[i], { fill: P.ink, size: 11, weight: 600 });
    tips.push(tip(x0 + w * frac, y, r.label, [{ c: c, l: r.unit || 'Score', v: vt[i] }].concat(r.note ? [{ c: null, l: r.note, v: '' }] : [])));
    out += '<rect class="mcc-hit" data-t="' + i + '" x="0" y="' + (6 + i * rowH) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
  });
  out += '</svg>';
  return { svg: out, tips: tips, table: { cols: ['', 'Value'], rows: rows.map(function(r, i){ return [r.label, vt[i]]; }) } };
}

/* ------------------------------------------------------------------ funnel (each stage against the first, with the step's conversion) */
function drawFunnel(spec, W){
  var st = spec.stages || [], rowH = 40, fmt = spec.fmt || fmtN;
  var labW = Math.min(W * 0.34, Math.max.apply(null, st.map(function(s){ return textW(s.label, 11.5, 600); }).concat([40])) + 22);
  var H = 6 + st.length * rowH, x0 = labW, x1 = W - 70, max = Math.max.apply(null, st.map(function(s){ return s.value || 0; }).concat([1]));
  var ramp = st.length <= 4 ? P.ord.slice(1, 1 + st.length) : P.ord.slice(0, st.length);
  var out = svgOpen(W, H, spec.label), tips = [];
  st.forEach(function(s, i){
    var y = 6 + i * rowH, w = (x1 - x0) * (s.value || 0) / max, c = ramp[Math.min(i, ramp.length - 1)];
    out += tx(x0 - 10, y + 15, fit(s.label, labW - 12, 11.5, 600), { anchor: 'end', fill: P.ink, size: 11.5, weight: 600 });
    if(s.value > 0) out += '<path d="' + barPath(x0 + 1, y + 4, Math.max(3, w), 16, 4) + '" fill="' + c + '"/>';
    out += tx(x0 + Math.max(3, w) + 8, y + 16, fmt(s.value || 0), { fill: P.ink, size: 11.5, weight: 600 });
    var conv = i > 0 && st[i - 1].value > 0 ? Math.round(s.value / st[i - 1].value * 100) : null;
    var line = s.note || (conv != null ? conv + '% of the stage before' : '');
    if(line) out += tx(x0 + 2, y + 34, line, { fill: P.muted, size: 10.5 });
    tips.push(tip(x0 + w, y + 10, s.label, [{ c: c, l: spec.unit || 'Count', v: fmt(s.value || 0) }].concat(conv != null ? [{ c: null, l: 'Of the stage before', v: conv + '%' }] : [])));
    out += '<rect class="mcc-hit" data-t="' + i + '" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
  });
  out += '</svg>';
  return { svg: out, tips: tips, table: { cols: ['Stage', spec.unit || 'Count', 'Of the stage before'], rows: st.map(function(s, i){ return [s.label, fmt(s.value || 0), i > 0 && st[i - 1].value > 0 ? Math.round(s.value / st[i - 1].value * 100) + '%' : '']; }) } };
}

/* ------------------------------------------------------------------ one 100% bar (part-to-whole), legend carries the counts */
function drawStack(spec, W){
  var segs = (spec.segs || []).filter(function(s){ return s.value > 0; }), total = segs.reduce(function(s, g){ return s + g.value; }, 0), fmt = spec.fmt || fmtN;
  var H = 30, out = svgOpen(W, H, spec.label), tips = [], acc = 0, x0 = 1, w = W - 2;
  segs.forEach(function(g, k){
    var xa = x0 + w * acc / (total || 1) + (k ? 1 : 0), xb = x0 + w * (acc + g.value) / (total || 1) - (k < segs.length - 1 ? 1 : 0), c = g.color || P.cat[k % 8];
    var path;
    if(segs.length === 1) path = 'M' + (xa + 4) + ',6H' + (xb - 4) + 'Q' + xb + ',6 ' + xb + ',10V20Q' + xb + ',24 ' + (xb - 4) + ',24H' + (xa + 4) + 'Q' + xa + ',24 ' + xa + ',20V10Q' + xa + ',6 ' + (xa + 4) + ',6Z';
    else if(k === 0) path = 'M' + (xa + 4) + ',6H' + xb + 'V24H' + (xa + 4) + 'Q' + xa + ',24 ' + xa + ',20V10Q' + xa + ',6 ' + (xa + 4) + ',6Z';
    else if(k === segs.length - 1) path = barPath(xa, 6, Math.max(1, xb - xa), 18, 4);
    else path = 'M' + xa + ',6H' + xb + 'V24H' + xa + 'Z';
    out += '<path d="' + path + '" fill="' + c + '"/><rect class="mcc-hit" data-t="' + k + '" x="' + r1(xa) + '" y="0" width="' + r1(Math.max(4, xb - xa)) + '" height="' + H + '" fill="transparent"/>';
    var pct = total ? Math.round(g.value / total * 100) : 0;
    tips.push(tip((xa + xb) / 2, 6, g.label, [{ c: c, l: spec.unit || 'Count', v: fmt(g.value) }, { c: null, l: 'Share', v: pct + '%' }]));
    acc += g.value;
  });
  if(!segs.length) out += '<rect x="1" y="6" width="' + (W - 2) + '" height="18" rx="4" fill="' + P.grid + '"/>';
  out += '</svg>';
  // the legend carries the counts; empty parts are left out of it (they're still in the table)
  var legend = (spec.segs || []).map(function(g, k){ return { c: g.color || P.cat[k % 8], l: g.label + ' ' + fmt(g.value || 0) + (total ? ' (' + Math.round((g.value || 0) / total * 100) + '%)' : ''), shape: 'rect', v: g.value || 0 }; })
    .filter(function(it){ return it.v > 0 || !total; });
  return { svg: out, tips: tips, legend: legend, table: { cols: ['', spec.unit || 'Count', 'Share'], rows: (spec.segs || []).map(function(g){ return [g.label, fmt(g.value || 0), total ? Math.round((g.value || 0) / total * 100) + '%' : '0%']; }) } };
}

/* ------------------------------------------------------------------ ranges (min-max line, middle-half bar, median tick) */
function drawRange(spec, W){
  var rows = spec.rows || [], rowH = 34, fmt = spec.fmt || fmtMoney;
  var labW = Math.min(W * 0.32, Math.max.apply(null, rows.map(function(r){ return textW(r.label, 11.5, 500); }).concat([40])) + 22);
  var vals = [].concat.apply([], rows.map(function(r){ return [r.min, r.max, r.p25, r.p75].filter(isNum); }));
  (spec.marks || []).forEach(function(m){ if(isNum(m.value)) vals.push(m.value); });
  var lo = Math.min.apply(null, vals.concat([Infinity])), hi = Math.max.apply(null, vals.concat([-Infinity]));
  if(!isFinite(lo)){ lo = 0; hi = 1; }
  var tk = ticks(lo, hi, 4); lo = tk[0]; hi = tk[tk.length - 1];
  var marks = (spec.marks || []).filter(function(m){ return isNum(m.value); }).sort(function(a, b){ return a.value - b.value; });
  var top = marks.length > 1 ? 30 : 18, H = top + rows.length * rowH + 20, x0 = labW, x1 = W - 14;
  function X(v){ return x0 + clamp((v - lo) / ((hi - lo) || 1), 0, 1) * (x1 - x0); }
  var out = svgOpen(W, H, spec.label), tips = [];
  tk.forEach(function(t){ out += vline(X(t), top - 4, H - 18, P.grid) + tx(X(t), H - 5, fmt(t), { anchor: 'middle', mono: true }); });
  rows.forEach(function(r, i){
    var y = top + i * rowH + rowH / 2, c = r.color || P.cat[0];
    out += tx(x0 - 10, y + 4, fit(r.label, labW - 12, 11.5, 500), { anchor: 'end', fill: P.ink2, size: 11.5, weight: 500 });
    if(isNum(r.min) && isNum(r.max)) out += '<line x1="' + r1(X(r.min)) + '" x2="' + r1(X(r.max)) + '" y1="' + y + '" y2="' + y + '" stroke="' + P.other + '" stroke-width="1.5"/>';
    if(isNum(r.p25) && isNum(r.p75)) out += '<rect x="' + r1(X(r.p25)) + '" y="' + (y - 7) + '" width="' + r1(Math.max(3, X(r.p75) - X(r.p25))) + '" height="14" rx="4" fill="' + c + '"/>';
    if(isNum(r.median)) out += vline(X(r.median), y - 9, y + 9, P.ink, 2);
    tips.push(tip(isNum(r.median) ? X(r.median) : x0, y, r.label, [
      { c: c, l: 'Middle half', v: isNum(r.p25) ? fmt(r.p25) + ' – ' + fmt(r.p75) : '–' },
      { c: null, l: 'Median', v: isNum(r.median) ? fmt(r.median) : '–' },
      { c: null, l: 'Lowest – highest', v: isNum(r.min) ? fmt(r.min) + ' – ' + fmt(r.max) : '–' },
      { c: null, l: 'Jobs with pay listed', v: fmtN(r.n || 0) }]));
    out += '<rect class="mcc-hit" data-t="' + i + '" x="0" y="' + (y - rowH / 2) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
  });
  var lastRight = -Infinity, lineUp = false;
  marks.forEach(function(m){
    var mx = X(m.value), lw = textW(m.label || '', 10.5, 500), anchor = mx > W - 70 ? 'end' : (mx < x0 + 40 ? 'start' : 'middle');
    var left = anchor === 'end' ? mx - lw : anchor === 'start' ? mx : mx - lw / 2;
    lineUp = left < lastRight + 6 ? !lineUp : false;
    var ly = lineUp ? top - 20 : top - 8;
    out += vline(mx, ly + 2, H - 18, P.ink2, 1.5) + tx(mx, ly, m.label || '', { anchor: anchor, fill: P.ink2, size: 10.5 });
    lastRight = Math.max(lastRight, left + lw);
  });
  out += '</svg>';
  return { svg: out, tips: tips, table: { cols: ['', 'Lowest', 'Lower quarter', 'Median', 'Upper quarter', 'Highest', 'Jobs'], rows: rows.map(function(r){ return [r.label, fmt(r.min), fmt(r.p25), fmt(r.median), fmt(r.p75), fmt(r.max), fmtN(r.n || 0)]; }) } };
}

/* ------------------------------------------------------------------ sparkline (stat tiles): de-emphasis line, the current point in the accent */
function drawSpark(spec, W){
  var v = (spec.values || []).map(function(x){ return isNum(x) ? x : 0; }), H = spec.height || 30, n = v.length;
  if(!n) return { svg: '', tips: [] };
  var mx = Math.max.apply(null, v.concat([1])), mn = Math.min(0, Math.min.apply(null, v));
  function X(i){ return 3 + (n > 1 ? i / (n - 1) : 0.5) * (W - 8); }
  function Y(x){ return 4 + (H - 8) * (1 - (x - mn) / ((mx - mn) || 1)); }
  var d = v.map(function(x, i){ return (i ? 'L' : 'M') + r1(X(i)) + ',' + r1(Y(x)); }).join('');
  var out = svgOpen(W, H, spec.label) + '<path d="' + d + '" fill="none" stroke="' + P.other + '" stroke-width="1.5" stroke-linejoin="round"/>' + dot(X(n - 1), Y(v[n - 1]), 3.5, spec.color || P.cat[0]);
  var tips = v.map(function(x, i){ return tip(X(i), Y(x), spec.titles ? spec.titles[i] : '', [{ c: i === n - 1 ? (spec.color || P.cat[0]) : P.other, l: spec.unit || '', v: (spec.fmt || fmtN)(x) }]); });
  out += '<line class="mcc-cross" x1="0" x2="0" y1="2" y2="' + (H - 2) + '" stroke="' + P.ink2 + '" stroke-opacity="0.5" stroke-width="1" visibility="hidden"/>';
  out += '<rect class="mcc-crosshit" x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent"/></svg>';
  return { svg: out, tips: tips, cross: { xs: v.map(function(_, i){ return X(i); }) }, table: null };
}

var DRAW = { columns: drawColumns, hist: drawHist, bars: drawBars, line: drawLine, calendar: drawCalendar, timeline: drawTimeline,
  dumbbell: drawDumbbell, meters: drawMeters, funnel: drawFunnel, stack: drawStack, range: drawRange, spark: drawSpark };

/* ------------------------------------------------------------------ tooltip (one for the page; text set with textContent) */
var tipEl = null;
function ensureTip(){
  if(tipEl || !root.document) return tipEl;
  tipEl = root.document.createElement('div');
  tipEl.className = 'mcc-tip'; tipEl.setAttribute('role', 'status'); tipEl.setAttribute('aria-live', 'polite');
  root.document.body.appendChild(tipEl);
  return tipEl;
}
function showTip(t, cx, cy){
  var el = ensureTip(); if(!el || !t) return;
  while(el.firstChild) el.removeChild(el.firstChild);
  var doc = root.document;
  if(t.title){ var h = doc.createElement('div'); h.className = 'mcc-tip-t'; h.textContent = t.title; el.appendChild(h); }
  (t.rows || []).forEach(function(r){
    var row = doc.createElement('div'); row.className = 'mcc-tip-r';
    var k = doc.createElement('span'); k.className = 'mcc-tip-k'; if(r.c){ k.style.background = r.c; } else { k.style.visibility = 'hidden'; }
    var v = doc.createElement('b'); v.textContent = r.v == null ? '' : String(r.v);
    var l = doc.createElement('span'); l.className = 'mcc-tip-l'; l.textContent = r.l == null ? '' : String(r.l);
    row.appendChild(k); if(r.v !== '') row.appendChild(v); row.appendChild(l); el.appendChild(row);
  });
  if(t.note){ var n = doc.createElement('div'); n.className = 'mcc-tip-n'; n.textContent = t.note; el.appendChild(n); }
  el.style.display = 'block';
  var vw = root.innerWidth || 1000, vh = root.innerHeight || 800, bw = el.offsetWidth, bh = el.offsetHeight;
  var x = cx + 14, y = cy - bh - 10;
  if(x + bw > vw - 8) x = cx - bw - 14;
  if(x < 8) x = 8;
  if(y < 8) y = cy + 16;
  if(y + bh > vh - 8) y = vh - bh - 8;
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
}
function hideTip(){ if(tipEl) tipEl.style.display = 'none'; }

/* ------------------------------------------------------------------ mounting: draw at the real width, wire hover + keys, keep the table twin */
var mounted = [];
function mount(el, spec){
  if(!el || !spec || !DRAW[spec.type]) return null;
  var w = Math.max(spec.type === 'spark' ? 60 : 220, Math.floor(el.clientWidth || (el.parentNode && el.parentNode.clientWidth) || 600));
  var res;
  try{ res = DRAW[spec.type](spec, w); }catch(e){ if(root.console) console.error('chart failed', spec.type, e); el.innerHTML = '<div class="mcc-err">This chart couldn’t be drawn.</div>'; return null; }
  if(spec.legend) res.legend = spec.legend;
  el.innerHTML = res.svg;
  el._mcc = { spec: spec, res: res, w: w, i: -1 };
  if(!el._mccBound){ bind(el); el._mccBound = true; }
  if(spec.type !== 'spark'){
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', (spec.label || 'Chart') + '. Use the arrow keys to read the values, or open the table.');
  }
  var card = el.closest ? el.closest('.mcc-card') : null;
  if(card){
    var lg = card.querySelector('.mcc-legend');
    if(lg) lg.innerHTML = res.legend ? legendHTML(res.legend, res.scale) : '';
    var tb = card.querySelector('.mcc-table');
    if(tb) tb.innerHTML = res.table ? tableHTML(res.table, spec.label) : '';
  }
  if(mounted.indexOf(el) < 0) mounted.push(el);
  observe(el);
  return res;
}
function legendHTML(items, scale){
  return (scale ? '<span class="mcc-lg-cap">Fewer</span>' : '') + items.map(function(it){
    var sw = it.shape === 'line' ? '<i class="mcc-sw mcc-sw-line" style="background:' + it.c + '"></i>' :
      it.shape === 'dot' ? '<i class="mcc-sw mcc-sw-dot" style="background:' + it.c + '"></i>' :
      it.shape === 'ring' ? '<i class="mcc-sw mcc-sw-ring" style="border-color:' + it.c + '"></i>' :
      '<i class="mcc-sw" style="background:' + it.c + '"></i>';
    return '<span class="mcc-lg">' + sw + (scale ? '' : '<span>' + esc(it.l) + '</span>') + '</span>';
  }).join('') + (scale ? '<span class="mcc-lg-cap">More</span>' : '');
}
function tableHTML(t, caption){
  return '<table class="mcc-tbl"><caption>' + esc(caption || 'The numbers behind this chart') + '</caption><thead><tr>' + t.cols.map(function(c){ return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    t.rows.map(function(r){ return '<tr>' + r.map(function(c, i){ return i === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td data-label="' + esc(t.cols[i] || '') + '">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
}
function svgPoint(el, ev){
  var svg = el.querySelector('svg'); if(!svg) return null;
  var b = svg.getBoundingClientRect();
  return { x: ev.clientX - b.left, y: ev.clientY - b.top, b: b };
}
function setCross(el, x){ var c = el.querySelector('.mcc-cross'); if(c){ c.setAttribute('x1', x); c.setAttribute('x2', x); c.setAttribute('visibility', 'visible'); } }
function clearCross(el){ var c = el.querySelector('.mcc-cross'); if(c) c.setAttribute('visibility', 'hidden'); }
function mark(el, i){
  var prev = el.querySelector('.mcc-hit.on'); if(prev) prev.classList.remove('on');
  var h = el.querySelector('.mcc-hit[data-t="' + i + '"]'); if(h) h.classList.add('on');
}
function showAt(el, i, ev){
  var st = el._mcc; if(!st || !st.res.tips || !st.res.tips[i]) return;
  st.i = i;
  var t = st.res.tips[i], svg = el.querySelector('svg'), b = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 };
  if(st.res.cross) setCross(el, st.res.cross.xs[i]);
  mark(el, i);
  showTip(t, ev ? ev.clientX : b.left + t.x, ev ? ev.clientY : b.top + t.y);
}
var tapWired = false;
function bind(el){
  if(!tapWired && root.document){
    tapWired = true;
    root.document.addEventListener('pointerdown', function(ev){ if(ev.pointerType !== 'mouse' && !(ev.target && ev.target.closest && ev.target.closest('.mcc-plot'))) hideTip(); }, true);
    root.addEventListener('scroll', function(){ if(tipEl && tipEl.style.display !== 'none') hideTip(); }, { passive: true });
  }
  el.addEventListener('pointerdown', function(ev){ if(ev.pointerType !== 'mouse') point(ev); });
  el.addEventListener('pointermove', point);
  function point(ev){
    var st = el._mcc; if(!st) return;
    if(st.res.cross){
      var p = svgPoint(el, ev); if(!p) return;
      var xs = st.res.cross.xs, best = 0, bd = Infinity;
      for(var i = 0; i < xs.length; i++){ var d = Math.abs(xs[i] - p.x); if(d < bd){ bd = d; best = i; } }
      showAt(el, best, ev); return;
    }
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-t]') : null;
    if(t && el.contains(t)) showAt(el, +t.getAttribute('data-t'), ev);
    else { hideTip(); mark(el, -1); }
  }
  el.addEventListener('pointerleave', function(ev){ if(ev.pointerType === 'touch') return; hideTip(); clearCross(el); mark(el, -1); });
  el.addEventListener('blur', function(){ hideTip(); clearCross(el); mark(el, -1); });
  el.addEventListener('keydown', function(ev){
    var st = el._mcc; if(!st || !st.res.tips || !st.res.tips.length) return;
    var n = st.res.tips.length, i = st.i;
    if(ev.key === 'ArrowRight' || ev.key === 'ArrowDown'){ i = i < 0 ? 0 : Math.min(n - 1, i + 1); }
    else if(ev.key === 'ArrowLeft' || ev.key === 'ArrowUp'){ i = i < 0 ? n - 1 : Math.max(0, i - 1); }
    else if(ev.key === 'Home'){ i = 0; } else if(ev.key === 'End'){ i = n - 1; }
    else if(ev.key === 'Escape'){ hideTip(); clearCross(el); mark(el, -1); st.i = -1; return; }
    else return;
    ev.preventDefault(); showAt(el, i, null);
  });
}
var ro = null, pending = [];
function observe(el){
  if(!root.ResizeObserver){ return; }
  if(!ro){
    ro = new root.ResizeObserver(function(entries){
      entries.forEach(function(en){
        var el = en.target, st = el._mcc; if(!st) return;
        var w = Math.floor(el.clientWidth);
        if(w > 0 && Math.abs(w - st.w) > 4 && pending.indexOf(el) < 0){
          pending.push(el);
          root.requestAnimationFrame(function(){ pending.splice(pending.indexOf(el), 1); if(el.isConnected) mount(el, el._mcc.spec); });
        }
      });
    });
  }
  try{ ro.observe(el); }catch(e){}
}
function forget(container){
  mounted = mounted.filter(function(el){ var gone = !el.isConnected || (container && container.contains(el)); if(gone && ro){ try{ ro.unobserve(el); }catch(e){} } return !gone; });
  hideTip();
}
// hand-built tables: give each cell its column's name, for the stacked phone layout
function labelTables(container){
  if(!container || !container.querySelectorAll) return;
  Array.prototype.forEach.call(container.querySelectorAll('table.mcc-tbl'), function(tb){
    var heads = Array.prototype.map.call(tb.querySelectorAll('thead th'), function(th){ return th.textContent || ''; });
    Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'), function(tr){
      Array.prototype.forEach.call(tr.children, function(cell, i){ if(cell.tagName === 'TD' && !cell.hasAttribute('data-label')) cell.setAttribute('data-label', heads[i] || ''); });
    });
  });
}
// the card's "Table" button swaps the chart for its table twin (and back)
function wireTables(container){
  if(!container || container._mccTables) return;
  container._mccTables = true;
  container.addEventListener('click', function(ev){
    var b = ev.target && ev.target.closest ? ev.target.closest('.mcc-tbtn') : null; if(!b) return;
    var card = b.closest('.mcc-card'); if(!card) return;
    var on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Chart' : 'Table';
    var plot = card.querySelector('.mcc-plot'), tb = card.querySelector('.mcc-table');
    if(plot) plot.hidden = on; if(tb) tb.hidden = !on;
    hideTip();
  });
}

var CSS = [
  '.mcc-card{background:var(--panel,#171933);border:1px solid var(--line-soft,#232548);border-radius:16px;padding:16px 18px 14px;min-width:0;display:flex;flex-direction:column}',
  '.mcc-head{display:flex;align-items:flex-start;gap:12px;justify-content:space-between;margin-bottom:10px}',
  '.mcc-title{font-family:"Space Grotesk",system-ui,sans-serif;font-weight:600;font-size:15px;line-height:1.3;color:#fff;margin:0}',
  '.mcc-sub{font-family:Manrope,system-ui,sans-serif;font-size:12.5px;line-height:1.45;color:var(--text-dim,#B4B6D6);margin:3px 0 0}',
  '.mcc-tbtn{flex:0 0 auto;font:600 11.5px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);background:transparent;border:1px solid var(--line,#303463);border-radius:8px;padding:4px 9px;cursor:pointer}',
  '.mcc-tbtn:hover{color:#fff;border-color:var(--text-faint,#8386BE)}',
  '.mcc-tbtn:focus-visible,.mcc-plot:focus-visible{outline:2px solid var(--gold,#F0B24E);outline-offset:3px;border-radius:6px}',
  '.mcc-plot{position:relative;min-height:30px;width:100%;outline:none}',
  '.mcc-svg{display:block;overflow:visible;font-variant-numeric:tabular-nums}',
  '.mcc-hit{cursor:default}',
  '.mcc-hit.on:not(.mcc-cell){fill:rgba(255,255,255,.06)}',
  '.mcc-cell.on{stroke:#fff;stroke-width:1.5}',
  '.mcc-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:2px 0 8px;font:500 12px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);align-items:center}',
  '.mcc-legend:empty{display:none}',
  '.mcc-lg{display:inline-flex;align-items:center;gap:6px}',
  '.mcc-lg-cap{font-size:11px;color:var(--text-faint,#8386BE)}',
  '.mcc-sw{display:inline-block;width:10px;height:10px;border-radius:3px}',
  '.mcc-sw-line{height:2px;width:14px;border-radius:2px}',
  '.mcc-sw-dot{border-radius:50%}',
  '.mcc-sw-ring{border-radius:50%;background:transparent;border:2px solid}',
  '.mcc-table{overflow-x:auto;max-height:340px;overflow-y:auto}',
  '.mcc-tbl{width:100%;border-collapse:collapse;font:500 12.5px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6)}',
  '.mcc-tbl caption{text-align:left;font-size:11.5px;color:var(--text-faint,#8386BE);padding:0 0 6px}',
  '.mcc-tbl th,.mcc-tbl td{padding:6px 10px 6px 0;border-bottom:1px solid var(--line-soft,#232548);text-align:left;white-space:nowrap}',
  '.mcc-tbl thead th{color:var(--text-faint,#8386BE);font-weight:600;font-size:11.5px}',
  '.mcc-tbl tbody th{color:#fff;font-weight:600}',
  '.mcc-tbl td{font-variant-numeric:tabular-nums}',
  '.mcc-foot{margin:10px 0 0;padding:8px 0 0;border-top:1px solid var(--line-soft,#232548);font:500 12px/1.5 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);text-align:left}',
  '.mcc-err{font:500 12.5px Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);padding:14px 0}',
  '.mcc-tip{position:fixed;z-index:9000;display:none;pointer-events:none;min-width:130px;max-width:280px;background:#0E1030;border:1px solid var(--line,#303463);border-radius:10px;padding:8px 10px;box-shadow:0 10px 30px rgba(0,0,0,.45);font:500 12px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6)}',
  '.mcc-tip-t{font-weight:700;color:#fff;margin-bottom:5px;font-size:12px}',
  '.mcc-tip-r{display:flex;align-items:center;gap:7px;line-height:1.55}',
  '.mcc-tip-k{flex:0 0 auto;width:12px;height:2px;border-radius:2px}',
  '.mcc-tip-r b{color:#fff;font-weight:700;font-variant-numeric:tabular-nums}',
  '.mcc-tip-n{margin-top:5px;font-size:11.5px;color:var(--text-faint,#8386BE);line-height:1.4}',
  // phones: each row becomes a small block, every value named by its column
  '@media (max-width:560px){.mcc-tbl thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '.mcc-tbl,.mcc-tbl caption,.mcc-tbl tbody,.mcc-tbl tr,.mcc-tbl th,.mcc-tbl td{display:block;width:auto}' +
    '.mcc-tbl tr{padding:8px 0;border-bottom:1px solid var(--line-soft,#232548)}.mcc-tbl th,.mcc-tbl td{border:0;padding:1px 0;white-space:normal}' +
    '.mcc-tbl td[data-label]:not([data-label=""])::before{content:attr(data-label) ": ";color:var(--text-faint,#8386BE);font-weight:500}}',
  '@media (forced-colors: active){.mcc-sw,.mcc-tip-k{forced-color-adjust:none}}'
].join('\n');
function injectCss(){
  if(!root.document || root.document.getElementById('mccCss')) return;
  var st = root.document.createElement('style'); st.id = 'mccCss'; st.textContent = CSS; root.document.head.appendChild(st);
}

root.MCC = {
  css: CSS, injectCss: injectCss,
  P: P, esc: esc, fmtN: fmtN, fmtPct: fmtPct, fmtMoney: fmtMoney, fmtDay: fmtDay, fmtMonth: fmtMonth, fmtDate: fmtDate, fmtFull: fmtFull, dayKey: dayKey,
  textW: textW, fit: fit, ticks: ticks, mount: mount, forget: forget, wireTables: wireTables, labelTables: labelTables, hideTip: hideTip, DRAW: DRAW,
  _draw: function(type, spec, w){ return DRAW[type](spec, w); }
};
})(typeof window !== 'undefined' ? window : globalThis);
