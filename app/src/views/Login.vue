<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '@/services/api';
import { useAuth } from '@/stores/auth';

const router = useRouter();
const { initAuth } = useAuth();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  console.log('[Login] Attempting login for:', username.value);

  try {
    const result = await login(username.value, password.value);
    console.log('[Login] Login result:', result);
    await initAuth();
    console.log('[Login] Auth initialized, redirecting...');
    router.push('/leaderboard');
  } catch (err) {
    console.error('[Login] Login error:', err);
    error.value = err instanceof Error ? err.message : 'Erro ao fazer login';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 flex items-center justify-center p-6 sm:p-8 lg:p-12">
    <div class="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 lg:p-12 w-full max-w-lg">
      <div class="text-center mb-10">
        <div class="text-6xl mb-4">🌿</div>
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">Marcio Natural</h1>
        <p class="text-base sm:text-lg text-gray-600">Registre suas atividades e conquiste pontos!</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="username" class="block text-base font-semibold text-gray-700 mb-3">
            Usuário
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            minlength="3"
            autocomplete="username"
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Digite seu usuário"
          />
        </div>

        <div>
          <label for="password" class="block text-base font-semibold text-gray-700 mb-3">
            Senha
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            autocomplete="current-password"
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Digite sua senha"
          />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-base font-medium">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed  hover:shadow hover:-translate-y-0.5"
        >
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <p class="text-base text-gray-600">
          Não tem uma conta?
          <router-link to="/register" class="text-green-600 hover:text-green-700 font-semibold underline underline-offset-2">
            Cadastre-se grátis
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
