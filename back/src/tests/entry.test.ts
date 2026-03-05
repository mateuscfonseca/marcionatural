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

  test('deve converter created_at para UTC ISO 8601 corretamente', async () => {
    // Cria entrada com horario especifico
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste UTC', '2024-01-15', '2024-01-15 14:30:00']);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    expect(entry).toBeDefined();
    expect(entry?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(entry?.created_at).toBe('2024-01-15T14:30:00.000Z');
  });

  test('deve converter horarios com minutos e segundos para UTC', async () => {
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Teste horario completo', '2024-01-16', '2024-01-16 08:45:30']);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    expect(entry?.created_at).toBe('2024-01-16T08:45:30.000Z');
  });

  test('deve converter meia-noite corretamente para UTC', async () => {
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste meia-noite', '2024-01-17', '2024-01-17 00:00:00']);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    // Meia-noite UTC deve permanecer como 00:00:00 no dia correto
    expect(entry?.created_at).toBe('2024-01-17T00:00:00.000Z');
  });

  test('deve converter fim do dia corretamente para UTC', async () => {
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste fim do dia', '2024-01-18', '2024-01-18 23:59:59']);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    expect(entry?.created_at).toBe('2024-01-18T23:59:59.000Z');
  });

  test('deve lidar com datas sem parte de tempo', async () => {
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste apenas data', '2024-01-15', '2024-01-15']);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    expect(entry).toBeDefined();
    expect(entry?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  test('deve converter invalidated_at para UTC quando presente', async () => {
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at, is_invalidated, invalidated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste invalidada', '2024-01-15', '2024-01-15 10:00:00', 1, '2024-01-15 12:30:00']);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    expect(entry?.created_at).toBe('2024-01-15T10:00:00.000Z');
    expect(entry?.invalidated_at).toBe('2024-01-15T12:30:00.000Z');
  });

  test('deve retornar null para invalidated_at quando nao invalidada', async () => {
    const result = db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at, is_invalidated)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste nao invalidada', '2024-01-15', '2024-01-15 10:00:00', 0]);
    const entryId = result.lastInsertRowid as number;

    const entry = await getEntryById(entryId);

    expect(entry?.invalidated_at).toBeNull();
  });

  test('deve buscar entradas por usuario com conversao UTC correta', async () => {
    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada 1', '2024-01-15', '2024-01-15 09:00:00']);

    db.run(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Entrada 2', '2024-01-16', '2024-01-16 15:30:00']);

    const entries = await getEntriesByUser(testUserId);

    expect(entries.length).toBe(2);
    entries.forEach(entry => {
      expect(entry.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    const entrada1 = entries.find(e => e.description === 'Entrada 1');
    const entrada2 = entries.find(e => e.description === 'Entrada 2');

    expect(entrada1?.created_at).toBe('2024-01-15T09:00:00.000Z');
    expect(entrada2?.created_at).toBe('2024-01-16T15:30:00.000Z');
  });
});
