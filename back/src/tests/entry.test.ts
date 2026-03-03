import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import {
  getEntryById,
  getEntriesByUser,
  createEntry,
  updateEntry,
  deleteEntry,
  hasUserFoodEntryForDate,
  type CreateEntryDTO,
} from '../services/entry.service';

describe('Entry Service', () => {
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

  test('deve criar entrada', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Teste entrada',
      entryDate: '2024-01-15',
    };
    const entry = await createEntry(dto);
    expect(entry.id).toBeDefined();
    expect(entry.description).toBe('Teste entrada');
  });

  test('deve buscar entrada por ID', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Teste busca',
      entryDate: '2024-01-15',
    };
    const created = await createEntry(dto);
    const entry = await getEntryById(created.id);
    expect(entry).toBeDefined();
    expect(entry?.id).toBe(created.id);
  });

  test('deve retornar undefined para ID inexistente', async () => {
    const entry = await getEntryById(9999);
    expect(entry).toBeUndefined();
  });

  test('deve buscar entradas por usuário', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Teste lista',
      entryDate: '2024-01-15',
    };
    await createEntry(dto);
    const entries = await getEntriesByUser(testUserId);
    expect(entries.length).toBeGreaterThan(0);
  });

  test('deve atualizar entrada', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Original',
      entryDate: '2024-01-15',
    };
    const created = await createEntry(dto);
    const updated = await updateEntry(created.id, { description: 'Atualizado' });
    expect(updated?.description).toBe('Atualizado');
  });

  test('deve deletar entrada', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Para deletar',
      entryDate: '2024-01-15',
    };
    const created = await createEntry(dto);
    const deleted = await deleteEntry(created.id);
    expect(deleted).toBe(true);
    const entry = await getEntryById(created.id);
    expect(entry).toBeUndefined();
  });

  test('deve verificar se usuário tem food entry para data', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Food entry',
      entryDate: '2024-01-15',
    };
    await createEntry(dto);
    const hasEntry = await hasUserFoodEntryForDate(testUserId, '2024-01-15');
    expect(hasEntry).toBe(true);
  });

  test('deve retornar false se não houver food entry', async () => {
    const hasEntry = await hasUserFoodEntryForDate(testUserId, '2024-01-15');
    expect(hasEntry).toBe(false);
  });
});
