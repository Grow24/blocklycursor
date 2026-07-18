/**
 * PBMP Form Workbench UI — full integration
 * Gap: GAP-FORM-TEMPLATE-001
 */
import {
  FUNCTIONALITY,
  FUNCTIONAL_DEFINITION,
  SALES_DATA,
  FORM_TYPES,
  STYLE_TEMPLATES,
  TOKEN_INTERPRETATION,
  ATTRIBUTE_MATRIX,
  TEMPLATE_LAYERS,
  PRINCIPLES,
  SENTENCE_EXAMPLE,
  VIEWPORTS,
  STORAGE_KEY,
} from './templates.js';
import { renderForm } from './render.js';

const state = loadState({
  formType: 'line_chart',
  styleId: 'executive_light',
  compareStyleId: 'executive_dark',
  compareMode: false,
  viewport: 'desktop',
  matrixFilter: 'all',
  matrixSearch: '',
  matrixApplicableOnly: false,
  showSentencePanel: true,
});

const els = {
  formTypeGroup: document.getElementById('form-type-group'),
  styleGroup: document.getElementById('style-group'),
  preview: document.getElementById('form-preview'),
  previewCompare: document.getElementById('form-preview-compare'),
  previewMeta: document.getElementById('preview-meta'),
  previewFrame: document.getElementById('preview-frame'),
  compareFrame: document.getElementById('compare-frame'),
  comparePanel: document.getElementById('compare-panel'),
  dataTable: document.getElementById('data-table-body'),
  comboMatrix: document.getElementById('combo-matrix'),
  variantTable: document.getElementById('variant-table-body'),
  tokenTable: document.getElementById('token-table-body'),
  layerStack: document.getElementById('layer-stack'),
  attributeBody: document.getElementById('attribute-body'),
  matrixFilter: document.getElementById('matrix-filter'),
  matrixSearch: document.getElementById('matrix-search'),
  matrixApplicable: document.getElementById('matrix-applicable'),
  conceptCards: document.getElementById('concept-cards'),
  functionalDef: document.getElementById('functional-def'),
  principles: document.getElementById('principles'),
  unchangedList: document.getElementById('unchanged-list'),
  styleInspector: document.getElementById('style-inspector'),
  viewportGroup: document.getElementById('viewport-group'),
  compareToggle: document.getElementById('compare-toggle'),
  compareStyleSelect: document.getElementById('compare-style-select'),
  gallery: document.getElementById('style-gallery'),
  sentencePanel: document.getElementById('sentence-panel'),
  exportBtn: document.getElementById('btn-export-json'),
  copyBtn: document.getElementById('btn-copy-json'),
  toast: document.getElementById('toast'),
};

function loadState(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      formType: state.formType,
      styleId: state.styleId,
      compareStyleId: state.compareStyleId,
      compareMode: state.compareMode,
      viewport: state.viewport,
    }),
  );
}

function currentStyle() {
  return STYLE_TEMPLATES[state.styleId];
}

function compareStyle() {
  return STYLE_TEMPLATES[state.compareStyleId];
}

function currentForm() {
  return FORM_TYPES.find((f) => f.id === state.formType);
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('visible');
  setTimeout(() => els.toast.classList.remove('visible'), 2400);
}

function renderControls() {
  els.formTypeGroup.innerHTML = FORM_TYPES.map(
    (f) => `
    <button type="button" class="choice-card ${state.formType === f.id ? 'active' : ''}" data-form="${f.id}">
      <strong>${f.label}</strong>
      <span>${f.description}</span>
    </button>
  `,
  ).join('');

  els.styleGroup.innerHTML = Object.values(STYLE_TEMPLATES)
    .map(
      (s) => `
    <button type="button" class="choice-card style-card ${state.styleId === s.id ? 'active' : ''}" data-style="${s.id}">
      <span class="swatch" style="background:${typeof s.tokens.surfaceBackground === 'string' && s.tokens.surfaceBackground.startsWith('#') ? s.tokens.surfaceBackground : '#0b1f3a'}; border-color:${s.tokens.primaryDataColour}"></span>
      <div>
        <strong>${s.name}</strong>
        <span>${s.purpose}</span>
      </div>
    </button>
  `,
    )
    .join('');

  els.compareStyleSelect.innerHTML = Object.values(STYLE_TEMPLATES)
    .map(
      (s) =>
        `<option value="${s.id}" ${state.compareStyleId === s.id ? 'selected' : ''}>${s.name}</option>`,
    )
    .join('');

  els.viewportGroup.innerHTML = VIEWPORTS.map(
    (v) => `
    <button type="button" class="chip ${state.viewport === v.id ? 'active' : ''}" data-viewport="${v.id}">${v.label}</button>
  `,
  ).join('');

  els.compareToggle.checked = state.compareMode;
}

