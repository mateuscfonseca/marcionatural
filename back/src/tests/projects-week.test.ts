import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData } from '../test-db';
import { getProjectsByWeek } from '../services/projects.service';

describe('getProjectsByWeek', () => {
  let db: ReturnType<typeof getTestDb>;
  const testUserId = 302;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [testUserId, 'testuser_projects_week', 'hash']);
  });

  test('deve buscar projetos com logs de uma semana específica', async () => {
    // Cria projeto com meta de 2h = 120min
    const projectResult = db.run(`
      INSERT INTO personal_projects (user_id, name, description, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [testUserId, 'Projeto Semana 10', 'Descrição', 2, true]);

    const projectId = projectResult.lastInsertRowid as number;

    // Registra logs na semana 10 de 2025
    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-03', 60, 10, 2025]);

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-04', 90, 10, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Projeto Semana 10');
    expect(result[0].logs).toHaveLength(2);
    expect(result[0].weeklySummaries).toHaveLength(1);
  });

  test('deve retornar resumo correto da semana', async () => {
    // Meta: 2h = 120min
    const projectResult = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto Meta', 2, true]);

    const projectId = projectResult.lastInsertRowid as number;

    // Total: 150min (meta batida)
    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-03', 60, 10, 2025]);

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-04', 90, 10, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);
    const summary = result[0].weeklySummaries[0];

    expect(summary.weekNumber).toBe(10);
    expect(summary.year).toBe(2025);
    expect(summary.totalMinutes).toBe(150);
    expect(summary.goalMinutes).toBe(120);
    expect(summary.goalReached).toBe(true);
  });

  test('deve retornar goalReached=false quando meta não for batida', async () => {
    // Meta: 5h = 300min
    const projectResult = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto Sem Meta', 5, true]);

    const projectId = projectResult.lastInsertRowid as number;

    // Total: 100min (meta não batida)
    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-03', 100, 10, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);
    const summary = result[0].weeklySummaries[0];

    expect(summary.totalMinutes).toBe(100);
    expect(summary.goalMinutes).toBe(300);
    expect(summary.goalReached).toBe(false);
  });

  test('deve retornar lista vazia para usuário sem projetos', async () => {
    const result = await getProjectsByWeek(testUserId, 10, 2025);
    expect(result).toHaveLength(0);
  });

  test('deve retornar projetos sem logs quando não houver registros na semana', async () => {
    // Cria projeto
    db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto Sem Logs', 3, true]);

    // Registra logs em semana diferente (semana 9)
    const projectResult = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto Semana 9', 3, true]);

    const projectId = projectResult.lastInsertRowid as number;

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-02-24', 60, 9, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);

    // Deve retornar todos os projetos, mas apenas com logs da semana 10
    expect(result.length).toBeGreaterThan(0);
    
    const projectSemLogs = result.find(p => p.name === 'Projeto Sem Logs');
    expect(projectSemLogs).toBeDefined();
    expect(projectSemLogs!.logs).toHaveLength(0);
    expect(projectSemLogs!.weeklySummaries[0].totalMinutes).toBe(0);
  });

  test('deve incluir projetos inativos', async () => {
    // Cria projeto inativo
    const projectResult = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto Inativo', 2, false]);

    const projectId = projectResult.lastInsertRowid as number;

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-03', 45, 10, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);

    expect(result.some(p => p.name === 'Projeto Inativo')).toBe(true);
  });

  test('deve ordenar logs por data descendente', async () => {
    const projectResult = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Ordenação', 5, true]);

    const projectId = projectResult.lastInsertRowid as number;

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-03', 30, 10, 2025]);

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-05', 45, 10, 2025]);

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, testUserId, '2025-03-04', 60, 10, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);
    const logs = result[0].logs;

    expect(logs[0].date).toBe('2025-03-05');
    expect(logs[1].date).toBe('2025-03-04');
    expect(logs[2].date).toBe('2025-03-03');
  });

  test('deve retornar múltiplos projetos com logs da mesma semana', async () => {
    // Cria dois projetos
    const project1Result = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto A', 2, true]);

    const project2Result = db.run(`
      INSERT INTO personal_projects (user_id, name, weekly_hours_goal, is_active)
      VALUES (?, ?, ?, ?)
    `, [testUserId, 'Projeto B', 3, true]);

    const projectId1 = project1Result.lastInsertRowid as number;
    const projectId2 = project2Result.lastInsertRowid as number;

    // Registra logs em ambos os projetos na semana 10
    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId1, testUserId, '2025-03-03', 60, 10, 2025]);

    db.run(`
      INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId2, testUserId, '2025-03-03', 90, 10, 2025]);

    const result = await getProjectsByWeek(testUserId, 10, 2025);

    expect(result).toHaveLength(2);
    expect(result.find(p => p.name === 'Projeto A')?.logs.length).toBe(1);
    expect(result.find(p => p.name === 'Projeto B')?.logs.length).toBe(1);
  });
});
