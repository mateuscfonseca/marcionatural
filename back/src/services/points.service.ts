import { getDb } from '../db-provider';
import { CategoryId } from '../utils/category.enum';

export const POINTS_CONFIG = {
  alimentacaoPositiva: 10,
  alimentacaoNegativa: -10,
  exercicio: 5,
  entorpecentes: -5,
  projetoPessoalMetaBatida: 50,
} as const;

/**
 * Configuração de tetos diários por categoria
 * max: máximo de pontos que pode ganhar por dia
 * min: mínimo de pontos que pode perder por dia
 */
export const CATEGORY_DAILY_CAPS = {
  [CategoryId.REFEICAO]: { max: 10, min: -10 },
  [CategoryId.EXERCICIO]: { max: 5, min: 0 },
  [CategoryId.PROJETO_PESSOAL]: { max: 50, min: 0 }, // teto semanal, não diário
  [CategoryId.ENTORPECENTES]: { max: 0, min: -5 },
} as const;

/**
 * Calcula pontos baseado no tipo de atividade e duração
 * Pontos são automáticos baseados na categoria:
 * - Refeição positiva: +10
 * - Refeição negativa: -10
 * - Exercício: +5
 * - Entorpecentes: -5
 * - Projeto pessoal: +50 se bater meta semanal
 */
export function calculateEntryPoints(
  activityTypeId: number,
  categoryId: number,
  durationMinutes?: number
): number {
  // Para projeto pessoal, os pontos são calculados semanalmente
  // aqui retornamos 0 pois o cálculo é feito no service de projetos
  if (categoryId === CategoryId.PROJETO_PESSOAL) {
    return 0;
  }

  // Exercício sempre dá pontos (categoria 2)
  if (categoryId === CategoryId.EXERCICIO) {
    return POINTS_CONFIG.exercicio;
  }

  // Entorpecentes sempre dá pontos negativos (categoria 4)
  if (categoryId === CategoryId.ENTORPECENTES) {
    return POINTS_CONFIG.entorpecentes;
  }

  // Para refeição, o is_positive do activity_type determina
  if (categoryId === CategoryId.REFEICAO) {
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
  const stmt = getDb().prepare('SELECT base_points, category_id FROM activity_types WHERE id = ?');
  const activityType = stmt.get(activityTypeId) as { base_points: number; category_id: number } | undefined;

  if (!activityType) {
    return 0;
  }

  // Se for exercício, retorna pontos fixos
  if (activityType.category_id === CategoryId.EXERCICIO) {
    return POINTS_CONFIG.exercicio;
  }

  // Se for entorpecentes, retorna pontos fixos negativos
  if (activityType.category_id === CategoryId.ENTORPECENTES) {
    return POINTS_CONFIG.entorpecentes;
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
  const projectStmt = getDb().prepare('SELECT weekly_hours_goal FROM personal_projects WHERE id = ? AND user_id = ?');
  const project = projectStmt.get(projectId, userId) as { weekly_hours_goal: number } | undefined;

  if (!project) {
    return { points: 0, totalMinutes: 0, goalMinutes: 0, goalReached: false };
  }

  const goalMinutes = project.weekly_hours_goal * 60;

  // Soma minutos da semana
  const logStmt = getDb().prepare(`
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
  const stmt = getDb().prepare(`
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
  const stmt = getDb().prepare(`
    UPDATE user_entries
    SET points = 0
    WHERE activity_type_id = ?
  `);
  stmt.run(activityTypeId);
}

/**
 * Calcula pontos diários de uma categoria específica com teto
 * Retorna o total de pontos para um determinado dia (respeitando teto da categoria)
 *
 * IMPORTANTE: Calcula pontos dinamicamente baseado no activity_type, não usa e.points
 */
export async function getDailyCategoryPoints(
  userId: number,
  categoryId: number,
  date: string
): Promise<{ points: number; rawPoints: number; capped: boolean }> {
  // Usa substr para extrair YYYY-MM-DD da data, funcionando tanto para DATE quanto DATETIME
  // Isso evita problemas de comparação em produção onde entry_date pode ser DATE ou DATETIME
  const stmt = getDb().prepare(`
    SELECT COALESCE(SUM(at.base_points), 0) as total
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
      AND substr(e.entry_date, 1, 10) = substr(?, 1, 10)
      AND at.category_id = ?
      AND at.is_validated = TRUE
  `);
  const result = stmt.get(userId, date, categoryId) as { total: number };
  const rawPoints = result?.total ?? 0;

  // Aplica teto baseado na categoria
  const cap = CATEGORY_DAILY_CAPS[categoryId as CategoryId];
  if (!cap) {
    // Categoria desconhecida, retorna pontos brutos
    return { points: rawPoints, rawPoints, capped: false };
  }

  let points = rawPoints;
  let capped = false;

  if (rawPoints > cap.max) {
    points = cap.max;
    capped = true;
  } else if (rawPoints < cap.min) {
    points = cap.min;
    capped = true;
  }

  return {
    points,
    rawPoints,
    capped,
  };
}

/**
 * Calcula pontos diários de alimentação com limite de 10 pontos por dia
 * Retorna o total de pontos de alimentação para um determinado dia (máximo 10, mínimo -10)
 *
 * IMPORTANTE: Calcula pontos dinamicamente baseado no activity_type, não usa e.points
 * @deprecated Use getDailyCategoryPoints diretamente
 */
export async function getDailyFoodPoints(userId: number, date: string): Promise<{
  points: number;
  rawPoints: number;
  capped: boolean;
}> {
  return getDailyCategoryPoints(userId, CategoryId.REFEICAO, date);
}

/**
 * Calcula pontos totais de um usuário considerando tetos diários por categoria
 * - Alimentação: máximo ±10 pontos por dia
 * - Exercícios: máximo 5 pontos por dia (1 entrada)
 * - Entorpecentes: mínimo -5 pontos por dia (1 entrada)
 * - Projetos pessoais: 50 pontos por semana com meta batida
 *
 * IMPORTANTE: Calcula pontos dinamicamente baseado nos activity_types, não usa e.points
 */
export async function getUserTotalPoints(userId: number): Promise<number> {
  // Busca todas as datas únicas com entradas por categoria
  // Usa substr para extrair YYYY-MM-DD, evitando problemas de comparação em produção
  const categoryDatesStmt = getDb().prepare(`
    SELECT DISTINCT at.category_id, substr(e.entry_date, 1, 10) as entry_date
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND e.entry_date IS NOT NULL AND at.is_validated = TRUE
      AND at.category_id IN (${CategoryId.REFEICAO}, ${CategoryId.EXERCICIO}, ${CategoryId.ENTORPECENTES})
  `);
  const categoryDates = categoryDatesStmt.all(userId) as Array<{ category_id: number; entry_date: string }>;

  // Agrupa datas por categoria
  const datesByCategory = new Map<number, Set<string>>();
  for (const { category_id, entry_date } of categoryDates) {
    if (!datesByCategory.has(category_id)) {
      datesByCategory.set(category_id, new Set());
    }
    datesByCategory.get(category_id)!.add(entry_date);
  }

  let totalPoints = 0;

  // Calcula pontos por categoria com teto diário
  for (const [categoryId, dates] of datesByCategory.entries()) {
    for (const date of dates) {
      const dailyPoints = await getDailyCategoryPoints(userId, categoryId, date);
      totalPoints += dailyPoints.points;
    }
  }

  // Soma pontos de projetos pessoais (semanas completas)
  const projectsStmt = getDb().prepare(`
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

  return totalPoints + projectPoints;
}
