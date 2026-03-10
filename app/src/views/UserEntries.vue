<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUserEntries, getEntryReports, reportEntry, getUserProjectsWithProgress, getUserPerfectWeeks, getUserProjectsWithAllLogs, getUserWeekEntries, getUserProjectsByWeek } from '@/services/api';
import type { UserEntry, EntryReport, ProjectWithProgress, PaginationResponse, PerfectWeek, ProjectWithLogs, WeekEntriesResponse, ProjectLogsResponse } from '@/types';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';
import EntryProgressModal from '@/components/EntryProgressModal.vue';
import EntryList from '@/components/EntryList.vue';
import ProjectAuditModal from '@/components/ProjectAuditModal.vue';
import PerfectWeekAuditModal from '@/components/PerfectWeekAuditModal.vue';

const route = useRoute();
const router = useRouter();
const userId = computed(() => parseInt(route.params.userId as string));
const username = ref('');

const { success } = useToast();
const handleApiError = createApiErrorHandler();

const entries = ref<UserEntry[]>([]);
const projects = ref<ProjectWithProgress[]>([]);
const perfectWeeks = ref<PerfectWeek[]>([]);
const totalBonusPoints = ref(0);
const loading = ref(true);
const selectedEntry = ref<UserEntry | null>(null);
const showEntryModal = ref(false);
const entryReports = ref<EntryReport[]>([]);
const hasReported = ref(false);

// Modal de auditoria de projetos
const selectedProject = ref<ProjectWithLogs | null>(null);
const showProjectAuditModal = ref(false);

// Modal de auditoria de semana perfeita
const selectedPerfectWeek = ref<PerfectWeek | null>(null);
const showPerfectWeekAuditModal = ref(false);
const weekEntries = ref<UserEntry[]>([]);
const weekProjects = ref<ProjectWithLogs[]>([]);

// Paginação (two-way binding com EntryList)
const pagination = ref<PaginationResponse | null>(null);
const currentPage = ref(1);
const entriesPerPage = ref(10);

async function loadEntries(page = 1, limit = entriesPerPage.value, timeFilter: 'today' | 'last3' | 'last7' | 'all' = 'all') {
  try {
    const data = await getUserEntries(userId.value, {
      page,
      limit,
      timeFilter,
    });
    username.value = data.user.username;
    entries.value = data.entries;
    pagination.value = data.pagination;
    currentPage.value = page;
  } catch (error) {
    console.error('Erro ao carregar entradas:', error);
  } finally {
    loading.value = false;
  }
}

// Watch para recarregar quando página ou limite mudarem (two-way binding)
watch([currentPage, entriesPerPage], ([newPage, newLimit], [oldPage, oldLimit]) => {
  if (oldPage === undefined && oldLimit === undefined) {
    return;
  }
  loadEntries(newPage, newLimit);
});

function handleTimeFilterChange(filter: 'today' | 'last3' | 'last7' | 'all') {
  currentPage.value = 1;
  loadEntries(1, entriesPerPage.value, filter);
}

async function loadProjects() {
  try {
    const data = await getUserProjectsWithProgress(userId.value);
    projects.value = data.projects;
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
  }
}

async function loadPerfectWeeks() {
  try {
    const data = await getUserPerfectWeeks(userId.value);
    perfectWeeks.value = data.perfectWeeks;
    totalBonusPoints.value = data.totalBonusPoints;
  } catch (error) {
    console.error('Erro ao carregar semanas perfeitas:', error);
  }
}

async function openProjectAudit(project: ProjectWithProgress) {
  try {
    const data = await getUserProjectsWithAllLogs(userId.value);
    const projectWithLogs = data.projects.find(p => p.id === project.id);
    if (projectWithLogs) {
      selectedProject.value = projectWithLogs;
      showProjectAuditModal.value = true;
    }
  } catch (error) {
    console.error('Erro ao carregar logs do projeto:', error);
  }
}

async function openPerfectWeekAudit(week: PerfectWeek) {
  try {
    selectedPerfectWeek.value = week;
    
    // Busca entradas da semana
    const entriesData = await getUserWeekEntries(userId.value, week.weekNumber, week.year);
    weekEntries.value = entriesData.entries;
    
    // Busca projetos da semana
    const projectsData = await getUserProjectsByWeek(userId.value, week.weekNumber, week.year);
    weekProjects.value = projectsData.projects;
    
    showPerfectWeekAuditModal.value = true;
  } catch (error) {
    console.error('Erro ao carregar dados da semana perfeita:', error);
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

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

onMounted(() => {
  loadEntries();
  loadProjects();
  loadPerfectWeeks();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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

              <!-- Botão de Auditoria -->
              <button
                @click="openProjectAudit(project)"
                class="mt-3 w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                🔍 Ver Auditoria Completa
              </button>
            </div>
          </div>
        </div>

        <!-- Semanas Perfeitas -->
        <div v-if="perfectWeeks.length > 0">
          <h2 class="text-base sm:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🏆</span> Semanas Perfeitas
          </h2>

          <!-- Card de total de bônus -->
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-green-700 font-medium">Total em Bônus</p>
                <p class="text-2xl font-bold text-green-800">+{{ totalBonusPoints }} pontos</p>
              </div>
              <div class="text-3xl">🎯</div>
            </div>
          </div>

          <!-- Lista de semanas -->
          <div class="space-y-2">
            <div
              v-for="week in perfectWeeks"
              :key="`${week.year}-${week.weekNumber}`"
              @click="openPerfectWeekAudit(week)"
              class="bg-white rounded-lg border p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
            >
              <div>
                <p class="font-medium text-gray-800">Semana {{ week.weekNumber }}/{{ week.year }}</p>
                <p class="text-xs text-gray-500">{{ week.startDate }} - {{ week.endDate }}</p>
              </div>
              <div class="text-green-600 font-bold">+{{ week.points }} pts</div>
            </div>
          </div>
        </div>

        <!-- Entradas -->
        <EntryList
          v-model:page="currentPage"
          v-model:limit="entriesPerPage"
          :entries="entries"
          :pagination="pagination"
          :loading="false"
          show-actions="view-only"
          @update:time-filter="handleTimeFilterChange"
          @click-entry="openEntryDetails"
        />
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

    <!-- Modal de Auditoria de Projetos -->
    <ProjectAuditModal
      v-model="showProjectAuditModal"
      :project="selectedProject"
      @close="showProjectAuditModal = false"
    />

    <!-- Modal de Auditoria de Semana Perfeita -->
    <PerfectWeekAuditModal
      v-model="showPerfectWeekAuditModal"
      :week="selectedPerfectWeek"
      :entries="weekEntries"
      :projects="weekProjects"
      @close="showPerfectWeekAuditModal = false"
    />
  </div>
</template>
