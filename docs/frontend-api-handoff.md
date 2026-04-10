# Frontend API Handoff

Este documento serve para o repositório do frontend integrar com este backend sem depender de leitura de código da API.

## Decisão principal

Para o frontend final:
- autenticar direto no Supabase Auth
- ler a role do usuário em `session.user.app_metadata.role`
- usar fallback em `session.user.user_metadata.role`
- enviar `Authorization: Bearer <supabase_access_token>` para a API

## Roles

Roles suportadas:
- `user`
- `admin`
- `superadmin`

Regras:
- `user` acessa apenas fluxos do próprio usuário
- `admin` acessa `/admin/*`, mas não altera roles e não gerencia contas admin/superadmin
- `superadmin` acessa `/admin/*` e pode alterar roles

## Fluxo recomendado no frontend

1. fazer login com Supabase Auth no próprio frontend
2. obter `session.access_token`
3. montar um client HTTP com header `Authorization: Bearer <token>`
4. chamar `GET /auth/me` se quiser confirmar sessão/role contra a API
5. usar rotas `/me/*` para dados do usuário autenticado
6. usar `/admin/*` apenas quando a role local for `admin` ou `superadmin`

## O que o frontend não deve fazer

- não confiar em `userId` para rotas do próprio usuário
- não enviar `user_id` no payload de `POST /checkins`
- não depender de `POST /auth/login` ou `POST /auth/refresh` no produto final se o login já é Supabase nativo

## Headers importantes

Bearer:

```http
Authorization: Bearer <supabase_access_token>
```

Paginação administrativa:
- `X-Page`
- `X-Per-Page`
- `X-Total-Count`
- `X-Total-Pages`

## Rotas preferidas

### Saúde e infra

- `GET /health`
- `GET /ready`

### Sessão

- `GET /auth/me`

Observação:
- `POST /auth/login` e `POST /auth/refresh` existem, mas são auxiliares; o frontend final deve preferir o client oficial do Supabase

### Usuário autenticado

- `GET /checkpoints`
- `GET /me/profile`
- `PUT /me/profile`
- `GET /me/progress`
- `POST /checkins`
- `POST /me/certificates`

### Admin

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

## Aliases legados ainda disponíveis

Eles continuam funcionando, mas não são o contrato preferido para o frontend novo:
- `GET /profiles/:userId`
- `PUT /profiles/:userId`
- `GET /progress/:userId`
- `POST /me/checkins`
- `POST /certificates`

## Exemplos de request/response

### `GET /auth/me`

Request:

