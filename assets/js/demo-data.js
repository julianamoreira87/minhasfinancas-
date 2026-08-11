/*
 * Dados de exemplo: julho/2026, extraídos e validados a partir dos relatórios
 * fictícios em /samples (fatura de cartão + extrato bancário). Usado pelo
 * botão "Carregar dados de exemplo" para demonstrar o painel sem precisar
 * anexar um PDF antes.
 */

const DEMO_TRANSACTIONS = [
  // --- Fatura do cartão (Cartão final 4417) ---
  { date: '2026-07-01', description: 'IFOOD *RESTAURANTE MASSA NOSTRA', amount: -68.90, mcc: '5812', category: 'Restaurante', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-02', description: 'POSTO IPIRANGA JD PAULISTA', amount: -210.00, mcc: '5541', category: 'Combustível', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-02', description: 'NETFLIX.COM ASSINATURA MENSAL', amount: -44.90, mcc: '4899', category: 'Streaming e Assinaturas', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-03', description: 'DROGARIA SAO PAULO FL 118', amount: -87.45, mcc: '5912', category: 'Farmácia', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-04', description: 'AMAZON BR MARKETPLACE', amount: -156.80, mcc: '5999', category: 'Compras diversas', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-05', description: 'SUPERMERCADO PAO DE ACUCAR 1042', amount: -432.17, mcc: '5411', category: 'Mercado', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-07', description: 'SPOTIFY BR PREMIUM', amount: -21.90, mcc: '5735', category: 'Streaming e Assinaturas', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-09', description: 'UBER *TRIP HELP.UBER.COM', amount: -32.40, mcc: '4121', category: 'Transporte por app', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-10', description: 'OUTBACK STEAKHOUSE MORUMBI', amount: -189.60, mcc: '5812', category: 'Restaurante', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-12', description: 'LIVRARIA CULTURA CONJ NACIONAL', amount: -94.00, mcc: '5942', category: 'Educação e Cultura', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-13', description: 'UBER *TRIP HELP.UBER.COM', amount: -28.70, mcc: '4121', category: 'Transporte por app', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-15', description: 'MAGAZINE LUIZA PARC 1/3', amount: -133.30, mcc: '5722', category: 'Eletrodomésticos', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-16', description: 'PADARIA BELLA MASSA', amount: -46.20, mcc: '5462', category: 'Padaria', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-18', description: 'POSTO SHELL SELECT PINHEIROS', amount: -195.00, mcc: '5541', category: 'Combustível', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-20', description: 'CINEMARK SHOPPING ELDORADO', amount: -78.00, mcc: '7832', category: 'Cinema e Lazer', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-21', description: 'SUPERMERCADO EXTRA HIPER 305', amount: -288.55, mcc: '5411', category: 'Mercado', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-23', description: 'FARMACIA PAGUE MENOS 0871', amount: -62.30, mcc: '5912', category: 'Farmácia', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-24', description: 'APPLE.COM/BILL ICLOUD', amount: -9.90, mcc: '5735', category: 'Streaming e Assinaturas', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-26', description: 'IFOOD *LANCHONETE DO ZE', amount: -54.80, mcc: '5812', category: 'Restaurante', account: 'Cartão de crédito', source: 'fatura' },
  { date: '2026-07-27', description: 'DECATHLON MORUMBI', amount: -219.90, mcc: '5655', category: 'Esporte', account: 'Cartão de crédito', source: 'fatura' },

  // --- Extrato da conta corrente ---
  { date: '2026-07-01', description: 'PIX IMOB SANTA CLARA - ALUGUEL JUL/26', amount: -2300.00, tipo: 'PIX ENVIADO', category: 'Moradia', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-02', description: 'DEB AUT CONDOMINIO EDIF AURORA', amount: -480.00, tipo: 'DEB AUTOMATICO', category: 'Moradia', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-03', description: 'DEB AUT VIVO FIBRA INTERNET 300MB', amount: -129.90, tipo: 'DEB AUTOMATICO', category: 'Internet e Telefonia', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-05', description: 'CREDITO SALARIO - NOVA MIDIA LTDA', amount: 8450.00, tipo: 'CREDITO TED', category: 'Salário', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-06', description: 'DEB AUT ENEL DISTRIBUICAO ENERGIA', amount: -187.42, tipo: 'DEB AUTOMATICO', category: 'Energia', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-07', description: 'COMPRA DEBITO SUPERMERCADO DIA', amount: -142.88, tipo: 'COMPRA DEBITO', category: 'Mercado', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-08', description: 'PAGTO FATURA CARTAO FINAL 4417', amount: -2187.43, tipo: 'PAGTO FATURA', category: 'Pagamento de Fatura', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-10', description: 'DEB AUT SMARTFIT ACADEMIA', amount: -119.90, tipo: 'DEB AUTOMATICO', category: 'Academia', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-11', description: 'SAQUE TERMINAL 24H AG 0412', amount: -200.00, tipo: 'SAQUE', category: 'Saque', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-14', description: 'PIX CULTURA INGLESA - MENSALIDADE', amount: -420.00, tipo: 'PIX ENVIADO', category: 'Educação e Cultura', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-15', description: 'COMPRA DEBITO POSTO IPIRANGA', amount: -160.00, tipo: 'COMPRA DEBITO', category: 'Combustível', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-17', description: 'DEB AUT UNIMED PLANO DE SAUDE', amount: -689.00, tipo: 'DEB AUTOMATICO', category: 'Plano de Saúde', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-18', description: 'PIX RECEBIDO ESTUDIO ORBITA', amount: 1200.00, tipo: 'PIX RECEBIDO', category: 'Receita (Pix recebido)', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-20', description: 'COMPRA DEBITO DROGASIL FL 221', amount: -73.50, tipo: 'COMPRA DEBITO', category: 'Farmácia', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-22', description: 'PIX CLEUSA M SANTOS - DIARISTA', amount: -180.00, tipo: 'PIX ENVIADO', category: 'Serviços domésticos', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-24', description: 'DEB AUT PORTO SEGURO - SEG AUTO', amount: -245.60, tipo: 'DEB AUTOMATICO', category: 'Seguros', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-25', description: 'COMPRA DEBITO PET SHOP AMIGO FIEL', amount: -134.00, tipo: 'COMPRA DEBITO', category: 'Pet', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-28', description: 'PIX RENATA C RIBEIRO - PRESENTE', amount: -150.00, tipo: 'PIX ENVIADO', category: 'Presentes', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-29', description: 'TARIFA PACOTE DE SERVICOS CONTA FACIL', amount: -34.90, tipo: 'TARIFA', category: 'Tarifas bancárias', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-30', description: 'CREDITO RENDIMENTO CDB LIQUIDEZ DIARIA', amount: 42.18, tipo: 'RENDIMENTO', category: 'Rendimentos', account: 'Conta corrente', source: 'extrato' },
  { date: '2026-07-31', description: 'PIX CONTA INVESTIMENTO - RESERVA', amount: -1000.00, tipo: 'PIX ENVIADO', category: 'Investimentos', account: 'Conta corrente', source: 'extrato' },
];
