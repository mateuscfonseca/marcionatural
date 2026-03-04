import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { getUserTotalPoints, getDailyFoodPoints, calculatePointsFromActivityType } from '../services/points.service';

describe('Points Service', () => {
  const testUserId = 101;
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
      [testUserId, 'testuser_points', 'hash123']);
  });

  describe('calculatePointsFromActivityType', () => {
    test('deve retornar 10 pontos para alimentação limpa', async () => {
      const points = await calculatePointsFromActivityType(SEED_IDS.activityTypes.alimentacaoLimpa);
      expect(points).toBe(10);
    });

    test('deve retornar -10 pontos para alimentação suja', async () => {
      const points = await calculatePointsFromActivityType(SEED_IDS.activityTypes.alimentacaoSuja);
      expect(points).toBe(-10);
    });

    test('deve retornar 5 pontos para exercício físico', async () => {
      const points = await calculatePointsFromActivityType(SEED_IDS.activityTypes.exercicioFisico);
      expect(points).toBe(5);
    });
  });

  describe('getDailyFoodPoints', () => {
    test('deve calcular pontos de alimentação de um único dia', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço saudável', '2024-01-15']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(10);
      expect(result.rawPoints).toBe(10);
      expect(result.capped).toBe(false);
    });

    test('deve limitar a 10 pontos positivos por dia', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Café da manhã', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Jantar', '2024-01-15']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(10);
      expect(result.rawPoints).toBe(30);
      expect(result.capped).toBe(true);
    });

    test('deve limitar a -10 pontos negativos por dia', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoSuja, 'Café da manhã ruim', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoSuja, 'Almoço ruim', '2024-01-15']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(-10);
      expect(result.rawPoints).toBe(-20);
      expect(result.capped).toBe(true);
    });

    test('deve somar pontos de dias diferentes corretamente', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 2', '2024-01-16']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 3', '2024-01-17']);

      const day1 = await getDailyFoodPoints(testUserId, '2024-01-15');
      const day2 = await getDailyFoodPoints(testUserId, '2024-01-16');
      const day3 = await getDailyFoodPoints(testUserId, '2024-01-17');

      expect(day1.points).toBe(10);
      expect(day2.points).toBe(10);
      expect(day3.points).toBe(10);
    });

    test('deve comparar datas corretamente mesmo com timestamp', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada com timestamp', '2024-01-15 10:30:00']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(10);
    });
  });

  describe('getUserTotalPoints', () => {
    test('deve somar pontos de alimentação de múltiplos dias', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 2', '2024-01-16']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 3', '2024-01-17']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(30);
    });

    test('deve aplicar limite diário de 10 pontos para alimentação', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada 2', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada 3', '2024-01-15']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(10);
    });

    test('deve somar pontos de alimentação e exercícios com teto diário', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 2', '2024-01-16']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício 2', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício 3', '2024-01-16']);

      // Alimentação: 10 + 10 = 20
      // Exercícios: teto de 5/dia → 5 (dia 15) + 5 (dia 16) = 10
      // Total: 30 pontos
      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(30);
    });

    test('deve lidar com entradas com timestamp completo', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Manhã', '2024-01-15 08:00:00']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Tarde', '2024-01-16 14:30:00']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Noite', '2024-01-17 20:45:00']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(30);
    });

    test('deve retornar 0 para usuário sem entradas', async () => {
      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(0);
    });

    test('deve somar alimentação positiva e negativa corretamente', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoSuja, 'Dia 2', '2024-01-16']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 3', '2024-01-17']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(10);
    });

    test('deve aplicar teto de -5 pontos por dia para entorpecentes', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Fumou 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Fumou 2', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Fumou 3', '2024-01-16']);

      // Entorpecentes: teto de -5/dia → -5 (dia 15) + -5 (dia 16) = -10
      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(-10);
    });

    test('deve calcular pontos misturando todas as categorias com tetos', async () => {
      // Dia 15: alimentação limpa (+10) + exercício (+5) + tabaco (-5) = 10
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2024-01-15']);
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Treino', '2024-01-15']);
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Cigarro', '2024-01-15']);

      // Dia 16: alimentação suja (-10) + exercício (+5) = -5
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoSuja, 'Jantar', '2024-01-16']);
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Caminhada', '2024-01-16']);

      // Total: 10 + (-5) = 5 pontos
      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(5);
    });
  });
});