function renderDataTable() {
  els.dataTable.innerHTML = SALES_DATA.map(
    (d) => `<tr><td>${d.month}</td><td>₹${d.sales} lakh</td></tr>`,
  ).join('');
}

function applyViewport() {
  const vp = VIEWPORTS.find((v) => v.id === state.viewport) || VIEWPORTS[0];
  els.previewFrame.style.width = vp.width;
  els.compareFrame.style.width = vp.width;
}

function renderPreview() {
  const style = currentStyle();
  const form = currentForm();
  els.previewMeta.textContent = `${form.label} · ${style.name} · data unchanged · ${state.viewport}`;
  applyViewport();
  renderForm(els.preview, {
    formType: state.formType,
    style,
    enableHover: style.id !== 'print',
  });

  els.comparePanel.hidden = !state.compareMode;
  if (state.compareMode) {
    const other = compareStyle();
    document.getElementById('compare-meta').textContent = `${form.label} · ${other.name}`;
    renderForm(els.previewCompare, {
      formType: state.formType,
      style: other,
      enableHover: other.id !== 'print',
    });
  }
}

function renderComboMatrix() {
  const chartForms = ['line_chart', 'bar_chart'];
  const styles = ['executive_light', 'executive_dark'];
  const cells = [];
  chartForms.forEach((form) => {
    styles.forEach((style) => {
      const labelMap = {
        'line_chart|executive_light': 'Blue line on white',
        'line_chart|executive_dark': 'Cyan line on dark',
        'bar_chart|executive_light': 'Blue bars on white',
        'bar_chart|executive_dark': 'Cyan bars on dark',
      };
      cells.push({ form, style, label: labelMap[`${form}|${style}`] });
    });
  });

  els.comboMatrix.innerHTML = cells
    .map(({ form, style, label }) => {
      const active = state.formType === form && state.styleId === style;
      return `
      <button type="button" class="combo-cell ${active ? 'active' : ''}" data-form="${form}" data-style="${style}">
        <strong>${FORM_TYPES.find((f) => f.id === form).label}</strong>
        <span>${STYLE_TEMPLATES[style].name}</span>
        <em>${label}</em>
      </button>`;
    })
    .join('');
}

function renderVariantTable() {
  els.variantTable.innerHTML = Object.values(STYLE_TEMPLATES)
    .map((s) => {
      const v = s.variantRow;
      return `<tr class="${state.styleId === s.id ? 'row-active' : ''}" data-style-row="${s.id}">
        <td><button type="button" class="linkish" data-style="${s.id}">${s.name}</button></td>
        <td>${v.background}</td>
        <td>${v.font}</td>
        <td>${v.linePresentation}</td>
        <td>${v.other}</td>
      </tr>`;
    })
    .join('');
}

function renderTokenInterpretation() {
  const key = state.formType;
  els.tokenTable.innerHTML = TOKEN_INTERPRETATION.map(
    (row) => `
    <tr>
      <td>${row.token}</td>
      <td>${row.line_chart}</td>
      <td>${row.bar_chart}</td>
      <td>${row.table}</td>
      <td>${row.kpi_card}</td>
      <td>${row.text}</td>
      <td class="highlight">${row[key]}</td>
    </tr>`,
  ).join('');
}

function renderLayers() {
  const form = currentForm();
  const style = currentStyle();
  const familyMap = {
    chart: 'Chart Family Template',
    tabular: 'Tabular Family Template',
    summary: 'Summary Family Template',
    text: 'Text Family Template',
  };
  const typeMap = {
    line_chart: 'Line Chart Form Template',
    bar_chart: 'Bar Chart Form Template',
    table: 'Table Form Template',
    kpi_card: 'KPI Card Form Template',
    text: 'Paragraph Text Form Template',
  };

  els.layerStack.innerHTML = `
    <div class="layer-card">
      <span class="layer-step">1</span>
      <div>
        <strong>${style.name} · Universal Style Template</strong>
        <p>${TEMPLATE_LAYERS[0].examples}</p>
      </div>
    </div>
    <div class="layer-arrow">↓</div>
    <div class="layer-card">
      <span class="layer-step">2</span>
      <div>
        <strong>${familyMap[form.family]}</strong>
        <p>${TEMPLATE_LAYERS[1].examples}</p>
      </div>
    </div>
    <div class="layer-arrow">↓</div>
    <div class="layer-card active">
      <span class="layer-step">3</span>
      <div>
        <strong>${typeMap[form.id]}</strong>
        <p>${TEMPLATE_LAYERS[2].examples}</p>
      </div>
    </div>
  `;
}

