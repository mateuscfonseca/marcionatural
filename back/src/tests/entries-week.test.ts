import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { getEntriesByWeek } from '../services/entry.service';

describe('getEntriesByWeek', () => {
  let db: ReturnType<typeof getTestDb>;
  const testUserId = 301;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId, 'testuser_week', 'hash']);
  });

  test('deve buscar todas as entradas de uma semana ISO específica', async () => {
    // Semana 10 de 2025: 03/03 a 09/03
    // Cria entradas em dias diferentes da semana
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 1', '2025-03-03']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Dia 2', '2025-03-04']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 3', '2025-03-05']);

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.entries).toHaveLength(3);
    expect(result.summary.totalEntries).toBe(3);
  });

  test('deve retornar entradas vazias para semana sem registros', async () => {
    // Cria entrada em semana diferente
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Fora da semana', '2025-02-01']);

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.entries).toHaveLength(0);
    expect(result.summary.totalEntries).toBe(0);
  });

  test('deve contar corretamente dias com exercício', async () => {
    // Cria exercícios em 3 dias diferentes
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Ex 1', '2025-03-03']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Ex 2', '2025-03-04']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Ex 3', '2025-03-05']);

    // Cria alimentação (não conta como exercício)
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2025-03-03']);

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.summary.exerciseDays).toBe(3);
    expect(result.summary.hasExerciseEveryDay).toBe(false); // 3 de 7 dias
  });

  test('deve detectar pontos negativos', async () => {
    // Cria alimentação suja (pontos negativos)
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoSuja, 'Fast food', '2025-03-03']);

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.summary.hasNegativePoints).toBe(true);
  });

  test('deve detectar uso de entorpecentes como pontos negativos', async () => {
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Tabaco', '2025-03-03']);

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.summary.hasNegativePoints).toBe(true);
  });

  test('deve retornar hasExerciseEveryDay=true quando todos os 7 dias tiverem exercício', async () => {
    // Cria exercícios em todos os 7 dias da semana 10 de 2025
    const days = [
      '2025-03-03', '2025-03-04', '2025-03-05',
      '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09'
    ];

    for (const day of days) {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, `Exercício ${day}`, day]);
    }

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.summary.exerciseDays).toBe(7);
    expect(result.summary.hasExerciseEveryDay).toBe(true);
  });

  test('deve ordenar entradas por data ascendente', async () => {
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 3', '2025-03-05']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 1', '2025-03-03']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Dia 2', '2025-03-04']);

    const result = await getEntriesByWeek(testUserId, 10, 2025);

    expect(result.entries[0].entry_date).toBe('2025-03-03');
    expect(result.entries[1].entry_date).toBe('2025-03-04');
    expect(result.entries[2].entry_date).toBe('2025-03-05');
  });

  test('deve incluir apenas entradas validadas', async () => {
    // Cria entrada com activity_type não validado
    const result = db.run(`
      INSERT INTO activity_types (name, category_id, is_positive, base_points, is_validated)
      VALUES (?, ?, ?, ?, ?)
    `, ['Atividade Não Validada', 1, true, 10, false]);

    const activityTypeId = result.lastInsertRowid as number;

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, activityTypeId, 'Entrada não validada', '2025-03-03']);

    // Cria entrada com activity_type validado
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada validada', '2025-03-03']);

    const entriesResult = await getEntriesByWeek(testUserId, 10, 2025);

    expect(entriesResult.entries).toHaveLength(1);
    expect(entriesResult.entries[0].description).toBe('Entrada validada');
  });
});
