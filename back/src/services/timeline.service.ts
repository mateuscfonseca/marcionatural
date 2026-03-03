import { db } from '../db';

export interface TimelineEntry {
  id: number;
  user_id: number;
  username: string;
  activity_type_id: number;
  activity_type_name: string;
  category_id: number;
  category_name: string;
  description: string;
  photo_url: string | null;
  photo_identifier: string | null;
  photo_original_name: string | null;
  points: number;
  entry_date: string;
  created_at: string;
  is_invalidated: boolean;
}

/**
 * Converte data do SQLite para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

/**
 * Busca entradas para a timeline (feed de atividades)
 * Retorna apenas entradas validadas, ordenadas por data (mais recente primeiro)
 * 
 * @param limit - Quantidade máxima de entradas (padrão: 50)
 * @param offset - Offset para paginação (padrão: 0)
 * @param days - Filtrar por últimos X dias (opcional)
 */
export async function getTimelineEntries(
  limit: number = 50,
  offset: number = 0,
  days?: number
): Promise<TimelineEntry[]> {
  let dateFilter = '';
  const params: (number | string)[] = [];

  if (days) {
    dateFilter = `AND e.entry_date >= date('now', '-${days} days')`;
  }

  const stmt = db.prepare(`
    SELECT
      e.id,
      e.user_id,
      u.username,
      e.activity_type_id,
      at.name as activity_type_name,
      at.category_id,
      c.name as category_name,
      e.description,
      e.photo_url,
      e.photo_identifier,
      e.photo_original_name,
      e.points,
      e.entry_date,
      e.created_at,
      e.is_invalidated
    FROM user_entries e
    INNER JOIN users u ON e.user_id = u.id
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.is_invalidated = FALSE
      AND u.deleted_at IS NULL
      ${dateFilter}
    ORDER BY e.entry_date DESC, e.created_at DESC
    LIMIT ? OFFSET ?
  `);

  const entries = stmt.all(...params, limit, offset) as TimelineEntry[];

  // Normaliza datas para UTC
  return entries.map(e => ({
    ...e,
    created_at: toUTCDate(e.created_at)!,
  }));
}

/**
 * Conta total de entradas disponíveis na timeline
 */
export async function getTimelineEntriesCount(days?: number): Promise<number> {
  let dateFilter = '';

  if (days) {
    dateFilter = `AND e.entry_date >= date('now', '-${days} days')`;
  }

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM user_entries e
    INNER JOIN users u ON e.user_id = u.id
    WHERE e.is_invalidated = FALSE
      AND u.deleted_at IS NULL
      ${dateFilter}
  `);

  const result = stmt.get() as { count: number };
  return result?.count ?? 0;
}
