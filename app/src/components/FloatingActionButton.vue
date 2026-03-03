<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getValidatedActivityTypes } from '@/services/api';
import type { ActivityType } from '@/types';
import EntryFormModal from './EntryFormModal.vue';
import ProjectLogModal from './ProjectLogModal.vue';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';

const isOpen = ref(false);
const showQuickEntry = ref(false);
const showProjectLog = ref(false);

const { success } = useToast();
const handleApiError = createApiErrorHandler();

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

function openQuickEntry() {
  showQuickEntry.value = true;
  showProjectLog.value = false;
  loadActivityTypes();
}

function openProjectLog() {
  showProjectLog.value = true;
  showQuickEntry.value = false;
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
    <ProjectLogModal
      v-model="showProjectLog"
      :project="null"
      @submitted="emit('entry-created')"
    />
  </div>
</template>
