import { db } from '../db';

export interface TimelineEntry {
  id: number;
  user_id: number;
  username: string;
  activity_type_id: number | null;
  activity_type_name: string | null;
  category_id: number | null;
  category_name: string | null;
  description: string;
  photo_url: string | null;
  photo_identifier: string | null;
  photo_original_name: string | null;
  points: number;
  entry_date: string;
  created_at: string;
  is_invalidated: boolean;
  // Campos para projetos pessoais
  entry_type: 'activity' | 'project';
  project_id: number | null;
  project_name: string | null;
  duration_minutes: number | null;
  week_number: number | null;
  year: number | null;
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
 * Retorna entradas de atividades e logs de projetos, ordenadas por data (mais recente primeiro)
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
    dateFilter = `AND entry_date >= date('now', '-${days} days')`;
  }

  // UNION de atividades e logs de projetos
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
      e.is_invalidated,
      'activity' as entry_type,
      NULL as project_id,
      NULL as project_name,
      e.duration_minutes,
      NULL as week_number,
      NULL as year
    FROM user_entries e
    INNER JOIN users u ON e.user_id = u.id
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    INNER JOIN categories c ON at.category_id = c.id
    WHERE e.is_invalidated = FALSE
      AND u.deleted_at IS NULL
      ${dateFilter}

    UNION ALL

    SELECT
      l.id,
      l.user_id,
      u.username,
      NULL as activity_type_id,
      NULL as activity_type_name,
      NULL as category_id,
      NULL as category_name,
      'Registro de tempo no projeto' as description,
      NULL as photo_url,
      NULL as photo_identifier,
      NULL as photo_original_name,
      0 as points,
      l.date as entry_date,
      l.created_at,
      FALSE as is_invalidated,
      'project' as entry_type,
      l.project_id,
      p.name as project_name,
      l.duration_minutes,
      l.week_number,
      l.year
    FROM project_daily_logs l
    INNER JOIN users u ON l.user_id = u.id
    INNER JOIN personal_projects p ON l.project_id = p.id
    WHERE u.deleted_at IS NULL
      ${dateFilter}

    ORDER BY entry_date DESC, created_at DESC
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
 * Conta total de entradas disponíveis na timeline (atividades + projetos)
 */
export async function getTimelineEntriesCount(days?: number): Promise<number> {
  let dateFilter = '';

  if (days) {
    dateFilter = `AND entry_date >= date('now', '-${days} days')`;
  }

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT e.entry_date
      FROM user_entries e
      INNER JOIN users u ON e.user_id = u.id
      WHERE e.is_invalidated = FALSE
        AND u.deleted_at IS NULL
        ${dateFilter}

      UNION ALL

      SELECT l.date as entry_date
      FROM project_daily_logs l
      INNER JOIN users u ON l.user_id = u.id
      WHERE u.deleted_at IS NULL
        ${dateFilter}
    )
  `);

  const result = stmt.get() as { count: number };
  return result?.count ?? 0;
}
