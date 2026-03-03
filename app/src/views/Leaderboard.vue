<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getLeaderboardByDate } from '@/services/api';
import type { LeaderboardUserWithMovement } from '@/types';
import LeaderboardChart from '@/components/LeaderboardChart.vue';

const router = useRouter();
const leaderboard = ref<LeaderboardUserWithMovement[]>([]);
const loading = ref(true);
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]);
const showChart = ref(false);
const referenceDate = ref<string>('');
const pollingInterval = ref<number | null>(null);

// Modal de movimentação
const showMovementModal = ref(false);
const selectedUserForMovement = ref<LeaderboardUserWithMovement | null>(null);

async function loadLeaderboard() {
  try {
    const date = selectedDate.value ?? new Date().toISOString().split('T')[0];
    const data = await getLeaderboardByDate(date);
    leaderboard.value = data.leaderboard ?? [];
    referenceDate.value = data.referenceDate ?? '';
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

function getMovementIcon(user: LeaderboardUserWithMovement) {
  if (user.movement === 'up') {
    return { icon: '↑', class: 'text-green-600', bg: 'bg-green-50' };
  } else if (user.movement === 'down') {
    return { icon: '↓', class: 'text-red-600', bg: 'bg-red-50' };
  } else {
    return { icon: '—', class: 'text-gray-400', bg: 'bg-gray-50' };
  }
}

function getMovementText(user: LeaderboardUserWithMovement): string {
  if (user.positionDiff === 0) return '';
  if (user.positionDiff > 0) return `+${user.positionDiff}`;
  return `${user.positionDiff}`;
}

function getMovementTooltip(user: LeaderboardUserWithMovement): string {
  const prevPos = user.previousPosition ?? 'N/A';
  const currPos = user.position;
  const prevPoints = user.total_points - (user.movement === 'up' ? Math.abs(user.positionDiff) * 5 : user.movement === 'down' ? Math.abs(user.positionDiff) * 5 : 0);
  
  let movementText = '';
  if (user.movement === 'up') movementText = `Subiu ${user.positionDiff} posições`;
  else if (user.movement === 'down') movementText = `Caiu ${Math.abs(user.positionDiff)} posições`;
  else movementText = 'Manteve a posição';

  return `Posição anterior: ${prevPos}º\nPosição atual: ${currPos}º\n${movementText}`;
}

function openMovementModal(user: LeaderboardUserWithMovement) {
  selectedUserForMovement.value = user;
  showMovementModal.value = true;
}

function closeMovementModal() {
  showMovementModal.value = false;
  selectedUserForMovement.value = null;
}

function changeDate(days: number) {
  const currentDate = selectedDate.value ?? new Date().toISOString().split('T')[0];
  const date = new Date(currentDate);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0];
  loadLeaderboard();
}

function goToToday() {
  selectedDate.value = new Date().toISOString().split('T')[0];
  loadLeaderboard();
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date((dateStr ?? new Date().toISOString().split('T')[0]) + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getPreviousDate(): string {
  const currentDate = selectedDate.value ?? new Date().toISOString().split('T')[0];
  const date = new Date(currentDate);
  date.setDate(date.getDate() - 1);
  return formatDateDisplay(date.toISOString().split('T')[0]);
}

function startPolling() {
  const today = new Date().toISOString().split('T')[0];
  const currentDate = selectedDate.value ?? today;
  if (currentDate === today) {
    pollingInterval.value = window.setInterval(() => {
      loadLeaderboard();
    }, 10000);
  }
}

onMounted(() => {
  loadLeaderboard();
  startPolling();
});

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">🏆 Leaderboard</h1>
          <p class="text-sm text-gray-600 mt-1">
            {{ (selectedDate ?? '') === new Date().toISOString().split('T')[0] ? 'Ranking de usuários (ao vivo)' : `Ranking de ${formatDateDisplay(selectedDate ?? '')}` }}
          </p>
        </div>

        <!-- Ações -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button @click="changeDate(-1)" class="p-2 hover:bg-white rounded-md transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              :value="selectedDate"
              type="date"
              @input="(e) => { selectedDate = (e.target as HTMLInputElement).value || new Date().toISOString().split('T')[0]; loadLeaderboard(); }"
              class="bg-white px-3 py-2 rounded-md text-sm font-medium text-gray-700 border-0 focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="changeDate(1)"
              class="p-2 hover:bg-white rounded-md transition-colors"
              :disabled="(selectedDate ?? '') >= new Date().toISOString().split('T')[0]"
              :class="(selectedDate ?? '') >= new Date().toISOString().split('T')[0] ? 'opacity-50 cursor-not-allowed' : ''"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              v-if="(selectedDate ?? '') !== new Date().toISOString().split('T')[0]"
              @click="goToToday"
              class="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Hoje
            </button>
          </div>

          <button
            @click="showChart = true"
            class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span class="hidden sm:inline">Evolução</span>
          </button>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" v-if="(selectedDate ?? '') === new Date().toISOString().split('T')[0]"></span>
        <span v-if="(selectedDate ?? '') === new Date().toISOString().split('T')[0]" class="hidden sm:inline">Atualizando a cada 10s</span>
        <span class="hidden sm:inline text-gray-300">|</span>
        <span>📊 Comparado a {{ getPreviousDate() }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 bg-white rounded-xl shadow">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <div v-else :key="selectedDate" class="bg-white rounded-xl shadow overflow-hidden">
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pontos</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entradas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movimentação</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
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
                <span class="text-2xl">{{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}` }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-medium text-gray-900">{{ user.username }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 rounded-full text-sm font-semibold" :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ formatPoints(user.total_points) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-600">{{ user.valid_entries_count }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="group relative inline-block">
                  <span
                    class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold cursor-help"
                    :class="getMovementIcon(user).bg"
                    :title="getMovementTooltip(user)"
                  >
                    <span :class="getMovementIcon(user).class">{{ getMovementIcon(user).icon }}</span>
                  </span>
                  <span
                    v-if="user.positionDiff !== 0"
                    class="ml-2 text-sm font-semibold"
                    :class="user.movement === 'up' ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ getMovementText(user) }}
                  </span>
                  <!-- Tooltip customizado para desktop -->
                  <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                    {{ getMovementTooltip(user) }}
                    <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button @click="viewUserEntries(user.id)" class="text-green-600 hover:text-green-800 font-medium">Ver Entradas →</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="md:hidden divide-y divide-gray-200">
        <div
          v-for="(user, index) in leaderboard"
          :key="user.id"
          class="p-4 hover:bg-gray-50 transition-colors"
          :class="{ 'bg-yellow-50': index === 0, 'bg-gray-50': index === 1, 'bg-orange-50': index === 2 }"
        >
          <div class="flex items-center gap-4">
            <span class="text-2xl flex-shrink-0">{{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}` }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-gray-900">{{ user.username }}</span>
                <span class="px-2 py-1 rounded-full text-xs font-semibold" :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ formatPoints(user.total_points) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm text-gray-500">
                <span>{{ user.valid_entries_count }} entradas</span>
                <div class="flex items-center gap-2">
                  <span
                    @click="openMovementModal(user)"
                    class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer active:scale-95 transition-transform"
                    :class="getMovementIcon(user).bg"
                  >
                    <span :class="getMovementIcon(user).class">{{ getMovementIcon(user).icon }}</span>
                  </span>
                  <span v-if="user.positionDiff !== 0" class="text-xs font-semibold" :class="user.movement === 'up' ? 'text-green-600' : 'text-red-600'">
                    {{ getMovementText(user) }}
                  </span>
                </div>
              </div>
              <div class="mt-2 text-right">
                <button @click="viewUserEntries(user.id)" class="text-green-600 font-medium text-sm">Ver Entradas →</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="leaderboard.length === 0" class="text-center py-8 text-gray-500">Nenhum usuário cadastrado ainda.</div>
    </div>

    <!-- Modal de Movimentação (Mobile) -->
    <div
      v-if="showMovementModal && selectedUserForMovement"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="closeMovementModal"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div class="p-6 border-b">
          <h3 class="text-lg font-bold text-gray-800">📊 Movimentação</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ selectedUserForMovement.position === 1 ? '🥇' : selectedUserForMovement.position === 2 ? '🥈' : selectedUserForMovement.position === 3 ? '🥉' : `#${selectedUserForMovement.position}` }}</span>
            <div>
              <p class="text-sm text-gray-500">Posição atual</p>
              <p class="text-xl font-bold text-gray-900">{{ selectedUserForMovement.position }}º lugar</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-3xl opacity-50">{{ (selectedUserForMovement.previousPosition ?? 0) === 1 ? '🥇' : (selectedUserForMovement.previousPosition ?? 0) === 2 ? '🥈' : (selectedUserForMovement.previousPosition ?? 0) === 3 ? '🥉' : `#${selectedUserForMovement.previousPosition || '?'}` }}</span>
            <div>
              <p class="text-sm text-gray-500">Posição anterior</p>
              <p class="text-xl font-bold text-gray-900">{{ selectedUserForMovement.previousPosition ?? 'N/A' }}º lugar</p>
            </div>
          </div>
          <div class="border-t pt-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500">Pontos atuais</span>
              <span class="font-bold" :class="selectedUserForMovement.total_points >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatPoints(selectedUserForMovement.total_points) }}
              </span>
            </div>
          </div>
          <div class="border-t pt-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">
                {{ selectedUserForMovement.movement === 'up' ? '⬆️' : selectedUserForMovement.movement === 'down' ? '⬇️' : '➡️' }}
              </span>
              <span class="font-medium" :class="selectedUserForMovement.movement === 'up' ? 'text-green-600' : selectedUserForMovement.movement === 'down' ? 'text-red-600' : 'text-gray-500'">
                {{ selectedUserForMovement.movement === 'up' ? `Subiu ${selectedUserForMovement.positionDiff} posições` : selectedUserForMovement.movement === 'down' ? `Caiu ${Math.abs(selectedUserForMovement.positionDiff)} posições` : 'Manteve a posição' }}
              </span>
            </div>
          </div>
        </div>
        <div class="p-4 border-t bg-gray-50">
          <button
            @click="closeMovementModal"
            class="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>

    <LeaderboardChart v-if="showChart" @close="showChart = false" />
  </div>
</template>
