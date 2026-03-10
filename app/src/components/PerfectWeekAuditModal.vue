<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import type { PerfectWeek, UserEntry, ProjectWithLogs } from '@/types';

interface Props {
  modelValue: boolean;
  week: PerfectWeek | null;
  entries: UserEntry[];
  projects: ProjectWithLogs[];
}

const props = withDefaults(defineProps<Props>(), {
  week: null,
  entries: () => [],
  projects: () => [],
});

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const activeTab = ref<'entries' | 'projects'>('entries');

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  });
}

function getActivityTypeIcon(categoryId?: number): string {
  switch (categoryId) {
    case 1: return '🍽️';
    case 2: return '🏃';
    case 3: return '📚';
    case 4: return '🚬';
    default: return '📝';
  }
}

const sortedEntries = computed(() => {
  return [...props.entries].sort((a, b) => 
    new Date(b.entry_date || '').getTime() - new Date(a.entry_date || '').getTime()
  );
});

const entriesByDay = computed(() => {
  const days: Record<string, UserEntry[]> = {};
  
  for (const entry of sortedEntries.value) {
    const date = entry.entry_date || '';
    if (!days[date]) {
      days[date] = [];
    }
    days[date].push(entry);
  }
  
  return days;
});

const exerciseDaysCount = computed(() => {
  const daysWithExercise = new Set<string>();
  for (const entry of props.entries) {
    if (entry.category_id === 2) { // Exercício
      daysWithExercise.add(entry.entry_date || '');
    }
  }
  return daysWithExercise.size;
});

const hasNegativePoints = computed(() => {
  return props.entries.some(e => {
    // Alimentação suja ou entorpecentes
    return (e.category_id === 1 && e.points < 0) || e.category_id === 4;
  });
});

