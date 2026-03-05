# 🌿 Marcio Natural

Aplicação de gamificação de hábitos com sistema de pontos automáticos, leaderboard com polling e validação comunitária via reports.

## Funcionalidades

- ✅ Cadastro e login de usuários (simples, sem email)
- ✅ Registro rápido de atividades via botão flutuante
- ✅ **Upload de fotos** com conversão automática para WebP
- ✅ Sistema de pontos automático
- ✅ Leaderboard com atualização automática (polling de 10s)
- ✅ **Sistema de reports** para validação comunitária
- ✅ Projetos pessoais com meta de horas semanais
- ✅ Layout **mobile-first** com sidebar retrátil

## Como Funciona

### Sistema de Pontos

Os pontos são **automáticos** baseados no tipo de atividade:

| Categoria | Tipo | Pontos | Teto Diário |
|-----------|------|--------|-------------|
| Refeição | Limpa/Saudável | +10 | ±10 |
| Refeição | Suja/Não saudável | -10 | ±10 |
| Exercício | Qualquer exercício | +5 | 5 |
| Entorpecentes | Usar Tabaco | -5 | -5 |
| Projeto Pessoal | Meta semanal batida | +50 | 50/semana |

### Regras de Negócio

#### Limite de 1 Entrada por Categoria por Dia

- **Apenas 1 registro por categoria por dia civil**: O sistema permite apenas UMA entrada de cada categoria por dia
- **Tetos diários de pontos**: Cada categoria tem um teto máximo de pontos que pode ser ganho/perdido por dia
- **Data de referência obrigatória**: Toda entrada deve informar o dia em que a atividade ocorreu (formato YYYY-MM-DD)
- **Cadastro retroativo permitido**: Você pode registrar entradas de dias anteriores

#### Por que essa regra?

Esta regra beneficia quem mantém consistência ao longo do dia, em vez de acumular pontos com múltiplas entradas da mesma categoria.

#### Exemplos Práticos

| Situação | Pontos | Permitido? |
|----------|--------|------------|
| 1 refeição limpa no dia | +10 | ✅ Sim |
| 1 refeição suja no dia | -10 | ✅ Sim |
| Tentar 2ª refeição no mesmo dia | — | ❌ Bloqueado |
| 1 exercício no dia | +5 | ✅ Sim |
| Tentar 2º exercício no mesmo dia | — | ❌ Bloqueado |
| 1 registro de tabaco no dia | -5 | ✅ Sim |
| Tentar 2º registro de tabaco no mesmo dia | — | ❌ Bloqueado |
| 1 alimentação + 1 exercício no mesmo dia | +15 | ✅ Sim (categorias diferentes) |
| Alimentação em dias diferentes | +10 por dia | ✅ Sim |

#### Tetos Diários por Categoria

| Categoria | Teto Máximo | Teto Mínimo |
|-----------|-------------|-------------|
| **Alimentação** | +10 | -10 |
| **Exercícios** | +5 | 0 |
| **Entorpecentes** | 0 | -5 |
| **Projetos Pessoais** | +50/semana | 0 |

### Validação Comunitária (Reports)

- Usuários **reportam entradas suspeitas** de outros usuários
- **3 ou mais reports** → entrada automaticamente invalidada
- Entradas invalidadas **não contam pontos** no leaderboard
- Tela de votação mostra:
  - Entradas pendentes para votar
  - Minhas entradas invalidadas
  - Todas as entradas invalidadas pela comunidade

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
- **Sharp** - Processamento de imagens (WebP)

### Frontend
- **Vue 3** - Framework progressivo
- **Vue Router** - Roteamento
- **Tailwind CSS v4** - Estilização
- **TypeScript** - Tipagem estática

### Infraestrutura
- **Docker Compose** - Orquestração de containers
- **Caddy** - Servidor web e proxy reverso

## Estrutura do Projeto

