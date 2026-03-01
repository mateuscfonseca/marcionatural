<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  getVotingAvailableEntries,
  getVotingInvalidatedEntries,
  getMyVotingInvalidatedEntries,
  getVotingStats,
  reportEntry,
  removeEntryReport,
} from '@/services/api';
import type { VotingEntry, VotingStats } from '@/types';

const availableEntries = ref<VotingEntry[]>([]);
const invalidatedEntries = ref<VotingEntry[]>([]);
const myInvalidatedEntries = ref<VotingEntry[]>([]);
const stats = ref<VotingStats | null>(null);
const loading = ref(true);
const activeTab = ref<'available' | 'invalidated' | 'my-invalidated'>('available');

async function loadData() {
  try {
    const [available, invalidated, myInvalidated, statsData] = await Promise.all([
      getVotingAvailableEntries(),
      getVotingInvalidatedEntries(),
      getMyVotingInvalidatedEntries(),
      getVotingStats(),
    ]);
    availableEntries.value = available.entries;
    invalidatedEntries.value = invalidated.entries;
    myInvalidatedEntries.value = myInvalidated.entries;
    stats.value = statsData.stats;
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

onMounted(loadData);
</script>

<template>
  <div class="min-h-screen bg-gray-50 overflow-x-hidden">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-4 sm:px-6 lg:px-8">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-800">🚩 Votação</h1>
      <p class="text-xs sm:text-sm text-gray-600 mt-1">
        Reporte entradas suspeitas. 3 reports invalidam.
      </p>
    </div>

    <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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
      <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
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
          class="bg-white rounded-xl shadow-sm border p-4"
        >
          <div class="flex gap-3">
            <!-- Foto -->
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2">{{ entry.description }}</p>
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
                <span class="text-xs text-gray-500">👤 {{ entry.username }}</span>
              </div>

              <button
                @click="handleReport(entry.id)"
                class="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
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
          class="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4"
        >
          <div class="flex gap-3">
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg opacity-75"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2">{{ entry.description }}</p>
                <span class="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white whitespace-nowrap flex-shrink-0">
                  🚫 {{ entry.report_count }}
                </span>
              </div>

              <p class="text-xs text-gray-500 mb-2">
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
          class="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-4"
        >
          <div class="flex gap-3">
            <div v-if="entry.photo_url" class="flex-shrink-0">
              <img
                :src="entry.photo_url"
                :alt="entry.description"
                class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-gray-800 font-medium text-sm line-clamp-2">{{ entry.description }}</p>
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

      <!-- Info Box -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 class="font-semibold text-blue-800 mb-2 text-sm sm:text-base">📋 Como funciona?</h3>
        <ul class="text-xs sm:text-sm text-blue-700 space-y-1">
          <li>• Reporte entradas suspeitas de outros usuários</li>
          <li>• <strong>3 reports</strong> invalidam a entrada automaticamente</li>
          <li>• Entradas invalidadas não contam pontos</li>
        </ul>
      </div>
    </div>
  </div>
</template>
