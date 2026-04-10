# API Reference

Base local padrão:

```text
http://127.0.0.1:3333
```

## Autenticação

Rotas protegidas exigem:

```http
Authorization: Bearer <supabase_access_token>
```

Sem token válido:
- `401`

Token válido sem permissão suficiente:
- `403`

Formato padrão de erro:

```json
{
  "error": "Mensagem"
}
```

## Infra

### `GET /`

- auth: pública
- response `200`:

```json
{
  "mensagem": "Bem-vindo à API do Passaporte da Ciclorota! 🚴‍♂️"
}
```

### `GET /health`

- auth: pública
- response `200`:

```json
{
  "status": "ok",
  "timestamp": "2026-04-08T12:00:00.000Z",
  "uptime_seconds": 123
}
```

### `GET /ready`

- auth: pública
- response `200` quando pronto
- response `503` quando faltar configuração crítica

## Sessão

### `POST /auth/login`

- auth: pública
- uso recomendado: apoio técnico; frontend final deve preferir Supabase Auth nativo

Request:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

### `POST /auth/refresh`

- auth: pública
- uso recomendado: apoio técnico; frontend final deve preferir Supabase Auth nativo

Request:

```json
{
  "refreshToken": "token"
}
```

### `GET /auth/me`

- auth: bearer
- response `200`: usuário autenticado + perfil atual

## Fluxos públicos/user

### `GET /checkpoints`

- auth: pública
- response `200`: lista enxuta de checkpoints com `id`, `name`, `description`, `latitude`, `longitude` e `map`

### `GET /me/profile`

- auth: bearer
- response `200`: perfil do usuário autenticado

### `PUT /me/profile`

- auth: bearer
- body:

```json
{
  "full_name": "Nome",
  "avatar_url": "https://..."
}
```

Validações:
- `full_name` até 120 chars
- `avatar_url` aceita `null`
- `avatar_url` deve ser URL `http(s)` quando presente

### `GET /me/progress`

- auth: bearer
- response `200`:

```json
{
  "total_visitados": 3,
  "historico": []
}
```

### `POST /checkins`

- auth: bearer
- body:

```json
[
  {
    "checkpoint_id": "uuid-ou-qr_code",
    "scanned_at": "2026-04-08T15:30:00.000Z"
  }
]
```

Regras:
- backend ignora `user_id` do cliente
- vínculo vem do token
- aceita no máximo 100 itens
- não aceita checkpoint repetido no mesmo payload
- aceita UUID do checkpoint ou `qr_code`

Status comuns:
- `201` sucesso
- `400` payload inválido
- `409` duplicidade

### `POST /me/certificates`

- auth: bearer
- emite certificado para o próprio usuário se elegível

Status comuns:
- `201` emitido
- `400` ainda não elegível
- `409` já emitido

## Fluxos admin

Todas as rotas abaixo exigem role `admin` ou `superadmin`.

### `GET /admin/overview`

- response `200`:

```json
{
  "summary": {
    "users": 0,
    "checkpoints": 0,
    "checkins": 0,
    "certificates": 0
  },
  "users": [],
  "recent_checkins": [],
  "checkpoints": []
}
```

### `GET /admin/users`

Query params:
- `page`
- `limit`
- `search`
- `role=user|admin|superadmin`

Headers:
- `X-Page`
- `X-Per-Page`
- `X-Total-Count`
- `X-Total-Pages`

### `GET /admin/users/:userId`

- `userId` deve ser UUID válido

### `PATCH /admin/users/:userId`

Body:

```json
{
  "full_name": "Nome",
  "avatar_url": null,
  "role": "admin"
}
```

Regras:
- `admin` não altera roles
- `admin` não gerencia contas admin/superadmin
- `superadmin` pode alterar roles
- ninguém altera a própria role por essa rota

### `GET /admin/checkpoints`

Query params:
- `page`
- `limit`

### `POST /admin/checkpoints`

Body:

```json
{
  "name": "Mirante Norte",
  "description": "Ponto panorâmico",
  "qr_code": "mirante-norte",
  "latitude": -23.123456,
  "longitude": -45.123456,
  "order": 1,
  "map": "https://..."
}
```

### `PATCH /admin/checkpoints/:checkpointId`

- `checkpointId` deve ser UUID válido
- aceita atualização parcial

### `GET /admin/checkins`

Query params:
- `page`
- `limit`
- `userId`
- `checkpointId`

### `GET /admin/certificates`

Query params:
- `page`
- `limit`
- `userId`

### `POST /admin/certificates/:userId/issue`

- emite certificado para o usuário alvo se elegível

## Aliases legados

Continuam funcionando:
- `GET /profiles/:userId`
- `PUT /profiles/:userId`
- `GET /progress/:userId`
- `POST /me/checkins`
- `POST /certificates`

Contrato preferido para novas integrações:
- `/me/*`
- `/admin/*`
- `POST /checkins`

## Paginação

As listagens admin devolvem array no body e paginação nos headers:

```http
X-Page: 1
X-Per-Page: 20
X-Total-Count: 42
X-Total-Pages: 3
```

## Erros recorrentes

### `401`

```json
{
  "error": "Cabeçalho Authorization ausente."
}
```

ou

```json
{
  "error": "Token inválido ou expirado."
}
```

### `403`

```json
{
  "error": "Acesso restrito a administradores."
}
```

### `404`

```json
{
  "error": "Rota não encontrada."
}
```

### `400`

```json
{
  "error": "Mensagem de validação"
}
```
