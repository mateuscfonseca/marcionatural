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

/**
 * Calcula pontos diários de alimentação com limite de 10 pontos por dia
 * Retorna o total de pontos de alimentação para um determinado dia (máximo 10, mínimo -10)
 */
export async function getDailyFoodPoints(userId: number, date: string): Promise<{
  points: number;
  rawPoints: number;
  capped: boolean;
}> {
  // Usa DATE() para extrair apenas a parte da data, ignorando hora
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(e.points), 0) as total
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND DATE(e.entry_date) = DATE(?) AND at.category_id = 1 AND at.is_validated = TRUE
  `);
  const result = stmt.get(userId, date) as { total: number };
  const rawPoints = result?.total ?? 0;
  
  // Aplica limite de 10 pontos (positivos ou negativos)
  let points = rawPoints;
  let capped = false;
  
  if (rawPoints > 10) {
    points = 10;
    capped = true;
  } else if (rawPoints < -10) {
    points = -10;
    capped = true;
  }
  
  return {
    points,
    rawPoints,
    capped,
  };
}

/**
 * Calcula pontos totais de um usuário considerando limite diário de alimentação
 * - Alimentação: máximo 10 pontos por dia (positivos ou negativos)
 * - Exercícios: 5 pontos por entrada (ilimitados por dia)
 * - Projetos pessoais: 50 pontos por semana com meta batida
 */
export async function getUserTotalPoints(userId: number): Promise<number> {
  // Busca todas as datas únicas com entradas de alimentação (usando DATE() para extrair apenas a data)
  const foodDatesStmt = db.prepare(`
    SELECT DISTINCT DATE(e.entry_date) as entry_date
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND e.entry_date IS NOT NULL AND at.category_id = 1 AND at.is_validated = TRUE
  `);
  const foodDates = foodDatesStmt.all(userId) as Array<{ entry_date: string }>;
  
  let totalFoodPoints = 0;
  const processedDates = new Set<string>();
  
  // Calcula pontos de alimentação por dia com limite de 10
  for (const dateRow of foodDates) {
    const date = dateRow.entry_date;
    if (!date || processedDates.has(date)) continue;
    processedDates.add(date);
    
    const dailyPoints = await getDailyFoodPoints(userId, date);
    totalFoodPoints += dailyPoints.points;
  }
  
  // Soma pontos de exercícios (categoria 2) - sem limite diário
  const exerciseStmt = db.prepare(`
    SELECT COALESCE(SUM(e.points), 0) as total
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND at.category_id = 2 AND at.is_validated = TRUE
  `);
  const exerciseResult = exerciseStmt.get(userId) as { total: number };
  const exercisePoints = exerciseResult?.total ?? 0;
  
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
  
  return totalFoodPoints + exercisePoints + projectPoints;
}
