/*
 * Modelo de categorização.
 * Cada lançamento recebe uma "categoria fina" (ex.: Mercado, Combustível).
 * Cada categoria fina pertence a um "grupo" (ex.: Alimentação) usado nos
 * gráficos, para manter no máximo 8 fatias e cores fixas e consistentes.
 * O fluxo (receita/despesa/transferência/investimento) é derivado do sinal
 * do valor, exceto para duas categorias especiais (fatura e investimento).
 */

// Ordem fixa dos grupos = ordem fixa das cores categóricas (nunca reordenar).
const GROUPS = [
  { id: 'moradia', label: 'Moradia', color: '#2a78d6', colorDark: '#3987e5' },
  { id: 'alimentacao', label: 'Alimentação', color: '#eb6834', colorDark: '#d95926' },
  { id: 'transporte', label: 'Transporte', color: '#1baf7a', colorDark: '#199e70' },
  { id: 'saude', label: 'Saúde', color: '#eda100', colorDark: '#c98500' },
  { id: 'lazer', label: 'Lazer', color: '#e87ba4', colorDark: '#d55181' },
  { id: 'assinaturas', label: 'Assinaturas', color: '#008300', colorDark: '#008300' },
  { id: 'compras', label: 'Compras', color: '#4a3aa7', colorDark: '#9085e9' },
  { id: 'outros', label: 'Outros', color: '#e34948', colorDark: '#e66767' },
];

function groupById(id) {
  return GROUPS.find((g) => g.id === id) || GROUPS[GROUPS.length - 1];
}

// categoria fina -> grupo. Usada tanto para exibição quanto para o gráfico.
const CATEGORY_GROUP = {
  'Moradia': 'moradia',
  'Energia': 'moradia',
  'Internet e Telefonia': 'assinaturas',
  'Streaming e Assinaturas': 'assinaturas',
  'Contas e Assinaturas': 'assinaturas',
  'Mercado': 'alimentacao',
  'Restaurante': 'alimentacao',
  'Padaria': 'alimentacao',
  'Combustível': 'transporte',
  'Transporte por app': 'transporte',
  'Farmácia': 'saude',
  'Plano de Saúde': 'saude',
  'Academia': 'saude',
  'Cinema e Lazer': 'lazer',
  'Presentes': 'lazer',
  'Esporte': 'lazer',
  'Eletrodomésticos': 'compras',
  'Compras diversas': 'compras',
  'Pet': 'outros',
  'Serviços domésticos': 'outros',
  'Seguros': 'outros',
  'Tarifas bancárias': 'outros',
  'Saque': 'outros',
  'Educação e Cultura': 'outros',
  'Pix enviado': 'outros',
  'Outros': 'outros',
  // categorias de receita/transferência/investimento não entram no gráfico de despesas
  'Salário': 'outros',
  'Receita (Pix recebido)': 'outros',
  'Rendimentos': 'outros',
  'Investimentos': 'outros',
  'Pagamento de Fatura': 'outros',
};

const TRANSFER_CATEGORIES = new Set(['Pagamento de Fatura']);
const INVESTMENT_CATEGORIES = new Set(['Investimentos']);

const ALL_CATEGORIES = Object.keys(CATEGORY_GROUP);

function getFlowType(tx) {
  if (TRANSFER_CATEGORIES.has(tx.category)) return 'transferencia';
  if (INVESTMENT_CATEGORIES.has(tx.category)) return 'investimento';
  return tx.amount >= 0 ? 'receita' : 'despesa';
}

function categoryColor(category) {
  const groupId = CATEGORY_GROUP[category] || 'outros';
  return groupById(groupId).color;
}

// --- Regras de categorização automática -----------------------------------

// MCC (fatura de cartão) -> categoria fina. Conforme a própria fatura explica,
// o MCC é o identificador mais estável para classificar compras no cartão.
const MCC_CATEGORY = {
  '5411': 'Mercado',
  '5541': 'Combustível',
  '5812': 'Restaurante',
  '4899': 'Streaming e Assinaturas',
  '5912': 'Farmácia',
  '5999': 'Compras diversas',
  '5735': 'Streaming e Assinaturas',
  '4121': 'Transporte por app',
  '5722': 'Eletrodomésticos',
  '5942': 'Educação e Cultura',
  '5462': 'Padaria',
  '7832': 'Cinema e Lazer',
  '5655': 'Esporte',
};

function categorizeFaturaItem({ mcc }) {
  return MCC_CATEGORY[mcc] || 'Outros';
}

// Extrato bancário: primeiro por palavra-chave no histórico, depois por tipo
// de lançamento como fallback. Ordem importa (primeira regra que bater vence).
const EXTRATO_KEYWORD_RULES = [
  [/ALUGUEL/, 'Moradia'],
  [/CONDOMINIO/, 'Moradia'],
  [/ENEL|ENERGIA/, 'Energia'],
  [/VIVO|FIBRA/, 'Internet e Telefonia'],
  [/SALARIO/, 'Salário'],
  [/SMARTFIT|ACADEMIA/, 'Academia'],
  [/CULTURA INGLESA|MENSALIDADE|ESCOLA|CURSO/, 'Educação e Cultura'],
  [/POSTO/, 'Combustível'],
  [/UNIMED|PLANO DE SAUDE/, 'Plano de Saúde'],
  [/DROGA|FARMACIA/, 'Farmácia'],
  [/DIARISTA|FAXINEIRA/, 'Serviços domésticos'],
  [/SEGURO/, 'Seguros'],
  [/PET\b/, 'Pet'],
  [/PRESENTE/, 'Presentes'],
  [/INVESTIMENTO|RESERVA|\bCDB\b/, 'Investimentos'],
  [/SUPERMERCADO|MERCADO/, 'Mercado'],
];

const EXTRATO_TIPO_FALLBACK = {
  'PAGTO FATURA': 'Pagamento de Fatura',
  'SAQUE': 'Saque',
  'TARIFA': 'Tarifas bancárias',
  'RENDIMENTO': 'Rendimentos',
  'PIX RECEBIDO': 'Receita (Pix recebido)',
  'CREDITO TED': 'Salário',
  'COMPRA DEBITO': 'Compras diversas',
  'DEB AUTOMATICO': 'Contas e Assinaturas',
  'PIX ENVIADO': 'Pix enviado',
};

// Alguns tipos de lançamento são inequívocos por si só (não dependem do
// texto do histórico) e por isso são resolvidos antes das regras por
// palavra-chave — evita, por exemplo, um "RENDIMENTO CDB" cair em
// "Investimentos" só porque a palavra CDB aparece na descrição.
const EXTRATO_TIPO_DETERMINISTICO = {
  'PAGTO FATURA': 'Pagamento de Fatura',
  'SAQUE': 'Saque',
  'TARIFA': 'Tarifas bancárias',
  'RENDIMENTO': 'Rendimentos',
};

function categorizeExtratoItem({ historico, tipo }) {
  if (EXTRATO_TIPO_DETERMINISTICO[tipo]) return EXTRATO_TIPO_DETERMINISTICO[tipo];
  const upper = (historico || '').toUpperCase();
  for (const [pattern, category] of EXTRATO_KEYWORD_RULES) {
    if (pattern.test(upper)) return category;
  }
  return EXTRATO_TIPO_FALLBACK[tipo] || 'Outros';
}
