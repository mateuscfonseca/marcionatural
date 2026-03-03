<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getTimeline } from '@/services/api';
import type { TimelineEntry } from '@/types';
import { useRouter } from 'vue-router';

const router = useRouter();

const entries = ref<TimelineEntry[]>([]);
const loading = ref(true);
const offset = ref(0);
const limit = 50;
const hasMore = ref(true);
const loadingMore = ref(false);

const selectedDays = ref<number | undefined>(undefined);

async function loadTimeline(append = false) {
  try {
    if (!append) {
      loading.value = true;
      offset.value = 0;
    } else {
      loadingMore.value = true;
    }

    const data = await getTimeline({
      limit,
      offset: offset.value,
      days: selectedDays.value,
    });

    if (append) {
      entries.value = [...entries.value, ...data.entries];
    } else {
      entries.value = data.entries;
    }

    hasMore.value = data.pagination.hasMore;
    offset.value = data.pagination.offset + data.entries.length;
  } catch (error) {
    console.error('Erro ao carregar timeline:', error);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function filterByDays(days: number | undefined) {
  selectedDays.value = days;
  loadTimeline(false);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return 'Hoje, ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return 'Ontem, ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

function getCategoryIcon(categoryId: number, isPositive: boolean): string {
  if (categoryId === 1) {
    // Alimentação
    return isPositive ? '🥗' : '🍔';
  } else if (categoryId === 2) {
    // Exercício
    return '💪';
  } else if (categoryId === 3) {
    // Projeto Pessoal
    return '📚';
  }
  return '📝';
}

function getCategoryName(categoryId: number): string {
  const categories: Record<number, string> = {
    1: 'Alimentação',
    2: 'Exercício',
    3: 'Projeto Pessoal',
  };
  return categories[categoryId] || 'Atividade';
}

function getPointsClass(points: number): string {
  if (points > 0) return 'bg-green-100 text-green-800';
  if (points < 0) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function formatPoints(points: number): string {
  return points >= 0 ? `+${points}` : `${points}`;
}

function viewUserEntries(userId: number) {
  router.push(`/users/${userId}/entries`);
}

function loadMore() {
  if (hasMore.value && !loadingMore.value) {
    loadTimeline(true);
  }
}

onMounted(() => {
  loadTimeline();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b px-3 sm:px-6 lg:px-8 py-4 sticky top-0 z-10">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-800">📰 Timeline</h1>
          <p class="text-xs sm:text-sm text-gray-600 mt-1">
            Acompanhe as atividades da comunidade
          </p>
        </div>

        <!-- Filtros de período -->
        <div class="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            @click="filterByDays(undefined)"
            class="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="selectedDays === undefined ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            Tudo
          </button>
          <button
            @click="filterByDays(1)"
            class="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="selectedDays === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            Hoje
          </button>
          <button
            @click="filterByDays(7)"
            class="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="selectedDays === 7 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            7 dias
          </button>
          <button
            @click="filterByDays(30)"
            class="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="selectedDays === 30 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            30 dias
          </button>
        </div>
      </div>
    </div>

    <div class="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Carregando...</p>
      </div>

      <div v-else-if="entries.length === 0" class="bg-white rounded-xl p-8 text-center border">
        <p class="text-gray-500 text-base">Nenhuma atividade encontrada</p>
        <p class="text-gray-400 text-sm mt-2">Seja o primeiro a registrar uma atividade!</p>
      </div>

      <!-- Timeline de entradas -->
      <div v-else class="space-y-3">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="bg-white rounded-xl shadow-sm border p-3 sm:p-4 w-full overflow-hidden hover:shadow-md transition-shadow"
        >
          <div class="flex gap-2 sm:gap-4">
            <!-- Foto -->
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                @click="viewUserEntries(entry.user_id)"
              />
            </div>

            <!-- Conteúdo -->
            <div class="flex-1 min-w-0">
              <!-- Header do card -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-lg">{{ getCategoryIcon(entry.category_id, entry.points >= 0) }}</span>
                  <span class="font-semibold text-gray-900 text-sm sm:text-base">
                    {{ entry.activity_type_name }}
                  </span>
                  <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {{ getCategoryName(entry.category_id) }}
                  </span>
                </div>
                <span
                  class="px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                  :class="getPointsClass(entry.points)"
                >
                  {{ formatPoints(entry.points) }}
                </span>
              </div>

              <!-- Descrição -->
              <p class="text-gray-700 text-sm sm:text-base mb-2 line-clamp-3">
                {{ entry.description }}
              </p>

              <!-- Footer -->
              <div class="flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
                <button
                  @click="viewUserEntries(entry.user_id)"
                  class="font-medium text-green-600 hover:text-green-800 transition-colors"
                >
                  👤 {{ entry.username }}
                </button>
                <span class="flex items-center gap-1">
                  <span>📅</span>
                  <span>{{ formatDate(entry.entry_date) }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading more -->
        <div v-if="loadingMore" class="text-center py-4">
          <p class="text-gray-600">Carregando mais...</p>
        </div>

        <!-- Botão carregar mais -->
        <div v-if="hasMore" class="text-center pt-4">
          <button
            @click="loadMore"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Carregar mais
          </button>
        </div>

        <!-- Fim da timeline -->
        <div v-if="!hasMore && entries.length > 0" class="text-center py-4 text-gray-500 text-sm">
          Você chegou ao fim!
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
