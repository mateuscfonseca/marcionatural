<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUserEntries, getEntryReports, reportEntry } from '@/services/api';
import type { UserEntry, EntryReport } from '@/types';

const route = useRoute();
const router = useRouter();
const userId = computed(() => parseInt(route.params.userId as string));
const username = ref('');

const entries = ref<UserEntry[]>([]);
const loading = ref(true);
const selectedEntry = ref<UserEntry | null>(null);
const showEntryModal = ref(false);
const showPhotoModal = ref(false);
const entryReports = ref<EntryReport[]>([]);
const hasReported = ref(false);

const positiveEntries = computed(() => entries.value.filter(e => e.points > 0 && e.is_activity_validated));
const negativeEntries = computed(() => entries.value.filter(e => e.points < 0 && e.is_activity_validated));
const invalidatedEntries = computed(() => entries.value.filter(e => !e.is_activity_validated));

async function loadEntries() {
  try {
    const data = await getUserEntries(userId.value);
    username.value = data.user.username;
    entries.value = data.entries.all;
  } catch (error) {
    console.error('Erro ao carregar entradas:', error);
  } finally {
    loading.value = false;
  }
}

async function openEntryDetails(entry: UserEntry) {
  selectedEntry.value = entry;
  try {
    const reportsData = await getEntryReports(entry.id);
    entryReports.value = reportsData.reports;
    hasReported.value = reportsData.hasReported;
  } catch {
    entryReports.value = [];
    hasReported.value = false;
  }
  showEntryModal.value = true;
}

