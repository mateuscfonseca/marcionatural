import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import {
  getProjectsByUser,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  logProjectTime,
  getWeeklyProgress,
  getCurrentWeekProgress,
  getProjectTotalPoints,
  getUserProjectsWithProgress,
  getUserProjectsWithAllLogs,
  getProjectsByWeek,
} from '../services/projects.service';

const projects = new Hono();

// Middleware de autenticação para todas as rotas
projects.use('*', async (c, next) => {
  const authRequest = c.req.raw as unknown as AuthRequest;
  const error = await authMiddleware(authRequest);
  if (error) {
    return error;
  }
  await next();
});

// Listar meus projetos
projects.get('/', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    
    const projects = await getProjectsByUser(userId);
    
    // Adiciona pontos totais de cada projeto
    const projectsWithPoints = await Promise.all(
      projects.map(async (project) => {
        const points = await getProjectTotalPoints(userId, project.id);
        return { ...project, total_points: points };
      })
    );

    return c.json({ projects: projectsWithPoints });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Criar novo projeto
projects.post('/', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const body = await c.req.json();
    const { name, description, weeklyHoursGoal } = body;

    if (!name || !weeklyHoursGoal) {
      return c.json({ error: 'Nome e meta semanal são obrigatórios' }, 400);
    }

    if (weeklyHoursGoal < 1) {
      return c.json({ error: 'Meta semanal deve ser pelo menos 1 hora' }, 400);
    }

    const project = await createProject(userId, name, description || '', weeklyHoursGoal);

    return c.json({ message: 'Projeto criado com sucesso', project }, 201);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Detalhes de um projeto
projects.get('/:id', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const projectId = parseInt(c.req.param('id'));

    if (isNaN(projectId)) {
      return c.json({ error: 'ID de projeto inválido' }, 400);
    }

    const project = await getProjectById(projectId, userId);
    if (!project) {
      return c.json({ error: 'Projeto não encontrado' }, 404);
    }

    const points = await getProjectTotalPoints(userId, projectId);

    return c.json({ project: { ...project, total_points: points } });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Atualizar projeto
projects.put('/:id', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const projectId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { name, description, weeklyHoursGoal, isActive } = body;

    if (isNaN(projectId)) {
      return c.json({ error: 'ID de projeto inválido' }, 400);
    }

    const project = await getProjectById(projectId, userId);
    if (!project) {
      return c.json({ error: 'Projeto não encontrado' }, 404);
    }

    const updated = await updateProject(
      projectId,
      userId,
      name,
      description,
      weeklyHoursGoal,
      isActive
    );

    return c.json({ message: 'Projeto atualizado com sucesso', project: updated });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Deletar projeto
projects.delete('/:id', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const projectId = parseInt(c.req.param('id'));

    if (isNaN(projectId)) {
      return c.json({ error: 'ID de projeto inválido' }, 400);
    }

    const deleted = await deleteProject(projectId, userId);
    if (!deleted) {
      return c.json({ error: 'Erro ao deletar projeto' }, 500);
    }

    return c.json({ message: 'Projeto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Registrar tempo diário
projects.post('/:id/log', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const projectId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { durationMinutes, date } = body;

    if (isNaN(projectId)) {
      return c.json({ error: 'ID de projeto inválido' }, 400);
    }

    if (!durationMinutes || durationMinutes < 1) {
      return c.json({ error: 'Duração deve ser pelo menos 1 minuto' }, 400);
    }

    const project = await getProjectById(projectId, userId);
    if (!project) {
      return c.json({ error: 'Projeto não encontrado' }, 404);
    }

    const log = await logProjectTime(userId, projectId, durationMinutes, date);

    return c.json({ message: 'Tempo registrado com sucesso', log });
  } catch (error) {
    console.error('Erro ao registrar tempo:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Progresso semanal de um projeto
projects.get('/:id/weekly-progress', async (c) => {
  try {
    const authRequest = c.req.raw as unknown as AuthRequest;
    const userId = authRequest.user!.userId;
    const projectId = parseInt(c.req.param('id'));
    const weekNumber = c.req.query('week');
    const year = c.req.query('year');

    if (isNaN(projectId)) {
      return c.json({ error: 'ID de projeto inválido' }, 400);
    }

    const project = await getProjectById(projectId, userId);
    if (!project) {
      return c.json({ error: 'Projeto não encontrado' }, 404);
    }

    let progress;
    if (weekNumber && year) {
      progress = await getWeeklyProgress(userId, projectId, parseInt(weekNumber), parseInt(year));
    } else {
      progress = await getCurrentWeekProgress(userId, projectId);
    }

    return c.json({ progress });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Projetos de um usuário com progresso (para visualização pública)
projects.get('/user/:userId/with-progress', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));

    if (isNaN(userId)) {
      return c.json({ error: 'ID de usuário inválido' }, 400);
    }

    const projects = await getUserProjectsWithProgress(userId);

    return c.json({ projects });
  } catch (error) {
    console.error('Erro ao buscar projetos com progresso:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Projetos de um usuário com todos os logs históricos (para auditoria)
projects.get('/user/:userId/all-logs', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));

    if (isNaN(userId)) {
      return c.json({ error: 'ID de usuário inválido' }, 400);
    }

    const projects = await getUserProjectsWithAllLogs(userId);

    return c.json({ projects });
  } catch (error) {
    console.error('Erro ao buscar logs de projetos:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Projetos de um usuário com logs de uma semana específica (para auditoria de semana perfeita)
projects.get('/user/:userId/week/:weekNumber/:year', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    const weekNumber = parseInt(c.req.param('weekNumber'));
    const year = parseInt(c.req.param('year'));

    if (isNaN(userId) || isNaN(weekNumber) || isNaN(year)) {
      return c.json({ error: 'Parâmetros inválidos' }, 400);
    }

    const projects = await getProjectsByWeek(userId, weekNumber, year);

    return c.json({ projects });
  } catch (error) {
    console.error('Erro ao buscar projetos da semana:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default projects;
