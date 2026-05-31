<script setup lang="ts">
import { CreditCard, LayoutDashboard, Package, Settings, Shield, Users, Zap } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const authStore = useAuthStore();
const apiUrl = useApiUrl();

const pendingCount = useState<number>('pendingPaymentsCount', () => 0);

// Sidebar navigation links
const sidebarLinks = computed(() => [
  { to: '/admin', label: 'ແດດຊບອດ', icon: LayoutDashboard },
  { to: '/admin/tenants', label: 'ລູກຄ້າ', icon: Users },
  { to: '/admin/packages', label: 'ແພັກເກດ', icon: Package },
  { to: '/admin/tokens', label: 'ຊື້ Token ເພີ່ມ', icon: Zap },
  { to: '/admin/billing', label: 'ບິນ', icon: CreditCard, badge: pendingCount.value > 0 ? String(pendingCount.value) : undefined, badgeVariant: 'danger' },
  { to: '/admin/ai-config', label: 'AI Config', icon: Settings },
]);

const sidebarCollapsed = ref(false);
const sidebarShow = ref(false);

function toggleSidebar() {
  if (window.innerWidth >= 1024) {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  } else {
    sidebarShow.value = !sidebarShow.value;
  }
}

function closeSidebar() {
  sidebarShow.value = false;
}

async function fetchPendingCount() {
  if (!authStore.token || !authStore.isAdmin) return;
  try {
    const res = await $fetch<{ count: number }>(`${apiUrl}/api/admin/payments/pending-count`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    });
    pendingCount.value = res?.count || 0;
  } catch (err) {
    console.error('Failed to fetch pending payments count:', err);
  }
}

// Close sidebar on route change (mobile) & refresh count
const route = useRoute();
watch(
  () => route.path,
  () => {
    if (window.innerWidth < 1024) {
      sidebarShow.value = false;
    }
    fetchPendingCount();
  }
);

let pollingInterval: any = null;

onMounted(() => {
  fetchPendingCount();
  pollingInterval = setInterval(fetchPendingCount, 30000);
});

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <!-- Header Component (admin variant) -->
    <AppHeader
      brand-label="ຈັດການລະບົບ"
      brand-link="/admin"
      :show-admin-link="false"
      variant="admin"
      @toggle-sidebar="toggleSidebar"
    />

    <div class="pt-16">
      <!-- Admin mode banner -->
      <div class="border-b border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:border-slate-800">
        <div class="mx-auto flex max-w-[1600px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Shield class="h-3.5 w-3.5" />
          ໂໝດຈັດການລະບົບ: ອະນຸມັດລູກຄ້າ, ຈັດການແພັກເກດ, ແລະ ບັນທຶກການຊຳລະ.
        </div>
      </div>

      <!-- Main Layout: Sidebar + Content -->
      <div class="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <!-- Sidebar for admin (always shown when authenticated and admin) -->
        <AppSidebar
          v-if="authStore.isAuthenticated && authStore.isAdmin"
          :links="sidebarLinks"
          :collapsed="sidebarCollapsed"
          :show="sidebarShow"
          variant="admin"
          @close="closeSidebar"
          @update:collapsed="sidebarCollapsed = $event"
        />

        <!-- Main Content -->
        <main
          class="flex-1"
          :class="authStore.isAuthenticated ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[calc(100vh-8rem)]'"
        >
          <slot />
        </main>
      </div>
    </div>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>
