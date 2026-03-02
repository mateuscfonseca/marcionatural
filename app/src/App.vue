<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/stores/auth';
import Sidebar from '@/components/Sidebar.vue';
import Header from '@/components/Header.vue';
import FloatingActionButton from '@/components/FloatingActionButton.vue';

const route = useRoute();
const router = useRouter();
const { state, initAuth, isAuthenticated } = useAuth();

const isAuthPage = computed(() => {
  return ['/login', '/register', '/'].includes(route.path);
});

onMounted(async () => {
  await initAuth();
  console.log('[App] Auth state:', state);

  // Redireciona para login se não estiver autenticado e não estiver em página de auth
  // Apenas após a autenticação ser verificada (loading = false)
  if (!state.loading && !state.user && !isAuthPage.value) {
    console.log('[App] Redirecting to login');
    router.push('/login');
  }
});
</script>

<template>
  <div v-if="state.loading" class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Carregando...</p>
    </div>
  </div>

  <div v-else-if="isAuthPage">
    <router-view />
  </div>

  <div v-else class="flex min-h-screen bg-gray-100 overflow-x-hidden">
    <Sidebar />
    <div class="flex-1 flex flex-col m-3 w-full min-w-0">
      <Header />
      <main class="flex-1 overflow-y-auto overflow-x-hidden">
        <router-view />
      </main>
    </div>

    <!-- Botão Flutuante de Ação Rápida -->
    <FloatingActionButton />
  </div>
</template>
