/**
 * Script de seed para desenvolvimento
 * Cria 6 usuários com dados históricos de 3 dias para testar UI
 *
 * Uso: bun run seed-dev
 */

import { getDb } from '../db-provider';
import bcrypt from 'bcryptjs';

const db = getDb();

// Configuração de usuários
const USERS = [
  { username: 'Ana', password: '123456' },
  { username: 'Bruno', password: '123456' },
  { username: 'Carla', password: '123456' },
  { username: 'Daniel', password: '123456' },
  { username: 'Elena', password: '123456' },
  { username: 'Felipe', password: '123456' },
];

// Dados históricos por usuário (últimos 3 dias)
// Cada entrada: [diaAtraso, activityTypeName, description, points]
const HISTORICAL_DATA: Record<string, Array<[number, string, string, number]>> = {
  // Ana: líder consistente
  'Ana': [
    [3, 'Alimentação Limpa', 'Café da manhã saudável - aveia com frutas', 10],
    [3, 'Exercício', 'Corrida matinal 5km', 5],
    [2, 'Alimentação Limpa', 'Almoço com salada e frango grelhado', 10],
    [2, 'Exercício', 'Treino de força na academia', 5],
    [1, 'Alimentação Limpa', 'Jantar leve - peixe com legumes', 10],
    [1, 'Exercício', 'Yoga 30min', 5],
    [0, 'Alimentação Limpa', 'Café da manhã - panqueca de banana', 10],
    [0, 'Exercício', 'Corrida 7km', 5],
  ],
  // Bruno: começou mal, melhorou
  'Bruno': [
    [3, 'Alimentação Suja', 'Fast food - hambúrguer e fritas', -10],
    [3, 'Alimentação Suja', 'Refrigerante e pizza', -10],
    [2, 'Alimentação Limpa', 'Mudou para alimentação saudável', 10],
    [2, 'Exercício', 'Academia pela primeira vez', 5],
    [1, 'Alimentação Limpa', 'Dieta continua limpa', 10],
    [1, 'Exercício', 'Corrida no parque', 5],
    [0, 'Alimentação Limpa', 'Café da manhã saudável', 10],
    [0, 'Exercício', 'Treino intenso', 5],
  ],
  // Carla: consistente mas menos ativa
  'Carla': [
    [3, 'Alimentação Limpa', 'Refeição equilibrada', 10],
    [2, 'Alimentação Limpa', 'Comida caseira', 10],
    [1, 'Alimentação Limpa', 'Salada variada', 10],
    [0, 'Alimentação Limpa', 'Café da manhã leve', 10],
  ],
  // Daniel: instável
  'Daniel': [
    [3, 'Alimentação Limpa', 'Café saudável', 10],
    [3, 'Exercício', 'Treino pesado', 5],
    [2, 'Alimentação Suja', 'Jacada no fim de semana', -10],
    [1, 'Alimentação Limpa', 'Voltou a dieta', 10],
    [1, 'Exercício', 'Caminhada leve', 5],
    [0, 'Alimentação Suja', 'Exagerou no almoço', -10],
  ],
  // Elena: focada em exercícios
  'Elena': [
    [3, 'Alimentação Limpa', 'Dieta balanceada', 10],
    [3, 'Exercício', 'Treino HIIT', 5],
    [3, 'Exercício', 'Natação', 5],
    [2, 'Alimentação Limpa', 'Refeição pós-treino', 10],
    [2, 'Exercício', 'Musculação', 5],
    [2, 'Exercício', 'Cardio 30min', 5],
    [1, 'Alimentação Limpa', 'Alimentação de atleta', 10],
    [1, 'Exercício', 'Crossfit', 5],
    [1, 'Exercício', 'Alongamento', 5],
    [0, 'Alimentação Limpa', 'Café da manhã proteico', 10],
    [0, 'Exercício', 'Treino de pernas', 5],
  ],
  // Felipe: começou bem, piorou
  'Felipe': [
    [3, 'Alimentação Limpa', 'Segunda-feira saudável', 10],
    [3, 'Exercício', 'Academia motivado', 5],
    [3, 'Exercício', 'Corrida', 5],
    [2, 'Alimentação Suja', 'Terça exagerou', -10],
    [2, 'Usar Tabaco', 'Voltou a fumar', -5],
    [1, 'Alimentação Limpa', 'Quarta recuperou', 10],
    [1, 'Exercício', 'Caminhada', 5],
    [0, 'Alimentação Suja', 'Quinta recaiu', -10],
    [0, 'Usar Tabaco', 'Fumou de novo', -5],
  ],
};

