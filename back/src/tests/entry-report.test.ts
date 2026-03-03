import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import {
  createEntryReport,
  removeEntryReport,
  hasUserReported,
  getReportsByEntry,
  getReportCount,
  checkAndUpdateInvalidation,
} from '../services/entry-report.service';
import { createEntry, type CreateEntryDTO } from '../services/entry.service';

describe('Entry Report Service', () => {
  let db: ReturnType<typeof getTestDb>;
  const testUserId = 101;
  const testUserId2 = 102;
  let testEntryId: number;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(async () => {
    resetTestData();
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId, 'testuser1', 'hash']);
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId2, 'testuser2', 'hash']);

    // Cria entrada para testar reports
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Entrada para report',
      entryDate: '2024-01-15',
    };
    const entry = await createEntry(dto);
    testEntryId = entry.id;
  });

  test('deve criar report', async () => {
    const report = await createEntryReport(testEntryId, testUserId2);
    expect(report.id).toBeDefined();
    expect(report.entry_id).toBe(testEntryId);
    expect(report.reporter_user_id).toBe(testUserId2);
  });

  test('deve verificar se usuário já reportou', async () => {
    await createEntryReport(testEntryId, testUserId2);
    const reported = await hasUserReported(testUserId2, testEntryId);
    expect(reported).toBe(true);
  });

  test('deve retornar false se usuário não reportou', async () => {
    const reported = await hasUserReported(testUserId2, testEntryId);
    expect(reported).toBe(false);
  });

  test('deve buscar reports por entrada', async () => {
    await createEntryReport(testEntryId, testUserId2);
    const reports = await getReportsByEntry(testEntryId);
    expect(reports.length).toBe(1);
  });

  test('deve remover report', async () => {
    await createEntryReport(testEntryId, testUserId2);
    const removed = await removeEntryReport(testEntryId, testUserId2);
    expect(removed).toBe(true);
    const reports = await getReportsByEntry(testEntryId);
    expect(reports.length).toBe(0);
  });

  test('deve contar reports por entrada', async () => {
    await createEntryReport(testEntryId, testUserId2);
    const count = await getReportCount(testEntryId);
    expect(count).toBe(1);
  });

  test('deve invalidar entrada com 3 ou mais reports', async () => {
    // Cria 3 reports
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [103, 'testuser3', 'hash']);
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [104, 'testuser4', 'hash']);
    
    await createEntryReport(testEntryId, testUserId2);
    await createEntryReport(testEntryId, 103);
    await createEntryReport(testEntryId, 104);

    const result = await checkAndUpdateInvalidation(testEntryId);
    expect(result.invalidated).toBe(true);
    expect(result.reportCount).toBe(3);
  });

  test('não deve invalidar entrada com menos de 3 reports', async () => {
    await createEntryReport(testEntryId, testUserId2);
    const result = await checkAndUpdateInvalidation(testEntryId);
    expect(result.invalidated).toBe(false);
    expect(result.reportCount).toBe(1);
  });
});
