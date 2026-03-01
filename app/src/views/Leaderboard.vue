<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getLeaderboard } from '@/services/api';
import type { LeaderboardUser } from '@/types';

const router = useRouter();
const leaderboard = ref<LeaderboardUser[]>([]);
const loading = ref(true);

let pollingInterval: ReturnType<typeof setInterval> | null = null;

async function loadLeaderboard() {
  try {
    const data = await getLeaderboard();
    leaderboard.value = data.leaderboard;
  } catch (error) {
    console.error('Erro ao carregar leaderboard:', error);
  } finally {
    loading.value = false;
  }
}

function formatPoints(points: number): string {
  return points >= 0 ? `+${points}` : `${points}`;
}

function viewUserEntries(userId: number) {
  router.push(`/users/${userId}/entries`);
}

// Inicia polling de 10 segundos
function startPolling() {
  pollingInterval = setInterval(() => {
    loadLeaderboard();
  }, 10000);
}

onMounted(() => {
  loadLeaderboard();
  startPolling();
});

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">🏆 Leaderboard</h1>
        <p class="text-sm text-gray-600 mt-1 sm:hidden">Ranking de usuários</p>
      </div>
      <div class="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span class="hidden sm:inline">Atualizando a cada 10s</span>
        <span class="sm:hidden">Ao vivo</span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <div v-else class="bg-white rounded-xl shadow overflow-hidden">
      <!-- Desktop Table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posição
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pontos
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entradas
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="(user, index) in leaderboard"
              :key="user.id"
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'bg-yellow-50': index === 0, 'bg-gray-50': index === 1, 'bg-orange-50': index === 2 }"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-2xl">
                  {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}` }}
                </span>
              </td>
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
                {{ user.valid_entries_count }}
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

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-gray-200">
        <div
          v-for="(user, index) in leaderboard"
          :key="user.id"
          class="p-4 hover:bg-gray-50 transition-colors"
          :class="{ 'bg-yellow-50': index === 0, 'bg-gray-50': index === 1, 'bg-orange-50': index === 2 }"
        >
          <div class="flex items-center gap-4">
            <span class="text-2xl flex-shrink-0">
              {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}` }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-gray-900">{{ user.username }}</span>
                <span
                  class="px-2 py-1 rounded-full text-xs font-semibold"
                  :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ formatPoints(user.total_points) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm text-gray-500">
                <span>{{ user.valid_entries_count }} entradas</span>
                <button
                  @click="viewUserEntries(user.id)"
                  class="text-green-600 font-medium"
                >
                  Ver →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="leaderboard.length === 0" class="text-center py-8 text-gray-500">
        Nenhum usuário cadastrado ainda.
      </div>
    </div>
  </div>
</template>
