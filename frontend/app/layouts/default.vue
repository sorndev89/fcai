<script setup lang="ts">
import { LayoutDashboard, MessageSquare, BookOpen, Package, Receipt } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { ref, watch, computed } from 'vue';

const authStore = useAuthStore();
const route = useRoute();

// Check if current route is a public landing page route
const isLandingPage = computed(() => {
  return ['/', '/privacy-policy', '/terms-of-service'].includes(route.path);
});

// Sidebar navigation links
const sidebarLinks = [
  { to: '/dashboard', label: 'ໜ້າຫຼັກ', icon: LayoutDashboard },
  { to: '/dashboard/pages', label: 'ເພຈ໌', icon: MessageSquare },
  { to: '/dashboard/packages', label: 'ແພັກເກດ', icon: Package },
  { to: '/dashboard/billing', label: 'ປະຫວັດການຊື້', icon: Receipt },
  { to: '/dashboard/ai-training-guide', label: 'ຄູ່ມືຝຶກສອນ AI', icon: BookOpen },
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
    <!-- Header Component -->
    <AppLandingHeader v-if="isLandingPage" />
    <AppHeader
      v-else
      brand-label="AI ສົນທະນາ Facebook"
      brand-link="/dashboard"
      :show-admin-link="true"
      admin-link-to="/admin"
      admin-link-label="ຈັດການລະບົບ"
      variant="default"
      :sticky="!isLandingPage"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- Main Layout: Sidebar + Content -->
    <div
      :class="[
        isLandingPage
          ? 'mx-auto w-full pt-18'
          : 'mx-auto flex w-full max-w-[1600px] gap-6 px-4 sm:px-6 lg:px-8 pt-16',
      ]"
    >
      <!-- Sidebar (only for authenticated users on non-landing pages) -->
      <AppSidebar
        v-if="authStore.isAuthenticated && !isLandingPage"
        :links="sidebarLinks"
        :collapsed="sidebarCollapsed"
        :show="sidebarShow"
        @close="closeSidebar"
        @update:collapsed="sidebarCollapsed = $event"
      />

      <!-- Main Content -->
      <main
        class="flex-1 py-6"
        :class="authStore.isAuthenticated && !isLandingPage ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[calc(100vh-8rem)]'"
      >
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>
