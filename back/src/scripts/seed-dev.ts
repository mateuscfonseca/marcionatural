/**
 * Script de seed para desenvolvimento
 * Cria 6 usuários com dados históricos de 3 dias para testar UI
 * Inclui uma semana perfeita para Ana (7 dias de exercício + alimentação limpa + projeto com meta batida)
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

/**
 * Calcula o número da semana ISO de uma data
 * @param date - Data para calcular a semana
 * @returns Objeto com week (número da semana) e year (ano ISO)
 */
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 0 = domingo, 1 = segunda, ..., 6 = sábado
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Ajusta para quinta-feira mais próxima
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const isoYear = d.getUTCFullYear();

  return { week: weekNum, year: isoYear };
}

/**
 * Dados históricos por usuário
 * Formato: [diaAtraso, activityTypeName, description, dataExplicita?]
 * diaAtraso: 0 = hoje, 1 = ontem, 2 = anteontem, etc.
 * dataExplicita: opcional, usa YYYY-MM-DD se fornecida
 */
const HISTORICAL_DATA: Record<string, Array<[number, string, string, string?]>> = {
  // Ana: líder consistente COM SEMANA PERFEITA (últimos 7 dias)
  'Ana': [
    // Semana perfeita: 6 dias atrás até hoje (segunda a domingo)
    [6, 'Alimentação Limpa', 'Café da manhã saudável - aveia com frutas', '2025-03-03'],
    [6, 'Exercício', 'Corrida matinal 5km', '2025-03-03'],
    [5, 'Alimentação Limpa', 'Almoço com salada e frango grelhado', '2025-03-04'],
    [5, 'Exercício', 'Treino de força na academia', '2025-03-04'],
    [4, 'Alimentação Limpa', 'Jantar leve - peixe com legumes', '2025-03-05'],
    [4, 'Exercício', 'Yoga 30min', '2025-03-05'],
    [3, 'Alimentação Limpa', 'Café da manhã - panqueca de banana', '2025-03-06'],
    [3, 'Exercício', 'Corrida 7km', '2025-03-06'],
    [2, 'Alimentação Limpa', 'Almoço proteico pós-treino', '2025-03-07'],
    [2, 'Exercício', 'Treino HIIT intenso', '2025-03-07'],
    [1, 'Alimentação Limpa', 'Café da manhã com smoothie verde', '2025-03-08'],
    [1, 'Exercício', 'Caminhada no parque', '2025-03-08'],
    [0, 'Alimentação Limpa', 'Almoço equilibrado em família', '2025-03-09'],
    [0, 'Exercício', 'Treino de pernas', '2025-03-09'],
  ],
  // Bruno: começou mal, melhorou
  'Bruno': [
    [3, 'Alimentação Suja', 'Fast food - hambúrguer e fritas'],
    [3, 'Alimentação Suja', 'Refrigerante e pizza'],
    [2, 'Alimentação Limpa', 'Mudou para alimentação saudável'],
    [2, 'Exercício', 'Academia pela primeira vez'],
    [1, 'Alimentação Limpa', 'Dieta continua limpa'],
    [1, 'Exercício', 'Corrida no parque'],
    [0, 'Alimentação Limpa', 'Café da manhã saudável'],
    [0, 'Exercício', 'Treino intenso'],
  ],
  // Carla: consistente mas menos ativa
  'Carla': [
    [3, 'Alimentação Limpa', 'Refeição equilibrada'],
    [2, 'Alimentação Limpa', 'Comida caseira'],
    [1, 'Alimentação Limpa', 'Salada variada'],
    [0, 'Alimentação Limpa', 'Café da manhã leve'],
  ],
  // Daniel: instável
  'Daniel': [
    [3, 'Alimentação Limpa', 'Café saudável'],
    [3, 'Exercício', 'Treino pesado'],
    [2, 'Alimentação Suja', 'Jacada no fim de semana'],
    [1, 'Alimentação Limpa', 'Voltou a dieta'],
    [1, 'Exercício', 'Caminhada leve'],
    [0, 'Alimentação Suja', 'Exagerou no almoço'],
  ],
  // Elena: focada em exercícios
  'Elena': [
    [3, 'Alimentação Limpa', 'Dieta balanceada'],
    [3, 'Exercício', 'Treino HIIT'],
    [3, 'Exercício', 'Natação'],
    [2, 'Alimentação Limpa', 'Refeição pós-treino'],
    [2, 'Exercício', 'Musculação'],
    [2, 'Exercício', 'Cardio 30min'],
    [1, 'Alimentação Limpa', 'Alimentação de atleta'],
    [1, 'Exercício', 'Crossfit'],
    [1, 'Exercício', 'Alongamento'],
    [0, 'Alimentação Limpa', 'Café da manhã proteico'],
    [0, 'Exercício', 'Treino de pernas'],
  ],
  // Felipe: começou bem, piorou
  'Felipe': [
    [3, 'Alimentação Limpa', 'Segunda-feira saudável'],
    [3, 'Exercício', 'Academia motivado'],
    [3, 'Exercício', 'Corrida'],
    [2, 'Alimentação Suja', 'Terça exagerou'],
    [2, 'Usar Tabaco', 'Voltou a fumar'],
    [1, 'Alimentação Limpa', 'Quarta recuperou'],
    [1, 'Exercício', 'Caminhada'],
    [0, 'Alimentação Suja', 'Quinta recaiu'],
    [0, 'Usar Tabaco', 'Fumou de novo'],
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

    for (const entry of entries) {
      const [daysAgo, activityTypeName, description, explicitDate] = entry as [number, string, string, string?];

      // Calcula data (usa data explícita se fornecida, senão calcula baseada em daysAgo)
      let entryDate: string;
      if (explicitDate) {
        entryDate = explicitDate;
      } else {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        entryDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      }

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

      console.log(`    - ${explicitDate ? explicitDate : `${daysAgo === 0 ? 'Hoje' : `${daysAgo} dias atrás`}`}: ${activityTypeName} (${entryDate})`);
    }
  }
}

