import { reactive, readonly } from 'vue';
import { getCurrentUser, logout as apiLogout } from '@/services/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

const state = reactive<AuthState>({
  user: null,
  loading: true,
  initialized: false,
});

export async function initAuth() {
  if (state.initialized) {
    return;
  }
  
  try {
    const result = await getCurrentUser();
    state.user = result?.user ?? null;
    console.log('[Auth] User loaded:', state.user?.username ?? 'none');
  } catch (error) {
    console.log('[Auth] Not authenticated:', error);
    state.user = null;
  } finally {
    state.loading = false;
    state.initialized = true;
  }
}

export async function logout() {
  try {
    await apiLogout();
  } finally {
    state.user = null;
    state.initialized = false;
  }
}

export const useAuth = () => ({
  state: readonly(state),
  initAuth,
  logout,
  isAuthenticated: () => !!state.user,
});
