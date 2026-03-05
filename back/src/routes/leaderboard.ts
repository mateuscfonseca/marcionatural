import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { findUserById } from '../services/user.service';
import { getUserEntriesForLeaderboard } from '../services/entry.service';
import { getUserTotalPoints, getUserEntriesCount } from '../services/points.service';
import { getLeaderboardWithMovement, getLeaderboardHistory, getLeaderboardByDate } from '../services/leaderboard.service';
import { getDb } from '../db-provider';

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
// Query params:
// - compare=true: inclui movimentação comparada ao dia anterior
// - date=YYYY-MM-DD: leaderboard de uma data específica (com movimentação)
leaderboard.get('/', async (c) => {
  try {
    const compare = c.req.query('compare') === 'true';
    const date = c.req.query('date');

    // Se tem data específica, usa o service para buscar leaderboard da data
    if (date) {
      // Valida formato da data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return c.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, 400);
      }

      const leaderboardWithMovement = await getLeaderboardWithMovement(date);
      return c.json({
        leaderboard: leaderboardWithMovement,
        referenceDate: date,
      });
    }

    // Leaderboard atual
    if (compare) {
      const leaderboardWithMovement = await getLeaderboardWithMovement();
      return c.json({ leaderboard: leaderboardWithMovement });
    }

    // Leaderboard simples sem comparação
    const leaderboardData = await getLeaderboardByDate(
      new Date().toISOString().split('T')[0]
    );
    return c.json({ leaderboard: leaderboardData });
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Histórico de leaderboard para gráfico de evolução
// Query params:
// - weeks=1|2|3|4: número de semanas para retornar (padrão: 4)
leaderboard.get('/history', async (c) => {
  try {
    const weeksParam = c.req.query('weeks');
    const weeks = weeksParam ? parseInt(weeksParam) : 4;

    // Valida semanas
    if (isNaN(weeks) || weeks < 1 || weeks > 4) {
      return c.json({ error: 'Número de semanas deve estar entre 1 e 4' }, 400);
    }

    const history = await getLeaderboardHistory(weeks);
    return c.json({ history });
  } catch (error) {
    console.error('Erro ao buscar histórico do leaderboard:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Rota alternativa com trailing slash
leaderboard.get('/history/', async (c) => {
  try {
    const weeksParam = c.req.query('weeks');
    const weeks = weeksParam ? parseInt(weeksParam) : 4;

    if (isNaN(weeks) || weeks < 1 || weeks > 4) {
      return c.json({ error: 'Número de semanas deve estar entre 1 e 4' }, 400);
    }

    const history = await getLeaderboardHistory(weeks);
    return c.json({ history });
  } catch (error) {
    console.error('Erro ao buscar histórico do leaderboard:', error);
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
    const usersStmt = getDb().prepare('SELECT id, username, created_at, deleted_at FROM users ORDER BY username ASC');
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
