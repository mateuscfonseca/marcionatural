import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData } from '../test-db';
import {
  getProjectsByUser,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  logProjectTime,
  getWeeklyProgress,
  getCurrentWeekProgress,
  getUserProjectsWithProgress,
} from '../services/projects.service';

describe('Projects Service', () => {
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

  test('deve criar projeto', async () => {
    const project = await createProject(testUserId, 'Projeto Teste', 'Descrição', 10);
    expect(project.id).toBeDefined();
    expect(project.name).toBe('Projeto Teste');
    expect(project.weekly_hours_goal).toBe(10);
  });

  test('deve buscar projetos por usuário', async () => {
    await createProject(testUserId, 'Projeto 1', 'Desc', 5);
    const projects = await getProjectsByUser(testUserId);
    expect(projects.length).toBeGreaterThan(0);
  });

  test('deve buscar projeto por ID', async () => {
    const created = await createProject(testUserId, 'Projeto ID', 'Desc', 5);
    const project = await getProjectById(created.id, testUserId);
    expect(project).toBeDefined();
    expect(project?.id).toBe(created.id);
  });

  test('deve retornar undefined para projeto inexistente', async () => {
    const project = await getProjectById(9999, testUserId);
    expect(project).toBeUndefined();
  });

  test('deve atualizar projeto', async () => {
    const created = await createProject(testUserId, 'Original', 'Desc', 5);
    const updated = await updateProject(created.id, testUserId, 'Atualizado', undefined, 15);
    expect(updated?.name).toBe('Atualizado');
    expect(updated?.weekly_hours_goal).toBe(15);
  });

  test('deve deletar projeto', async () => {
    const created = await createProject(testUserId, 'Para deletar', 'Desc', 5);
    const deleted = await deleteProject(created.id, testUserId);
    expect(deleted).toBe(true);
    const project = await getProjectById(created.id, testUserId);
    expect(project).toBeUndefined();
  });

  test('deve registrar tempo no projeto', async () => {
    const project = await createProject(testUserId, 'Projeto Tempo', 'Desc', 10);
    const log = await logProjectTime(testUserId, project.id, 60, '2024-01-15');
    expect(log.id).toBeDefined();
    expect(log.duration_minutes).toBe(60);
    expect(log.date).toBe('2024-01-15');
  });

  test('deve somar tempo ao registrar mesmo dia', async () => {
    const project = await createProject(testUserId, 'Projeto Soma', 'Desc', 10);
    await logProjectTime(testUserId, project.id, 60, '2024-01-15');
    const log2 = await logProjectTime(testUserId, project.id, 30, '2024-01-15');
    expect(log2.duration_minutes).toBe(90); // 60 + 30
  });

  test('deve buscar progresso semanal', async () => {
    const project = await createProject(testUserId, 'Projeto Progresso', 'Desc', 10);
    await logProjectTime(testUserId, project.id, 120, '2024-01-15');
    
    // Semana 3 de 2024
    const progress = await getWeeklyProgress(testUserId, project.id, 3, 2024);
    expect(progress.totalMinutes).toBe(120);
    expect(progress.goalMinutes).toBe(600); // 10 horas * 60
  });

  test('deve indicar meta atingida', async () => {
    const project = await createProject(testUserId, 'Projeto Meta', 'Desc', 1); // 1 hora = 60 min
    await logProjectTime(testUserId, project.id, 60, '2024-01-15');
    
    const progress = await getWeeklyProgress(testUserId, project.id, 3, 2024);
    expect(progress.goalReached).toBe(true);
    expect(progress.percentage).toBe(100);
  });

  test('deve retornar projetos com progresso atual', async () => {
    await createProject(testUserId, 'Projeto Atual', 'Desc', 5);
    const projects = await getUserProjectsWithProgress(testUserId);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].totalMinutes).toBeDefined();
    expect(projects[0].goalMinutes).toBeDefined();
  });

  test('deve calcular semana ISO corretamente', async () => {
    const project = await createProject(testUserId, 'Semana ISO', 'Desc', 5);
    const log = await logProjectTime(testUserId, project.id, 30);
    expect(log.week_number).toBeDefined();
    expect(log.year).toBeDefined();
  });
});
