<script setup lang="ts">
import { computed } from 'vue';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const props = withDefaults(defineProps<{
  datasets: ChartDataset[];
  height?: number;
  showGrid?: boolean;
  showYAxis?: boolean;
  showXAxis?: boolean;
  yAxisLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
}>(), {
  height: 280,
  showGrid: true,
  showYAxis: true,
  showXAxis: true,
  yAxisLabel: '',
  loading: false,
  emptyMessage: 'ບໍ່ມີຂໍ້ມູນ',
});

const allValues = computed<number[]>(() => {
  return props.datasets.flatMap((ds) => ds.data.map((d) => d.value));
});

const series = computed(() => {
  return props.datasets.map((ds) => ({
    name: ds.label,
    data: ds.data.map((d) => d.value),
  }));
});

const chartOptions = computed(() => {
  const categories = props.datasets[0]?.data.map((d) => d.label) || [];
  const colors = props.datasets.map((ds, di) => ds.color || ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b'][di % 4]);

  return {
    chart: {
      type: 'area',
      toolbar: {
        show: false,
      },
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      sparkline: {
        enabled: false,
      },
    },
    colors: colors,
    stroke: {
      curve: 'smooth',
      width: 2.5,
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: categories,
      labels: {
        show: props.showXAxis,
        style: {
          colors: '#64748b',
          fontSize: '11px',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        show: props.showYAxis,
        style: {
          colors: '#64748b',
          fontSize: '11px',
        },
        formatter: (value: number) => {
          if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
          if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
          return Math.round(value).toLocaleString();
        },
      },
    },
    grid: {
      show: props.showGrid,
      borderColor: 'rgba(148, 163, 184, 0.15)',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: 'dark',
      x: {
        show: true,
      },
      y: {
        formatter: (val: number) => val.toLocaleString(),
      },
    },
    legend: {
      show: props.datasets.length > 1,
      position: 'bottom',
      horizontalAlign: 'center',
      labels: {
        colors: '#64748b',
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
  };
});
</script>

<template>
  <div class="app-surface relative p-5">
    <!-- Y-axis label -->
    <div v-if="yAxisLabel" class="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {{ yAxisLabel }}
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center" :style="{ height: `${height}px` }">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="allValues.length === 0" class="flex flex-col items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500" :style="{ height: `${height}px` }">
      <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <span>{{ emptyMessage }}</span>
    </div>

    <!-- Chart -->
    <div v-else :style="{ minHeight: `${height}px` }">
      <ClientOnly>
        <apexchart
          type="area"
          :height="height"
          :options="chartOptions"
          :series="series"
        />
      </ClientOnly>
    </div>
  </div>
</template>
