/*
 * Camada de acesso ao banco de dados (Supabase/Postgres). Traduz entre o
 * formato interno de lançamento usado pelo app (ver storage.js) e as
 * tabelas do banco (database/schema.sql): lancamentos + categorias +
 * contas + grupos_categoria.
 *
 * A chave usada aqui é a chave PÚBLICA (publishable/anon) do projeto — ela
 * é feita para ficar no código do navegador; quem controla o que dá pra
 * fazer com ela são as políticas de RLS configuradas no banco.
 */

const SUPABASE_URL = 'https://qadrbxxmatysggpyjdfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GBIhaV8SxmBwj3tLRkETCQ_JZi_x7R5';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function rowToTx(row) {
  return {
    id: row.id,
    date: row.data,
    month: row.data.slice(0, 7),
    description: row.descricao,
    amount: Number(row.valor),
    category: row.categorias ? row.categorias.nome : 'Outros',
    account: row.contas ? row.contas.nome : 'Conta corrente',
    source: row.origem,
    mcc: row.mcc || undefined,
    tipo: row.tipo_lancamento || undefined,
    favorecido: row.favorecido_documento || undefined,
  };
}

const LANCAMENTO_SELECT = 'id, data, descricao, valor, origem, mcc, tipo_lancamento, favorecido_documento, categorias(nome), contas(nome)';

const DB = {
  _categoriaIdByName: new Map(),
  _contaIdByName: new Map(),

  async init() {
    const [{ data: categorias, error: e1 }, { data: contas, error: e2 }] = await Promise.all([
      sb.from('categorias').select('id, nome'),
      sb.from('contas').select('id, nome'),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    this._categoriaIdByName = new Map(categorias.map((c) => [c.nome, c.id]));
    this._contaIdByName = new Map(contas.map((c) => [c.nome, c.id]));
  },

  async getOrCreateContaId(nome) {
    if (this._contaIdByName.has(nome)) return this._contaIdByName.get(nome);
    const { data, error } = await sb.from('contas').insert({ nome, tipo: 'outro' }).select('id').single();
    if (error) throw error;
    this._contaIdByName.set(nome, data.id);
    return data.id;
  },

  categoriaId(nome) {
    const id = this._categoriaIdByName.get(nome);
    if (!id) throw new Error(`Categoria desconhecida: ${nome}`);
    return id;
  },

  async fetchAllLancamentos() {
    const { data, error } = await sb.from('lancamentos').select(LANCAMENTO_SELECT).order('data', { ascending: true });
    if (error) throw error;
    return data.map(rowToTx);
  },

  async insertLancamento(tx) {
    const contaId = await this.getOrCreateContaId(tx.account);
    const { data, error } = await sb.from('lancamentos').insert({
      data: tx.date,
      descricao: tx.description,
      valor: tx.amount,
      categoria_id: this.categoriaId(tx.category),
      conta_id: contaId,
      origem: tx.source,
      mcc: tx.mcc || null,
      tipo_lancamento: tx.tipo || null,
      favorecido_documento: tx.favorecido || null,
    }).select('id').single();
    if (error) throw error;
    return { ...tx, id: data.id, month: tx.date.slice(0, 7) };
  },

  async insertManyLancamentos(txs) {
    const rows = [];
    for (const tx of txs) {
      const contaId = await this.getOrCreateContaId(tx.account);
      rows.push({
        data: tx.date,
        descricao: tx.description,
        valor: tx.amount,
        categoria_id: this.categoriaId(tx.category),
        conta_id: contaId,
        origem: tx.source,
        mcc: tx.mcc || null,
        tipo_lancamento: tx.tipo || null,
        favorecido_documento: tx.favorecido || null,
      });
    }
    const { data, error } = await sb.from('lancamentos').insert(rows).select('id');
    if (error) throw error;
    return txs.map((tx, i) => ({ ...tx, id: data[i].id, month: tx.date.slice(0, 7) }));
  },

  async updateLancamento(id, patch) {
    const dbPatch = { updated_at: new Date().toISOString() };
    if (patch.date) dbPatch.data = patch.date;
    if (patch.description !== undefined) dbPatch.descricao = patch.description;
    if (patch.amount !== undefined) dbPatch.valor = patch.amount;
    if (patch.category) dbPatch.categoria_id = this.categoriaId(patch.category);
    if (patch.account) dbPatch.conta_id = await this.getOrCreateContaId(patch.account);
    if (patch.mcc !== undefined) dbPatch.mcc = patch.mcc || null;
    if (patch.tipo !== undefined) dbPatch.tipo_lancamento = patch.tipo || null;
    const { error } = await sb.from('lancamentos').update(dbPatch).eq('id', id);
    if (error) throw error;
  },

  async removeLancamento(id) {
    const { error } = await sb.from('lancamentos').delete().eq('id', id);
    if (error) throw error;
  },

  async clearMonthLancamentos(month) {
    const [y, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const next = new Date(y, m, 1);
    const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    const { error } = await sb.from('lancamentos').delete().gte('data', start).lt('data', end);
    if (error) throw error;
  },

  async replaceAllLancamentos(list) {
    const { error: delErr } = await sb.from('lancamentos').delete().not('id', 'is', null);
    if (delErr) throw delErr;
    if (list.length === 0) return [];
    return this.insertManyLancamentos(list);
  },
};
