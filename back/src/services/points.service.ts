import { db } from '../db';

export const POINTS_CONFIG = {
  alimentacaoPositiva: 10,
  alimentacaoNegativa: -10,
  exercicio: 5,
  projetoPessoalMetaBatida: 50,
} as const;

/**
 * Calcula pontos baseado no tipo de atividade e duração
 * Pontos são automáticos baseados na categoria:
 * - Refeição positiva: +10
 * - Refeição negativa: -10
 * - Exercício: +5
 * - Projeto pessoal: +50 se bater meta semanal
 */
export function calculateEntryPoints(
  activityTypeId: number,
  categoryId: number,
  durationMinutes?: number
): number {
  // Para projeto pessoal, os pontos são calculados semanalmente
  // aqui retornamos 0 pois o cálculo é feito no service de projetos
  if (categoryId === 3) {
    return 0;
  }

  // Exercício sempre dá pontos (categoria 2)
  if (categoryId === 2) {
    return POINTS_CONFIG.exercicio;
  }

  // Para refeição, o is_positive do activity_type determina
  if (categoryId === 1) {
    // Os pontos são definidos no base_points do activity_type
    // Activity types de refeição têm base_points = 10 ou -10
    return 0; // Será buscado do activity_type
  }

  return 0;
}

/**
 * Calcula pontos de uma entrada específica baseado no activity_type
 */
export async function calculatePointsFromActivityType(
  activityTypeId: number
): Promise<number> {
  const stmt = db.prepare('SELECT base_points, category_id FROM activity_types WHERE id = ?');
  const activityType = stmt.get(activityTypeId) as { base_points: number; category_id: number } | undefined;
  
  if (!activityType) {
    return 0;
  }

  // Se for exercício, retorna pontos fixos
  if (activityType.category_id === 2) {
    return POINTS_CONFIG.exercicio;
  }

  // Para refeição, usa base_points (10 ou -10)
  return activityType.base_points;
}

/**
 * Calcula pontos do projeto pessoal baseado na meta semanal
 */
export async function calculateProjectWeeklyPoints(
  userId: number,
  projectId: number,
  weekNumber: number,
  year: number
): Promise<{ points: number; totalMinutes: number; goalMinutes: number; goalReached: boolean }> {
  // Busca meta do projeto
  const projectStmt = db.prepare('SELECT weekly_hours_goal FROM personal_projects WHERE id = ? AND user_id = ?');
  const project = projectStmt.get(projectId, userId) as { weekly_hours_goal: number } | undefined;
  
  if (!project) {
    return { points: 0, totalMinutes: 0, goalMinutes: 0, goalReached: false };
  }

  const goalMinutes = project.weekly_hours_goal * 60;

  // Soma minutos da semana
  const logStmt = db.prepare(`
    SELECT COALESCE(SUM(duration_minutes), 0) as total
    FROM project_daily_logs
    WHERE project_id = ? AND user_id = ? AND week_number = ? AND year = ?
  `);
  const result = logStmt.get(projectId, userId, weekNumber, year) as { total: number };
  const totalMinutes = result?.total ?? 0;

  const goalReached = totalMinutes >= goalMinutes;
  const points = goalReached ? POINTS_CONFIG.projetoPessoalMetaBatida : 0;

  return {
    points,
    totalMinutes,
    goalMinutes,
    goalReached,
  };
}

export async function getUserTotalPoints(userId: number): Promise<number> {
  // Soma pontos de entradas com activity_types validados
  const entriesStmt = db.prepare(`
    SELECT COALESCE(SUM(e.points), 0) as total
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND at.is_validated = TRUE
  `);
  const entriesResult = entriesStmt.get(userId) as { total: number };

  // Soma pontos de projetos pessoais (semanas completas)
  const projectsStmt = db.prepare(`
    SELECT DISTINCT project_id, week_number, year
    FROM project_daily_logs
    WHERE user_id = ?
  `);
  const projectLogs = projectsStmt.all(userId) as Array<{ project_id: number; week_number: number; year: number }>;

  let projectPoints = 0;
  const processedWeeks = new Set<string>();
  
  for (const log of projectLogs) {
    const weekKey = `${log.project_id}-${log.week_number}-${log.year}`;
    if (processedWeeks.has(weekKey)) continue;
    processedWeeks.add(weekKey);

    const result = await calculateProjectWeeklyPoints(userId, log.project_id, log.week_number, log.year);
    projectPoints += result.points;
  }

  return (entriesResult?.total ?? 0) + projectPoints;
}

export async function getUserEntriesCount(userId: number): Promise<number> {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND at.is_validated = TRUE
  `);
  const result = stmt.get(userId) as { count: number };
  return result?.count ?? 0;
}

/**
 * Recalcula pontos de todas as entradas de um usuário quando um activity_type é invalidado
 */
export async function recalculateUserPointsAfterInvalidation(activityTypeId: number): Promise<void> {
  // Zera pontos de entradas com este activity_type
  const stmt = db.prepare(`
    UPDATE user_entries
    SET points = 0
    WHERE activity_type_id = ?
  `);
  stmt.run(activityTypeId);
}
