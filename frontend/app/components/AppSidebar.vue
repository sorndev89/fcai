<script setup lang="ts">
import { X, ChevronLeft, ChevronRight, LogOut } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { useDevice } from '~/composables/useDevice';

interface SidebarLink {
  to: string;
  label: string;
  icon: any;
  badge?: string;
  badgeVariant?: 'danger' | 'success' | 'warning' | 'info';
}

const props = withDefaults(defineProps<{
  links?: SidebarLink[];
  collapsed?: boolean;
  show?: boolean;
  variant?: 'default' | 'admin';
}>(), {
  links: () => [],
  collapsed: false,
  show: false,
  variant: 'default',
});

const emit = defineEmits<{
  close: [];
  'update:collapsed': [value: boolean];
}>();

const authStore = useAuthStore();
const { isDesktop } = useDevice();

function handleLinkClick() {
  if (!isDesktop.value) {
    emit('close');
  }
}

function isLinkActive(to: string, isActive: boolean, isExactActive: boolean) {
  return (to === '/admin' || to === '/dashboard') ? isExactActive : isActive;
}
</script>

<template>
  <!-- Mobile overlay -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      leave-active-class="transition-opacity duration-200 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show && !isDesktop"
        class="fixed inset-0 z-[40] bg-slate-900/50 backdrop-blur-sm dark:bg-slate-950/80"
        @click="emit('close')"
      />
    </Transition>
  </Teleport>

  <!-- Sidebar -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-300 ease-in"
    enter-from-class="-translate-x-full"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-if="authStore.isAuthenticated && (isDesktop || show)"
      :class="[
        'fixed left-0 top-16 z-[45] flex h-[calc(100vh-4rem)] flex-col border-r border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-all duration-300 shadow-sm',
        collapsed && isDesktop ? 'w-16' : 'w-64',
        isDesktop ? 'lg:sticky lg:top-[5.5rem] lg:z-auto lg:h-[calc(100vh-7rem)] lg:rounded-2xl lg:border lg:border-slate-200 lg:dark:border-slate-800 lg:shadow-sm lg:my-6' : '',
      ]"
    >
      <!-- Sidebar header -->
      <div 
        class="flex items-center border-b border-slate-100 px-4 py-3 dark:border-slate-800/80"
        :class="collapsed && isDesktop ? 'justify-center' : 'justify-between'"
      >
        <span
          v-if="!collapsed || !isDesktop"
          class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          ເມນູນຳທາງ
        </span>
        
        <!-- Desktop collapse toggle button -->
        <button
          v-if="isDesktop"
          class="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-all duration-200 border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950"
          type="button"
          :title="collapsed ? 'ຂະຫຍາຍເມນູ' : 'ຫຍໍ້ເມນູ'"
          @click="emit('update:collapsed', !collapsed)"
        >
          <component :is="collapsed ? ChevronRight : ChevronLeft" class="h-4 w-4" />
        </button>

        <!-- Mobile close button -->
        <button
          v-if="!isDesktop"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          type="button"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Navigation links -->
      <nav class="flex-1 overflow-y-auto p-3">
        <ul class="space-y-1.5">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              v-slot="{ isActive, isExactActive }"
              :class="[
                'group flex items-center transition-all duration-300 relative',
                collapsed && isDesktop 
                  ? 'justify-center p-0 w-10 h-10 rounded-xl mx-auto' 
                  : 'gap-3 px-3 py-2.5 rounded-xl w-full',
                isLinkActive(link.to, isActive, isExactActive)
                  ? variant === 'admin'
                    ? 'bg-gradient-to-r from-indigo-50/80 via-indigo-50/40 to-transparent text-indigo-600 dark:from-indigo-950/30 dark:to-transparent dark:text-indigo-400 font-bold'
                    : 'bg-gradient-to-r from-sky-50/80 via-sky-50/40 to-transparent text-sky-600 dark:from-sky-950/30 dark:to-transparent dark:text-sky-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-900 dark:hover:text-slate-200',
                isLinkActive(link.to, isActive, isExactActive) && (!collapsed || !isDesktop)
                  ? variant === 'admin'
                    ? 'border-l-[3px] border-indigo-500 rounded-r-xl rounded-l-none pl-[9px]'
                    : 'border-l-[3px] border-sky-500 rounded-r-xl rounded-l-none pl-[9px]'
                  : ''
              ]"
              @click="handleLinkClick"
            >
              <span
                :class="[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                  isLinkActive(link.to, isActive, isExactActive)
                    ? variant === 'admin'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:bg-indigo-500 dark:shadow-indigo-500/20'
                      : 'bg-sky-500 text-white shadow-lg shadow-sky-500/25 dark:bg-sky-500 dark:shadow-sky-500/20'
                    : variant === 'admin'
                      ? 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-indigo-950/40 dark:group-hover:text-indigo-400 group-hover:scale-110'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-sky-950/40 dark:group-hover:text-sky-400 group-hover:scale-110'
                ]"
              >
                <component :is="link.icon" class="h-5 w-5" />
              </span>
              <span v-if="!collapsed || !isDesktop" class="flex-1 truncate text-sm">{{ link.label }}</span>
              <span
                v-if="link.badge && (!collapsed || !isDesktop)"
                :class="[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold transition-all',
                  link.badgeVariant === 'danger'
                    ? 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                    : variant === 'admin'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                ]"
              >
                {{ link.badge }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

     

    </aside>
  </Transition>
</template>
