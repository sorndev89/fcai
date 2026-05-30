<script setup lang="ts">
import { LayoutDashboard, MessageSquare, BookOpen, Package } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();

// Sidebar navigation links
const sidebarLinks = [
  { to: '/dashboard', label: 'ໜ້າຫຼັກ', icon: LayoutDashboard },
  { to: '/dashboard/pages', label: 'ເພຈ໌', icon: MessageSquare },
  { to: '/dashboard/packages', label: 'ແພັກເກດ', icon: Package },
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
    <!-- Header Component -->
    <AppHeader
      brand-label="AI ສົນທະນາ Facebook"
      brand-link="/dashboard"
      :show-admin-link="true"
      admin-link-to="/admin"
      admin-link-label="ຈັດການລະບົບ"
      variant="default"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- Main Layout: Sidebar + Content -->
    <div class="mx-auto flex max-w-7xl">
      <!-- Sidebar (only for authenticated users) -->
      <AppSidebar
        v-if="authStore.isAuthenticated"
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
