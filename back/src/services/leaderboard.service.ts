import { getDb } from '../db-provider';
import { CategoryId, CategoryDailyCaps } from '../utils/category.enum';

export interface LeaderboardUser {
  id: number;
  username: string;
  total_points: number;
  valid_entries_count: number;
}

export interface LeaderboardUserWithMovement extends LeaderboardUser {
  position: number;
  previousPosition: number | null;
  positionDiff: number;
  movement: 'up' | 'down' | 'same';
}

export interface LeaderboardSnapshot {
  date: string;
  users: Array<{
    id: number;
    username: string;
    total_points: number;
  }>;
}

/**
 * Calcula pontos diários de uma categoria específica com teto
 */
async function getDailyCategoryPointsUntilDate(
  userId: number,
  categoryId: number,
  date: string
): Promise<{ points: number; rawPoints: number; capped: boolean }> {
  const stmt = getDb().prepare(`
    SELECT COALESCE(SUM(at.base_points), 0) as total
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
      AND substr(e.entry_date, 1, 10) = ?
      AND at.category_id = ?
      AND at.is_validated = TRUE
  `);
  const result = stmt.get(userId, date, categoryId) as { total: number };
  const rawPoints = result?.total ?? 0;

  // Aplica teto baseado na categoria
  const cap = CategoryDailyCaps[categoryId as CategoryId];
  if (!cap) {
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

  return { points, rawPoints, capped };
}

/**
 * Calcula pontos totais de um usuário até uma data específica
 * Usa APENAS entry_date para filtrar (não created_at)
 * Aplica tetos diários por categoria:
 * - Alimentação: ±10 pontos por dia
 * - Exercício: 5 pontos por dia (máx)
 * - Entorpecentes: -5 pontos por dia (mín)
 */
async function getUserTotalPointsUntilDate(
  userId: number,
  untilDate: string
): Promise<number> {
  // Busca todas as datas únicas com entradas por categoria até a data
  const categoryDatesStmt = getDb().prepare(`
    SELECT DISTINCT at.category_id, substr(e.entry_date, 1, 10) as entry_date
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
      AND e.entry_date IS NOT NULL
      AND substr(e.entry_date, 1, 10) <= ?
      AND at.category_id IN (${CategoryId.REFEICAO}, ${CategoryId.EXERCICIO}, ${CategoryId.ENTORPECENTES})
  `);
  const categoryDates = categoryDatesStmt.all(userId, untilDate) as Array<{ category_id: number; entry_date: string }>;

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
      const dailyPoints = await getDailyCategoryPointsUntilDate(userId, categoryId, date);
      totalPoints += dailyPoints.points;
    }
  }

  return totalPoints;
}

/**
 * Conta entradas válidas de um usuário até uma data específica
 */
async function getUserEntriesCountUntilDate(
  userId: number,
  untilDate: string
): Promise<number> {
  const stmt = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
      AND at.is_validated = TRUE
      AND substr(e.entry_date, 1, 10) <= ?
  `);
  const result = stmt.get(userId, untilDate) as { count: number };
  return result?.count ?? 0;
}

/**
 * Obtém leaderboard de uma data específica
 */
export async function getLeaderboardByDate(date: string): Promise<LeaderboardUser[]> {
  // Busca apenas usuários ativos
  const usersStmt = getDb().prepare(
    'SELECT id, username FROM users WHERE deleted_at IS NULL'
  );
  const users = usersStmt.all() as Array<{ id: number; username: string }>;

  // Calcula pontos totais para cada usuário até a data
  const usersWithPoints = await Promise.all(
    users.map(async (user) => {
      const totalPoints = await getUserTotalPointsUntilDate(user.id, date);
      const entriesCount = await getUserEntriesCountUntilDate(user.id, date);
      return {
        id: user.id,
        username: user.username,
        total_points: totalPoints,
        valid_entries_count: entriesCount,
      };
    })
  );

  // Ordena por pontos (decrescente) e depois por username (crescente)
  usersWithPoints.sort((a, b) => {
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }
    return a.username.localeCompare(b.username);
  });

  return usersWithPoints;
}

/**
 * Obtém leaderboard com movimentação comparada ao dia anterior
 */
export async function getLeaderboardWithMovement(
  compareDate?: string
): Promise<LeaderboardUserWithMovement[]> {
  const targetDate = compareDate || new Date().toISOString().split('T')[0]!;

  // Leaderboard atual (ou da data especificada)
  const currentLeaderboard = await getLeaderboardByDate(targetDate);

  // Calcula leaderboard do dia anterior para comparação
  const prevDate = new Date(targetDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0]!;

  const previousLeaderboard = await getLeaderboardByDate(prevDateStr);

  // Cria mapa de posições anteriores
  const previousPositionMap = new Map<number, number>();
  previousLeaderboard.forEach((user, index) => {
    previousPositionMap.set(user.id, index + 1);
  });

  // Adiciona informação de movimentação
  return currentLeaderboard.map((user, index) => {
    const currentPosition = index + 1;
    const previousPosition = previousPositionMap.get(user.id) ?? null;
    const positionDiff = previousPosition ? previousPosition - currentPosition : 0;

    let movement: 'up' | 'down' | 'same' = 'same';
    if (positionDiff > 0) movement = 'up';
    else if (positionDiff < 0) movement = 'down';

    return {
      ...user,
      position: currentPosition,
      previousPosition,
      positionDiff,
      movement,
    };
  });
}

/**
 * Obtém histórico de leaderboard para os últimos N semanas
 */
export async function getLeaderboardHistory(
  weeks: number = 4
): Promise<LeaderboardSnapshot[]> {
  const snapshots: LeaderboardSnapshot[] = [];

  // Calcula data inicial (N semanas atrás)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  startDate.setHours(0, 0, 0, 0);

  // Gera snapshots diários
  const currentDate = new Date(startDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Busca leaderboard da data
    const leaderboard = await getLeaderboardByDate(dateStr);

    // Adiciona snapshot
    snapshots.push({
      date: dateStr,
      users: leaderboard.map((user) => ({
        id: user.id,
        username: user.username,
        total_points: user.total_points,
      })),
    });

    // Avança um dia
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return snapshots;
}
