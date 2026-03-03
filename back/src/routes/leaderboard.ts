import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { findUserById } from '../services/user.service';
import { getUserTotalPoints, getUserEntriesCount } from '../services/points.service';
import { getUserEntriesForLeaderboard } from '../services/entry.service';
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
    // Busca apenas usuários ativos (não excluídos)
    const usersStmt = db.prepare('SELECT id, username FROM users WHERE deleted_at IS NULL');
    const users = usersStmt.all() as Array<{ id: number; username: string }>;

    // Calcula pontos totais para cada usuário considerando limite diário
    const usersWithPoints = await Promise.all(
      users.map(async (user) => {
        const totalPoints = await getUserTotalPoints(user.id);
        const entriesCount = await getUserEntriesCount(user.id);
        return {
          id: user.id,
          username: user.username,
          total_points: totalPoints,
          valid_entries_count: entriesCount,
        };
      })
    );

    // Ordena por pontos (decrescente) e depois por username (crescente)
    usersWithPoints.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      return a.username.localeCompare(b.username);
    });

    return c.json({ leaderboard: usersWithPoints });
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

// Listar todos os usuários (público) - inclui excluídos
leaderboard.get('/users', async (c) => {
  try {
    const usersStmt = db.prepare('SELECT id, username, created_at, deleted_at FROM users ORDER BY username ASC');
    const users = usersStmt.all() as Array<{ id: number; username: string; created_at: string; deleted_at: string | null }>;

    const usersWithPoints = await Promise.all(
      users.map(async (user) => {
        const totalPoints = await getUserTotalPoints(user.id);
        return {
          id: user.id,
          username: user.username,
          created_at: user.created_at,
          total_points: totalPoints,
          deleted_at: user.deleted_at,
        };
      })
    );

    usersWithPoints.sort((a, b) => a.username.localeCompare(b.username));

    return c.json({ users: usersWithPoints });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default leaderboard;
