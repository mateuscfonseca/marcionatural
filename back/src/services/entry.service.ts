import { getDb } from '../db-provider';
import { CategoryId } from '../utils/category.enum';

export interface UserEntry {
  id: number;
  user_id: number;
  activity_type_id: number;
  description: string;
  photo_url: string | null;
  photo_original_name: string | null;
  photo_identifier: string | null;
  duration_minutes: number | null;
  entry_date: string | null;
  is_invalidated: boolean;
  invalidated_at: string | null;
  created_at: string;
  // Dados do activity_type (para exibição)
  activity_type_name?: string;
  category_id?: number;
  category_name?: string;
  is_activity_validated?: boolean;
  is_activity_positive?: boolean;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 * O SQLite retorna "2026-03-03 02:00:00", assumimos que é UTC e adicionamos 'Z'
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // SQLite retorna "YYYY-MM-DD HH:MM:SS", adicionamos Z para indicar UTC
  return new Date(dateStr + 'Z').toISOString();
}

/**
 * Converte array de entradas para formato UTC ISO 8601
 */
function normalizeEntries(entries: UserEntry[]): UserEntry[] {
  return entries.map(e => ({
    ...e,
    created_at: toUTCDate(e.created_at)!,
    invalidated_at: toUTCDate(e.invalidated_at),
  }));
}

export interface CreateEntryDTO {
  userId: number;
  activityTypeId: number;
  description: string;
  photoUrl?: string;
  photoIdentifier?: string;
  photoOriginalName?: string;
  durationMinutes?: number;
  entryDate?: string;
}

export interface UpdateEntryDTO {
  description?: string;
  photoUrl?: string;
  durationMinutes?: number;
  entryDate?: string;
}

/**
 * Busca entrada por ID listando colunas explicitamente
 */
export async function getEntryById(id: number): Promise<UserEntry | undefined> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      e.activity_type_id,
      e.description,
      e.photo_url,
      e.photo_original_name,
      e.photo_identifier,
      e.duration_minutes,
      e.entry_date,
      e.is_invalidated,
      e.invalidated_at,
      e.created_at,
      at.name as activity_type_name,
      at.category_id,
      at.is_positive as is_activity_positive,
      at.base_points as points,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.id = ?
  `);
  const entry = stmt.get(id) as UserEntry | undefined;
  if (!entry) return undefined;
  return {
    ...entry,
    created_at: toUTCDate(entry.created_at)!,
    invalidated_at: toUTCDate(entry.invalidated_at),
  };
}

/**
 * Busca entradas por usuário listando colunas explicitamente
 */
export async function getEntriesByUser(userId: number): Promise<UserEntry[]> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      e.activity_type_id,
      e.description,
      e.photo_url,
      e.photo_original_name,
      e.photo_identifier,
      e.duration_minutes,
      e.entry_date,
      e.is_invalidated,
      e.invalidated_at,
      e.created_at,
      at.name as activity_type_name,
      at.category_id,
      at.is_positive as is_activity_positive,
      at.base_points as points,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `);
  const entries = stmt.all(userId) as UserEntry[];
  return normalizeEntries(entries);
}

/**
 * Busca todas as entradas listando colunas explicitamente
 */
export async function getAllEntries(): Promise<UserEntry[]> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      e.activity_type_id,
      e.description,
      e.photo_url,
      e.photo_original_name,
      e.photo_identifier,
      e.duration_minutes,
      e.entry_date,
      e.is_invalidated,
      e.invalidated_at,
      e.created_at,
      at.name as activity_type_name,
      at.category_id,
      at.is_positive as is_activity_positive,
      at.base_points as points,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    ORDER BY e.created_at DESC
  `);
  const entries = stmt.all() as UserEntry[];
  return normalizeEntries(entries);
}

/**
 * Cria entrada SEM coluna points (pontos são calculados dinamicamente)
 */
export async function createEntry(dto: CreateEntryDTO): Promise<UserEntry> {
  const stmt = getDb().prepare(`
    INSERT INTO user_entries (user_id, activity_type_id, description, photo_url, photo_identifier, photo_original_name, duration_minutes, entry_date)
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
    dto.entryDate ?? null
  );

  return getEntryById(result.lastInsertRowid as number) as Promise<UserEntry>;
}

