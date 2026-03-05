<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSidebar } from '@/composables/useSidebar';

const route = useRoute();
const { isOpen, close } = useSidebar();

const menuItems = [
  { name: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
  { name: 'Timeline', path: '/timeline', icon: '📰' },
  { name: 'Minhas Entradas', path: '/my-entries', icon: '📝' },
  { name: 'Votação', path: '/voting', icon: '🚩' },
  { name: 'Projetos', path: '/projects', icon: '📚' },
  { name: 'Usuários', path: '/users', icon: '👥' },
];

const isActive = (path: string) => route.path === path;

const handleNavigation = () => {
  // Fecha o sidebar ao navegar (mobile)
  close();
};
</script>

<template>
  <!-- Overlay para mobile -->
  <div
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
    :class="isOpen ? 'block' : 'hidden'"
    @click="close"
  ></div>

  <!-- Sidebar -->
  <aside
    class="fixed lg:static top-0 left-0 z-50 lg:z-auto w-64 bg-gray-800 text-white min-h-screen transform transition-transform duration-300 ease-in-out lg:transform-none"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="p-4">
      <!-- Header com botão de fechar (mobile) -->
      <div class="flex items-center justify-between mb-6 lg:mb-6">
        <h1 class="text-xl font-bold">🌿 Marcio Natural</h1>
        <button
          @click="close"
          class="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          aria-label="Fechar menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Menu -->
      <nav>
        <ul class="space-y-2">
          <li v-for="item in menuItems" :key="item.path">
            <router-link
              :to="item.path"
              @click="handleNavigation"
              class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer"
              :class="isActive(item.path) ? 'bg-gray-700 text-green-400' : 'hover:bg-gray-700'"
            >
              <span class="text-xl">{{ item.icon }}</span>
              <span>{{ item.name }}</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
</template>
