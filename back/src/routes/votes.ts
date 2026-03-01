import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { getEntryById } from '../services/entry.service';
import { addVote, hasUserVoted, checkAndUpdateValidation, getValidationStatus } from '../services/votes.service';

const votes = new Hono();

// Middleware de autenticação para todas as rotas
votes.use('*', async (c, next) => {
  const authRequest = c.req.raw as unknown as AuthRequest;
  const error = await authMiddleware(authRequest);
  if (error) {
    return error;
  }
  await next();
});

// Votar em uma entrada (LEGACY - redireciona para activity-type vote)
votes.post('/', async (c) => {
  return c.json({ 
    error: 'Votação agora é feita em activity-types. Use /api/activity-types/:id/vote',
  }, 400);
});

// Status de validação de uma entrada (LEGACY)
votes.get('/entry/:id', async (c) => {
  return c.json({ 
    error: 'Votação agora é feita em activity-types. Use /api/activity-types/:id/validation-status',
  }, 400);
});

export default votes;
