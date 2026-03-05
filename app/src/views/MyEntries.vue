<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getMyEntries, deleteEntry, getValidatedActivityTypes, getEntryReports } from '@/services/api';
import type { UserEntry, ActivityType, EntryReport, PaginatedEntriesResponse } from '@/types';
import EntryFormModal from '@/components/EntryFormModal.vue';
import EntryProgressModal from '@/components/EntryProgressModal.vue';
import EntryList from '@/components/EntryList.vue';

const entries = ref<UserEntry[]>([]);
const activityTypes = ref<ActivityType[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingEntry = ref<UserEntry | null>(null);
const showDeleteConfirm = ref(false);
const entryToDelete = ref<UserEntry | null>(null);
const showProgressModal = ref(false);
const selectedEntry = ref<UserEntry | null>(null);
const entryReports = ref<EntryReport[]>([]);
const hasReported = ref(false);

// Paginação (two-way binding com EntryList)
const pagination = ref<PaginatedEntriesResponse['pagination'] | null>(null);
const currentPage = ref(1);
const entriesPerPage = ref(10);

async function loadEntries(page = 1, limit = entriesPerPage.value, timeFilter: 'today' | 'last3' | 'last7' | 'all' = 'all') {
  try {
    const [entriesData, typesData] = await Promise.all([
      getMyEntries({ page, limit, timeFilter }),
      getValidatedActivityTypes(),
    ]);
    entries.value = entriesData.entries;
    pagination.value = entriesData.pagination;
    activityTypes.value = typesData.activityTypes;
    currentPage.value = page;
  } catch (error) {
    console.error('Erro ao carregar entradas:', error);
  } finally {
    loading.value = false;
  }
}

// Watch para recarregar quando página ou limite mudarem (two-way binding)
watch([currentPage, entriesPerPage], ([newPage, newLimit], [oldPage, oldLimit]) => {
  // Ignorar se valores forem undefined (inicialização)
  if (oldPage === undefined && oldLimit === undefined) {
    return;
  }
  loadEntries(newPage, newLimit);
});

function handleTimeFilterChange(filter: 'today' | 'last3' | 'last7' | 'all') {
  currentPage.value = 1;
  loadEntries(1, entriesPerPage.value, filter);
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

function confirmDelete(entry: UserEntry) {
  entryToDelete.value = entry;
  showDeleteConfirm.value = true;
}

async function handleDelete() {
  if (!entryToDelete.value) return;
  try {
    await deleteEntry(entryToDelete.value.id);
    await loadEntries();
  } catch (error) {
    console.error('Erro ao deletar entrada:', error);
  } finally {
    showDeleteConfirm.value = false;
    entryToDelete.value = null;
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
  showProgressModal.value = true;
}

onMounted(() => loadEntries());
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-800">📝 Minhas Entradas</h1>
      <button
        @click="openNewEntryModal"
        class="px-4 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm sm:text-base font-medium cursor-pointer"
      >
        <span>➕</span>
        <span class="hidden sm:inline">Nova Entrada</span>
        <span class="sm:hidden">Entrada</span>
      </button>
    </div>

    <EntryList
      v-model:page="currentPage"
      v-model:limit="entriesPerPage"
      :entries="entries"
      :pagination="pagination"
      :loading="loading"
      show-actions="edit-delete"
      @update:time-filter="handleTimeFilterChange"
      @click-entry="openEntryDetails"
      @edit-entry="openEditModal"
      @delete-entry="confirmDelete"
    />

    <!-- Modal de Criar/Editar -->
    <EntryFormModal
      v-model="showModal"
      :entry="editingEntry"
      :activity-types="activityTypes"
      :show-activity-type-select="!editingEntry"
      @submitted="handleSubmit"
    />

    <!-- Modal de Progresso/Detalhes da Entrada -->
    <EntryProgressModal
      v-model="showProgressModal"
      :entry="selectedEntry"
      :reports="entryReports"
      :has-reported="hasReported"
      :show-report-button="false"
    />

    <!-- Modal de Confirmação de Exclusão -->
    <Transition name="slide-up">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 sm:bg-black/40 sm:backdrop-blur-sm" @click.self="showDeleteConfirm = false">
        <div class="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Confirmar Exclusão</h3>
          <p class="text-gray-600 mb-6 text-sm sm:text-base">Tem certeza que deseja excluir esta entrada?</p>
          <div class="flex gap-3">
            <button
              @click="showDeleteConfirm = false"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              @click="handleDelete"
              class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-up-enter-from {
  transform: translateY(100%);
}

.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
