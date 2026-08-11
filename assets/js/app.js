/*
 * Controlador do painel: estado do mês atual, renderização dos cards,
 * gráficos e tabela, e todos os fluxos de entrada de dados (lançamento
 * manual, importação de PDF, dados de exemplo, backup).
 */

const CATEGORY_SECTIONS = [
  { label: 'Receitas', categories: ['Salário', 'Receita (Pix recebido)', 'Rendimentos'] },
  {
    label: 'Despesas',
    categories: [
      'Moradia', 'Energia', 'Internet e Telefonia', 'Streaming e Assinaturas', 'Contas e Assinaturas',
      'Mercado', 'Restaurante', 'Padaria', 'Combustível', 'Transporte por app', 'Farmácia',
      'Plano de Saúde', 'Academia', 'Cinema e Lazer', 'Presentes', 'Esporte', 'Eletrodomésticos',
      'Compras diversas', 'Pet', 'Serviços domésticos', 'Seguros', 'Tarifas bancárias', 'Saque',
      'Educação e Cultura', 'Pix enviado', 'Outros',
    ],
  },
  { label: 'Especiais', categories: ['Investimentos', 'Pagamento de Fatura'] },
];

let state = {
  month: null, // 'YYYY-MM'
  filterText: '',
  filterCategory: '',
  filterFlow: '',
};

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pickInitialMonth() {
  const months = Store.months();
  return months.length ? months[months.length - 1] : todayMonth();
}

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}

function monthLabelLong(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatDateBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function addMonths(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// --- Populate selects --------------------------------------------------

function populateCategorySelect(select, { includeEmpty = false } = {}) {
  select.innerHTML = '';
  if (includeEmpty) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Todas categorias';
    select.appendChild(opt);
  }
  for (const section of CATEGORY_SECTIONS) {
    const group = document.createElement('optgroup');
    group.label = section.label;
    for (const cat of section.categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      group.appendChild(opt);
    }
    select.appendChild(group);
  }
}

// --- Rendering -----------------------------------------------------------

function computeSummary(txs) {
  let receitas = 0, despesas = 0, investimentos = 0, transferencias = 0;
  for (const t of txs) {
    const flow = getFlowType(t);
    if (flow === 'receita') receitas += t.amount;
    else if (flow === 'despesa') despesas += t.amount; // negativo
    else if (flow === 'investimento') investimentos += t.amount;
    else transferencias += t.amount;
  }
  return { receitas, despesas, investimentos, transferencias, saldo: receitas + despesas };
}

let heroRendered = false;

function renderHero(month, s) {
  const prevMonth = addMonths(month, -1);
  const prevTxs = Store.forMonth(prevMonth);
  const hero = document.getElementById('hero-balance');
  const eyebrow = document.getElementById('hero-eyebrow');
  const valueEl = document.getElementById('hero-value');
  const deltaEl = document.getElementById('hero-delta');

  eyebrow.textContent = `Saldo de ${monthLabelLong(month)}`;
  valueEl.textContent = fmtBRL(s.saldo);
  valueEl.className = `hero-value tone-${s.saldo >= 0 ? 'good' : 'bad'}`;

  if (prevTxs.length === 0) {
    deltaEl.textContent = '';
  } else {
    const prevSaldo = computeSummary(prevTxs).saldo;
    const diff = s.saldo - prevSaldo;
    const arrow = diff >= 0 ? '▲' : '▼';
    const tone = diff >= 0 ? 'good' : 'bad';
    const text = prevSaldo !== 0
      ? `${(Math.abs(diff / prevSaldo) * 100).toFixed(1)}% vs ${monthLabel(prevMonth)}`
      : `${fmtBRL(Math.abs(diff))} vs ${monthLabel(prevMonth)}`;
    deltaEl.className = `hero-delta tone-${tone}`;
    deltaEl.innerHTML = `<span class="arrow">${arrow}</span>${text}`;
  }

  hero.classList.remove('hero-reveal', 'hero-update');
  // reflow para reiniciar a animação de entrada mesmo trocando só o texto
  void hero.offsetWidth;
  hero.classList.add(heroRendered ? 'hero-update' : 'hero-reveal');
  heroRendered = true;
}

function renderStatementStrip(s) {
  const container = document.getElementById('summary-cards');
  const stats = [
    { label: 'Receitas do mês', value: s.receitas, tone: 'good' },
    { label: 'Despesas do mês', value: s.despesas, tone: 'bad' },
    { label: 'Aportes em investimentos', value: s.investimentos, tone: 'neutral' },
  ];
  container.innerHTML = '';
  for (const stat of stats) {
    const el = document.createElement('div');
    el.className = 'statement-stat';
    el.innerHTML = `
      <span class="eyebrow">${stat.label}</span>
      <span class="statement-value tone-${stat.tone}">${fmtBRL(stat.value)}</span>
    `;
    container.appendChild(el);
  }
}

function renderCharts(month, txs) {
  const groupTotals = GROUPS.map((g) => ({
    ...g,
    value: txs
      .filter((t) => getFlowType(t) === 'despesa' && CATEGORY_GROUP[t.category] === g.id)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
  }));
  renderCategoryDonut(document.getElementById('donut-container'), groupTotals, 'Total gasto');

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(month, -i);
    const mTxs = Store.forMonth(m);
    const s = computeSummary(mTxs);
    months.push({ month: m, label: monthLabel(m), receitas: s.receitas, despesas: Math.abs(s.despesas) });
  }
  const hasAny = months.some((m) => m.receitas > 0 || m.despesas > 0);
  renderDivergingTrend(document.getElementById('trend-container'), hasAny ? months : []);
}

