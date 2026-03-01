# Mudanças da Refatoração

## Resumo das Alterações

### 1. Sistema de Votação em Entradas de Usuários (Reports)

**Antes:**
- Votação em **tipos de atividade** (catálogo compartilhado)
- 50%+1 votos negativos → tipo invalidado

**Depois:**
- Votação em **entradas individuais** dos usuários
- Usuários reportam entradas suspeitas de outros
- **3 ou mais reports** → entrada automaticamente invalidada
- Entradas invalidadas não contam pontos no leaderboard
- Tela de votação mostra:
  - Entradas pendentes para votar
  - Minhas entradas invalidadas
  - Todas as entradas invalidadas pela comunidade

### 2. Upload de Fotos com Conversão WebP

**Antes:**
- URL de foto era apenas um campo de texto

**Depois:**
- Upload real de arquivo de imagem
- Backend converte automaticamente para **WebP**
- Redimensionamento para máx 1920px
- Nome gerado automaticamente (UUID)
- Salvamento em `/back/uploads/images/`
- Servido via `/images/<nome-gerado>.webp`
- Preview da imagem antes de enviar

### 3. Layout Mobile-First

**Antes:**
- Sidebar fixa não retrátil
- Sem padding/gutter (conteúdo encostando nas bordas)
- Layout não responsivo
- Componentes pequenos em telas grandes

**Depois:**
- **Sidebar retrátil** no mobile (drawer com overlay)
- Botão **hamburger** no header (mobile)
- Padding/gutter responsivo (`p-4 sm:p-6 lg:p-8`)
- Container com `max-w-7xl mx-auto`
- Grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- Tipografia e botões responsivos

### 4. Configuração do Caddy para Imagens

**Novo:**
- Caddy configurado para servir `/images/*` via reverse proxy para o backend
- Volumes Docker compartilhados para uploads persistentes
- Backend serve imagens em desenvolvimento

### 5. Melhorias de Design e Autenticação

**Design Login/Register:**
- Card mais largo (`max-w-lg`)
- Padding generoso (`p-8 sm:p-10 lg:p-12`)
- Fontes maiores (`text-3xl sm:text-4xl`)
- Inputs com mais padding (`px-5 py-4 text-lg`)
- Botões com gradiente e sombra suave
- Ícone emoji grande no topo
- Sombra `shadow-2xl` sem corte no bottom

**Autenticação:**
- Cookie `SameSite=Lax` para desenvolvimento
- Proxy Vite configurado para persistir cookies
- CORS com `credentials: true`

### 6. Tela de Entradas do Usuário (Nova)

**Rota:** `/users/:userId/entries`

**Funcionalidades:**
- Substitui modais por tela dedicada
- Design mobile-first com cards
- Grid responsivo (1/2/3 colunas)
- Thumb da foto em cada card
- Tipo de atividade com ícone
- Clique no card → modal de detalhes completos
- Clique na foto → zoom em resolução original
- Modal de detalhes mostra:
  - Foto em destaque
  - Tipo de atividade
  - Descrição completa
  - Pontos, duração, data
  - Status de validação
  - Contador de reports
  - Botão para reportar

**Telas Atualizadas:**
- **Leaderboard.vue**: Cards em mobile, tabela em desktop
- **Users.vue**: Cards em mobile, tabela em desktop
- **MyEntries.vue**: Grid responsivo, cards com foto thumb
- **Voting.vue**: Layout mobile-first sem scroll horizontal

---

## Mudanças no Banco de Dados

### Novas Tabelas
```sql
-- Reports de entradas suspeitas
entry_reports (
  id,
  entry_id,
  reporter_user_id,
  created_at,
  UNIQUE (entry_id, reporter_user_id)
)
```

### Novas Colunas em `user_entries`
```sql
photo_original_name TEXT      -- Nome original do arquivo
photo_identifier TEXT UNIQUE  -- Nome gerado (UUID)
is_invalidated BOOLEAN        -- Se entrada foi invalidada
invalidated_at DATETIME       -- Data da invalidação
```

### Índices Novos
```sql
idx_entry_reports_entry
idx_entry_reports_reporter
idx_user_entries_invalidated
```

---

## Mudanças na API

### Novos Endpoints

