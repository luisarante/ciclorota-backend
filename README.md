# Ciclorota Platform

Monorepo preparado para evoluir a plataforma em duas frentes neste repositório:
- `apps/api`: backend Express + Supabase existente
- `apps/admin-web`: painel operacional em React + Vite
- `packages/shared`: contratos e tipos compartilhados

O app do usuário ficou separado em outro repositório Expo.

## Estrutura

```text
apps/
  api/
  admin-web/
packages/
  shared/
supabase/
  migrations/
```

## Comandos principais

```bash
npm install
npm run dev:api
npm run dev:admin
npm run smoke:api
npm run docker:build:api
npm run verify:backend
npm run verify
npm run typecheck
npm run build
```

## Banco

- o contrato de dados esperado pela API agora está versionado em `supabase/migrations`
- o baseline atual está em `supabase/migrations/20260408_000001_core_schema.sql`
- a explicação funcional do schema está em `docs/backend-database-contract.md`
- o checklist operacional está em `docs/backend-production-checklist.md`
- o guia de reconciliação do banco remoto está em `docs/backend-schema-reconciliation.md`
- o handoff de integração para o repo do frontend está em `docs/frontend-api-handoff.md`
- o índice central da documentação está em `docs/README.md`
- o escopo oficial deste repositório está em `docs/repo-scope.md`
- a documentação de deploy da API está em `docs/api-deploy.md`

## Ambiente

O backend procura variaveis de ambiente em:
1. `.env` no diretorio atual do processo
2. `apps/api/.env`
3. `.env` na raiz do repositorio

Variaveis esperadas pela API:

```env
PORT=3333
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ALLOWED_ORIGINS=
```

- `SUPABASE_SERVICE_ROLE_KEY` e usado nas queries administrativas e nas regras do backend
- `SUPABASE_ANON_KEY` e opcional, mas recomendado para isolar o client efemero de autenticacao
- `CORS_ALLOWED_ORIGINS` aceita uma lista separada por virgula para restringir origens em producao

Variavel esperada pelos frontends:

```env
VITE_API_URL=http://127.0.0.1:3333
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- `admin-web` autentica direto no Supabase Auth e usa o access token da sessao para chamar a API
- o app do usuário consome esta API a partir de outro repositório

## Contrato de autenticacao

- a API valida o access token do Supabase em cada rota protegida
- o `sub` do token vira o `userId` canonico no backend
- roles administrativas sao lidas de `app_metadata.role`
- se `app_metadata.role` nao existir, a API faz fallback para `user_metadata.role`
- roles suportadas: `user`, `admin`, `superadmin`
- `admin` pode operar usuarios comuns, mas nao altera roles
- `superadmin` pode alterar roles e administrar contas administrativas

## Fluxos ativos

- `GET /health`
- `GET /ready`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET|PUT /me/profile`
- `GET /me/progress`
- `POST /checkins`
- `POST /certificates`
- `GET /admin/overview`
- `GET /admin/users`
- `GET /admin/users/:userId`
- `PATCH /admin/users/:userId`
- `GET /admin/checkpoints`
- `POST /admin/checkpoints`
- `PATCH /admin/checkpoints/:checkpointId`
- `GET /admin/checkins`
- `GET /admin/certificates`
- `POST /admin/certificates/:userId/issue`

## Query params uteis do admin

- `GET /admin/users?page=1&limit=20&search=texto&role=user|admin|superadmin`
- `GET /admin/checkpoints?page=1&limit=100`
- `GET /admin/checkins?page=1&limit=20&userId=<uuid>&checkpointId=<uuid>`
- `GET /admin/certificates?page=1&limit=20&userId=<uuid>`
- as listagens admin mantem o body em array e expõem metadados em `X-Page`, `X-Per-Page`, `X-Total-Count` e `X-Total-Pages`

## Estado atual

- backend alinhado com bearer token do Supabase
- regras admin agora dependem das roles do usuario no Supabase
- rotas administrativas principais implementadas
- API com CORS configuravel, healthcheck, readycheck e tratamento global para JSON invalido/404
- testes automatizados cobrindo regras centrais de auth/admin, validacao, CORS e endpoints operacionais basicos
- `admin-web` alinhado com Supabase Auth nativo, bearer token e operacao administrativa completa
- este repo agora representa `backend + admin web`
