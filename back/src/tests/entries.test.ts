import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import entriesRoutes from '../routes/entries';
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
    expect(data.error).toContain('já registrou uma entrada de alimentação');
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

  test('deve permitir apenas 1 exercício por dia (nova regra)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Exercício 1 - deve funcionar
    const response1 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Corrida manhã',
      entryDate: '2025-03-03',
    }));
    expect(response1.status).toBe(201);

    // Exercício 2 no mesmo dia - deve falhar (409)
    const response2 = await app.request('/api/entries', mockRequest({
      activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
      description: 'Musculação tarde',
      entryDate: '2025-03-03',
    }));
    expect(response2.status).toBe(409);
    const data = await response2.json() as { error: string };
    expect(data.error).toContain('já registrou uma entrada de exercício');
  });
});

/**
 * Testes para paginação e filtros temporais
 */
describe('GET /entries - Paginação e Filtros Temporais', () => {
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
    testUsername = 'testuser_pagination';
    const userResult = db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [testUsername, 'hash_test']
    );
    testUserId = userResult.lastInsertRowid as number;

    // Gerar token de autenticação
    authToken = await generateToken({
      userId: testUserId,
      username: testUsername,
    });
  });

  const mockGetRequest = (url: string) => ({
    method: 'GET',
    headers: {
      'Cookie': `auth_token=${authToken}`,
    },
    url: `http://localhost${url}`,
  });

  const createEntry = async (entryDate: string, description: string) => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({
        activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
        description,
        entryDate,
      }),
    });
    return response;
  };

  test('deve retornar paginação padrão (page=1, limit=6)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Criar 10 entradas em datas diferentes
    for (let i = 1; i <= 10; i++) {
      const day = i.toString().padStart(2, '0');
      await createEntry(`2025-03-${day}`, `Entrada ${i}`);
    }

    const response = await app.request('/api/entries', mockGetRequest('/api/entries'));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };

    expect(data.entries).toHaveLength(6); // limit padrão
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(6);
    expect(data.pagination.total).toBe(10);
    expect(data.pagination.totalPages).toBe(2);
  });

  test('deve retornar página específica quando solicitado', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Criar 15 entradas
    for (let i = 1; i <= 15; i++) {
      const day = i.toString().padStart(2, '0');
      await createEntry(`2025-03-${day}`, `Entrada ${i}`);
    }

    const response = await app.request('/api/entries?page=2&limit=5', mockGetRequest('/api/entries?page=2&limit=5'));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };

    expect(data.entries).toHaveLength(5);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(5);
    expect(data.pagination.total).toBe(15);
    expect(data.pagination.totalPages).toBe(3);
  });

  test('deve filtrar por hoje (timeFilter=today)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    await createEntry(today, 'Entrada de hoje');
    await createEntry(yesterday, 'Entrada de ontem');

    const response = await app.request(`/api/entries?timeFilter=today`, mockGetRequest(`/api/entries?timeFilter=today`));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { total: number };
    };

    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].description).toBe('Entrada de hoje');
    expect(data.pagination.total).toBe(1);
  });

  test('deve filtrar últimos 3 dias (timeFilter=last3)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const today = new Date();
    const dates = [
      today.toISOString().split('T')[0],
      new Date(Date.now() - 86400000).toISOString().split('T')[0], // 1 dia atrás
      new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // 2 dias atrás
      new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], // 5 dias atrás (fora do filtro)
    ];

    for (let i = 0; i < dates.length; i++) {
      await createEntry(dates[i], `Entrada ${i + 1}`);
    }

    const response = await app.request('/api/entries?timeFilter=last3', mockGetRequest('/api/entries?timeFilter=last3'));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { total: number };
    };

    expect(data.entries).toHaveLength(3);
    expect(data.pagination.total).toBe(3);
  });

  test('deve filtrar última semana (timeFilter=last7)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const today = new Date();
    const dates = [
      today.toISOString().split('T')[0],
      new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], // 3 dias atrás
      new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], // 6 dias atrás
      new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0], // 10 dias atrás (fora do filtro)
    ];

    for (let i = 0; i < dates.length; i++) {
      await createEntry(dates[i], `Entrada ${i + 1}`);
    }

    const response = await app.request('/api/entries?timeFilter=last7', mockGetRequest('/api/entries?timeFilter=last7'));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { total: number };
    };

    expect(data.entries).toHaveLength(3);
    expect(data.pagination.total).toBe(3);
  });

  test('deve retornar todas as entradas (timeFilter=all)', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Criar entradas em datas variadas
    await createEntry('2025-01-01', 'Entrada antiga');
    await createEntry('2025-02-15', 'Entrada média');
    await createEntry(new Date().toISOString().split('T')[0], 'Entrada recente');

    const response = await app.request('/api/entries?timeFilter=all', mockGetRequest('/api/entries?timeFilter=all'));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { total: number };
    };

    expect(data.entries).toHaveLength(3);
    expect(data.pagination.total).toBe(3);
  });

  test('deve retornar página vazia quando não houver entradas', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', mockGetRequest('/api/entries'));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      entries: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };

    expect(data.entries).toHaveLength(0);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(6);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.totalPages).toBe(0);
  });
});

/**
 * Testes para paginação e filtros temporais - User Entries (público)
 */
describe('GET /entries/users/:userId - Paginação e Filtros Temporais', () => {
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
    testUsername = 'testuser_public';
    const userResult = db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [testUsername, 'hash_test']
    );
    testUserId = userResult.lastInsertRowid as number;

    // Gerar token de autenticação
    authToken = await generateToken({
      userId: testUserId,
      username: testUsername,
    });
  });

  const mockGetRequest = (url: string) => ({
    method: 'GET',
    headers: {
      'Cookie': `auth_token=${authToken}`,
    },
    url: `http://localhost${url}`,
  });

  const createEntry = async (entryDate: string, description: string, activityTypeId: number) => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const response = await app.request('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({
        activityTypeId,
        description,
        entryDate,
      }),
    });
    return response;
  };

  test('deve retornar entradas paginadas de outro usuário', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    // Criar 10 entradas positivas (exercícios)
    for (let i = 1; i <= 10; i++) {
      const day = i.toString().padStart(2, '0');
      await createEntry(`2025-03-${day}`, `Exercício ${i}`, SEED_IDS.activityTypes.exercicioFisico);
    }

    const response = await app.request('/api/entries/users/' + testUserId, mockGetRequest('/api/entries/users/' + testUserId));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      user: { id: number; username: string };
      entries: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };

    expect(data.user.username).toBe(testUsername);
    expect(data.entries).toHaveLength(6); // limit padrão
    expect(data.pagination.total).toBe(10);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(6);
  });

  test('deve aplicar filtro temporal em entradas de usuário público', async () => {
    const app = new Hono();
    app.route('/api/entries', entriesRoutes);

    const today = new Date().toISOString().split('T')[0];
    const oldDate = '2025-01-01';

    await createEntry(today, 'Exercício recente', SEED_IDS.activityTypes.exercicioFisico);
    await createEntry(oldDate, 'Exercício antigo', SEED_IDS.activityTypes.exercicioFisico);

    const response = await app.request(`/api/entries/users/${testUserId}?timeFilter=today`, mockGetRequest(`/api/entries/users/${testUserId}?timeFilter=today`));
    expect(response.status).toBe(200);

    const data = await response.json() as {
      user: { id: number; username: string };
      entries: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };

    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].description).toBe('Exercício recente');
    expect(data.pagination.total).toBe(1);
  });
});
