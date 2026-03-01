import { db } from '../db';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as User | undefined;
}

export async function findUserById(id: number): Promise<User | undefined> {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
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
