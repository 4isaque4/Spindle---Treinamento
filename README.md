# Spindle Demo Minimal

Versao enxuta do projeto para demonstracao e treinamento, mantendo apenas o que funciona hoje:

- frontend React/Vite
- backend Node/Express
- chat com Dify
- feedbacks e correcoes salvos em JSON local
- publicacao manual de correcoes no Dify

## O que ficou fora desta branch

- Windmill
- Docker
- Nginx
- Heroku
- scripts antigos de deploy
- documentacao auxiliar e arquivos de experimento

## Estrutura

```text
apps/
  backend/
  frontend/
```

## Requisitos

- Node.js 18+
- npm 8+

## Configuracao

1. Instale as dependencias na raiz:

```bash
npm install
```

2. Crie os arquivos de ambiente:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

3. Preencha as chaves do Dify no backend.

## Rodando localmente

Em dois terminais:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Ou juntos:

```bash
npm run dev
```

## URLs locais

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Variaveis essenciais

Backend:

- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `DIFY_CHAT_API_KEY`
- `DIFY_DATASET_API_KEY`
- `DIFY_DATASET_ID`

Frontend:

- `VITE_API_URL`

## Como hospedar rapido

Para a apresentacao, a forma mais simples e:

1. subir o backend em um servico Node
2. buildar o frontend com `npm run build -w apps/frontend`
3. publicar a pasta `apps/frontend/dist`
4. definir `VITE_API_URL` apontando para a URL publica do backend

## Observacoes

- Os dados ficam em `apps/backend/data/*.json`
- Se quiser preservar historico, copie esses arquivos junto
- Esta branch e focada em demonstracao, nao em infraestrutura completa