function applyFilters(txs) {
  return txs.filter((t) => {
    if (state.filterText && !t.description.toLowerCase().includes(state.filterText.toLowerCase())) return false;
    if (state.filterCategory && t.category !== state.filterCategory) return false;
    if (state.filterFlow && getFlowType(t) !== state.filterFlow) return false;
    return true;
  });
}

function renderTable(allTxs) {
  const tbody = document.getElementById('tx-tbody');
  const empty = document.getElementById('tx-empty');
  const filtered = applyFilters(allTxs);
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    empty.hidden = false;
    empty.textContent = allTxs.length === 0
      ? 'Nenhum lançamento neste mês ainda. Importe um relatório, carregue os dados de exemplo ou adicione manualmente.'
      : 'Nenhum lançamento corresponde ao filtro atual.';
  } else {
    empty.hidden = true;
  }

  for (const t of filtered) {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = formatDateBR(t.date);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = t.description;
    tdDesc.className = 'col-desc';

    const tdCat = document.createElement('td');
    const catSelect = document.createElement('select');
    catSelect.className = 'inline-select';
    populateCategorySelect(catSelect);
    catSelect.value = t.category;
    catSelect.addEventListener('change', () => {
      Store.update(t.id, { category: catSelect.value });
      refresh();
    });
    tdCat.appendChild(catSelect);

    const tdAccount = document.createElement('td');
    tdAccount.textContent = t.account;
    tdAccount.className = 'col-account';

    const tdValue = document.createElement('td');
    tdValue.className = `num tone-${t.amount >= 0 ? 'good' : 'bad'}`;
    tdValue.textContent = fmtBRL(t.amount);

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'row-action';
    delBtn.setAttribute('aria-label', 'Excluir lançamento');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      if (confirm(`Excluir o lançamento "${t.description}"?`)) {
        Store.remove(t.id);
        refresh();
      }
    });
    tdActions.appendChild(delBtn);

    tr.append(tdDate, tdDesc, tdCat, tdAccount, tdValue, tdActions);
    tbody.appendChild(tr);
  }
}