function renderConcepts() {
  els.conceptCards.innerHTML = `
    <article class="concept"><h3>Functionality</h3><p>What the Component does</p><code>${FUNCTIONALITY.name}</code></article>
    <article class="concept"><h3>Functional Configuration</h3><p>How it behaves</p><code>Fixed axes, aggregation, filters</code></article>
    <article class="concept"><h3>Content / Data</h3><p>What information is displayed</p><code>Month × Sales</code></article>
    <article class="concept"><h3>Form Type</h3><p>How it is packaged</p><code>${currentForm().label}</code></article>
    <article class="concept"><h3>Style Template</h3><p>Reusable presentation tokens</p><code>${currentStyle().name}</code></article>
    <article class="concept"><h3>Rendered Instance</h3><p>Actual output</p><code>${currentForm().label} + ${currentStyle().name}</code></article>
  `;
}

function renderFunctionalDef() {
  const rows = Object.entries(FUNCTIONAL_DEFINITION)
    .map(
      ([k, v]) =>
        `<tr><th>${k.replace(/([A-Z])/g, ' $1')}</th><td>${v}</td></tr>`,
    )
    .join('');
  els.functionalDef.innerHTML = `<table class="def-table">${rows}</table>`;
}

function renderPrinciples() {
  els.principles.innerHTML = PRINCIPLES.map(
    (p) => `<article class="principle"><h3>${p.title}</h3><p>${p.body}</p></article>`,
  ).join('');

  els.unchangedList.innerHTML = `
    <div class="split-lists">
      <div>
        <h4>Remains the same</h4>
        <ul>${FUNCTIONALITY.unchanged.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div>
        <h4>Changes with Form Type</h4>
        <ul>${FUNCTIONALITY.changesWithForm.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div>
        <h4>Changes with Style Template</h4>
        <ul>${FUNCTIONALITY.changesWithStyle.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
    </div>
  `;
}

function renderInspector() {
  const t = currentStyle().tokens;
  const entries = Object.entries(t);
  els.styleInspector.innerHTML = entries
    .map(([k, v]) => {
      const isColor = typeof v === 'string' && (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('linear'));
      return `<div class="token-chip">
        <span class="token-key">${k}</span>
        ${isColor && !String(v).startsWith('linear') ? `<span class="token-swatch" style="background:${v}"></span>` : ''}
        <code>${String(v)}</code>
      </div>`;
    })
    .join('');
}

function renderAttributeMatrix() {
  const groups = [...new Set(ATTRIBUTE_MATRIX.map((r) => r.group))];
  els.matrixFilter.innerHTML =
    `<option value="all">All groups</option>` +
    groups
      .map((g) => `<option value="${g}" ${state.matrixFilter === g ? 'selected' : ''}>${g}</option>`)
      .join('');

  els.matrixApplicable.checked = state.matrixApplicableOnly;

  const q = state.matrixSearch.trim().toLowerCase();
  const rows = ATTRIBUTE_MATRIX.filter((r) => {
    if (state.matrixFilter !== 'all' && r.group !== state.matrixFilter) return false;
    if (state.matrixApplicableOnly && r[state.formType] === '—') return false;
    if (!q) return true;
    return (
      r.group.toLowerCase().includes(q) ||
      r.attribute.toLowerCase().includes(q) ||
      r.meaning.toLowerCase().includes(q)
    );
  });

  els.attributeBody.innerHTML = rows
    .map((r) => {
      const focus = r[state.formType];
      return `<tr>
        <td>${r.group}</td>
        <td>${r.attribute}</td>
        <td class="mark ${markClass(r.line_chart)}">${r.line_chart}</td>
        <td class="mark ${markClass(r.bar_chart)}">${r.bar_chart}</td>
        <td class="mark ${markClass(r.table)}">${r.table}</td>
        <td class="mark ${markClass(r.kpi_card)}">${r.kpi_card}</td>
        <td class="mark ${markClass(r.text)}">${r.text}</td>
        <td class="mark focus ${markClass(focus)}">${focus}</td>
        <td>${r.meaning}</td>
      </tr>`;
    })
    .join('');
}

