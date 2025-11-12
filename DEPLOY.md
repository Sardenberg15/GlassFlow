# Deploy – Versão A (Front no Vercel, API em Render/Railway)

Esta configuração mantém o cliente (Vite + React) na Vercel e o servidor Express em um host de Node tradicional (Render/Railway). O banco é Supabase Postgres.

## Visão geral

- Frontend: Vercel (build `npm run build`, output `dist/public`)
- Backend: Render/Railway (start `npm run start`)
- Banco: Supabase (`DATABASE_URL`)
- Rewrites: `vercel.json` encaminha `"/api/*"` e `"/objects/*"` para o backend

## Passos – Backend (Render)

1. Crie um Web Service a partir deste repositório (ou outro repositório com a pasta `server/`).
2. Defina os comandos:
   - Build: `npm run build`
   - Start: `npm run start`
3. Variáveis de ambiente:
   - `NODE_ENV=production`
   - `DATABASE_URL=<string de conexão do Supabase>`
   - `SESSION_SECRET=<valor aleatório grande>`
   - (opcional) `USE_MEMORY_STORAGE=0`
4. Porta: Render define `PORT` automaticamente; o servidor já lê `process.env.PORT`.

## Passos – Backend (Railway)

1. Crie um serviço Node.js e conecte este repositório.
2. Build: `npm run build`, Start: `npm run start`.
3. Variáveis de ambiente iguais às do Render.
4. Porta: o `PORT` é injetado pelo Railway e usado pelo servidor.

## Passos – Banco (Supabase)

1. Crie um projeto Supabase e copie a string de conexão Postgres.
2. Cole em `DATABASE_URL` no serviço backend.
3. (Opcional) Inicialize tabelas via endpoint admin:
   - `POST https://<SEU_BACKEND_HOST>/api/admin/init-schema`

## Passos – Frontend (Vercel)

1. Conecte este repositório à Vercel.
2. Garanta que o projeto usa a raiz do repo e o Vercel detecte Vite.
3. O arquivo `vercel.json` já define:
   - `buildCommand: npm run build`
   - `outputDirectory: dist/public`
   - `rewrites` para `/api/*` e `/objects/*`
4. Atualize `vercel.json` com o seu domínio do backend:
   - `"destination": "https://SEU_BACKEND_HOST/api/$1"`
   - `"destination": "https://SEU_BACKEND_HOST/objects/$1"`

## Uploads de arquivos

- Produção: recomende usar armazenamento externo (Supabase Storage / S3 / GCS). A implementação GCS via Sidecar é específica do Replit; configure serviço próprio se necessário.
- Local fallback: existe rota `/objects/uploads/:id` quando `USE_LOCAL_OBJECTS` em dev.

## Dicas

- Logs: Render/Railway oferecem logs em tempo real; o servidor loga requisições de `/api/*` com tempo e resposta truncada.
- CORS: usando rewrites no Vercel, não é necessário CORS para o cliente. Considere CORS apenas se acessar a API a partir de outros domínios.

## Teste final

1. Acesse o domínio da Vercel e navegue nas páginas.
2. Valide que chamadas `"/api/*"` funcionam (Clientes, Projetos, Transações, Orçamentos, Bills).
3. Gere PDF/arquivos e verifique `"/objects/*"`.