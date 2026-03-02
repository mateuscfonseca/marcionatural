import { db } from '../db';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

/**
 * Converte data do SQLite (sem timezone) para ISO 8601 com Z (UTC)
 */
function toUTCDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'Z').toISOString();
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as User | undefined;
  if (!user) return undefined;
  return {
    ...user,
    created_at: toUTCDate(user.created_at)!,
  };
}

export async function findUserById(id: number): Promise<User | undefined> {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as User | undefined;
  if (!user) return undefined;
  return {
    ...user,
    created_at: toUTCDate(user.created_at)!,
  };
}

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const result = stmt.run(username, passwordHash);
  return {
    id: result.lastInsertRowid as number,
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
}
