# API Deploy

Este repositório publica:
- backend Express + Supabase
- admin web para operação interna

O app do usuário foi separado para outro repositório Expo.

## Docker da API

Build:

```bash
docker build -f apps/api/Dockerfile -t ciclorota-api .
```

Run:

```bash
docker run --rm -p 3333:3333 \
  -e PORT=3333 \
  -e SUPABASE_URL=... \
  -e SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e CORS_ALLOWED_ORIGINS=https://admin.ciclorota.app \
  ciclorota-api
```

## Checks antes do deploy

```bash
npm run verify
```

Checks mínimos no ambiente publicado:

```bash
curl http://127.0.0.1:3333/health
curl http://127.0.0.1:3333/ready
```

## Smoke test opcional

```bash
SMOKE_API_URL=http://127.0.0.1:3333 node scripts/api-smoke.mjs
```
