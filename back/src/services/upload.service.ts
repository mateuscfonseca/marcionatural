import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface UploadedImage {
  identifier: string;
  originalName: string;
  url: string;
  path: string;
}

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'images');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Garante que o diretório de uploads existe
 */
async function ensureUploadsDir(): Promise<void> {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Valida o arquivo de imagem
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Valida MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  // Valida tamanho
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Tamanho máximo: 5MB',
    };
  }

  return { valid: true };
}

/**
 * Processa e salva imagem como WebP
 */
export async function processAndSaveImage(
  file: File
): Promise<UploadedImage> {
  // Valida arquivo
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Garante diretório
  await ensureUploadsDir();

  // Gera nome único
  const identifier = `${uuidv4()}.webp`;
  const outputPath = join(UPLOADS_DIR, identifier);

  // Lê o arquivo como ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Processa com sharp e converte para WebP
  await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
      effort: 6,
    })
    .toFile(outputPath);

  return {
    identifier,
    originalName: file.name,
    url: `/images/${identifier}`,
    path: outputPath,
  };
}

/**
 * Deleta uma imagem pelo identifier
 */
export async function deleteImage(identifier: string): Promise<boolean> {
  try {
    const { unlink } = await import('fs/promises');
    const filePath = join(UPLOADS_DIR, identifier);
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return false;
  }
}

/**
 * Busca imagem por identifier
 */
export async function getImagePath(identifier: string): Promise<string | null> {
  const { existsSync } = await import('fs');
  const filePath = join(UPLOADS_DIR, identifier);

  if (existsSync(filePath)) {
    return filePath;
  }

  return null;
}
