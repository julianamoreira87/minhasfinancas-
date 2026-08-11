/*
 * Persistência local (localStorage). Uma única lista de transações para
 * todos os meses; a UI agrupa por mês (campo `month`, formato 'YYYY-MM').
 */

const STORAGE_KEY = 'financas:transactions:v1';

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Falha ao ler dados salvos, iniciando vazio.', err);
    return [];
  }
}

function saveTransactions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function uid() {
  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function monthOf(dateStr) {
  return (dateStr || '').slice(0, 7);
}

const Store = {
  all() {
    return loadTransactions();
  },

  forMonth(month) {
    return loadTransactions()
      .filter((t) => t.month === month)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  months() {
    const set = new Set(loadTransactions().map((t) => t.month));
    return Array.from(set).sort();
  },

  add(tx) {
    const list = loadTransactions();
    const full = { id: uid(), month: monthOf(tx.date), ...tx };
    list.push(full);
    saveTransactions(list);
    return full;
  },

  addMany(txs) {
    const list = loadTransactions();
    const added = txs.map((tx) => ({ id: uid(), month: monthOf(tx.date), ...tx }));
    saveTransactions(list.concat(added));
    return added;
  },

  update(id, patch) {
    const list = loadTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...patch };
    if (patch.date) updated.month = monthOf(patch.date);
    list[idx] = updated;
    saveTransactions(list);
    return updated;
  },

  remove(id) {
    const list = loadTransactions().filter((t) => t.id !== id);
    saveTransactions(list);
  },

  clearMonth(month) {
    const list = loadTransactions().filter((t) => t.month !== month);
    saveTransactions(list);
  },

  replaceAll(list) {
    saveTransactions(list);
  },

  // Evita importar o mesmo lançamento duas vezes (mesma data+descrição+valor+conta).
  existingFingerprints() {
    return new Set(
      loadTransactions().map((t) => `${t.date}|${t.description}|${t.amount}|${t.account}`)
    );
  },
};
