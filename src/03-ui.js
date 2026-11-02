/* =====================================================================
   UI-компоненты, графики, оболочка приложения, маршрутизация
   ===================================================================== */

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M3 21h18',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  calendar: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4',
  news: 'M4 22h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9h4M10 6h6M10 10h6M10 14h4',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  plus: 'M12 5v14M5 12h14',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 21',
  video: 'M23 7l-7 5 7 5zM3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  chevR: 'M9 18l6-6-6-6', chevL: 'M15 18l-6-6 6-6', chevD: 'M6 9l6 6 6-6',
  up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7',
  pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  menu: 'M3 6h18M3 12h18M3 18h18',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 16v-4M12 8h.01',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  growth: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  hand: 'M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15',
  run: 'M22 12h-4l-3 9L9 3l-3 9H2',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8',
  spark: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10',
  compare: 'M18 20V10M12 20V4M6 20v-6',
  log: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  lock: 'M5 11h14v11H5zM8 11V7a4 4 0 0 1 8 0v4',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6M8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0M12 9v4M12 17h.01',
  scale: 'M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0zM8 21h8',
  swap: 'M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1'
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ICONS.info}"/></svg>`;

/* ---------- примитивы ---------- */
function initials(name) { const p = String(name || '?').split(' '); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
function hueOf(s) { let h = 0; for (const c of String(s)) h = (h * 33 + c.charCodeAt(0)) % 360; return h; }
function avatar(u, size = 36, extra = '') {
  if (!u) return `<span class="av" style="--s:${size}px"></span>`;
  const img = u.photo ? `<img alt="" data-media="${esc(u.photo)}">` : '';
  return `<span class="av ${extra}" style="--s:${size}px;--h:${hueOf(u.name)}"><span>${esc(initials(u.name))}</span>${img}</span>`;
}
function orgLogo(o, size = 40) {
  if (!o) return '';
  const root = rootOf(o.id) || o.id;
  const h = ORG_HUE[root] ?? hueOf(root);
  return `<span class="logo ${o.type === 'subsidiary' ? 'sub' : ''}" style="--s:${size}px;--h:${h}" title="${esc(o.full)}">${esc(orgAbbr(o))}</span>`;
}
const chip = (txt, tone = '', ic = '') => `<span class="chip ${tone ? 'tone-' + tone : ''}">${ic ? icon(ic, 13) : ''}${esc(txt)}</span>`;
const statusChip = (s) => { const x = STATUS[s] || { label: s, tone: '' }; return `<span class="chip st tone-${x.tone}"><i class="dot"></i>${esc(x.label)}</span>`; };
const catChip = (c) => { const x = CAT(c); return `<span class="chip cat" style="--c:${x.color}">${icon(x.icon, 13)}${esc(x.short)}</span>`; };
const testChip = () => `<span class="chip tone-test" title="Тестовая запись демо-версии">ТЕСТ</span>`;
const userLink = (u) => (u ? `<a href="#person-${u.id}" class="ulink">${esc(u.name)}</a>` : '—');
const orgLink = (id) => (O(id) ? `<a href="#company-${id}" class="ulink">${esc(O(id).name)}</a>` : '—');
function emptyState(ic, title, text, action = '') {
  return `<div class="empty">${icon(ic, 28)}<b>${esc(title)}</b><p>${esc(text)}</p>${action}</div>`;
}
function bar(v, max = 100, tone = '') { const w = Math.max(0, Math.min(100, (v / (max || 1)) * 100)); return `<span class="bar ${tone}"><i style="width:${w}%"></i></span>`; }
function delta(prev, cur) {
  if (!prev || !cur) return `<span class="delta new" title="Нет данных за прошлый период">новый</span>`;
  const d = prev - cur;
  if (d === 0) return `<span class="delta same" title="Без изменений">—</span>`;
  return `<span class="delta ${d > 0 ? 'up' : 'down'}" title="Изменение позиции к прошлому периоду">${icon(d > 0 ? 'up' : 'down', 12)}${Math.abs(d)}</span>`;
}
function sparkline(vals, invert = true, w = 84, h = 26) {
  const v = vals.filter((x) => x != null);
  if (v.length < 2) return '<span class="muted">—</span>';
  const max = Math.max(...v), min = Math.min(...v);
  const span = max - min || 1;
  const pts = vals.map((x, i) => (x == null ? null : [2 + (i * (w - 6)) / (vals.length - 1), invert ? 3 + ((x - min) / span) * (h - 6) : h - 3 - ((x - min) / span) * (h - 6)])).filter(Boolean);
  const last = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/></svg>`;
}

/* ---------- графики (SVG, ширина = ширина контейнера) ---------- */
const CHART_SPECS = new Map();
let chartN = 0;
function chart(type, spec) { const id = 'ch' + ++chartN; CHART_SPECS.set(id, { type, spec }); return `<div class="chart" id="${id}" style="min-height:${spec.h || 220}px"></div>`; }
function drawCharts() {
  for (const [id, { type, spec }] of CHART_SPECS) {
    const el = document.getElementById(id);
    if (!el) { CHART_SPECS.delete(id); continue; }
    const w = Math.max(260, Math.floor(el.clientWidth || 600));
    try { el.innerHTML = DRAW[type](spec, w); } catch (e) { el.innerHTML = '<p class="muted">Не удалось построить график</p>'; console.error(e); }
  }
}
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
const SER = ['s1', 's2', 's3', 's4'];
function legend(series) { return series.length > 1 ? `<div class="legend">${series.map((s, i) => `<span><i class="sw ${SER[i]}"></i>${esc(s.name)}</span>`).join('')}</div>` : ''; }
function topRoundBar(x, y, w, h, r = 3) { if (h <= 0) return ''; r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
const DRAW = {
  line({ labels, series, h = 220, fmtY = fmt }, W) {
    const H = h, L = 44, R = 16, T = 14, B = 28;
    const maxV = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
    const n = labels.length;
    const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
    const y = (v) => T + (H - T - B) * (1 - v / maxV);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = (maxV * k) / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${k ? 'grid' : 'axis'}"/><text x="${L - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${fmtY(v)}</text>`; }
    const step = Math.ceil(n / Math.max(2, Math.floor(W / 70)));
    labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 8}" class="tick" text-anchor="middle">${esc(l)}</text>`; });
    series.forEach((s, si) => {
      const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      if (si === 0) g += `<path d="${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z" class="area ${SER[si]}"/>`;
      g += `<path d="${d}" class="ln ${SER[si]}"/>`;
      const lv = s.values[n - 1];
      g += `<circle cx="${x(n - 1)}" cy="${y(lv)}" r="4" class="pt ${SER[si]}"/>`;
    });
    const cw = (W - L - R) / Math.max(1, n - 1);
    labels.forEach((l, i) => { g += `<rect x="${x(i) - cw / 2}" y="${T}" width="${cw}" height="${H - T - B}" class="hit" data-tip="${esc(l + '\n' + series.map((s) => `${s.name}: ${fmtY(s.values[i])}`).join('\n'))}"/>`; });
    return `${legend(series)}<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))}">${g}</svg>`;
  },
  bars({ labels, series, h = 220, fmtY = fmt }, W) {
    const H = h, L = 44, R = 10, T = 14, B = 30;
    const maxV = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
    const n = labels.length, m = series.length;
    const gw = (W - L - R) / n;
    const bw = Math.max(4, Math.min(28, (gw * 0.72 - (m - 1) * 2) / m));
    const y = (v) => T + (H - T - B) * (1 - v / maxV);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = (maxV * k) / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${k ? 'grid' : 'axis'}"/><text x="${L - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${fmtY(v)}</text>`; }
    const step = Math.ceil(n / Math.max(2, Math.floor(W / 64)));
    labels.forEach((l, i) => {
      const gx = L + i * gw + (gw - (bw * m + (m - 1) * 2)) / 2;
      series.forEach((s, si) => { const v = s.values[i] || 0; const yy = y(v); g += `<path d="${topRoundBar(gx + si * (bw + 2), yy, bw, y(0) - yy)}" class="bf ${SER[si]}"/>`; });
      if (i % step === 0) g += `<text x="${L + i * gw + gw / 2}" y="${H - 9}" class="tick" text-anchor="middle">${esc(l)}</text>`;
      g += `<rect x="${L + i * gw}" y="${T}" width="${gw}" height="${H - T - B}" class="hit" data-tip="${esc(l + '\n' + series.map((s) => `${s.name}: ${fmtY(s.values[i] || 0)}`).join('\n'))}"/>`;
    });
    return `${legend(series)}<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">${g}</svg>`;
  },
  map({ values, h }, W) {
    const lonA = 46.2, lonB = 87.6, latT = 55.7, cos = 0.669;
    const K = (W - 8) / ((lonB - lonA) * cos);
    const H = Math.round((latT - 40.3) * K) + 8;
    const px = (lon) => 4 + (lon - lonA) * cos * K;
    const py = (lat) => 4 + (latT - lat) * K;
    const d = 'M' + KZ_OUTLINE.map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join('L') + 'Z';
    const max = Math.max(1, ...DB.regions.map((r) => (values[r.id] || {}).v || 0));
    const sc = Math.max(0.7, W / 760);
    const sorted = DB.regions.slice().sort((a, b) => ((values[b.id] || {}).v || 0) - ((values[a.id] || {}).v || 0));
    const top = new Set(sorted.slice(0, W > 560 ? 7 : 4).map((r) => r.id));
    let g = `<path d="${d}" class="kz"/>`;
    sorted.slice().reverse().forEach((r) => {
      const v = (values[r.id] || {}).v || 0;
      const rad = (3 + 15 * Math.sqrt(v / max)) * sc;
      const cx = px(r.lon), cy = py(r.lat);
      const info = values[r.id] || {};
      g += `<g class="reg" data-act="map-region" data-id="${r.id}" data-tip="${esc(`${r.name}\nПодтверждённых проектов: ${info.p || 0}\nМероприятий: ${info.e || 0}\nОхват: ${fmt(info.reach || 0)} чел.`)}"><circle cx="${cx}" cy="${cy}" r="${Math.max(rad, 12)}" class="hit"/><circle cx="${cx}" cy="${cy}" r="${rad}" class="bub ${v ? '' : 'zero'}"/></g>`;
      if (top.has(r.id) && v) { const left = cx > W - 130; g += `<text x="${left ? cx - rad - 4 : cx + rad + 4}" y="${cy + 4}" class="maplbl" text-anchor="${left ? 'end' : 'start'}">${esc(r.city)}</text>`; }
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Карта активности по регионам Казахстана">${g}</svg>`;
  }
};
function hbars(rows, opt = {}) {
  const max = opt.max || Math.max(1, ...rows.map((r) => r.v));
  return `<div class="hbars">${rows.map((r) => `<div class="hb" ${r.tip ? `data-tip="${esc(r.tip)}"` : ''}><span class="hb-l">${r.html || esc(r.label)}</span><span class="hb-t"><i style="width:${Math.max(0.5, (r.v / max) * 100)}%;${r.color ? 'background:' + r.color : ''}"></i></span><span class="hb-v">${opt.fmt ? opt.fmt(r.v) : fmt(r.v)}</span></div>`).join('')}</div>`;
}

/* ---------- всплывающие подсказки ---------- */
function initTips() {
  const tip = $('#tip');
  const show = (el, x, y) => { tip.textContent = el.dataset.tip; tip.hidden = false; const r = tip.getBoundingClientRect(); const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 14)); const top = y + 16 + r.height > window.innerHeight ? y - r.height - 10 : y + 16; tip.style.left = left + 'px'; tip.style.top = top + 'px'; };
  document.addEventListener('mousemove', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else tip.hidden = true; });
  document.addEventListener('touchstart', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const t0 = e.touches[0]; show(el, t0.clientX, t0.clientY); } else tip.hidden = true; }, { passive: true });
  document.addEventListener('scroll', () => { tip.hidden = true; }, true);
}