```http
GET /auth/me
Authorization: Bearer <token>
```

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "is_admin": true
  },
  "profile": {
    "id": "uuid",
    "full_name": "Nome",
    "avatar_url": "https://...",
    "estatisticas": {
      "total_pontos_visitados": 3,
      "possui_certificado": false,
      "data_certificado": null
    }
  }
}
```

### `GET /me/profile`

Response `200`:

```json
{
  "id": "uuid",
  "full_name": "Nome",
  "avatar_url": "https://...",
  "estatisticas": {
    "total_pontos_visitados": 3,
    "possui_certificado": false,
    "data_certificado": null
  }
}
```

### `PUT /me/profile`

Request:

```json
{
  "full_name": "Novo Nome",
  "avatar_url": "https://cdn.exemplo.com/avatar.png"
}
```

Response `200`:

```json
{
  "id": "uuid",
  "full_name": "Novo Nome",
  "avatar_url": "https://cdn.exemplo.com/avatar.png"
}
```

Notas:
- `avatar_url` pode ser `null`
- `full_name` aceita no máximo 120 caracteres

### `GET /me/progress`

Response `200`:

```json
{
  "total_visitados": 3,
  "historico": [
    {
      "id": "uuid",
      "scanned_at": "2026-04-08T15:30:00.000Z",
      "checkpoints": {
        "id": "uuid",
        "name": "Mirante Norte",
        "description": "Ponto panorâmico",
        "qr_code": "mirante-norte"
      }
    }
  ]
}
```

### `POST /checkins`

Request:

```json
[
  {
    "checkpoint_id": "uuid-ou-qr_code",
    "scanned_at": "2026-04-08T15:30:00.000Z"
  }
]
```

Response `201`:

```json
{
  "mensagem": "Check-ins sincronizados com sucesso na Mata Atlântica!",
  "dados": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "checkpoint_id": "uuid",
      "scanned_at": "2026-04-08T15:30:00.000Z",
      "created_at": "2026-04-08T15:31:00.000Z"
    }
  ]
}
```

Notas:
- o backend ignora qualquer `user_id` enviado pelo cliente
- o vínculo é sempre feito com o `sub` do token
- `checkpoint_id` aceita UUID real do checkpoint ou `qr_code`
- o backend persiste sempre o UUID canônico do checkpoint

### `GET /checkpoints`

Response `200`:

```json
[
  {
    "id": "uuid",
    "name": "Mirante Norte",
    "description": "Ponto panorâmico",
    "latitude": -23.123456,
    "longitude": -45.123456,
    "map": "https://maps.example.com/mirante-norte"
  }
]
```

### `POST /me/certificates`

Response `201`:

```json
{
  "mensagem": "Certificado da Ciclorota emitido com sucesso.",
  "certificado": {
    "id": "uuid",
    "user_id": "uuid",
    "issued_at": "2026-04-08T16:00:00.000Z"
  }
}
```

Se inelegível, `400`:

```json
{
  "error": "Conclusão pendente: Você visitou 3 de 9 pontos."
}
```

### `GET /admin/overview`

Response `200`:

```json
{
  "summary": {
    "users": 42,
    "checkpoints": 9,
    "checkins": 180,
    "certificates": 7
  },
  "users": [],
  "recent_checkins": [],
  "checkpoints": []
}
```

### `GET /admin/users?page=1&limit=20&search=ana&role=admin`

Response `200`:

```json
[
  {
    "id": "uuid",
    "email": "ana@example.com",
    "role": "admin",
    "full_name": "Ana",
    "avatar_url": null,
    "created_at": "2026-04-01T10:00:00.000Z",
    "total_checkins": 5,
    "has_certificate": false,
    "certificate_issued_at": null,
    "is_admin": true
  }
]
```

Headers:

```http
X-Page: 1
X-Per-Page: 20
X-Total-Count: 1
X-Total-Pages: 1
```

### `PATCH /admin/users/:userId`

Request:

```json
{
  "full_name": "Ana Nova",
  "avatar_url": null,
  "role": "admin"
}
```

Notas:
- `role` só deve ser enviado por `superadmin`
- `admin` comum consegue atualizar dados operacionais, mas não a role

### `POST /admin/checkpoints`

Request:

```json
{
  "name": "Mirante Norte",
  "description": "Ponto panorâmico",
  "qr_code": "mirante-norte",
  "latitude": -23.123456,
  "longitude": -45.123456,
  "order": 1,
  "map": "https://maps.example.com/mirante-norte"
}
```

### `GET /admin/checkins?page=1&limit=20&userId=<uuid>&checkpointId=<uuid>`

Response `200`:

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "user_email": "user@example.com",
    "full_name": "Nome",
    "scanned_at": "2026-04-08T15:30:00.000Z",
    "checkpoint_name": "Mirante Norte",
    "checkpoint_description": "Ponto panorâmico"
  }
]
```

### `GET /admin/certificates?page=1&limit=20&userId=<uuid>`

Response `200`:

```json
[
  {
    "user_id": "uuid",
    "issued_at": "2026-04-08T16:00:00.000Z",
    "email": "user@example.com",
    "full_name": "Nome",
    "avatar_url": null
  }
]
```

### `POST /admin/certificates/:userId/issue`

Response `201`:

```json
{
  "mensagem": "Certificado da Ciclorota emitido com sucesso.",
  "certificado": {
    "id": "uuid",
    "user_id": "uuid",
    "issued_at": "2026-04-08T16:00:00.000Z"
  }
}
```

## Erros esperados

### `401`

Quando:
- não há bearer token
- o token expirou
- o token é inválido

Shape:

```json
{
  "error": "Cabeçalho Authorization ausente."
}
```

ou:

```json
{
  "error": "Token inválido ou expirado."
}
```

### `403`

Quando:
- usuário autenticado sem permissão admin
- acesso a recurso de outro usuário sem permissão

Shape:

```json
{
  "error": "Acesso restrito a administradores."
}
```

### `400`

Quando:
- payload inválido
- filtro inválido
- UUID inválido
- elegibilidade insuficiente para certificado

### `409`

Quando:
- check-in duplicado
- certificado já emitido

## Sugestão de client HTTP no frontend

```ts
async function apiFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }

  return payload as T;
}
```

## Fonte tipada

Os tipos compartilhados usados neste monorepo estão em:
- [packages/shared/src/index.ts](/Volumes/ssd_kayke/ciclorota-backend/packages/shared/src/index.ts)

Se o frontend final estiver em outro repositório, vale copiar ou publicar esse contrato para evitar drift de tipos.