```
marcionatural/
├── back/                 # Backend (Bun + Hono)
│   ├── src/
│   │   ├── routes/       # Rotas da API
│   │   │   ├── auth.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── entries.ts
│   │   │   ├── votes.ts
│   │   │   ├── activity-types.ts
│   │   │   ├── projects.ts
│   │   │   └── upload.ts
│   │   ├── services/     # Lógica de negócio
│   │   ├── middleware/   # Autenticação
│   │   ├── utils/        # Utilitários (JWT)
│   │   ├── db.ts         # Configuração SQLite
│   │   ├── schema.sql    # Schema do banco
│   │   ├── seeds.sql     # Seeds iniciais
│   │   ├── migrate.ts    # Script de migração
│   │   └── index.ts      # Entry point
│   ├── uploads/          # Uploads de imagens
│   └── Dockerfile
├── app/                  # Frontend (Vue 3)
│   ├── src/
│   │   ├── components/   # Componentes
│   │   │   ├── Sidebar.vue
│   │   │   ├── Header.vue
│   │   │   └── FloatingActionButton.vue
│   │   ├── views/        # Telas
│   │   │   ├── Leaderboard.vue
│   │   │   ├── MyEntries.vue
│   │   │   ├── Projects.vue
│   │   │   ├── Users.vue
│   │   │   ├── UserEntries.vue
│   │   │   ├── Voting.vue
│   │   │   ├── Login.vue
│   │   │   └── Register.vue
│   │   ├── services/     # API client
│   │   ├── stores/       # Estado global (auth)
│   │   ├── composables/  # Composables (useSidebar)
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
http://localhost:9000

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

#### Rodar Migrações

```bash
cd back
bun run migrate
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

### Upload de Imagens
- `POST /api/upload/image` - Upload de imagem (multipart/form-data)
  - Retorna: `{ imageUrl: "/images/<uuid>.webp" }`
  - Formatos: JPG, PNG, GIF, WebP
  - Tamanho máx: 5MB
  - Conversão automática para WebP

### Reports e Votação
- `POST /api/entries/:id/report` - Reportar entrada como suspeita
- `DELETE /api/entries/:id/report` - Remover meu report
- `GET /api/entries/voting/available` - Entradas para votar (pendentes)
- `GET /api/entries/voting/invalidated` - Todas entradas invalidadas
- `GET /api/entries/voting/my-invalidated` - Minhas entradas invalidadas
- `GET /api/entries/voting/stats` - Estatísticas de votação
- `GET /api/entries/:id/reports` - Reports de uma entrada

### Activity Types
- `GET /api/activity-types` - Todos os tipos
- `GET /api/activity-types/validated` - Tipos validados
- `GET /api/activity-types/category/:id` - Por categoria
- `POST /api/activity-types/:id/vote` - Votar em tipo
- `GET /api/activity-types/:id/validation-status` - Status
- `POST /api/activity-types` - Criar novo tipo

### Projetos Pessoais
- `GET /api/projects` - Meus projetos
- `POST /api/projects` - Criar projeto
- `PUT /api/projects/:id` - Atualizar projeto
- `DELETE /api/projects/:id` - Deletar projeto
- `POST /api/projects/:id/log` - Registrar tempo
- `GET /api/projects/:id/weekly-progress` - Progresso semanal

### Utilitários
- `GET /api/health` - Health check
- `GET /images/:filename` - Serve imagem (desenvolvimento)

## Telas do Frontend

1. **Leaderboard** (`/leaderboard`)
   - Ranking de usuários com polling de 10s
   - Cards em mobile, tabela em desktop
   - Clique para ver entradas de cada usuário

2. **Minhas Entradas** (`/my-entries`)
   - CRUD de entradas
   - Upload de foto com preview
   - Separação: positivas, negativas, invalidadas

3. **Projetos Pessoais** (`/projects`)
   - Lista de projetos
   - Criar/editar projetos
   - Registrar tempo diário
   - Ver progresso semanal

4. **Usuários** (`/users`)
   - Lista de todos os usuários
   - Cards em mobile, tabela em desktop
   - Clique para ver entradas de cada usuário

5. **Entradas de Usuário** (`/users/:userId/entries`)
   - Tela dedicada com todas as entradas de um usuário
   - Cards com foto thumb
   - Clique no card → modal de detalhes
   - Clique na foto → zoom em resolução original

6. **Votação** (`/voting`)
   - **Para Votar**: Entradas pendentes de report
   - **Invalidadas**: Todas as entradas invalidadas
   - **Minhas Invalidadas**: Suas entradas invalidadas
   - Estatísticas de votação

7. **Login/Register** (`/login`, `/register`)
   - Cards centralizados com design aprimorado
   - Formulários com validação

## Botão Flutuante

Disponível em todas as telas (canto inferior direito):
- 📝 **Nova Entrada Rápida**: Registrar refeição ou exercício com foto
- ⏱️ **Registrar Projeto**: Adicionar tempo a projeto pessoal

## Regras de Negócio