async function handleReport() {
  if (!selectedEntry.value) return;
  try {
    await reportEntry(selectedEntry.value.id);
    hasReported.value = true;
    entryReports.value.push({
      id: Date.now(),
      entry_id: selectedEntry.value.id,
      reporter_user_id: 0,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao reportar:', error);
    alert('Erro ao reportar entrada');
  }
}

function openPhoto(photoUrl: string) {
  selectedEntry.value = { photo_url: photoUrl } as UserEntry;
  showPhotoModal.value = true;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getActivityTypeIcon(categoryId?: number): string {
  switch (categoryId) {
    case 1: return '🍽️';
    case 2: return '🏃';
    case 3: return '📚';
    default: return '📝';
  }
}

onMounted(() => {
  loadEntries();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-gray-800">📋 Entradas de {{ username }}</h1>
          <p class="text-xs text-gray-500 hidden sm:block">Todas as atividades registradas</p>
        </div>
      </div>
    </div>

    <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Carregando...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Entradas Positivas -->
        <div>
          <h2 class="text-base sm:text-lg font-semibold text-green-600 mb-4 flex items-center gap-2">
            <span>✅</span> Positivas ({{ positiveEntries.length }})
          </h2>
          <div v-if="positiveEntries.length === 0" class="bg-white rounded-xl p-6 text-center border">
            <p class="text-gray-500 text-sm">Nenhuma entrada positiva</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="entry in positiveEntries"
              :key="entry.id"
              @click="openEntryDetails(entry)"
              class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div class="flex gap-3">
                <div v-if="entry.photo_url" class="flex-shrink-0">
                  <img
                    :src="entry.photo_url"
                    :alt="entry.description"
                    class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="text-2xl">{{ getActivityTypeIcon(entry.category_id) }}</span>
                    <span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                      +{{ entry.points }} pts
                    </span>
                  </div>
                  <p class="text-sm text-gray-700 line-clamp-2 mb-1">{{ entry.description }}</p>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span v-if="entry.duration_minutes">⏱️ {{ entry.duration_minutes }} min</span>
                    <span>📅 {{ formatDate(entry.created_at).split(' ')[0] }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Entradas Negativas -->
        <div>
          <h2 class="text-base sm:text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
            <span>❌</span> Negativas ({{ negativeEntries.length }})
          </h2>
          <div v-if="negativeEntries.length === 0" class="bg-white rounded-xl p-6 text-center border">
            <p class="text-gray-500 text-sm">Nenhuma entrada negativa</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="entry in negativeEntries"
              :key="entry.id"
              @click="openEntryDetails(entry)"
              class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div class="flex gap-3">
                <div v-if="entry.photo_url" class="flex-shrink-0">
                  <img
                    :src="entry.photo_url"
                    :alt="entry.description"
                    class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="text-2xl">{{ getActivityTypeIcon(entry.category_id) }}</span>
                    <span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 whitespace-nowrap">
                      {{ entry.points }} pts
                    </span>
                  </div>
                  <p class="text-sm text-gray-700 line-clamp-2 mb-1">{{ entry.description }}</p>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span v-if="entry.duration_minutes">⏱️ {{ entry.duration_minutes }} min</span>
                    <span>📅 {{ formatDate(entry.created_at).split(' ')[0] }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Entradas Invalidadas -->
        <div v-if="invalidatedEntries.length > 0">
          <h2 class="text-base sm:text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
            <span>⚠️</span> Invalidadas ({{ invalidatedEntries.length }})
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="entry in invalidatedEntries"
              :key="entry.id"
              @click="openEntryDetails(entry)"
              class="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-4 cursor-pointer hover:shadow-md transition-shadow opacity-75"
            >
              <div class="flex gap-3">
                <div v-if="entry.photo_url" class="flex-shrink-0">
                  <img
                    :src="entry.photo_url"
                    :alt="entry.description"
                    class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="text-2xl">{{ getActivityTypeIcon(entry.category_id) }}</span>
                    <span class="px-2 py-1 rounded text-xs font-semibold bg-gray-300 text-gray-700 whitespace-nowrap">
                      0 pts
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 line-clamp-2 mb-1">{{ entry.description }}</p>
                  <p class="text-xs text-red-600 font-medium">❌ Tipo invalidado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Detalhes da Entrada -->
    <div v-if="showEntryModal && selectedEntry" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800">📝 Detalhes da Entrada</h2>
          <button @click="showEntryModal = false" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div class="p-4 sm:p-6 space-y-4">
          <!-- Foto -->
          <div v-if="selectedEntry.photo_url" class="relative">
            <img
              :src="selectedEntry.photo_url"
              :alt="selectedEntry.description"
              @click="openPhoto(selectedEntry.photo_url!)"
              class="w-full h-48 sm:h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
            />
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span class="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                🔍 Toque para ampliar
              </span>
            </div>
          </div>

          <!-- Tipo de Atividade -->
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ getActivityTypeIcon(selectedEntry.category_id) }}</span>
            <div>
              <p class="text-sm text-gray-500">Tipo de Atividade</p>
              <p class="font-semibold text-gray-800">{{ selectedEntry.activity_type_name || 'Atividade' }}</p>
            </div>
          </div>

          <!-- Pontos -->
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="selectedEntry.points >= 0 ? 'bg-green-100' : 'bg-red-100'"
            >
              <span :class="selectedEntry.points >= 0 ? 'text-green-600' : 'text-red-600'" class="font-bold">
                {{ selectedEntry.points >= 0 ? '+' : '' }}{{ selectedEntry.points }}
              </span>
            </div>
            <div>
              <p class="text-sm text-gray-500">Pontos</p>
              <p class="font-semibold text-gray-800">{{ selectedEntry.points >= 0 ? 'Positivos' : 'Negativos' }}</p>
            </div>
          </div>

          <!-- Descrição -->
          <div>
            <p class="text-sm text-gray-500 mb-2">Descrição</p>
            <p class="text-gray-800">{{ selectedEntry.description }}</p>
          </div>

          <!-- Duração -->
          <div v-if="selectedEntry.duration_minutes">
            <p class="text-sm text-gray-500 mb-1">Duração</p>
            <p class="font-medium text-gray-800">⏱️ {{ selectedEntry.duration_minutes }} minutos</p>
          </div>

          <!-- Data -->
          <div>
            <p class="text-sm text-gray-500 mb-1">Data/Hora</p>
            <p class="font-medium text-gray-800">📅 {{ formatDate(selectedEntry.created_at) }}</p>
          </div>

          <!-- Status -->
          <div class="flex items-center gap-2">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold"
              :class="selectedEntry.is_activity_validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ selectedEntry.is_activity_validated ? '✅ Validada' : '❌ Invalidada' }}
            </span>
          </div>

          <!-- Reports -->
          <div v-if="entryReports.length > 0" class="border-t pt-4">
            <p class="text-sm text-gray-500 mb-2">Reports ({{ entryReports.length }})</p>
            <div class="space-y-2">
              <div
                v-for="report in entryReports"
                :key="report.id"
                class="text-xs text-gray-600 bg-gray-50 rounded-lg p-2"
              >
                🚩 Reportado em {{ formatDate(report.created_at) }}
              </div>
            </div>
          </div>

          <!-- Botão Reportar -->
          <div v-if="!hasReported && selectedEntry.is_activity_validated" class="border-t pt-4">
            <button
              @click="handleReport"
              class="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              🚩 Reportar como suspeita
            </button>
          </div>
          <div v-else-if="hasReported" class="border-t pt-4">
            <p class="text-center text-sm text-green-600 font-medium">
              ✅ Você já reportou esta entrada
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Foto (Zoom) -->
    <div v-if="showPhotoModal && selectedEntry?.photo_url" class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50" @click="showPhotoModal = false">
      <button
        @click="showPhotoModal = false"
        class="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="selectedEntry.photo_url"
        :alt="selectedEntry.description"
        class="max-w-full max-h-full object-contain"
        @click.stop
      />
    </div>
  </div>
</template>
