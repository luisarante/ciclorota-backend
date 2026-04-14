# Repo Scope

## Escopo deste repositório

Este repositório é responsável por:
- backend da Ciclorota
- admin web da Ciclorota

## Fora deste repositório

O app do usuário não vive mais aqui.

Ele foi separado para outro repositório Expo e deve integrar com este backend por contrato HTTP e Supabase Auth.

## Implicações práticas

- decisões de UI/admin continuam aqui
- decisões de API/auth/admin continuam aqui
- qualquer referência ao app do usuário neste repositório deve ser tratada apenas como contrato de integração, não como código-fonte local

## Estratégia de branches

- `main`: base estável
- `feature/platform-restructure`: branch de evolução desta nova estrutura
- `develop`: pode ser criada depois para integração, quando a nova base estiver madura