#### Upload
```
POST /api/upload/image    - Upload de imagem (multipart/form-data)
                          Retorna: { imageUrl: "/images/<uuid>.webp" }
```

#### Reports/Votação
```
POST   /api/entries/:id/report         - Reportar entrada como suspeita
DELETE /api/entries/:id/report         - Remover meu report
GET    /api/entries/voting/available   - Entradas para votar (pendentes)
GET    /api/entries/voting/invalidated - Todas entradas invalidadas
GET    /api/entries/voting/my-invalidated - Minhas entradas invalidadas
GET    /api/entries/voting/stats       - Estatísticas de votação
GET    /api/entries/:id/reports        - Reports de uma entrada
```

#### Imagens (Dev)
```
GET /images/:filename     - Serve imagem do upload (apenas dev)
```

---

## Mudanças no Frontend

### Novos Tipos TypeScript
```typescript
interface EntryReport {
  id: number;
  entry_id: number;
  reporter_user_id: number;
  created_at: string;
}

interface VotingStats {
  entriesAvailableToVote: number;
  myInvalidatedEntries: number;
  totalInvalidatedEntries: number;
  myTotalReports: number;
}

interface VotingEntry {
  id: number;
  username: string;
  description: string;
  photo_url: string | null;
  points: number;
  report_count: number;
  is_invalidated: boolean;
  invalidated_at: string | null;
}
```

### Novos Serviços de API
```typescript
uploadImage(file: File)
reportEntry(entryId: number)
removeEntryReport(entryId: number)
getVotingAvailableEntries()
getVotingInvalidatedEntries()
getMyVotingInvalidatedEntries()
getVotingStats()
getEntryReports(entryId: number)
```

### Novos Composables
```typescript
useSidebar()  - Gerencia estado do sidebar (mobile/desktop)
```

### Componentes Atualizados
- `Sidebar.vue` - Drawer retrátil no mobile
- `Header.vue` - Botão hamburger
- `Voting.vue` - Tela completamente refatorada
- `MyEntries.vue` - Upload de imagem com preview
- `Leaderboard.vue` - Padding/gutter responsivo
- `Users.vue` - Padding/gutter responsivo
- `Projects.vue` - Padding/gutter responsivo

---

## Migração de Dados

### Como Rodar
```bash
cd back
bun run migrate
```

O script:
1. Cria tabela `entry_reports` se não existir
2. Adiciona colunas em `user_entries` se não existirem
3. Cria índices para performance

---

## Como Usar

### Reportar Entrada Suspeita
1. Vá em "Votação" no menu
2. Na aba "Para Votar", veja entradas de outros usuários
3. Clique em "🚩 Reportar" para sinalizar como suspeita
4. Com 3 reports, a entrada é automaticamente invalidada

### Upload de Foto
1. Clique em "Nova Entrada"
2. Preencha descrição e duração
3. Clique no campo de foto e selecione um arquivo
4. Preview aparece automaticamente
5. Envie a entrada

### Ver Entradas Invalidadas
1. Vá em "Votação"
2. Aba "Invalidadas" → todas as entradas invalidadas
3. Aba "Minhas Invalidadas" → suas entradas invalidadas

---

## Regras de Negócio

### Invalidação de Entradas
- Entrada com **≥3 reports** → `is_invalidated = TRUE`
- Entradas invalidadas → `points = 0` no leaderboard
- Invalidação é automática ao atingir 3 reports

### Upload de Imagens
- Formatos aceitos: JPG, PNG, GIF, WebP
- Tamanho máximo: 5MB
- Conversão automática para WebP
- Redimensionamento para máx 1920px
- Nome único gerado com UUID

### Sidebar Mobile
- Abre com botão hamburger (mobile)
- Fecha ao clicar no overlay
- Fecha ao navegar para outra tela
- Desktop: sempre visível, sem overlay

---

## Ordem de Implementação

1. ✅ Banco de dados (migração)
2. ✅ Upload de imagens + servir /images
3. ✅ Sistema de reports
4. ✅ Caddy/Docker (configurar volumes e rotas)
5. ✅ Upload de imagens no frontend
6. ✅ Tela de Votação refatorada
7. ✅ Layout mobile-first (Sidebar + Header)
8. ✅ Testes e ajustes finais

---

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
```
