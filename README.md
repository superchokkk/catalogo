# Catálogo API — NestJS & Supabase

API back-end de um catálogo de produtos, desenvolvida com [NestJS](https://nestjs.com/) e [Supabase](https://supabase.com/) (banco de dados, Storage e autenticação). O front-end é um projeto separado (Vite) publicado em `https://dgconcept-catalogo.vercel.app`.

## Tecnologias

- **Framework:** NestJS 11 (Node.js + TypeScript)
- **Banco / Auth / Storage:** Supabase (`@supabase/supabase-js`)
- **Autenticação:** cookie `httpOnly` com o token do Supabase, validado por `SupabaseAuthGuard`
- **Validação:** `class-validator` + `ValidationPipe` (`whitelist: true`)
- **Rate limiting:** `@nestjs/throttler`
- **Upload:** Multer (`FilesInterceptor`)
- **Testes:** Jest + Supertest
- **Qualidade:** ESLint e Prettier

## Estrutura

```
catalogo-nest-tailwind/
├── src/
│   ├── auth/        # login/logout, guards (SupabaseAuthGuard, AdminGuard), JwtStrategy
│   ├── users/       # criação de usuários (auth.users + public.users)
│   ├── products/    # CRUD de produtos e imagens (Storage)
│   ├── supabase/    # SupabaseService (client único do Supabase)
│   ├── app.module.ts
│   └── main.ts      # prefixo /api, cookie-parser, ValidationPipe, CORS
└── test/            # testes e2e
```

## Instalação

```bash
cd catalogo-nest-tailwind
npm install
```

Crie um arquivo `.env` em `catalogo-nest-tailwind/`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PRIVATE_KEY=sua_service_role_key
SUPABASE_ANON_KEY=sua_anon_key   # usada nos fluxos de autenticação (ex.: redefinição de senha)
SUPABASE_JWT_SECRET=seu_jwt_secret_do_supabase
FRONTEND_URL=http://localhost:5173   # origem do front (CORS, checagem de Origin, redirect de recuperação de senha)
CORS_ORIGINS=http://localhost:3000   # opcional: origens extras, separadas por vírgula (ex.: o Swagger local)
SWAGGER_ENABLED=true                 # opcional: força o Swagger ligado/desligado (padrão: ligado fora de produção)
NODE_ENV=development
PORT=3000
```

> `SUPABASE_URL`, `SUPABASE_PRIVATE_KEY`, `SUPABASE_ANON_KEY` e `FRONTEND_URL` são obrigatórias: sem elas a API não sobe.
>
> `SUPABASE_PRIVATE_KEY` é a chave *service role*: nunca a exponha no front-end nem a versione.
>
> `FRONTEND_URL` e `CORS_ORIGINS` aceitam apenas **origens** (esquema + host + porta), sem caminho: use `http://localhost:3000`, nunca `http://localhost:3000/docs`. Reinicie a API após alterar o `.env`.

## Executando

```bash
npm run start:dev    # desenvolvimento com watch
npm run start        # desenvolvimento sem watch
npm run build        # compila para dist/
npm run start:prod   # produção (após build)
```

A API sobe em `http://localhost:3000/api` (ou na porta definida em `PORT`).

## Scripts úteis

```bash
npm run lint         # ESLint (com --fix)
npm run format       # Prettier
npm test             # testes unitários
npm run test:e2e     # testes end-to-end
npm run test:cov     # cobertura
```

## Endpoints

Todas as rotas têm o prefixo `/api`.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Login com `email` e `senha`; grava o cookie `access_token` |
| POST | `/auth/logout` | público | Remove o cookie |
| GET | `/auth/me` | autenticado | Dados do usuário logado (id, email, nome, nível) |
| POST | `/auth/esqueci-senha` | público | Envia e-mail de recuperação de senha |
| POST | `/auth/redefinir-senha` | — | Define nova senha |
| POST | `/auth/set-session` | — | Grava o cookie a partir de um token (fluxo de recuperação) |
| POST | `/usuarios/criar` | público | Cria usuário (`nome`, `email`, `senha`, `confirmarSenha`) |
| GET | `/produtos/listagem` | público | Lista produtos ativos com imagens |
| POST | `/produtos/criar` | admin | Cria produto (multipart, campo `imagens` até 10 × 5 MB) |
| PUT | `/produtos/:id` | admin | Atualiza produto e imagens |
| DELETE | `/produtos/:id` | admin | Remove produto e imagens |

## Autenticação e autorização

1. O login chama o Supabase Auth e devolve o token em um cookie `httpOnly` (`secure` em produção, `sameSite: none`).
2. `SupabaseAuthGuard` lê o cookie, valida o token com `supabase.auth.getUser` e anexa `nivel` e `nome` (claims `user_data`) em `request.user`.
3. `RolesGuard` (depois do `SupabaseAuthGuard`) confere `@Roles(...)` contra o enum `Nivel` (`SUPER_ADMIN` 0, `ADMIN` 1, `USUARIO` 99). Nas rotas administrativas use `@UseGuards(SupabaseAuthGuard, RolesGuard)` + `@Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)`.

O CORS aceita as origens de `FRONTEND_URL` e `CORS_ORIGINS`, com credenciais. Além disso, o `OriginGuard` global rejeita com **403** (`ORIGEM_NAO_AUTORIZADA`) qualquer requisição que não seja GET/HEAD/OPTIONS cujo `Origin`/`Referer` não esteja nessa lista (defesa contra CSRF).

### Testando pelo Swagger

O Swagger fica em `http://localhost:3000/docs` (fora de produção, ou com `SWAGGER_ENABLED=true`). Como ele é servido pela própria API, as chamadas partem da origem `http://localhost:3000`, que precisa estar em `CORS_ORIGINS`; caso contrário o login retorna 403.

## Banco de dados e Storage (Supabase)

Tabelas usadas: `users`, `produtos`, `produto_imagens`. Bucket de imagens: `produtos-fotos`.

## Melhorias planejadas

Veja [todo.md](./todo.md) para a lista de melhorias de segurança, tecnologia e lógica.
