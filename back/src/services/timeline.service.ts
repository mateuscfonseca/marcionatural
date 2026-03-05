import { getDb } from '../db-provider';
import { CategoryId, CATEGORY_DAILY_CAPS } from '../utils/category.enum';

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
  points: number; // pontos calculados dinamicamente
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
 * Converte data do SQLite para ISO 8601 UTC
 * O SQLite retorna "YYYY-MM-DD HH:MM:SS" sem timezone.
 * Como o servidor roda em UTC, tratamos como UTC e convertemos para ISO 8601.
 * O formato ISO 8601 com 'Z' permite que o front converta para a timezone local do usuário.
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // Parse da data do SQLite como UTC e converte para ISO 8601
  const [datePart, timePart] = dateStr.split(' ');
  if (!timePart) return new Date(dateStr).toISOString();
  
  // Cria data UTC explicitamente para evitar problemas de timezone
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return utcDate.toISOString();
}

/**
 * Calcula pontos para uma entrada específica baseado na categoria e teto diário
 * Nota: Este é um cálculo simplificado para exibição na timeline
 * O cálculo correto do leaderboard considera todas as entradas do dia
 */
function calculateEntryPointsForDisplay(
  categoryId: number | null,
  basePoints: number | null,
  isPositive: boolean | null
): number {
  if (categoryId === null || basePoints === null) return 0;
  
  // Para exibição na timeline, usamos os pontos base da atividade
  // O cálculo com tetos diários é feito no leaderboard
  if (categoryId === CategoryId.EXERCICIO) {
    return 5;
  }
  if (categoryId === CategoryId.ENTORPECENTES) {
    return -5;
  }
  if (categoryId === CategoryId.REFEICAO) {
    return isPositive ? 10 : -10;
  }
  if (categoryId === CategoryId.PROJETO_PESSOAL) {
    return 0; // Projetos são calculados semanalmente
  }
  
  return basePoints;
}

/**
 * Busca entradas para a timeline (feed de atividades)
 * Retorna atividades e logs de projetos, ordenadas por data (mais recente primeiro)
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
  // Filtro de data usando parâmetro vinculado
  const dateCondition = days
    ? "AND substr(entry_date, 1, 10) >= date('now', '-' || ? || ' days')"
    : '';

  // UNION ALL de atividades e logs de projetos
  const stmt = getDb().prepare(`
    SELECT * FROM (
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
        at.base_points,
        at.is_positive,
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
      WHERE e.is_invalidated = 0
        AND u.deleted_at IS NULL
        ${dateCondition}

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
        0 as base_points,
        0 as is_positive,
        l.date as entry_date,
        l.created_at,
        0 as is_invalidated,
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
        ${dateCondition}
    )
    ORDER BY entry_date DESC, created_at DESC
    LIMIT ? OFFSET ?
  `);

  const params: any[] = days ? [days, days, limit, offset] : [limit, offset];
  const entries = stmt.all(...params) as Array<TimelineEntry & { base_points: number | null; is_positive: boolean | null }>;

  // Calcula pontos dinamicamente e normaliza datas
  return entries.map(e => ({
    ...e,
    points: calculateEntryPointsForDisplay(e.category_id, e.base_points, e.is_positive),
    created_at: toUTCDate(e.created_at)!,
    // Remove campos temporários
    base_points: undefined as any,
    is_positive: undefined as any,
  }));
}

/**
 * Conta total de entradas disponíveis na timeline (atividades + projetos)
 */
export async function getTimelineEntriesCount(days?: number): Promise<number> {
  const dateCondition = days
    ? "AND substr(entry_date, 1, 10) >= date('now', '-' || ? || ' days')"
    : '';

  const stmt = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT e.entry_date
      FROM user_entries e
      INNER JOIN users u ON e.user_id = u.id
      WHERE e.is_invalidated = 0
        AND u.deleted_at IS NULL
        ${dateCondition}

      UNION ALL

      SELECT l.date as entry_date
      FROM project_daily_logs l
      INNER JOIN users u ON l.user_id = u.id
      WHERE u.deleted_at IS NULL
        ${dateCondition}
    )
  `);

  const params: any[] = days ? [days, days] : [];
  const result = stmt.get(...params) as { count: number };
  return result?.count ?? 0;
}
