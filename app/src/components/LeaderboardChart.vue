<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { LeaderboardSnapshot } from '@/types';
import { getLeaderboardHistory } from '@/services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps<{
  initialWeeks?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const loading = ref(true);
const selectedWeeks = ref(props.initialWeeks ?? 4);
const history = ref<LeaderboardSnapshot[]>([]);

const USER_COLORS = [
  { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },
  { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },
  { border: 'rgb(34, 197, 94)', background: 'rgba(34, 197, 94, 0.1)' },
  { border: 'rgb(249, 115, 22)', background: 'rgba(249, 115, 22, 0.1)' },
  { border: 'rgb(168, 85, 247)', background: 'rgba(168, 85, 247, 0.1)' },
  { border: 'rgb(236, 72, 153)', background: 'rgba(236, 72, 153, 0.1)' },
  { border: 'rgb(20, 184, 166)', background: 'rgba(20, 184, 166, 0.1)' },
  { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },
];

const chartData = computed(() => {
  if (!history.value || history.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const labels = history.value.map(h => {
    const date = new Date(h.date ?? Date.now());
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  });

  const allUsers = new Map<number, { username: string; colorIndex: number }>();
  history.value.forEach(snapshot => {
    snapshot.users.forEach((user) => {
      if (!allUsers.has(user.id)) {
        allUsers.set(user.id, {
          username: user.username ?? 'Usuário',
          colorIndex: allUsers.size % USER_COLORS.length,
        });
      }
    });
  });

  const datasets = Array.from(allUsers.entries()).map(([userId, { username, colorIndex }]) => {
    const color = USER_COLORS[colorIndex]!;
    return {
      label: username,
      data: history.value.map(snapshot => {
        const user = snapshot.users.find(u => u.id === userId);
        return user ? user.total_points : null;
      }),
      borderColor: color.border,
      backgroundColor: color.background,
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  return { labels, datasets };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 12 },
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (context: any) => {
          const points = context.parsed.y ?? 0;
          const sign = points >= 0 ? '+' : '';
          return `${context.dataset.label ?? ''}: ${sign}${points} pts`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: {
        callback: (value: any) => `${value >= 0 ? '+' : ''}${value}`,
      },
    },
    x: {
      grid: { display: false },
    },
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false,
  },
};

async function loadHistory() {
  loading.value = true;
  try {
    const data = await getLeaderboardHistory(selectedWeeks.value ?? 4);
    history.value = data.history ?? [];
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  } finally {
    loading.value = false;
  }
}

watch(selectedWeeks, () => {
  loadHistory();
});

onMounted(() => {
  loadHistory();
});

function formatDateRange() {
  if (!history.value || history.value.length === 0) return '';
  const start = new Date(history.value[0]?.date ?? Date.now());
  const end = new Date(history.value[history.value.length - 1]?.date ?? Date.now());
  return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-4 sm:p-6 border-b flex items-center justify-between">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800">📈 Evolução do Leaderboard</h2>
          <p class="text-sm text-gray-600 mt-1" v-if="history && history.length > 0">
            {{ formatDateRange() }}
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Fechar"
        >
          <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Seletor de semanas -->
      <div class="p-4 sm:p-6 border-b bg-gray-50">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="weeks in [1, 2, 3, 4]"
            :key="weeks"
            @click="selectedWeeks = weeks"
            class="px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
            :class="selectedWeeks === weeks ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'"
          >
            {{ weeks }} {{ weeks === 1 ? 'semana' : 'semanas' }}
          </button>
        </div>
      </div>

      <!-- Gráfico -->
      <div class="p-4 sm:p-6 flex-1 overflow-hidden">
        <div v-if="loading" class="flex items-center justify-center h-64 sm:h-80">
          <p class="text-gray-600">Carregando gráfico...</p>
        </div>
        <div v-else-if="!history || history.length === 0" class="flex items-center justify-center h-64 sm:h-80">
          <p class="text-gray-500">Nenhum dado disponível</p>
        </div>
        <div v-else class="h-64 sm:h-80">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </div>
  </div>
</template>
