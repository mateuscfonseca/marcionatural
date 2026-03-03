<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getMyEntries, deleteEntry, getValidatedActivityTypes } from '@/services/api';
import type { UserEntry, ActivityType } from '@/types';
import EntryFormModal from '@/components/EntryFormModal.vue';

const entries = ref<UserEntry[]>([]);
const activityTypes = ref<ActivityType[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingEntry = ref<UserEntry | null>(null);
const showDeleteConfirm = ref(false);
const entryToDelete = ref<number | null>(null);

// Paginação
const currentPagePositive = ref(1);
const currentPageNegative = ref(1);
const entriesPerPage = ref(6);

const positiveEntries = computed(() => entries.value.filter(e => e.points > 0 && e.is_activity_validated));
const negativeEntries = computed(() => entries.value.filter(e => e.points < 0 && e.is_activity_validated));
const invalidatedEntries = computed(() => entries.value.filter(e => !e.is_activity_validated));

// Paginação
const paginatedPositive = computed(() => {
  const start = (currentPagePositive.value - 1) * entriesPerPage.value;
  const end = start + entriesPerPage.value;
  return positiveEntries.value.slice(start, end);
});

const paginatedNegative = computed(() => {
  const start = (currentPageNegative.value - 1) * entriesPerPage.value;
  const end = start + entriesPerPage.value;
  return negativeEntries.value.slice(start, end);
});

const totalPagesPositive = computed(() => Math.ceil(positiveEntries.value.length / entriesPerPage.value));
const totalPagesNegative = computed(() => Math.ceil(negativeEntries.value.length / entriesPerPage.value));

function goToPagePositive(page: number) {
  if (page >= 1 && page <= totalPagesPositive.value) {
    currentPagePositive.value = page;
  }
}

function goToPageNegative(page: number) {
  if (page >= 1 && page <= totalPagesNegative.value) {
    currentPageNegative.value = page;
  }
}

async function loadEntries() {
  try {
    const [entriesData, typesData] = await Promise.all([
      getMyEntries(),
      getValidatedActivityTypes(),
    ]);
    entries.value = entriesData.entries;
    activityTypes.value = typesData.activityTypes;
    // Resetar paginação ao carregar novas entradas
    currentPagePositive.value = 1;
    currentPageNegative.value = 1;
  } catch (error) {
    console.error('Erro ao carregar entradas:', error);
  } finally {
    loading.value = false;
  }
}

function openNewEntryModal() {
  editingEntry.value = null;
  showModal.value = true;
}

function openEditModal(entry: UserEntry) {
  editingEntry.value = entry;
  showModal.value = true;
}

async function handleSubmit() {
  await loadEntries();
}

function confirmDelete(id: number) {
  entryToDelete.value = id;
  showDeleteConfirm.value = true;
}

async function handleDelete() {
  if (!entryToDelete.value) return;
  try {
    await deleteEntry(entryToDelete.value);
    await loadEntries();
  } catch (error) {
    console.error('Erro ao deletar entrada:', error);
  } finally {
    showDeleteConfirm.value = false;
    entryToDelete.value = null;
  }
}

function formatPoints(points: number): string {
  return points >= 0 ? `+${points}` : `${points}`;
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

function getActivityTypeName(id: number): string {
  return activityTypes.value.find(at => at.id === id)?.name || 'Desconhecido';
}

onMounted(loadEntries);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-800">📝 Minhas Entradas</h1>
      <button
        @click="openNewEntryModal"
        class="px-4 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm sm:text-base font-medium"
      >
        <span>➕</span>
        <span class="hidden sm:inline">Nova Entrada</span>
        <span class="sm:hidden">Entrada</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Entradas Positivas -->
      <div>
        <h2 class="text-base sm:text-lg font-semibold text-green-600 mb-4">
          ✅ Positivas ({{ positiveEntries.length }})
        </h2>
        <div v-if="positiveEntries.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-500 border">
          Nenhuma entrada positiva
        </div>
        <div v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="entry in paginatedPositive"
              :key="entry.id"
              class="bg-white rounded-xl shadow-sm border border-green-200 p-4"
            >
              <div class="flex gap-3">
                <div v-if="entry.photo_url" class="flex-shrink-0">
                  <img
                    :src="entry.photo_url"
                    :alt="entry.description"
                    class="w-16 h-16 object-cover rounded-lg"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                      +{{ entry.points }} pts
                    </span>
                    <span class="text-xs text-gray-500">
                      📅 {{ entry.entry_date ? new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR') : formatDate(entry.created_at).split(' ')[0] }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-700 line-clamp-2 mb-1">{{ entry.description }}</p>
                  <div v-if="entry.duration_minutes" class="text-xs text-gray-500">
                    ⏱️ {{ entry.duration_minutes }} min
                  </div>
                </div>
              </div>
              <div class="flex gap-2 mt-3 pt-3 border-t">
                <button
                  @click="openEditModal(entry)"
                  class="flex-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Editar
                </button>
                <button
                  @click="confirmDelete(entry.id)"
                  class="flex-1 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
          
          <!-- Paginação Positivas -->
          <div v-if="totalPagesPositive > 1" class="flex justify-center items-center gap-2 mt-4">
            <button
              @click="goToPagePositive(currentPagePositive - 1)"
              :disabled="currentPagePositive === 1"
              class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span class="text-sm text-gray-600">
              Página {{ currentPagePositive }} de {{ totalPagesPositive }}
            </span>
            <button
              @click="goToPagePositive(currentPagePositive + 1)"
              :disabled="currentPagePositive === totalPagesPositive"
              class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        </div>
      </div>

      <!-- Entradas Negativas -->
      <div>
        <h2 class="text-base sm:text-lg font-semibold text-red-600 mb-4">
          ❌ Negativas ({{ negativeEntries.length }})
        </h2>
        <div v-if="negativeEntries.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-500 border">
          Nenhuma entrada negativa
        </div>
        <div v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="entry in paginatedNegative"
              :key="entry.id"
              class="bg-white rounded-xl shadow-sm border border-red-200 p-4"
            >
              <div class="flex gap-3">
                <div v-if="entry.photo_url" class="flex-shrink-0">
                  <img
                    :src="entry.photo_url"
                    :alt="entry.description"
                    class="w-16 h-16 object-cover rounded-lg"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 whitespace-nowrap">
                      {{ entry.points }} pts
                    </span>
                    <span class="text-xs text-gray-500">
                      📅 {{ entry.entry_date ? new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR') : formatDate(entry.created_at).split(' ')[0] }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-700 line-clamp-2 mb-1">{{ entry.description }}</p>
                  <div v-if="entry.duration_minutes" class="text-xs text-gray-500">
                    ⏱️ {{ entry.duration_minutes }} min
                  </div>
                </div>
              </div>
              <div class="flex gap-2 mt-3 pt-3 border-t">
                <button
                  @click="openEditModal(entry)"
                  class="flex-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Editar
                </button>
                <button
                  @click="confirmDelete(entry.id)"
                  class="flex-1 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
          
          <!-- Paginação Negativas -->
          <div v-if="totalPagesNegative > 1" class="flex justify-center items-center gap-2 mt-4">
            <button
              @click="goToPageNegative(currentPageNegative - 1)"
              :disabled="currentPageNegative === 1"
              class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span class="text-sm text-gray-600">
              Página {{ currentPageNegative }} de {{ totalPagesNegative }}
            </span>
            <button
              @click="goToPageNegative(currentPageNegative + 1)"
              :disabled="currentPageNegative === totalPagesNegative"
              class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        </div>
      </div>

      <!-- Entradas Invalidadas -->
      <div v-if="invalidatedEntries.length > 0">
        <h2 class="text-base sm:text-lg font-semibold text-gray-600 mb-4">
          ⚠️ Invalidadas ({{ invalidatedEntries.length }})
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div
            v-for="entry in invalidatedEntries"
            :key="entry.id"
            class="bg-gray-100 rounded-xl shadow-sm border border-gray-300 p-4 opacity-75"
          >
            <div class="flex gap-3">
              <div v-if="entry.photo_url" class="flex-shrink-0">
                <img
                  :src="entry.photo_url"
                  :alt="entry.description"
                  class="w-16 h-16 object-cover rounded-lg"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <span class="px-2 py-1 rounded text-xs font-semibold bg-gray-300 text-gray-700 whitespace-nowrap">
                    0 pts
                  </span>
                  <span class="text-xs text-gray-500">
                    📅 {{ entry.entry_date ? new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR') : formatDate(entry.created_at).split(' ')[0] }}
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

    <!-- Modal de Criar/Editar -->
    <EntryFormModal
      v-model="showModal"
      :entry="editingEntry"
      :activity-types="activityTypes"
      :show-activity-type-select="!editingEntry"
      @submitted="handleSubmit"
    />

    <!-- Modal de Confirmação de Exclusão -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Confirmar Exclusão</h3>
        <p class="text-gray-600 mb-6 text-sm sm:text-base">Tem certeza que deseja excluir esta entrada?</p>
        <div class="flex gap-3">
          <button
            @click="showDeleteConfirm = false"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
          >
            Cancelar
          </button>
          <button
            @click="handleDelete"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
