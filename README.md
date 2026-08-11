# Meu Assistente Financeiro

Painel financeiro pessoal, mensal e modular, que roda inteiramente no navegador — sem
servidor, sem conta, sem dados saindo da sua máquina. Foi construído para importar
relatórios em PDF (fatura de cartão e extrato bancário) e também aceitar lançamentos
manuais, categorizando tudo automaticamente para você acompanhar receitas, despesas
e investimentos mês a mês.

## Como usar

1. Abra `index.html` diretamente no navegador (duplo clique funciona — não precisa de
   servidor nem de instalação).
2. Clique em **"Carregar dados de exemplo"** para ver o painel populado com o mês de
   julho/2026 (dados fictícios, incluídos em `samples/`), ou
3. Clique em **"Importar relatório (PDF)"** e selecione a fatura do cartão ou o
   extrato bancário — o sistema lê o PDF no seu navegador (via pdf.js local, nenhum
   upload é feito), reconhece o layout, extrai os lançamentos e mostra uma prévia
   para você revisar/editar categorias antes de confirmar.
4. Use **"+ Novo lançamento"** para adicionar algo manualmente (compras em dinheiro,
   ajustes, o que não vier de um relatório).
5. Navegue entre meses pelas setas, pelo seletor de mês ou pelos "chips" dos meses
   que já têm dados.
6. Use **"Exportar backup"** de vez em quando para salvar um `.json` com tudo — é a
   sua cópia de segurança, já que os dados vivem só no `localStorage` do navegador
   (limpar o navegador apaga os lançamentos). **"Restaurar backup"** devolve os dados
   a partir desse arquivo.

Os dois PDFs de exemplo em `samples/` são documentos fictícios ("Cartão Horizonte
Mastercard" e "Banco Horizonte S.A."), criados para fins didáticos — sirva-se deles
para testar a importação sem arriscar dados reais.

## Como o sistema categoriza automaticamente

- **Fatura de cartão:** usa o MCC (código de 4 dígitos do ramo do estabelecimento),
  que é o identificador mais estável — o nome do estabelecimento varia, o MCC não.
- **Extrato bancário:** primeiro tenta reconhecer palavras-chave no histórico
  (aluguel, condomínio, farmácia, supermercado…); quando não reconhece, cai para o
  tipo de lançamento (PIX, débito automático, TED, etc.) como categoria genérica.
- Toda categoria pode ser trocada manualmente, direto na tabela — a mudança fica
  salva.
- **Pagamento de fatura** (o débito no extrato que quita o cartão) é tratado como
  transferência interna, não como despesa nova — as despesas de cartão já entraram
  quando você importou a fatura, então contá-las de novo pelo extrato duplicaria o
  gasto. Da mesma forma, transferências para investimentos entram como "aporte", não
  como despesa.

## Arquitetura

Tudo é HTML/CSS/JS puro (sem build step, sem framework, sem dependência de rede em
tempo de execução) para ficar fácil de abrir, entender e estender:

```
index.html                    shell da página e dos modais
assets/css/style.css          tema (claro/escuro automático) e layout
assets/js/
  categories.js                regras de categorização (MCC + palavras-chave) e grupos p/ gráfico
  parsers.js                   interpretação das linhas de texto do PDF -> lançamentos
  pdf-import.js                extração de texto do PDF via pdf.js (reconstrói linhas por posição x/y)
  storage.js                   persistência em localStorage (CRUD de lançamentos)
  charts.js                    donut (despesas por categoria) e barras divergentes (receita x despesa), em SVG puro
  demo-data.js                 dataset de exemplo (julho/2026)
  app.js                       estado da UI, renderização, formulários, wiring dos eventos
assets/vendor/pdfjs/          pdf.js vendorizado (sem CDN externo)
samples/                      os dois PDFs fictícios usados de base
```

### Formato interno de um lançamento

```js
{
  id, date: 'YYYY-MM-DD', month: 'YYYY-MM',
  description, category, account,
  amount,        // positivo = entrada, negativo = saída
  source,        // 'fatura' | 'extrato' | 'manual'
  mcc, tipo,     // metadados de origem (quando vier de PDF)
}
```

O tipo de fluxo (receita / despesa / transferência / investimento) não é salvo —
é sempre derivado do sinal do valor e da categoria (`getFlowType` em
`categories.js`), então trocar a categoria de um lançamento recalcula tudo
automaticamente.

### Extensão: suportar outro banco/cartão

Os parsers em `parsers.js` são específicos para o layout usado nos exemplos (linhas
começando com `dd/mm/aaaa`, MCC de 4 dígitos numa fatura, tipos fixos de lançamento
num extrato). Para outro banco, adicione um novo parser nesse arquivo seguindo o
mesmo padrão — extrair pela posição/âncoras estáveis do documento — e registre-o em
`detectDocumentType`.

## Testes

Os parsers foram validados rodando o `pdf.js` via Node contra os dois PDFs de
`samples/` e comparando o resultado com os totais oficiais impressos nos próprios
documentos (compras da fatura, créditos/débitos do extrato) — todos batem
exatamente. O fluxo completo (carregar exemplo, importar PDF de verdade, editar
categoria, lançar manualmente, limpar mês) também foi exercitado ponta a ponta num
Chromium headless, sem erros de console.
