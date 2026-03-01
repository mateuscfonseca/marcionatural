import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import {
  getEntryById,
  getEntriesByUser,
  createEntry,
  updateEntry,
  deleteEntry,
  getUserEntriesWithDetails,
  getUserEntriesForLeaderboard,
} from '../services/entry.service';
import { getActivityTypesForUser } from '../services/activity-type.service';
import {
  createEntryReport,
  removeEntryReport,
  hasUserReported,
  checkAndUpdateInvalidation,
  getEntriesAvailableToReport,
  getInvalidatedEntries,
  getUserInvalidatedEntries,
  getVotingStats,
  getReportsByEntryWithDetails,
} from '../services/entry-report.service';

const entries = new Hono();

// Middleware de autenticação para todas as rotas
entries.use('*', async (c, next) => {
  const authRequest = c.req.raw as unknown as AuthRequest;
  const error = await authMiddleware(authRequest);
  if (error) {
    return error;
  }
  await next();
});

// Listar minhas entradas
entries.get('/', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entries = await getUserEntriesWithDetails(userId);
    return c.json({ entries });
  } catch (error) {
    console.error('Erro ao buscar entradas:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Buscar entrada específica (apenas se for do usuário)
entries.get('/:id', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entryId = parseInt(c.req.param('id'));

    if (isNaN(entryId)) {
      return c.json({ error: 'ID de entrada inválido' }, 400);
    }

    const entry = await getEntryById(entryId);
    if (!entry) {
      return c.json({ error: 'Entrada não encontrada' }, 404);
    }

    if (entry.user_id !== userId) {
      return c.json({ error: 'Acesso não permitido' }, 403);
    }

    return c.json({ entry });
  } catch (error) {
    console.error('Erro ao buscar entrada:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Criar nova entrada
entries.post('/', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const body = await c.req.json();
    const { activityTypeId, description, photoUrl, durationMinutes } = body;

    if (!activityTypeId || !description) {
      return c.json({ error: 'Tipo de atividade e descrição são obrigatórios' }, 400);
    }

    const entry = await createEntry({
      userId,
      activityTypeId,
      description,
      photoUrl,
      durationMinutes,
    });

    return c.json({ message: 'Entrada criada com sucesso', entry }, 201);
  } catch (error) {
    console.error('Erro ao criar entrada:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Atualizar entrada (apenas se for do usuário)
entries.put('/:id', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entryId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { description, photoUrl, durationMinutes } = body;

    if (isNaN(entryId)) {
      return c.json({ error: 'ID de entrada inválido' }, 400);
    }

    const entry = await getEntryById(entryId);
    if (!entry) {
      return c.json({ error: 'Entrada não encontrada' }, 404);
    }

    if (entry.user_id !== userId) {
      return c.json({ error: 'Acesso não permitido' }, 403);
    }

    const updatedEntry = await updateEntry(entryId, {
      description,
      photoUrl,
      durationMinutes,
    });

    return c.json({ message: 'Entrada atualizada com sucesso', entry: updatedEntry });
  } catch (error) {
    console.error('Erro ao atualizar entrada:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Deletar entrada (apenas se for do usuário)
entries.delete('/:id', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entryId = parseInt(c.req.param('id'));

    if (isNaN(entryId)) {
      return c.json({ error: 'ID de entrada inválido' }, 400);
    }

    const entry = await getEntryById(entryId);
    if (!entry) {
      return c.json({ error: 'Entrada não encontrada' }, 404);
    }

    if (entry.user_id !== userId) {
      return c.json({ error: 'Acesso não permitido' }, 403);
    }

    const deleted = await deleteEntry(entryId);
    if (!deleted) {
      return c.json({ error: 'Erro ao deletar entrada' }, 500);
    }

    return c.json({ message: 'Entrada deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar entrada:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Activity types disponíveis para o usuário
entries.get('/activity-types/options', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;

    const types = await getActivityTypesForUser(userId);
    return c.json({ activityTypes: types });
  } catch (error) {
    console.error('Erro ao buscar activity types:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// ===== ROTAS DE REPORT/VOTAÇÃO =====

// Reportar entrada como suspeita
entries.post('/:id/report', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entryId = parseInt(c.req.param('id'));

    if (isNaN(entryId)) {
      return c.json({ error: 'ID de entrada inválido' }, 400);
    }

    // Verifica se já reportou
    const alreadyReported = await hasUserReported(userId, entryId);
    if (alreadyReported) {
      return c.json({ error: 'Você já reportou esta entrada' }, 409);
    }

    // Cria report
    const report = await createEntryReport(entryId, userId);

    // Verifica e atualiza invalidação (≥3 reports)
    const { invalidated, reportCount } = await checkAndUpdateInvalidation(entryId);

    return c.json({
      message: 'Report registrado com sucesso',
      report,
      invalidated,
      reportCount,
    }, 201);
  } catch (error) {
    console.error('Erro ao registrar report:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Remover meu report
entries.delete('/:id/report', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entryId = parseInt(c.req.param('id'));

    if (isNaN(entryId)) {
      return c.json({ error: 'ID de entrada inválido' }, 400);
    }

    const removed = await removeEntryReport(entryId, userId);

    if (!removed) {
      return c.json({ error: 'Report não encontrado' }, 404);
    }

    return c.json({ message: 'Report removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover report:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar entradas disponíveis para reportar (que você ainda não reportou)
entries.get('/voting/available', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;

    const entries = await getEntriesAvailableToReport(userId);
    return c.json({ entries });
  } catch (error) {
    console.error('Erro ao buscar entradas para votar:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar todas as entradas invalidadas
entries.get('/voting/invalidated', async (c) => {
  try {
    const invalidated = await getInvalidatedEntries();
    return c.json({ entries: invalidated });
  } catch (error) {
    console.error('Erro ao buscar entradas invalidadas:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar minhas entradas invalidadas
entries.get('/voting/my-invalidated', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;

    const invalidated = await getUserInvalidatedEntries(userId);
    return c.json({ entries: invalidated });
  } catch (error) {
    console.error('Erro ao buscar minhas entradas invalidadas:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Estatísticas de votação
entries.get('/voting/stats', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;

    const stats = await getVotingStats(userId);
    return c.json({ stats });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Ver reports de uma entrada (detalhes)
entries.get('/:id/reports', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const entryId = parseInt(c.req.param('id'));

    if (isNaN(entryId)) {
      return c.json({ error: 'ID de entrada inválido' }, 400);
    }

    const reports = await getReportsByEntryWithDetails(entryId);
    const hasReported = await hasUserReported(userId, entryId);

    return c.json({ reports, hasReported });
  } catch (error) {
    console.error('Erro ao buscar reports:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default entries;
