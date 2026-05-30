<script setup lang="ts">
import { CreditCard, LayoutDashboard, Package, Settings, Shield, Users } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();

// Sidebar navigation links
const sidebarLinks = [
  { to: '/admin', label: 'ລູກຄ້າ', icon: Users },
  { to: '/admin/packages', label: 'ແພັກເກດ', icon: Package },
  { to: '/admin/billing', label: 'ບິນ', icon: CreditCard },
  { to: '/admin/ai-config', label: 'AI Config', icon: Settings },
];

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

// Close sidebar on route change (mobile)
const route = useRoute();
watch(
  () => route.path,
  () => {
    if (window.innerWidth < 1024) {
      sidebarShow.value = false;
    }
  }
);
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

    <!-- Admin mode banner -->
    <div class="border-b border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:border-slate-800">
      <div class="mx-auto flex max-w-7xl items-center gap-2 sm:px-2 lg:px-0">
        <Shield class="h-3.5 w-3.5" />
        ໂໝດຈັດການລະບົບ: ອະນຸມັດລູກຄ້າ, ຈັດການແພັກເກດ, ແລະ ບັນທຶກການຊຳລະ.
      </div>
    </div>

    <!-- Main Layout: Sidebar + Content -->
    <div class="mx-auto flex max-w-7xl">
      <!-- Sidebar for admin (always shown when authenticated and admin) -->
      <AppSidebar
        v-if="authStore.isAuthenticated && authStore.isAdmin"
        :links="sidebarLinks"
        :collapsed="sidebarCollapsed"
        :show="sidebarShow"
        @close="closeSidebar"
        @update:collapsed="sidebarCollapsed = $event"
      />

      <!-- Main Content -->
      <main
        class="flex-1 px-4 py-6 sm:px-6 lg:px-8"
        :class="authStore.isAuthenticated ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[calc(100vh-8rem)]'"
      >
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>
