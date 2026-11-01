-- NÃO APLICADO. Revisado em 2026-10-30 contra o estado real do projeto Catalogo
-- (qbtshehtefylbmxonvnz); veja Supa.md na raiz do repositório.
--
-- Premissa: o front fala só com a API (service_role, que ignora RLS e grants de
-- anon/authenticated) e nunca escreve no Supabase direto. A leitura pública do catálogo
-- (produtos, imagens, categorias, fotos por URL) continua funcionando; qualquer escrita
-- direta com a anon key ou com o JWT de um usuário passa a ser negada.
--
-- Esta migration é idempotente: pode ser rodada de novo sem erro.

begin;

-- 1. Remove as políticas criadas manualmente no painel (permissivas demais). -----------------
drop policy if exists "Permitir tudo para autenticados"   on public.produtos;       -- ALL com true
drop policy if exists "Permitir leitura publica"           on public.produtos;       -- sem filtro de status
drop policy if exists "Allow authenticated inserts"        on public.produto_imagens;
drop policy if exists "Allow public read access"           on public.produto_imagens; -- sem filtro de status
drop policy if exists "O usuário pode atualizar o próprio perfil" on public.users;   -- permitia mudar nivel
drop policy if exists "O usuário pode ver o próprio perfil"       on public.users;
drop policy if exists "autoCriacao"                        on public.users;          -- INSERT direto com nivel livre

drop policy if exists "Upload permitido apenas para logados yef4zg_0" on storage.objects;
drop policy if exists "Acesso publico de leitura yef4zg_0"            on storage.objects;

-- 2. RLS ligado (já está; garante em caso de recriação). -------------------------------------
alter table public.users            enable row level security;
alter table public.produtos         enable row level security;
alter table public.produto_imagens  enable row level security;
alter table public.categorias       enable row level security;

-- 3. Leitura pública apenas do catálogo ativo (espelha o filtro status = true da listagem). -
drop policy if exists "catalogo publico: produtos ativos" on public.produtos;
create policy "catalogo publico: produtos ativos"
  on public.produtos for select to anon, authenticated
  using (status = true);

drop policy if exists "catalogo publico: imagens de produtos ativos" on public.produto_imagens;
create policy "catalogo publico: imagens de produtos ativos"
  on public.produto_imagens for select to anon, authenticated
  using (exists (select 1 from public.produtos p where p.id = produto_id and p.status = true));

drop policy if exists "catalogo publico: categorias ativas" on public.categorias;
create policy "catalogo publico: categorias ativas"
  on public.categorias for select to anon, authenticated
  using (ativo = true);

-- public.users: nenhuma política de propósito (contém e-mail e nível de acesso).
-- Sem INSERT/UPDATE/DELETE em nenhuma tabela: escrita só pela API (service_role).

-- 4. Privilégios: o Supabase concede tudo a anon/authenticated por padrão; o RLS é a única
--    barreira. Tira o que não é necessário (defesa em profundidade, também reduz o GraphQL).
revoke insert, update, delete, truncate, references, trigger
  on public.users, public.produtos, public.produto_imagens, public.categorias
  from anon, authenticated;

revoke all on public.users from anon, authenticated;   -- nem leitura: dados pessoais + nivel

-- Tabelas futuras em public não herdam mais escrita para anon/authenticated.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- 5. Funções SECURITY DEFINER: ninguém chama via /rest/v1/rpc; search_path fixo. -------------
alter function public.update_timestamp()                 set search_path = '';
alter function public.handle_new_user()                  set search_path = '';
alter function public.custom_access_token_hook(jsonb)    set search_path = '';

revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()       from public, anon, authenticated;

-- O hook de JWT só deve ser chamado pelo Auth.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant  execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- 6. Índices nas chaves estrangeiras (aviso de performance do advisor). ----------------------
create index if not exists produto_imagens_produto_id_idx on public.produto_imagens (produto_id);
create index if not exists produtos_categoria_id_idx      on public.produtos ("categoriaID");
create index if not exists produtos_created_by_idx        on public.produtos (created_by);
create index if not exists produtos_updated_by_idx        on public.produtos (updated_by);

-- 7. Bucket de fotos: leitura pública por URL, mas só imagens e até 5 MB (espelha a API). ----
update storage.buckets
   set file_size_limit    = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'produtos-fotos';

-- Escrita no bucket: sem políticas em storage.objects para anon/authenticated (as duas do
-- painel foram removidas acima). O bucket é público, então a URL pública de cada foto
-- continua abrindo sem política de SELECT; só deixa de ser possível listar os objetos.

commit;

-- Fora do SQL (painel do Supabase):
--  * Auth > Providers > Email: ativar "Leaked password protection".
--  * Auth > Hooks: confirmar se custom_access_token_hook está ativado (a API Nest não depende
--    dele; ela lê nivel/nome de public.users a cada requisição).
--  * Conferir no UserService se o insert em public.users após o signUp colide com o trigger
--    on_auth_user_created -> handle_new_user (que já cria a linha com nivel 99).
