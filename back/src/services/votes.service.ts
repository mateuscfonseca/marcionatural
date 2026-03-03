import { getDb } from '../db-provider';
import { recalculateUserPointsAfterInvalidation } from './points.service';

export interface ActivityTypeVote {
  id: number;
  user_id: number;
  activity_type_id: number;
  vote_type: number; // 1 = positivo, -1 = negativo
  created_at: string;
}

export interface ValidationStatus {
  totalVotes: number;
  positiveVotes: number;
  negativeVotes: number;
  isValidated: boolean;
  isInvalidated: boolean;
  negativePercentage: number;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

/**
 * Converte array de votos para formato UTC ISO 8601
 */
function normalizeVotes(votes: ActivityTypeVote[]): ActivityTypeVote[] {
  return votes.map(v => ({
    ...v,
    created_at: toUTCDate(v.created_at)!,
  }));
}

export async function getVotesByActivityType(activityTypeId: number): Promise<ActivityTypeVote[]> {
  const stmt = getDb().prepare('SELECT * FROM activity_type_votes WHERE activity_type_id = ?');
  const votes = stmt.all(activityTypeId) as ActivityTypeVote[];
  return normalizeVotes(votes);
}

export async function hasUserVoted(userId: number, activityTypeId: number): Promise<boolean> {
  const stmt = getDb().prepare('SELECT 1 FROM activity_type_votes WHERE user_id = ? AND activity_type_id = ?');
  const result = stmt.get(userId, activityTypeId);
  return !!result;
}

export async function addVote(
  userId: number,
  activityTypeId: number,
  voteType: number
): Promise<ActivityTypeVote> {
  const stmt = getDb().prepare(`
    INSERT INTO activity_type_votes (user_id, activity_type_id, vote_type)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, activityTypeId, voteType);

  return {
    id: result.lastInsertRowid as number,
    user_id: userId,
    activity_type_id: activityTypeId,
    vote_type: voteType,
    created_at: new Date().toISOString(),
  };
}

/**
 * Verifica e atualiza status de validação de um activity_type
 * 50%+1 de votos negativos invalida o activity_type
 */
export async function checkAndUpdateValidation(
  activityTypeId: number
): Promise<{ invalidated: boolean; status: ValidationStatus }> {
  const votes = await getVotesByActivityType(activityTypeId);

  if (votes.length === 0) {
    const status: ValidationStatus = {
      totalVotes: 0,
      positiveVotes: 0,
      negativeVotes: 0,
      isValidated: true,
      isInvalidated: false,
      negativePercentage: 0,
    };
    return { invalidated: false, status };
  }

  const negativeVotes = votes.filter(v => v.vote_type === -1).length;
  const totalVotes = votes.length;
  const positiveVotes = votes.filter(v => v.vote_type === 1).length;

  // 50% + 1 de votos negativos invalida
  const threshold = Math.floor(totalVotes / 2) + 1;
  const shouldInvalidate = negativeVotes >= threshold;

  // Busca status atual
  const currentStatusStmt = getDb().prepare('SELECT is_validated FROM activity_types WHERE id = ?');
  const currentStatus = currentStatusStmt.get(activityTypeId) as { is_validated: boolean } | undefined;
  const currentlyValidated = currentStatus?.is_validated ?? true;

  let invalidated = false;

  // Atualiza status se necessário
  if (shouldInvalidate && currentlyValidated) {
    const updateStmt = getDb().prepare('UPDATE activity_types SET is_validated = FALSE WHERE id = ?');
    updateStmt.run(activityTypeId);
    invalidated = true;

    // Zera pontos de entradas com este activity_type
    await recalculateUserPointsAfterInvalidation(activityTypeId);
  }

  const status: ValidationStatus = {
    totalVotes,
    positiveVotes,
    negativeVotes,
    isValidated: !shouldInvalidate,
    isInvalidated: shouldInvalidate,
    negativePercentage: (negativeVotes / totalVotes) * 100,
  };

  return { invalidated, status };
}

export async function getValidationStatus(activityTypeId: number): Promise<ValidationStatus> {
  const votes = await getVotesByActivityType(activityTypeId);

  if (votes.length === 0) {
    return {
      totalVotes: 0,
      positiveVotes: 0,
      negativeVotes: 0,
      isValidated: true,
      isInvalidated: false,
      negativePercentage: 0,
    };
  }

  const negativeVotes = votes.filter(v => v.vote_type === -1).length;
  const positiveVotes = votes.filter(v => v.vote_type === 1).length;
  const totalVotes = votes.length;

  // Busca status atual do activity_type
  const statusStmt = getDb().prepare('SELECT is_validated FROM activity_types WHERE id = ?');
  const activityType = statusStmt.get(activityTypeId) as { is_validated: boolean } | undefined;
  const isValidated = activityType?.is_validated ?? true;

  return {
    totalVotes,
    positiveVotes,
    negativeVotes,
    isValidated,
    isInvalidated: !isValidated,
    negativePercentage: (negativeVotes / totalVotes) * 100,
  };
}
