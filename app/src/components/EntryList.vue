<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { UserEntry, PaginationResponse } from '@/types';
import { CategoryId } from '@/utils/category.enum';

interface Props {
  entries: UserEntry[];
  pagination: PaginationResponse | null;
  loading: boolean;
  showActions: 'edit-delete' | 'view-only' | 'report';
  hideTimeFilters?: boolean;
  page: number;
  limit: number;
}

const props = withDefaults(defineProps<Props>(), {
  hideTimeFilters: false,
  page: 1,
  limit: 10,
});

// Filtros temporais
type TimeFilter = 'today' | 'last3' | 'last7' | 'all';
const timeFilter = ref<TimeFilter>('all');

// Filtro de tipo (badges clicáveis)
type TypeFilter = 'all' | 'positive' | 'negative' | 'invalidated';
const typeFilter = ref<TypeFilter>('all');

// Two-way binding com computed
const emit = defineEmits<{
  'update:page': [page: number];
  'update:limit': [limit: number];
  'update:timeFilter': [filter: TimeFilter];
  'click-entry': [entry: UserEntry];
  'edit-entry': [entry: UserEntry];
  'delete-entry': [entry: UserEntry];
  'report-entry': [entry: UserEntry];
}>();

const currentPage = computed({
  get: () => props.page,
  set: (value) => emit('update:page', value),
});

const entriesPerPage = computed({
  get: () => props.limit,
  set: (value) => emit('update:limit', value),
});

// Resetar página para 1 quando o limite mudar
watch(entriesPerPage, (newLimit, oldLimit) => {
  if (newLimit !== oldLimit) {
    currentPage.value = 1;
  }
});

