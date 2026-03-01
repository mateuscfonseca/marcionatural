<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  getMyProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectWeeklyProgress,
  logProjectTime,
} from '@/services/api';
import type { PersonalProject, WeeklyProgress } from '@/types';

const projects = ref<PersonalProject[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingProject = ref<PersonalProject | null>(null);
const showLogModal = ref(false);
const selectedProject = ref<PersonalProject | null>(null);
const showProgressModal = ref(false);
const currentProgress = ref<WeeklyProgress | null>(null);

// Form
const name = ref('');
const description = ref('');
const weeklyHoursGoal = ref(5);

// Log form
const logDuration = ref(30);
const logDate = ref(new Date().toISOString().split('T')[0]);

async function loadProjects() {
  try {
    const data = await getMyProjects();
    projects.value = data.projects;
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
  } finally {
    loading.value = false;
  }
}

function openNewProjectModal() {
  editingProject.value = null;
  name.value = '';
  description.value = '';
  weeklyHoursGoal.value = 5;
  showModal.value = true;
}

function openEditModal(project: PersonalProject) {
  editingProject.value = project;
  name.value = project.name;
  description.value = project.description || '';
  weeklyHoursGoal.value = project.weekly_hours_goal;
  showModal.value = true;
}

async function handleSubmit() {
  try {
    if (editingProject.value) {
      await updateProject(editingProject.value.id, {
        name: name.value,
        description: description.value,
        weeklyHoursGoal: weeklyHoursGoal.value,
      });
    } else {
      await createProject({
        name: name.value,
        description: description.value,
        weeklyHoursGoal: weeklyHoursGoal.value,
      });
    }
    showModal.value = false;
    await loadProjects();
  } catch (error) {
    console.error('Erro ao salvar projeto:', error);
    alert('Erro ao salvar projeto');
  }
}

async function handleDelete(id: number) {
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
  try {
    await deleteProject(id);
    await loadProjects();
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
  }
}

function openLogModal(project: PersonalProject) {
  selectedProject.value = project;
  logDuration.value = 30;
  logDate.value = new Date().toISOString().split('T')[0];
  showLogModal.value = true;
}

async function handleLogTime() {
  if (!selectedProject.value) return;
  try {
    await logProjectTime(selectedProject.value.id, logDuration.value, logDate.value || undefined);
    showLogModal.value = false;
    await loadProjects();
    alert('Tempo registrado com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar tempo:', error);
    alert('Erro ao registrar tempo');
  }
}

async function viewProgress(project: PersonalProject) {
  try {
    const data = await getProjectWeeklyProgress(project.id);
    currentProgress.value = data.progress;
    showProgressModal.value = true;
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
  }
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
}

onMounted(loadProjects);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">📚 Projetos Pessoais</h1>
      <button
        @click="openNewProjectModal"
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
      >
        <span>➕</span>
        <span class="hidden sm:inline">Novo Projeto</span>
        <span class="sm:hidden">Projeto</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <div
        v-for="project in projects"
        :key="project.id"
        class="bg-white rounded-xl shadow p-4 sm:p-6 border border-gray-200"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-base sm:text-lg font-semibold text-gray-800">{{ project.name }}</h3>
          <span
            class="px-2 py-1 rounded text-xs font-semibold"
            :class="project.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
          >
            {{ project.is_active ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <p v-if="project.description" class="text-gray-600 text-sm mb-4">{{ project.description }}</p>

        <div class="space-y-2 mb-4">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Meta semanal:</span>
            <span class="font-medium">{{ project.weekly_hours_goal }}h</span>
          </div>
          <div v-if="project.total_points" class="flex justify-between text-sm">
            <span class="text-gray-600">Pontos:</span>
            <span class="font-medium text-green-600">+{{ project.total_points }}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            @click="openLogModal(project)"
            class="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            ⏱️ Registrar
          </button>
          <button
            @click="viewProgress(project)"
            class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            📊 Progresso
          </button>
        </div>

        <div class="flex gap-2 mt-4 pt-4 border-t">
          <button
            @click="openEditModal(project)"
            class="flex-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
          >
            Editar
          </button>
          <button
            @click="handleDelete(project.id)"
            class="flex-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
          >
            Excluir
          </button>
        </div>
      </div>

      <div v-if="projects.length === 0" class="col-span-full text-center py-12 text-gray-500">
        <p class="text-lg mb-2">Nenhum projeto cadastrado</p>
        <p>Crie seu primeiro projeto pessoal para começar a trackedar seu progresso!</p>
      </div>
    </div>

    <!-- Modal Criar/Editar Projeto -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div class="p-4 sm:p-6 border-b">
          <h2 class="text-lg sm:text-xl font-bold text-gray-800">
            {{ editingProject ? 'Editar Projeto' : 'Novo Projeto' }}
          </h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-4 sm:p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nome</label>
            <input
              v-model="name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Ex: Aprender Inglês"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              v-model="description"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Descreva seu projeto..."
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Meta de Horas Semanais
            </label>
            <input
              v-model.number="weeklyHoursGoal"
              type="number"
              min="1"
              max="40"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {{ editingProject ? 'Salvar' : 'Criar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Registrar Tempo -->
    <div v-if="showLogModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div class="p-4 sm:p-6 border-b flex justify-between items-center">
          <h2 class="text-lg sm:text-xl font-bold text-gray-800">
            ⏱️ Registrar Tempo - {{ selectedProject?.name }}
          </h2>
        </div>

        <form @submit.prevent="handleLogTime" class="p-4 sm:p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Duração (minutos)</label>
            <input
              v-model.number="logDuration"
              type="number"
              min="1"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Data</label>
            <input
              v-model="logDate"
              type="date"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showLogModal = false"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
            >
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Progresso Semanal -->
    <div v-if="showProgressModal && currentProgress" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div class="p-4 sm:p-6 border-b flex justify-between items-center">
          <h2 class="text-lg sm:text-xl font-bold text-gray-800">📊 Progresso Semanal</h2>
          <button @click="showProgressModal = false" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div class="p-4 sm:p-6">
          <div class="text-center mb-6">
            <p class="text-sm sm:text-base text-gray-600">Semana {{ currentProgress.weekNumber }}/{{ currentProgress.year }}</p>
            <p class="text-2xl sm:text-3xl font-bold mt-2" :class="currentProgress.goalReached ? 'text-green-600' : 'text-gray-800'">
              {{ formatHours(currentProgress.totalMinutes) }} / {{ formatHours(currentProgress.goalMinutes) }}
            </p>
          </div>

          <div class="mb-6">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-600">Progresso</span>
              <span class="font-medium">{{ Math.round(currentProgress.percentage) }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div
                class="h-4 rounded-full transition-all"
                :class="currentProgress.goalReached ? 'bg-green-600' : 'bg-blue-600'"
                :style="{ width: `${Math.min(100, currentProgress.percentage)}%` }"
              ></div>
            </div>
          </div>

          <div v-if="currentProgress.goalReached" class="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4">
            <p class="text-green-800 font-semibold text-sm sm:text-base">🎉 Meta batida!</p>
            <p class="text-green-600 text-sm">+50 pontos conquistados</p>
          </div>

          <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center mb-4">
            <p class="text-gray-800 font-semibold text-sm sm:text-base">Falta {{ formatHours(currentProgress.goalMinutes - currentProgress.totalMinutes) }}</p>
            <p class="text-gray-600 text-sm">para bater a meta</p>
          </div>

          <div v-if="currentProgress.dailyLogs.length > 0" class="mt-4">
            <h3 class="font-semibold text-gray-700 mb-3 text-sm sm:text-base">Registros da semana</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div
                v-for="log in currentProgress.dailyLogs"
                :key="log.id"
                class="flex justify-between items-center py-2 border-b last:border-0"
              >
                <span class="text-gray-600 text-sm">{{ new Date(log.date).toLocaleDateString('pt-BR') }}</span>
                <span class="font-medium text-sm sm:text-base">{{ log.duration_minutes }} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
