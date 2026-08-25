/*
 * Fonte de verdade dos lançamentos: o banco de dados (Supabase), acessado
 * através de db.js. Guardamos os lançamentos já carregados numa lista em
 * memória (`cache`) para que a tela possa ler dados na hora, sem esperar
 * rede a cada clique — só as operações de gravação (`add`, `update`...)
 * fazem uma chamada de rede, e cada uma delas atualiza o cache em seguida.
 *
 * Também espelhamos o cache no localStorage como uma cópia de reserva: se
 * o navegador abrir sem internet, o app ainda mostra os últimos dados
 * sincronizados (modo somente leitura, ver Store.online).
 */

const OFFLINE_CACHE_KEY = 'financas:cache:v1';

function loadOfflineCache() {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveOfflineCache(list) {
  try { localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(list)); } catch { /* localStorage indisponível: ignora */ }
}

function monthOf(dateStr) {
  return (dateStr || '').slice(0, 7);
}

let cache = [];

const Store = {
  online: true,

  // Busca tudo do banco e prepara o cache local. Chamar uma vez, no início.
  async init() {
    try {
      await DB.init();
      cache = await DB.fetchAllLancamentos();
      saveOfflineCache(cache);
      this.online = true;
    } catch (err) {
      console.error('Não foi possível conectar ao banco de dados, usando última cópia salva neste navegador.', err);
      cache = loadOfflineCache();
      this.online = false;
    }
    return cache;
  },

  all() {
    return cache;
  },

  forMonth(month) {
    return cache.filter((t) => t.month === month).sort((a, b) => a.date.localeCompare(b.date));
  },

  months() {
    return Array.from(new Set(cache.map((t) => t.month))).sort();
  },

  async add(tx) {
    const saved = await DB.insertLancamento(tx);
    cache.push(saved);
    saveOfflineCache(cache);
    return saved;
  },

  async addMany(txs) {
    const saved = await DB.insertManyLancamentos(txs);
    cache = cache.concat(saved);
    saveOfflineCache(cache);
    return saved;
  },

  async update(id, patch) {
    await DB.updateLancamento(id, patch);
    const idx = cache.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const updated = { ...cache[idx], ...patch };
      if (patch.date) updated.month = monthOf(patch.date);
      cache[idx] = updated;
      saveOfflineCache(cache);
      return updated;
    }
    return null;
  },

  async remove(id) {
    await DB.removeLancamento(id);
    cache = cache.filter((t) => t.id !== id);
    saveOfflineCache(cache);
  },

  async clearMonth(month) {
    await DB.clearMonthLancamentos(month);
    cache = cache.filter((t) => t.month !== month);
    saveOfflineCache(cache);
  },

  async replaceAll(list) {
    const saved = await DB.replaceAllLancamentos(list);
    cache = saved;
    saveOfflineCache(cache);
  },

  // Evita importar o mesmo lançamento duas vezes (mesma data+descrição+valor+conta).
  existingFingerprints() {
    return new Set(cache.map((t) => `${t.date}|${t.description}|${t.amount}|${t.account}`));
  },
};
