# 🛍️ Catálogo - NestJS & Tailwind & Supabase

Uma aplicação robusta desenvolvida com [NestJS](https://nestjs.com/) para o back-end, estilização de assets com [Tailwind CSS](https://tailwindcss.com/) e integração profunda com o [Supabase](https://supabase.com/) para gerenciamento de banco de dados e autenticação.

## 🚀 Tecnologias Utilizadas

* **Framework:** NestJS (Node.js com TypeScript)
* **Autenticação:** JWT (JSON Web Tokens) com Supabase Auth Guards
* **BaaS / Banco de Dados:** Supabase
* **Testes:** Jest (E2E e Unitários)
* **Formatação/Linting:** ESLint e Prettier

## 📁 Estrutura do Projeto

A arquitetura do projeto segue o padrão modular do NestJS, organizada nos seguintes domínios principais:

* `src/auth/` - Módulo de autenticação contendo estratégias JWT, `SupabaseAuthGuard` e um `AdminGuard` para controle de rotas baseadas em permissões (RBAC).
* `src/users/` - Módulo responsável pelo gerenciamento dos usuários e integração de dados de perfil.
* `src/products/` - Módulo central para as regras de negócio e endpoints do catálogo de produtos (CRUD).
* `src/supabase/` - Serviço de integração abstraindo a comunicação com a API do Supabase.
* `src/styles/` & `public/css/` - Entrada e saída de compilação dos estilos utilizando o Tailwind CSS.

## 🛠️ Instalação e Configuração

**1. Clone o projeto e instale as dependências:**
```bash
npm install
```

**2. Variáveis de Ambiente:**
Crie um arquivo `.env` na raiz do projeto. Com base na integração com o Supabase e JWT, você precisará das seguintes variáveis (ajuste conforme a configuração do seu ambiente):
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_anon_key_do_supabase
JWT_SECRET=sua_chave_secreta
```

**3. Geração do CSS (Tailwind):**
O projeto está configurado com `postcss` e `tailwind.config.js`. O CSS compilado é gerado na pasta `public/css/style.css`.

## 🏃‍♂️ Executando a Aplicação

```bash
# Modo desenvolvimento padrão
npm run start

# Modo desenvolvimento com watch (Recomendado)
npm run start:dev

# Modo de produção
npm run build
npm run start:prod
```

## 🧪 Testes

O projeto já está configurado com o Jest para garantir a qualidade do código.

```bash
# Executar testes unitários
npm run test

# Executar testes End-to-End (E2E)
npm run test:e2e
```

## 🔐 Autenticação e Segurança

A API é protegida usando Guards personalizados do NestJS:
* **SupabaseAuthGuard:** Garante que o usuário tem uma sessão válida no Supabase antes de acessar o endpoint.
* **AdminGuard:** Verifica as permissões de nível superior, restringindo rotas sensíveis (como deletar ou criar produtos no catálogo) apenas a administradores.