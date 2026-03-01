# 🌿 Marcio Natural

Aplicação de gamificação de hábitos com sistema de pontos automáticos, leaderboard com polling e validação comunitária.

## Funcionalidades

- ✅ Cadastro e login de usuários (simples, sem email)
- ✅ Registro rápido de atividades via botão flutuante
- ✅ Sistema de pontos automático:
  - **Alimentação Limpa**: +10 pontos
  - **Alimentação Suja**: -10 pontos
  - **Exercício Físico**: +5 pontos (sempre positivo)
  - **Projeto Pessoal**: +50 pontos ao bater meta semanal de horas
- ✅ Leaderboard com atualização automática (polling de 10s)
- ✅ Sistema de votos para validação de tipos de atividade
- ✅ Projetos pessoais com meta de horas semanais
- ✅ Catálogo colaborativo de atividades (validado por votação)

## Como Funciona

### Sistema de Pontos

Os pontos são **automáticos** baseados no tipo de atividade:

| Categoria | Tipo | Pontos |
|-----------|------|--------|
| Refeição | Limpa/Saudável | +10 |
| Refeição | Suja/Não saudável | -10 |
| Exercício | Qualquer exercício | +5 |
| Projeto Pessoal | Meta semanal batida | +50 |

### Validação Comunitária

- Os usuários votam em **tipos de atividade**, não em entradas individuais
- 50%+1 de votos negativos → tipo de atividade é invalidado
- Entradas com tipo invalidado **não contam pontos**
- Cada usuário vota uma vez por tipo de atividade

### Projetos Pessoais

1. Crie um projeto com nome, descrição e meta de horas semanais
2. Registre tempo diário dedicado ao projeto
3. Ao bater a meta semanal → +50 pontos
4. Acompanhe o progresso semanal

## Tecnologias

### Backend
- **Bun** - Runtime JavaScript
- **Hono** - Framework HTTP leve
- **SQLite** - Banco de dados
- **JWT** - Autenticação com cookies HTTP-only (24h)

### Frontend
- **Vue 3** - Framework progressivo
- **Vue Router** - Roteamento
- **Tailwind CSS v4** - Estilização

### Infraestrutura
- **Docker Compose** - Orquestração de containers
- **Caddy** - Servidor web e proxy reverso

## Estrutura do Projeto

```
marcionatural/
├── back/                 # Backend (Bun + Hono)
│   ├── src/
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Lógica de negócio
│   │   ├── middleware/   # Autenticação
│   │   ├── utils/        # Utilitários (JWT)
│   │   ├── db.ts         # Configuração SQLite
│   │   ├── schema.sql    # Schema do banco
│   │   ├── seeds.sql     # Seeds iniciais
│   │   └── index.ts      # Entry point
│   └── Dockerfile
├── app/                  # Frontend (Vue 3)
│   ├── src/
│   │   ├── components/   # Componentes (Sidebar, FAB, etc)
│   │   ├── views/        # Telas (Leaderboard, Projetos, etc)
│   │   ├── services/     # API client
│   │   ├── stores/       # Estado global (auth)
│   │   ├── types/        # Tipos TypeScript
│   │   └── router/       # Rotas
│   └── Dockerfile
└── docker-compose.yml    # Orquestração Docker
```

## Como Rodar

### Com Docker (Recomendado)

```bash
# Construir e subir os containers
docker-compose up --build

# Acessar a aplicação
http://localhost

# Parar os containers
docker-compose down
```

### Desenvolvimento Local

#### Backend

```bash
cd back
bun install
bun run dev
# http://localhost:3000
```

#### Frontend

```bash
cd app
bun install
bun run dev
# http://localhost:5173
```

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuário logado

### Leaderboard
- `GET /api/leaderboard` - Ranking (polling 10s)
- `GET /api/leaderboard/users` - Lista de usuários
- `GET /api/leaderboard/users/:id/entries` - Entradas de usuário

### Entradas
- `GET /api/entries` - Minhas entradas
- `POST /api/entries` - Criar entrada
- `PUT /api/entries/:id` - Atualizar entrada
- `DELETE /api/entries/:id` - Deletar entrada
- `GET /api/entries/activity-types/options` - Tipos disponíveis

### Activity Types e Votação
- `GET /api/activity-types` - Todos os tipos
- `GET /api/activity-types/validated` - Tipos validados
- `GET /api/activity-types/category/:id` - Por categoria
- `POST /api/activity-types/:id/vote` - Votar
- `GET /api/activity-types/:id/validation-status` - Status
- `POST /api/activity-types` - Criar novo tipo

### Projetos Pessoais
- `GET /api/projects` - Meus projetos
- `POST /api/projects` - Criar projeto
- `PUT /api/projects/:id` - Atualizar projeto
- `DELETE /api/projects/:id` - Deletar projeto
- `POST /api/projects/:id/log` - Registrar tempo
- `GET /api/projects/:id/weekly-progress` - Progresso semanal

## Telas do Frontend

1. **Leaderboard** (`/leaderboard`)
   - Ranking de usuários com polling de 10s
   - Clique para ver entradas de cada usuário

2. **Minhas Entradas** (`/my-entries`)
   - CRUD de entradas
   - Separação: positivas, negativas, invalidadas

3. **Projetos Pessoais** (`/projects`)
   - Lista de projetos
   - Criar/editar projetos
   - Registrar tempo diário
   - Ver progresso semanal

4. **Usuários** (`/users`)
   - Lista de todos os usuários
   - Ver entradas de cada um

5. **Votação** (`/voting`)
   - Votar em tipos de atividade
   - Ver status de validação
   - Filtros por categoria e status

## Botão Flutuante

Disponível em todas as telas (canto inferior direito):
- 📝 **Nova Entrada Rápida**: Registrar refeição ou exercício
- ⏱️ **Registrar Projeto**: Adicionar tempo a projeto pessoal

## Regras de Negócio

### Validação de Activity Types
- Tipos são válidos por padrão
- Votos: 👍 (positivo) ou 👎 (negativo)
- 50%+1 negativos → invalidado
- Entradas com tipo invalidado → pontos = 0

### Projeto Pessoal
- Meta: horas semanais definidas pelo usuário
- Registro: diário, em minutos
- Pontuação: +50 se bater meta na semana
- Semana: padrão ISO (segunda a domingo)

## Licença

MIT
