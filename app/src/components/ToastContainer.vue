<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, removeToast } = useToast();

const getToastIcon = (type: 'success' | 'error' | 'info') => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
  }
};

const getToastClasses = (type: 'success' | 'error' | 'info') => {
  const base = 'p-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 max-w-md';
  switch (type) {
    case 'success': return `${base} bg-green-50 border border-green-200 text-green-800`;
    case 'error': return `${base} bg-red-50 border border-red-200 text-red-800`;
    case 'info': return `${base} bg-blue-50 border border-blue-200 text-blue-800`;
  }
};
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 flex flex-col gap-2 z-[100]">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="getToastClasses(toast.type)"
        >
          <span class="text-xl">{{ getToastIcon(toast.type) }}</span>
          <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
          <button
            @click="removeToast(toast.id)"
            class="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
