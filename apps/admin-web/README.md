# Admin Web

Painel administrativo web da Ciclorota mantido neste mesmo monorepo junto do backend.

## O que ja existe

- login por email e senha direto no Supabase Auth
- validacao da sessao contra `GET /auth/me`
- uso do bearer token do Supabase para consumir `/admin/*`
- leitura do overview administrativo protegido
- operacao real de usuarios, checkpoints, check-ins e certificados
- navegacao por rotas reais com guard de sessao e detalhe de usuario em `/users/:userId`
- estrutura organizada por `app`, `components`, `features`, `hooks`, `lib`, `services` e `types`
- base pronta para seguir sem acoplar ao app Expo do usuario

## Ambiente

```env
VITE_API_URL=http://127.0.0.1:3333
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Tambem existe um arquivo de exemplo em [`.env.example`](/Volumes/ssd_kayke/ciclorota-backend/apps/admin-web/.env.example).

## Estrutura

- `src/app`: shell principal e orquestracao do painel
- `src/components`: layout e UI reutilizavel
- `src/features`: secoes por dominio do admin
- `src/hooks`: auth/session state
- `src/lib`: env, auth, API, paginação, query helpers e formatacao
- `src/services`: integracao com `/auth/me` e `/admin/*`
- `src/types`: estados locais do admin web

## Rotas atuais

- `/login`
- `/overview`
- `/users`
- `/users/:userId`
- `/checkpoints`
- `/checkins`
- `/certificates`

## Validacao local

```bash
npm run typecheck --workspace @ciclorota/admin-web
npm run build --workspace @ciclorota/admin-web
npm run verify
```
