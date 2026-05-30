<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-vue-next';
import { useDialog, type AppDialogAction, type AppDialogType } from '~/composables/useDialog';

const { dialog, close } = useDialog();

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
} satisfies Record<AppDialogType, any>;

const toneClass = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  error: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
} satisfies Record<AppDialogType, string>;

function actionClass(action: AppDialogAction) {
  if (action.variant === 'danger') return 'app-btn-danger';
  if (action.variant === 'secondary') return 'app-btn-secondary';
  return 'app-btn-primary';
}
</script>

<template>
  <AppModal
    v-if="dialog"
    :model-value="dialog.open"
    size="sm"
    :persistent="dialog.persistent"
    @update:model-value="close(false)"
  >
    <div class="flex gap-4">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1" :class="toneClass[dialog.type]">
        <component :is="iconMap[dialog.type]" class="h-6 w-6" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-bold text-slate-950 dark:text-white">{{ dialog.title }}</h2>
        <p v-if="dialog.message" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ dialog.message }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          v-for="action in dialog.actions"
          :key="action.label"
          type="button"
          :class="actionClass(action)"
          @click="close(action.value ?? true)"
        >
          {{ action.label }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