const projectsWithGoalReached = computed(() => {
  return props.projects.filter(p => 
    p.weeklySummaries.some(s => s.goalReached)
  );
});
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="🏆 Auditoria Semana Perfeita"
    size="xl"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <!-- Header com info da semana -->
    <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-4">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-green-800 text-lg">
            Semana {{ week?.weekNumber }}/{{ week?.year }}
          </h3>
          <p class="text-sm text-green-700 mt-1">
            {{ week?.startDate }} - {{ week?.endDate }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold text-green-600">+{{ week?.points }}</div>
          <div class="text-xs text-green-600 font-medium">pontos bônus</div>
        </div>
      </div>
    </div>

    <!-- Critérios de Semana Perfeita -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">✅</span>
          <p class="text-sm text-blue-700 font-semibold">Exercício Diário</p>
        </div>
        <p class="text-xs text-blue-600">
          {{ exerciseDaysCount }}/7 dias com exercício
        </p>
        <p class="text-xs text-blue-500 mt-1">
          {{ exerciseDaysCount === 7 ? '✔ Critério atingido' : '✘ Critério não atingido' }}
        </p>
      </div>
      
      <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">🚫</span>
          <p class="text-sm text-blue-700 font-semibold">Sem Pontos Negativos</p>
        </div>
        <p class="text-xs text-blue-600">
          {{ hasNegativePoints ? 'Houve pontos negativos' : 'Nenhum ponto negativo' }}
        </p>
        <p class="text-xs text-blue-500 mt-1">
          {{ !hasNegativePoints ? '✔ Critério atingido' : '✘ Critério não atingido' }}
        </p>
      </div>
      
      <div class="p-3 bg-green-50 border border-green-200 rounded-lg sm:col-span-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">📚</span>
          <p class="text-sm text-green-700 font-semibold">Meta do Projeto</p>
        </div>
        <p class="text-xs text-green-600">
          {{ projectsWithGoalReached.length }} projeto(s) com meta batida
        </p>
        <p class="text-xs text-green-500 mt-1">
          {{ projectsWithGoalReached.length > 0 ? '✔ Critério atingido' : '✘ Critério não atingido' }}
        </p>
      </div>
    </div>

    <!-- Abas -->
    <div class="flex gap-2 border-b mb-4">
      <button 
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'entries' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
        @click="activeTab = 'entries'"
      >
        📅 Entradas de Atividades ({{ entries.length }})
      </button>
      <button 
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'projects' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
        @click="activeTab = 'projects'"
      >
        📚 Projetos Pessoais ({{ projects.length }})
      </button>
    </div>

    <!-- Conteúdo: Entradas de Atividades -->
    <div v-if="activeTab === 'entries'" class="space-y-4 max-h-96 overflow-y-auto">
      <div v-for="(dayEntries, date) in entriesByDay" :key="date" class="space-y-2">
        <h4 class="font-semibold text-gray-700 text-sm sticky top-0 bg-white py-2">
          {{ formatDate(date) }}
        </h4>
        <div class="space-y-2">
          <div 
            v-for="entry in dayEntries" 
            :key="entry.id" 
            class="p-3 rounded-lg border"
            :class="[
              entry.points > 0 ? 'bg-green-50 border-green-200' : 
              entry.points < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
            ]"
          >
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ getActivityTypeIcon(entry.category_id) }}</span>
                <div>
                  <p class="font-medium text-gray-800">{{ entry.activity_type_name }}</p>
                  <p class="text-xs text-gray-500">{{ entry.description }}</p>
                </div>
              </div>
              <span 
                :class="entry.points > 0 ? 'text-green-600' : 'text-red-600'" 
                class="font-bold text-lg"
              >
                {{ entry.points > 0 ? '+' : '' }}{{ entry.points }} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="entries.length === 0" class="text-center py-8 text-gray-500">
        <p>Nenhuma entrada registrada nesta semana</p>
      </div>
    </div>

    <!-- Conteúdo: Projetos Pessoais -->
    <div v-if="activeTab === 'projects'" class="space-y-3 max-h-96 overflow-y-auto">
      <div 
        v-for="project in projects" 
        :key="project.id" 
        class="p-4 rounded-lg border"
        :class="project.weeklySummaries.some(s => s.goalReached) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-semibold text-gray-800">{{ project.name }}</h4>
          <span 
            v-if="project.weeklySummaries.some(s => s.goalReached)" 
            class="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-semibold"
          >
            ✅ Meta Batida
          </span>
          <span 
            v-else 
            class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs"
          >
            ❌ Não atingida
          </span>
        </div>
        
        <p v-if="project.description" class="text-xs text-gray-600 mb-2">
          {{ project.description }}
        </p>

        <div class="space-y-2">
          <div 
            v-for="summary in project.weeklySummaries" 
            :key="`${summary.year}-${summary.weekNumber}`"
            class="p-2 bg-white rounded border"
          >
            <div class="flex justify-between items-center text-sm mb-1">
              <span class="font-medium">Semana {{ summary.weekNumber }}/{{ summary.year }}</span>
              <span :class="summary.goalReached ? 'text-green-600' : 'text-gray-600'" class="font-semibold">
                {{ formatMinutes(summary.totalMinutes) }} / {{ formatMinutes(summary.goalMinutes) }}
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                :class="summary.goalReached ? 'bg-green-600' : 'bg-gray-400'"
                :style="{ width: `${Math.min(100, (summary.totalMinutes / summary.goalMinutes) * 100)}%` }"
                class="h-2 rounded-full transition-all"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="projects.length === 0" class="text-center py-8 text-gray-500">
        <p>Nenhum projeto registrado nesta semana</p>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span>{{ entries.length }} entradas • {{ projects.length }} projetos</span>
        <span class="font-semibold text-green-700">
          {{ exerciseDaysCount === 7 && !hasNegativePoints && projectsWithGoalReached.length > 0 ? '✅ Semana Perfeita Validada' : '❌ Semana não perfeita' }}
        </span>
      </div>
    </template>
  </BaseModal>
</template>
