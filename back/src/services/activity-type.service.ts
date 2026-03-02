import { db } from '../db';

export interface ActivityType {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  is_positive: boolean;
  base_points: number;
  is_validated: boolean;
  created_by_user_id: number | null;
  created_at: string;
  // Dados para votação
  positive_votes?: number;
  negative_votes?: number;
  total_votes?: number;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

/**
 * Converte array de activity types para formato UTC ISO 8601
 */
function normalizeActivityTypes(types: ActivityType[]): ActivityType[] {
  return types.map(t => ({
    ...t,
    created_at: toUTCDate(t.created_at)!,
  }));
}

export async function getAllActivityTypes(): Promise<ActivityType[]> {
  const stmt = db.prepare(`
    SELECT
      at.*,
      c.name as category_name,
      COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) as positive_votes,
      COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) as negative_votes,
      COUNT(v.id) as total_votes
    FROM activity_types at
    LEFT JOIN categories c ON at.category_id = c.id
    LEFT JOIN activity_type_votes v ON at.id = v.activity_type_id
    GROUP BY at.id
    ORDER BY at.category_id, at.name
  `);
  const types = stmt.all() as ActivityType[];
  return normalizeActivityTypes(types);
}

export async function getActivityTypesByCategory(categoryId: number): Promise<ActivityType[]> {
  const stmt = db.prepare(`
    SELECT
      at.*,
      c.name as category_name,
      COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) as positive_votes,
      COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) as negative_votes,
      COUNT(v.id) as total_votes
    FROM activity_types at
    LEFT JOIN categories c ON at.category_id = c.id
    LEFT JOIN activity_type_votes v ON at.id = v.activity_type_id
    WHERE at.category_id = ?
    GROUP BY at.id
    ORDER BY at.name
  `);
  const types = stmt.all(categoryId) as ActivityType[];
  return normalizeActivityTypes(types);
}

export async function getActivityTypeById(id: number): Promise<ActivityType | undefined> {
  const stmt = db.prepare(`
    SELECT
      at.*,
      c.name as category_name
    FROM activity_types at
    LEFT JOIN categories c ON at.category_id = c.id
    WHERE at.id = ?
  `);
  const type = stmt.get(id) as ActivityType | undefined;
  if (!type) return undefined;
  return {
    ...type,
    created_at: toUTCDate(type.created_at)!,
  };
}

export async function createActivityType(
  name: string,
  categoryId: number,
  isPositive: boolean,
  createdByUserId: number
): Promise<ActivityType> {
  // Calcula base_points baseado na categoria
  let basePoints = 0;
  
  if (categoryId === 1) {
    // Refeição: positiva = +10, negativa = -10
    basePoints = isPositive ? 10 : -10;
  } else if (categoryId === 2) {
    // Exercício: sempre +5
    basePoints = 5;
  }

  const stmt = db.prepare(`
    INSERT INTO activity_types (name, category_id, is_positive, base_points, created_by_user_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, categoryId, isPositive, basePoints, createdByUserId);

  return {
    id: result.lastInsertRowid as number,
    name,
    category_id: categoryId,
    is_positive: isPositive,
    base_points: basePoints,
    is_validated: true,
    created_by_user_id: createdByUserId,
    created_at: new Date().toISOString(),
  };
}

export async function findActivityTypeByName(name: string, categoryId: number): Promise<ActivityType | undefined> {
  const stmt = db.prepare('SELECT * FROM activity_types WHERE name = ? AND category_id = ?');
  return stmt.get(name, categoryId) as ActivityType | undefined;
}

export async function getValidatedActivityTypes(): Promise<ActivityType[]> {
  const stmt = db.prepare(`
    SELECT
      at.*,
      c.name as category_name
    FROM activity_types at
    LEFT JOIN categories c ON at.category_id = c.id
    WHERE at.is_validated = TRUE
    ORDER BY at.category_id, at.name
  `);
  const types = stmt.all() as ActivityType[];
  return normalizeActivityTypes(types);
}

export async function getActivityTypesForUser(userId: number): Promise<ActivityType[]> {
  // Retorna activity_types validados + os criados pelo usuário
  const stmt = db.prepare(`
    SELECT
      at.*,
      c.name as category_name
    FROM activity_types at
    LEFT JOIN categories c ON at.category_id = c.id
    WHERE at.is_validated = TRUE OR at.created_by_user_id = ?
    ORDER BY at.category_id, at.name
  `);
  const types = stmt.all(userId) as ActivityType[];
  return normalizeActivityTypes(types);
}
