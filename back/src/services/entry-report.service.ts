import { getDb } from '../db-provider';

export interface EntryReport {
  id: number;
  entry_id: number;
  reporter_user_id: number;
  created_at: string;
}

export interface EntryReportWithDetails extends EntryReport {
  entry_description: string;
  reporter_username: string;
}

export interface EntryReportStats {
  entryId: number;
  reportCount: number;
  isInvalidated: boolean;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

/**
 * Converte array de reports para formato UTC ISO 8601
 */
function normalizeReports(reports: EntryReport[]): EntryReport[] {
  return reports.map(r => ({
    ...r,
    created_at: toUTCDate(r.created_at)!,
  }));
}

/**
 * Cria um report de entrada
 */
export async function createEntryReport(
  entryId: number,
  reporterUserId: number
): Promise<EntryReport> {
  const stmt = getDb().prepare(`
    INSERT INTO entry_reports (entry_id, reporter_user_id)
    VALUES (?, ?)
  `);

  const result = stmt.run(entryId, reporterUserId);

  return {
    id: result.lastInsertRowid as number,
    entry_id: entryId,
    reporter_user_id: reporterUserId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Remove um report (apenas se o usuário foi quem criou)
 */
export async function removeEntryReport(
  entryId: number,
  reporterUserId: number
): Promise<boolean> {
  const stmt = getDb().prepare(`
    DELETE FROM entry_reports
    WHERE entry_id = ? AND reporter_user_id = ?
  `);

  const result = stmt.run(entryId, reporterUserId);
  return result.changes > 0;
}

/**
 * Verifica se usuário já reportou uma entrada
 */
export async function hasUserReported(
  userId: number,
  entryId: number
): Promise<boolean> {
  const stmt = getDb().prepare(`
    SELECT 1 FROM entry_reports
    WHERE entry_id = ? AND reporter_user_id = ?
  `);
  const result = stmt.get(entryId, userId);
  return !!result;
}

/**
 * Busca todos os reports de uma entrada
 */
export async function getReportsByEntry(
  entryId: number
): Promise<EntryReport[]> {
  const stmt = getDb().prepare(`
    SELECT * FROM entry_reports
    WHERE entry_id = ?
    ORDER BY created_at DESC
  `);
  const reports = stmt.all(entryId) as EntryReport[];
  return normalizeReports(reports);
}

/**
 * Busca reports com detalhes
 */
export async function getReportsByEntryWithDetails(
  entryId: number
): Promise<EntryReportWithDetails[]> {
  const stmt = getDb().prepare(`
    SELECT
      er.*,
      e.description as entry_description,
      u.username as reporter_username
    FROM entry_reports er
    INNER JOIN user_entries e ON er.entry_id = e.id
    INNER JOIN users u ON er.reporter_user_id = u.id
    WHERE er.entry_id = ?
    ORDER BY er.created_at DESC
  `);
  const reports = stmt.all(entryId) as EntryReportWithDetails[];
  return reports.map(r => ({
    ...r,
    created_at: toUTCDate(r.created_at)!,
  }));
}

/**
 * Conta quantos reports uma entrada tem
 */
export async function getReportCount(entryId: number): Promise<number> {
  const stmt = getDb().prepare(`
    SELECT COUNT(*) as count FROM entry_reports
    WHERE entry_id = ?
  `);
  const result = stmt.get(entryId) as { count: number };
  return result.count;
}

/**
 * Invalida uma entrada automaticamente (≥3 reports)
 */
export async function invalidateEntry(entryId: number): Promise<boolean> {
  const stmt = getDb().prepare(`
    UPDATE user_entries
    SET is_invalidated = TRUE, invalidated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const result = stmt.run(entryId);
  return result.changes > 0;
}

/**
 * Verifica e atualiza invalidação de entrada (≥3 reports)
 */
export async function checkAndUpdateInvalidation(
  entryId: number
): Promise<{ invalidated: boolean; reportCount: number }> {
  const reportCount = await getReportCount(entryId);

  // Verifica status atual
  const currentStatusStmt = getDb().prepare(`
    SELECT is_invalidated FROM user_entries WHERE id = ?
  `);
  const currentStatus = currentStatusStmt.get(entryId) as {
    is_invalidated: boolean;
  } | undefined;
  const currentlyInvalidated = currentStatus?.is_invalidated ?? false;

  let invalidated = false;

  // 3 ou mais reports invalida a entrada
  if (reportCount >= 3 && !currentlyInvalidated) {
    await invalidateEntry(entryId);
    invalidated = true;
  }

  return { invalidated, reportCount };
}

/**
 * Busca stats de reports para múltiplas entradas
 */
export async function getReportsStatsForEntries(
  entryIds: number[]
): Promise<Map<number, EntryReportStats>> {
  if (entryIds.length === 0) {
    return new Map();
  }

  const placeholders = entryIds.map(() => '?').join(',');
  const stmt = getDb().prepare(`
    SELECT
      e.id as entryId,
      COUNT(er.id) as reportCount,
      e.is_invalidated as isInvalidated
    FROM user_entries e
    LEFT JOIN entry_reports er ON e.id = er.entry_id
    WHERE e.id IN (${placeholders})
    GROUP BY e.id
  `);

  const results = stmt.all(...entryIds) as Array<{
    entryId: number;
    reportCount: number;
    isInvalidated: boolean;
  }>;

  const statsMap = new Map<number, EntryReportStats>();
  for (const result of results) {
    statsMap.set(result.entryId, {
      entryId: result.entryId,
      reportCount: result.reportCount,
      isInvalidated: result.isInvalidated,
    });
  }

  return statsMap;
}

/**
 * Busca todas as entradas que um usuário ainda não reportou
 * (excluindo as próprias entradas do usuário)
 */
export async function getEntriesAvailableToReport(
  userId: number,
  limit = 50
): Promise<Array<{
  id: number;
  user_id: number;
  username: string;
  description: string;
  photo_url: string | null;
  points: number;
  created_at: string;
  report_count: number;
  is_invalidated: boolean;
}>> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      u.username,
      e.description,
      e.photo_url,
      at.base_points as points,
      e.created_at,
      e.is_invalidated,
      (SELECT COUNT(*) FROM entry_reports er WHERE er.entry_id = e.id) as report_count
    FROM user_entries e
    INNER JOIN users u ON e.user_id = u.id
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id != ?
      AND e.id NOT IN (
        SELECT entry_id FROM entry_reports WHERE reporter_user_id = ?
      )
    ORDER BY e.created_at DESC
    LIMIT ?
  `);

  const entries = stmt.all(userId, userId, limit) as Array<{
    id: number;
    user_id: number;
    username: string;
    description: string;
    photo_url: string | null;
    points: number;
    created_at: string;
    report_count: number;
    is_invalidated: boolean;
  }>;

  return entries.map(e => ({
    ...e,
    created_at: toUTCDate(e.created_at)!,
  }));
}

/**
 * Busca todas as entradas invalidadas
 */
export async function getInvalidatedEntries(): Promise<Array<{
  id: number;
  user_id: number;
  username: string;
  description: string;
  photo_url: string | null;
  points: number;
  created_at: string;
  invalidated_at: string | null;
  report_count: number;
}>> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.user_id,
      u.username,
      e.description,
      e.photo_url,
      at.base_points as points,
      e.created_at,
      e.invalidated_at,
      (SELECT COUNT(*) FROM entry_reports er WHERE er.entry_id = e.id) as report_count
    FROM user_entries e
    INNER JOIN users u ON e.user_id = u.id
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.is_invalidated = TRUE
    ORDER BY e.invalidated_at DESC
  `);

  const entries = stmt.all() as Array<{
    id: number;
    user_id: number;
    username: string;
    description: string;
    photo_url: string | null;
    points: number;
    created_at: string;
    invalidated_at: string | null;
    report_count: number;
  }>;

  return entries.map(e => ({
    ...e,
    created_at: toUTCDate(e.created_at)!,
    invalidated_at: toUTCDate(e.invalidated_at),
  }));
}

/**
 * Busca entradas invalidadas de um usuário específico
 */
export async function getUserInvalidatedEntries(
  userId: number
): Promise<Array<{
  id: number;
  description: string;
  photo_url: string | null;
  points: number;
  created_at: string;
  invalidated_at: string | null;
  report_count: number;
}>> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.description,
      e.photo_url,
      at.base_points as points,
      e.created_at,
      e.invalidated_at,
      (SELECT COUNT(*) FROM entry_reports er WHERE er.entry_id = e.id) as report_count
    FROM user_entries e
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ? AND e.is_invalidated = TRUE
    ORDER BY e.invalidated_at DESC
  `);

  const entries = stmt.all(userId) as Array<{
    id: number;
    description: string;
    photo_url: string | null;
    points: number;
    created_at: string;
    invalidated_at: string | null;
    report_count: number;
  }>;

  return entries.map(e => ({
    ...e,
    created_at: toUTCDate(e.created_at)!,
    invalidated_at: toUTCDate(e.invalidated_at),
  }));
}

/**
 * Busca entradas do usuário que receberam reports (mesmo não invalidadas)
 */
export async function getMyEntriesWithReports(
  userId: number
): Promise<Array<{
  id: number;
  description: string;
  photo_url: string | null;
  points: number;
  created_at: string;
  is_invalidated: boolean;
  report_count: number;
  report_created_at: string | null;
}>> {
  const stmt = getDb().prepare(`
    SELECT
      e.id,
      e.description,
      e.photo_url,
      at.base_points as points,
      e.created_at,
      e.is_invalidated,
      COUNT(er.id) as report_count,
      MIN(er.created_at) as report_created_at
    FROM user_entries e
    LEFT JOIN entry_reports er ON e.id = er.entry_id
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE e.user_id = ?
    GROUP BY e.id
    HAVING report_count > 0
    ORDER BY report_created_at DESC
  `);

  const entries = stmt.all(userId) as Array<{
    id: number;
    description: string;
    photo_url: string | null;
    points: number;
    created_at: string;
    is_invalidated: boolean;
    report_count: number;
    report_created_at: string | null;
  }>;

  return entries.map(e => ({
    ...e,
    created_at: toUTCDate(e.created_at)!,
    report_created_at: toUTCDate(e.report_created_at),
  }));
}

/**
 * Busca estatísticas de votação para um usuário
 */
export async function getVotingStats(userId: number): Promise<{
  entriesAvailableToVote: number;
  myInvalidatedEntries: number;
  totalInvalidatedEntries: number;
  myTotalReports: number;
}> {
  const availableStmt = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM user_entries e
    WHERE e.user_id != ?
      AND e.id NOT IN (
        SELECT entry_id FROM entry_reports WHERE reporter_user_id = ?
      )
  `);
  const availableResult = availableStmt.get(userId, userId) as { count: number };

  const myInvalidatedStmt = getDb().prepare(`
    SELECT COUNT(*) as count FROM user_entries
    WHERE user_id = ? AND is_invalidated = TRUE
  `);
  const myInvalidatedResult = myInvalidatedStmt.get(userId) as { count: number };

  const totalInvalidatedStmt = getDb().prepare(`
    SELECT COUNT(*) as count FROM user_entries
    WHERE is_invalidated = TRUE
  `);
  const totalInvalidatedResult = totalInvalidatedStmt.get() as { count: number };

  const myReportsStmt = getDb().prepare(`
    SELECT COUNT(*) as count FROM entry_reports
    WHERE reporter_user_id = ?
  `);
  const myReportsResult = myReportsStmt.get(userId) as { count: number };

  return {
    entriesAvailableToVote: availableResult.count,
    myInvalidatedEntries: myInvalidatedResult.count,
    totalInvalidatedEntries: totalInvalidatedResult.count,
    myTotalReports: myReportsResult.count,
  };
}

/**
 * Busca todas as entradas que o usuário reportou
 */
export async function getMyReports(
  userId: number
): Promise<Array<{
  id: number;
  entry_id: number;
  entry_description: string;
  entry_photo_url: string | null;
  entry_points: number;
  entry_created_at: string;
  entry_is_invalidated: boolean;
  report_created_at: string;
  owner_username: string;
  report_count: number;
}>> {
  const stmt = getDb().prepare(`
    SELECT
      er.id,
      er.entry_id,
      e.description as entry_description,
      e.photo_url as entry_photo_url,
      at.base_points as entry_points,
      e.created_at as entry_created_at,
      e.is_invalidated as entry_is_invalidated,
      er.created_at as report_created_at,
      u.username as owner_username,
      (SELECT COUNT(*) FROM entry_reports er2 WHERE er2.entry_id = er.entry_id) as report_count
    FROM entry_reports er
    INNER JOIN user_entries e ON er.entry_id = e.id
    INNER JOIN users u ON e.user_id = u.id
    INNER JOIN activity_types at ON e.activity_type_id = at.id
    WHERE er.reporter_user_id = ?
    ORDER BY er.created_at DESC
  `);

  const reports = stmt.all(userId) as Array<{
    id: number;
    entry_id: number;
    entry_description: string;
    entry_photo_url: string | null;
    entry_points: number;
    entry_created_at: string;
    entry_is_invalidated: boolean;
    report_created_at: string;
    owner_username: string;
    report_count: number;
  }>;

  return reports.map(r => ({
    ...r,
    entry_created_at: toUTCDate(r.entry_created_at)!,
    report_created_at: toUTCDate(r.report_created_at)!,
  }));
}
