import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { getTimelineEntries, getTimelineEntriesCount } from '../services/timeline.service';

describe('Timeline Service', () => {
  const testUserId = 101;
  const testUserId2 = 102;
  const testProjectIds: { [key: string]: number } = {};
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();

    // Cria usuários de teste
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser1', 'hash123']);
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId2, 'testuser2', 'hash123']);

    // Cria projetos pessoais de teste
    const projectResult1 = db.run('INSERT INTO personal_projects (user_id, name, description, weekly_hours_goal) VALUES (?, ?, ?, ?)',
      [testUserId, 'Projeto Teste 1', 'Descrição do projeto 1', 10]);
    testProjectIds.project1 = projectResult1.lastInsertRowid as number;

    const projectResult2 = db.run('INSERT INTO personal_projects (user_id, name, description, weekly_hours_goal) VALUES (?, ?, ?, ?)',
      [testUserId2, 'Projeto Teste 2', 'Descrição do projeto 2', 15]);
    testProjectIds.project2 = projectResult2.lastInsertRowid as number;
  });

  describe('getTimelineEntries', () => {
    test('deve retornar entradas de atividades ordenadas por data (mais recente primeiro)', async () => {
      // Cria entradas de atividade em datas diferentes usando seeds
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Atividade antiga', '2024-01-10']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Atividade recente', '2024-01-20']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Atividade média', '2024-01-15']);

      const entries = await getTimelineEntries(50, 0);

      expect(entries.length).toBe(3);
      expect(entries[0].description).toBe('Atividade recente');
      expect(entries[1].description).toBe('Atividade média');
      expect(entries[2].description).toBe('Atividade antiga');
    });

    test('deve retornar entradas de projetos pessoais', async () => {
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [testProjectIds.project1, testUserId, '2024-01-15', 60, 3, 2024]);

      const entries = await getTimelineEntries(50, 0);

      expect(entries.length).toBe(1);
      expect(entries[0].entry_type).toBe('project');
      expect(entries[0].project_id).toBe(testProjectIds.project1);
      expect(entries[0].project_name).toBe('Projeto Teste 1');
      expect(entries[0].duration_minutes).toBe(60);
      expect(entries[0].description).toBe('Registro de tempo no projeto');
    });

    test('deve misturar atividades e projetos na ordenação', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Atividade 1', '2024-01-10']);

      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [testProjectIds.project1, testUserId, '2024-01-15', 60, 3, 2024]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Atividade 2', '2024-01-20']);

      const entries = await getTimelineEntries(50, 0);

      expect(entries.length).toBe(3);
      expect(entries[0].description).toBe('Atividade 2');
      expect(entries[0].entry_type).toBe('activity');
      expect(entries[1].description).toBe('Registro de tempo no projeto');
      expect(entries[1].entry_type).toBe('project');
      expect(entries[2].description).toBe('Atividade 1');
      expect(entries[2].entry_type).toBe('activity');
    });

    test('deve respeitar o limite de entradas retornadas', async () => {
      for (let i = 1; i <= 5; i++) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, `Atividade ${i}`, `2024-01-${10 + i}`]);
      }

      const entries = await getTimelineEntries(3, 0);

      expect(entries.length).toBe(3);
      expect(entries[0].description).toBe('Atividade 5');
      expect(entries[1].description).toBe('Atividade 4');
      expect(entries[2].description).toBe('Atividade 3');
    });

    test('deve respeitar o offset para paginação', async () => {
      for (let i = 1; i <= 5; i++) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, `Atividade ${i}`, `2024-01-${10 + i}`]);
      }

      const entriesPage1 = await getTimelineEntries(2, 0);
      const entriesPage2 = await getTimelineEntries(2, 2);

      expect(entriesPage1.length).toBe(2);
      expect(entriesPage2.length).toBe(2);
      expect(entriesPage1[0].description).toBe('Atividade 5');
      expect(entriesPage1[1].description).toBe('Atividade 4');
      expect(entriesPage2[0].description).toBe('Atividade 3');
      expect(entriesPage2[1].description).toBe('Atividade 2');
    });

    test('deve filtrar por últimos X dias quando days for informado', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const oldDate = '2024-01-01';

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Hoje', today]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Ontem', yesterday]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Antigo', oldDate]);

      const entries = await getTimelineEntries(50, 0, 2);

      expect(entries.length).toBeLessThanOrEqual(2);
      entries.forEach(entry => {
        expect(entry.entry_date).not.toBe(oldDate);
      });
    });

    test('deve excluir entradas invalidadas (is_invalidated = 1)', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, is_invalidated)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada válida', '2024-01-15', 0]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, is_invalidated)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada invalidada', '2024-01-15', 1]);

      const entries = await getTimelineEntries(50, 0);

      expect(entries.length).toBe(1);
      expect(entries[0].description).toBe('Entrada válida');
      expect(entries[0].is_invalidated).toBe(0);
    });

    test('deve excluir entradas de usuários deletados', async () => {
      const deletedUserId = 9996;
      db.run('INSERT INTO users (id, username, password_hash, deleted_at) VALUES (?, ?, ?, ?)',
        [deletedUserId, 'user_deleted_test', 'hash123', new Date().toISOString()]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [deletedUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada de usuário deletado', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada válida', '2024-01-15']);

      const entries = await getTimelineEntries(50, 0);

      expect(entries.length).toBe(1);
      expect(entries[0].description).toBe('Entrada válida');
    });

    test('deve retornar campos null corretos para atividades', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste', '2024-01-15']);

      const entries = await getTimelineEntries(50, 0);

      expect(entries[0].entry_type).toBe('activity');
      expect(entries[0].project_id).toBeNull();
      expect(entries[0].project_name).toBeNull();
      expect(entries[0].week_number).toBeNull();
      expect(entries[0].year).toBeNull();
      expect(entries[0].activity_type_id).toBe(SEED_IDS.activityTypes.alimentacaoLimpa);
      expect(entries[0].activity_type_name).toBe('Alimentação Limpa');
    });

    test('deve retornar campos null corretos para projetos', async () => {
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [testProjectIds.project1, testUserId, '2024-01-15', 60, 3, 2024]);

      const entries = await getTimelineEntries(50, 0);

      expect(entries[0].entry_type).toBe('project');
      expect(entries[0].activity_type_id).toBeNull();
      expect(entries[0].activity_type_name).toBeNull();
      expect(entries[0].category_id).toBeNull();
      expect(entries[0].category_name).toBeNull();
      expect(entries[0].photo_url).toBeNull();
      expect(entries[0].points).toBe(0);
      expect(entries[0].week_number).toBe(3);
      expect(entries[0].year).toBe(2024);
    });

    test('deve retornar entrada vazia quando não houver dados', async () => {
      resetTestData();

      const entries = await getTimelineEntries(50, 0);
      expect(entries.length).toBe(0);
    });

    test('deve normalizar created_at para UTC', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste', '2024-01-15']);

      const entries = await getTimelineEntries(50, 0);

      expect(entries[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('getTimelineEntriesCount', () => {
    test('deve contar todas as entradas disponíveis', async () => {
      for (let i = 1; i <= 3; i++) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, `Atividade ${i}`, `2024-01-${10 + i}`]);
      }

      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [testProjectIds.project1, testUserId, '2024-01-15', 60, 3, 2024]);

      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [testProjectIds.project1, testUserId, '2024-01-16', 90, 3, 2024]);

      const count = await getTimelineEntriesCount();

      expect(count).toBe(5);
    });

    test('deve filtrar contagem por últimos X dias', async () => {
      const today = new Date().toISOString().split('T')[0];
      const oldDate = '2024-01-01';

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Recente', today]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Antigo', oldDate]);

      const count = await getTimelineEntriesCount(7);

      expect(count).toBe(1);
    });

    test('deve excluir entradas invalidadas da contagem', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, is_invalidated)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Válida', '2024-01-15', 0]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date, is_invalidated)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Invalidada', '2024-01-15', 1]);

      const count = await getTimelineEntriesCount();

      expect(count).toBe(1);
    });

    test('deve excluir entradas de usuários deletados da contagem', async () => {
      const deletedUserId = 9995;
      db.run('INSERT INTO users (id, username, password_hash, deleted_at) VALUES (?, ?, ?, ?)',
        [deletedUserId, 'user_deleted_count_test', 'hash123', new Date().toISOString()]);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [deletedUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada deletada', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada válida', '2024-01-15']);

      const count = await getTimelineEntriesCount();

      expect(count).toBe(1);
    });

    test('deve retornar 0 quando não houver entradas', async () => {
      resetTestData();

      const count = await getTimelineEntriesCount();
      expect(count).toBe(0);
    });
  });
});
