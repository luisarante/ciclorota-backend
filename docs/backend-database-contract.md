# Backend Database Contract

Este documento descreve o contrato de banco que a API atual já pressupõe.

## Tabelas principais

### `profiles`

Campos esperados:
- `id uuid primary key`
- `full_name text null`
- `avatar_url text null`
- `created_at timestamptz`
- `updated_at timestamptz`

Regras consumidas pela API:
- `id` representa o mesmo UUID do usuário autenticado no Supabase
- `full_name` aceita até 120 caracteres
- `avatar_url` pode ser `null`

### `checkpoints`

Campos esperados:
- `id uuid primary key`
- `created_at timestamptz`
- `updated_at timestamptz`
- `name text`
- `description text`
- `qr_code text`
- `latitude double precision`
- `longitude double precision`
- `order integer`
- `map text null`

Regras consumidas pela API:
- `qr_code` é único
- `order` é positivo e único
- `latitude` e `longitude` são números válidos
- o app user pode enviar `checkpoint_id` como UUID ou `qr_code`; o backend sempre persiste o UUID canônico do checkpoint

### `checkins`

Campos esperados:
- `id uuid primary key`
- `user_id uuid`
- `checkpoint_id uuid`
- `scanned_at timestamptz`
- `created_at timestamptz`

Regras consumidas pela API:
- um usuário só pode ter um check-in por checkpoint
- `scanned_at` precisa chegar em ISO-8601 válido
- a listagem administrativa ordena por `scanned_at desc`

### `certificates`

Campos esperados:
- `id uuid primary key`
- `user_id uuid`
- `issued_at timestamptz`
- `created_at timestamptz`

Regras consumidas pela API:
- um usuário só pode ter um certificado
- a emissão depende de o total de check-ins do usuário ser igual ao total de checkpoints cadastrados

## Invariantes importantes

- `profiles.id`, `checkins.user_id` e `certificates.user_id` referenciam `auth.users(id)`
- `checkins.checkpoint_id` referencia `checkpoints(id)`
- o backend usa `SUPABASE_SERVICE_ROLE_KEY`, então ele opera com privilégios administrativos no banco
- a autenticação do usuário continua vindo do JWT do Supabase; o banco não é a fonte de autorização HTTP

## Artefato versionado

O baseline SQL equivalente está em:
- [20260408_000001_core_schema.sql](/Volumes/ssd_kayke/ciclorota-backend/supabase/migrations/20260408_000001_core_schema.sql)

Esse arquivo serve como contrato inicial para novos ambientes e como referência para reconciliar ambientes já existentes.
