# Condition Found Reports

```bash
cp .env.example .env && cp server/.env.example server/.env && cp client/.env.example client/.env
docker compose up -d --wait        # Postgres
(cd server && npm i && npm run migrate && npm run dev)   # API on :3000
(cd client && npm i && npm run dev)                      # UI on :5173
```

API: `POST /api/cfrs` (client supplies `id` uuid, `title`, `location`, `severity`, optional `description`/`status`),
`GET /api/cfrs?limit=&offset=` (newest first). Schema lives in `server/migrations/*.sql`.