### Validação por Reports
- Qualquer usuário pode reportar entrada suspeita de outro
- **3 ou mais reports** → entrada automaticamente invalidada
- Entradas invalidadas → `points = 0` no leaderboard
- Cada usuário pode reportar uma vez por entrada
- Reports podem ser removidos pelo autor

### Upload de Imagens
- Formatos aceitos: JPG, PNG, GIF, WebP
- Tamanho máximo: 5MB
- Conversão automática para WebP
- Redimensionamento para máx 1920px
- Nome único gerado com UUID
- Preview da imagem antes de enviar

### Sidebar Mobile
- Abre com botão hamburger (mobile)
- Fecha ao clicar no overlay
- Fecha ao navegar para outra tela
- Desktop: sempre visível, sem overlay

### Projeto Pessoal
- Meta: horas semanais definidas pelo usuário
- Registro: diário, em minutos
- Pontuação: +50 se bater meta na semana
- Semana: padrão ISO (segunda a domingo)

## Banco de Dados

### Tabelas Principais
- `users` - Usuários
- `categories` - Categorias de atividades
- `activity_types` - Tipos de atividade (catálogo)
- `activity_type_votes` - Votos em tipos de atividade
- `user_entries` - Entradas dos usuários
- `entry_reports` - Reports de entradas suspeitas
- `personal_projects` - Projetos pessoais
- `project_daily_logs` - Registros diários de projeto

### Migração

Para aplicar migrações no banco de dados:

```bash
cd back
bun run migrate
```

O script:
1. Cria tabela `entry_reports` se não existir
2. Adiciona colunas em `user_entries`:
   - `photo_original_name` - Nome original do arquivo
   - `photo_identifier` - Nome gerado (UUID)
   - `is_invalidated` - Se entrada foi invalidada
   - `invalidated_at` - Data da invalidação
3. Cria índices para performance

## Scripts Úteis

```bash
# Rodar migração
cd back && bun run migrate

# Desenvolvimento backend
cd back && bun run dev

# Desenvolvimento frontend
cd app && bun run dev

# Type-check frontend
cd app && bun run type-check

# Docker (produção)
docker-compose up --build

# Parar Docker
docker-compose down
```

## 🧪 Testes E2E (End-to-End)

O projeto utiliza **Playwright** para testes de interface automatizados, rodando em modo headless com Chromium.

### Estrutura de Testes

```
e2e/
├── tests/
│   ├── auth.spec.ts          # Login, registro, logout, rotas protegidas
│   ├── entries.spec.ts       # CRUD de entradas, upload, filtros, paginação
│   ├── leaderboard.spec.ts   # Ranking, polling, pontos
│   ├── users.spec.ts         # Lista de usuários, entradas de outros usuários
│   ├── voting.spec.ts        # Reports, votação, entradas invalidadas
│   ├── projects.spec.ts      # Projetos pessoais, registro de tempo
│   ├── timeline.spec.ts      # Timeline, ordenação, filtros
│   └── navigation.spec.ts    # Sidebar, menu, FAB, toast messages
├── fixtures/
│   └── test-fixtures.ts      # Fixtures reutilizáveis
└── playwright.config.ts      # Configuração do Playwright
```

### Como Rodar os Testes

#### 1. Preparar o Ambiente

```bash
# 1.1 Rodar backend com banco de testes
cd back
DATABASE_PATH=./data/test.db bun run dev

# 1.2 Em outro terminal, rodar frontend
cd app
bun run dev

# 1.3 Em outro terminal, rodar seed de testes
cd back
DATABASE_PATH=./data/test.db bun run seed-e2e
```

#### 2. Rodar Testes

```bash
# Todos os testes (headless)
cd app
bun run e2e

# Interface interativa (recomendado para desenvolvimento)
bun run e2e:ui

# Browser visível (para debug)
bun run e2e:headed

# Debug passo-a-passo
bun run e2e:debug

# Ver relatório HTML
bun run e2e:report
```

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `bun run e2e` | Roda todos os testes em modo headless |
| `bun run e2e:ui` | Abre interface interativa do Playwright |
| `bun run e2e:headed` | Roda testes com browser visível |
| `bun run e2e:debug` | Debug passo-a-passo com inspector |
| `bun run e2e:report` | Abre relatório HTML dos testes |

### Credenciais de Teste

O seed E2E cria os seguintes usuários:

| Usuário | Senha | Descrição |
|---------|-------|-----------|
| `test_user_1` | `teste123` | Usuário padrão para testes |
| `test_user_2` | `teste123` | Usuário com entradas reportáveis |
| `test_user_3` | `teste123` | Usuário com poucas entradas |
| `test_leader` | `teste123` | Líder do leaderboard (mais pontos) |
| `test_reporter` | `teste123` | Usuário para testar reports |

