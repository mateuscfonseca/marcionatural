<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createEntry, logProjectTime, getMyProjects, getValidatedActivityTypes, uploadImage } from '@/services/api';
import type { PersonalProject, ActivityType } from '@/types';

const isOpen = ref(false);
const showQuickEntry = ref(false);
const showProjectLog = ref(false);

// Quick entry form
const selectedActivityType = ref<number | null>(null);
const activityTypes = ref<ActivityType[]>([]);
const quickDescription = ref('');
const quickDuration = ref<number | null>(null);
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const isUploading = ref(false);

// Project log form
const projects = ref<PersonalProject[]>([]);
const selectedProject = ref<number | null>(null);
const projectDuration = ref(30);

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
  selectedActivityType.value = null;
  quickDescription.value = '';
  quickDuration.value = null;
  photoFile.value = null;
  photoPreview.value = null;
  loadActivityTypes();
}

function openProjectLog() {
  showProjectLog.value = true;
  showQuickEntry.value = false;
  loadProjects();
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
}

async function submitQuickEntry() {
  if (!selectedActivityType.value || !quickDescription.value) {
    alert('Selecione o tipo de atividade e preencha a descrição');
    return;
  }

  try {
    let photoUrl: string | undefined;
    let photoIdentifier: string | undefined;
    let photoOriginalName: string | undefined;

    // Upload de imagem se houver arquivo
    if (photoFile.value) {
      isUploading.value = true;
      const uploadResult = await uploadImage(photoFile.value);
      photoUrl = uploadResult.image.url;
      photoIdentifier = uploadResult.image.identifier;
      photoOriginalName = uploadResult.image.originalName;
      isUploading.value = false;
    }

    await createEntry({
      activityTypeId: selectedActivityType.value,
      description: quickDescription.value,
      photoUrl: photoUrl || undefined,
      photoIdentifier,
      photoOriginalName,
      durationMinutes: quickDuration.value ?? undefined,
    });
    closeModals();
    emit('entry-created');
  } catch (error) {
    console.error('Erro ao criar entrada:', error);
    isUploading.value = false;
    alert('Erro ao criar entrada');
  }
}

async function submitProjectLog() {
  if (!selectedProject.value) return;

  try {
    await logProjectTime(selectedProject.value, projectDuration.value);
    closeModals();
    emit('entry-created');
    alert('Tempo registrado com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar tempo:', error);
    alert('Erro ao registrar tempo');
  }
}

function closeModals() {
  showQuickEntry.value = false;
  showProjectLog.value = false;
  isOpen.value = false;
}
</script>

<template>
  <div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
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
      class="absolute bottom-16 right-0 bg-white rounded-xl shadow-xl py-2 min-w-[200px] border border-gray-200"
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
    <div v-if="showQuickEntry" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 class="text-lg sm:text-xl font-bold text-gray-800">📝 Nova Entrada</h2>
          <button @click="showQuickEntry = false" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div class="p-4 sm:p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Atividade</label>
            <select
              v-model="selectedActivityType"
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
              v-model="quickDescription"
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
              v-model.number="quickDuration"
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
              @click="showQuickEntry = false"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              Cancelar
            </button>
            <button
              @click="submitQuickEntry"
              :disabled="isUploading"
              class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
            >
              {{ isUploading ? 'Enviando...' : 'Registrar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Registrar Projeto -->
    <div v-if="showProjectLog" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
