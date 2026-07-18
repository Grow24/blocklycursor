/**
 * PBMP Form renderer — full Form Types + Style token interpretation
 * GAP-FORM-TEMPLATE-001
 */
import { SALES_DATA, SENTENCE_EXAMPLE } from './templates.js';

function formatSales(value) {
  return `₹${value} lakh`;
}

function chartLayout(width, height, compact) {
  const pad = compact
    ? { top: 44, right: 16, bottom: 40, left: 40 }
    : { top: 56, right: 28, bottom: 48, left: 52 };
  return {
    pad,
    plotW: width - pad.left - pad.right,
    plotH: height - pad.top - pad.bottom,
  };
}

function yScale(value, max, plotH) {
  return plotH - (value / max) * plotH;
}

function applySurface(container, tokens) {
  container.innerHTML = '';
  container.style.background = tokens.surfaceBackground;
  container.style.fontFamily = tokens.fontFamily;
  container.style.color = tokens.primaryTextColour;
  container.style.padding = `${tokens.padding}px`;
  container.style.border =
    tokens.borderTreatment === 'none' ? 'none' : `1px solid ${tokens.borderColour}`;
  container.style.boxShadow = tokens.shadow ? '0 8px 24px rgba(15, 23, 42, 0.12)' : 'none';
  container.style.borderRadius = '12px';
  if (tokens.animation) {
    container.classList.add('form-anim');
  } else {
    container.classList.remove('form-anim');
  }
}

export function renderForm(container, { formType, style, enableHover = true }) {
  const tokens = style.tokens;
  applySurface(container, tokens);

  if (formType === 'text') {
    renderText(container, tokens);
    return;
  }
  if (formType === 'table') {
    renderTable(container, tokens);
    return;
  }
  if (formType === 'kpi_card') {
    renderKpi(container, tokens);
    return;
  }

  renderChart(container, { formType, tokens, enableHover });
}

