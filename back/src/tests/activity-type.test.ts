import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import {
  getAllActivityTypes,
  getActivityTypesByCategory,
  getActivityTypeById,
  createActivityType,
  getValidatedActivityTypes,
  getActivityTypesForUser,
} from '../services/activity-type.service';

describe('Activity Type Service', () => {
  let db: ReturnType<typeof getTestDb>;
  const testUserId = 101;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId, 'testuser', 'hash']);
  });

  test('deve retornar todos os activity types', async () => {
    const types = await getAllActivityTypes();
    expect(types.length).toBeGreaterThan(0);
  });

  test('deve filtrar activity types por categoria', async () => {
    const types = await getActivityTypesByCategory(SEED_IDS.categories.refeicao);
    expect(types.length).toBeGreaterThan(0);
    types.forEach(t => expect(t.category_id).toBe(SEED_IDS.categories.refeicao));
  });

  test('deve retornar activity type por ID', async () => {
    const type = await getActivityTypeById(SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(type).toBeDefined();
    expect(type?.id).toBe(SEED_IDS.activityTypes.alimentacaoLimpa);
  });

  test('deve retornar undefined para ID inexistente', async () => {
    const type = await getActivityTypeById(9999);
    expect(type).toBeUndefined();
  });

  test('deve criar novo activity type', async () => {
    const newType = await createActivityType('Teste Criacao', 2, true, testUserId);
    expect(newType.id).toBeDefined();
    expect(newType.name).toBe('Teste Criacao');
    expect(newType.category_id).toBe(2);
  });

  test('deve retornar apenas activity types validados', async () => {
    const types = await getValidatedActivityTypes();
    expect(types.length).toBeGreaterThan(0);
    types.forEach(t => expect(t.is_validated).toBe(1));
  });

  test('deve retornar activity types para usuário (validados + criados)', async () => {
    const types = await getActivityTypesForUser(testUserId);
    expect(types.length).toBeGreaterThan(0);
  });
});
