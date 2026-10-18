// Dünne Hülle um Chart.js (global geladen über CDN in index.html).

export const COLORS = { primary: '#2350c8', accent: '#60a5fa', soft: 'rgba(35,80,200,.14)', grey: '#94a3b8', gold: '#ca8a04' };

const charts = new Set();
export function destroyAll() { charts.forEach(c => c.destroy()); charts.clear(); }

function ready() { return typeof window.Chart !== 'undefined'; }

function base(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false, labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: { padding: 10 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 14, font: { size: 11 }, color: '#637081' } },
      y: { grid: { color: '#eef1f4' }, ticks: { font: { size: 11 }, color: '#637081' }, beginAtZero: false },
    },
    ...extra,
  };
}

function mount(box, config) {
  if (!ready()) { box.innerHTML = '<p class="muted small center">Diagramm nicht verfügbar (offline beim ersten Start).</p>'; return null; }
  box.innerHTML = '<canvas></canvas>';
  const c = new window.Chart(box.querySelector('canvas'), config);
  charts.add(c);
  return c;
}

/** Linien-Diagramm. series: [{label, data:[...], color, dashed, points, fill}] */
export function line(box, labels, series, opts = {}) {
  return mount(box, {
    type: 'line',
    data: {
      labels,
      datasets: series.map(s => ({
        label: s.label, data: s.data, borderColor: s.color || COLORS.primary,
        backgroundColor: s.fill ? (s.fillColor || COLORS.soft) : (s.color || COLORS.primary),
        borderWidth: s.width || 2.5, pointRadius: s.points ?? 0, pointHoverRadius: 4, tension: .3,
        borderDash: s.dashed ? [5, 4] : undefined, fill: !!s.fill, spanGaps: true, yAxisID: s.axis || 'y',
        showLine: s.showLine ?? true,
      })),
    },
    options: base({
      plugins: { legend: { display: series.length > 1, labels: { boxWidth: 12 } } },
      ...(opts.y2 ? { scales: { ...base().scales, y2: { position: 'right', grid: { display: false }, ticks: { font: { size: 11 }, color: '#637081' } } } } : {}),
      ...opts.options,
    }),
  });
}

export function bar(box, labels, series, opts = {}) {
  return mount(box, {
    type: 'bar',
    data: {
      labels,
      datasets: series.map(s => ({ label: s.label, data: s.data, backgroundColor: s.color || COLORS.primary, borderRadius: 6, maxBarThickness: 34 })),
    },
    options: base({
      plugins: { legend: { display: series.length > 1 } },
      scales: { ...base().scales, y: { ...base().scales.y, beginAtZero: true, ticks: { ...base().scales.y.ticks, precision: 0 } } },
      ...opts.options,
    }),
  });
}

export function doughnut(box, labels, data, colors) {
  return mount(box, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } },
  });
}