// Entradas ordenadas por data (mais recente primeiro)
const sortedEntries = computed(() => {
  return [...props.entries].sort((a, b) => {
    const dateA = a.entry_date || a.created_at;
    const dateB = b.entry_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
});

// Filtrar por tipo (client-side)
const filteredEntries = computed(() => {
  const entries = sortedEntries.value;
  
  if (typeFilter.value === 'all') return entries;
  if (typeFilter.value === 'positive') {
    return entries.filter(e => 
      e.category_id === CategoryId.EXERCICIO || 
      (e.category_id === CategoryId.REFEICAO && e.is_activity_positive)
    );
  }
  if (typeFilter.value === 'negative') {
    return entries.filter(e => 
      e.category_id === CategoryId.ENTORPECENTES || 
      (e.category_id === CategoryId.REFEICAO && !e.is_activity_positive)
    );
  }
  if (typeFilter.value === 'invalidated') {
    return entries.filter(e => !e.is_activity_validated);
  }
  
  return entries;
});

// Contagens
const positiveEntries = computed(() => 
  sortedEntries.value.filter(e => 
    e.category_id === CategoryId.EXERCICIO || 
    (e.category_id === CategoryId.REFEICAO && e.is_activity_positive)
  )
);

const negativeEntries = computed(() => 
  sortedEntries.value.filter(e => 
    e.category_id === CategoryId.ENTORPECENTES || 
    (e.category_id === CategoryId.REFEICAO && !e.is_activity_positive)
  )
);

const invalidatedEntries = computed(() => 
  sortedEntries.value.filter(e => !e.is_activity_validated)
);

// Mostrar seletor de quantidade apenas se houver mais de 5 entradas
const showEntriesSelector = computed(() => {
  return props.pagination?.total && props.pagination.total > 5;
});

// Mostrar botões de navegação apenas se houver mais de 1 página
const showNavigation = computed(() => {
  if (!props.pagination) return false;
  return props.pagination.totalPages > 1;
});

function setTimeFilter(filter: TimeFilter) {
  timeFilter.value = filter;
  currentPage.value = 1;
  emit('update:timeFilter', filter);
}

function setTypeFilter(filter: TypeFilter) {
  // Toggle: se já está filtrando por este tipo, remove o filtro
  typeFilter.value = typeFilter.value === filter ? 'all' : filter;
}

function goToPage(page: number) {
  if (page >= 1 && page <= (props.pagination?.totalPages || 1)) {
    currentPage.value = page;
  }
}

function handleClickEntry(entry: UserEntry) {
  emit('click-entry', entry);
}

function handleEdit(entry: UserEntry) {
  emit('edit-entry', entry);
}

function handleDelete(entry: UserEntry) {
  emit('delete-entry', entry);
}

function handleReport(entry: UserEntry) {
  emit('report-entry', entry);
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

function getActivityTypeIcon(categoryId?: number): string {
  switch (categoryId) {
    case 1: return '🍽️';
    case 2: return '🏃';
    case 3: return '📚';
    case 4: return '🚬';
    default: return '📝';
  }
}

// Resetar filtro de tipo quando as entradas mudarem
watch(() => props.entries, () => {
  typeFilter.value = 'all';
});
</script>

<template>
  <div>
    <!-- Filtros Temporais -->
    <div v-if="!hideTimeFilters" class="flex flex-wrap gap-2 mb-4">
      <button
        @click="setTimeFilter('today')"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        :class="timeFilter === 'today' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      >
        📅 Hoje
      </button>
      <button
        @click="setTimeFilter('last3')"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        :class="timeFilter === 'last3' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      >
        Últimos 3 dias
      </button>
      <button
        @click="setTimeFilter('last7')"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        :class="timeFilter === 'last7' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      >
        Última semana
      </button>
      <button
        @click="setTimeFilter('all')"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        :class="timeFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      >
        Tudo
      </button>
    </div>

    <!-- Paginação e Badges -->
    <div v-if="showEntriesSelector || showNavigation" class="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b mb-6">
      <!-- Seletor de quantidade -->
      <div v-if="showEntriesSelector" class="flex items-center gap-2 text-sm text-gray-600">
        <span>Mostrar:</span>
        <select
          v-model.number="entriesPerPage"
          class="px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="15">15</option>
          <option :value="20">20</option>
        </select>
        <span>por página ({{ pagination?.total }} itens totais)</span>
      </div>

      <!-- Controles de página -->
      <div v-if="showNavigation" class="flex items-center gap-2">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
        >
          ← Anterior
        </button>
        <span class="text-sm text-gray-600">
          Página {{ currentPage }} de {{ pagination?.totalPages }}
        </span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === (pagination?.totalPages || 1)"
          class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
        >
          Próxima →
        </button>
      </div>
    </div>

    <!-- Badges de contagem (clicáveis) -->
    <div class="flex gap-2 text-xs mb-4">
      <button
        @click="setTypeFilter('positive')"
        class="px-2 py-1 rounded font-medium transition-opacity cursor-pointer"
        :class="typeFilter === 'positive' ? 'bg-green-100 text-green-800 ring-2 ring-green-500' : 'bg-green-100 text-green-800 opacity-70 hover:opacity-100'"
      >
        ✅ {{ positiveEntries.length }} Positivas
      </button>
      <button
        @click="setTypeFilter('negative')"
        class="px-2 py-1 rounded font-medium transition-opacity cursor-pointer"
        :class="typeFilter === 'negative' ? 'bg-red-100 text-red-800 ring-2 ring-red-500' : 'bg-red-100 text-red-800 opacity-70 hover:opacity-100'"
      >
        ❌ {{ negativeEntries.length }} Negativas
      </button>
      <button
        v-if="invalidatedEntries.length > 0"
        @click="setTypeFilter('invalidated')"
        class="px-2 py-1 rounded font-medium transition-opacity cursor-pointer"
        :class="typeFilter === 'invalidated' ? 'bg-gray-200 text-gray-700 ring-2 ring-gray-500' : 'bg-gray-200 text-gray-700 opacity-70 hover:opacity-100'"
      >
        ⚠️ {{ invalidatedEntries.length }} Invalidadas
      </button>
      <!-- Badge "Todos" para limpar filtro -->
      <button
        @click="setTypeFilter('all')"
        class="px-2 py-1 rounded font-medium transition-opacity cursor-pointer"
        :class="typeFilter === 'all' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500' : 'bg-blue-100 text-blue-800 opacity-70 hover:opacity-100'"
      >
        📋 Todos ({{ sortedEntries.length }})
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <!-- Grid de Entradas -->
    <div v-else>
      <div v-if="filteredEntries.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-500 border">
        <p v-if="typeFilter !== 'all'">Nenhuma entrada deste tipo encontrada</p>
        <p v-else>Nenhuma entrada encontrada</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
          :class="[
            !entry.is_activity_validated ? 'opacity-75 bg-gray-50' : '',
            entry.is_activity_validated && entry.points >= 0 ? 'border-green-200' : '',
            entry.is_activity_validated && entry.points < 0 ? 'border-red-200' : ''
          ]"
          @click="handleClickEntry(entry)"
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
                <span
                  class="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
                  :class="entry.is_activity_validated ? (entry.points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'bg-gray-200 text-gray-700'"
                >
                  {{ entry.is_activity_validated ? (entry.points >= 0 ? '+' : '') : '' }}{{ entry.points }} pts
                </span>
                <span class="text-xs text-gray-500">
                  📅 {{ entry.entry_date ? new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR') : formatDate(entry.created_at).split(' ')[0] }}
                </span>
              </div>
              <p class="text-sm text-gray-700 line-clamp-2 mb-1">{{ entry.description }}</p>
              <div v-if="entry.duration_minutes" class="text-xs text-gray-500">
                ⏱️ {{ entry.duration_minutes }} min
              </div>
              <div v-if="!entry.is_activity_validated" class="text-xs text-red-600 font-medium mt-1">
                ❌ Tipo invalidado
              </div>
            </div>
          </div>
          
          <!-- Ações -->
          <div class="flex gap-2 mt-3 pt-3 border-t">
            <button
              v-if="showActions === 'edit-delete' || showActions === 'report'"
              @click.stop="handleEdit(entry)"
              class="flex-1 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Editar
            </button>
            <button
              v-if="showActions === 'edit-delete'"
              @click.stop="handleDelete(entry)"
              class="flex-1 text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
            >
              Excluir
            </button>
            <button
              v-if="showActions === 'report'"
              @click.stop="handleReport(entry)"
              class="flex-1 text-sm text-orange-600 hover:text-orange-800 font-medium cursor-pointer"
            >
              Reportar
            </button>
            <button
              class="flex-1 text-sm text-purple-600 hover:text-purple-800 font-medium cursor-pointer"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
