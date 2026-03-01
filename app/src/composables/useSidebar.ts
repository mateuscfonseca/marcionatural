import { ref, computed, onMounted, onUnmounted } from 'vue';

// Estado compartilhado (singleton)
let sidebarOpen: boolean | null = null;
const listeners: Set<(open: boolean) => void> = new Set();

const notifyListeners = (open: boolean) => {
  listeners.forEach(fn => fn(open));
};

export function useSidebar() {
  const isOpen = ref(sidebarOpen ?? false);
  const isMobile = ref(false);

  const checkMobile = () => {
    isMobile.value = window.innerWidth < 1024;
  };

  const toggle = () => {
    isOpen.value = !isOpen.value;
    sidebarOpen = isOpen.value;
    notifyListeners(isOpen.value);
  };

  const open = () => {
    isOpen.value = true;
    sidebarOpen = true;
    notifyListeners(true);
  };

  const close = () => {
    isOpen.value = false;
    sidebarOpen = false;
    notifyListeners(false);
  };

  const handleResize = () => {
    checkMobile();
    // Fecha o sidebar ao redimensionar para desktop
    if (window.innerWidth >= 1024) {
      isOpen.value = false;
      sidebarOpen = false;
      notifyListeners(false);
    }
  };

  // Sincroniza com estado global
  const syncState = (open: boolean) => {
    isOpen.value = open;
  };

  onMounted(() => {
    checkMobile();
    sidebarOpen = isOpen.value;
    listeners.add(syncState);
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    listeners.delete(syncState);
    window.removeEventListener('resize', handleResize);
  });

  return {
    isOpen,
    isMobile,
    toggle,
    open,
    close,
  };
}
