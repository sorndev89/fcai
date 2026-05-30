<script setup lang="ts">
import { Bot, ChevronDown, LogIn, LogOut, Menu, Moon, Shield, Sun, User } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const props = withDefaults(defineProps<{
  brandLabel?: string;
  brandLink?: string;
  showAdminLink?: boolean;
  adminLinkTo?: string;
  adminLinkLabel?: string;
  variant?: 'default' | 'admin';
}>(), {
  brandLabel: 'AI ສົນທະນາ Facebook',
  brandLink: '/dashboard',
  showAdminLink: false,
  adminLinkTo: '/admin',
  adminLinkLabel: 'ຈັດການລະບົບ',
  variant: 'default',
});

const emit = defineEmits<{
  toggleSidebar: [];
}>();

const authStore = useAuthStore();
const isDark = ref(false);
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

function handleLogout() {
  userMenuOpen.value = false;
  authStore.logout();
}

function applyTheme(theme: 'dark' | 'light') {
  isDark.value = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark.value);
  document.body.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  applyTheme(isDark.value ? 'light' : 'dark');
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}

// Close menu on outside click
function onClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false;
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  document.addEventListener('click', onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
});
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- Left: Sidebar toggle (mobile) + Logo -->
      <div class="flex items-center gap-3">
        <!-- Sidebar toggle for desktop -->
        <button
          class="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:inline-flex"
          type="button"
          title="ເປີດ/ປິດເມນູ"
          @click="emit('toggleSidebar')"
        >
          <Menu class="h-5 w-5" />
        </button>

        <NuxtLink :to="brandLink" class="flex min-w-0 items-center gap-3">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            :class="variant === 'admin' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'bg-sky-600 text-white'"
          >
            <component :is="variant === 'admin' ? Shield : Bot" class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <span class="block truncate text-base font-bold">{{ brandLabel }}</span>
            <span v-if="variant === 'admin'" class="block text-xs text-slate-500 dark:text-slate-400">ພື້ນທີ່ເຮັດວຽກຂອງເຈົ້າຂອງລະບົບ</span>
          </div>
        </NuxtLink>
      </div>

      <!-- Center: Spacer (nav removed) -->
      <div class="hidden flex-1 md:block"></div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <!-- Theme toggle -->
        <button class="app-btn-secondary h-10 w-10 px-0" type="button" title="ປ່ຽນຮູບແບບ" @click="toggleTheme">
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </button>

        <!-- User Dropdown (authenticated) -->
        <div
          v-if="authStore.isAuthenticated"
          ref="userMenuRef"
          class="relative"
        >
          <button
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            type="button"
            @click="toggleUserMenu"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              {{ authStore.user?.name?.charAt(0)?.toUpperCase() || '?' }}
            </div>
            <span class="hidden max-w-28 truncate md:inline">{{ authStore.user?.name }}</span>
            <ChevronDown class="hidden h-4 w-4 text-slate-400 md:inline-block" />
          </button>

          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            leave-active-class="transition-all duration-150 ease-in"
            enter-from-class="scale-95 opacity-0 translate-y-1"
            leave-to-class="scale-95 opacity-0 translate-y-1"
          >
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <!-- User Info Header -->
              <div class="border-b border-slate-100 p-4 dark:border-slate-800">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                    {{ authStore.user?.name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {{ authStore.user?.name || 'User' }}
                    </p>
                    <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                      {{ authStore.user?.email || '' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Menu Items -->
              <div class="p-2">
                <!-- Dashboard link -->
                <NuxtLink
                  to="/dashboard"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  @click="userMenuOpen = false"
                >
                  <User class="h-4 w-4" />
                  ໜ້າຫຼັກ
                </NuxtLink>

                <!-- Admin link (admin only) -->
                <NuxtLink
                  v-if="authStore.isAdmin"
                  :to="adminLinkTo"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  @click="userMenuOpen = false"
                >
                  <Shield class="h-4 w-4" />
                  {{ adminLinkLabel }}
                </NuxtLink>

                <!-- Divider -->
                <div class="my-1 border-t border-slate-100 dark:border-slate-800" />

                <!-- Logout -->
                <button
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  type="button"
                  @click="handleLogout"
                >
                  <LogOut class="h-4 w-4" />
                  ອອກຈາກລະບົບ
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Login button (unauthenticated) -->
        <NuxtLink v-else to="/login" class="app-btn-primary">
          <LogIn class="h-4 w-4" />
          ເຂົ້າລະບົບ
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
