import { SignJWT, type JWTPayload as JoseJWTPayload } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'marcionatural-secret-key-change-in-production'
);

const EXPIRATION_TIME = '24h';

export interface JWTPayload {
  userId: number;
  username: string;
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION_TIME)
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

async function jwtVerify(token: string, key: Uint8Array) {
  const { jwtVerify: verify } = await import('jose');
  return verify(token, key);
}
