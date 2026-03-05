import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData } from '../test-db';
import { Hono } from 'hono';
import { generateToken } from '../utils/jwt';
import authRoutes from '../routes/auth';
import entriesRoutes from '../routes/entries';
import leaderboardRoutes from '../routes/leaderboard';
import projectsRoutes from '../routes/projects';
import timelineRoutes from '../routes/timeline';
import activityTypesRoutes from '../routes/activity-types';

/**
 * Testes de Contrato de API
 * 
 * Validam que as APIs retornam exatamente o formato esperado pelo front-end
 * Previne erros de regressão quando modificamos serviços ou rotas
 */

// ===== TIPOS ESPERADOS PELO FRONT-END =====

interface User {
  id: number;
  username: string;
  deleted_at?: string | null;
}

interface UserEntry {
  id: number;
  user_id: number;
  activity_type_id: number;
  description: string;
  photo_url: string | null;
  photo_original_name: string | null;
  photo_identifier: string | null;
  duration_minutes: number | null;
  entry_date: string | null;
  is_invalidated: boolean;
  invalidated_at: string | null;
  created_at: string;
  activity_type_name?: string;
  category_id?: number;
  category_name?: string;
  is_activity_validated?: boolean;
  is_activity_positive?: boolean;
}

interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedEntriesResponse {
  entries: UserEntry[];
  pagination: PaginationResponse;
}

interface LeaderboardUser {
  id: number;
  username: string;
  total_points: number;
  valid_entries_count: number;
}

interface LeaderboardUserWithMovement extends LeaderboardUser {
  position: number;
  previousPosition: number | null;
  positionDiff: number;
  movement: 'up' | 'down' | 'same';
}

interface ActivityType {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  is_positive: boolean;
  base_points: number;
  is_validated: boolean;
  created_by_user_id: number | null;
  created_at: string;
}

interface ValidationStatus {
  totalVotes: number;
  positiveVotes: number;
  negativeVotes: number;
  isValidated: boolean;
  isInvalidated: boolean;
  negativePercentage: number;
}

interface PersonalProject {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  weekly_hours_goal: number;
  is_active: boolean;
  created_at: string;
  total_points?: number;
}

interface WeeklyProgress {
  weekNumber: number;
  year: number;
  totalMinutes: number;
  goalMinutes: number;
  goalReached: boolean;
  percentage: number;
  dailyLogs: Array<{
    id: number;
    project_id: number;
    user_id: number;
    date: string;
    duration_minutes: number;
    week_number: number;
    year: number;
    created_at: string;
  }>;
}

interface ProjectWithProgress extends PersonalProject {
  totalMinutes: number;
  goalMinutes: number;
  goalReached: boolean;
  percentage: number;
  weekNumber: number;
  year: number;
}

interface TimelineEntry {
  id: number;
  user_id: number;
  username: string;
  activity_type_id: number | null;
  activity_type_name: string | null;
  category_id: number | null;
  category_name: string | null;
  description: string;
  photo_url: string | null;
  photo_identifier: string | null;
  photo_original_name: string | null;
  points: number;
  entry_date: string;
  created_at: string;
  is_invalidated: boolean;
  entry_type: 'activity' | 'project';
  project_id: number | null;
  project_name: string | null;
  duration_minutes: number | null;
  week_number: number | null;
  year: number | null;
}

// ===== SETUP GERAL =====