function renderChart(container, { formType, tokens, enableHover }) {
  const width = Math.max(container.clientWidth || 640, 280);
  const height = tokens.compact ? 300 : 360;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', String(height));
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    `Monthly sales performance as ${formType === 'line_chart' ? 'line chart' : 'bar chart'}`,
  );

  const { pad, plotW, plotH } = chartLayout(width, height, tokens.compact);
  const max = Math.max(...SALES_DATA.map((d) => d.sales)) * 1.15;
  const n = SALES_DATA.length;

  if (tokens.logo || tokens.brandedTitleArea) {
    const brand = el('text', {
      x: pad.left,
      y: 18,
      fill: tokens.secondaryTextColour,
      'font-size': 11,
      'font-weight': 700,
      'font-family': tokens.fontFamily,
      'letter-spacing': 1.5,
    });
    brand.textContent = 'PBMP';
    svg.appendChild(brand);
  }

  const title = el('text', {
    x: pad.left,
    y: tokens.logo ? 38 : 28,
    fill: tokens.titleColour,
    'font-size': tokens.titleSize,
    'font-weight': tokens.titleWeight,
    'font-family': tokens.fontFamily,
  });
  title.textContent = 'Monthly Sales Performance';
  svg.appendChild(title);

  if (!tokens.legendCollapsed) {
    const legendX = tokens.legendPosition === 'top' ? pad.left + 210 : width - pad.right - 90;
    const legendY = tokens.logo ? 34 : 22;
    if (formType === 'line_chart') {
      svg.appendChild(
        el('line', {
          x1: legendX,
          y1: legendY,
          x2: legendX + 28,
          y2: legendY,
          stroke: tokens.primaryDataColour,
          'stroke-width': tokens.lineWidth,
          'stroke-dasharray': tokens.lineStyle === 'dashed' ? '6 4' : undefined,
        }),
      );
      svg.appendChild(
        el('circle', {
          cx: legendX + 14,
          cy: legendY,
          r: 4,
          fill: tokens.markerColour,
        }),
      );
    } else {
      svg.appendChild(
        el('rect', {
          x: legendX,
          y: legendY - 6,
          width: 16,
          height: 12,
          rx: 3,
          fill: tokens.primaryDataColour,
        }),
      );
    }
    const legendText = el('text', {
      x: legendX + 34,
      y: legendY + 4,
      fill: tokens.secondaryTextColour,
      'font-size': 12,
      'font-family': tokens.fontFamily,
    });
    legendText.textContent = 'Sales';
    svg.appendChild(legendText);
  }

  const ticks = tokens.axisLabelDensity === 'sparse' ? 2 : 4;
  if (tokens.gridVisibility) {
    for (let i = 0; i <= ticks; i += 1) {
      const value = (max / ticks) * i;
      const y = pad.top + yScale(value, max, plotH);
      svg.appendChild(
        el('line', {
          x1: pad.left,
          y1: y,
          x2: pad.left + plotW,
          y2: y,
          stroke: tokens.gridColour,
          'stroke-width': 1,
          opacity: tokens.gridStyle === 'subtle' ? 0.55 : 0.9,
        }),
      );
      const label = el('text', {
        x: pad.left - 8,
        y: y + 4,
        fill: tokens.axisText,
        'font-size': tokens.compact ? 10 : 11,
        'text-anchor': 'end',
        'font-family': tokens.fontFamily,
      });
      label.textContent = String(Math.round(value));
      svg.appendChild(label);
    }
  }

  svg.appendChild(
    el('line', {
      x1: pad.left,
      y1: pad.top,
      x2: pad.left,
      y2: pad.top + plotH,
      stroke: tokens.axisText,
      'stroke-width': 1.2,
      opacity: 0.5,
    }),
  );
  svg.appendChild(
    el('line', {
      x1: pad.left,
      y1: pad.top + plotH,
      x2: pad.left + plotW,
      y2: pad.top + plotH,
      stroke: tokens.axisText,
      'stroke-width': 1.2,
      opacity: 0.5,
    }),
  );

  const points = SALES_DATA.map((d, i) => {
    const x = pad.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = pad.top + yScale(d.sales, max, plotH);
    return { ...d, x, y };
  });

  points.forEach((p) => {
    const label = el('text', {
      x: p.x,
      y: pad.top + plotH + 22,
      fill: tokens.axisText,
      'font-size': tokens.compact ? 10 : 12,
      'text-anchor': 'middle',
      'font-family': tokens.fontFamily,
    });
    label.textContent = tokens.axisLabelDensity === 'sparse' ? p.month.slice(0, 1) : p.month.slice(0, 3);
    svg.appendChild(label);
  });

  if (formType === 'line_chart') {
    if (tokens.areaFill) {
      const area = [
        `M ${points[0].x} ${pad.top + plotH}`,
        ...points.map((p) => `L ${p.x} ${p.y}`),
        `L ${points[points.length - 1].x} ${pad.top + plotH}`,
        'Z',
      ].join(' ');
      svg.appendChild(
        el('path', {
          d: area,
          fill: tokens.primaryDataColour,
          opacity: tokens.areaFillOpacity,
        }),
      );
    }
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    svg.appendChild(
      el('path', {
        d: path,
        fill: 'none',
        stroke: tokens.primaryDataColour,
        'stroke-width': tokens.lineWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': tokens.lineStyle === 'dashed' ? '8 5' : undefined,
        class: tokens.animation ? 'draw-line' : undefined,
      }),
    );
    points.forEach((p) => {
      svg.appendChild(
        el('circle', {
          cx: p.x,
          cy: p.y,
          r: tokens.markerSize,
          fill: tokens.markerColour,
          stroke: typeof tokens.surfaceBackground === 'string' && tokens.surfaceBackground.startsWith('#')
            ? tokens.surfaceBackground
            : '#0b1f3a',
          'stroke-width': 2,
          class: 'data-point',
          'data-label': `${p.month}: ${formatSales(p.sales)}`,
          tabindex: '0',
        }),
      );
      if (!tokens.compact) {
        const value = el('text', {
          x: p.x,
          y: p.y - 12,
          fill: tokens.primaryTextColour,
          'font-size': tokens.highContrast ? 12 : 11,
          'font-weight': tokens.highContrast ? 700 : 500,
          'text-anchor': 'middle',
          'font-family': tokens.fontFamily,
        });
        value.textContent = formatSales(p.sales);
        svg.appendChild(value);
      }
    });
  } else {
    const gap = plotW / n;
    const barW = Math.min(tokens.compact ? 36 : 56, gap * 0.55);
    points.forEach((p, i) => {
      const x = pad.left + gap * i + (gap - barW) / 2;
      const barH = pad.top + plotH - p.y;
      svg.appendChild(
        el('rect', {
          x,
          y: p.y,
          width: barW,
          height: barH,
          rx: tokens.barRadius,
          fill: tokens.primaryDataColour,
          class: `data-bar${tokens.animation ? ' grow-bar' : ''}`,
          'data-label': `${p.month}: ${formatSales(p.sales)}`,
          tabindex: '0',
        }),
      );
      const value = el('text', {
        x: x + barW / 2,
        y: p.y - 8,
        fill: tokens.primaryTextColour,
        'font-size': tokens.compact ? 10 : 11,
        'font-weight': tokens.highContrast ? 700 : 500,
        'text-anchor': 'middle',
        'font-family': tokens.fontFamily,
      });
      value.textContent = formatSales(p.sales);
      svg.appendChild(value);
    });
  }

  container.appendChild(svg);

  if (enableHover && tokens.animation !== false && styleAllowsHover(tokens)) {
    attachTooltip(container, tokens);
  }
}

