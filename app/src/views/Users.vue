<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllUsers, deleteUser, restoreUser } from '@/services/api';

interface UserWithPoints {
  id: number;
  username: string;
  created_at: string;
  total_points: number;
  deleted_at: string | null;
}

const router = useRouter();
const users = ref<UserWithPoints[]>([]);
const loading = ref(true);

// Modal de confirmação
const showModal = ref(false);
const selectedUser = ref<UserWithPoints | null>(null);
const modalAction = ref<'delete' | 'restore'>('delete');
const processing = ref(false);

async function loadUsers() {
  try {
    const data = await getAllUsers();
    users.value = data.users;
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  } finally {
    loading.value = false;
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
  });
}

function viewUserEntries(userId: number) {
  router.push(`/users/${userId}/entries`);
}

function openDeleteModal(user: UserWithPoints) {
  selectedUser.value = user;
  modalAction.value = 'delete';
  showModal.value = true;
}

function openRestoreModal(user: UserWithPoints) {
  selectedUser.value = user;
  modalAction.value = 'restore';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedUser.value = null;
}

async function confirmAction() {
  if (!selectedUser.value) return;

  processing.value = true;

  try {
    if (modalAction.value === 'delete') {
      await deleteUser(selectedUser.value.id);
      selectedUser.value.deleted_at = new Date().toISOString();
    } else {
      await restoreUser(selectedUser.value.id);
      selectedUser.value.deleted_at = null;
    }
    closeModal();
    loadUsers();
  } catch (error) {
    console.error('Erro na operação:', error);
    alert('Erro ao processar solicitação');
  } finally {
    processing.value = false;
  }
}

const isDeleted = (user: UserWithPoints) => user.deleted_at !== null;

onMounted(loadUsers);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-6">👥 Usuários</h1>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Carregando...</p>
    </div>

    <div v-else>
      <!-- Desktop Table -->
      <div class="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pontos Totais
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Cadastro
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="user in users"
                :key="user.id"
                class="hover:bg-gray-50 transition-colors"
                :class="{ 'bg-gray-100': isDeleted(user) }"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-medium text-gray-900" :class="{ 'line-through text-gray-500': isDeleted(user) }">
                    {{ user.username }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    v-if="isDeleted(user)"
                    class="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800"
                  >
                    Excluído
                  </span>
                  <span v-else class="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                    Ativo
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-3 py-1 rounded-full text-sm font-semibold"
                    :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ formatPoints(user.total_points) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-600">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <button
                      @click="viewUserEntries(user.id)"
                      class="text-green-600 hover:text-green-800 font-medium text-sm"
                    >
                      Ver Entradas →
                    </button>
                    <button
                      v-if="isDeleted(user)"
                      @click="openRestoreModal(user)"
                      class="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      title="Reativar usuário"
                    >
                      ♻️ Reativar
                    </button>
                    <button
                      v-else
                      @click="openDeleteModal(user)"
                      class="text-red-600 hover:text-red-800 font-medium text-sm"
                      title="Excluir usuário"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden space-y-3">
        <div
          v-for="user in users"
          :key="user.id"
          class="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
          :class="{ 'bg-gray-50': isDeleted(user) }"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg"
                :class="{ 'from-gray-400 to-gray-500': isDeleted(user) }"
              >
                {{ user.username.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3
                  class="font-semibold text-gray-800"
                  :class="{ 'line-through text-gray-500': isDeleted(user) }"
                >
                  {{ user.username }}
                </h3>
                <p class="text-xs text-gray-500">📅 {{ formatDate(user.created_at) }}</p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span
                class="px-3 py-1 rounded-full text-sm font-semibold"
                :class="isDeleted(user) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
              >
                {{ isDeleted(user) ? 'Excluído' : 'Ativo' }}
              </span>
              <span
                class="px-3 py-1 rounded-full text-sm font-semibold"
                :class="user.total_points >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ formatPoints(user.total_points) }}
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="viewUserEntries(user.id)"
              class="flex-1 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors"
            >
              Ver Entradas →
            </button>
            <button
              v-if="isDeleted(user)"
              @click="openRestoreModal(user)"
              class="py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
            >
              ♻️ Reativar
            </button>
            <button
              v-else
              @click="openDeleteModal(user)"
              class="py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>
      </div>

      <div v-if="users.length === 0" class="bg-white rounded-xl p-8 text-center border">
        <p class="text-gray-500">Nenhum usuário cadastrado ainda.</p>
      </div>
    </div>

    <!-- Modal de Confirmação -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="closeModal"
    >
      <div
        class="bg-white rounded-xl p-6 max-w-md w-full shadow"
        @click.stop
      >
        <h3 class="text-lg font-bold text-gray-800 mb-2">
          {{ modalAction === 'delete' ? '🗑️ Excluir Usuário' : '♻️ Reativar Usuário' }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{ modalAction === 'delete'
            ? `Tem certeza que deseja excluir o usuário "${selectedUser?.username}"? Esta ação pode ser desfeita.`
            : `Tem certeza que deseja reativar o usuário "${selectedUser?.username}"?`
          }}
        </p>
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            :disabled="processing"
          >
            Cancelar
          </button>
          <button
            @click="confirmAction"
            class="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
            :class="modalAction === 'delete'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'"
            :disabled="processing"
          >
            {{ processing ? 'Processando...' : (modalAction === 'delete' ? 'Excluir' : 'Reativar') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