describe('API Contract Tests', () => {
  let db: ReturnType<typeof getTestDb>;
  let testUserId: number;
  let testUsername: string;
  let authToken: string;

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
    testUsername = 'contract_test_user';
    const userResult = db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [testUsername, 'hash_contract_test']
    );
    testUserId = userResult.lastInsertRowid as number;

    // Gerar token de autenticação
    authToken = await generateToken({
      userId: testUserId,
      username: testUsername,
    });
  });

  const createAuthRequest = (url: string, options: RequestInit = {}) => ({
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`,
    },
    url: `http://localhost${url}`,
  });

  // ===== CONTRATO: AUTENTICAÇÃO =====

  describe('POST /auth/register - Contrato', () => {
    test('deve retornar estrutura correta para registro bem-sucedido', async () => {
      const app = new Hono();
      app.route('/api/auth', authRoutes);

      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newuser123', password: 'password123' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Estrutura esperada pelo front-end
      expect(data).toMatchObject({
        message: expect.any(String),
        user: {
          id: expect.any(Number),
          username: 'newuser123',
        },
      });
    });

    test('deve retornar erro com estrutura correta para usuário existente', async () => {
      const app = new Hono();
      app.route('/api/auth', authRoutes);

      // Primeiro registro
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'existinguser', password: 'password123' }),
      });

      // Segundo registro (deve falhar)
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'existinguser', password: 'password123' }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data).toMatchObject({ error: expect.any(String) });
    });
  });

  describe('POST /auth/login - Contrato', () => {
    test('deve retornar estrutura correta para login bem-sucedido', async () => {
      const app = new Hono();
      app.route('/api/auth', authRoutes);

      // Registrar usuário primeiro
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'loginuser', password: 'password123' }),
      });

      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'loginuser', password: 'password123' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toMatchObject({
        message: expect.any(String),
        user: {
          id: expect.any(Number),
          username: 'loginuser',
        },
      });
    });

    test('deve retornar erro com estrutura correta para credenciais inválidas', async () => {
      const app = new Hono();
      app.route('/api/auth', authRoutes);

      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'invaliduser', password: 'wrongpassword' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toMatchObject({ error: expect.any(String) });
    });
  });

  describe('GET /auth/me - Contrato', () => {
    test('deve retornar estrutura correta para usuário autenticado', async () => {
      const app = new Hono();
      app.route('/api/auth', authRoutes);

      const response = await app.request('http://localhost/api/auth/me', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toMatchObject({
        user: {
          id: expect.any(Number),
          username: testUsername,
        },
      });
    });

    test('deve retornar erro com estrutura correta para não autenticado', async () => {
      const app = new Hono();
      app.route('/api/auth', authRoutes);

      const response = await app.request('http://localhost/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toMatchObject({ error: expect.any(String) });
    });
  });

  // ===== CONTRATO: ENTRIES =====

  describe('GET /entries - Contrato', () => {
    test('deve retornar PaginatedEntriesResponse com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/entries', entriesRoutes);

      // Criar algumas entradas
      await app.request('http://localhost/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
        body: JSON.stringify({
          activityTypeId: 1,
          description: 'Test entry',
          entryDate: '2025-03-03',
        }),
      });

      const response = await app.request('http://localhost/api/entries', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as PaginatedEntriesResponse;

      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      if (data.entries.length > 0) {
        const entry = data.entries[0];
        // Validar apenas campos obrigatórios do contrato
        expect(entry.id).toBeDefined();
        expect(entry.user_id).toBeDefined();
        expect(entry.activity_type_id).toBeDefined();
        expect(entry.description).toBeDefined();
        expect(entry.created_at).toBeDefined();
        // SQLite retorna booleanos como 0/1
        expect(entry.is_invalidated === 0 || entry.is_invalidated === 1).toBe(true);
      }
    });

    test('deve suportar filtros de tempo (timeFilter)', async () => {
      const app = new Hono();
      app.route('/api/entries', entriesRoutes);

      const response = await app.request('http://localhost/api/entries?timeFilter=today', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as PaginatedEntriesResponse;

      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('pagination');
    });
  });

  describe('POST /entries - Contrato', () => {
    test('deve retornar estrutura correta para entrada criada', async () => {
      const app = new Hono();
      app.route('/api/entries', entriesRoutes);

      const response = await app.request('http://localhost/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
        body: JSON.stringify({
          activityTypeId: 1,
          description: 'Nova entrada de teste',
          entryDate: '2025-03-03',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data).toMatchObject({
        message: expect.any(String),
        entry: {
          id: expect.any(Number),
          user_id: testUserId,
          activity_type_id: 1,
          description: 'Nova entrada de teste',
          entry_date: '2025-03-03',
        },
      });
    });

    test('deve retornar erro com estrutura correta para dados inválidos', async () => {
      const app = new Hono();
      app.route('/api/entries', entriesRoutes);

      const response = await app.request('http://localhost/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
        body: JSON.stringify({
          description: 'Sem activityTypeId',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toMatchObject({ error: expect.any(String) });
    });
  });

  describe('GET /entries/users/:userId - Contrato', () => {
    test('deve retornar estrutura correta para entradas de usuário público', async () => {
      const app = new Hono();
      app.route('/api/entries', entriesRoutes);

      // Criar entrada
      await app.request('http://localhost/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
        body: JSON.stringify({
          activityTypeId: 3,
          description: 'Exercício público',
          entryDate: '2025-03-03',
        }),
      });

      const response = await app.request(`http://localhost/api/entries/users/${testUserId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toMatchObject({
        user: {
          id: expect.any(Number),
          username: expect.any(String),
        },
        entries: expect.any(Array),
        pagination: {
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
      });
    });
  });

  // ===== CONTRATO: LEADERBOARD =====

  describe('GET /leaderboard - Contrato', () => {
    test('deve retornar leaderboard simples com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/leaderboard', leaderboardRoutes);

      const response = await app.request('http://localhost/api/leaderboard', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('leaderboard');
      expect(Array.isArray(data.leaderboard)).toBe(true);

      if (data.leaderboard.length > 0) {
        const user = data.leaderboard[0];
        expect(user).toMatchObject({
          id: expect.any(Number),
          username: expect.any(String),
          total_points: expect.any(Number),
          valid_entries_count: expect.any(Number),
        });
      }
    });

    test('deve retornar leaderboard com movimentação quando compare=true', async () => {
      const app = new Hono();
      app.route('/api/leaderboard', leaderboardRoutes);

      const response = await app.request('http://localhost/api/leaderboard?compare=true', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('leaderboard');
      expect(Array.isArray(data.leaderboard)).toBe(true);

      if (data.leaderboard.length > 0) {
        const user = data.leaderboard[0];
        expect(user).toMatchObject({
          id: expect.any(Number),
          username: expect.any(String),
          total_points: expect.any(Number),
          position: expect.any(Number),
          previousPosition: expect.anything(),
          positionDiff: expect.any(Number),
          movement: expect.any(String),
        });
      }
    });
  });

  describe('GET /leaderboard/users - Contrato', () => {
    test('deve retornar lista de usuários com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/leaderboard', leaderboardRoutes);

      const response = await app.request('http://localhost/api/leaderboard/users', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);

      if (data.users.length > 0) {
        const user = data.users[0];
        expect(user).toMatchObject({
          id: expect.any(Number),
          username: expect.any(String),
          created_at: expect.any(String),
          total_points: expect.any(Number),
        });
      }
    });
  });

  // ===== CONTRATO: PROJECTS =====

  describe('GET /projects - Contrato', () => {
    test('deve retornar lista de projetos com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/projects', projectsRoutes);

      const response = await app.request('http://localhost/api/projects', {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('projects');
      expect(Array.isArray(data.projects)).toBe(true);
    });

    test('deve retornar estrutura correta ao criar projeto', async () => {
      const app = new Hono();
      app.route('/api/projects', projectsRoutes);

      const response = await app.request('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
        body: JSON.stringify({
          name: 'Projeto Teste',
          description: 'Descrição do projeto',
          weeklyHoursGoal: 10,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data).toMatchObject({
        message: expect.any(String),
        project: {
          id: expect.any(Number),
          user_id: testUserId,
          name: 'Projeto Teste',
          weekly_hours_goal: 10,
          is_active: true,
        },
      });
    });
  });

  describe('GET /projects/:id/weekly-progress - Contrato', () => {
    test('deve retornar WeeklyProgress com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/projects', projectsRoutes);

      // Criar projeto
      const createResponse = await app.request('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
        body: JSON.stringify({
          name: 'Projeto Progresso',
          weeklyHoursGoal: 5,
        }),
      });
      const createData = await createResponse.json() as { project: PersonalProject };

      const response = await app.request(`http://localhost/api/projects/${createData.project.id}/weekly-progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toMatchObject({
        progress: {
          weekNumber: expect.any(Number),
          year: expect.any(Number),
          totalMinutes: expect.any(Number),
          goalMinutes: expect.any(Number),
          goalReached: expect.any(Boolean),
          percentage: expect.any(Number),
          dailyLogs: expect.any(Array),
        },
      });
    });
  });

  describe('GET /projects/user/:userId/with-progress - Contrato', () => {
    test('deve retornar projetos com progresso com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/projects', projectsRoutes);

      const response = await app.request(`http://localhost/api/projects/user/${testUserId}/with-progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('projects');
      expect(Array.isArray(data.projects)).toBe(true);
    });
  });

  // ===== CONTRATO: TIMELINE =====

  describe('GET /timeline - Contrato', () => {
    test('deve retornar TimelineEntry com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/timeline', timelineRoutes);

      const response = await app.request('/api/timeline');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toMatchObject({
        entries: expect.any(Array),
        pagination: {
          limit: expect.any(Number),
          offset: expect.any(Number),
          total: expect.any(Number),
          hasMore: expect.any(Boolean),
        },
      });

      // Se houver entradas, validar estrutura
      if (data.entries.length > 0) {
        const entry = data.entries[0];
        expect(entry).toMatchObject({
          id: expect.any(Number),
          user_id: expect.any(Number),
          username: expect.any(String),
          description: expect.any(String),
          entry_date: expect.any(String),
          created_at: expect.any(String),
          is_invalidated: expect.any(Boolean),
          entry_type: expect.any(String),
        });
      }
    });
  });

  // ===== CONTRATO: ACTIVITY-TYPES =====

  describe('GET /activity-types - Contrato', () => {
    test('deve retornar lista de activity types com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/activity-types', activityTypesRoutes);

      const response = await app.request('http://localhost/api/activity-types');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('activityTypes');
      expect(Array.isArray(data.activityTypes)).toBe(true);

      if (data.activityTypes.length > 0) {
        const type = data.activityTypes[0];
        // Campos obrigatórios esperados pelo front-end
        expect(type.id).toBeDefined();
        expect(type.name).toBeDefined();
        expect(type.category_id).toBeDefined();
        expect(type.is_positive).toBeDefined();
        expect(type.base_points).toBeDefined();
        expect(type.is_validated).toBeDefined();
      }
    });
  });

  describe('GET /activity-types/validated - Contrato', () => {
    test('deve retornar activity types validados com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/activity-types', activityTypesRoutes);

      const response = await app.request('/api/activity-types/validated');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('activityTypes');
      expect(Array.isArray(data.activityTypes)).toBe(true);
    });
  });

  describe('GET /activity-types/:id/validation-status - Contrato', () => {
    test('deve retornar ValidationStatus com estrutura correta', async () => {
      const app = new Hono();
      app.route('/api/activity-types', activityTypesRoutes);

      const response = await app.request('/api/activity-types/1/validation-status');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toMatchObject({
        status: {
          totalVotes: expect.any(Number),
          positiveVotes: expect.any(Number),
          negativeVotes: expect.any(Number),
          isValidated: expect.any(Boolean),
          isInvalidated: expect.any(Boolean),
          negativePercentage: expect.any(Number),
        },
      });
    });
  });
});
