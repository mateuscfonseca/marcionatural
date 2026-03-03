import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { db } from '../db';
import { getUserTotalPoints, getDailyFoodPoints, calculatePointsFromActivityType } from '../services/points.service';

describe('Points Service', () => {
  const testUserId = 9999;
  const testActivityTypeIds: { [key: string]: number } = {};

  beforeEach(() => {
    // Limpa dados de teste anteriores
    db.run('DELETE FROM user_entries WHERE user_id = ?', [testUserId]);
    db.run('DELETE FROM activity_types WHERE name LIKE "%Teste%"');

    // Cria activity types de teste usando categorias existentes do schema
    // Categoria 1 = Refeição, Categoria 2 = Exercício
    const result1 = db.run('INSERT INTO activity_types (name, category_id, is_positive, base_points, is_validated) VALUES (?, ?, ?, ?, ?)',
      ['Alimentação Positiva Teste', 1, true, 10, 1]);
    testActivityTypeIds.positive = result1.lastInsertRowid as number;

    const result2 = db.run('INSERT INTO activity_types (name, category_id, is_positive, base_points, is_validated) VALUES (?, ?, ?, ?, ?)',
      ['Alimentação Negativa Teste', 1, false, -10, 1]);
    testActivityTypeIds.negative = result2.lastInsertRowid as number;

    const result3 = db.run('INSERT INTO activity_types (name, category_id, is_positive, base_points, is_validated) VALUES (?, ?, ?, ?, ?)',
      ['Exercício Teste', 2, true, 5, 1]);
    testActivityTypeIds.exercise = result3.lastInsertRowid as number;
  });

  afterEach(() => {
    // Limpa dados de teste
    db.run('DELETE FROM user_entries WHERE user_id = ?', [testUserId]);
    db.run('DELETE FROM activity_types WHERE name LIKE "%Teste%"');
  });

  describe('calculatePointsFromActivityType', () => {
    test('deve retornar 10 pontos para alimentação positiva', async () => {
      const points = await calculatePointsFromActivityType(testActivityTypeIds.positive);
      expect(points).toBe(10);
    });

    test('deve retornar -10 pontos para alimentação negativa', async () => {
      const points = await calculatePointsFromActivityType(testActivityTypeIds.negative);
      expect(points).toBe(-10);
    });

    test('deve retornar 5 pontos para exercício', async () => {
      const points = await calculatePointsFromActivityType(testActivityTypeIds.exercise);
      expect(points).toBe(5);
    });
  });

  describe('getDailyFoodPoints', () => {
    test('deve calcular pontos de alimentação de um único dia', async () => {
      // Cria entrada de alimentação positiva para 2024-01-15
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Almoço saudável', 10, '2024-01-15']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(10);
      expect(result.rawPoints).toBe(10);
      expect(result.capped).toBe(false);
    });

    test('deve limitar a 10 pontos positivos por dia', async () => {
      // Cria múltiplas entradas positivas no mesmo dia
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Café da manhã', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Almoço', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Jantar', 10, '2024-01-15']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(10); // Limitado a 10
      expect(result.rawPoints).toBe(30);
      expect(result.capped).toBe(true);
    });

    test('deve limitar a -10 pontos negativos por dia', async () => {
      // Cria múltiplas entradas negativas no mesmo dia
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.negative, 'Café da manhã ruim', -10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.negative, 'Almoço ruim', -10, '2024-01-15']);

      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(-10); // Limitado a -10
      expect(result.rawPoints).toBe(-20);
      expect(result.capped).toBe(true);
    });

    test('deve somar pontos de dias diferentes corretamente', async () => {
      // Cria entradas em dias diferentes
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 1', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 2', 10, '2024-01-16']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 3', 10, '2024-01-17']);

      // Cada dia deve ter 10 pontos
      const day1 = await getDailyFoodPoints(testUserId, '2024-01-15');
      const day2 = await getDailyFoodPoints(testUserId, '2024-01-16');
      const day3 = await getDailyFoodPoints(testUserId, '2024-01-17');

      expect(day1.points).toBe(10);
      expect(day2.points).toBe(10);
      expect(day3.points).toBe(10);
    });

    test('deve comparar datas corretamente mesmo com timestamp', async () => {
      // Cria entrada com data completa (YYYY-MM-DD HH:MM:SS)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Entrada com timestamp', 10, '2024-01-15 10:30:00']);

      // Busca usando apenas a data (YYYY-MM-DD)
      const result = await getDailyFoodPoints(testUserId, '2024-01-15');
      expect(result.points).toBe(10);
    });
  });

  describe('getUserTotalPoints', () => {
    test('deve somar pontos de alimentação de múltiplos dias', async () => {
      // Cria entradas em 3 dias diferentes
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 1', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 2', 10, '2024-01-16']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 3', 10, '2024-01-17']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(30); // 10 + 10 + 10
    });

    test('deve aplicar limite diário de 10 pontos para alimentação', async () => {
      // Cria 3 entradas no mesmo dia (30 pontos raw, mas limitado a 10)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Entrada 1', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Entrada 2', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Entrada 3', 10, '2024-01-15']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(10); // Limitado a 10 por dia
    });

    test('deve somar pontos de alimentação e exercícios', async () => {
      // Alimentação: 2 dias com 10 pontos cada = 20 pontos
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 1', 10, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 2', 10, '2024-01-16']);

      // Exercícios: 3 entradas com 5 pontos cada = 15 pontos (sem limite diário)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.exercise, 'Exercício 1', 5, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.exercise, 'Exercício 2', 5, '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.exercise, 'Exercício 3', 5, '2024-01-16']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(35); // 20 (alimentação) + 15 (exercícios)
    });

    test('deve lidar com entradas com timestamp completo', async () => {
      // Cria entradas com timestamps completos
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Manhã', 10, '2024-01-15 08:00:00']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Tarde', 10, '2024-01-16 14:30:00']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Noite', 10, '2024-01-17 20:45:00']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(30); // 10 + 10 + 10 em dias diferentes
    });

    test('deve retornar 0 para usuário sem entradas', async () => {
      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(0);
    });

    test('deve somar alimentação positiva e negativa corretamente', async () => {
      // Dia 1: +10 (positiva)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 1', 10, '2024-01-15']);

      // Dia 2: -10 (negativa)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.negative, 'Dia 2', -10, '2024-01-16']);

      // Dia 3: +10 (positiva)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, points, entry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testActivityTypeIds.positive, 'Dia 3', 10, '2024-01-17']);

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(10); // 10 + (-10) + 10 = 10
    });
  });
});
