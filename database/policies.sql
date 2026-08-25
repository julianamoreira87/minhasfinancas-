-- Políticas de acesso (RLS) para a chave pública (anon) do site. Aplicado
-- depois de schema.sql. Sem login ainda — ver database/README.md para o
-- que isso significa na prática (o link do site é, hoje, público).

-- Tabelas de referência: só leitura pública (nomes/cores de categorias,
-- não é dado sensível).
create policy "leitura publica" on public.grupos_categoria for select to anon using (true);
create policy "leitura publica" on public.categorias for select to anon using (true);

-- Contas: leitura publica + criar novas (o formulário de lançamento manual
-- aceita nome de conta livre, ex. "Poupança").
create policy "leitura publica" on public.contas for select to anon using (true);
create policy "criar conta" on public.contas for insert to anon with check (true);

-- Lançamentos: CRUD completo para a chave publica, espelhando o que o
-- site permite fazer na tela (adicionar, editar categoria, excluir, limpar
-- mês, restaurar backup).
create policy "leitura publica" on public.lancamentos for select to anon using (true);
create policy "criar lancamento" on public.lancamentos for insert to anon with check (true);
create policy "editar lancamento" on public.lancamentos for update to anon using (true) with check (true);
create policy "excluir lancamento" on public.lancamentos for delete to anon using (true);
