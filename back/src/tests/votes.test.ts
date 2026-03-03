import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import {
  getVotesByActivityType,
  hasUserVoted,
  addVote,
  checkAndUpdateValidation,
  getValidationStatus,
} from '../services/votes.service';

describe('Votes Service', () => {
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
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId, 'testuser1', 'hash']);
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId2, 'testuser2', 'hash']);
  });

  test('deve adicionar voto', async () => {
    const vote = await addVote(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 1);
    expect(vote.id).toBeDefined();
    expect(vote.user_id).toBe(testUserId);
    expect(vote.vote_type).toBe(1);
  });

  test('deve verificar se usuário já votou', async () => {
    await addVote(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 1);
    const voted = await hasUserVoted(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(voted).toBe(true);
  });

  test('deve retornar false se usuário não votou', async () => {
    const voted = await hasUserVoted(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(voted).toBe(false);
  });

  test('deve buscar votos por activity type', async () => {
    await addVote(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 1);
    await addVote(testUserId2, SEED_IDS.activityTypes.alimentacaoLimpa, -1);
    const votes = await getVotesByActivityType(SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(votes.length).toBe(2);
  });

  test('deve retornar status de validação sem votos', async () => {
    const status = await getValidationStatus(SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(status.totalVotes).toBe(0);
    expect(status.isValidated).toBe(true);
  });

  test('deve invalidar activity type com maioria de votos negativos', async () => {
    // Cria 3 votos negativos (maioria de 3)
    await addVote(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, -1);
    await addVote(testUserId2, SEED_IDS.activityTypes.alimentacaoLimpa, -1);
    
    // Cria novo usuário para terceiro voto
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [103, 'testuser3', 'hash']);
    await addVote(103, SEED_IDS.activityTypes.alimentacaoLimpa, -1);

    const result = await checkAndUpdateValidation(SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(result.invalidated).toBe(true);
    expect(result.status.isInvalidated).toBe(true);
  });

  test('deve manter activity type validado sem maioria negativa', async () => {
    await addVote(testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 1);
    await addVote(testUserId2, SEED_IDS.activityTypes.alimentacaoLimpa, -1);

    const result = await checkAndUpdateValidation(SEED_IDS.activityTypes.alimentacaoLimpa);
    expect(result.invalidated).toBe(false);
    expect(result.status.isValidated).toBe(true);
  });
});
