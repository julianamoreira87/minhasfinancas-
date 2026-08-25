# Banco de dados

Este banco (Supabase/Postgres, projeto `minhasfinancas-`) guarda a mesma
estrutura de dados que o app já usa no navegador. As tabelas foram criadas
executando `schema.sql` e depois populadas com `seed_dados_julho_2026.sql`
(os mesmos 41 lançamentos de exemplo que o botão "Carregar dados de exemplo"
usa no site).

## Tabelas

| Tabela | O que guarda |
|---|---|
| `grupos_categoria` | Os 8 grupos fixos do gráfico de despesas (Moradia, Alimentação, Transporte, Saúde, Lazer, Assinaturas, Compras, Outros), com as cores usadas no gráfico. |
| `categorias` | As categorias finas que aparecem no seletor de cada lançamento (Mercado, Combustível, Salário...), cada uma ligada a um grupo. |
| `contas` | De onde o dinheiro saiu/entrou: Conta corrente, Cartão de crédito, Dinheiro. |
| `lancamentos` | Cada lançamento financeiro: data, descrição, valor, categoria, conta, se veio de PDF (fatura/extrato) ou foi digitado à mão. |

## Importante: o site ainda não está ligado a este banco

Hoje o painel publicado guarda os dados só no navegador de quem está usando
(localStorage) — este banco de dados é a base para uma versão futura em
nuvem, mas ainda não está conectado ao site.

Isso é proposital: conectar o site a um banco de verdade, acessível pela
internet, exige primeiro um sistema de login. Sem login, qualquer pessoa
que abrisse o link do site poderia ver e apagar os lançamentos — por isso
as tabelas estão com uma trava de segurança (RLS) ligada e sem nenhuma
liberação pública ainda: ninguém consegue ler ou gravar nelas de fora,
nem mesmo pelo site.
