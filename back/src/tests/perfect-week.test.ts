import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { 
  calculatePerfectWeekBonus, 
  getUserTotalPoints,
  calculateProjectWeeklyPoints,
  getPerfectWeeksByUser
} from '../services/points.service';
import { CategoryId } from '../utils/category.enum';

describe('Semana Perfeita', () => {
  const testUserId = 201;
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
    // Cria usuário de teste
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser_perfect_week', 'hash123']);
  });

  /**
   * Teste: Semana perfeita completa
   * - 7 dias com exercício
   * - Sem alimentação suja
   * - Sem entorpecentes
   * - Projeto com meta batida
   */
  describe('calculatePerfectWeekBonus - Semana Perfeita Completa', () => {
    test('deve retornar 75 pontos para semana perfeita completa', async () => {
      // Semana 10 de 2025: 03/03 a 09/03 (segunda a domingo)
      const weekNumber = 10;
      const year = 2025;

      // Cria projeto pessoal com meta de 10 horas semanais
      const projectId = 1001;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Teste', 10, true]);

      // Registra exercícios em todos os 7 dias da semana
      const weekDays = [
        '2025-03-03', // Segunda
        '2025-03-04', // Terça
        '2025-03-05', // Quarta
        '2025-03-06', // Quinta
        '2025-03-07', // Sexta
        '2025-03-08', // Sábado
        '2025-03-09', // Domingo
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício diário', day]);
      }

      // Registra alimentação limpa em alguns dias (sem alimentação suja)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço saudável', '2025-03-03']);

      // Registra tempo no projeto (12 horas = 720 minutos, meta = 10h = 600min)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 200, weekNumber, year]);

      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-04', 200, weekNumber, year]);

      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-05', 320, weekNumber, year]);

      const result = await calculatePerfectWeekBonus(testUserId, weekNumber, year);

      expect(result.points).toBe(75);
      expect(result.hasExerciseEveryDay).toBe(true);
      expect(result.noNegativePoints).toBe(true);
      expect(result.projectGoalReached).toBe(true);
    });
  });

  /**
   * Teste: Falha por dia sem exercício
   */
  describe('calculatePerfectWeekBonus - Falha por Exercício', () => {
    test('deve retornar 0 pontos se um dia não tiver exercício', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1002;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Teste 2', 10, true]);

      // Registra exercícios em apenas 6 dias (falta quarta-feira)
      const weekDaysWithExercise = [
        '2025-03-03', // Segunda - tem exercício
        '2025-03-04', // Terça - tem exercício
        // '2025-03-05', // Quarta - SEM exercício ❌
        '2025-03-06', // Quinta - tem exercício
        '2025-03-07', // Sexta - tem exercício
        '2025-03-08', // Sábado - tem exercício
        '2025-03-09', // Domingo - tem exercício
      ];

      for (const day of weekDaysWithExercise) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra tempo no projeto (meta batida)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 700, weekNumber, year]);

      const result = await calculatePerfectWeekBonus(testUserId, weekNumber, year);

      expect(result.points).toBe(0);
      expect(result.hasExerciseEveryDay).toBe(false);
      expect(result.noNegativePoints).toBe(true);
      expect(result.projectGoalReached).toBe(true);
    });
  });

  /**
   * Teste: Falha por alimentação suja
   */
  describe('calculatePerfectWeekBonus - Falha por Alimentação Suja', () => {
    test('deve retornar 0 pontos se tiver alimentação suja em qualquer dia', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1003;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Teste 3', 10, true]);

      // Registra exercícios em todos os dias
      const weekDays = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09',
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra alimentação suja na sexta-feira ❌
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoSuja, 'Fast food', '2025-03-07']);

      // Registra tempo no projeto (meta batida)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 700, weekNumber, year]);

      const result = await calculatePerfectWeekBonus(testUserId, weekNumber, year);

      expect(result.points).toBe(0);
      expect(result.hasExerciseEveryDay).toBe(true);
      expect(result.noNegativePoints).toBe(false);
      expect(result.projectGoalReached).toBe(true);
    });
  });

  /**
   * Teste: Falha por entorpecentes
   */
  describe('calculatePerfectWeekBonus - Falha por Entorpecentes', () => {
    test('deve retornar 0 pontos se tiver uso de entorpecentes', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1004;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Teste 4', 10, true]);

      // Registra exercícios em todos os dias
      const weekDays = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09',
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra uso de tabaco na terça-feira ❌
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Usou tabaco', '2025-03-04']);

      // Registra tempo no projeto (meta batida)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 700, weekNumber, year]);

      const result = await calculatePerfectWeekBonus(testUserId, weekNumber, year);

      expect(result.points).toBe(0);
      expect(result.hasExerciseEveryDay).toBe(true);
      expect(result.noNegativePoints).toBe(false);
      expect(result.projectGoalReached).toBe(true);
    });
  });

  /**
   * Teste: Falha por projeto sem meta batida
   */
  describe('calculatePerfectWeekBonus - Falha por Projeto Sem Meta', () => {
    test('deve retornar 0 pontos se projeto não bater meta', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1005;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Teste 5', 10, true]); // Meta: 10h = 600min

      // Registra exercícios em todos os dias
      const weekDays = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09',
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra tempo no projeto (apenas 5h = 300min, meta = 10h = 600min) ❌
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 300, weekNumber, year]);

      const result = await calculatePerfectWeekBonus(testUserId, weekNumber, year);

      expect(result.points).toBe(0);
      expect(result.hasExerciseEveryDay).toBe(true);
      expect(result.noNegativePoints).toBe(true);
      expect(result.projectGoalReached).toBe(false);
    });
  });

  /**
   * Teste: Múltiplos projetos - um bate meta, outro não
   */
  describe('calculatePerfectWeekBonus - Múltiplos Projetos', () => {
    test('deve retornar 75 pontos se pelo menos 1 projeto bater meta', async () => {
      const weekNumber = 10;
      const year = 2025;

      // Projeto 1: NÃO bate meta
      const projectId1 = 1006;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId1, testUserId, 'Projeto Falho', 10, true]); // Meta: 10h

      // Projeto 2: BATE meta
      const projectId2 = 1007;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId2, testUserId, 'Projeto Sucesso', 5, true]); // Meta: 5h = 300min

      // Registra exercícios em todos os dias
      const weekDays = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09',
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Projeto 1: 200min (não bate meta de 600min)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId1, testUserId, '2025-03-03', 200, weekNumber, year]);

      // Projeto 2: 400min (bate meta de 300min) ✅
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId2, testUserId, '2025-03-04', 400, weekNumber, year]);

      const result = await calculatePerfectWeekBonus(testUserId, weekNumber, year);

      expect(result.points).toBe(75);
      expect(result.hasExerciseEveryDay).toBe(true);
      expect(result.noNegativePoints).toBe(true);
      expect(result.projectGoalReached).toBe(true);
    });
  });

  /**
   * Teste: Integração com getUserTotalPoints
   */
  describe('getUserTotalPoints - Integração com Semana Perfeita', () => {
    test('deve somar bônus de semana perfeita ao total de pontos', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1008;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Total', 10, true]);

      // Registra exercícios em todos os 7 dias (5 pontos cada = 35 pontos)
      const weekDays = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09',
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra alimentação limpa em 3 dias (10 pontos cada, teto = 10/dia)
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2025-03-03']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2025-03-04']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2025-03-05']);

      // Registra tempo no projeto (meta batida = 50 pontos)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 700, weekNumber, year]);

      // Total esperado:
      // - Exercício: 7 dias × 5 = 35 pontos
      // - Alimentação: 3 dias × 10 = 30 pontos
      // - Projeto: 50 pontos
      // - Semana Perfeita: 75 pontos
      // Total: 190 pontos

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(190);
    });

    test('não deve somar bônus se semana não for perfeita', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1009;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Parcial', 10, true]);

      // Registra exercícios em apenas 5 dias (falta sábado e domingo)
      const weekDaysWithExercise = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07',
        // Sem exercício no sábado e domingo
      ];

      for (const day of weekDaysWithExercise) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra tempo no projeto (meta batida = 50 pontos)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 700, weekNumber, year]);

      // Total esperado:
      // - Exercício: 5 dias × 5 = 25 pontos
      // - Projeto: 50 pontos
      // - Semana Perfeita: 0 pontos (não teve exercício todos os dias)
      // Total: 75 pontos

      const totalPoints = await getUserTotalPoints(testUserId);
      expect(totalPoints).toBe(75);
    });
  });

  /**
   * Teste: getPerfectWeeksByUser
   */
  describe('getPerfectWeeksByUser', () => {
    test('deve retornar lista de semanas perfeitas com total de bônus', async () => {
      const weekNumber = 10;
      const year = 2025;

      const projectId = 1010;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Teste Bonus', 10, true]);

      // Registra exercícios em todos os 7 dias
      const weekDays = [
        '2025-03-03', '2025-03-04', '2025-03-05',
        '2025-03-06', '2025-03-07', '2025-03-08', '2025-03-09',
      ];

      for (const day of weekDays) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra tempo no projeto (meta batida)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-03', 700, weekNumber, year]);

      const result = await getPerfectWeeksByUser(testUserId);

      expect(result.perfectWeeks).toHaveLength(1);
      expect(result.perfectWeeks[0]).toMatchObject({
        weekNumber: 10,
        year: 2025,
        points: 75,
        startDate: '2025-03-03',
        endDate: '2025-03-09',
      });
      expect(result.totalBonusPoints).toBe(75);
    });

    test('deve retornar lista vazia se não houver semanas perfeitas', async () => {
      const weekNumber = 11;
      const year = 2025;

      const projectId = 1011;
      db.run(`
        INSERT INTO personal_projects (id, user_id, name, weekly_hours_goal, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, testUserId, 'Projeto Sem Bonus', 10, true]);

      // Registra exercícios em apenas 5 dias (não é semana perfeita)
      const weekDaysWithExercise = [
        '2025-03-10', '2025-03-11', '2025-03-12',
        '2025-03-13', '2025-03-14',
        // Sem exercício no sábado e domingo
      ];

      for (const day of weekDaysWithExercise) {
        db.run(`
          INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
          VALUES (?, ?, ?, ?)
        `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Exercício', day]);
      }

      // Registra tempo no projeto (meta batida)
      db.run(`
        INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, testUserId, '2025-03-10', 700, weekNumber, year]);

      const result = await getPerfectWeeksByUser(testUserId);

      expect(result.perfectWeeks).toHaveLength(0);
      expect(result.totalBonusPoints).toBe(0);
    });
  });
});
