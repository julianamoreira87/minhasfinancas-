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

## O site está ligado a este banco (sem login)

O painel publicado (`assets/js/db.js`) já lê e grava direto nestas tabelas, usando
a chave pública do projeto. Isso foi um pedido explícito de quem mantém o site,
ciente do que isso significa: **como ainda não existe login**, qualquer pessoa com
o link do site consegue ver, criar, editar e excluir os lançamentos — não há
separação por usuário.

As políticas de acesso (RLS) que permitem isso:

| Tabela | Quem pode ler | Quem pode gravar |
|---|---|---|
| `grupos_categoria` | todo mundo (chave pública) | ninguém pelo site |
| `categorias` | todo mundo (chave pública) | ninguém pelo site |
| `contas` | todo mundo (chave pública) | todo mundo (só criar, para nomes de conta novos) |
| `lancamentos` | todo mundo (chave pública) | todo mundo (criar, editar, excluir) |

**Para restringir isso no futuro:** adicionar Supabase Auth (login por e-mail/senha
ou provedor social), uma coluna `usuario_id` em `lancamentos`, e trocar as
políticas acima para exigir `auth.uid() = usuario_id`. Até lá, trate o link do site
como se fosse público.
