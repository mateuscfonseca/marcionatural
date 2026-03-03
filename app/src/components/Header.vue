<script setup lang="ts">
import { useAuth } from '@/stores/auth';
import { useSidebar } from '@/composables/useSidebar';
import { useRouter } from 'vue-router';

const { state, logout } = useAuth();
const { toggle } = useSidebar();
const router = useRouter();

async function handleLogout() {
  await logout();
  router.push('/login');
}
</script>

<template>
  <header class="bg-white shadow-sm border-b px-4 sm:px-6 lg:px-8 py-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <!-- Botão Hamburger (mobile) -->
        <button
          @click="toggle"
          class="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Abrir menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h2 class="text-base sm:text-lg font-semibold text-gray-800">
            Bem-vindo, <span class="text-green-600">{{ state.user?.username }}</span>!
          </h2>
          <p class="text-xs sm:text-sm text-gray-500 hidden sm:block">Continue registrando suas atividades</p>
        </div>
      </div>

      <button
        @click="handleLogout"
        class="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm sm:text-base"
      >
        <span class="icon-[mdi--logout-variant] w-5 h-5"></span>
        <span class="hidden sm:inline">Logout</span>
      </button>
    </div>
  </header>
</template>
