# Catalogo Nest + Tailwind

Projeto de catalogo de produtos com backend em NestJS e interface web servida como arquivos estaticos.

## Visao geral

Este projeto une:

- API em `NestJS` (TypeScript)
- Frontend em `HTML + JavaScript`
- Estilizacao com `Tailwind CSS`

A aplicacao expoe o frontend em `/` e as rotas da API com prefixo global `/api`.

## Funcionalidades atuais

- Listagem de produtos via API (`GET /api/products`)
- Login simples via API (`POST /api/auth/login`)
- Renderizacao de catalogo na pagina inicial
- Controle basico de UI por permissao (`role`)
  - `role: 1` exibe botoes de administracao na interface
  - `role: 2` exibe apenas fluxo publico

## Tecnologias

- `Node.js`
- `NestJS 11`
- `TypeScript`
- `Tailwind CSS 3`
- `PostCSS`

## Estrutura de pastas

```text
src/
  app.controller.ts      # rota /api/products
  app.service.ts         # dados mockados de produtos
  auth.controller.ts     # rota /api/auth/login
  auth.service.ts        # validacao simples de login
  main.ts                # bootstrap Nest + assets estaticos + prefixo /api
  styles/input.css       # entrada do Tailwind

public/
  index.html             # pagina principal
  css/style.css          # CSS gerado pelo Tailwind
  js/*.js                # scripts da interface
  mycss/mystyle.css      # estilos complementares
```

## Como rodar localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Rodar em desenvolvimento

```bash
npm run start:dev
```

Por causa do script `prestart:dev`, o CSS do Tailwind sera compilado antes da aplicacao iniciar.

### 3. Abrir no navegador

- Frontend: `http://localhost:3000/`
- API: `http://localhost:3000/api`

## Scripts disponiveis

- `npm run start`: inicia a aplicacao
- `npm run start:dev`: inicia com watch
- `npm run start:prod`: executa build em `dist/`
- `npm run build`: build do Nest
- `npm run build:css`: gera `public/css/style.css`
- `npm run build:css:watch`: recompila CSS em modo watch
- `npm run test`: testes unitarios
- `npm run test:e2e`: testes end-to-end
- `npm run test:cov`: cobertura de testes
- `npm run lint`: lint com ESLint

## Endpoints da API

### `GET /api/products`

Retorna uma lista de produtos mockados.

Exemplo de resposta:

```json
[
  {
    "id": 1,
    "nome": "Tenis Urban Pro",
    "descricao": "Tenis casual com acabamento premium para uso diario.",
    "preco": 299.9,
    "oldPrice": 399.9,
    "imagem": "https://..."
  }
]
```

### `POST /api/auth/login`

Recebe `nome`, `email` e `senha` no corpo da requisicao.

Exemplo de body:

```json
{
  "nome": "Pedro",
  "email": "samuel@gmail.com",
  "senha": "senha"
}
```

Regras atuais:

- Campos obrigatorios: `nome`, `email`, `senha`
- Email deve conter `@`
- Se `email = samuel@gmail.com` e `senha = senha`, retorna `role: 1`
- Qualquer outro login valido retorna `role: 2`

## Observacoes importantes

- Os produtos sao mockados em memoria (`AppService`), sem banco de dados.
- O login e apenas demonstrativo, sem criptografia e sem JWT.
- A interface frontend ja chama rotas de criacao/edicao/exclusao de produtos, mas essas rotas ainda nao existem no backend atual.

## Melhorias sugeridas

1. Implementar CRUD completo de produtos no backend (`POST`, `PUT`, `DELETE`).
2. Adicionar persistencia com banco de dados.
3. Criar autenticacao real com hash de senha e JWT.
4. Adicionar validacao com DTO + `class-validator`.

## Licenca

Projeto para fins de estudo/desenvolvimento. Ajuste a licenca conforme sua necessidade.