/**
 * Atualiza entrada (sem points)
 */
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
  if (dto.entryDate !== undefined) {
    updates.push('entry_date = ?');
    values.push(dto.entryDate);
  }

  if (updates.length > 0) {
    values.push(id);
    const stmt = getDb().prepare(`
      UPDATE user_entries
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  return getEntryById(id);
}

export async function deleteEntry(id: number): Promise<boolean> {
  const stmt = getDb().prepare('DELETE FROM user_entries WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Busca entradas do usuário listando colunas explicitamente
 */
export async function getUserEntriesWithDetails(userId: number): Promise<UserEntry[]> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      e.activity_type_id,
      e.description,
      e.photo_url,
      e.photo_original_name,
      e.photo_identifier,
      e.duration_minutes,
      e.entry_date,
      e.is_invalidated,
      e.invalidated_at,
      e.created_at,
      at.name as activity_type_name,
      at.category_id,
      at.is_positive as is_activity_positive,
      at.base_points as points,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `);
  const entries = stmt.all(userId) as UserEntry[];
  return normalizeEntries(entries);
}

/**
 * Busca entradas de um usuário para exibição pública (leaderboard)
 * Separa positivas e negativas, considera apenas activity_types validados
 *
 * IMPORTANTE: Filtra por is_positive do activity_type, não por points da entrada
 */
export async function getUserEntriesForLeaderboard(userId: number): Promise<{
  positive: UserEntry[];
  negative: UserEntry[];
  all: UserEntry[];
}> {
  const entries = await getEntriesByUser(userId);

  // Filtra apenas activity_types validados
  const validatedEntries = entries.filter(e => e.is_activity_validated);

  // Filtra por is_positive do activity_type
  // Exercícios (categoria 2) e Entorpecentes (categoria 4) têm comportamento específico
  // Alimentação (categoria 1) pode ser positiva ou negativa
  const positive = validatedEntries.filter(e =>
    e.category_id === CategoryId.EXERCICIO ||
    e.category_id === CategoryId.PROJETO_PESSOAL ||
    (e.category_id === CategoryId.REFEICAO && e.is_activity_positive)
  );
  const negative = validatedEntries.filter(e =>
    e.category_id === CategoryId.ENTORPECENTES ||
    (e.category_id === CategoryId.REFEICAO && !e.is_activity_positive)
  );

  return {
    positive,
    negative,
    all: entries, // Retorna todas para exibição completa
  };
}

/**
 * Verifica se usuário já tem uma entrada para uma determinada categoria e data
 * Retorna true se já existir entrada da categoria para o usuário na data
 *
 * Regra: 1 entrada por categoria por dia
 */
export async function hasUserEntryForCategoryDate(
  userId: number,
  entryDate: string,
  categoryId: number
): Promise<boolean> {
  const stmt = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND e.entry_date = ? AND at.category_id = ?
  `);
  const result = stmt.get(userId, entryDate, categoryId) as { count: number };
  return (result?.count ?? 0) > 0;
}

/**
 * Verifica se usuário já tem uma entrada de alimentação para uma determinada data
 * Retorna true se já existir entrada de alimentação (categoria 1) para o usuário na data
 *
 * @deprecated Use hasUserEntryForCategoryDate diretamente
 */
export async function hasUserFoodEntryForDate(userId: number, entryDate: string): Promise<boolean> {
  return hasUserEntryForCategoryDate(userId, entryDate, CategoryId.REFEICAO);
}

/**
 * Busca entrada de um usuário para uma data específica listando colunas explicitamente
 */
export async function getUserEntryForDate(userId: number, entryDate: string): Promise<UserEntry | undefined> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      e.activity_type_id,
      e.description,
      e.photo_url,
      e.photo_original_name,
      e.photo_identifier,
      e.duration_minutes,
      e.entry_date,
      e.is_invalidated,
      e.invalidated_at,
      e.created_at,
      at.name as activity_type_name,
      at.category_id,
      at.is_positive as is_activity_positive,
      at.base_points as points,
      c.name as category_name,
      at.is_validated as is_activity_validated
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.user_id = ? AND e.entry_date = ?
  `);
  const entry = stmt.get(userId, entryDate) as UserEntry | undefined;
  if (!entry) return undefined;
  return {
    ...entry,
    created_at: toUTCDate(entry.created_at)!,
    invalidated_at: toUTCDate(entry.invalidated_at),
  };
}