function renderMonthChips() {
  const container = document.getElementById('month-chips');
  const months = Store.months();
  container.innerHTML = '';
  for (const m of months) {
    const btn = document.createElement('button');
    btn.className = 'month-chip' + (m === state.month ? ' active' : '');
    btn.textContent = monthLabel(m);
    btn.addEventListener('click', () => setMonth(m));
    container.appendChild(btn);
  }
}

function refresh() {
  document.getElementById('month-input').value = state.month;
  renderMonthChips();
  const txs = Store.forMonth(state.month);
  const summary = computeSummary(txs);
  renderHero(state.month, summary);
  renderStatementStrip(summary);
  renderCharts(state.month, txs);
  renderTable(txs);
}

function setMonth(month) {
  state.month = month;
  refresh();
}

// --- Toolbar: manual entry -------------------------------------------------

function initManualEntryModal() {
  const modal = document.getElementById('modal-tx');
  const form = document.getElementById('form-tx');
  const catSelect = document.getElementById('tx-category');
  populateCategorySelect(catSelect);

  document.getElementById('btn-new-tx').addEventListener('click', () => {
    form.reset();
    document.getElementById('tx-date').value = `${state.month}-01`;
    catSelect.value = 'Outros';
    modal.showModal();
  });
  document.getElementById('tx-cancel').addEventListener('click', () => modal.close());

  form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-desc').value.trim();
    const category = catSelect.value;
    const account = document.getElementById('tx-account').value.trim() || 'Conta corrente';
    const sign = document.getElementById('tx-sign').value;
    const rawAmount = parseFloat(document.getElementById('tx-amount').value);
    if (!date || !description || Number.isNaN(rawAmount)) return;
    const amount = sign === 'despesa' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    Store.add({ date, description, category, account, amount, source: 'manual' });
    modal.close();
    setMonth(monthOfDate(date));
  });
}

function monthOfDate(dateStr) {
  return dateStr.slice(0, 7);
}

// --- Toolbar: PDF import -----------------------------------------------------

let pendingImport = [];

function initImportModal() {
  const fileInput = document.getElementById('file-pdf');
  const modal = document.getElementById('modal-import');

  document.getElementById('btn-import-pdf').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const result = await importPdfFile(file);
      if (result.type === 'desconhecido' || result.transactions.length === 0) {
        alert('Não foi possível reconhecer este PDF como fatura de cartão ou extrato bancário no formato suportado.');
        return;
      }
      openImportPreview(result);
    } catch (err) {
      console.error(err);
      alert('Erro ao ler o PDF: ' + err.message);
    }
  });

  document.getElementById('import-cancel').addEventListener('click', () => modal.close());
  document.getElementById('import-confirm').addEventListener('click', () => {
    const rows = Array.from(document.querySelectorAll('#import-tbody tr'));
    const toAdd = [];
    rows.forEach((row, i) => {
      const checkbox = row.querySelector('input[type=checkbox]');
      const catSelect = row.querySelector('select');
      if (checkbox.checked) {
        toAdd.push({ ...pendingImport[i], category: catSelect.value });
      }
    });
    if (toAdd.length) {
      Store.addMany(toAdd);
      const months = new Set(toAdd.map((t) => monthOfDate(t.date)));
      setMonth(Array.from(months).sort().pop());
    }
    modal.close();
  });
}

