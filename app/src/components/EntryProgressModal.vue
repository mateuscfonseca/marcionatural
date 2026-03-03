<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { UserEntry, EntryReport } from '@/types';
import EntryLogsPanel from './EntryLogsPanel.vue';

const props = defineProps<{
  modelValue: boolean;
  entry: UserEntry | null;
  reports?: EntryReport[];
  hasReported?: boolean;
  showReportButton?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'report'): void;
  (e: 'close'): void;
}>();

const isVisible = ref(props.modelValue);
const showPhotoModal = ref(false);

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
});

function closeModal() {
  isVisible.value = false;
  emit('update:modelValue', false);
  emit('close');
}

function openPhoto() {
  showPhotoModal.value = true;
}

function handleReport() {
  emit('report');
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

const entryReports = computed(() => props.reports || []);
const userHasReported = computed(() => props.hasReported || false);
const canReport = computed(() => {
  return props.showReportButton !== false && 
         !userHasReported.value && 
         props.entry?.is_activity_validated;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isVisible" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
            <h2 class="text-lg font-bold text-gray-800">📝 Detalhes da Entrada</h2>
            <button @click="closeModal" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          <div class="p-4 sm:p-6 space-y-6">
            <!-- Foto -->
            <div v-if="entry?.photo_url" class="relative">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                @click="openPhoto"
                class="w-full h-48 sm:h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
              />
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span class="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                  🔍 Toque para ampliar
                </span>
              </div>
            </div>

            <!-- Informações Principais -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Tipo de Atividade -->
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span class="text-3xl">{{ getActivityTypeIcon(entry?.category_id) }}</span>
                <div>
                  <p class="text-xs text-gray-500">Tipo de Atividade</p>
                  <p class="font-semibold text-gray-800 text-sm">{{ entry?.activity_type_name || 'Atividade' }}</p>
                </div>
              </div>

              <!-- Pontos -->
              <div class="flex items-center gap-3 p-3 rounded-lg"
                   :class="entry && entry.points >= 0 ? 'bg-green-50' : 'bg-red-50'">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="entry && entry.points >= 0 ? 'bg-green-100' : 'bg-red-100'"
                >
                  <span :class="entry && entry.points >= 0 ? 'text-green-600' : 'text-red-600'" class="font-bold">
                    {{ entry && entry.points >= 0 ? '+' : '' }}{{ entry?.points }}
                  </span>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Pontos</p>
                  <p class="font-semibold text-gray-800 text-sm">
                    {{ entry && entry.points >= 0 ? 'Positivos' : 'Negativos' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Descrição -->
            <div class="p-4 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-2">Descrição</p>
              <p class="text-gray-800">{{ entry?.description }}</p>
            </div>

            <!-- Detalhes Adicionais -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Duração -->
              <div v-if="entry?.duration_minutes" class="p-3 bg-gray-50 rounded-lg">
                <p class="text-xs text-gray-500 mb-1">Duração</p>
                <p class="font-medium text-gray-800">⏱️ {{ entry.duration_minutes }} minutos</p>
              </div>

              <!-- Data da Entrada -->
              <div v-if="entry?.entry_date" class="p-3 bg-gray-50 rounded-lg">
                <p class="text-xs text-gray-500 mb-1">Data da Atividade</p>
                <p class="font-medium text-gray-800">📅 {{ new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR') }}</p>
              </div>

              <!-- Data de Criação -->
              <div class="p-3 bg-gray-50 rounded-lg">
                <p class="text-xs text-gray-500 mb-1">Registrado em</p>
                <p class="font-medium text-gray-800">📅 {{ formatDate(entry?.created_at || '') }}</p>
              </div>

              <!-- Status -->
              <div class="p-3 bg-gray-50 rounded-lg">
                <p class="text-xs text-gray-500 mb-1">Status</p>
                <span
                  class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                  :class="entry?.is_activity_validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ entry?.is_activity_validated ? '✅ Validada' : '❌ Invalidada' }}
                </span>
              </div>
            </div>

            <!-- Timeline de Logs -->
            <EntryLogsPanel
              v-if="entry"
              :entry="entry"
              :reports="entryReports"
            />

            <!-- Reports -->
            <div v-if="entryReports.length > 0" class="border-t pt-4">
              <h3 class="font-semibold text-gray-700 mb-3 text-sm">🚩 Reports ({{ entryReports.length }})</h3>
              <div class="space-y-2">
                <div
                  v-for="report in entryReports"
                  :key="report.id"
                  class="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3"
                >
                  <span class="text-red-500">🚩</span>
                  <span class="font-medium">{{ report.reporter_username || 'Usuário' }}</span>
                  <span class="text-gray-400">•</span>
                  <span>{{ formatDate(report.created_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Botão Reportar -->
            <div v-if="canReport" class="border-t pt-4">
              <button
                @click="handleReport"
                class="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>🚩</span>
                <span>Reportar como suspeita</span>
              </button>
            </div>
            <div v-else-if="userHasReported" class="border-t pt-4">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p class="text-green-600 font-medium text-sm">
                  ✅ Você já reportou esta entrada
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Modal de Foto (Zoom) -->
  <Transition name="fade">
    <div v-if="showPhotoModal && entry?.photo_url" class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60]" @click="showPhotoModal = false">
      <button
        @click="showPhotoModal = false"
        class="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="entry.photo_url"
        :alt="entry.description"
        class="max-w-full max-h-full object-contain"
        @click.stop
      />
    </div>
  </Transition>
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
