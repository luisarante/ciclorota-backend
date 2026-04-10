# Admin Web

Painel inicial da Ciclorota para operacao do produto.

## O que ja existe

- login por email e senha direto no Supabase Auth
- uso do bearer token do Supabase para consumir `/admin/*`
- leitura do overview administrativo protegido
- operacao real de usuarios, checkpoints, check-ins e certificados

## Ambiente

```env
VITE_API_URL=http://127.0.0.1:3333
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
