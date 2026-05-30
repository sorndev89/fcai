<script setup lang="ts">
withDefaults(defineProps<{
  show?: boolean;
}>(), {
  show: true,
});
</script>

<template>
  <footer v-if="show" class="border-t border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
      <p class="text-xs text-slate-500 dark:text-slate-400">
        &copy; {{ new Date().getFullYear() }} AI ສົນທະນາ Facebook. ສະຫງວນສິດທັງໝົດ.
      </p>
      <div class="flex items-center gap-4">
        <NuxtLink to="/" class="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
          ໜ້າຫຼັກ
        </NuxtLink>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <NuxtLink to="/login" class="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
          ເຂົ້າລະບົບ
        </NuxtLink>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <NuxtLink to="/register" class="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
          ລົງທະບຽນ
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>
