import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initDatabase } from './db';
import { MigrationManager } from './migrations';
import authRoutes from './routes/auth';
import leaderboardRoutes from './routes/leaderboard';
import entriesRoutes from './routes/entries';
import votesRoutes from './routes/votes';
import activityTypesRoutes from './routes/activity-types';
import projectsRoutes from './routes/projects';
import uploadRoutes from './routes/upload';
import { join } from 'path';
import { existsSync } from 'fs';

// Inicializa banco de dados (schema + seeds)
initDatabase();

// Executa migrações pendentes
MigrationManager.runAll();

const app = new Hono();

// Middlewares globais
app.use('*', logger());

// CORS para todas as rotas da API
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:80'],
  credentials: true,
}));

// Rotas de autenticação (públicas)
app.route('/api/auth', authRoutes);

// Rotas da API
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/entries', entriesRoutes);
app.route('/api/votes', votesRoutes);
app.route('/api/activity-types', activityTypesRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir imagens estáticas (desenvolvimento)
// Em produção, o Caddy serve diretamente da pasta compartilhada
app.get('/images/:filename', async (c) => {
  // CORS headers para imagens
  c.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  c.header('Access-Control-Allow-Credentials', 'true');

  const filename = c.req.param('filename');
  const filePath = join(process.cwd(), 'uploads', 'images', filename);

  if (!existsSync(filePath)) {
    return c.json({ error: 'Imagem não encontrada' }, 404);
  }

  const file = Bun.file(filePath);
  c.header('Cache-Control', 'public, max-age=31536000');
  c.header('Content-Type', 'image/webp');
  return c.body(file.stream());
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Não encontrado' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Erro não tratado:', err);
  return c.json({ error: 'Erro interno do servidor' }, 500);
});

console.log('🚀 Servidor rodando em http://localhost:3000');

export default {
  port: 3000,
  fetch: app.fetch,
};
