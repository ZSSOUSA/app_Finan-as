# 💰 FinançasPro — Fullstack App

App de finanças pessoais com Node.js + PostgreSQL (backend) e React + Vite (frontend).

---

## 🗂️ Estrutura do projeto

```
financaspro/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # Pool de conexão PostgreSQL
│   │   │   ├── migrate.js        # Cria todas as tabelas
│   │   │   └── seed.js           # Dados demo
│   │   ├── controllers/
│   │   │   ├── authController.js         # Login, registro, JWT
│   │   │   ├── transactionController.js  # CRUD de transações
│   │   │   └── financeController.js      # Carteiras, metas, orçamentos
│   │   ├── middlewares/
│   │   │   └── auth.js           # Middleware JWT
│   │   ├── routes/
│   │   │   └── index.js          # Todas as rotas da API
│   │   └── server.js             # Entry point Express
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx   # Estado global de autenticação
    │   ├── hooks/
    │   │   └── useFinance.js     # Hooks para dados da API
    │   ├── services/
    │   │   └── api.js            # Axios + auto refresh token
    │   ├── components/
    │   │   └── Layout.jsx        # Sidebar + topbar
    │   ├── pages/
    │   │   ├── Login.jsx         # Tela de login/cadastro
    │   │   ├── Dashboard.jsx     # Resumo + gráficos
    │   │   ├── Transactions.jsx  # CRUD de transações
    │   │   ├── Wallets.jsx       # Carteiras + transferências
    │   │   ├── Budgets.jsx       # Orçamento por categoria
    │   │   ├── Goals.jsx         # Metas financeiras
    │   │   ├── Reports.jsx       # Relatórios e gráficos
    │   │   └── Profile.jsx       # Configurações do usuário
    │   ├── App.jsx               # Rotas + proteção de acesso
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Pré-requisitos

- Node.js v18+
- PostgreSQL 14+

---

## 🚀 Como rodar

### 1. Clone e configure o backend

```bash
cd financaspro/backend
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL
npm install
```

### 2. Crie o banco e rode as migrations

```bash
# Crie o banco no PostgreSQL:
psql -U postgres -c "CREATE DATABASE financaspro;"

# Rode as migrations (cria todas as tabelas):
npm run db:migrate

# Popule com dados demo:
npm run db:seed
```

### 3. Inicie o backend

```bash
npm run dev
# API disponível em: http://localhost:3001
# Health check:      http://localhost:3001/health
```

### 4. Configure e inicie o frontend

```bash
cd ../frontend
npm install
npm run dev
# Frontend disponível em: http://localhost:5173
```

### 5. Acesse o app

Abra http://localhost:5173 e faça login com:
- **E-mail:** demo@financas.com
- **Senha:** 123456

---

## 📡 Endpoints da API

### Auth
| Método | Rota               | Descrição               |
|--------|--------------------|-------------------------|
| POST   | /api/auth/register | Cadastrar novo usuário  |
| POST   | /api/auth/login    | Login                   |
| POST   | /api/auth/refresh  | Renovar token           |
| POST   | /api/auth/logout   | Logout                  |
| GET    | /api/auth/me       | Dados do usuário logado |

### Transações
| Método | Rota                        | Descrição            |
|--------|-----------------------------|----------------------|
| GET    | /api/transactions           | Listar (com filtros) |
| GET    | /api/transactions/summary   | Resumo mensal        |
| POST   | /api/transactions           | Criar transação      |
| PUT    | /api/transactions/:id       | Atualizar            |
| DELETE | /api/transactions/:id       | Remover              |

### Carteiras
| Método | Rota                    | Descrição                |
|--------|-------------------------|--------------------------|
| GET    | /api/wallets            | Listar carteiras         |
| GET    | /api/wallets/balance    | Saldo total              |
| POST   | /api/wallets            | Criar carteira           |
| PUT    | /api/wallets/:id        | Atualizar carteira       |
| POST   | /api/wallets/transfer   | Transferir entre contas  |

### Metas & Orçamento
| Método | Rota           | Descrição                 |
|--------|----------------|---------------------------|
| GET    | /api/goals     | Listar metas              |
| POST   | /api/goals     | Criar meta                |
| PUT    | /api/goals/:id | Atualizar meta/progresso  |
| GET    | /api/budgets   | Listar orçamentos do mês  |
| POST   | /api/budgets   | Criar/atualizar orçamento |
| GET    | /api/categories| Listar categorias         |

---

## 🗄️ Schema do banco

```
users           → dados do usuário
wallets         → contas/carteiras
categories      → categorias de transação
transactions    → receitas e despesas
goals           → metas financeiras
budgets         → limites mensais por categoria
transfers       → transferências entre contas
refresh_tokens  → tokens de sessão
```

---

## 🔐 Segurança implementada

- Senhas com bcrypt (salt 12)
- JWT access token (7 dias) + refresh token (30 dias)
- Refresh automático de token expirado
- Rotas protegidas com middleware de autenticação
- Validação de inputs com express-validator
- CORS configurado

---

## 🛠️ Próximos passos sugeridos

- [ ] Tela de categorias customizadas
- [ ] Transações recorrentes automáticas
- [ ] Upload de comprovantes (imagens)
- [ ] Importação de extrato bancário (CSV/OFX)
- [ ] Push notifications / e-mail de alertas
- [ ] Deploy: Railway (backend) + Vercel (frontend)
- [ ] Versão mobile com React Native / Expo
