import { db } from '../db';
import { calculatePointsFromActivityType } from './points.service';

export interface UserEntry {
  id: number;
  user_id: number;
  activity_type_id: number;
  description: string;
  photo_url: string | null;
  photo_original_name: string | null;
  photo_identifier: string | null;
  duration_minutes: number | null;
  points: number;
  is_invalidated: boolean;
  invalidated_at: string | null;
  created_at: string;
  // Dados do activity_type (para exibição)
  activity_type_name?: string;
  category_id?: number;
  category_name?: string;
  is_activity_validated?: boolean;
}

export interface CreateEntryDTO {
  userId: number;
  activityTypeId: number;
  description: string;
  photoUrl?: string;
  photoIdentifier?: string;
  photoOriginalName?: string;
  durationMinutes?: number;
}

export interface UpdateEntryDTO {
  description?: string;
  photoUrl?: string;
  durationMinutes?: number;
}

export async function getEntryById(id: number): Promise<UserEntry | undefined> {
  const stmt = db.prepare(`
    SELECT 
      e.*,
      at.name as activity_type_name,
      at.category_id,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.id = ?
  `);
  return stmt.get(id) as UserEntry | undefined;
}

export async function getEntriesByUser(userId: number): Promise<UserEntry[]> {
  const stmt = db.prepare(`
    SELECT 
      e.*,
      at.name as activity_type_name,
      at.category_id,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `);
  return stmt.all(userId) as UserEntry[];
}

export async function getAllEntries(): Promise<UserEntry[]> {
  const stmt = db.prepare(`
    SELECT 
      e.*,
      at.name as activity_type_name,
      at.category_id,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    ORDER BY e.created_at DESC
  `);
  return stmt.all() as UserEntry[];
}

export async function createEntry(dto: CreateEntryDTO): Promise<UserEntry> {
  // Calcula pontos baseado no activity_type
  const points = await calculatePointsFromActivityType(dto.activityTypeId);

  const stmt = db.prepare(`
    INSERT INTO user_entries (user_id, activity_type_id, description, photo_url, photo_identifier, photo_original_name, duration_minutes, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    dto.userId,
    dto.activityTypeId,
    dto.description,
    dto.photoUrl ?? null,
    dto.photoIdentifier ?? null,
    dto.photoOriginalName ?? null,
    dto.durationMinutes ?? null,
    points
  );

  return getEntryById(result.lastInsertRowid as number) as Promise<UserEntry>;
}

export async function updateEntry(id: number, dto: UpdateEntryDTO): Promise<UserEntry | undefined> {
  const entry = await getEntryById(id);
  if (!entry) return undefined;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (dto.description !== undefined) {
    updates.push('description = ?');
    values.push(dto.description);
  }
  if (dto.photoUrl !== undefined) {
    updates.push('photo_url = ?');
    values.push(dto.photoUrl);
  }
  if (dto.durationMinutes !== undefined) {
    updates.push('duration_minutes = ?');
    values.push(dto.durationMinutes);
  }

  if (updates.length > 0) {
    values.push(id);
    const stmt = db.prepare(`
      UPDATE user_entries
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  return getEntryById(id);
}

export async function deleteEntry(id: number): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM user_entries WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export async function getUserEntriesWithDetails(userId: number): Promise<UserEntry[]> {
  const stmt = db.prepare(`
    SELECT 
      e.*,
      at.name as activity_type_name,
      at.category_id,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `);
  return stmt.all(userId) as UserEntry[];
}

/**
 * Busca entradas de um usuário para exibição pública (leaderboard)
 * Separa positivas e negativas, considera apenas activity_types validados
 */
export async function getUserEntriesForLeaderboard(userId: number): Promise<{
  positive: UserEntry[];
  negative: UserEntry[];
  all: UserEntry[];
}> {
  const entries = await getEntriesByUser(userId);
  
  // Filtra apenas activity_types validados
  const validatedEntries = entries.filter(e => e.is_activity_validated);
  
  const positive = validatedEntries.filter(e => e.points > 0);
  const negative = validatedEntries.filter(e => e.points < 0);

  return {
    positive,
    negative,
    all: entries, // Retorna todas para exibição completa
  };
}