/* ---------- уведомления на экране ---------- */
function toast(msg, tone = '') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (tone ? 'tone-' + tone : '');
  el.setAttribute('role', 'status');
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4200);
}

/* ---------- модальные окна (вместо alert/confirm) ---------- */
let MODAL_CB = {};
function openModal({ title, body, actions = [], wide = false, onMount }) {
  MODAL_CB = {};
  const root = $('#modal');
  root.innerHTML = `<div class="modal-back" data-act="modal-close"></div><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-act="modal-close" aria-label="Закрыть">${icon('x')}</button></div><div class="modal-b">${body}</div>${actions.length ? `<div class="modal-f">${actions.map((a, i) => { MODAL_CB['a' + i] = a.fn; return `<button class="btn ${a.cls || ''}" data-act="modal-action" data-k="a${i}">${a.icon ? icon(a.icon, 16) : ''}${esc(a.label)}</button>`; }).join('')}</div>` : ''}</div>`;
  root.hidden = false;
  document.body.classList.add('modal-open');
  if (onMount) onMount(root);
  hydrateMedia(root);
  const f = root.querySelector('input,select,textarea,button.btn'); if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { const root = $('#modal'); root.hidden = true; root.innerHTML = ''; document.body.classList.remove('modal-open'); MODAL_CB = {}; }
function confirmModal(title, text, okLabel, fn, danger = false) {
  openModal({ title, body: `<p class="lead">${esc(text)}</p>`, actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: okLabel, cls: danger ? 'danger' : 'primary', fn: () => { closeModal(); fn(); } }] });
}

