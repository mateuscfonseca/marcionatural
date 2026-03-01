import { Hono } from 'hono';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { processAndSaveImage } from '../services/upload.service';

const upload = new Hono();

// Middleware de autenticação para todas as rotas
upload.use('*', async (c, next) => {
  const authRequest = c.req.raw as unknown as AuthRequest;
  const error = await authMiddleware(authRequest);
  if (error) {
    return error;
  }
  await next();
});

// Upload de imagem
upload.post('/image', async (c) => {
  try {
    const body = await c.req.parseBody();
    const image = body['image'] as File;

    if (!image || !(image instanceof File)) {
      return c.json({ error: 'Arquivo de imagem é obrigatório' }, 400);
    }

    const uploadedImage = await processAndSaveImage(image);

    return c.json({
      message: 'Imagem uploadada com sucesso',
      image: {
        identifier: uploadedImage.identifier,
        originalName: uploadedImage.originalName,
        url: uploadedImage.url,
      },
    }, 201);
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload';
    return c.json({ error: errorMessage }, 400);
  }
});

export default upload;
