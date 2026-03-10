# Guia Técnico de Testes

Documentação técnica completa sobre o sistema de testes do backend Marcionatural.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Stack de Testes](#stack-de-testes)
3. [Executando Testes](#executando-testes)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Utilitários e Helpers](#utilitários-e-helpers)
6. [Padrões de Teste](#padrões-de-teste)
7. [Categorias de Testes](#categorias-de-testes)
8. [Melhores Práticas](#melhores-práticas)

---

## Visão Geral

O backend utiliza **Bun Test** como framework de testes, oferecendo:

- ✅ Execução rápida (nativa do Bun runtime)
- ✅ API similar ao Jest (`describe`, `test`, `expect`)
- ✅ Setup/teardown com `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
- ✅ Banco de dados SQLite em memória/arquivo para testes

**Princípios:**
- Testes unitários para serviços
- Testes de integração para rotas/API
- Banco de dados isolado por execução de teste
- Seeds fixos para consistência

---

## Stack de Testes

| Componente | Tecnologia | Versão |
|------------|-----------|--------|
| Runtime | Bun | 1.3.0+ |
| Framework | Bun Test | Nativo |
| Banco | SQLite (arquivo) | 3.x |
| Assertões | expect() | Nativo do Bun |

**Comandos disponíveis:**

```bash
# Rodar todos os testes
bun test

# Rodar testes específicos
bun test src/tests/points.test.ts

# Rodar testes com filtro por nome
bun test --test-name-pattern "deve retornar 75 pontos"

# Rodar testes em modo watch (desenvolvimento)
bun test --watch
```

---

## Executando Testes

### Todos os Testes

```bash
cd back
bun test
```

**Saída esperada:**
```
bun test v1.3.0 (b0a6feca)

src/tests/points.test.ts:
(pass) Points Service > calculatePointsFromActivityType > deve retornar 10 pontos [17.00ms]
(pass) Points Service > getUserTotalPoints > deve somar pontos de alimentação [30.00ms]
...

src/tests/perfect-week.test.ts:
(pass) Semana Perfeita > calculatePerfectWeekBonus > deve retornar 75 pontos [53.00ms]
...

 25 pass
 0 fail
 50 expect() calls
Ran 25 tests across 14 files. [1.2s]
```

### Teste Individual

```bash
# Executar arquivo específico
bun test src/tests/points.test.ts

# Executar múltiplos arquivos
bun test src/tests/points.test.ts src/tests/perfect-week.test.ts
```

### Filtro por Nome

```bash
# Rodar testes que contêm "pontos" no nome
bun test --test-name-pattern "pontos"

# Rodar testes que contêm "semana perfeita"
bun test --test-name-pattern "semana perfeita"
```

### Opções Adicionais

```bash
# Timeout customizado (ms)
bun test --timeout 10000

# Report detalhado
bun test --reporter=verbose

# Coverage (relatório de cobertura)
bun test --coverage
```

---

## Estrutura de Arquivos

```
back/
├── src/
│   ├── tests/                    # Arquivos de teste
│   │   ├── activity-type.test.ts
│   │   ├── api-contracts.test.ts # Contrato de API (formato das respostas)
│   │   ├── entries.test.ts       # CRUD de entradas
│   │   ├── entry-daily-limit.test.ts
│   │   ├── entry-report.test.ts
│   │   ├── entry.test.ts
│   │   ├── enums.test.ts
│   │   ├── leaderboard.test.ts
│   │   ├── perfect-week.test.ts  # Semana perfeita (nova feature)
│   │   ├── points.test.ts        # Cálculo de pontos
│   │   ├── projects.test.ts
│   │   ├── timeline.test.ts
│   │   ├── user.test.ts
│   │   └── votes.test.ts
│   │
│   ├── test-db.ts                # Setup do banco de teste
│   ├── db-provider.ts            # Provider com injeção de dependência
│   ├── services/                 # Serviços (lógica de negócio)
│   ├── routes/                   # Rotas (API endpoints)
│   ├── utils/                    # Utilitários
│   └── schema.sql                # Schema do banco
│
├── data/
│   └── test.db                   # Banco de dados de teste (criado/destruído)
│
└── package.json
```

---

## Utilitários e Helpers

### `test-db.ts`

Módulo responsável por criar, resetar e destruir o banco de dados de teste.

**Funções exportadas:**

```typescript
// Cria banco de dados com schema + seeds + migrações
export function createTestDatabase(): void

// Limpa dados entre testes (mantém schema/seeds)
export function resetTestData(): void

// Fecha e remove banco de dados de teste
export function closeTestDatabase(): void

// Retorna instância do banco
export function getTestDb(): Database

// IDs fixos dos seeds para uso em testes
export const SEED_IDS: {
  categories: {
    refeicao: 1,
    exercicio: 2,
    projeto_pessoal: 3,
    entorpecentes: 4,
  },
  activityTypes: {
    alimentacaoLimpa: 1,
    alimentacaoSuja: 2,
    exercicioFisico: 3,
    usarTabaco: 4,
  },
}
```

**Ciclo de vida típico:**

```typescript
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';

describe('Meu Teste', () => {
  const testUserId = 101; // ID fixo para testes
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
    // Cria usuário de teste
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser', 'hash123']);
  });

  test('deve fazer algo', async () => {
    // ... teste aqui
  });
});
```

### `db-provider.ts`

Provider singleton que gerencia acesso ao banco de dados com suporte a injeção de dependência.

**Funções:**

```typescript
// Retorna banco atual (teste ou produção)
export function getDb(): Database

// Inicializa banco com schema + seeds (apenas dev)
export function initDatabase(): void

// Provider com métodos internos
export const dbProvider = {
  getDb(): Database,
  setTestDb(db: Database): void,
  reset(): void,
  close(): void,
}
```

**Injeção de dependência para testes:**

```typescript
// No test-db.ts
import { dbProvider } from './db-provider';

export function createTestDatabase() {
  const testDb = new Database(TEST_DB_PATH);
  // ... setup schema + seeds
  dbProvider.setTestDb(testDb); // Injeta banco de teste
}

export function closeTestDatabase() {
  dbProvider.reset(); // Remove injeção, volta ao banco principal
}
```

### `SEED_IDS`

IDs fixos dos dados seed para evitar criação desnecessária de dados duplicados.

**Uso:**

```typescript
import { SEED_IDS } from '../test-db';

// Em vez de criar activity type, usa o seed existente
db.run(`
  INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
  VALUES (?, ?, ?, ?)
`, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2024-01-15']);

// Verifica categoria
expect(activityType.category_id).toBe(SEED_IDS.categories.exercicio);
```

---

## Padrões de Teste

### Estrutura de Arquivo de Teste

```typescript
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { funcaoSendoTestada } from '../services/alvo.service';

describe('Nome do Serviço/Feature', () => {
  const testUserId = 101; // ID fixo para testes
  let db: ReturnType<typeof getTestDb>;

  // Setup uma vez (antes de todos os testes)
  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  // Cleanup uma vez (depois de todos os testes)
  afterAll(() => {
    closeTestDatabase();
  });

  // Reset antes de cada teste
  beforeEach(() => {
    resetTestData();
    // Cria dados básicos para o teste
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser_feature', 'hash123']);
  });

  // Grupo de testes relacionado
  describe('nomeDaFuncao', () => {
    test('deve retornar X quando Y', async () => {
      // Arrange: prepara dados
      db.run('INSERT INTO ...');

      // Act: executa função
      const result = await funcaoSendoTestada(testUserId);

      // Assert: verifica resultado
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Padrão Arrange-Act-Assert

```typescript
test('deve calcular pontos de alimentação de um único dia', async () => {
  // ===== ARRANGE =====
  db.run(`
    INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
    VALUES (?, ?, ?, ?)
  `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço saudável', '2024-01-15']);

  // ===== ACT =====
  const result = await getDailyFoodPoints(testUserId, '2024-01-15');

  // ===== ASSERT =====
  expect(result.points).toBe(10);
  expect(result.rawPoints).toBe(10);
  expect(result.capped).toBe(false);
});
```

### Testes com Múltiplos Cenários

```typescript
describe('calculatePerfectWeekBonus', () => {
  describe('Semana Perfeita Completa', () => {
    test('deve retornar 75 pontos para semana perfeita completa', async () => {
      // Setup: 7 dias exercício, sem negativos, projeto com meta batida
      // ...
      expect(result.points).toBe(75);
    });
  });

  describe('Falha por Exercício', () => {
    test('deve retornar 0 pontos se um dia não tiver exercício', async () => {
      // Setup: 6 dias com exercício, 1 dia sem
      // ...
      expect(result.points).toBe(0);
      expect(result.hasExerciseEveryDay).toBe(false);
    });
  });

  describe('Falha por Alimentação Suja', () => {
    test('deve retornar 0 pontos se tiver alimentação suja', async () => {
      // Setup: alimentação suja em um dia
      // ...
      expect(result.points).toBe(0);
      expect(result.noNegativePoints).toBe(false);
    });
  });
});
```

### Testes de API/Contrato

```typescript
import { Hono } from 'hono';
import { generateToken } from '../utils/jwt';
import entriesRoutes from '../routes/entries';

test('deve retornar lista de entradas paginada', async () => {
  const app = new Hono();
  const token = generateToken({ id: testUserId, username: 'testuser' });

  app.route('/api', entriesRoutes);

  const response = await app.request('/api/entries', {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty('entries');
  expect(data).toHaveProperty('pagination');
  expect(data.pagination).toHaveProperty('page', 1);
  expect(data.pagination).toHaveProperty('limit', 10);
});
```

---

## Categorias de Testes

### 1. Testes Unitários de Serviço

**Arquivos:** `points.test.ts`, `perfect-week.test.ts`, `projects.test.ts`

**Características:**
- Testam funções de serviço diretamente
- Sem HTTP, sem rotas
- Foco em lógica de negócio
- Mais rápidos

**Exemplo:**
```typescript
import { getUserTotalPoints } from '../services/points.service';

test('deve somar pontos de alimentação de múltiplos dias', async () => {
  db.run(`INSERT INTO user_entries ...`, [/* dados */]);

  const totalPoints = await getUserTotalPoints(testUserId);

  expect(totalPoints).toBe(30);
});
```

### 2. Testes de Integração de API

**Arquivos:** `api-contracts.test.ts`, `entries.test.ts`, `user.test.ts`

**Características:**
- Testam endpoints HTTP
- Usam Hono app
- Validam status codes e formato de resposta
- Mais lentos (envolvem HTTP stack)

**Exemplo:**
```typescript
import { Hono } from 'hono';
import entriesRoutes from '../routes/entries';

test('deve criar entrada com sucesso', async () => {
  const app = new Hono();
  app.route('/api', entriesRoutes);

  const response = await app.request('/api/entries', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ activityTypeId: 1, description: 'Test' }),
  });

  expect(response.status).toBe(201);
});
```

### 3. Testes de Contrato

**Arquivo:** `api-contracts.test.ts`

**Características:**
- Validam formato exato das respostas
- Previnem regressões na API
- Garantem compatibilidade com front-end

**Exemplo:**
```typescript
interface UserEntry {
  id: number;
  user_id: number;
  activity_type_id: number;
  description: string;
  photo_url: string | null;
  // ...
}

test('deve retornar estrutura UserEntry correta', async () => {
  const response = await app.request('/api/entries/1');
  const entry: UserEntry = await response.json();

  expect(entry).toMatchObject({
    id: expect.any(Number),
    user_id: expect.any(Number),
    activity_type_id: expect.any(Number),
    description: expect.any(String),
    photo_url: expect.any(String),
  });
});
```

### 4. Testes de Regras de Negócio

**Arquivos:** `entry-daily-limit.test.ts`, `votes.test.ts`, `entry-report.test.ts`

**Características:**
- Validam regras específicas do domínio
- Testam edge cases
- Cenários complexos

**Exemplo:**
```typescript
test('deve limitar a 10 pontos positivos por dia', async () => {
  // 3 entradas de alimentação limpa no mesmo dia
  db.run(`INSERT ...`, [testUserId, ALIMENTACAO_LIMPA, 'Café', '2024-01-15']);
  db.run(`INSERT ...`, [testUserId, ALIMENTACAO_LIMPA, 'Almoço', '2024-01-15']);
  db.run(`INSERT ...`, [testUserId, ALIMENTACAO_LIMPA, 'Jantar', '2024-01-15']);

  const result = await getDailyFoodPoints(testUserId, '2024-01-15');

  expect(result.points).toBe(10); // Teto aplicado
  expect(result.rawPoints).toBe(30); // Sem teto seria 30
  expect(result.capped).toBe(true);
});
```

---

## Melhores Práticas

### 1. Use IDs Fixos para Usuários de Teste

```typescript
// ✅ Bom: ID fixo e único por arquivo de teste
const testUserId = 101;

// ❌ Ruim: IDs aleatórios ou hardcoded sem padrão
const testUserId = Math.random();
const testUserId = 1; // Pode conflitar com seeds
```

### 2. Limpe Dados no `beforeEach`

```typescript
// ✅ Bom: Reset antes de cada teste
beforeEach(() => {
  resetTestData();
  db.run('INSERT INTO users ...', [testUserId, 'testuser', 'hash']);
});

// ❌ Ruim: Acumula dados entre testes
beforeAll(() => {
  db.run('INSERT INTO users ...'); // Dados persistem entre testes
});
```

### 3. Use `SEED_IDS` em vez de Criar Dados

```typescript
// ✅ Bom: Usa seed existente
db.run(`INSERT INTO user_entries ...`, 
  [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Desc', '2024-01-15']);

// ❌ Ruim: Cria activity type duplicado
db.run(`INSERT INTO activity_types (name, category_id, base_points) ...`,
  ['Alimentação Limpa', 1, 10]);
```

### 4. Nomeie Testes Claramente

```typescript
// ✅ Bom: Nome descritivo do comportamento
test('deve retornar 0 pontos se projeto não bater meta', async () => {
  // ...
});

// ❌ Ruim: Nome genérico
test('teste de projeto', async () => {
  // ...
});
```

### 5. Agrupe Testes Relacionados com `describe`

```typescript
// ✅ Bom: Hierarquia clara
describe('calculatePerfectWeekBonus', () => {
  describe('Semana Perfeita Completa', () => {
    test('deve retornar 75 pontos...', () => {});
  });

  describe('Falha por Exercício', () => {
    test('deve retornar 0 pontos...', () => {});
  });
});

// ❌ Ruim: Tests soltos sem organização
test('deve retornar 75 pontos...', () => {});
test('deve retornar 0 pontos...', () => {});
test('outro teste...', () => {});
```

### 6. Teste Edge Cases

```typescript
// ✅ Bom: Cobre casos extremos
test('deve retornar 0 para usuário sem entradas', async () => {
  const points = await getUserTotalPoints(testUserId);
  expect(points).toBe(0);
});

test('deve lidar com entradas com timestamp completo', async () => {
  db.run(`INSERT ...`, [testUserId, 1, 'Desc', '2024-01-15T14:30:00Z']);
  // ...
});
```

### 7. Use `beforeAll` e `afterAll` para Setup Pesado

```typescript
// ✅ Bom: Cria banco uma vez, reusa entre testes
beforeAll(() => {
  createTestDatabase(); // Pesado: cria schema + seeds
  db = getTestDb();
});

afterAll(() => {
  closeTestDatabase(); // Limpa arquivo do banco
});

beforeEach(() => {
  resetTestData(); // Leve: apenas DELETE nas tabelas
});
```

### 8. Valide Múltiplas Propriedades

```typescript
// ✅ Bom: Valida estrutura completa
const result = await calculatePerfectWeekBonus(testUserId, 10, 2025);
expect(result.points).toBe(75);
expect(result.hasExerciseEveryDay).toBe(true);
expect(result.noNegativePoints).toBe(true);
expect(result.projectGoalReached).toBe(true);

// ❌ Ruim: Valida apenas uma propriedade
expect(result.points).toBe(75);
```

---

## Debug de Testes

### Logs no Console

```typescript
test('deve fazer algo', async () => {
  const result = await funcaoTestada();
  console.log('Resultado:', result); // Aparece no output do teste
  expect(result).toBe(expected);
});
```

### Inspecionar Banco de Dados

```typescript
test('deve inserir dados corretamente', async () => {
  db.run(`INSERT INTO user_entries ...`);

  // Inspeciona dados inseridos
  const entries = db.prepare('SELECT * FROM user_entries').all();
  console.log('Entries:', entries);

  // ...
});
```

### Teste Isolado

```bash
# Rodar apenas um arquivo
bun test src/tests/perfect-week.test.ts

# Rodar apenas um describe específico (pelo nome)
bun test --test-name-pattern "Semana Perfeita"

# Rodar apenas um teste específico
bun test --test-name-pattern "deve retornar 75 pontos"
```

---

## Troubleshooting

### Erro: "Database already initialized"

**Causa:** `createTestDatabase()` chamado múltiplas vezes.

**Solução:** Use `beforeAll` para criar uma vez, `beforeEach` para resetar dados.

```typescript
beforeAll(() => {
  createTestDatabase(); // Apenas uma vez
});

beforeEach(() => {
  resetTestData(); // Reset dados antes de cada teste
});
```

### Erro: "Foreign key constraint failed"

**Causa:** Tentar inserir dado que referencia ID inexistente.

**Solução:** Use `SEED_IDS` ou crie dados pai primeiro.

```typescript
// Cria usuário antes de criar entrada
db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
  [testUserId, 'testuser', 'hash123']);

db.run('INSERT INTO user_entries (user_id, ...) VALUES (?, ...)',
  [testUserId, ...]);
```

### Erro: "Table already exists"

**Causa:** Schema executado múltiplas vezes.

**Solução:** Garanta que `createTestDatabase()` é chamado apenas uma vez (`beforeAll`).

### Testes Lentos

**Causa:** Muitos testes de integração ou setup pesado.

**Solução:**
- Use testes unitários quando possível (mais rápidos)
- Mova setup pesado para `beforeAll`
- Use `resetTestData()` em vez de recriar banco

---

## Adicionando Novos Testes

### Checklist

1. [ ] Criar arquivo `src/tests/nome-feature.test.ts`
2. [ ] Importar helpers do `test-db.ts`
3. [ ] Estruturar com `describe`/`test`/`expect`
4. [ ] Usar `SEED_IDS` quando possível
5. [ ] Cobrir cenários: sucesso, falha, edge cases
6. [ ] Nomear testes claramente (padrão: "deve X quando Y")
7. [ ] Rodar testes localmente antes de commit

### Template

```typescript
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { funcaoSendoTestada } from '../services/alvo.service';

describe('Nome da Feature', () => {
  const testUserId = 201; // Use ID único por arquivo
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser_feature', 'hash123']);
  });

  describe('funcaoSendoTestada', () => {
    test('deve retornar X quando Y', async () => {
      // Arrange
      db.run(`INSERT INTO tabela ...`);

      // Act
      const result = await funcaoSendoTestada(testUserId);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

---

## Histórico de Versões

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0 | 2025-03-09 | Documentação inicial do guia de testes |
