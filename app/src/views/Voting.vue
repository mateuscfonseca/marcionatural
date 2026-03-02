<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import {
  getVotingAvailableEntries,
  getVotingInvalidatedEntries,
  getMyVotingInvalidatedEntries,
  getMyReports,
  getMyReportedEntries,
  getVotingStats,
  reportEntry,
  removeEntryReport,
} from '@/services/api';
import type { VotingEntry, VotingStats } from '@/types';

const availableEntries = ref<VotingEntry[]>([]);
const invalidatedEntries = ref<VotingEntry[]>([]);
const myInvalidatedEntries = ref<VotingEntry[]>([]);
const myReports = ref<Array<{
  id: number;
  entry_id: number;
  entry_description: string;
  entry_photo_url: string | null;
  entry_points: number;
  entry_created_at: string;
  entry_is_invalidated: boolean;
  report_created_at: string;
  owner_username: string;
  report_count: number;
}>>([]);
const myReportedEntries = ref<Array<{
  id: number;
  description: string;
  photo_url: string | null;
  points: number;
  created_at: string;
  is_invalidated: boolean;
  report_count: number;
  report_created_at: string | null;
}>>([]);
const stats = ref<VotingStats | null>(null);
const loading = ref(true);
const activeTab = ref<'available' | 'invalidated' | 'my-invalidated' | 'my-reports' | 'received-reports'>('available');
const tabsContainer = ref<HTMLElement | null>(null);
const showScrollIndicator = ref(true);

async function loadData() {
  try {
    const [available, invalidated, myInvalidated, myReportsData, myReportedEntriesData, statsData] = await Promise.all([
      getVotingAvailableEntries(),
      getVotingInvalidatedEntries(),
      getMyVotingInvalidatedEntries(),
      getMyReports(),
      getMyReportedEntries(),
      getVotingStats(),
    ]);
    availableEntries.value = available.entries;
    invalidatedEntries.value = invalidated.entries;
    myInvalidatedEntries.value = myInvalidated.entries;
    myReports.value = myReportsData.reports;
    myReportedEntries.value = myReportedEntriesData.entries;
    stats.value = statsData.stats;
    console.log('[Voting] Dados carregados:', {
      available: availableEntries.value.length,
      invalidated: invalidatedEntries.value.length,
      myInvalidated: myInvalidatedEntries.value.length,
      myReports: myReports.value.length,
      myReportedEntries: myReportedEntries.value.length,
    });
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  } finally {
    loading.value = false;
  }
}

