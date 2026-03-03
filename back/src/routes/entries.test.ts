import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import entriesRoutes from './entries';
import { Hono } from 'hono';
import { generateToken } from '../utils/jwt';

/**
 * Testes para validação de 1 alimentação por dia
 *
 * Regra de negócio:
 * - Máximo 1 entrada de alimentação (categoria 1) por dia civil
 * - Limite de ±10 pontos por dia para alimentação
 * - Exercícios (categoria 2) são ilimitados por dia
 */
describe('POST /entries - Validação 1 Alimentação por Dia', () => {
  let testUserId: number;
  let testUsername: string;
  let authToken: string;
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(async () => {
    resetTestData();

    // Criar usuário de teste
    testUsername = 'testuser_food_limit';
    const userResult = db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [testUsername, 'hash_test']
    );
    testUserId = userResult.lastInsertRowid as number;

    // Gerar token de autenticação para o usuário
    authToken = await generateToken({
      userId: testUserId,
      username: testUsername,
    });
  });

  const mockRequest = (body: object) => ({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`,
    },
    body: JSON.stringify(body),
  });

  test('deve permitir criar primeira alimentação do dia', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Café da manhã limpo',
      entryDate: '2025-03-03',
    }));

    expect(response.status).toBe(201);
    const data = await response.json() as { entry: { description: string; entry_date: string } };
    expect(data.entry).toBeDefined();
    expect(data.entry.description).toBe('Café da manhã limpo');
    expect(data.entry.entry_date).toBe('2025-03-03');
  });

  test('deve NEGAR segunda alimentação no mesmo dia (409)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Primeira alimentação - deve funcionar
    const response1 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Café da manhã',
      entryDate: '2025-03-03',
    }));
    expect(response1.status).toBe(201);

    // Segunda alimentação no mesmo dia - deve falhar (409)
    const response2 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoSuja,
      description: 'Almoço sujo',
      entryDate: '2025-03-03',
    }));
    expect(response2.status).toBe(409);
    const data = await response2.json() as { error: string };
    expect(data.error).toContain('já registrou uma alimentação');
  });

  test('deve permitir alimentação em dia diferente', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Dia 03
    const response1 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Café da manhã',
      entryDate: '2025-03-03',
    }));
    expect(response1.status).toBe(201);

    // Dia 04 - deve funcionar
    const response2 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Café da manhã dia seguinte',
      entryDate: '2025-03-04',
    }));
    expect(response2.status).toBe(201);
  });

  test('deve permitir exercício no mesmo dia da alimentação', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Alimentação
    const response1 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Almoço',
      entryDate: '2025-03-03',
    }));
    expect(response1.status).toBe(201);

    // Exercício no mesmo dia - deve funcionar (categoria 2)
    const response2 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Corrida',
      entryDate: '2025-03-03',
    }));
    expect(response2.status).toBe(201);
  });

  test('deve NEGAR quando entryDate estiver vazio', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Teste sem data',
      entryDate: '',
    }));
    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toContain('obrigatória');
  });

  test('deve NEGAR quando entryDate tiver formato inválido', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Teste formato inválido',
      entryDate: '03/03/2025',
    }));
    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toContain('YYYY-MM-DD');
  });

  test('deve NEGAR quando entryDate for null', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
      description: 'Teste sem data',
      entryDate: null,
    }));
    expect(response.status).toBe(400);
  });

  test('deve permitir múltiplos exercícios no mesmo dia', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Exercício 1
    const response1 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Corrida manhã',
      entryDate: '2025-03-03',
    }));
    expect(response1.status).toBe(201);

    // Exercício 2 no mesmo dia
    const response2 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Musculação tarde',
      entryDate: '2025-03-03',
    }));
    expect(response2.status).toBe(201);

    // Exercício 3 no mesmo dia
    const response3 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Natação noite',
      entryDate: '2025-03-03',
    }));
    expect(response3.status).toBe(201);
  });
});
