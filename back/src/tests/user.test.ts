import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData } from '../test-db';
import {
  findUserByUsername,
  findUserById,
  createUser,
  getAllUsers,
  getAllUsersWithDeleted,
  updateUserPassword,
  softDeleteUser,
  restoreUser,
} from '../services/user.service';

describe('User Service', () => {
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
  });

  test('deve criar usuário', async () => {
    const user = await createUser('testuser', 'hash123');
    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
  });

  test('deve buscar usuário por username', async () => {
    await createUser('finduser', 'hash123');
    const user = await findUserByUsername('finduser');
    expect(user).toBeDefined();
    expect(user?.username).toBe('finduser');
  });

  test('deve retornar undefined para username inexistente', async () => {
    const user = await findUserByUsername('naoexiste');
    expect(user).toBeUndefined();
  });

  test('deve buscar usuário por ID', async () => {
    const created = await createUser('findbyid', 'hash123');
    const user = await findUserById(created.id);
    expect(user).toBeDefined();
    expect(user?.id).toBe(created.id);
  });

  test('deve retornar undefined para ID inexistente', async () => {
    const user = await findUserById(9999);
    expect(user).toBeUndefined();
  });

  test('deve retornar todos os usuários ativos', async () => {
    await createUser('user1', 'hash1');
    await createUser('user2', 'hash2');
    const users = await getAllUsers();
    expect(users.length).toBeGreaterThanOrEqual(2);
  });

  test('deve retornar usuários incluindo excluídos', async () => {
    const created = await createUser('deleteduser', 'hash123');
    await softDeleteUser(created.id);
    const users = await getAllUsersWithDeleted();
    const deletedUser = users.find(u => u.id === created.id);
    expect(deletedUser).toBeDefined();
    expect(deletedUser?.deleted_at).not.toBeNull();
  });

  test('deve atualizar senha do usuário', async () => {
    const created = await createUser('passworduser', 'oldhash');
    const updated = await updateUserPassword(created.id, 'newhash');
    expect(updated).toBe(true);
    const user = await findUserById(created.id);
    expect(user?.password_hash).toBe('newhash');
  });

  test('deve fazer soft delete do usuário', async () => {
    const created = await createUser('softdelete', 'hash123');
    const deleted = await softDeleteUser(created.id);
    expect(deleted).toBe(true);
    const user = await findUserById(created.id);
    expect(user?.deleted_at).not.toBeNull();
  });

  test('deve reativar usuário excluído', async () => {
    const created = await createUser('restore', 'hash123');
    await softDeleteUser(created.id);
    const restored = await restoreUser(created.id);
    expect(restored).toBe(true);
    const user = await findUserById(created.id);
    expect(user?.deleted_at).toBeNull();
  });
});
