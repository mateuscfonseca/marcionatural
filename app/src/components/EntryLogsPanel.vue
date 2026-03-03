<script setup lang="ts">
import { computed } from 'vue';
import type { UserEntry, EntryReport } from '@/types';

interface LogItem {
  id: string;
  type: 'created' | 'validated' | 'invalidated' | 'reported';
  title: string;
  description: string;
  icon: string;
  color: string;
  date: string;
}

const props = defineProps<{
  entry: UserEntry;
  reports?: EntryReport[];
}>();

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const logs = computed<LogItem[]>(() => {
  const items: LogItem[] = [];

  // Log de criação
  items.push({
    id: `created-${props.entry.id}`,
    type: 'created',
    title: 'Entrada Criada',
    description: 'Atividade registrada pelo usuário',
    icon: '📝',
    color: 'blue',
    date: props.entry.created_at,
  });

  // Log de validação/invalidação
  if (props.entry.invalidated_at) {
    items.push({
      id: `invalidated-${props.entry.id}`,
      type: 'invalidated',
      title: 'Tipo Invalidado',
      description: 'O tipo de atividade foi invalidado pela comunidade',
      icon: '❌',
      color: 'red',
      date: props.entry.invalidated_at,
    });
  } else if (props.entry.is_activity_validated) {
    items.push({
      id: `validated-${props.entry.id}`,
      type: 'validated',
      title: 'Tipo Validado',
      description: 'O tipo de atividade está validado pela comunidade',
      icon: '✅',
      color: 'green',
      date: props.entry.created_at, // Usa data de criação como referência
    });
  }

  // Logs de reports
  if (props.reports && props.reports.length > 0) {
    props.reports.forEach((report, index) => {
      items.push({
        id: `reported-${report.id}`,
        type: 'reported',
        title: 'Report Recebido',
        description: `Report #${index + 1} ${report.reporter_username ? `por ${report.reporter_username}` : ''}`,
        icon: '🚩',
        color: 'orange',
        date: report.created_at,
      });
    });
  }

  // Ordenar por data (mais recente primeiro)
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

function getColorClasses(color: string): { bg: string; border: string; text: string } {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  };
  const result = colors[color];
  if (!result) {
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
  }
  return result;
}
</script>

<template>
  <div class="border-t pt-4">
    <h3 class="font-semibold text-gray-700 mb-4 text-sm">📋 Histórico e Logs</h3>
    
    <div class="relative">
      <!-- Linha vertical da timeline -->
      <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

      <!-- Lista de logs -->
      <div class="space-y-4">
        <div
          v-for="log in logs"
          :key="log.id"
          class="relative flex gap-4"
        >
          <!-- Ícone -->
          <div
            class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2"
            :class="[getColorClasses(log.color).bg, getColorClasses(log.color).border, getColorClasses(log.color).text]"
          >
            {{ log.icon }}
          </div>

          <!-- Conteúdo -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h4 class="font-medium text-gray-800 text-sm">{{ log.title }}</h4>
              <span class="text-xs text-gray-500 whitespace-nowrap">{{ formatDate(log.date) }}</span>
            </div>
            <p class="text-sm text-gray-600">{{ log.description }}</p>
          </div>
        </div>
      </div>

      <!-- Mensagem quando não há logs -->
      <div v-if="logs.length === 0" class="relative z-10 text-center py-4 text-gray-500 text-sm">
        Nenhum log disponível
      </div>
    </div>
  </div>
</template>
