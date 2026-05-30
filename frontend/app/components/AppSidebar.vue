<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { useDevice } from '~/composables/useDevice';

interface SidebarLink {
  to: string;
  label: string;
  icon: any;
  badge?: string;
}

const props = withDefaults(defineProps<{
  links?: SidebarLink[];
  collapsed?: boolean;
  show?: boolean;
}>(), {
  links: () => [],
  collapsed: false,
  show: false,
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
        class="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm dark:bg-slate-950/80"
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
        'fixed left-0 top-16 z-30 flex h-[calc(100vh-4rem)] flex-col border-r border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-all duration-300',
        collapsed && isDesktop ? 'w-16' : 'w-64',
        isDesktop ? 'lg:sticky lg:top-16 lg:z-auto' : '',
      ]"
    >
      <!-- Sidebar header -->
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span
          v-if="!collapsed || !isDesktop"
          class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          ເມນູນຳທາງ
        </span>
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
        <ul class="space-y-1">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              v-slot="{ isActive }"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              active-class="!bg-sky-50 !text-sky-700 dark:!bg-sky-500/10 dark:!text-sky-300"
              @click="handleLinkClick"
            >
              <span
                :class="[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-200'
                ]"
              >
                <component :is="link.icon" class="h-4 w-4" />
              </span>
              <span v-if="!collapsed || !isDesktop" class="flex-1 truncate">{{ link.label }}</span>
              <span
                v-if="link.badge && (!collapsed || !isDesktop)"
                class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
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
