<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllUsers } from '@/services/api';

interface UserWithPoints {
  id: number;
  username: string;
  created_at: string;
  total_points: number;
}

const router = useRouter();
const users = ref<UserWithPoints[]>([]);
const loading = ref(true);

async function loadUsers() {
  try {
    const data = await getAllUsers();
    users.value = data.users;
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  } finally {
    loading.value = false;
  }
}

function formatPoints(points: number): string {
  return points >= 0 ? `+${points}` : `${points}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function viewUserEntries(userId: number) {
  router.push(`/users/${userId}/entries`);
}

onMounted(loadUsers);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-6">👥 Usuários</h1>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <div v-else>
      <!-- Desktop Table -->
      <div class="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pontos Totais
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Cadastro
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-medium text-gray-900">{{ user.username }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-3 py-1 rounded-full text-sm font-semibold"
                    :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ formatPoints(user.total_points) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-600">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button
                    @click="viewUserEntries(user.id)"
                    class="text-green-600 hover:text-green-800 font-medium"
                  >
                    Ver Entradas →
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden space-y-3">
        <div
          v-for="user in users"
          :key="user.id"
          class="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                {{ user.username.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">{{ user.username }}</h3>
                <p class="text-xs text-gray-500">📅 {{ formatDate(user.created_at) }}</p>
              </div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-sm font-semibold"
              :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ formatPoints(user.total_points) }}
            </span>
          </div>
          <button
            @click="viewUserEntries(user.id)"
            class="w-full py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors"
          >
            Ver Entradas →
          </button>
        </div>
      </div>

      <div v-if="users.length === 0" class="bg-white rounded-xl p-8 text-center border">
        <p class="text-gray-500">Nenhum usuário cadastrado ainda.</p>
      </div>
    </div>
  </div>
</template>
