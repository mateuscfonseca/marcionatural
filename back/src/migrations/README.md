# Sistema de Migrações

Este diretório contém o sistema de migrações do banco de dados SQLite.

## Estrutura

```
migrations/
├── Migration.ts              # Interface que todas as migrações devem implementar
├── MigrationManager.ts       # Gerenciador que executa e rastreia migrações
├── index.ts                  # Registro de todas as migrações
├── 001-add-entry-date.ts     # Exemplo de migração concreta
└── README.md                 # Esta documentação
```

## Como Funciona

1. **Registro**: Cada migração é registrada no `index.ts` em ordem
2. **Execução**: `MigrationManager.runAll()` executa migrações pendentes
3. **Rastreamento**: Tabela `migrations` guarda histórico do que foi aplicado
4. **Idempotência**: Cada migração verifica se já foi aplicada antes de executar

## Como Criar uma Nova Migração

### Passo 1: Criar o Arquivo

Crie um arquivo em `migrations/NNN-descricao.ts` onde `NNN` é o próximo número sequencial:

```typescript
import type { Migration } from './Migration';
import { db } from '../db';

export class AddNewColumnMigration implements Migration {
  readonly name = '002-add-new-column';
  readonly description = 'Adiciona coluna XYZ na tabela ABC';

  apply(): void {
    // SEMPRE verifique se a mudança já existe
    const tableInfo = db.prepare("PRAGMA table_info(abc)").all() as Array<{ name: string }>;
    const hasColumn = tableInfo.some(col => col.name === 'xyz');

    if (hasColumn) {
      console.log('  ℹ️  Coluna xyz já existe');
      return; // Idempotente: não faz nada se já existe
    }

    // Aplica a mudança
    db.run('ALTER TABLE abc ADD COLUMN xyz TEXT');
    console.log('  ✅ Coluna xyz adicionada');
  }
}
```

### Passo 2: Registrar no index.ts

Adicione a migração no `index.ts`:

```typescript
import { MigrationManager } from './MigrationManager';
import { AddEntryDateMigration } from './001-add-entry-date';
import { AddNewColumnMigration } from './002-add-new-column'; // <-- Nova migração

MigrationManager.register(new AddEntryDateMigration());
MigrationManager.register(new AddNewColumnMigration()); // <-- Registre aqui
```

### Passo 3: Testar

Execute as migrações:

```bash
# Via script dedicado
bun run src/run-migrations.ts

# Ou via npm script
bun run migrate
```

## Comandos Disponíveis

```bash
# Executar migrações pendentes
bun run migrate

# Executar migração legada (se necessário)
bun run migrate:legacy

# Executar standalone (para migrações específicas)
bun run src/migrate-add-entry-date.ts
```

## Boas Práticas

### ✅ Faça
- **Nomeie com número sequencial**: `001-`, `002-`, `003-`...
- **Seja idempotente**: Sempre verifique se já existe antes de criar
- **Descrição clara**: Explique o que a migração faz
- **Teste localmente**: Execute múltiplas vezes para garantir idempotência
- **Mantenha a ordem**: Registre no `index.ts` na ordem cronológica

### ❌ Não Faça
- **Não altere migrações existentes**: Uma vez registrada, não modifique
- **Não pule números**: Mantenha sequência para facilitar rastreamento
- **Não dependa de ordem não garantida**: SQLite pode executar em qualquer ordem
- **Não lance erro se já existe**: Use verificações ou `IF NOT EXISTS`

## Tabela de Migrações

O sistema cria automaticamente a tabela:

```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Esta tabela rastreia quais migrações já foram aplicadas.

## Execução Automática

As migrações são executadas automaticamente no startup da aplicação (`index.ts`):

```typescript
import { initDatabase } from './db';
import { MigrationManager } from './migrations';

// Inicializa banco de dados (schema + seeds)
initDatabase();

// Executa migrações pendentes
MigrationManager.runAll();
```

Isso garante que o banco esteja sempre atualizado em produção.

## Migrações Legadas

O arquivo `migrate.ts` contém migrações legadas executadas manualmente. 
Novas migrações devem usar o sistema baseado em `MigrationManager`.

## Exemplo Completo

Veja `001-add-entry-date.ts` para um exemplo completo de migração idempotente.
