# Backend Production Checklist

## Antes do deploy

- confirmar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` e `CORS_ALLOWED_ORIGINS`
- restringir `CORS_ALLOWED_ORIGINS` para os domínios reais de admin e app web
- garantir que pelo menos um usuário `superadmin` exista no Supabase Auth
- revisar se o schema remoto está consistente com [backend-database-contract.md](/Volumes/ssd_kayke/ciclorota-backend/docs/backend-database-contract.md)
- revisar se o ambiente tem `PORT` explícita

## Validação técnica antes do cutover

- rodar `npm run typecheck`
- rodar `npm run build`
- rodar `npm run test --workspace @ciclorota/api`
- subir a API localmente ou no ambiente alvo
- rodar `node scripts/api-smoke.mjs`

## Smoke test com autenticação

Variáveis opcionais para ampliar a cobertura:

```env
SMOKE_API_URL=http://127.0.0.1:3333
SMOKE_USER_BEARER_TOKEN=
SMOKE_ADMIN_BEARER_TOKEN=
SMOKE_ALLOW_WRITE=false
SMOKE_TEST_CHECKPOINT_ID=
SMOKE_TEST_USER_ID=
```

Recomendação:
- em produção, rodar primeiro sem `SMOKE_ALLOW_WRITE`
- só habilitar escrita com usuário de teste controlado

## Verificações funcionais

- `GET /health` responde `200`
- `GET /ready` responde `200`
- `GET /checkpoints` responde `200`
- com bearer de usuário: `GET /auth/me`, `GET /me/profile`, `GET /me/progress`
- com bearer admin: `GET /admin/overview`, `GET /admin/users`, `GET /admin/checkpoints`, `GET /admin/checkins`, `GET /admin/certificates`

## Pós-deploy

- verificar logs de inicialização e ausência de erro de credenciais
- confirmar `GET /ready` no ambiente publicado
- validar CORS a partir dos domínios finais
- validar pelo menos um fluxo admin e um fluxo user com tokens reais
- guardar evidência do deploy e da versão de schema aplicada
