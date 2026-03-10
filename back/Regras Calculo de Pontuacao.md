# Regras de Cálculo de Pontuação

Documentação técnica do sistema de pontuação do Marcionatural.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Tabela de Atividades e Pontos](#tabela-de-atividades-e-pontos)
3. [Tetos Diários por Categoria](#tetos-diários-por-categoria)
4. [Projeto Pessoal](#projeto-pessoal)
5. [Semana Perfeita](#semana-perfeita)
6. [Implementação Técnica](#implementação-técnica)
7. [Exemplos de Cálculo](#exemplos-de-cálculo)
8. [Considerações Técnicas](#considerações-técnicas)

---

## Visão Geral

O sistema de pontuação é baseado em **cálculo dinâmico** - os pontos não são armazenados no banco de dados, mas calculados em tempo de execução com base nas entradas do usuário e nas regras definidas.

**Princípios:**
- ✅ Cálculo dinâmico (sem coluna `points` na tabela `user_entries`)
- ✅ Tetos diários por categoria
- ✅ Validação por activity_type (`is_validated`)
- ✅ Suporte a semanas ISO (segunda a domingo)

---

## Tabela de Atividades e Pontos

| ID | Atividade | Categoria | Pontos Base | Descrição |
|----|-----------|-----------|-------------|-----------|
| 1 | Alimentação Limpa | 1 (Refeição) | +10 | Refeição saudável/limpa |
| 2 | Alimentação Suja | 1 (Refeição) | -10 | Refeição não saudável |
| 3 | Exercício Físico | 2 (Exercício) | +5 | Atividade física/exercício |
| 4 | Usar Tabaco | 4 (Entorpecentes) | -5 | Uso de substâncias entorpecentes |

**Configuração no código:**
```typescript
export const POINTS_CONFIG = {
  alimentacaoPositiva: 10,
  alimentacaoNegativa: -10,
  exercicio: 5,
  entorpecentes: -5,
  projetoPessoalMetaBatida: 50,
  semanaPerfeita: 75,
} as const;
```

---

## Tetos Diários por Categoria

Cada categoria possui limites máximos e mínimos de pontos que podem ser ganhos/perdidos por dia:

| Categoria | ID | Teto Máximo | Teto Mínimo | Descrição |
|-----------|----|-------------|-------------|-----------|
| Refeição | 1 | +10 | -10 | Pode ganhar ou perder até 10 pontos/dia |
| Exercício | 2 | +5 | 0 | Pode ganhar até 5 pontos/dia (não negativo) |
| Projeto Pessoal | 3 | +50 | 0 | Teto semanal, não diário |
| Entorpecentes | 4 | 0 | -5 | Pode perder até 5 pontos/dia (não positivo) |

**Configuração no código:**
```typescript
export const CATEGORY_DAILY_CAPS = {
  [CategoryId.REFEICAO]: { max: 10, min: -10 },
  [CategoryId.EXERCICIO]: { max: 5, min: 0 },
  [CategoryId.PROJETO_PESSOAL]: { max: 50, min: 0 },
  [CategoryId.ENTORPECENTES]: { max: 0, min: -5 },
} as const;
```

---

## Projeto Pessoal

### Regra de Negócio

Usuários podem criar projetos pessoais com uma **meta semanal de horas**. Ao bater a meta, o usuário ganha **50 pontos**.

**Critérios:**
- Projeto deve estar ativo (`is_active = TRUE`)
- Meta é definida em horas semanais (`weekly_hours_goal`)
- Registro de tempo é feito diariamente via `project_daily_logs`
- Pontos são concedidos por semana ISO (segunda a domingo)

### Implementação Técnica

**Função:** `calculateProjectWeeklyPoints(userId, projectId, weekNumber, year)`

```typescript
export async function calculateProjectWeeklyPoints(
  userId: number,
  projectId: number,
  weekNumber: number,
  year: number
): Promise<{ points: number; totalMinutes: number; goalMinutes: number; goalReached: boolean }>
```

**Query SQL para total de minutos:**
```sql
SELECT COALESCE(SUM(duration_minutes), 0) as total
FROM project_daily_logs
WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
```

**Cálculo:**
```typescript
const goalMinutes = project.weekly_hours_goal * 60;
const goalReached = totalMinutes >= goalMinutes;
const points = goalReached ? 50 : 0;
```

---

## Semana Perfeita

### Regra de Negócio

Quando um usuário completa uma semana **perfeita**, ele ganha um **bônus de 75 pontos**.

**Critérios (todos devem ser atendidos):**

| Critério | Descrição | Verificação |
|----------|-----------|-------------|
| ✅ Semana completa | 7 dias (segunda a domingo) | Semana ISO |
| ✅ Sem pontos negativos | Nenhuma alimentação suja ou entorpecentes | `activity_type_id = 2` OU `category_id = 4` |
| ✅ Exercício diário | Pelo menos 1 entrada de exercício por dia | `category_id = 2` para cada um dos 7 dias |
| ✅ Meta do projeto | Bater meta de ≥1 projeto pessoal | `calculateProjectWeeklyPoints().goalReached = TRUE` |

### Implementação Técnica

**Função:** `calculatePerfectWeekBonus(userId, weekNumber, year)`

```typescript
export async function calculatePerfectWeekBonus(
  userId: number,
  weekNumber: number,
  year: number
): Promise<{ 
  points: number; 
  hasExerciseEveryDay: boolean; 
  noNegativePoints: boolean; 
  projectGoalReached: boolean 
}>
```

**Algoritmo:**

```
1. Obter os 7 dias da semana ISO (segunda a domingo)
   └─ getDaysOfWeekISO(year, weekNumber)

2. Para cada dia da semana:
   ├─ Verificar se teve exercício (categoria 2)
   ├─ Verificar se NÃO teve alimentação suja (activity_type_id = 2)
   └─ Verificar se NÃO teve entorpecentes (categoria 4)

3. Verificar projetos pessoais:
   ├─ Buscar todos os projetos com logs na semana
   └─ Verificar se algum bateu a meta

4. Retornar:
   ├─ points = 75 se (hasExerciseEveryDay AND noNegativePoints AND projectGoalReached)
   └─ points = 0 caso contrário
```

**Queries SQL:**

```sql
-- Verifica exercício por dia
SELECT COUNT(*) as count
FROM user_entries e
INNER JOIN activity_types at ON e.activity_type_id = at.id
WHERE e.user_id = ?
  AND substr(e.entry_date, 1, 10) = ?
  AND at.category_id = 2
  AND at.is_validated = TRUE

-- Verifica alimentação suja por dia
SELECT COUNT(*) as count
FROM user_entries e
INNER JOIN activity_types at ON e.activity_type_id = at.id
WHERE e.user_id = ?
  AND substr(e.entry_date, 1, 10) = ?
  AND at.id = 2
  AND at.is_validated = TRUE

-- Verifica entorpecentes por dia
SELECT COUNT(*) as count
FROM user_entries e
INNER JOIN activity_types at ON e.activity_type_id = at.id
WHERE e.user_id = ?
  AND substr(e.entry_date, 1, 10) = ?
  AND at.category_id = 4
  AND at.is_validated = TRUE

-- Busca projetos com logs na semana
SELECT DISTINCT pp.id
FROM personal_projects pp
INNER JOIN project_daily_logs pdl ON pdl.project_id = pp.id
WHERE pp.user_id = ?
  AND pdl.week_number = ?
  AND pdl.year = ?
```

### Cálculo de Semana ISO

A função `getDaysOfWeekISO(year, weekNumber)` calcula os 7 dias de uma semana ISO:

```typescript
function getDaysOfWeekISO(year: number, weekNumber: number): string[] {
  // Semana ISO: segunda-feira é o primeiro dia
  // Semana 1 é a semana que contém a primeira quinta-feira do ano
  
  // 1. Encontra a primeira quinta-feira do ano
  // 2. Volta 3 dias para encontrar a segunda-feira da semana 1
  // 3. Adiciona (weekNumber - 1) * 7 dias para encontrar a segunda-feira da semana alvo
  // 4. Gera os 7 dias (segunda a domingo)
  
  return ['YYYY-MM-DD', ...]; // 7 datas
}
```

---

## Implementação Técnica

### Arquitetura do Cálculo Dinâmico

Os pontos **não são armazenados** na tabela `user_entries`. Em vez disso, são calculados dinamicamente quando solicitados.

**Vantagens:**
- ✅ Dados sempre consistentes (não há risco de dessincronização)
- ✅ Mudanças nas regras de pontuação são aplicadas retroativamente
- ✅ Invalidação de activity_type é respeitada automaticamente (`is_validated`)

**Desvantagens:**
- ⚠️ Cálculo mais lento para usuários com muitas entradas
- ⚠️ Requer queries mais complexas

### Funções Principais

#### `points.service.ts`

| Função | Descrição | Retorna |
|--------|-----------|---------|
| `calculateEntryPoints()` | Calcula pontos de uma entrada baseado no tipo | `number` |
| `calculatePointsFromActivityType()` | Busca pontos do activity_type no banco | `Promise<number>` |
| `getDailyCategoryPoints()` | Calcula pontos diários de uma categoria com teto | `Promise<{points, rawPoints, capped}>` |
| `calculateProjectWeeklyPoints()` | Calcula pontos de projeto pessoal semanal | `Promise<{points, totalMinutes, goalMinutes, goalReached}>` |
| `calculatePerfectWeekBonus()` | Verifica e calcula bônus de semana perfeita | `Promise<{points, hasExerciseEveryDay, noNegativePoints, projectGoalReached}>` |
| `getUserTotalPoints()` | Calcula pontos totais de um usuário | `Promise<number>` |

### Função `getUserTotalPoints()` - Agregação Total

```typescript
export async function getUserTotalPoints(userId: number): Promise<number>
```

**Fluxo de cálculo:**

```
1. Busca todas as datas com entradas por categoria (refeição, exercício, entorpecentes)
   └─ Query: SELECT DISTINCT category_id, entry_date FROM user_entries

2. Para cada categoria + data:
   └─ Calcula pontos diários com teto (getDailyCategoryPoints)

3. Busca todas as semanas com logs de projeto
   └─ Query: SELECT DISTINCT project_id, week_number, year FROM project_daily_logs

4. Para cada semana de projeto:
   └─ Calcula pontos do projeto (calculateProjectWeeklyPoints)

5. Busca todas as semanas com potencial para semana perfeita
   └─ Query: SELECT DISTINCT week_number, year FROM project_daily_logs

6. Para cada semana:
   └─ Calcula bônus de semana perfeita (calculatePerfectWeekBonus)

7. Retorna: totalPoints + projectPoints + perfectWeekPoints
```

---

## Exemplos de Cálculo

### Exemplo 1: Cenário Base (Alimentação + Exercício)

**Entradas de um usuário em 2025-03-10:**
- 2x Alimentação limpa (+10 cada)
- 1x Exercício (+5)

**Cálculo:**
```
Alimentação: 10 + 10 = 20 → teto aplicado: 10 pontos
Exercício: 5 → dentro do teto: 5 pontos
Total do dia: 15 pontos
```

### Exemplo 2: Teto Aplicado

**Entradas de um usuário em 2025-03-10:**
- 3x Alimentação limpa (+10 cada)
- 2x Exercício (+5 cada)

**Cálculo:**
```
Alimentação: 10 + 10 + 10 = 30 → teto aplicado: 10 pontos
Exercício: 5 + 5 = 10 → teto aplicado: 5 pontos
Total do dia: 15 pontos (economizou 20 pontos pelo teto)
```

### Exemplo 3: Semana Perfeita

**Semana 10 de 2025 (17/02 a 23/02):**

| Dia | Exercício? | Alimentação Suja? | Entorpecentes? |
|-----|------------|-------------------|----------------|
| Seg 17/02 | ✅ Sim | ❌ Não | ❌ Não |
| Ter 18/02 | ✅ Sim | ❌ Não | ❌ Não |
| Qua 19/02 | ✅ Sim | ❌ Não | ❌ Não |
| Qui 20/02 | ✅ Sim | ❌ Não | ❌ Não |
| Sex 21/02 | ✅ Sim | ❌ Não | ❌ Não |
| Sáb 22/02 | ✅ Sim | ❌ Não | ❌ Não |
| Dom 23/02 | ✅ Sim | ❌ Não | ❌ Não |

**Projeto Pessoal:**
- Meta semanal: 10 horas
- Total registrado: 12 horas
- ✅ Meta batida

**Cálculo:**
```
hasExerciseEveryDay: true (7/7 dias com exercício)
noNegativePoints: true (nenhuma alimentação suja ou entorpecentes)
projectGoalReached: true (meta de 10h batida)

Bônus Semana Perfeita: 75 pontos
```

### Exemplo 4: Semana Perfeita Falha

**Semana 10 de 2025:**
- ❌ Quarta-feira sem exercício
- ✅ Nenhum ponto negativo
- ✅ Meta do projeto batida

**Cálculo:**
```
hasExerciseEveryDay: false (6/7 dias com exercício)
noNegativePoints: true
projectGoalReached: true

Bônus Semana Perfeita: 0 pontos (critério de exercício não atendido)
```

### Exemplo 5: Cálculo Total Semanal

**Usuário na Semana 10 de 2025:**

| Categoria | Pontos |
|-----------|--------|
| Alimentação (7 dias × 10) | 70 |
| Exercício (7 dias × 5) | 35 |
| Entorpecentes (0 entradas) | 0 |
| Projeto Pessoal (meta batida) | 50 |
| Semana Perfeita (bônus) | 75 |
| **Total** | **230 pontos** |

---

## Considerações Técnicas

### Por Que Cálculo Dinâmico?

**Alternativa considerada:** Armazenar pontos na coluna `user_entries.points`

**Decisão:** Cálculo dinâmico foi escolhido porque:

1. **Consistência:** Mudanças nas regras de pontuação não exigem recálculo em massa
2. **Invalidação:** Activity types invalidados são automaticamente excluídos do cálculo
3. **Transparência:** O cálculo é sempre baseado nas regras atuais

### Performance

**Índices utilizados:**
```sql
CREATE INDEX idx_user_entries_user_id ON user_entries(user_id);
CREATE INDEX idx_user_entries_entry_date ON user_entries(entry_date);
CREATE INDEX idx_user_entries_user_date ON user_entries(user_id, entry_date);
CREATE INDEX idx_project_logs_user_date ON project_daily_logs(user_id, date);
```

**Otimizações:**
- Uso de `substr(entry_date, 1, 10)` para compatibilidade entre DATE e DATETIME
- `processedWeeks` Set para evitar recálculo de semanas duplicadas
- Queries com `COALESCE` para evitar NULL

### Edge Cases

| Cenário | Tratamento |
|---------|------------|
| Múltiplos projetos na mesma semana | Cada projeto calculado separadamente; semana perfeita verifica se ≥1 bateu meta |
| Semana parcial (usuário começou no meio) | Semana perfeita requer 7 dias completos; semanas parciais não contam |
| Entry_date com timezone | Uso de `substr()` extrai apenas YYYY-MM-DD, ignorando timezone |
| Activity type invalidado | Filtro `is_validated = TRUE` exclui do cálculo |
| Ano com 53 semanas | Função `getDaysOfWeekISO` lida corretamente com semanas ISO |

### Banco de Dados

**Tabelas envolvidas:**

```sql
-- Entradas do usuário
CREATE TABLE user_entries (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_type_id INTEGER NOT NULL,
    entry_date DATE,
    -- ... outras colunas
);

-- Tipos de atividade (catálogo)
CREATE TABLE activity_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    base_points INTEGER NOT NULL,
    is_validated BOOLEAN DEFAULT TRUE,
    -- ... outras colunas
);

-- Projetos pessoais
CREATE TABLE personal_projects (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    weekly_hours_goal INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    -- ... outras colunas
);

-- Logs diários de projeto
CREATE TABLE project_daily_logs (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    -- ... outras colunas
);
```

---

## Histórico de Versões

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0 | 2025-03-01 | Documentação inicial |
| 1.1 | 2025-03-09 | Adicionada regra "Semana Perfeita" (+75 pontos) |
