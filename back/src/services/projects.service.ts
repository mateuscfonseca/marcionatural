import { getDb } from '../db-provider';

export interface PersonalProject {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  weekly_hours_goal: number;
  is_active: boolean;
  created_at: string;
}

export interface ProjectDailyLog {
  id: number;
  project_id: number;
  user_id: number;
  date: string;
  duration_minutes: number;
  week_number: number;
  year: number;
  created_at: string;
}

export interface WeeklyProgress {
  weekNumber: number;
  year: number;
  totalMinutes: number;
  goalMinutes: number;
  goalReached: boolean;
  percentage: number;
  dailyLogs: ProjectDailyLog[];
}

export interface ProjectWithProgress extends PersonalProject {
  totalMinutes: number;
  goalMinutes: number;
  goalReached: boolean;
  percentage: number;
  weekNumber: number;
  year: number;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

/**
 * Converte array de projetos para formato UTC ISO 8601
 */
function normalizeProjects(projects: PersonalProject[]): PersonalProject[] {
  return projects.map(p => ({
    ...p,
    created_at: toUTCDate(p.created_at)!,
  }));
}

/**
 * Converte array de logs para formato UTC ISO 8601
 */
function normalizeLogs(logs: ProjectDailyLog[]): ProjectDailyLog[] {
  return logs.map(log => ({
    ...log,
    created_at: toUTCDate(log.created_at)!,
  }));
}

export async function getProjectsByUser(userId: number): Promise<PersonalProject[]> {
  const stmt = getDb().prepare(`
    SELECT * FROM personal_projects
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  const projects = stmt.all(userId) as PersonalProject[];
  return normalizeProjects(projects);
}

export async function getProjectById(id: number, userId: number): Promise<PersonalProject | undefined> {
  const stmt = getDb().prepare('SELECT * FROM personal_projects WHERE id = ? AND user_id = ?');
  const project = stmt.get(id, userId) as PersonalProject | undefined;
  if (!project) return undefined;
  return {
    ...project,
    created_at: toUTCDate(project.created_at)!,
  };
}

export async function createProject(
  userId: number,
  name: string,
  description: string,
  weeklyHoursGoal: number
): Promise<PersonalProject> {
  const stmt = getDb().prepare(`
    INSERT INTO personal_projects (user_id, name, description, weekly_hours_goal)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(userId, name, description, weeklyHoursGoal);

  return {
    id: result.lastInsertRowid as number,
    user_id: userId,
    name,
    description,
    weekly_hours_goal: weeklyHoursGoal,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

export async function updateProject(
  id: number,
  userId: number,
  name?: string,
  description?: string,
  weeklyHoursGoal?: number,
  isActive?: boolean
): Promise<PersonalProject | undefined> {
  const updates: string[] = [];
  const values: (string | number | boolean)[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (weeklyHoursGoal !== undefined) {
    updates.push('weekly_hours_goal = ?');
    values.push(weeklyHoursGoal);
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(isActive);
  }

  if (updates.length === 0) {
    return getProjectById(id, userId);
  }

  values.push(id, userId);
  const stmt = getDb().prepare(`
    UPDATE personal_projects
    SET ${updates.join(', ')}
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(...values);

  return getProjectById(id, userId);
}

export async function deleteProject(id: number, userId: number): Promise<boolean> {
  const stmt = getDb().prepare('DELETE FROM personal_projects WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Obtém o número da semana ISO de uma data
 */
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  // Ano da semana ISO pode ser diferente do ano civil
  const isoYear = d.getUTCFullYear();
  
  return { week: weekNum, year: isoYear };
}

/**
 * Registra tempo diário em um projeto pessoal
 */
export async function logProjectTime(
  userId: number,
  projectId: number,
  durationMinutes: number,
  date?: string
): Promise<ProjectDailyLog> {
  const logDate = date ? new Date(date) : new Date();
  const dateStr = String(logDate.toISOString().split('T')[0]);
  const { week, year } = getWeekNumber(logDate);

  // Verifica se já existe registro para este dia
  const existingStmt = getDb().prepare(`
    SELECT * FROM project_daily_logs
    WHERE project_id = ? AND user_id = ? AND date = ?
  `);
  const existing = existingStmt.get(projectId, userId, dateStr) as ProjectDailyLog | undefined;

  if (existing) {
    // Atualiza registro existente (soma minutos)
    const updateStmt = getDb().prepare(`
      UPDATE project_daily_logs
      SET duration_minutes = duration_minutes + ?, week_number = ?, year = ?
      WHERE id = ?
    `);
    updateStmt.run(durationMinutes, week, year, existing.id);
    return {
      ...existing,
      duration_minutes: existing.duration_minutes + durationMinutes,
      week_number: week,
      year,
    };
  }

  // Cria novo registro
  const stmt = getDb().prepare(`
    INSERT INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(projectId, userId, dateStr, durationMinutes, week, year);

  return {
    id: result.lastInsertRowid as number,
    project_id: projectId,
    user_id: userId,
    date: dateStr,
    duration_minutes: durationMinutes,
    week_number: week,
    year,
    created_at: new Date().toISOString(),
  };
}

/**
 * Obtém logs diários de um projeto para uma semana específica
 */
export async function getWeeklyProgress(
  userId: number,
  projectId: number,
  weekNumber: number,
  year: number
): Promise<WeeklyProgress> {
  // Busca meta do projeto
  const projectStmt = getDb().prepare('SELECT weekly_hours_goal FROM personal_projects WHERE id = ? AND user_id = ?');
  const project = projectStmt.get(projectId, userId) as { weekly_hours_goal: number } | undefined;

  if (!project) {
    throw new Error('Projeto não encontrado');
  }

  const goalMinutes = project.weekly_hours_goal * 60;

  // Busca logs da semana
  const logsStmt = getDb().prepare(`
    SELECT * FROM project_daily_logs
    WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
    ORDER BY date DESC
  `);
  const logs = logsStmt.all(projectId, userId, weekNumber, year) as ProjectDailyLog[];

  const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
  const goalReached = totalMinutes >= goalMinutes;
  const percentage = Math.min(100, (totalMinutes / goalMinutes) * 100);

  return {
    weekNumber,
    year,
    totalMinutes,
    goalMinutes,
    goalReached,
    percentage,
    dailyLogs: normalizeLogs(logs),
  };
}

/**
 * Obtém progresso da semana atual
 */
export async function getCurrentWeekProgress(
  userId: number,
  projectId: number
): Promise<WeeklyProgress> {
  const { week, year } = getWeekNumber(new Date());
  return getWeeklyProgress(userId, projectId, week, year);
}

/**
 * Calcula pontos de todas as semanas de um projeto
 */
export async function getProjectTotalPoints(userId: number, projectId: number): Promise<number> {
  const { calculateProjectWeeklyPoints } = await import('./points.service');

  // Busca todas as semanas únicas com logs
  const stmt = getDb().prepare(`
    SELECT DISTINCT week_number, year
    FROM project_daily_logs
    WHERE project_id = ? AND user_id = ?
  `);
  const weeks = stmt.all(projectId, userId) as Array<{ week_number: number; year: number }>;

  let totalPoints = 0;
  const processedWeeks = new Set<string>();

  for (const week of weeks) {
    const key = `${week.year}-${week.week_number}`;
    if (processedWeeks.has(key)) continue;
    processedWeeks.add(key);

    const result = await calculateProjectWeeklyPoints(userId, projectId, week.week_number, week.year);
    totalPoints += result.points;
  }

  return totalPoints;
}

/**
 * Obtém projetos de um usuário com progresso da semana atual
 */
export async function getUserProjectsWithProgress(userId: number): Promise<ProjectWithProgress[]> {
  const { week, year } = getWeekNumber(new Date());

  // Busca projetos ativos do usuário
  const projectsStmt = getDb().prepare(`
    SELECT * FROM personal_projects
    WHERE user_id = ? AND is_active = 1
    ORDER BY created_at DESC
  `);
  const projects = projectsStmt.all(userId) as PersonalProject[];

  const projectsWithProgress: ProjectWithProgress[] = [];

  for (const project of projects) {
    // Busca logs da semana atual para este projeto
    const logsStmt = getDb().prepare(`
      SELECT SUM(duration_minutes) as totalMinutes
      FROM project_daily_logs
      WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
    `);
    const result = logsStmt.get(project.id, userId, week, year) as { totalMinutes: number } | undefined;

    const totalMinutes = result?.totalMinutes || 0;
    const goalMinutes = project.weekly_hours_goal * 60;
    const goalReached = totalMinutes >= goalMinutes;
    const percentage = Math.min(100, (totalMinutes / goalMinutes) * 100);

    projectsWithProgress.push({
      ...project,
      created_at: toUTCDate(project.created_at)!,
      totalMinutes,
      goalMinutes,
      goalReached,
      percentage,
      weekNumber: week,
      year,
    });
  }

  return projectsWithProgress;
}

/**
 * Obtém todos os projetos de um usuário com todos os logs históricos e resumos semanais
 * Usado para auditoria de semanas perfeitas
 */
export async function getUserProjectsWithAllLogs(userId: number): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  weeklyHoursGoal: number;
  logs: ProjectDailyLog[];
  weeklySummaries: Array<{
    weekNumber: number;
    year: number;
    totalMinutes: number;
    goalMinutes: number;
    goalReached: boolean;
  }>;
}>> {
  // Busca todos os projetos do usuário (ativos e inativos)
  const projectsStmt = getDb().prepare(`
    SELECT id, name, description, weekly_hours_goal
    FROM personal_projects
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  const projects = projectsStmt.all(userId) as Array<{
    id: number;
    name: string;
    description: string | null;
    weekly_hours_goal: number;
  }>;

  const result: Array<{
    id: number;
    name: string;
    description: string | null;
    weeklyHoursGoal: number;
    logs: ProjectDailyLog[];
    weeklySummaries: Array<{
      weekNumber: number;
      year: number;
      totalMinutes: number;
      goalMinutes: number;
      goalReached: boolean;
    }>;
  }> = [];

  for (const project of projects) {
    // Busca todos os logs do projeto
    const logsStmt = getDb().prepare(`
      SELECT id, project_id, user_id, date, duration_minutes, week_number, year, created_at
      FROM project_daily_logs
      WHERE project_id = ? AND user_id = ?
      ORDER BY date DESC
    `);
    const logs = logsStmt.all(project.id, userId) as ProjectDailyLog[];

    // Busca resumos semanais únicos
    const weeksStmt = getDb().prepare(`
      SELECT DISTINCT week_number, year
      FROM project_daily_logs
      WHERE project_id = ? AND user_id = ?
      ORDER BY year DESC, week_number DESC
    `);
    const weeks = weeksStmt.all(project.id, userId) as Array<{ week_number: number; year: number }>;

    const weeklySummaries: Array<{
      weekNumber: number;
      year: number;
      totalMinutes: number;
      goalMinutes: number;
      goalReached: boolean;
    }> = [];

    const goalMinutes = project.weekly_hours_goal * 60;

    for (const week of weeks) {
      // Soma minutos da semana
      const sumStmt = getDb().prepare(`
        SELECT COALESCE(SUM(duration_minutes), 0) as total
        FROM project_daily_logs
        WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
      `);
      const sumResult = sumStmt.get(project.id, userId, week.week_number, week.year) as { total: number };
      const totalMinutes = sumResult?.total ?? 0;
      const goalReached = totalMinutes >= goalMinutes;

      weeklySummaries.push({
        weekNumber: week.week_number,
        year: week.year,
        totalMinutes,
        goalMinutes,
        goalReached,
      });
    }

    result.push({
      id: project.id,
      name: project.name,
      description: project.description,
      weeklyHoursGoal: project.weekly_hours_goal,
      logs: normalizeLogs(logs),
      weeklySummaries,
    });
  }

  return result;
}

/**
 * Obtém projetos de um usuário com logs de uma semana ISO específica
 * Usado para auditoria de semanas perfeitas
 */
export async function getProjectsByWeek(
  userId: number,
  weekNumber: number,
  year: number
): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  weeklyHoursGoal: number;
  logs: ProjectDailyLog[];
  weeklySummaries: Array<{
    weekNumber: number;
    year: number;
    totalMinutes: number;
    goalMinutes: number;
    goalReached: boolean;
  }>;
}>> {
  // Busca todos os projetos do usuário (ativos e inativos)
  const projectsStmt = getDb().prepare(`
    SELECT id, name, description, weekly_hours_goal
    FROM personal_projects
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  const projects = projectsStmt.all(userId) as Array<{
    id: number;
    name: string;
    description: string | null;
    weekly_hours_goal: number;
  }>;

  const result: Array<{
    id: number;
    name: string;
    description: string | null;
    weeklyHoursGoal: number;
    logs: ProjectDailyLog[];
    weeklySummaries: Array<{
      weekNumber: number;
      year: number;
      totalMinutes: number;
      goalMinutes: number;
      goalReached: boolean;
    }>;
  }> = [];

  for (const project of projects) {
    // Busca logs da semana específica
    const logsStmt = getDb().prepare(`
      SELECT id, project_id, user_id, date, duration_minutes, week_number, year, created_at
      FROM project_daily_logs
      WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
      ORDER BY date DESC
    `);
    const logs = logsStmt.all(project.id, userId, weekNumber, year) as ProjectDailyLog[];

    // Busca resumo da semana específica
    const sumStmt = getDb().prepare(`
      SELECT COALESCE(SUM(duration_minutes), 0) as total
      FROM project_daily_logs
      WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
    `);
    const sumResult = sumStmt.get(project.id, userId, weekNumber, year) as { total: number };
    const totalMinutes = sumResult?.total ?? 0;
    const goalMinutes = project.weekly_hours_goal * 60;
    const goalReached = totalMinutes >= goalMinutes;

    const weeklySummaries = [{
      weekNumber,
      year,
      totalMinutes,
      goalMinutes,
      goalReached,
    }];

    result.push({
      id: project.id,
      name: project.name,
      description: project.description,
      weeklyHoursGoal: project.weekly_hours_goal,
      logs: normalizeLogs(logs),
      weeklySummaries,
    });
  }

  return result;
}
