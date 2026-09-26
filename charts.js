/* ============ KAIDOSTAR SHARED CHART COMPONENTS ============ */
/* Pure SVG, no external library - built to match the existing
   design system (navy/gold/aurora/comet/violet). */

// Shared escaper: chart labels are currently fixed strings, but these
// are general-purpose rendering utilities - escaping keeps them safe
// if a future caller ever passes a user- or AI-derived label,
// consistent with the escaping applied everywhere else in the app.
function _chartEsc(str){ return String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function donutChart(segments, size, thickness){
  segments = segments || [];
  size = size || 150; thickness = thickness || 20;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const circles = segments.map(seg => {
    const frac = seg.value / total;
    const len = frac * c;
    const dash = `${len} ${c - len}`;
    const dashoffset = -offset;
    offset += len;
    return `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thickness}"
      stroke-dasharray="${dash}" stroke-dashoffset="${dashoffset}" stroke-linecap="butt"/>`;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line-soft)" stroke-width="${thickness}"/>
    ${circles}
  </svg>`;
}

function donutLegend(segments){
  segments = segments || [];
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return `<div class="chart-legend">${segments.map(seg => {
    const pct = Math.round((seg.value/total)*100);
    return `<div class="legend-row"><span class="legend-dot" style="background:${seg.color};"></span><span class="legend-label">${_chartEsc(seg.label)}</span><span class="legend-val">${seg.value} &middot; ${pct}%</span></div>`;
  }).join('')}</div>`;
}

function gaugeChart(pct, size, color){
  size = size || 140; color = color || 'var(--gold)';
  return donutChart([
    {value: pct, color: color},
    {value: 100 - pct, color: 'var(--line-soft)'},
  ], size, 16) ;
}

function barChart(data, opts){
  data = data || [];
  opts = opts || {};
  const w = opts.width || 280, h = opts.height || 130, pad = 26;
  const maxVal = Math.max(...data.map(d => Math.max(d.target || 0, d.actual || 0)), 1);
  const barW = (w - pad*2) / data.length;
  const barInnerW = barW * 0.34;
  const bars = data.map((d, i) => {
    const x = pad + i * barW + barW/2;
    const targetH = (d.target / maxVal) * (h - pad*1.6);
    const actualH = (d.actual / maxVal) * (h - pad*1.6);
    const baseline = h - pad*0.6;
    const hitTarget = d.actual >= d.target;
    return `
      <rect x="${x - barInnerW - 2}" y="${baseline - targetH}" width="${barInnerW}" height="${targetH}" rx="2" fill="var(--line)"/>
      <rect x="${x + 2}" y="${baseline - actualH}" width="${barInnerW}" height="${actualH}" rx="2" fill="${hitTarget ? 'var(--aurora)' : 'var(--gold)'}"/>
      <text x="${x}" y="${h - 6}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--text-faint)">${_chartEsc(d.label)}</text>
    `;
  }).join('');
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
}

function trendArea(values, opts){
  values = values || [];
  opts = opts || {};
  const w = opts.width || 260, h = opts.height || 70, pad = 8;
  const color = opts.color || '#F0B24E';
  if(values.length === 0) return '';
  const max = Math.max(...values, 1), min = 0;
  const stepX = values.length > 1 ? (w - pad*2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i*stepX, h - pad - ((v - min)/(max - min || 1)) * (h - pad*2)]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `M${pad},${h-pad} L` + pts.map(p => p.join(',')).join(' L') + ` L${pts[pts.length-1][0]},${h-pad} Z`;
  const gradId = 'trendFade' + Math.random().toString(36).slice(2,8);
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.32"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#${gradId})" stroke="none"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.4" fill="${color}"/>`).join('')}
  </svg>`;
}

/* ---- Mock data seeders (only run once, so returning users see stable history) ---- */
function seedOutcomesIfEmpty(){
  let outcomes = getOutcomes();
  if(outcomes.length > 0) return outcomes;
  outcomes = [
    {status:'offer', month:'Jun'}, {status:'interview', month:'Jun'}, {status:'rejected', month:'Jun'},
    {status:'interview', month:'Jul'}, {status:'applied', month:'Jul'}, {status:'rejected', month:'Jul'}, {status:'ghosted', month:'Jul'},
    {status:'offer', month:'Aug'}, {status:'interview', month:'Aug'}, {status:'applied', month:'Aug'},
  ];
  saveOutcomes(outcomes);
  return outcomes;
}

function monthlyTargetData(records, targetPerMonth, months){
  return months.map(m => ({
    label: m,
    target: targetPerMonth,
    actual: records.filter(r => r.month === m).length,
  }));
}

// The trailing `n` calendar months ending with the CURRENT month, as the short
// names monthlyTargetData matches on (e.g. in September, n=6 ->
// ['Apr','May','Jun','Jul','Aug','Sep']). Callers previously hardcoded a fixed
// list like ['Jun','Jul','Aug'], which silently dropped every application sent
// outside those months - i.e. showed an empty chart for most of the year. Within
// any run of <=12 consecutive months each short name is unique, so matching by
// short name is unambiguous as long as callers also window their records to the
// same span (see monthWindowStart).
function lastNMonths(n){
  const out = [];
  const now = new Date();
  for(let i = n - 1; i >= 0; i--){
    out.push(new Date(now.getFullYear(), now.getMonth() - i, 1)
      .toLocaleString('en-US', { month: 'short' }));
  }
  return out;
}

// First instant of the earliest month in a trailing `n`-month window ending this
// month. Records older than this must be excluded before bucketing by short month
// name, so a same-named month from a prior year can't leak into the window.
function monthWindowStart(n){
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - (n - 1));
  return d;
}