### Casos de Teste

#### Autenticação (`auth.spec.ts`)
- ✅ Login com credenciais válidas
- ✅ Login com credenciais inválidas (mensagem de erro)
- ✅ Logout
- ✅ Registro de novo usuário
- ✅ Validação de senha (mínimo 6 caracteres, confirmação)
- ✅ Redirecionamento de rotas protegidas

#### Entradas (`entries.spec.ts`)
- ✅ Criar entrada via FAB
- ✅ Upload de foto com preview
- ✅ Validação: limite de 1 entrada por categoria/dia
- ✅ Editar entrada existente
- ✅ Excluir entrada com confirmação
- ✅ Filtros por tipo (positivas/negativas/invalidadas)
- ✅ Filtros por período (hoje, última semana, tudo)
- ✅ Paginação (20+ entradas)
- ✅ Modal de detalhes ao clicar no card

#### Leaderboard (`leaderboard.spec.ts`)
- ✅ Renderização do ranking
- ✅ Polling automático (10s)
- ✅ Navegação para entradas de usuário
- ✅ Validação de pontos corretos
- ✅ Layout responsivo (cards mobile, tabela desktop)

#### Usuários (`users.spec.ts`)
- ✅ Lista de todos os usuários
- ✅ Navegação para entradas de outro usuário
- ✅ Visualização de entradas com foto thumb
- ✅ Modal de detalhes

#### Votação (`voting.spec.ts`)
- ✅ Reportar entrada de outro usuário
- ✅ 3+ reports → entrada invalidada automaticamente
- ✅ Abas: Para Votar, Invalidadas, Minhas Invalidadas
- ✅ Estatísticas de votação
- ✅ Remover report

#### Projetos (`projects.spec.ts`)
- ✅ Criar novo projeto
- ✅ Editar projeto
- ✅ Excluir projeto
- ✅ Registrar tempo diário
- ✅ Validar progresso semanal
- ✅ Meta batida → +50 pontos

#### Timeline (`timeline.spec.ts`)
- ✅ Renderização cronológica
- ✅ Entradas de todos os usuários
- ✅ Filtros por período
- ✅ Diferenciação visual (positivas/negativas)

#### Navegação (`navigation.spec.ts`)
- ✅ Sidebar abre/fecha (mobile)
- ✅ Overlay fecha ao clicar
- ✅ Navegação por todas as rotas
- ✅ Botão flutuante (FAB) em todas as telas
- ✅ Mensagens toast (sucesso/erro)
- ✅ Header com nome do usuário e logout

### Configuração

O Playwright está configurado em `e2e/playwright.config.ts`:

- **Base URL**: `http://localhost:9000` (produção) ou `http://localhost:5173` (dev)
- **Browser**: Chromium
- **Timeout**: 30s por teste
- **Vídeo**: Gravado em caso de falha
- **Screenshot**: Automático em falhas
- **Relatório**: HTML em `e2e/playwright-report`

### Workflow de Desenvolvimento

1. **Backend rodando** com banco de testes:
   ```bash
   cd back
   DATABASE_PATH=./data/test.db bun run dev
   ```

2. **Frontend rodando**:
   ```bash
   cd app
   bun run dev
   ```

3. **Seed de testes** (sempre que reiniciar o banco):
   ```bash
   cd back
   DATABASE_PATH=./data/test.db bun run seed-e2e
   ```

4. **Rodar testes**:
   ```bash
   cd app
   bun run e2e:ui  # Interface interativa (recomendado)
   ```

### CI/CD (Futuro)

Para integração contínua, os testes podem ser rodados automaticamente:

```yaml
# .github/workflows/e2e.yml
- Rodar backend + frontend em background
- Executar seed de testes
- bun run e2e (headless)
- Upload de relatório e vídeos em caso de falha
```

### Dicas

- Use `bun run e2e:ui` para desenvolver testes interativamente
- Use `bun run e2e:debug` para debug passo-a-passo
- Screenshots e vídeos são salvos em `e2e/test-results/` em caso de falha
- O relatório HTML é gerado em `e2e/playwright-report/`


## Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Backend
JWT_SECRET=sua-chave-secreta-aqui

# Frontend
VITE_API_URL=http://localhost

# Docker
FRONTEND_PORT=80

# Ambiente
NODE_ENV=production
```

## Licença

MIT
