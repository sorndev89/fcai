<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  totalItems: number;
  pageSize: number;
  siblingCount?: number;
  hideOnSinglePage?: boolean;
}>(), {
  siblingCount: 1,
  hideOnSinglePage: false,
});

const emit = defineEmits<{
  'update:modelValue': [page: number];
  change: [page: number];
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));
const currentPage = computed(() => Math.min(Math.max(props.modelValue, 1), totalPages.value));
const startItem = computed(() => (props.totalItems === 0 ? 0 : (currentPage.value - 1) * props.pageSize + 1));
const endItem = computed(() => Math.min(currentPage.value * props.pageSize, props.totalItems));

const pageRange = computed(() => {
  const range: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;
  const siblings = props.siblingCount;

  if (total <= 7) {
    for (let page = 1; page <= total; page += 1) range.push(page);
    return range;
  }

  range.push(1);

  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);

  if (start > 2) range.push('...');
  for (let page = start; page <= end; page += 1) range.push(page);
  if (end < total - 1) range.push('...');

  range.push(total);
  return range;
});

function selectPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  emit('update:modelValue', page);
  emit('change', page);
}
</script>

<template>
  <div
    v-if="totalItems > 0 && !(hideOnSinglePage && totalPages <= 1)"
    class="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/20 sm:flex-row sm:items-center sm:justify-between"
  >
    <span class="text-xs text-slate-500 dark:text-slate-400">
      ສະແດງ {{ startItem }}-{{ endItem }} ຈາກ {{ totalItems }} ລາຍການ
    </span>

    <nav class="flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        :disabled="currentPage <= 1"
        class="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="selectPage(currentPage - 1)"
      >
        ກ່ອນໜ້າ
      </button>

      <template v-for="(page, index) in pageRange" :key="`${page}-${index}`">
        <span v-if="page === '...'" class="px-2 text-xs text-slate-400">...</span>
        <button
          v-else
          type="button"
          :aria-current="currentPage === page ? 'page' : undefined"
          :class="[
            'min-w-8 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
            currentPage === page
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
          ]"
          @click="selectPage(Number(page))"
        >
          {{ page }}
        </button>
      </template>

      <button
        type="button"
        :disabled="currentPage >= totalPages"
        class="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="selectPage(currentPage + 1)"
      >
        ໜ້າຕໍ່ໄປ
      </button>
    </nav>
  </div>
</template>
