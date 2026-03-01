<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '@/services/api';
import { useAuth } from '@/stores/auth';

const router = useRouter();
const { initAuth } = useAuth();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'As senhas não coincidem';
    return;
  }

  if (password.value.length < 6) {
    error.value = 'A senha deve ter pelo menos 6 caracteres';
    return;
  }

  loading.value = true;

  try {
    await register(username.value, password.value);
    await initAuth();
    router.push('/leaderboard');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao cadastrar';
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
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">Criar Conta</h1>
        <p class="text-base sm:text-lg text-gray-600">Junte-se ao Marcio Natural!</p>
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
            placeholder="Escolha um usuário"
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
            autocomplete="new-password"
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Escolha uma senha"
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-base font-semibold text-gray-700 mb-3">
            Confirmar Senha
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Confirme sua senha"
          />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-base font-medium">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xs hover:-translate-y-0.5"
        >
          {{ loading ? 'Cadastrando...' : 'Cadastrar' }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <p class="text-base text-gray-600">
          Já tem uma conta?
          <router-link to="/login" class="text-green-600 hover:text-green-700 font-semibold underline underline-offset-2">
            Faça login
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
