<script setup lang="ts">
import { ref, watch } from 'vue';
import { createEntry, updateEntry, uploadImage } from '@/services/api';
import type { UserEntry, ActivityType } from '@/types';
import BaseModal from './BaseModal.vue';
import { useToast } from '@/composables/useToast';
import { createApiErrorHandler } from '@/utils/handleApiError';
import { sanitizeId } from '@/utils/sanitize';

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
const selectedActivityType = ref<number | null>(null);
const description = ref('');
const durationMinutes = ref<number | undefined>(undefined);
const entryDate = ref<string>(new Date().toISOString().split('T')[0]!);
const photoUrl = ref('');
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const isUploading = ref(false);

watch(() => props.modelValue, (newVal) => {
  if (newVal && props.entry) {
    loadEntryData(props.entry);
  } else if (newVal) {
    resetForm();
  }
});

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
    emit('update:modelValue', false);
    emit('submitted');
  } catch (err) {
    isUploading.value = false;
    handleApiError(err, 'Erro ao salvar entrada');
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="entry ? 'Editar Entrada' : 'Nova Entrada'"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4" data-testid="entry-form-modal">
      <!-- Tipo de Atividade -->
      <div v-if="showActivityTypeSelect">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Atividade
        </label>
        <select
          v-model="selectedActivityType"
          data-testid="activity-type-select"
          required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base"
        >
          <option value="" disabled>Selecione...</option>
          <option v-for="type in activityTypes" :key="type.id" :value="type.id" :data-testid="`activity-type-option-${sanitizeId(type.name)}`">
            {{ type.name }} ({{ type.is_positive ? '+' : '' }}{{ type.base_points }} pts)
          </option>
        </select>
      </div>

      <!-- Descrição -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
        <textarea
          v-model="description"
          data-testid="description-input"
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
          data-testid="duration-input"
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
          data-testid="date-input"
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
            class="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 shadow-lg cursor-pointer"
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
          data-testid="photo-input"
          @change="handlePhotoChange"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
        />
        <p class="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, GIF, WebP. Máx: 5MB</p>
      </div>

      <!-- Ações -->
      <div class="flex gap-3 pt-4">
        <button
          type="button"
          @click="$emit('update:modelValue', false)"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          data-testid="submit-entry-button"
          :disabled="isUploading"
          class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
        >
          {{ isUploading ? 'Enviando...' : (entry ? 'Salvar' : 'Criar') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
