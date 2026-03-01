import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { findUserById } from '../services/user.service';
import { getUserTotalPoints, getUserEntriesCount } from '../services/points.service';
import { getEntriesByUser, getUserEntriesForLeaderboard } from '../services/entry.service';
import { db } from '../db';

const leaderboard = new Hono();

// Middleware de autenticação para todas as rotas (exceto leaderboard público)
leaderboard.use('/users/:id/entries', async (c, next) => {
  const authRequest = c.req.raw as unknown as AuthRequest;
  const error = await authMiddleware(authRequest);
  if (error) {
    return error;
  }
  await next();
});

// Leaderboard - ranking de usuários por pontos (público)
leaderboard.get('/', async (c) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.username,
        COALESCE(SUM(e.points), 0) as total_points,
        COUNT(CASE WHEN at.is_validated = TRUE THEN 1 END) as valid_entries_count
      FROM users u
      LEFT JOIN user_entries e ON u.id = e.user_id
      LEFT JOIN activity_types at ON e.activity_type_id = at.id AND at.is_validated = TRUE
      GROUP BY u.id, u.username
      ORDER BY total_points DESC, u.username ASC
    `);
    
    const users = stmt.all() as Array<{
      id: number;
      username: string;
      total_points: number;
      valid_entries_count: number;
    }>;

    return c.json({ leaderboard: users });
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Entradas de um usuário específico (para visualização pública)
leaderboard.get('/users/:id/entries', async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));
    
    if (isNaN(userId)) {
      return c.json({ error: 'ID de usuário inválido' }, 400);
    }

    const user = await findUserById(userId);
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    const entries = await getUserEntriesForLeaderboard(userId);

    return c.json({
      user: {
        id: user.id,
        username: user.username,
      },
      entries,
    });
  } catch (error) {
    console.error('Erro ao buscar entradas do usuário:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar todos os usuários (público)
leaderboard.get('/users', async (c) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.created_at,
        COALESCE(SUM(e.points), 0) as total_points
      FROM users u
      LEFT JOIN user_entries e ON u.id = e.user_id
      LEFT JOIN activity_types at ON e.activity_type_id = at.id AND at.is_validated = TRUE
      GROUP BY u.id, u.username, u.created_at
      ORDER BY u.username ASC
    `);
    
    const users = stmt.all() as Array<{
      id: number;
      username: string;
      created_at: string;
      total_points: number;
    }>;

    return c.json({ users });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default leaderboard;
