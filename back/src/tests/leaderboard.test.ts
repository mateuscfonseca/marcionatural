import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { getLeaderboardByDate, getLeaderboardWithMovement } from '../services/leaderboard.service';
import { createEntry, type CreateEntryDTO } from '../services/entry.service';

describe('Leaderboard Service', () => {
  let db: ReturnType<typeof getTestDb>;
  const testUserId = 101;
  const testUserId2 = 102;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId, 'user1', 'hash']);
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId2, 'user2', 'hash']);
  });

  test('deve retornar leaderboard vazio sem entradas', async () => {
    const leaderboard = await getLeaderboardByDate('2024-01-15');
    expect(leaderboard.length).toBeGreaterThan(0); // Tem usuários seeds
  });

  test('deve calcular pontos de alimentação', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço',
      entryDate: '2024-01-15',
    };
    await createEntry(dto);

    const leaderboard = await getLeaderboardByDate('2024-01-16');
    const user = leaderboard.find(u => u.id === testUserId);
    expect(user).toBeDefined();
    expect(user?.total_points).toBe(10);
  });

  test('deve calcular pontos de exercício', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Corrida',
      entryDate: '2024-01-15',
    };
    await createEntry(dto);

    const leaderboard = await getLeaderboardByDate('2024-01-16');
    const user = leaderboard.find(u => u.id === testUserId);
    expect(user).toBeDefined();
    expect(user?.total_points).toBe(5);
  });

  test('deve aplicar limite diário de 10 pontos para alimentação', async () => {
    // Cria 3 entradas de alimentação no mesmo dia
    for (let i = 1; i <= 3; i++) {
      const dto: CreateEntryDTO = {
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
        description: `Refeição ${i}`,
        entryDate: '2024-01-15',
      };
      await createEntry(dto);
    }

    const leaderboard = await getLeaderboardByDate('2024-01-16');
    const user = leaderboard.find(u => u.id === testUserId);
    expect(user?.total_points).toBe(10); // Limitado a 10
  });

  test('deve somar alimentação e exercício', async () => {
    const foodDto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço',
      entryDate: '2024-01-15',
    };
    await createEntry(foodDto);

    const exerciseDto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Corrida',
      entryDate: '2024-01-15',
    };
    await createEntry(exerciseDto);

    const leaderboard = await getLeaderboardByDate('2024-01-16');
    const user = leaderboard.find(u => u.id === testUserId);
    expect(user?.total_points).toBe(15); // 10 alimentação + 5 exercício
  });

  test('deve retornar leaderboard com movimentação', async () => {
    const dto: CreateEntryDTO = {
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço',
      entryDate: '2024-01-15',
    };
    await createEntry(dto);

    const leaderboard = await getLeaderboardWithMovement('2024-01-16');
    expect(leaderboard.length).toBeGreaterThan(0);
    const user = leaderboard.find(u => u.id === testUserId);
    expect(user).toBeDefined();
    expect(user?.position).toBeDefined();
  });

  test('deve ordenar por pontos decrescente', async () => {
    // User1: 10 pontos
    await createEntry({
      userId: testUserId,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço',
      entryDate: '2024-01-15',
    });

    // User2: 20 pontos (2 dias de alimentação)
    await createEntry({
      userId: testUserId2,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço 1',
      entryDate: '2024-01-15',
    });
    await createEntry({
      userId: testUserId2,
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço 2',
      entryDate: '2024-01-16',
    });

    const leaderboard = await getLeaderboardByDate('2024-01-17');
    expect(leaderboard[0].id).toBe(testUserId2); // Mais pontos primeiro
  });
});
