/*
 * Gráficos SVG feitos à mão (sem dependência externa): um donut de gastos
 * por grupo de categoria e um gráfico de barras divergentes (receitas para
 * cima, despesas para baixo) para a evolução mensal. Paleta e specs de
 * marca seguem o guia de dataviz do produto (traços finos, pontas
 * arredondadas, gap de separação, legenda sempre visível, tooltip no hover).
 */

const CHART_NS = 'http://www.w3.org/2000/svg';

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(CHART_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function fmtBRL(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ensureTooltip() {
  let tip = document.getElementById('chart-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'chart-tooltip';
    tip.className = 'chart-tooltip';
    tip.setAttribute('role', 'status');
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  return tip;
}

function showTooltip(evt, lines) {
  const tip = ensureTooltip();
  tip.innerHTML = '';
  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'chart-tooltip-row';
    if (line.swatch) {
      const sw = document.createElement('span');
      sw.className = 'chart-tooltip-swatch';
      sw.style.background = line.swatch;
      row.appendChild(sw);
    }
    const label = document.createElement('span');
    label.className = 'chart-tooltip-label';
    label.textContent = line.label;
    const value = document.createElement('strong');
    value.className = 'chart-tooltip-value';
    value.textContent = line.value;
    row.appendChild(label);
    row.appendChild(value);
    tip.appendChild(row);
  }
  tip.hidden = false;
  positionTooltip(evt);
}

function positionTooltip(evt) {
  const tip = document.getElementById('chart-tooltip');
  if (!tip || tip.hidden) return;
  const pad = 14;
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = evt.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = evt.clientY - rect.height - pad;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function hideTooltip() {
  const tip = document.getElementById('chart-tooltip');
  if (tip) tip.hidden = true;
}

// --- Donut: despesas por grupo ------------------------------------------

function renderCategoryDonut(container, groupTotals, totalLabel) {
  container.innerHTML = '';
  const dark = prefersDark();
  const entries = groupTotals.filter((g) => g.value > 0);
  const total = entries.reduce((s, g) => s + g.value, 0);

  const wrap = document.createElement('div');
  wrap.className = 'donut-wrap';

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chart-empty';
    empty.textContent = 'Sem despesas categorizadas neste mês.';
    container.appendChild(empty);
    return;
  }

  const size = 220;
  const radius = 88;
  const thickness = 28;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3; // surface gap entre fatias

  const svg = svgEl('svg', {
    viewBox: `0 0 ${size} ${size}`,
    width: size,
    height: size,
    role: 'img',
    'aria-label': `Despesas por categoria, total ${fmtBRL(total)}`,
  });
  const g = svgEl('g', { transform: `rotate(-90 ${cx} ${cy})` });

  let offset = 0;
  for (const entry of entries) {
    const frac = entry.value / total;
    const rawLen = frac * circumference;
    const len = Math.max(rawLen - gapPx, 0);
    const color = dark ? entry.colorDark : entry.color;
    const arc = svgEl('circle', {
      cx, cy, r: radius,
      fill: 'none',
      stroke: color,
      'stroke-width': thickness,
      'stroke-linecap': 'butt',
      'stroke-dasharray': `${len} ${circumference - len}`,
      'stroke-dashoffset': -offset,
      class: 'donut-segment',
      tabindex: '0',
      role: 'img',
      'aria-label': `${entry.label}: ${fmtBRL(entry.value)}`,
    });
    arc.addEventListener('pointermove', (evt) => {
      showTooltip(evt, [{
        swatch: color,
        label: entry.label,
        value: `${fmtBRL(entry.value)} · ${(frac * 100).toFixed(1)}%`,
      }]);
    });
    arc.addEventListener('pointerleave', hideTooltip);
    arc.addEventListener('focus', (evt) => showTooltip(evt, [{
      swatch: color, label: entry.label, value: `${fmtBRL(entry.value)} · ${(frac * 100).toFixed(1)}%`,
    }]));
    arc.addEventListener('blur', hideTooltip);
    g.appendChild(arc);
    offset += rawLen;
  }
  svg.appendChild(g);

  const center = document.createElement('div');
  center.className = 'donut-center';
  center.innerHTML = `<span class="donut-center-label">${totalLabel}</span><span class="donut-center-value">${fmtBRL(total)}</span>`;

  const svgBox = document.createElement('div');
  svgBox.className = 'donut-svg-box';
  svgBox.appendChild(svg);
  svgBox.appendChild(center);

  const legend = document.createElement('ul');
  legend.className = 'chart-legend';
  for (const entry of entries) {
    const frac = entry.value / total;
    const color = dark ? entry.colorDark : entry.color;
    const li = document.createElement('li');
    li.className = 'chart-legend-item';
    const sw = document.createElement('span');
    sw.className = 'chart-legend-swatch';
    sw.style.background = color;
    const label = document.createElement('span');
    label.className = 'chart-legend-label';
    label.textContent = entry.label;
    const val = document.createElement('span');
    val.className = 'chart-legend-value';
    val.textContent = `${fmtBRL(entry.value)} (${(frac * 100).toFixed(0)}%)`;
    li.appendChild(sw);
    li.appendChild(label);
    li.appendChild(val);
    legend.appendChild(li);
  }

  wrap.appendChild(svgBox);
  wrap.appendChild(legend);
  container.appendChild(wrap);
}

// --- Barras divergentes: receitas x despesas por mês ---------------------

function renderDivergingTrend(container, months) {
  // months: [{ month: 'YYYY-MM', label: 'jul/26', receitas, despesas (positivo) }]
  container.innerHTML = '';
  const dark = prefersDark();
  // Verde/vermelho ecoa de propósito o vocabulário contábil ("estar no
  // vermelho") — é o par divergente da marca, não a paleta categórica.
  const receitaColor = dark ? '#3fae8c' : '#1f5c4a';
  const despesaColor = dark ? '#e0707c' : '#8a2432';
  const baselineColor = dark ? '#3a4250' : '#d8d4c8';
  const textColor = dark ? '#aab2b8' : '#4b5560';

  if (months.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chart-empty';
    empty.textContent = 'Sem dados suficientes para a evolução mensal.';
    container.appendChild(empty);
    return;
  }

  const maxVal = Math.max(1, ...months.map((m) => Math.max(m.receitas, m.despesas)));
  const width = Math.max(360, months.length * 90);
  const height = 220;
  const midY = height / 2;
  const plotHalf = midY - 28; // deixa espaço pros rótulos de mês e valores
  const barWidth = 22;
  const groupGap = 10;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height, role: 'img', 'aria-label': 'Receitas e despesas por mês' });

  svg.appendChild(svgEl('line', { x1: 0, x2: width, y1: midY, y2: midY, stroke: baselineColor, 'stroke-width': 1 }));

  const step = width / months.length;
  months.forEach((m, i) => {
    const cx = step * i + step / 2;
    const label = svgEl('text', {
      x: cx, y: midY + plotHalf + 20, 'text-anchor': 'middle', class: 'chart-axis-label',
    });
    label.textContent = m.label;
    label.setAttribute('fill', textColor);
    svg.appendChild(label);

    const recH = (m.receitas / maxVal) * plotHalf;
    const despH = (m.despesas / maxVal) * plotHalf;
    const recX = cx - barWidth - groupGap / 2;
    const despX = cx + groupGap / 2;

    const recRect = roundedBar(recX, midY - recH, barWidth, recH, 4, 'up', receitaColor);
    const despRect = roundedBar(despX, midY, barWidth, despH, 4, 'down', despesaColor);

    [[recRect, 'Receitas', m.receitas, receitaColor], [despRect, 'Despesas', m.despesas, despesaColor]].forEach(([el, name, value, color]) => {
      el.setAttribute('tabindex', '0');
      el.addEventListener('pointermove', (evt) => showTooltip(evt, [
        { label: m.label, value: '' },
        { swatch: color, label: name, value: fmtBRL(value) },
      ]));
      el.addEventListener('pointerleave', hideTooltip);
      el.addEventListener('focus', (evt) => showTooltip(evt, [{ swatch: color, label: `${name} · ${m.label}`, value: fmtBRL(value) }]));
      el.addEventListener('blur', hideTooltip);
      svg.appendChild(el);
    });
  });

  container.appendChild(svg);

  const legend = document.createElement('ul');
  legend.className = 'chart-legend chart-legend-inline';
  legend.innerHTML = `
    <li class="chart-legend-item"><span class="chart-legend-swatch" style="background:${receitaColor}"></span><span class="chart-legend-label">Receitas</span></li>
    <li class="chart-legend-item"><span class="chart-legend-swatch" style="background:${despesaColor}"></span><span class="chart-legend-label">Despesas</span></li>
  `;
  container.appendChild(legend);
}

function roundedBar(x, y, w, h, r, direction, color) {
  // direction 'up': cresce para cima (ponta arredondada no topo, base reta na baseline)
  // direction 'down': cresce para baixo (ponta arredondada embaixo, base reta na baseline)
  if (h < 1) h = 1;
  r = Math.min(r, w / 2, h);
  let d;
  if (direction === 'up') {
    d = `M ${x} ${y + h}
         L ${x} ${y + r}
         Q ${x} ${y} ${x + r} ${y}
         L ${x + w - r} ${y}
         Q ${x + w} ${y} ${x + w} ${y + r}
         L ${x + w} ${y + h} Z`;
  } else {
    d = `M ${x} ${y}
         L ${x} ${y + h - r}
         Q ${x} ${y + h} ${x + r} ${y + h}
         L ${x + w - r} ${y + h}
         Q ${x + w} ${y + h} ${x + w} ${y + h - r}
         L ${x + w} ${y} Z`;
  }
  return svgEl('path', { d, fill: color, class: 'trend-bar' });
}
