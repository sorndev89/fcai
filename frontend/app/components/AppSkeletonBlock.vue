<script setup lang="ts">
withDefaults(defineProps<{
  as?: string;
  rounded?: string;
}>(), {
  as: 'div',
  rounded: 'rounded-xl',
});
</script>

<template>
  <component
    :is="as"
    class="animate-pulse bg-slate-200/80 dark:bg-slate-800/80"
    :class="rounded"
  />
</template>