/**
 * Cria projeto pessoal com logs para Ana (semana perfeita)
 */
async function createPerfectWeekProject(anaUserId: number) {
  console.log('\n📚 Criando projeto pessoal com semana perfeita para Ana...');

  // Cria projeto pessoal para Ana (meta: 10 horas semanais = 600 minutos)
  const projectResult = db.prepare(`
    INSERT INTO personal_projects (user_id, name, description, weekly_hours_goal, is_active)
    VALUES (?, ?, ?, ?, TRUE)
  `).run(anaUserId, 'Projeto Semana Perfeita', 'Projeto para testar bônus de semana perfeita', 10);

  const projectId = projectResult.lastInsertRowid as number;

  // Semana 10 de 2025: 03/03 a 09/03
  // Registra tempo diário no projeto (total: 12 horas = 720 minutos, meta = 10h = 600min)
  const projectLogs = [
    { date: '2025-03-03', minutes: 120 }, // Segunda: 2h
    { date: '2025-03-04', minutes: 100 }, // Terça: 1h40
    { date: '2025-03-05', minutes: 120 }, // Quarta: 2h
    { date: '2025-03-06', minutes: 100 }, // Quinta: 1h40
    { date: '2025-03-07', minutes: 140 }, // Sexta: 2h20
    { date: '2025-03-08', minutes: 120 }, // Sábado: 2h
    { date: '2025-03-09', minutes: 20 },  // Domingo: 20min
    // Total: 720 minutos = 12 horas (meta: 10h) ✅
  ];

  const weekNumber = 10; // Semana ISO 10 de 2025
  const year = 2025;

  for (const log of projectLogs) {
    db.prepare(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, anaUserId, log.date, log.minutes, weekNumber, year);

    console.log(`    - ${log.date}: ${log.minutes}min registrados`);
  }

  console.log(`  ✅ Projeto criado com ${720}min (meta: 600min) - Semana ${weekNumber}/${year}`);
}

async function main() {
  console.log('🌱 Iniciando seed de desenvolvimento...\n');

  try {
    // Cria usuários
    const userIds = await createUsers();

    // Cria entradas históricas
    await createHistoricalEntries(userIds);

    // Cria projeto com semana perfeita para Ana
    const anaUserId = userIds['Ana'];
    if (anaUserId) {
      await createPerfectWeekProject(anaUserId);
    }

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('\n💡 Dica: Use as credenciais abaixo para testar:');
    for (const user of USERS) {
      console.log(`   ${user.username} / ${user.password}`);
    }
    console.log('\n🏆 Ana tem uma SEMANA PERFEITA (Semana 10/2025) com +75 pontos de bônus!');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  }
}

// Executa o script
main();
