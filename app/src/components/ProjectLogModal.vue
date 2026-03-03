<script setup lang="ts">
import { ref, watch } from 'vue';
import { logProjectTime, getMyProjects } from '@/services/api';
import type { PersonalProject } from '@/types';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';

const props = defineProps<{
  modelValue: boolean;
  project?: PersonalProject | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submitted'): void;
}>();

const { success } = useToast();
const handleApiError = createApiErrorHandler();

const isVisible = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    loadProjects();
    if (props.project) {
      selectedProject.value = props.project.id;
    } else {
      selectedProject.value = null;
    }
    duration.value = 30;
    logDate.value = new Date().toISOString().split('T')[0]!;
  }
});

const projects = ref<PersonalProject[]>([]);
const selectedProject = ref<number | null>(null);
const duration = ref(30);
const logDate = ref(new Date().toISOString().split('T')[0]!);

async function loadProjects() {
  try {
    const data = await getMyProjects();
    projects.value = data.projects.filter(p => p.is_active);
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
  }
}

function closeModal() {
  isVisible.value = false;
  emit('update:modelValue', false);
}

async function handleSubmit() {
  if (!selectedProject.value) return;

  try {
    await logProjectTime(selectedProject.value, duration.value, logDate.value || undefined);
    closeModal();
    emit('submitted');
    success('Tempo registrado com sucesso!');
  } catch (error) {
    handleApiError(error, 'Erro ao registrar tempo');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isVisible" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
            <h2 class="text-lg sm:text-xl font-bold text-gray-800">
              ⏱️ Registrar Tempo no Projeto
            </h2>
            <button @click="closeModal" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-4 sm:p-6 space-y-4">
            <!-- Seleção de Projeto -->
            <div v-if="!project">
              <label class="block text-sm font-medium text-gray-700 mb-2">Projeto</label>
              <select
                v-model="selectedProject"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
              >
                <option value="" disabled>Selecione...</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </div>

            <!-- Duração -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Duração (minutos)</label>
              <input
                v-model.number="duration"
                type="number"
                min="1"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
                placeholder="Ex: 30"
              />
            </div>

            <!-- Data -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Data</label>
              <input
                v-model="logDate"
                type="date"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
              />
              <p class="text-xs text-gray-500 mt-1">Data em que o tempo foi registrado</p>
            </div>

            <!-- Ações -->
            <div class="flex gap-3 pt-4">
              <button
                type="button"
                @click="closeModal"
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
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
