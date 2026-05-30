<script setup lang="ts">
import { X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  persistent?: boolean;
}>(), {
  title: '',
  description: '',
  size: 'md',
  persistent: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

const sizeClass = computed(() => ({
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}[props.size]));

function close() {
  if (props.persistent) return;
  emit('update:modelValue', false);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
          <button class="fixed inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm" type="button" aria-label="Close modal" @click="close"></button>

          <section
            class="relative max-h-[92vh] w-full overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-lg"
            :class="sizeClass"
            role="dialog"
            aria-modal="true"
          >
            <header v-if="title || $slots.header" class="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
              <slot name="header">
                <div>
                  <h2 class="text-base font-bold text-slate-950 dark:text-white">{{ title }}</h2>
                  <p v-if="description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ description }}</p>
                </div>
              </slot>
              <button class="app-btn-secondary h-9 w-9 shrink-0 px-0" type="button" title="Close" @click="close">
                <X class="h-4 w-4" />
              </button>
            </header>

            <div class="max-h-[calc(92vh-120px)] overflow-y-auto px-4 py-4 sm:px-5">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
              <slot name="footer" />
            </footer>
          </section>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
