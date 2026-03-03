<script setup lang="ts">
import { ref, watch } from 'vue';
import { createEntry, updateEntry, uploadImage } from '@/services/api';
import type { UserEntry, ActivityType } from '@/types';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';

const props = defineProps<{
  modelValue: boolean;
  entry: UserEntry | null;
  activityTypes: ActivityType[];
  showActivityTypeSelect?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submitted'): void;
}>();

const { success, error } = useToast();
const handleApiError = createApiErrorHandler();

const isVisible = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
  if (newVal && props.entry) {
    loadEntryData(props.entry);
  } else if (newVal) {
    resetForm();
  }
});

function closeModal() {
  isVisible.value = false;
  emit('update:modelValue', false);
}

// Form state
const selectedActivityType = ref<number | null>(null);
const description = ref('');
const durationMinutes = ref<number | undefined>(undefined);
const entryDate = ref<string>(new Date().toISOString().split('T')[0]!);
const photoUrl = ref('');
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const isUploading = ref(false);

function resetForm() {
  selectedActivityType.value = null;
  description.value = '';
  durationMinutes.value = undefined;
  entryDate.value = new Date().toISOString().split('T')[0]!;
  photoUrl.value = '';
  photoFile.value = null;
  photoPreview.value = null;
}

function loadEntryData(entry: UserEntry) {
  selectedActivityType.value = entry.activity_type_id;
  description.value = entry.description;
  durationMinutes.value = entry.duration_minutes ?? undefined;
  entryDate.value = entry.entry_date ?? new Date().toISOString().split('T')[0]!;
  photoUrl.value = entry.photo_url ?? '';
  photoFile.value = null;
  photoPreview.value = entry.photo_url ?? null;
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

    if (props.entry) {
      await updateEntry(props.entry.id, {
        description: description.value,
        durationMinutes: durationMinutes.value,
        photoUrl: finalPhotoUrl || undefined,
        entryDate: entryDate.value,
      });
      success('Entrada atualizada com sucesso!');
    } else {
      if (!props.showActivityTypeSelect || !selectedActivityType.value) {
        error('Selecione um tipo de atividade');
        return;
      }
      await createEntry({
        activityTypeId: selectedActivityType.value,
        description: description.value,
        photoUrl: finalPhotoUrl || undefined,
        photoIdentifier,
        photoOriginalName,
        durationMinutes: durationMinutes.value,
        entryDate: entryDate.value,
      });
      success('Entrada criada com sucesso!');
    }
    closeModal();
    emit('submitted');
  } catch (err) {
    isUploading.value = false;
    handleApiError(err, 'Erro ao salvar entrada');
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
              {{ entry ? 'Editar Entrada' : 'Nova Entrada' }}
            </h2>
            <button @click="closeModal" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-4 sm:p-6 space-y-4">
            <!-- Tipo de Atividade -->
            <div v-if="showActivityTypeSelect">
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

            <!-- Descrição -->
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

            <!-- Duração -->
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

            <!-- Data de Referência -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Data de Referência
              </label>
              <input
                v-model="entryDate"
                type="date"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
              />
              <p class="text-xs text-gray-500 mt-1">Data em que a atividade foi realizada</p>
            </div>

            <!-- Foto Evidência -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Foto Evidência (opcional)
              </label>

              <!-- Preview da foto -->
              <div v-if="photoPreview" class="mb-3 relative">
                <img 
                  :src="photoPreview" 
                  alt="Preview" 
                  class="max-h-48 rounded-lg object-contain w-full bg-gray-100" 
                />
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
                :disabled="isUploading"
                class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
              >
                {{ isUploading ? 'Enviando...' : (entry ? 'Salvar' : 'Criar') }}
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