async function handleReport(entryId: number) {
  try {
    await reportEntry(entryId);
    await loadData();
  } catch (error) {
    console.error('Erro ao reportar:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao reportar';
    if (msg.includes('já reportou')) {
      alert('Você já reportou esta entrada!');
    } else {
      alert('Erro ao reportar entrada');
    }
  }
}

async function handleRemoveReport(entryId: number) {
  try {
    if (confirm('Tem certeza que deseja remover seu report?')) {
      await removeEntryReport(entryId);
      await loadData();
    }
  } catch (error) {
    console.error('Erro ao remover report:', error);
    alert('Erro ao remover report');
  }
}

async function handleRemoveReportFromMyReports(reportId: number, entryId: number) {
  try {
    if (confirm('Tem certeza que deseja remover este report?')) {
      await removeEntryReport(entryId);
      await loadData();
    }
  } catch (error) {
    console.error('Erro ao remover report:', error);
    alert('Erro ao remover report');
  }
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

function getReportBadgeClass(reportCount: number): string {
  if (reportCount >= 3) return 'bg-red-100 text-red-800';
  if (reportCount >= 2) return 'bg-orange-100 text-orange-800';
  return 'bg-yellow-100 text-yellow-800';
}

function getReportBadgeText(reportCount: number): string {
  if (reportCount >= 3) return `🚫 ${reportCount}/3`;
  return `⚠️ ${reportCount}/3`;
}

function updateScrollIndicator() {
  if (tabsContainer.value) {
    const { scrollLeft, scrollWidth, clientWidth } = tabsContainer.value;
    // Mostra o indicador se não estiver no final do scroll (com margem de 10px)
    showScrollIndicator.value = scrollLeft + clientWidth < scrollWidth - 10;
  }
}

onMounted(async () => {
  await loadData();
  await nextTick();
  updateScrollIndicator();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 overflow-x-hidden">
    <!-- Header -->
    <div class="bg-white border-b px-3 sm:px-6 lg:px-8 py-4">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-800">🚩 Votação</h1>
      <p class="text-xs sm:text-sm text-gray-600 mt-1">
        Reporte entradas suspeitas. 3 reports invalidam.
      </p>
    </div>

    <div class="p-3 sm:p-6 lg:p-8 w-full max-w-full sm:max-w-7xl mx-auto overflow-hidden">
      <!-- Estatísticas -->
      <div v-if="stats" class="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div class="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
          <div class="text-xl sm:text-2xl font-bold text-blue-600">{{ stats.entriesAvailableToVote }}</div>
          <div class="text-xs text-blue-700 mt-1">Para votar</div>
        </div>
        <div class="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200">
          <div class="text-xl sm:text-2xl font-bold text-green-600">{{ stats.myTotalReports }}</div>
          <div class="text-xs text-green-700 mt-1">Meus reports</div>
        </div>
        <div class="bg-orange-50 rounded-xl p-3 sm:p-4 border border-orange-200">
          <div class="text-xl sm:text-2xl font-bold text-orange-600">{{ stats.myInvalidatedEntries }}</div>
          <div class="text-xs text-orange-700 mt-1">Minhas invalidadas</div>
        </div>
        <div class="bg-red-50 rounded-xl p-3 sm:p-4 border border-red-200">
          <div class="text-xl sm:text-2xl font-bold text-red-600">{{ stats.totalInvalidatedEntries }}</div>
          <div class="text-xs text-red-700 mt-1">Total invalidadas</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="relative mb-6">
        <div
          ref="tabsContainer"
          class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0"
          @scroll="updateScrollIndicator"
        >
          <button
            @click="activeTab = 'available'"
            class="px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="activeTab === 'available' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            📋 Para Votar ({{ availableEntries.length }})
          </button>
          <button
            @click="activeTab = 'invalidated'"
            class="px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="activeTab === 'invalidated' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            🚫 Invalidadas ({{ invalidatedEntries.length }})
          </button>
          <button
            @click="activeTab = 'my-invalidated'"
            class="px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="activeTab === 'my-invalidated' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            ⚠️ Minhas ({{ myInvalidatedEntries.length }})
          </button>
          <button
            @click="activeTab = 'my-reports'"
            class="px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="activeTab === 'my-reports' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            📝 Meus Reports ({{ myReports.length }})
          </button>
          <button
            @click="activeTab = 'received-reports'"
            class="px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-xs sm:text-sm flex-shrink-0"
            :class="activeTab === 'received-reports' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            📬 Recebidos ({{ myReportedEntries.length }})
          </button>
        </div>
        <!-- Indicador de scroll (mobile only) -->
        <div
          v-if="showScrollIndicator"
          class="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-r from-transparent to-gray-50 pointer-events-none sm:hidden flex items-center justify-end pr-1"
        >
          <span class="text-gray-400 text-sm animate-pulse font-bold">→</span>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Carregando...</p>
      </div>

      <!-- Entradas Disponíveis para Votar -->
      <div v-else-if="activeTab === 'available'" class="space-y-3">
        <div v-if="availableEntries.length === 0" class="bg-white rounded-xl p-8 text-center border">
          <p class="text-gray-500 text-base">Nenhuma entrada pendente</p>
          <p class="text-gray-400 text-sm mt-2">Você já reportou todas as entradas</p>
        </div>

        <div
          v-for="entry in availableEntries"
          :key="entry.id"
          class="bg-white rounded-xl shadow-sm border p-3 sm:p-4 w-full overflow-hidden"
        >
          <div class="flex gap-2 sm:gap-3">
            <!-- Foto -->
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2 break-words">{{ entry.description }}</p>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0"
                  :class="entry.points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ entry.points >= 0 ? '+' : '' }}{{ entry.points }}
                </span>
              </div>

              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  class="px-2 py-1 rounded text-xs font-semibold"
                  :class="getReportBadgeClass(entry.report_count)"
                >
                  {{ getReportBadgeText(entry.report_count) }}
                </span>
                <span class="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">👤 {{ entry.username }}</span>
              </div>

              <button
                @click="handleReport(entry.id)"
                class="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                🚩 Reportar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Entradas Invalidadas -->
      <div v-else-if="activeTab === 'invalidated'" class="space-y-3">
        <div v-if="invalidatedEntries.length === 0" class="bg-white rounded-xl p-8 text-center border">
          <p class="text-gray-500 text-base">Nenhuma entrada invalidada</p>
        </div>

        <div
          v-for="entry in invalidatedEntries"
          :key="entry.id"
          class="bg-red-50 rounded-xl shadow-sm border border-red-200 p-3 sm:p-4 w-full overflow-hidden"
        >
          <div class="flex gap-2 sm:gap-3">
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg opacity-75"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2 break-words">{{ entry.description }}</p>
                <span class="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white whitespace-nowrap flex-shrink-0">
                  🚫 {{ entry.report_count }}
                </span>
              </div>

              <p class="text-xs text-gray-500 mb-2 truncate sm:truncate-none">
                👤 {{ entry.username }} • 📅 {{ formatDate(entry.created_at) }}
              </p>

              <p class="text-xs text-red-600 font-medium">
                ❌ Invalidada - não conta pontos
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Minhas Entradas Invalidadas -->
      <div v-else-if="activeTab === 'my-invalidated'" class="space-y-3">
        <div v-if="myInvalidatedEntries.length === 0" class="bg-green-50 rounded-xl p-8 text-center border border-green-200">
          <p class="text-green-600 text-base font-medium">✅ Nenhuma entrada invalidada</p>
          <p class="text-green-500 text-sm mt-1">Suas entradas estão todas regulares</p>
        </div>

        <div
          v-for="entry in myInvalidatedEntries"
          :key="entry.id"
          class="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-3 sm:p-4 w-full overflow-hidden"
        >
          <div class="flex gap-2 sm:gap-3">
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2 break-words">{{ entry.description }}</p>
                <span class="px-2 py-1 rounded text-xs font-semibold bg-orange-600 text-white whitespace-nowrap flex-shrink-0">
                  🚫 {{ entry.report_count }}
                </span>
              </div>

              <p class="text-xs text-gray-500 mb-2">
                📅 {{ formatDate(entry.created_at) }}
              </p>

              <p class="text-xs text-orange-700 font-medium">
                ⚠️ Sua entrada foi invalidada
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Meus Reports -->
      <div v-else-if="activeTab === 'my-reports'" class="space-y-3">
        <div v-if="myReports.length === 0" class="bg-purple-50 rounded-xl p-8 text-center border border-purple-200">
          <p class="text-purple-600 text-base font-medium">📝 Você não fez nenhum report</p>
          <p class="text-purple-500 text-sm mt-1">Seus reports aparecerão aqui</p>
        </div>

        <div
          v-for="report in myReports"
          :key="report.id"
          class="bg-white rounded-xl shadow-sm border p-3 sm:p-4 w-full overflow-hidden"
        >
          <div class="flex gap-2 sm:gap-3">
            <div v-if="report.entry_photo_url" class="flex-shrink-0">
              <img
                :src="report.entry_photo_url"
                :alt="report.entry_description"
                class="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2 break-words">{{ report.entry_description }}</p>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0"
                  :class="report.entry_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ report.entry_points >= 0 ? '+' : '' }}{{ report.entry_points }}
                </span>
              </div>

              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800 whitespace-nowrap">
                  📝 {{ formatDate(report.report_created_at).split(' ')[0] }}
                </span>
                <span class="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">👤 {{ report.owner_username }}</span>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
                  :class="report.entry_is_invalidated ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'"
                >
                  {{ report.entry_is_invalidated ? '🚫 Invalidada' : `⚠️ ${report.report_count}/3` }}
                </span>
              </div>

              <button
                @click="handleRemoveReportFromMyReports(report.id, report.entry_id)"
                class="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                🗑️ Remover Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Minhas Entradas Reportadas (Recebidos) -->
      <div v-else-if="activeTab === 'received-reports'" class="space-y-3">
        <div v-if="myReportedEntries.length === 0" class="bg-pink-50 rounded-xl p-8 text-center border border-pink-200">
          <p class="text-pink-600 text-base font-medium">✅ Nenhuma entrada reportada</p>
          <p class="text-pink-500 text-sm mt-1">Suas entradas não receberam reports</p>
        </div>

        <div
          v-for="entry in myReportedEntries"
          :key="entry.id"
          class="bg-white rounded-xl shadow-sm border p-3 sm:p-4 w-full overflow-hidden"
        >
          <div class="flex gap-2 sm:gap-3">
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2 break-words">{{ entry.description }}</p>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0"
                  :class="entry.points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ entry.points >= 0 ? '+' : '' }}{{ entry.points }}
                </span>
              </div>

              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="px-2 py-1 rounded text-xs font-semibold bg-pink-100 text-pink-800 whitespace-nowrap">
                  📬 {{ entry.report_created_at ? formatDate(entry.report_created_at).split(' ')[0] : 'N/A' }}
                </span>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
                  :class="entry.is_invalidated ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'"
                >
                  {{ entry.is_invalidated ? '🚫 Invalidada' : `⚠️ ${entry.report_count}/3` }}
                </span>
              </div>

              <p class="text-xs text-gray-500">
                📅 Criada em {{ formatDate(entry.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Box -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 class="font-semibold text-blue-800 mb-2 text-sm sm:text-base">📋 Como funciona?</h3>
        <ul class="text-xs sm:text-sm text-blue-700 space-y-1">
          <li>• <strong>Para Votar:</strong> Reporte entradas suspeitas de outros usuários</li>
          <li>• <strong>Invalidadas:</strong> Veja todas as entradas invalidadas (≥3 reports)</li>
          <li>• <strong>Minhas:</strong> Suas entradas que foram invalidadas</li>
          <li>• <strong>Meus Reports:</strong> Entradas que você reportou (pode remover)</li>
          <li>• <strong>Recebidos:</strong> Suas entradas que receberam reports</li>
          <li>• <strong>3 reports</strong> invalidam a entrada automaticamente</li>
        </ul>
      </div>
    </div>
  </div>
</template>