function styleAllowsHover(tokens) {
  // Print form: no hover controls
  return tokens.animation !== false || tokens.primaryDataColour !== '#111827';
}

function renderTable(container, tokens) {
  const wrap = document.createElement('div');
  wrap.className = 'table-form';
  wrap.style.minHeight = '320px';

  const heading = document.createElement('h2');
  heading.textContent = 'Monthly Sales Performance';
  Object.assign(heading.style, {
    margin: '0 0 1rem',
    color: tokens.titleColour,
    fontSize: `${tokens.titleSize}px`,
    fontWeight: String(tokens.titleWeight),
    fontFamily: tokens.fontFamily,
  });
  wrap.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'rendered-data-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontFamily = tokens.fontFamily;
  table.innerHTML = `
    <thead>
      <tr>
        <th style="text-align:left;padding:0.65rem;border-bottom:1px solid ${tokens.gridColour};color:${tokens.secondaryTextColour}">Month</th>
        <th style="text-align:right;padding:0.65rem;border-bottom:1px solid ${tokens.gridColour};color:${tokens.secondaryTextColour}">Sales</th>
        <th style="text-align:right;padding:0.65rem;border-bottom:1px solid ${tokens.gridColour};color:${tokens.secondaryTextColour}">Δ vs prev</th>
      </tr>
    </thead>
    <tbody>
      ${SALES_DATA.map((d, i) => {
        const prev = i === 0 ? d.sales : SALES_DATA[i - 1].sales;
        const delta = d.sales - prev;
        const deltaText = i === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta} lakh`;
        return `<tr class="table-row">
          <td style="padding:0.65rem;border-bottom:1px solid ${tokens.gridColour};color:${tokens.primaryTextColour}">${d.month}</td>
          <td style="padding:0.65rem;border-bottom:1px solid ${tokens.gridColour};text-align:right;color:${tokens.primaryDataColour};font-weight:700">${formatSales(d.sales)}</td>
          <td style="padding:0.65rem;border-bottom:1px solid ${tokens.gridColour};text-align:right;color:${tokens.secondaryTextColour}">${deltaText}</td>
        </tr>`;
      }).join('')}
    </tbody>
  `;
  wrap.appendChild(table);
  container.appendChild(wrap);
}

function renderKpi(container, tokens) {
  const first = SALES_DATA[0].sales;
  const last = SALES_DATA[SALES_DATA.length - 1].sales;
  const growth = (((last - first) / first) * 100).toFixed(0);
  const avg = (SALES_DATA.reduce((s, d) => s + d.sales, 0) / SALES_DATA.length).toFixed(1);

  const wrap = document.createElement('div');
  wrap.className = 'kpi-form';
  wrap.style.minHeight = '320px';
  wrap.style.display = 'grid';
  wrap.style.gap = '1rem';

  const heading = document.createElement('h2');
  heading.textContent = 'Monthly Sales Performance';
  Object.assign(heading.style, {
    margin: 0,
    color: tokens.titleColour,
    fontSize: `${tokens.titleSize}px`,
    fontWeight: String(tokens.titleWeight),
  });
  wrap.appendChild(heading);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = tokens.compact ? '1fr' : 'repeat(3, 1fr)';
  grid.style.gap = '0.75rem';

  const cards = [
    { label: 'Latest (April)', value: formatSales(last), hint: 'Current month' },
    { label: 'Growth vs Jan', value: `+${growth}%`, hint: 'Same data, KPI packaging' },
    { label: 'Average', value: formatSales(avg), hint: '4-month mean' },
  ];

  cards.forEach((c) => {
    const card = document.createElement('article');
    card.style.padding = '1rem';
    card.style.borderRadius = '10px';
    card.style.border = `1px solid ${tokens.borderTreatment === 'none' ? tokens.gridColour : tokens.borderColour}`;
    card.style.background =
      typeof tokens.surfaceBackground === 'string' && tokens.surfaceBackground.startsWith('linear')
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.03)';
    card.innerHTML = `
      <div style="color:${tokens.secondaryTextColour};font-size:0.8rem;margin-bottom:0.35rem">${c.label}</div>
      <div style="color:${tokens.primaryDataColour};font-size:${tokens.compact ? '1.5rem' : '2rem'};font-weight:700;line-height:1.1">${c.value}</div>
      <div style="color:${tokens.secondaryTextColour};font-size:0.75rem;margin-top:0.4rem">${c.hint}</div>
    `;
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  const note = document.createElement('p');
  note.style.color = tokens.secondaryTextColour;
  note.style.fontSize = '0.85rem';
  note.textContent = 'Same underlying sales data and analytical purpose — packaged as KPI cards.';
  wrap.appendChild(note);
  container.appendChild(wrap);
}

function renderText(container, tokens) {
  const wrap = document.createElement('article');
  wrap.className = 'text-form';
  wrap.style.minHeight = '320px';

  const heading = document.createElement('h2');
  heading.textContent = 'Monthly Sales Performance';
  Object.assign(heading.style, {
    margin: '0 0 0.75rem',
    color: tokens.titleColour,
    fontSize: `${tokens.titleSize}px`,
    fontWeight: String(tokens.titleWeight),
  });
  wrap.appendChild(heading);

  const sentence = document.createElement('p');
  sentence.className = 'sentence-example';
  sentence.style.fontSize = tokens.compact ? '1rem' : '1.15rem';
  sentence.style.lineHeight = '1.55';
  sentence.style.color = tokens.primaryTextColour;
  sentence.style.padding = '0.85rem 1rem';
  sentence.style.borderLeft = `4px solid ${tokens.primaryDataColour}`;
  sentence.style.background =
    typeof tokens.surfaceBackground === 'string' && tokens.surfaceBackground.startsWith('#')
      ? 'rgba(0,0,0,0.04)'
      : 'rgba(255,255,255,0.08)';
  sentence.innerHTML = `<strong style="color:${tokens.primaryDataColour}">${SENTENCE_EXAMPLE.content}</strong>`;
  wrap.appendChild(sentence);

  const lead = document.createElement('p');
  lead.style.color = tokens.primaryTextColour;
  lead.style.lineHeight = '1.6';
  lead.innerHTML = `Sales moved from <strong style="color:${tokens.primaryDataColour}">₹10 lakh</strong> in January to <strong style="color:${tokens.primaryDataColour}">₹18 lakh</strong> in April.`;
  wrap.appendChild(lead);

  const list = document.createElement('ul');
  list.style.color = tokens.secondaryTextColour;
  list.style.lineHeight = '1.7';
  SALES_DATA.forEach((d) => {
    const li = document.createElement('li');
    li.innerHTML = `<span style="color:${tokens.primaryTextColour}">${d.month}</span> — <strong style="color:${tokens.primaryDataColour}">${formatSales(d.sales)}</strong>`;
    list.appendChild(li);
  });
  wrap.appendChild(list);

  const note = document.createElement('p');
  note.style.marginTop = '1rem';
  note.style.fontSize = '0.82rem';
  note.style.color = tokens.secondaryTextColour;
  note.textContent = SENTENCE_EXAMPLE.note;
  wrap.appendChild(note);

  container.appendChild(wrap);
}

function attachTooltip(container, tokens) {
  const tooltip = document.createElement('div');
  tooltip.className = 'form-tooltip';
  tooltip.style.background = tokens.tooltipSurface;
  tooltip.style.color = tokens.tooltipText;
  tooltip.style.boxShadow = tokens.tooltipShadow;
  tooltip.hidden = true;
  container.appendChild(tooltip);

  container.querySelectorAll('.data-point, .data-bar').forEach((node) => {
    const show = (e) => {
      tooltip.hidden = false;
      tooltip.textContent = node.getAttribute('data-label');
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left + 12}px`;
      tooltip.style.top = `${e.clientY - rect.top + 12}px`;
    };
    node.addEventListener('mouseenter', show);
    node.addEventListener('mousemove', show);
    node.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
    node.addEventListener('focus', () => {
      tooltip.hidden = false;
      tooltip.textContent = node.getAttribute('data-label');
      tooltip.style.left = '16px';
      tooltip.style.top = '16px';
    });
    node.addEventListener('blur', () => {
      tooltip.hidden = true;
    });
  });
}

function el(name, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined) node.setAttribute(k, String(v));
  });
  return node;
}
