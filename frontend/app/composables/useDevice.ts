import { ref, computed, onMounted, onUnmounted } from 'vue';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice() {
  // Default to 'desktop' for server-side rendering (SSR) compatibility
  const device = ref<DeviceType>('desktop');

  const updateDevice = () => {
    if (typeof window === 'undefined') return;
    const width = window.innerWidth;
    if (width < 768) {
      device.value = 'mobile';
    } else if (width < 1024) {
      device.value = 'tablet';
    } else {
      device.value = 'desktop';
    }
  };

  const isMobile = computed(() => device.value === 'mobile');
  const isTablet = computed(() => device.value === 'tablet');
  const isDesktop = computed(() => device.value === 'desktop');

  onMounted(() => {
    updateDevice();
    window.addEventListener('resize', updateDevice);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateDevice);
  });

  return {
    device,
    isMobile,
    isTablet,
    isDesktop,
  };
}
