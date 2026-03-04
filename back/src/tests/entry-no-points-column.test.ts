import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { createEntry, getEntryById, getEntriesByUser } from '../services/entry.service';

/**
 * Testes para garantir que a coluna points foi removida corretamente
 * e que as operações de entrada funcionam sem essa coluna.
 * 
 * Previne regressão onde o código tenta inserir/buscar a coluna points.
 */
describe('Entry Service - Sem Coluna Points', () => {
  const testUserId = 101;
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
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser_no_points', 'hash123']);
  });

  describe('Estrutura da Tabela', () => {
    test('deve verificar que coluna points NÃO existe na tabela user_entries', () => {
      const tableInfo = db.prepare("PRAGMA table_info(user_entries)").all() as Array<{ name: string }>;
      const hasPoints = tableInfo.some(col => col.name === 'points');
      expect(hasPoints).toBe(false);
    });

    test('deve ter todas as colunas necessárias exceto points', () => {
      const tableInfo = db.prepare("PRAGMA table_info(user_entries)").all() as Array<{ name: string }>;
      const columnNames = tableInfo.map(col => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('activity_type_id');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('entry_date');
      expect(columnNames).toContain('is_invalidated');
      expect(columnNames).toContain('created_at');
      
      // Verificar que points NÃO está na lista
      expect(columnNames).not.toContain('points');
    });
  });

  describe('createEntry', () => {
    test('deve criar entrada sem coluna points', async () => {
      const entry = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
        description: 'Teste sem points',
        entryDate: '2024-01-15',
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.description).toBe('Teste sem points');
      expect(entry.user_id).toBe(testUserId);
      expect(entry.activity_type_id).toBe(SEED_IDS.activityTypes.alimentacaoLimpa);
    });

    test('deve criar entrada de exercício sem coluna points', async () => {
      const entry = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
        description: 'Treino sem points',
        entryDate: '2024-01-16',
      });

      expect(entry).toBeDefined();
      expect(entry.description).toBe('Treino sem points');
    });

    test('deve criar entrada de entorpecentes sem coluna points', async () => {
      const entry = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.usarTabaco,
        description: 'Uso de tabaco',
        entryDate: '2024-01-17',
      });

      expect(entry).toBeDefined();
      expect(entry.description).toBe('Uso de tabaco');
      expect(entry.activity_type_id).toBe(SEED_IDS.activityTypes.usarTabaco);
    });

    test('deve criar entrada com todos os campos opcionais sem points', async () => {
      const entry = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
        description: 'Entrada completa',
        photoUrl: '/images/test.webp',
        photoIdentifier: 'test-uuid',
        photoOriginalName: 'test.jpg',
        durationMinutes: 30,
        entryDate: '2024-01-18',
      });

      expect(entry).toBeDefined();
      expect(entry.photo_url).toBe('/images/test.webp');
      expect(entry.duration_minutes).toBe(30);
    });
  });

  describe('getEntryById', () => {
    test('deve buscar entrada sem coluna points', async () => {
      // Cria entrada via SQL direto
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Teste busca', '2024-01-15']);

      const lastId = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
      const entry = await getEntryById(lastId.id);

      expect(entry).toBeDefined();
      expect(entry?.description).toBe('Teste busca');
      expect(entry?.activity_type_name).toBe('Alimentação Limpa');
    });

    test('deve retornar undefined para ID inexistente', async () => {
      const entry = await getEntryById(99999);
      expect(entry).toBeUndefined();
    });
  });

  describe('getEntriesByUser', () => {
    test('deve buscar entradas do usuário sem coluna points', async () => {
      // Cria múltiplas entradas
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Entrada 1', '2024-01-15']);

      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Entrada 2', '2024-01-16']);

      const entries = await getEntriesByUser(testUserId);

      expect(entries.length).toBe(2);
      // Ordenação é por created_at DESC, então a última criada vem primeiro
      expect(entries[0].description).toMatch(/Entrada [12]/);
      expect(entries[1].description).toMatch(/Entrada [12]/);
    });

    test('deve retornar array vazio quando usuário não tem entradas', async () => {
      const entries = await getEntriesByUser(testUserId);
      expect(entries).toEqual([]);
    });
  });

  describe('Integração com Cálculo de Pontos', () => {
    test('deve criar entrada e permitir cálculo dinâmico de pontos', async () => {
      const entry = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
        description: 'Almoço',
        entryDate: '2024-01-15',
      });

      // Verifica que a entrada foi criada
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();

      // Busca a entrada para verificar que os dados do activity_type estão disponíveis
      const fetchedEntry = await getEntryById(entry.id);
      expect(fetchedEntry).toBeDefined();
      expect(fetchedEntry?.category_id).toBe(SEED_IDS.categories.refeicao);
      expect(fetchedEntry?.is_activity_positive).toBe(1); // true em SQLite
    });
  });
});