async function getOrCreateActivityType(name: string, categoryId: number, isPositive: boolean, basePoints: number): Promise<number> {
  const existing = db.prepare('SELECT id FROM activity_types WHERE name = ?').get(name) as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO activity_types (name, category_id, is_positive, base_points, is_validated)
    VALUES (?, ?, ?, ?, TRUE)
  `).run(name, categoryId, isPositive, basePoints);

  return result.lastInsertRowid as number;
}

async function createUsers() {
  console.log('📝 Criando usuários...');
  const userIds: Record<string, number> = {};

  for (const user of USERS) {
    // Verifica se usuário já existe
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(user.username) as { id: number } | undefined;
    if (existing) {
      console.log(`  ⚠️  Usuário "${user.username}" já existe (ID: ${existing.id})`);
      userIds[user.username] = existing.id;
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `).run(user.username, passwordHash);

    userIds[user.username] = result.lastInsertRowid as number;
    console.log(`  ✅ Usuário "${user.username}" criado (ID: ${userIds[user.username]})`);
  }

  return userIds;
}

async function createHistoricalEntries(userIds: Record<string, number>) {
  console.log('\n📊 Criando entradas históricas...');

  // Mapeamento de nomes de activity types para IDs
  const activityTypeCache: Record<string, number> = {};

  for (const [username, entries] of Object.entries(HISTORICAL_DATA)) {
    const userId = userIds[username];
    if (!userId) continue;

    console.log(`  📝 ${username}:`);

    for (const [daysAgo, activityTypeName, description, expectedPoints] of entries) {
      // Calcula data
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const entryDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

      // Determina categoria e pontos base
      let categoryId: number;
      let isPositive: boolean;
      let basePoints: number;

      if (activityTypeName.includes('Alimentação Limpa')) {
        categoryId = 1;
        isPositive = true;
        basePoints = 10;
      } else if (activityTypeName.includes('Alimentação Suja')) {
        categoryId = 1;
        isPositive = false;
        basePoints = -10;
      } else if (activityTypeName.includes('Usar Tabaco')) {
        categoryId = 4; // entorpecentes
        isPositive = false;
        basePoints = -5;
      } else {
        categoryId = 2; // exercício
        isPositive = true;
        basePoints = 5;
      }

      // Busca ou cria activity type
      if (!activityTypeCache[activityTypeName]) {
        activityTypeCache[activityTypeName] = await getOrCreateActivityType(
          activityTypeName,
          categoryId,
          isPositive,
          basePoints
        );
      }

      const activityTypeId = activityTypeCache[activityTypeName];

      // Cria entrada (sem points, cálculo é dinâmico)
      db.prepare(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `).run(userId, activityTypeId, description, entryDate);

      console.log(`    - ${daysAgo === 0 ? 'Hoje' : `${daysAgo} dias atrás`}: ${activityTypeName} (${entryDate})`);
    }
  }
}

async function main() {
  console.log('🌱 Iniciando seed de desenvolvimento...\n');

  try {
    // Cria usuários
    const userIds = await createUsers();

    // Cria entradas históricas
    await createHistoricalEntries(userIds);

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('\n💡 Dica: Use as credenciais abaixo para testar:');
    for (const user of USERS) {
      console.log(`   ${user.username} / ${user.password}`);
    }
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  }
}

// Executa o script
main();
