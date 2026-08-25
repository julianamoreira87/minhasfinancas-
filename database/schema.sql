-- Schema do banco de dados (Supabase/Postgres) do Meu Assistente Financeiro.
-- Espelha o modelo de dados usado hoje em assets/js/categories.js e
-- assets/js/storage.js (que ainda roda em localStorage, no navegador).
--
-- Este banco existe como base para uma futura versão em nuvem do sistema;
-- o site publicado ainda guarda os dados só no navegador (localStorage),
-- então as tabelas abaixo ficam com RLS ligado e sem policy pública até
-- existir login de verdade — assim ninguém consegue ler/gravar nelas só
-- com o link do site.

-- Grupos fixos usados no gráfico de despesas por categoria (cores e ordem
-- consistentes, espelhando GROUPS em assets/js/categories.js).
create table public.grupos_categoria (
  id smallint primary key,
  nome text not null unique,
  cor_clara text not null,
  cor_escura text not null,
  ordem smallint not null unique
);

-- Categorias finas (Mercado, Combustível, Salário...) que aparecem no
-- seletor de categoria de cada lançamento. fluxo_especial marca as duas
-- categorias que não seguem a regra padrão "valor negativo = despesa,
-- valor positivo = receita": pagamento de fatura (transferência interna,
-- não é gasto novo) e aportes em investimento.
create table public.categorias (
  id serial primary key,
  nome text not null unique,
  grupo_id smallint not null references public.grupos_categoria(id),
  fluxo_especial text check (fluxo_especial in ('transferencia','investimento')),
  created_at timestamptz not null default now()
);

-- Contas/origens do dinheiro (conta corrente, cartão de crédito, dinheiro).
create table public.contas (
  id serial primary key,
  nome text not null unique,
  tipo text not null check (tipo in ('conta_corrente','cartao_credito','dinheiro','outro')),
  created_at timestamptz not null default now()
);

-- Tabela principal: cada lançamento financeiro (importado de PDF ou
-- digitado à mão).
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  descricao text not null,
  valor numeric(12,2) not null,
  categoria_id integer not null references public.categorias(id),
  conta_id integer not null references public.contas(id),
  origem text not null check (origem in ('manual','fatura','extrato')),
  mcc text,
  tipo_lancamento text,
  favorecido_documento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lancamentos_data_idx on public.lancamentos (data);
create index lancamentos_categoria_idx on public.lancamentos (categoria_id);
create index lancamentos_conta_idx on public.lancamentos (conta_id);

alter table public.grupos_categoria enable row level security;
alter table public.categorias enable row level security;
alter table public.contas enable row level security;
alter table public.lancamentos enable row level security;