function markClass(v) {
  if (v === '✓') return 'yes';
  if (v === '△') return 'partial';
  return 'no';
}

function renderGallery() {
  els.gallery.innerHTML = Object.values(STYLE_TEMPLATES)
    .map((s) => {
      const active = state.styleId === s.id;
      return `<button type="button" class="gallery-card ${active ? 'active' : ''}" data-style="${s.id}">
        <div class="gallery-preview" id="gallery-${s.id}"></div>
        <strong>${s.name}</strong>
      </button>`;
    })
    .join('');

  // Mini renders after DOM insert
  requestAnimationFrame(() => {
    Object.values(STYLE_TEMPLATES).forEach((s) => {
      const node = document.getElementById(`gallery-${s.id}`);
      if (!node) return;
      renderForm(node, { formType: state.formType, style: s, enableHover: false });
    });
  });
}

function renderSentencePanel() {
  els.sentencePanel.innerHTML = `
    <p class="sentence-quote">“${SENTENCE_EXAMPLE.content}”</p>
    <p class="muted">${SENTENCE_EXAMPLE.note}</p>
    <p><strong>Text Form can differ through:</strong> ${SENTENCE_EXAMPLE.formDiffersThrough.join('; ')}.</p>
  `;
}

function exportPayload() {
  return {
    gap: 'GAP-FORM-TEMPLATE-001',
    functionality: FUNCTIONALITY,
    functional_definition: FUNCTIONAL_DEFINITION,
    data: SALES_DATA,
    form_type: state.formType,
    style_template: currentStyle(),
    layers: {
      universal: currentStyle().name,
      family: currentForm().family,
      form_type: currentForm().label,
    },
    viewport: state.viewport,
    compare: state.compareMode
      ? { style_template: compareStyle().id }
      : null,
  };
}

function refresh() {
  persist();
  renderControls();
  renderConcepts();
  renderPreview();
  renderComboMatrix();
  renderVariantTable();
  renderTokenInterpretation();
  renderLayers();
  renderInspector();
  renderAttributeMatrix();
  renderGallery();
}

function bind() {
  els.formTypeGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-form]');
    if (!btn) return;
    state.formType = btn.dataset.form;
    refresh();
  });

  document.body.addEventListener('click', (e) => {
    const combo = e.target.closest('#combo-matrix [data-form][data-style]');
    if (combo) {
      state.formType = combo.dataset.form;
      state.styleId = combo.dataset.style;
      refresh();
      return;
    }
    const styleBtn = e.target.closest(
      '#style-group [data-style], #style-gallery [data-style], #variant-table-body [data-style]',
    );
    if (styleBtn?.dataset.style) {
      state.styleId = styleBtn.dataset.style;
      refresh();
    }
  });

  els.viewportGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-viewport]');
    if (!btn) return;
    state.viewport = btn.dataset.viewport;
    if (state.viewport === 'mobile') state.styleId = state.styleId === 'print' ? 'mobile' : state.styleId;
    refresh();
  });

  els.compareToggle.addEventListener('change', () => {
    state.compareMode = els.compareToggle.checked;
    refresh();
  });

  els.compareStyleSelect.addEventListener('change', () => {
    state.compareStyleId = els.compareStyleSelect.value;
    refresh();
  });

  els.matrixFilter.addEventListener('change', () => {
    state.matrixFilter = els.matrixFilter.value;
    renderAttributeMatrix();
  });

  els.matrixSearch.addEventListener('input', () => {
    state.matrixSearch = els.matrixSearch.value;
    renderAttributeMatrix();
  });

  els.matrixApplicable.addEventListener('change', () => {
    state.matrixApplicableOnly = els.matrixApplicable.checked;
    renderAttributeMatrix();
  });

  els.exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pbmp-form-${state.formType}-${state.styleId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Form + Style JSON');
  });

  els.copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(exportPayload(), null, 2));
    showToast('Copied config JSON');
  });

  window.addEventListener('resize', () => renderPreview());
}

document.getElementById('functionality-title').textContent = FUNCTIONALITY.name;
document.getElementById('functionality-desc').textContent = FUNCTIONALITY.definition;

renderDataTable();
renderFunctionalDef();
renderPrinciples();
renderSentencePanel();
bind();
refresh();
