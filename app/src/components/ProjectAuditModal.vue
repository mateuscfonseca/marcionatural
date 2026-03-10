<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import type { ProjectWithLogs } from '@/types';

interface Props {
  modelValue: boolean;
  project: ProjectWithLogs | null;
}

const props = withDefaults(defineProps<Props>(), {
  project: null,
});

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const activeTab = ref<'logs' | 'summaries'>('summaries');

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
  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function getWeekStartEnd(weekNumber: number, year: number): { start: string; end: string } {
  // Calcula segunda-feira da semana ISO
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const firstThursday = new Date(Date.UTC(year, 0, 1));
  while (firstThursday.getUTCDay() !== 4) {
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 1);
  }
  const week1Monday = new Date(firstThursday);
  week1Monday.setUTCDate(week1Monday.getUTCDate() - 3);

  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(targetMonday.getUTCDate() + (weekNumber - 1) * 7);

  const sunday = new Date(targetMonday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const startStr = targetMonday.toLocaleDateString('pt-BR');
  const endStr = sunday.toLocaleDateString('pt-BR');

  return { start: startStr, end: endStr };
}

const sortedLogs = computed(() => {
  if (!props.project) return [];
  return [...props.project.logs].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
});

const sortedSummaries = computed(() => {
  if (!props.project) return [];
  return [...props.project.weeklySummaries].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.weekNumber - a.weekNumber;
  });
});
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="📊 Auditoria de Projeto"
    size="xl"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <!-- Info da Meta -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-2 text-sm text-blue-700">
        <span>🎯</span>
        <span>Meta Semanal: <strong>{{ project?.weeklyHoursGoal }}h</strong> ({{ project?.weeklyHoursGoal! * 60 }} min)</span>
      </div>
    </div>

    <!-- Abas -->
    <div class="flex gap-2 border-b mb-4">
      <button 
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'summaries' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
        @click="activeTab = 'summaries'"
      >
        📊 Resumos Semanais
      </button>
      <button 
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'logs' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
        @click="activeTab = 'logs'"
      >
        📅 Logs Diários
      </button>
    </div>

    <!-- Conteúdo: Resumos Semanais -->
    <div v-if="activeTab === 'summaries'" class="space-y-3">
      <div 
        v-for="summary in sortedSummaries" 
        :key="`${summary.year}-${summary.weekNumber}`"
        class="p-4 border rounded-lg transition-shadow hover:shadow-md"
        :class="summary.goalReached ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'"
      >
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-gray-800">
              Semana {{ summary.weekNumber }}/{{ summary.year }}
            </p>
            <span 
              v-if="summary.goalReached" 
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
        </div>
        
        <p class="text-sm text-gray-600 mb-3">
          {{ getWeekStartEnd(summary.weekNumber, summary.year).start }} - {{ getWeekStartEnd(summary.weekNumber, summary.year).end }}
        </p>
        
        <div class="flex justify-between items-center text-sm">
          <div>
            <span class="text-gray-600">Total:</span>
            <strong :class="summary.goalReached ? 'text-green-700' : 'text-gray-700'">
              {{ formatMinutes(summary.totalMinutes) }}
            </strong>
          </div>
          <div>
            <span class="text-gray-600">Meta:</span>
            <strong class="text-gray-700">{{ formatMinutes(summary.goalMinutes) }}</strong>
          </div>
          <div>
            <span class="text-gray-600">Progresso:</span>
            <strong :class="summary.goalReached ? 'text-green-700' : 'text-gray-700'">
              {{ Math.round((summary.totalMinutes / summary.goalMinutes) * 100) }}%
            </strong>
          </div>
        </div>
      </div>

      <div v-if="sortedSummaries.length === 0" class="text-center py-8 text-gray-500">
        <p>Nenhum registro encontrado</p>
      </div>
    </div>

    <!-- Conteúdo: Logs Diários -->
    <div v-if="activeTab === 'logs'" class="space-y-2">
      <div 
        v-for="log in sortedLogs" 
        :key="log.id"
        class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div>
          <p class="font-medium text-gray-800">{{ formatDate(log.date) }}</p>
          <p class="text-xs text-gray-500">
            Semana {{ log.weekNumber }}/{{ log.year }} • {{ log.date }}
          </p>
        </div>
        <div class="text-green-600 font-bold">
          {{ formatMinutes(log.duration_minutes) }}
        </div>
      </div>

      <div v-if="sortedLogs.length === 0" class="text-center py-8 text-gray-500">
        <p>Nenhum registro encontrado</p>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span>{{ sortedLogs.length }} registros</span>
        <span>{{ sortedSummaries.filter(s => s.goalReached).length }}/{{ sortedSummaries.length }} semanas com meta batida</span>
      </div>
    </template>
  </BaseModal>
</template>
