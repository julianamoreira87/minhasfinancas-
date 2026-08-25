-- Schema do banco de dados (Supabase/Postgres) do Meu Assistente Financeiro.
-- Espelha o modelo de dados usado em assets/js/categories.js e é lido/gravado
-- direto pelo site através de assets/js/db.js.
--
-- RLS fica ligado em todas as tabelas; as políticas que liberam acesso para a
-- chave pública do site estão em policies.sql (aplicadas depois deste
-- arquivo). Sem login ainda — ver database/README.md para o que isso significa.

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
