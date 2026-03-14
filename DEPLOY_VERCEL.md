# Deploy Vercel - App_Finanças

## 1) Frontend (Vite)

- Projeto: `frontend`
- Build command: `npm run build`
- Output dir: `dist`
- Install command: `npm install`

### Variáveis de ambiente (Environment Variables)
- `VITE_API_URL`: `https://<seu-backend>.vercel.app`

## 2) Backend (Node + Express)

- Projeto: `backend`
- Build command: `npm install`
- Start command: `npm run start` (ou `npm run dev` se não tiver script `start`)

### Variáveis de ambiente
- `DB_HOST` = Supabase host ou IP
- `DB_PORT` = 5432
- `DB_NAME` = postgres
- `DB_USER` = postgres
- `DB_PASSWORD` = <sua senha>
- `JWT_SECRET` = <seu segredo>
- `JWT_EXPIRES` = 10m
- `REFRESH_TOKEN_EXPIRES` = 30d
- `FRONTEND_URL` = https://<seu-frontend>.vercel.app

## 3) Testes após deploy

1. `https://<seu-backend>.vercel.app/api/health` deve responder 200.
2. `https://<seu-frontend>.vercel.app` deve mostrar login.
3. Login deve funcionar com `demo@financas.com / 123456`.

## 4) Nota
- Em produção, `frontend` usa `VITE_API_URL`, local usa proxy `/api` (config em `vite.config.js`).
