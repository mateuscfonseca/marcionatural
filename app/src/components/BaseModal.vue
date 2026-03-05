<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
}>(), {
  size: 'lg',
  closeOnOverlay: true,
  showCloseButton: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const isVisible = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
});

function closeModal() {
  isVisible.value = false;
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick(event: MouseEvent) {
  if (props.closeOnOverlay && event.target === event.currentTarget) {
    closeModal();
  }
}

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
  full: 'sm:max-w-5xl',
};
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 sm:bg-black/40 sm:backdrop-blur-sm"
        @click="handleOverlayClick"
      >
        <div
          :class="[
            'bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full h-[100vh] sm:h-auto max-h-[90vh] overflow-y-auto flex flex-col',
            sizeClasses[size]
          ]"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center flex-shrink-0">
            <slot name="header">
              <h2 class="text-lg font-bold text-gray-800">{{ title }}</h2>
            </slot>
            <button
              v-if="showCloseButton"
              @click="closeModal"
              class="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <!-- Content -->
          <div class="p-4 sm:p-6 flex-1 overflow-y-auto">
            <slot />
          </div>

          <!-- Footer (opcional) -->
          <div v-if="$slots.footer" class="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-up-enter-from {
  transform: translateY(100%);
}

.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
