<script setup lang="ts">
import { computed, type Component } from 'vue';

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: Component;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  colorClass?: string;
  footnote?: string;
}

const props = withDefaults(defineProps<MetricCardProps>(), {
  colorClass: 'sky',
  footnote: '',
});

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-200 dark:ring-sky-500/30',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-500/30',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-500/30',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-200 dark:ring-violet-500/30',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-200 dark:ring-rose-500/30',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-700 dark:text-cyan-300',
    ring: 'ring-cyan-200 dark:ring-cyan-500/30',
  },
};

const colors = computed(() => {
  return (colorMap[props.colorClass] ?? colorMap.sky)!;
});

const trendIcon = computed(() => {
  if (!props.trend) return '';
  if (props.trend.direction === 'up') return '↑';
  if (props.trend.direction === 'down') return '↓';
  return '→';
});

const trendColorClass = computed(() => {
  if (!props.trend) return '';
  if (props.trend.direction === 'up') return 'text-emerald-600 dark:text-emerald-400';
  if (props.trend.direction === 'down') return 'text-rose-600 dark:text-rose-400';
  return 'text-slate-500 dark:text-slate-400';
});
</script>

<template>
  <div class="app-surface group relative overflow-hidden p-5 transition-all duration-200 hover:shadow-md">
    <!-- Subtle gradient overlay on hover -->
    <div class="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
         :class="`bg-gradient-to-br ${colors.bg.replace('bg-', 'from-').replace('/10', '/5')} to-transparent`">
    </div>

    <div class="relative z-10">
      <!-- Top row: icon + trend -->
      <div class="flex items-start justify-between">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
             :class="`${colors.bg} ${colors.text} ring-1 ${colors.ring}`">
          <component :is="props.icon" class="h-5 w-5" />
        </div>

        <!-- Trend badge -->
        <div v-if="trend" class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
             :class="`${trendColorClass} ${colors.bg}`">
          <span class="text-sm leading-none">{{ trendIcon }}</span>
          <span>{{ trend.value }}%</span>
        </div>
      </div>

      <!-- Value -->
      <p class="mt-4 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        {{ value }}
      </p>

      <!-- Label -->
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {{ label }}
      </p>

      <!-- Footnote -->
      <p v-if="footnote" class="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {{ footnote }}
      </p>
    </div>
  </div>
</template>
