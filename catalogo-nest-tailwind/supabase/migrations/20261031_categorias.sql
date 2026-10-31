-- NÃO APLICADO. Commit 1 da fase A de prListagem.md (parte: nome único).
-- Conferido em 2026-10-31 no projeto Catalogo (qbtshehtefylbmxonvnz): categorias só tinha a
-- chave primária, então "Cadeira" e "cadeira" podiam coexistir e o 409 (MSG.CATEGORIA_DUPLICADA)
-- nunca disparava.
--
-- Pré-requisito: aplicar antes 20261024_rls_e_storage.sql.
-- Idempotente: pode ser rodada de novo sem erro. Falha se já existirem nomes repetidos
-- (diferindo só na caixa); a tabela estava vazia na conferência.

begin;

-- Nome único sem diferenciar maiúsculas. A violação vira o erro 23505 do Postgres, que o
-- CategoryService traduz em ConflictException(MSG.CATEGORIA_DUPLICADA). Espaços nas pontas
-- são removidos pelo DTO (trim) antes de chegar aqui.
create unique index if not exists categorias_nome_lower_uniq
  on public.categorias (lower(nome));

commit;