/* ---------- формы ---------- */
function fld(label, control, hint = '', req = false, cls = '') {
  return `<label class="field ${cls}"><span class="fl">${esc(label)}${req ? ' <em>*</em>' : ''}</span>${control}${hint ? `<span class="fh">${esc(hint)}</span>` : ''}</label>`;
}
const inp = (id, value = '', attrs = '') => `<input class="input" id="${id}" name="${id}" value="${esc(value)}" ${attrs}>`;
const txa = (id, value = '', rows = 3, attrs = '') => `<textarea class="input" id="${id}" name="${id}" rows="${rows}" ${attrs}>${esc(value)}</textarea>`;
function sel(id, options, value = '', attrs = '') {
  return `<select class="input" id="${id}" name="${id}" ${attrs}>${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
}
const orgOptions = (withAll = '', filter = () => true) => [...(withAll ? [['', withAll]] : []), ...DB.orgs.filter(filter).map((o) => [o.id, (o.type === 'subsidiary' ? '— ' : '') + o.name])];
const regionOptions = (withAll = '') => [...(withAll ? [['', withAll]] : []), ...DB.regions.map((r) => [r.id, r.name])];
const catOptions = (withAll = '') => [...(withAll ? [['', withAll]] : []), ...CATS.map((c) => [c.id, c.name])];
function seg(name, items, value) {
  return `<div class="seg" role="tablist">${items.map(([v, l]) => `<button type="button" role="tab" aria-selected="${v === value}" class="${v === value ? 'on' : ''}" data-act="seg" data-name="${name}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
}
function tabs(name, items, value) {
  return `<div class="tabs" role="tablist">${items.map(([v, l, n]) => `<button type="button" role="tab" aria-selected="${v === value}" class="tab ${v === value ? 'on' : ''}" data-act="seg" data-name="${name}" data-v="${esc(v)}">${esc(l)}${n != null ? `<span class="cnt">${n}</span>` : ''}</button>`).join('')}</div>`;
}
function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}

/* ---------- медиа-галерея ---------- */
function mediaTile(m, cat = 'other', removable = false) {
  const c = CAT(cat);
  const rm = removable ? `<button type="button" class="ph-rm" data-act="media-remove" data-id="${m.id}" aria-label="Удалить файл">${icon('x', 14)}</button>` : '';
  if (m.kind === 'photo') {
    return `<figure class="ph" style="--c:${c.color}" ${m.key ? `data-act="lightbox" data-key="${m.key}" data-name="${esc(m.name)}"` : ''}>${icon('image', 22)}<span>${m.placeholder ? 'Тестовое фото' : esc(m.name)}</span>${m.key ? `<img alt="${esc(m.name)}" data-media="${m.key}">` : ''}${rm}</figure>`;
  }
  const ic = m.kind === 'video' ? 'video' : 'file';
  const dl = m.key ? `data-act="file-download" data-key="${m.key}" data-name="${esc(m.name)}"` : '';
  return `<div class="filerow" ${dl}>${icon(ic, 18)}<span class="fn">${esc(m.name)}</span><span class="muted">${m.placeholder ? 'тестовый файл' : fmtSize(m.size)}</span>${m.key ? icon('download', 16) : ''}${rm}</div>`;
}
function gallery(media, cat, removable = false) {
  const photos = (media || []).filter((m) => m.kind === 'photo');
  const files = (media || []).filter((m) => m.kind !== 'photo');
  return `${photos.length ? `<div class="gallery">${photos.map((m) => mediaTile(m, cat, removable)).join('')}</div>` : ''}${files.length ? `<div class="files">${files.map((m) => mediaTile(m, cat, removable)).join('')}</div>` : ''}${!photos.length && !files.length ? '<p class="muted">Материалы не загружены</p>' : ''}`;
}

/* ---------- маршрутизация ---------- */
const ROUTES = {};
const UI = { tabs: {} };
let CURRENT = { name: 'home', param: null };
let MOUNT = [];
const onMount = (fn) => MOUNT.push(fn);
function route(name, render, guard) { ROUTES[name] = { render, guard }; }
const PREFIXED = ['project-edit', 'event-edit', 'company', 'person', 'project', 'event', 'review', 'news'];
function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')) || 'home';
  if (ROUTES[h]) return { name: h, param: null };
  for (const p of PREFIXED) if (h.startsWith(p + '-')) return { name: p, param: h.slice(p.length + 1) };
  return { name: 'notfound', param: h };
}
function go(hash) { if (location.hash === '#' + hash) render(); else location.hash = hash; }
function render(keepScroll = false) {
  const r = parseHash();
  CURRENT = r;
  const def = ROUTES[r.name] || ROUTES.notfound;
  const main = $('#main');
  const sy = window.scrollY;
  const active = document.activeElement;
  const focusId = active && active.id && main.contains(active) ? active.id : null;
  const caret = focusId && 'selectionStart' in active ? active.selectionStart : null;
  MOUNT = [];
  let html;
  if (def.guard) { const g = def.guard(r.param); if (g) html = g; }
  if (!html) {
    try { html = def.render(r.param); } catch (e) { console.error(e); html = `<div class="page">${emptyState('alert', 'Ошибка отображения страницы', String(e.message || e))}</div>`; }
  }
  main.innerHTML = html;
  renderSide(); renderTop();
  closeDrawer();
  drawCharts();
  MOUNT.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  hydrateMedia(main);
  if (keepScroll) window.scrollTo(0, sy); else window.scrollTo(0, 0);
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (caret != null && el.setSelectionRange) try { el.setSelectionRange(caret, caret); } catch (e) { /* select */ } } }
  const titleBits = { home: 'Главная' };
  document.title = 'JASTAR HUB' + (r.name !== 'home' ? ' — ' + (main.querySelector('h1') ? main.querySelector('h1').textContent.slice(0, 60) : '') : '');
  void titleBits;
}
const rerender = () => render(true);
function needLogin(msg = 'Войдите или зарегистрируйтесь, чтобы продолжить.') {
  return `<div class="page narrow">${emptyState('lock', 'Нужен вход в систему', msg, `<div class="btn-row center"><a class="btn primary" href="#login">${icon('login', 16)}Войти</a><a class="btn" href="#register">Зарегистрироваться</a></div>`)}</div>`;
}
const denied = (msg = typeof LIVE !== 'undefined' && LIVE ? 'Этот раздел доступен другой роли. Роли назначает администратор платформы.' : 'Этот раздел доступен другой роли. Переключите демо-роль в верхней панели.') => `<div class="page narrow">${emptyState('lock', 'Недостаточно прав', msg, `<button class="btn" data-act="role-switch">${icon('swap', 16)}Сменить демо-роль</button>`)}</div>`;
const guardLogin = () => (me() ? null : needLogin());
const guardRoles = (...roles) => () => (!me() ? needLogin() : roles.includes(myRole()) ? null : denied());

/* ---------- оболочка ---------- */
const NAV = [
  { g: 'g_main', items: [['home', 'home'], ['companies', 'building'], ['people', 'users'], ['projects', 'folder'], ['events', 'calendar'], ['news', 'news'], ['knowledge', 'book']] },
  { g: 'g_rating', items: [['rating', 'trophy'], ['leaders', 'award'], ['methodology', 'scale'], ['compare', 'compare']] },
  { g: 'g_work', items: [['me', 'user', () => !!me()], ['expert', 'shield', () => ['expert', 'admin'].includes(myRole())], ['analytics', 'chart', () => ['admin', 'chair', 'regional'].includes(myRole())], ['admin', 'settings', () => myRole() === 'admin']] }
];
const NAV_OF = { company: 'companies', person: 'people', project: 'projects', 'project-new': 'projects', 'project-edit': 'projects', event: 'events', 'event-new': 'events', 'event-edit': 'events', review: 'expert', 'me-edit': 'me', 'achievement-new': 'me', notifications: 'me' };
function brandMark(s = 34) {
  return `<svg class="mark" width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="var(--accent)"/><path d="M23 9v14.5a6.5 6.5 0 0 1-12.4 2.7" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M29.5 8.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#fff"/></svg>`;
}
function renderSide() {
  const active = NAV_OF[CURRENT.name] || CURRENT.name;
  const pending = me() && myRole() === 'expert' ? [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => x.review && x.review.expertId === me().id && ['submitted', 'in_review', 'needs_info'].includes(x.status) && x.status !== 'needs_info').length : 0;
  $('#side').innerHTML = `<a class="brand" href="#home">${brandMark()}<span><b>JASTAR HUB</b><small>Молодёжные советы группы Самрук-Қазына</small></span></a>
    <nav aria-label="Основная навигация">${NAV.map((grp) => {
      const items = grp.items.filter(([, , show]) => !show || show());
      if (!items.length) return '';
      return `<div class="nav-group"><span class="ng">${esc(t(grp.g))}</span>${items.map(([k, ic]) => `<a href="#${k}" class="nav-item ${active === k ? 'active' : ''}" ${active === k ? 'aria-current="page"' : ''}>${icon(ic, 18)}<span>${esc(t(k))}</span>${k === 'expert' && pending ? `<b class="pill">${pending}</b>` : ''}</a>`).join('')}</div>`;
    }).join('')}</nav>
    <div class="side-foot"><span class="slogan">${esc(t('slogan'))}</span></div>`;
}
function renderTop() {
  const u = me();
  const unread = myNotifications().filter((n) => !n.read).length;
  $('#top').innerHTML = `<button class="icon-btn only-m" data-act="drawer" aria-label="Меню">${icon('menu', 20)}</button>
    <a class="brand-m only-m" href="#home">${brandMark(28)}<b>JASTAR HUB</b></a>
    <div class="gsearch"><label class="sr" for="gq">${esc(t('search'))}</label>${icon('search', 16)}<input id="gq" type="search" placeholder="${esc(t('search'))}" autocomplete="off" value="${esc(UI.gq || '')}"><div id="gres" class="gres" hidden></div></div>
    <div class="top-r">
      <div class="lang" role="group" aria-label="Язык интерфейса">${[['ru', 'RU'], ['kk', 'ҚАЗ'], ['en', 'EN']].map(([k, l]) => `<button data-act="lang" data-v="${k}" class="${DB.lang === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <button class="btn sm ghost role-btn" data-act="role-switch" title="Демо: посмотреть платформу глазами другой роли">${icon('swap', 15)}<span>${esc(ROLES[myRole()].short)}</span></button>
      ${u ? `<a class="icon-btn bell" href="#notifications" aria-label="${esc(t('notifications'))}">${icon('bell', 19)}${unread ? `<b>${unread > 9 ? '9+' : unread}</b>` : ''}</a>
        <a class="me-chip" href="#me" title="${esc(u.name)}">${avatar(u, 30)}<span class="hide-s"><b>${esc(u.name.split(' ')[1] || u.name)}</b></span></a>${typeof LIVE !== 'undefined' && LIVE ? `<button class="icon-btn" data-act="logout" aria-label="${esc(t('logout'))}" title="${esc(t('logout'))}">${icon('logout', 18)}</button>` : ''}`
      : `<a class="btn sm" href="#login">${esc(t('login'))}</a><a class="btn sm primary hide-s" href="#register">${esc(t('register'))}</a>`}
    </div>`;
  hydrateMedia($('#top'));
}
function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }

/* ---------- глобальный поиск ---------- */
function globalSearch(q) {
  const box = $('#gres');
  const s = norm(q);
  if (s.length < 2) { box.hidden = true; return; }
  const people = DB.users.filter((u) => !u.blocked && u.role !== 'admin' && (norm(u.name).includes(s) || norm(orgLabel(u.companyId)).includes(s))).slice(0, 5);
  const projects = DB.projects.filter((p) => canSeeActivity(p) && norm(p.title).includes(s)).slice(0, 5);
  const orgs = DB.orgs.filter((o) => norm(o.name + ' ' + o.full).includes(s)).slice(0, 4);
  const sec = (title, rows) => (rows.length ? `<div class="gs"><span>${title}</span>${rows.join('')}</div>` : '');
  const html = sec('Компании и советы', orgs.map((o) => `<a href="#company-${o.id}">${orgLogo(o, 24)}<span>${esc(o.name)}<small>${esc(o.full)}</small></span></a>`))
    + sec('Участники', people.map((u) => `<a href="#person-${u.id}">${avatar(u, 24)}<span>${esc(u.name)}<small>${esc(u.position)} · ${esc(orgLabel(u.companyId))}</small></span></a>`))
    + sec('Проекты', projects.map((p) => `<a href="#project-${p.id}">${icon(CAT(p.category).icon, 18)}<span>${esc(p.title)}<small>${esc(orgLabel(p.orgId))} · ${fmtDate(p.end)}</small></span></a>`));
  box.innerHTML = html || '<p class="muted pad">Ничего не найдено</p>';
  box.hidden = false;
  hydrateMedia(box);
}
