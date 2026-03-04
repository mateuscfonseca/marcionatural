<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUserEntries, getEntryReports, reportEntry, getUserProjectsWithProgress } from '@/services/api';
import type { UserEntry, EntryReport, ProjectWithProgress } from '@/types';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';
import EntryProgressModal from '@/components/EntryProgressModal.vue';

const route = useRoute();
const router = useRouter();
const userId = computed(() => parseInt(route.params.userId as string));
const username = ref('');

const { success } = useToast();
const handleApiError = createApiErrorHandler();

const entries = ref<UserEntry[]>([]);
const projects = ref<ProjectWithProgress[]>([]);
const loading = ref(true);
const selectedEntry = ref<UserEntry | null>(null);
const showEntryModal = ref(false);
const entryReports = ref<EntryReport[]>([]);
const hasReported = ref(false);

const positiveEntries = computed(() => entries.value.filter(e => e.category_id === 2 || (e.category_id === 1 && e.is_activity_positive)));
const negativeEntries = computed(() => entries.value.filter(e => e.category_id === 1 && !e.is_activity_positive));
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

async function loadProjects() {
  try {
    const data = await getUserProjectsWithProgress(userId.value);
    projects.value = data.projects;
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
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

async function handleReportFromModal() {
  if (!selectedEntry.value) return;
  try {
    await reportEntry(selectedEntry.value.id);
    success('Report registrado com sucesso!');
    hasReported.value = true;
    entryReports.value.push({
      id: Date.now(),
      entry_id: selectedEntry.value.id,
      reporter_user_id: 0,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    handleApiError(error, 'Erro ao reportar entrada');
  }
}

function formatDate(dateStr: string | null): string {
  if(!dateStr?.includes('T')){
    dateStr += 'T00:00:00.000';
  }
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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
  loadProjects();
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
        <!-- Projetos Pessoais -->
        <div v-if="projects.length > 0">
          <h2 class="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>📚</span> Projetos Pessoais - Semana {{ projects[0]?.weekNumber || '-' }}/{{ projects[0]?.year || '-' }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="project in projects"
              :key="project.id"
              class="bg-white rounded-xl shadow-sm border p-4"
            >
              <div class="mb-3">
                <h3 class="font-semibold text-gray-800">{{ project.name }}</h3>
                <p v-if="project.description" class="text-xs text-gray-500 mt-1 line-clamp-2">{{ project.description }}</p>
              </div>

              <!-- Barra de Progresso -->
              <div class="mb-3">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-600">Progresso</span>
                  <span class="font-medium" :class="project.goalReached ? 'text-green-600' : 'text-gray-700'">
                    {{ formatMinutes(project.totalMinutes) }} / {{ formatMinutes(project.goalMinutes) }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div
                    class="h-3 rounded-full transition-all"
                    :class="project.goalReached ? 'bg-green-600' : 'bg-blue-600'"
                    :style="{ width: `${Math.min(100, project.percentage)}%` }"
                  ></div>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ Math.round(project.percentage) }}% concluído</p>
              </div>

              <!-- Status -->
              <div v-if="project.goalReached" class="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                <p class="text-green-700 text-xs font-semibold">🎉 Meta batida!</p>
              </div>
              <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                <p class="text-gray-600 text-xs">Falta {{ formatMinutes(project.goalMinutes - project.totalMinutes) }}</p>
              </div>
            </div>
          </div>
        </div>

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
                    <span>📅 {{ formatDate(entry.entry_date) }}</span>
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

    <!-- Modal de Progresso/Detalhes da Entrada -->
    <EntryProgressModal
      v-model="showEntryModal"
      :entry="selectedEntry"
      :reports="entryReports"
      :has-reported="hasReported"
      @report="handleReportFromModal"
    />
  </div>
</template>
