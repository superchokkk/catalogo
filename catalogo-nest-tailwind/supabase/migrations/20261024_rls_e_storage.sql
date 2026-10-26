-- RASCUNHO — NÃO APLICADO. Revise contra o estado real do projeto antes de rodar
-- (todo.md, item 1.16). Nomes de tabelas/colunas vêm do código da API.
--
-- Premissa: o front fala só com a API (service_role, que ignora RLS) e nunca com o
-- Supabase direto. Se o front usar supabase-js com a anon key para ler produtos, a
-- política de SELECT abaixo continua permitindo; qualquer escrita direta passa a ser negada.

-- 1. Tabelas: RLS ligado. Sem política = negado para anon/authenticated.
alter table public.users            enable row level security;
alter table public.produtos         enable row level security;
alter table public.produto_imagens  enable row level security;

-- 2. Leitura pública apenas do catálogo ativo (espelha o filtro status = true da listagem).
drop policy if exists "catalogo publico: produtos ativos" on public.produtos;
create policy "catalogo publico: produtos ativos"
  on public.produtos for select to anon, authenticated
  using (status = true);

drop policy if exists "catalogo publico: imagens de produtos ativos" on public.produto_imagens;
create policy "catalogo publico: imagens de produtos ativos"
  on public.produto_imagens for select to anon, authenticated
  using (exists (select 1 from public.produtos p where p.id = produto_id and p.status = true));

-- public.users: nenhuma política de propósito (contém e-mail e nível de acesso).
-- Sem INSERT/UPDATE/DELETE em nenhuma tabela: escrita só pela API (service_role).

-- 3. Bucket de fotos: leitura pública por URL, mas só imagens e até 5 MB (espelha a API).
update storage.buckets
   set file_size_limit    = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'produtos-fotos';

-- Escrita no bucket: sem políticas em storage.objects para anon/authenticated
-- (confira se não existe nenhuma criada manualmente no painel).
