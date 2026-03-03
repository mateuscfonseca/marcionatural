import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../utils/jwt';
import {
  findUserByUsername,
  createUser,
  findUserById,
  getAllUsers,
  updateUserPassword,
  softDeleteUser,
  restoreUser,
  findDeletedUserById,
} from '../services/user.service';

const auth = new Hono();

// Registro de usuário
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ error: 'Usuário e senha são obrigatórios' }, 400);
    }

    if (username.length < 3) {
      return c.json({ error: 'Usuário deve ter pelo menos 3 caracteres' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, 400);
    }

    // Verifica se usuário já existe
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return c.json({ error: 'Usuário já cadastrado' }, 409);
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria usuário
    const user = await createUser(username, passwordHash);

    // Gera token JWT
    const token = await generateToken({
      userId: user.id,
      username: user.username,
    });

    // Define cookie HTTP-only
    // Em produção: SameSite=None; Secure para permitir cross-origin
    // Em desenvolvimento: sem SameSite para evitar restrições
    const isDev = process.env.NODE_ENV !== 'production';
    const cookieOptions = isDev
      ? `auth_token=${token}; Path=/; HttpOnly; Max-Age=86400`
      : `auth_token=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=86400`;
    c.header('Set-Cookie', cookieOptions);

    return c.json({
      message: 'Usuário cadastrado com sucesso',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ error: 'Usuário e senha são obrigatórios' }, 400);
    }

    // Busca usuário
    const user = await findUserByUsername(username);
    if (!user) {
      return c.json({ error: 'Usuário ou senha inválidos' }, 401);
    }

    // Verifica senha
    try{
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return c.json({ error: 'Usuário ou senha inválidos' }, 401);
    }
    } catch (error) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }
    // Gera token JWT
    const token = await generateToken({
      userId: user.id,
      username: user.username,
    });

    // Define cookie HTTP-only
    // Em produção: SameSite=None; Secure para permitir cross-origin
    // Em desenvolvimento: sem SameSite para evitar restrições
    const isDev = process.env.NODE_ENV !== 'production';
    const cookieOptions = isDev
      ? `auth_token=${token}; Path=/; HttpOnly; Max-Age=86400`
      : `auth_token=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=86400`;
    c.header('Set-Cookie', cookieOptions);

    return c.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Logout
auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
  return c.json({ message: 'Logout realizado com sucesso' });
});

// Dados do usuário logado
auth.get('/me', async (c) => {
  try {
    const cookieHeader = c.req.header('Cookie');
    if (!cookieHeader) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const tokenCookie = cookies.find(cookie => cookie.startsWith('auth_token='));
    
    if (!tokenCookie) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const token = tokenCookie.split('=')[1];
    if (!token) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return c.json({ error: 'Token inválido ou expirado' }, 401);
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Listar todos os usuários (para reset de senha)
auth.get('/users', async (c) => {
  try {
    const users = await getAllUsers();
    return c.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Reset de senha (sem verificação - para grupo de amigos)
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return c.json({ error: 'Usuário e nova senha são obrigatórios' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, 400);
    }

    // Verifica se usuário existe
    const user = await findUserById(userId);
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Atualiza senha
    const updated = await updateUserPassword(userId, newPasswordHash);
    if (!updated) {
      return c.json({ error: 'Erro ao atualizar senha' }, 500);
    }

    return c.json({
      message: 'Senha redefinida com sucesso',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro no reset de senha:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Excluir usuário (lógico)
auth.post('/users/:id/delete', async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));

    if (isNaN(userId)) {
      return c.json({ error: 'ID de usuário inválido' }, 400);
    }

    // Verifica se usuário existe (pode estar excluído)
    const user = await findDeletedUserById(userId);
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    if (user.deleted_at) {
      return c.json({ error: 'Usuário já está excluído' }, 400);
    }

    // Faz exclusão lógica
    const deleted = await softDeleteUser(userId);
    if (!deleted) {
      return c.json({ error: 'Erro ao excluir usuário' }, 500);
    }

    return c.json({
      message: 'Usuário excluído com sucesso',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro na exclusão de usuário:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Reativar usuário excluído
auth.post('/users/:id/restore', async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));

    if (isNaN(userId)) {
      return c.json({ error: 'ID de usuário inválido' }, 400);
    }

    // Verifica se usuário existe
    const user = await findDeletedUserById(userId);
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    if (!user.deleted_at) {
      return c.json({ error: 'Usuário não está excluído' }, 400);
    }

    // Reativa usuário
    const restored = await restoreUser(userId);
    if (!restored) {
      return c.json({ error: 'Erro ao reativar usuário' }, 500);
    }

    return c.json({
      message: 'Usuário reativado com sucesso',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Erro na reativação de usuário:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

export default auth;