function openImportPreview(result) {
  pendingImport = result.transactions;
  const existing = Store.existingFingerprints();
  const modal = document.getElementById('modal-import');
  const tbody = document.getElementById('import-tbody');
  tbody.innerHTML = '';

  const docTypeLabel = result.type === 'fatura' ? 'fatura de cartão' : 'extrato bancário';
  document.getElementById('import-summary').textContent =
    `${result.sourceFile}: ${result.transactions.length} lançamento(s) encontrados (${docTypeLabel}). ` +
    (result.skipped.length ? `${result.skipped.length} linha(s) ignoradas por não seguir o padrão esperado. ` : '') +
    'Já marcados os que parecem novos; desmarque o que não quiser importar.';

  pendingImport.forEach((t) => {
    const fingerprint = `${t.date}|${t.description}|${t.amount}|${t.account}`;
    const isDuplicate = existing.has(fingerprint);

    const tr = document.createElement('tr');
    if (isDuplicate) tr.className = 'row-duplicate';

    const tdCheck = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !isDuplicate;
    tdCheck.appendChild(checkbox);

    const tdDate = document.createElement('td');
    tdDate.textContent = formatDateBR(t.date);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = t.description + (isDuplicate ? ' (já importado)' : '');

    const tdCat = document.createElement('td');
    const catSelect = document.createElement('select');
    catSelect.className = 'inline-select';
    populateCategorySelect(catSelect);
    catSelect.value = t.category;
    tdCat.appendChild(catSelect);

    const tdValue = document.createElement('td');
    tdValue.className = `num tone-${t.amount >= 0 ? 'good' : 'bad'}`;
    tdValue.textContent = fmtBRL(t.amount);

    tr.append(tdCheck, tdDate, tdDesc, tdCat, tdValue);
    tbody.appendChild(tr);
  });

  modal.showModal();
}

// --- Toolbar: demo data, backup, clear --------------------------------------

function initMiscToolbar() {
  document.getElementById('btn-demo').addEventListener('click', () => {
    const existing = Store.existingFingerprints();
    const toAdd = DEMO_TRANSACTIONS.filter((t) => !existing.has(`${t.date}|${t.description}|${t.amount}|${t.account}`));
    if (toAdd.length === 0) {
      alert('Os dados de exemplo já estão carregados.');
      return;
    }
    Store.addMany(toAdd);
    setMonth('2026-07');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas-backup-${todayMonth()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const fileJson = document.getElementById('file-json');
  document.getElementById('btn-import-json').addEventListener('click', () => fileJson.click());
  fileJson.addEventListener('change', async () => {
    const file = fileJson.files[0];
    fileJson.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      if (!confirm(`Restaurar backup vai SUBSTITUIR todos os ${Store.all().length} lançamentos salvos por ${data.length} do arquivo. Continuar?`)) return;
      Store.replaceAll(data);
      state.month = pickInitialMonth();
      refresh();
    } catch (err) {
      alert('Não foi possível ler este arquivo de backup: ' + err.message);
    }
  });

  document.getElementById('btn-clear-month').addEventListener('click', () => {
    const count = Store.forMonth(state.month).length;
    if (count === 0) return;
    if (confirm(`Excluir os ${count} lançamentos de ${monthLabel(state.month)}? Essa ação não pode ser desfeita.`)) {
      Store.clearMonth(state.month);
      refresh();
    }
  });
}

// --- Toolbar: month nav + filters -------------------------------------------

function initMonthNav() {
  document.getElementById('month-input').addEventListener('change', (evt) => setMonth(evt.target.value));
  document.getElementById('prev-month').addEventListener('click', () => setMonth(addMonths(state.month, -1)));
  document.getElementById('next-month').addEventListener('click', () => setMonth(addMonths(state.month, 1)));
}

function initFilters() {
  populateCategorySelect(document.getElementById('filter-category'), { includeEmpty: true });
  document.getElementById('filter-text').addEventListener('input', (evt) => {
    state.filterText = evt.target.value;
    renderTable(Store.forMonth(state.month));
  });
  document.getElementById('filter-category').addEventListener('change', (evt) => {
    state.filterCategory = evt.target.value;
    renderTable(Store.forMonth(state.month));
  });
  document.getElementById('filter-flow').addEventListener('change', (evt) => {
    state.filterFlow = evt.target.value;
    renderTable(Store.forMonth(state.month));
  });
}

// --- Init --------------------------------------------------------------------

function init() {
  state.month = pickInitialMonth();
  initMonthNav();
  initFilters();
  initManualEntryModal();
  initImportModal();
  initMiscToolbar();
  refresh();

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      renderCharts(state.month, Store.forMonth(state.month));
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
