import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import {
  getAllActivityTypes,
  getActivityTypesByCategory,
  getActivityTypeById,
  createActivityType,
  findActivityTypeByName,
  getValidatedActivityTypes,
} from '../services/activity-type.service';
import { addVote, hasUserVoted, checkAndUpdateValidation, getValidationStatus } from '../services/votes.service';

const activityTypes = new Hono();

// Listar todos os activity types (público)
activityTypes.get('/', async (c) => {
  try {
    const types = await getAllActivityTypes();
    return c.json({ activityTypes: types });
  } catch (error) {
    console.error('Erro ao buscar activity types:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar activity types validados (para uso em entradas)
activityTypes.get('/validated', async (c) => {
  try {
    const types = await getValidatedActivityTypes();
    return c.json({ activityTypes: types });
  } catch (error) {
    console.error('Erro ao buscar activity types validados:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar por categoria
activityTypes.get('/category/:id', async (c) => {
  try {
    const categoryId = parseInt(c.req.param('id'));
    
    if (isNaN(categoryId)) {
      return c.json({ error: 'ID de categoria inválido' }, 400);
    }

    const types = await getActivityTypesByCategory(categoryId);
    return c.json({ activityTypes: types });
  } catch (error) {
    console.error('Erro ao buscar activity types:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Status de validação de um activity type
activityTypes.get('/:id/validation-status', async (c) => {
  try {
    const activityTypeId = parseInt(c.req.param('id'));

    if (isNaN(activityTypeId)) {
      return c.json({ error: 'ID inválido' }, 400);
    }

    const status = await getValidationStatus(activityTypeId);
    return c.json({ status });
  } catch (error) {
    console.error('Erro ao buscar status de validação:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Votar em um activity type (requer autenticação)
activityTypes.post('/:id/vote', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const activityTypeId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { voteType } = body;

    if (isNaN(activityTypeId)) {
      return c.json({ error: 'ID de activity type inválido' }, 400);
    }

    if (!voteType || ![-1, 1].includes(voteType)) {
      return c.json({ error: 'Tipo de voto deve ser 1 (positivo) ou -1 (negativo)' }, 400);
    }

    // Verifica se já votou
    const alreadyVoted = await hasUserVoted(userId, activityTypeId);
    if (alreadyVoted) {
      return c.json({ error: 'Você já votou neste activity type' }, 409);
    }

    // Adiciona voto
    const vote = await addVote(userId, activityTypeId, voteType);

    // Verifica e atualiza validação
    const { invalidated, status } = await checkAndUpdateValidation(activityTypeId);

    return c.json({
      message: 'Voto registrado com sucesso',
      vote,
      invalidated,
      status,
    });
  } catch (error) {
    console.error('Erro ao registrar voto:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Criar novo activity type (requer autenticação)
activityTypes.post('/', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const body = await c.req.json();
    const { name, categoryId, isPositive } = body;

    if (!name || !categoryId) {
      return c.json({ error: 'Nome e categoria são obrigatórios' }, 400);
    }

    // Verifica se já existe
    const existing = await findActivityTypeByName(name, categoryId);
    if (existing) {
      return c.json({ error: 'Activity type já existe' }, 409);
    }

    const type = await createActivityType(name, categoryId, isPositive, userId);

    return c.json({ message: 'Activity type criado com sucesso', activityType: type }, 201);
  } catch (error) {
    console.error('Erro ao criar activity type:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default activityTypes;
