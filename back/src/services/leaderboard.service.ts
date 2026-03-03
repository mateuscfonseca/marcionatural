import { getDb } from '../db-provider';

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
 * Calcula pontos totais de um usuário até uma data específica
 * Usa APENAS entry_date para filtrar (não created_at)
 */
async function getUserTotalPointsUntilDate(
  userId: number,
  untilDate: string
): Promise<number> {
  // Busca todas as datas únicas com entradas de alimentação até a data
  const foodDatesStmt = getDb().prepare(`
    SELECT DISTINCT substr(e.entry_date, 1, 10) as entry_date
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
      AND e.entry_date IS NOT NULL
      AND substr(e.entry_date, 1, 10) <= ?
      AND at.category_id = 1
      AND at.is_validated = TRUE
  `);
  const foodDates = foodDatesStmt.all(userId, untilDate) as Array<{ entry_date: string }>;

  let totalFoodPoints = 0;
  const processedDates = new Set<string>();

  // Calcula pontos de alimentação por dia com limite de 10
  for (const dateRow of foodDates) {
    const date = dateRow.entry_date;
    if (!date || processedDates.has(date)) continue;
    processedDates.add(date);

    const stmt = getDb().prepare(`
      SELECT COALESCE(SUM(at.base_points), 0) as total
      FROM user_entries e
      INNER JOIN activity_types at ON e.activity_type_id = at.id
      WHERE e.user_id = ?
        AND substr(e.entry_date, 1, 10) = ?
        AND at.category_id = 1
        AND at.is_validated = TRUE
    `);
    const result = stmt.get(userId, date) as { total: number };
    const rawPoints = result?.total ?? 0;

    // Aplica limite de 10 pontos (positivos ou negativos)
    let points = rawPoints;
    if (rawPoints > 10) points = 10;
    else if (rawPoints < -10) points = -10;

    totalFoodPoints += points;
  }

  // Soma pontos de exercícios até a data (5 pontos por entrada)
  const exerciseStmt = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
      AND at.category_id = 2
      AND at.is_validated = TRUE
      AND substr(e.entry_date, 1, 10) <= ?
  `);
  const exerciseResult = exerciseStmt.get(userId, untilDate) as { count: number };
  const exerciseCount = exerciseResult?.count ?? 0;
  const exercisePoints = exerciseCount * 5;

  return totalFoodPoints + exercisePoints;
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
  const targetDate = compareDate || new Date().toISOString().split('T')[0];

  // Leaderboard atual (ou da data especificada)
  const currentLeaderboard = await getLeaderboardByDate(targetDate);

  // Calcula leaderboard do dia anterior para comparação
  const prevDate = new Date(targetDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];

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
