# ✦ Logos — Portal de Estudos Bíblicos

> Plataforma modular para estudo sistemático das escrituras com referências cruzadas, notas e exportação em PDF.

## Stack

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Frontend   | Vue 3 + Vite + Pinia + Vue Router |
| Backend    | Node.js + Fastify                 |
| Banco      | PostgreSQL 15+                    |
| Auth       | JWT + bcrypt (+ OAuth Google)     |
| PDF Export | Puppeteer                         |
| Deploy     | Railway (sugerido)                |

## Estrutura do Monorepo

```
logos/
├── frontend/          # Vue 3 SPA
│   └── src/
│       ├── modules/   # Funcionalidades isoladas
│       ├── shared/    # Componentes e utils globais
│       ├── router/    # Vue Router
│       └── layouts/   # Layouts base
│
├── backend/           # API Fastify
│   └── src/
│       ├── modules/   # Rotas + serviços por domínio
│       ├── shared/    # Middlewares e utilitários
│       ├── database/  # Migrations e seeds
│       └── config/    # Configurações centralizadas
│
└── package.json       # Workspace raiz
```

## Como rodar localmente

### 1. Pré-requisitos
- Node.js 20+
- PostgreSQL 15+

### 2. Clone e instale
```bash
git clone https://github.com/seu-usuario/logos.git
cd logos
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite os arquivos .env com suas configurações
```

### 4. Crie o banco e rode as migrations
```bash
createdb logos_dev
npm run db:migrate
npm run db:seed
```

### 5. Inicie em modo desenvolvimento
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

## Módulos

| # | Módulo          | Status |
|---|-----------------|--------|
| 1 | Auth            | 🔧 Em desenvolvimento |
| 2 | Bíblia (leitura)| 🔧 Em desenvolvimento |
| 3 | Referências cruzadas | 🔧 Em desenvolvimento |
| 4 | Estudos         | 🔧 Em desenvolvimento |
| 5 | Notas           | 🔧 Em desenvolvimento |
| 6 | Marcações       | 🔧 Em desenvolvimento |
| 7 | Exportação PDF  | 🔧 Em desenvolvimento |
| 8 | Auditoria       | 🔧 Em desenvolvimento |

## Licença
Privado — todos os direitos reservados.
## Desenvolvedor
Desenvolvido e criado por Charleston Santos