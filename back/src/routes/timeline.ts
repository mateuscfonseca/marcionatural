import { Hono } from 'hono';
import { getTimelineEntries, getTimelineEntriesCount } from '../services/timeline.service';

const timeline = new Hono();

// Timeline pública - feed de atividades
timeline.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const days = c.req.query('days') ? parseInt(c.req.query('days')!) : undefined;

    // Validações
    if (limit < 1 || limit > 100) {
      return c.json({ error: 'O limite deve estar entre 1 e 100' }, 400);
    }

    if (offset < 0) {
      return c.json({ error: 'Offset inválido' }, 400);
    }

    const entries = await getTimelineEntries(limit, offset, days);
    const total = await getTimelineEntriesCount(days);

    return c.json({
      entries,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + entries.length < total,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default timeline;
