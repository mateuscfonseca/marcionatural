<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getMyEntries, createEntry, updateEntry, deleteEntry, getValidatedActivityTypes, uploadImage } from '@/services/api';
import type { UserEntry, ActivityType } from '@/types';

const entries = ref<UserEntry[]>([]);
const activityTypes = ref<ActivityType[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingEntry = ref<UserEntry | null>(null);
const showDeleteConfirm = ref(false);
const entryToDelete = ref<number | null>(null);

// Form
const selectedActivityType = ref<number | null>(null);
const description = ref('');
const durationMinutes = ref<number | undefined>(undefined);
const photoUrl = ref('');
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const isUploading = ref(false);

const positiveEntries = computed(() => entries.value.filter(e => e.points > 0 && e.is_activity_validated));
const negativeEntries = computed(() => entries.value.filter(e => e.points < 0 && e.is_activity_validated));
const invalidatedEntries = computed(() => entries.value.filter(e => !e.is_activity_validated));

async function loadEntries() {
  try {
    const [entriesData, typesData] = await Promise.all([
      getMyEntries(),
      getValidatedActivityTypes(),
    ]);
    entries.value = entriesData.entries;
    activityTypes.value = typesData.activityTypes;
  } catch (error) {
    console.error('Erro ao carregar entradas:', error);
  } finally {
    loading.value = false;
  }
}

function openNewEntryModal() {
  editingEntry.value = null;
  selectedActivityType.value = null;
  description.value = '';
  durationMinutes.value = undefined;
  photoUrl.value = '';
  photoFile.value = null;
  photoPreview.value = null;
  showModal.value = true;
}

function openEditModal(entry: UserEntry) {
  editingEntry.value = entry;
  selectedActivityType.value = entry.activity_type_id;
  description.value = entry.description;
  durationMinutes.value = entry.duration_minutes ?? undefined;
  photoUrl.value = entry.photo_url ?? '';
  photoFile.value = null;
  photoPreview.value = entry.photo_url ?? null;
  showModal.value = true;
}

async function handleSubmit() {
  try {
    let finalPhotoUrl = photoUrl.value;
    let photoIdentifier: string | undefined;
    let photoOriginalName: string | undefined;

    // Upload de imagem se houver arquivo
    if (photoFile.value) {
      isUploading.value = true;
      const uploadResult = await uploadImage(photoFile.value);
      finalPhotoUrl = uploadResult.image.url;
      photoIdentifier = uploadResult.image.identifier;
      photoOriginalName = uploadResult.image.originalName;
      isUploading.value = false;
    }

    if (editingEntry.value) {
      await updateEntry(editingEntry.value.id, {
        description: description.value,
        durationMinutes: durationMinutes.value,
        photoUrl: finalPhotoUrl || undefined,
      });
    } else {
      if (!selectedActivityType.value) {
        alert('Selecione um tipo de atividade');
        return;
      }
      await createEntry({
        activityTypeId: selectedActivityType.value,
        description: description.value,
        photoUrl: finalPhotoUrl || undefined,
        photoIdentifier,
        photoOriginalName,
        durationMinutes: durationMinutes.value,
      });
    }
    showModal.value = false;
    await loadEntries();
  } catch (error) {
    console.error('Erro ao salvar entrada:', error);
    isUploading.value = false;
    alert('Erro ao salvar entrada');
  }
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

function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    photoFile.value = file;
    photoPreview.value = URL.createObjectURL(file);
  }
}

function clearPhoto() {
  photoFile.value = null;
  photoPreview.value = null;
  photoUrl.value = '';
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
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div
            v-for="entry in positiveEntries"
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
                  <span class="text-xs text-gray-500">{{ formatDate(entry.created_at).split(' ')[0] }}</span>
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
      </div>

      <!-- Entradas Negativas -->
      <div>
        <h2 class="text-base sm:text-lg font-semibold text-red-600 mb-4">
          ❌ Negativas ({{ negativeEntries.length }})
        </h2>
        <div v-if="negativeEntries.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-500 border">
          Nenhuma entrada negativa
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div
            v-for="entry in negativeEntries"
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
                  <span class="text-xs text-gray-500">{{ formatDate(entry.created_at).split(' ')[0] }}</span>
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
                  <span class="text-xs text-gray-500">{{ formatDate(entry.created_at).split(' ')[0] }}</span>
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
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-4 sm:p-6 border-b">
          <h2 class="text-lg sm:text-xl font-bold text-gray-800">
            {{ editingEntry ? 'Editar Entrada' : 'Nova Entrada' }}
          </h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-4 sm:p-6 space-y-4">
          <div v-if="!editingEntry">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Atividade
            </label>
            <select
              v-model="selectedActivityType"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
            >
              <option value="" disabled>Selecione...</option>
              <option v-for="type in activityTypes" :key="type.id" :value="type.id">
                {{ type.name }} ({{ type.is_positive ? '+' : '' }}{{ type.base_points }} pts)
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              v-model="description"
              required
              rows="3"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
              placeholder="Descreva sua atividade..."
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Duração (minutos, opcional)
            </label>
            <input
              v-model.number="durationMinutes"
              type="number"
              min="1"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
              placeholder="Ex: 30"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Foto Evidência (opcional)
            </label>
            
            <!-- Preview da foto -->
            <div v-if="photoPreview" class="mb-3 relative">
              <img :src="photoPreview" alt="Preview" class="max-h-48 rounded-lg object-cover w-full" />
              <button
                type="button"
                @click="clearPhoto"
                class="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 shadow-lg"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Input de upload -->
            <input
              type="file"
              accept="image/*"
              @change="handlePhotoChange"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            />
            <p class="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, GIF, WebP. Máx: 5MB</p>
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isUploading"
              class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
            >
              {{ isUploading ? 'Enviando...' : (editingEntry ? 'Salvar' : 'Criar') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Confirmação de Exclusão -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
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
