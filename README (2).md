# cosmos-api

Backend do almanaque COSMOS. Node.js + Express + PostgreSQL.

## Endpoints atuais

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/health` | Verifica se serviço + DB estão vivos |
| `GET`  | `/api/testimonials` | Lista testemunhos, mais recentes primeiro (max 200) |
| `POST` | `/api/testimonials` | Submete testemunho (rate-limited: 5 por 10 min por IP) |

## Estrutura

```
cosmos-api/
├── server.js              ← Express + rotas
├── db.js                  ← ligação e migrações Postgres
├── migrations/init.sql    ← schema (corre automático no boot)
├── package.json
├── render.yaml            ← deploy declarativo
└── .env.example
```

## Local development

Precisas de Node 20+ e PostgreSQL a correr.

```bash
# 1. Instalar dependências
npm install

# 2. Criar base de dados local
createdb cosmos

# 3. Copiar .env.example para .env e ajustar DATABASE_URL
cp .env.example .env

# 4. Arrancar em modo watch (recarrega ao alterar código)
npm run dev
```

Testa que está vivo:

```bash
curl http://localhost:3000/health
# → {"status":"ok","db":"connected",...}

curl -X POST http://localhost:3000/api/testimonials \
  -H "Content-Type: application/json" \
  -d '{"name":"A.","place":"Arouca","story":"Fui ver o eclipse no cimo do Monte da Freita."}'
# → {"testimonial":{"id":1,...}}

curl http://localhost:3000/api/testimonials
# → {"count":1,"testimonials":[{...}]}
```

## Deploy em Render

Ver `RENDER-SETUP.md` na raiz do repo para o guia passo-a-passo.

Resumo: `render.yaml` faz tudo — cria serviço + DB e liga a variável
`DATABASE_URL` automaticamente. Único passo manual pós-deploy é preencher
`FRONTEND_ORIGIN` no dashboard com a URL do frontend.

## Extending

Para adicionar novos endpoints:

1. Adiciona rota no `server.js`
2. Se precisares de nova tabela, edita `migrations/init.sql`
   (é seguro adicionar `CREATE TABLE IF NOT EXISTS` — corre em cada boot)
3. Commit + push — Render faz deploy automaticamente
