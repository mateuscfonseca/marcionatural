import { getDb } from '../db-provider';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const stmt = getDb().prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as User | undefined;
  if (!user) return undefined;
  return {
    ...user,
    created_at: toUTCDate(user.created_at)!,
    deleted_at: toUTCDate(user.deleted_at),
  };
}

export async function findUserById(id: number): Promise<User | undefined> {
  const stmt = getDb().prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as User | undefined;
  if (!user) return undefined;
  return {
    ...user,
    created_at: toUTCDate(user.created_at)!,
    deleted_at: toUTCDate(user.deleted_at),
  };
}

/**
 * Busca usuário incluindo excluídos (para reativação)
 */
export async function findDeletedUserById(id: number): Promise<User | undefined> {
  const stmt = getDb().prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as User | undefined;
  if (!user) return undefined;
  return {
    ...user,
    created_at: toUTCDate(user.created_at)!,
    deleted_at: toUTCDate(user.deleted_at),
  };
}

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const stmt = getDb().prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const result = stmt.run(username, passwordHash);
  return {
    id: result.lastInsertRowid as number,
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
    deleted_at: null,
  };
}

export async function getAllUsers(): Promise<Array<{ id: number; username: string }>> {
  const stmt = getDb().prepare('SELECT id, username FROM users WHERE deleted_at IS NULL ORDER BY username ASC');
  const users = stmt.all() as Array<{ id: number; username: string }>;
  return users;
}

/**
 * Busca todos os usuários incluindo excluídos
 */
export async function getAllUsersWithDeleted(): Promise<
  Array<{ id: number; username: string; deleted_at: string | null }>
> {
  const stmt = getDb().prepare('SELECT id, username, deleted_at FROM users ORDER BY username ASC');
  const users = stmt.all() as Array<{ id: number; username: string; deleted_at: string | null }>;
  return users;
}

export async function updateUserPassword(userId: number, newPasswordHash: string): Promise<boolean> {
  const stmt = getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  const result = stmt.run(newPasswordHash, userId);
  return result.changes > 0;
}

/**
 * Exclusão lógica de usuário
 */
export async function softDeleteUser(userId: number): Promise<boolean> {
  const stmt = getDb().prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL');
  const result = stmt.run(userId);
  return result.changes > 0;
}

/**
 * Reativar usuário excluído
 */
export async function restoreUser(userId: number): Promise<boolean> {
  const stmt = getDb().prepare('UPDATE users SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL');
  const result = stmt.run(userId);
  return result.changes > 0;
}
