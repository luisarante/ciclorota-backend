# Backend Schema Reconciliation

Este guia serve para comparar o projeto Supabase já existente com o baseline versionado em:
- [20260408_000001_core_schema.sql](/Volumes/ssd_kayke/ciclorota-backend/supabase/migrations/20260408_000001_core_schema.sql)

## Objetivo

Garantir que o banco remoto respeita as invariantes que a API já assume hoje:
- `profiles.id` referencia `auth.users(id)`
- `checkpoints.qr_code` é único
- `checkpoints.order` é único e positivo
- `checkins` tem unicidade por `(user_id, checkpoint_id)`
- `certificates` tem unicidade por `user_id`

## Ordem sugerida

1. comparar tabelas e colunas
2. comparar constraints e índices
3. comparar dados problemáticos antes de criar constraints
4. só depois aplicar ajustes no ambiente remoto

## SQL de inspeção

### Tabelas principais

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'checkpoints', 'checkins', 'certificates')
order by table_name;
```

### Colunas

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'checkpoints', 'checkins', 'certificates')
order by table_name, ordinal_position;
```

### Índices e constraints

```sql
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name in ('profiles', 'checkpoints', 'checkins', 'certificates')
order by tc.table_name, tc.constraint_type, tc.constraint_name;
```

## SQL de auditoria de dados antes de impor unicidade

### `checkpoints.qr_code`

```sql
select qr_code, count(*)
from public.checkpoints
group by qr_code
having count(*) > 1;
```

### `checkpoints.order`

```sql
select "order", count(*)
from public.checkpoints
group by "order"
having count(*) > 1;
```

### `checkins (user_id, checkpoint_id)`

```sql
select user_id, checkpoint_id, count(*)
from public.checkins
group by user_id, checkpoint_id
having count(*) > 1;
```

### `certificates.user_id`

```sql
select user_id, count(*)
from public.certificates
group by user_id
having count(*) > 1;
```

## Resultado esperado

No final da reconciliação:
- a API e o banco passam a compartilhar um contrato versionado
- novos ambientes podem nascer diretamente da migration
- o frontend passa a depender de um backend com menos risco estrutural
