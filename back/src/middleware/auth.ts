import type { JWTPayload } from '../utils/jwt';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export async function authMiddleware(request: AuthRequest): Promise<Response | null> {
  const cookieHeader = request.headers.get('Cookie');
  
  if (!cookieHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extrai o token do cookie
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('auth_token='));
  
  if (!tokenCookie) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = tokenCookie.split('=')[1];
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  request.user = payload;
  return null;
}

export function skipAuth(_request: Request): boolean {
  const publicPaths = ['/api/auth/register', '/api/auth/login'];
  return publicPaths.some(path => _request.url.endsWith(path));
}
