/*
 * Parsers para os dois formatos de relatório suportados: fatura de cartão
 * (padrão "Cartão Horizonte Mastercard") e extrato bancário (padrão "Banco
 * Horizonte S.A."). Recebem uma lista de linhas de texto já reconstruídas
 * a partir da posição dos itens no PDF (ver pdf-import.js) e devolvem
 * lançamentos no formato interno do app.
 *
 * Estratégia: só processamos linhas que começam com uma data (dd/mm/aaaa) —
 * isso já descarta cabeçalhos, resumos e rodapés sem precisar entender o
 * layout inteiro da página.
 */

const DATE_PREFIX_RE = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.*)$/;
const MONEY_TOKEN_RE = /-?[\d.]*\d,\d{2}/;

function parseMoneyBR(str) {
  const clean = str.replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(clean);
  return Number.isNaN(n) ? null : n;
}

function toIsoDate(dd, mm, yyyy) {
  return `${yyyy}-${mm}-${dd}`;
}

function detectDocumentType(lines) {
  const text = lines.join(' \n ').toUpperCase();
  if (text.includes('FATURA DE CARTÃO') || text.includes('FATURA DE CARTAO')) return 'fatura';
  if (text.includes('EXTRATO DE CONTA CORRENTE')) return 'extrato';
  return 'desconhecido';
}

// --- Fatura de cartão -------------------------------------------------------

function parseFaturaLines(lines) {
  const results = [];
  const skipped = [];
  for (const rawLine of lines) {
    const m = DATE_PREFIX_RE.exec(rawLine.trim());
    if (!m) continue;
    const [, dd, mm, yyyy, restRaw] = m;
    let rest = restRaw.trim();

    const trailingValue = matchTrailingMoney(rest);
    if (!trailingValue) { skipped.push(rawLine); continue; }
    rest = rest.slice(0, trailingValue.index).trim();

    // O MCC é o último token isolado de 4 dígitos antes do valor (o
    // estabelecimento às vezes também tem um número de loja de 4 dígitos
    // mais cedo na linha, por isso pegamos o ÚLTIMO, não o primeiro).
    const mccMatches = [...rest.matchAll(/\b\d{4}\b/g)];
    if (mccMatches.length === 0) { skipped.push(rawLine); continue; }
    const mccMatch = mccMatches[mccMatches.length - 1];
    const mcc = mccMatch[0];
    const estabelecimento = rest.slice(0, mccMatch.index).trim();
    const detalhe = rest.slice(mccMatch.index + mcc.length).trim();
    const valor = parseMoneyBR(trailingValue.value);
    if (valor === null || !estabelecimento) { skipped.push(rawLine); continue; }

    results.push({
      date: toIsoDate(dd, mm, yyyy),
      description: estabelecimento,
      amount: -Math.abs(valor), // compra no cartão = saída
      mcc,
      detail: detalhe,
      account: 'Cartão de crédito',
      source: 'fatura',
      category: categorizeFaturaItem({ mcc }),
    });
  }
  return { transactions: results, skipped };
}

// --- Extrato bancário --------------------------------------------------------

const EXTRATO_TIPOS = [
  'PIX ENVIADO',
  'PIX RECEBIDO',
  'DEB AUTOMATICO',
  'CREDITO TED',
  'COMPRA DEBITO',
  'PAGTO FATURA',
  'SAQUE',
  'TARIFA',
  'RENDIMENTO',
];

function matchTrailingMoney(str) {
  const m = str.match(new RegExp(`(${MONEY_TOKEN_RE.source})\\s*$`));
  if (!m) return null;
  return { value: m[1], index: m.index };
}

function findRightmostTipo(str) {
  let best = null;
  for (const tipo of EXTRATO_TIPOS) {
    let idx = str.lastIndexOf(tipo);
    if (idx !== -1 && (!best || idx > best.index)) {
      best = { tipo, index: idx };
    }
  }
  return best;
}

function parseExtratoLines(lines) {
  const results = [];
  const skipped = [];
  let openingBalance = null;

  for (const rawLine of lines) {
    const m = DATE_PREFIX_RE.exec(rawLine.trim());
    if (!m) continue;
    const [, dd, mm, yyyy, restRaw] = m;
    const rest = restRaw.trim();

    if (/^SALDO ANTERIOR\b/.test(rest)) {
      const val = matchTrailingMoney(rest);
      if (val) openingBalance = parseMoneyBR(val.value);
      continue;
    }

    // Linha de lançamento: "<histórico> <tipo> <cnpj/cpf> <valor> <saldo>"
    const saldoMatch = matchTrailingMoney(rest);
    if (!saldoMatch) { skipped.push(rawLine); continue; }
    let head = rest.slice(0, saldoMatch.index).trim();

    const valorMatch = matchTrailingMoney(head);
    if (!valorMatch) { skipped.push(rawLine); continue; }
    head = head.slice(0, valorMatch.index).trim();

    const tipoHit = findRightmostTipo(head);
    if (!tipoHit) { skipped.push(rawLine); continue; }
    const historico = head.slice(0, tipoHit.index).trim();
    const tipo = tipoHit.tipo;
    const favorecido = head.slice(tipoHit.index + tipo.length).trim().replace(/^-$/, '');

    const valor = parseMoneyBR(valorMatch.value);
    if (valor === null || !historico) { skipped.push(rawLine); continue; }

    results.push({
      date: toIsoDate(dd, mm, yyyy),
      description: historico,
      amount: valor, // já vem com sinal correto no extrato
      tipo,
      favorecido: favorecido || null,
      account: 'Conta corrente',
      source: 'extrato',
      category: categorizeExtratoItem({ historico, tipo }),
    });
  }

  return { transactions: results, skipped, openingBalance };
}

function parseReportText(lines) {
  const type = detectDocumentType(lines);
  if (type === 'fatura') return { type, ...parseFaturaLines(lines) };
  if (type === 'extrato') return { type, ...parseExtratoLines(lines) };
  return { type: 'desconhecido', transactions: [], skipped: lines };
}
