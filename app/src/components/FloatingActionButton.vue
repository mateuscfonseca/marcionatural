<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { logProjectTime, getMyProjects, getValidatedActivityTypes } from '@/services/api';
import type { PersonalProject, ActivityType } from '@/types';
import EntryFormModal from './EntryFormModal.vue';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';

const isOpen = ref(false);
const showQuickEntry = ref(false);
const showProjectLog = ref(false);

const { success } = useToast();
const handleApiError = createApiErrorHandler();

// Project log form
const projects = ref<PersonalProject[]>([]);
const selectedProject = ref<number | null>(null);
const projectDuration = ref(30);

// Activity types
const activityTypes = ref<ActivityType[]>([]);

const emit = defineEmits<{
  (e: 'entry-created'): void;
}>();

async function loadActivityTypes() {
  try {
    const data = await getValidatedActivityTypes();
    activityTypes.value = data.activityTypes;
  } catch (error) {
    console.error('Erro ao carregar tipos de atividade:', error);
  }
}

async function loadProjects() {
  try {
    const data = await getMyProjects();
    projects.value = data.projects.filter(p => p.is_active);
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
  }
}

function openQuickEntry() {
  showQuickEntry.value = true;
  showProjectLog.value = false;
  loadActivityTypes();
}

function openProjectLog() {
  showProjectLog.value = true;
  showQuickEntry.value = false;
  loadProjects();
}

async function submitProjectLog() {
  if (!selectedProject.value) return;

  try {
    await logProjectTime(selectedProject.value, projectDuration.value);
    closeModals();
    emit('entry-created');
    success('Tempo registrado com sucesso!');
  } catch (error) {
    handleApiError(error, 'Erro ao registrar tempo');
  }
}

function closeModals() {
  showQuickEntry.value = false;
  showProjectLog.value = false;
  isOpen.value = false;
}
</script>

<template>
  <div class="fixed bottom-4 sm:bottom-6 mx-auto flex items-center justify-center w-full z-40">
    <!-- Botão Principal -->
    <button
      @click="isOpen = !isOpen"
      class="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all flex items-center justify-center text-2xl"
      :class="{ 'rotate-45': isOpen }"
    >
      {{ isOpen ? '✕' : '+' }}
    </button>

    <!-- Opções -->
    <div
      v-if="isOpen"
      class="absolute bottom-16 bg-white rounded-xl shadow-xl py-2 min-w-[200px] border border-gray-200"
    >
      <button
        @click="openQuickEntry"
        class="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
      >
        <span class="text-2xl">📝</span>
        <div>
          <p class="font-medium text-gray-800">Nova Entrada</p>
          <p class="text-xs text-gray-500">Refeição ou exercício</p>
        </div>
      </button>
      <button
        @click="openProjectLog"
        class="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
      >
        <span class="text-2xl">⏱️</span>
        <div>
          <p class="font-medium text-gray-800">Registrar Projeto</p>
          <p class="text-xs text-gray-500">Tempo em projeto pessoal</p>
        </div>
      </button>
    </div>

    <!-- Modal Nova Entrada Rápida -->
    <EntryFormModal
      v-model="showQuickEntry"
      :entry="null"
      :activity-types="activityTypes"
      :show-activity-type-select="true"
      @submitted="emit('entry-created')"
    />

    <!-- Modal Registrar Projeto -->
    <div v-if="showProjectLog" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 class="text-lg sm:text-xl font-bold text-gray-800">⏱️ Registrar Tempo no Projeto</h2>
          <button @click="showProjectLog = false" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div class="p-4 sm:p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Projeto</label>
            <select
              v-model="selectedProject"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
            >
              <option value="" disabled>Selecione...</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Duração (minutos)</label>
            <input
              v-model.number="projectDuration"
              type="number"
              min="1"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showProjectLog = false"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              Cancelar
            </button>
            <button
              @click="submitProjectLog"
              class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
            >
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
