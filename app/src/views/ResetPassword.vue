<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllUsers, resetPassword } from '@/services/api';

const router = useRouter();

const users = ref<Array<{ id: number; username: string }>>([]);
const selectedUserId = ref<number | null>(null);
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);
const usersLoading = ref(true);

onMounted(async () => {
  try {
    const data = await getAllUsers();
    users.value = data.users;
  } catch (err) {
    error.value = 'Erro ao carregar usuários';
    console.error('Erro ao carregar usuários:', err);
  } finally {
    usersLoading.value = false;
  }
});

async function handleSubmit() {
  error.value = '';
  success.value = '';

  if (!selectedUserId.value) {
    error.value = 'Selecione um usuário';
    return;
  }

  if (!newPassword.value || newPassword.value.length < 6) {
    error.value = 'A senha deve ter pelo menos 6 caracteres';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'As senhas não coincidem';
    return;
  }

  loading.value = true;

  try {
    await resetPassword(selectedUserId.value, newPassword.value);
    success.value = 'Senha redefinida com sucesso! Redirecionando...';
    
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao redefinir senha';
    console.error('Erro ao redefinir senha:', err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 flex items-center justify-center p-6 sm:p-8 lg:p-12">
    <div class="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 lg:p-12 w-full max-w-lg">
      <div class="text-center mb-10">
        <div class="text-6xl mb-4">🔑</div>
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">Redefinir Senha</h1>
        <p class="text-base sm:text-lg text-gray-600">Selecione o usuário e defina uma nova senha</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="user" class="block text-base font-semibold text-gray-700 mb-3">
            Usuário
          </label>
          <select
            id="user"
            v-model="selectedUserId"
            required
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
          >
            <option value="" disabled>Selecione um usuário</option>
            <option
              v-for="user in users"
              :key="user.id"
              :value="user.id"
            >
              {{ user.username }}
            </option>
          </select>
        </div>

        <div>
          <label for="newPassword" class="block text-base font-semibold text-gray-700 mb-3">
            Nova Senha
          </label>
          <input
            id="newPassword"
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Digite a nova senha"
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
            minlength="6"
            autocomplete="new-password"
            class="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-gray-50 focus:bg-white"
            placeholder="Confirme a nova senha"
          />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-base font-medium">
          {{ error }}
        </div>

        <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl text-base font-medium">
          {{ success }}
        </div>

        <button
          type="submit"
          :disabled="loading || usersLoading"
          class="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow hover:-translate-y-0.5"
        >
          {{ loading ? 'Redefinindo...' : usersLoading ? 'Carregando...' : 'Redefinir Senha' }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <p class="text-base text-gray-600">
          Lembrou sua senha?
          <router-link to="/login" class="text-green-600 hover:text-green-700 font-semibold underline underline-offset-2">
            Voltar para Login
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
