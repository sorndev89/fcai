<script setup lang="ts">
import { computed, ref } from 'vue';

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

const COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b'] as const;
const GRADIENT_STOPS: [string, string][] = [
  ['#0ea5e9', '#0ea5e901'],
  ['#10b981', '#10b98101'],
  ['#8b5cf6', '#8b5cf601'],
  ['#f59e0b', '#f59e0b01'],
];

const uid = ref(`chart-${Math.random().toString(36).slice(2, 8)}`);
const margin = { top: 20, right: 20, bottom: 50, left: 60 };

function getDatasetColor(di: number): string {
  return props.datasets[di]?.color ?? COLORS[di % COLORS.length]!;
}
function getGradientStop(di: number, stopIdx: 0 | 1): string {
  const stops = GRADIENT_STOPS[di % GRADIENT_STOPS.length]!;
  return props.datasets[di]?.gradientFrom ?? props.datasets[di]?.gradientTo ?? stops[stopIdx];
}

// Derive all values and labels
const allValues = computed<number[]>(() => {
  return props.datasets.flatMap((ds) => ds.data.map((d) => d.value));
});

const allLabels = computed<string[]>(() => {
  const first = props.datasets[0];
  if (!first) return [];
  return first.data.map((d) => d.label);
});

// SVG dimensions
const svgWidth = 800;
const svgHeight = computed(() => props.height);
const plotWidth = computed(() => svgWidth - margin.left - margin.right);
const plotHeight = computed(() => svgHeight.value - margin.top - margin.bottom);

// Scale calculations
const minValue = computed(() => {
  const vals = allValues.value;
  if (vals.length === 0) return 0;
  const m = Math.min(...vals);
  return m > 0 ? 0 : m;
});

const maxValue = computed(() => {
  const vals = allValues.value;
  if (vals.length === 0) return 100;
  const m = Math.max(...vals);
  return m + m * 0.2 || 100;
});

const valueRange = computed(() => maxValue.value - minValue.value || 1);

function xPos(index: number, total: number): number {
  if (total <= 1) return margin.left + plotWidth.value / 2;
  return margin.left + (index / (total - 1)) * plotWidth.value;
}

function yPos(value: number): number {
  return margin.top + plotHeight.value - ((value - minValue.value) / valueRange.value) * plotHeight.value;
}

// Y-axis ticks
const yTicks = computed(() => {
  const ticks: number[] = [];
  const step = valueRange.value / 4;
  for (let i = 0; i <= 4; i++) {
    ticks.push(minValue.value + step * i);
  }
  return ticks;
});

// Generate smooth SVG path (Catmull-Rom to Cubic Bezier)
function getSmoothPath(data: ChartDataPoint[]): string {
  const total = data.length;
  if (total === 0) return '';
  if (total === 1) {
    return `M${xPos(0, 1)},${yPos(data[0]!.value)}`;
  }

  const pts = data.map((d, i) => ({ x: xPos(i, total), y: yPos(d.value) }));

  let path = `M${pts[0]!.x},${pts[0]!.y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

function getAreaPath(data: ChartDataPoint[]): string {
  const total = data.length;
  if (total === 0) return '';

  const linePath = getSmoothPath(data);
  const lastX = xPos(total - 1, total);
  const firstX = xPos(0, total);
  const bottomY = margin.top + plotHeight.value;

  return `${linePath} L${lastX},${bottomY} L${firstX},${bottomY} Z`;
}

// Tooltip
const tooltip = ref<{
  show: boolean;
  x: number;
  y: number;
  values: { label: string; value: number; color: string }[];
}>({
  show: false,
  x: 0,
  y: 0,
  values: [],
});

function handleMouseMove(event: MouseEvent) {
  const svgEl = event.currentTarget as SVGSVGElement;
  const rect = svgEl.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const scaleX = svgWidth / rect.width;
  const svgMouseX = mouseX * scaleX;

  const total = allLabels.value.length;
  if (total === 0) return;

  let nearestIndex = 0;
  let minDist = Infinity;
  for (let i = 0; i < total; i++) {
    const dist = Math.abs(svgMouseX - xPos(i, total));
    if (dist < minDist) {
      minDist = dist;
      nearestIndex = i;
    }
  }

  const values = props.datasets.map((ds, di) => ({
    label: ds.label,
    value: ds.data[nearestIndex]?.value ?? 0,
    color: getDatasetColor(di),
  }));

  const yPositions = props.datasets.map((ds) => yPos(ds.data[nearestIndex]?.value ?? 0));

  tooltip.value = {
    show: true,
    x: xPos(nearestIndex, total),
    y: Math.min(...yPositions),
    values,
  };
}

function handleMouseLeave() {
  tooltip.value.show = false;
}

function formatValue(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return Math.round(val).toLocaleString();
}
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

    <!-- Chart SVG -->
    <svg
      v-else
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      class="w-full select-none"
      :style="{ height: `${height}px` }"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <defs>
        <linearGradient
          v-for="(_, di) in datasets"
          :key="`${uid}-grad-${di}`"
          :id="`${uid}-area-grad-${di}`"
          x1="0" y1="0" x2="0" y2="1"
        >
          <stop offset="0%" :stop-color="getGradientStop(di, 0)" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="getGradientStop(di, 1)" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Grid + Y-axis -->
      <g v-if="showGrid || showYAxis">
        <template v-for="(tick, ti) in yTicks" :key="`ytick-${ti}`">
          <line
            v-if="showGrid"
            :x1="margin.left" :y1="yPos(tick)"
            :x2="margin.left + plotWidth" :y2="yPos(tick)"
            class="stroke-slate-200 dark:stroke-slate-700/50"
            stroke-width="1" stroke-dasharray="4,4"
          />
          <text
            v-if="showYAxis"
            :x="margin.left - 10" :y="yPos(tick) + 4"
            text-anchor="end"
            class="fill-slate-400 dark:fill-slate-500"
            font-size="11"
          >
            {{ formatValue(tick) }}
          </text>
        </template>
      </g>

      <!-- X-axis -->
      <g v-if="showXAxis && allLabels.length > 0">
        <template v-for="(label, li) in allLabels" :key="`xlabel-${li}`">
          <g v-if="allLabels.length <= 8 || li % Math.ceil(allLabels.length / 6) === 0 || li === allLabels.length - 1">
            <text
              :x="xPos(li, allLabels.length)"
              :y="margin.top + plotHeight + 20"
              text-anchor="end"
              class="fill-slate-400 dark:fill-slate-500"
              font-size="10"
              transform="rotate(-35, xPos(li, allLabels.length), margin.top + plotHeight + 20)"
            >
              {{ label }}
            </text>
          </g>
        </template>
      </g>

      <!-- Area fills -->
      <path
        v-for="(ds, di) in datasets"
        :key="`area-${di}`"
        :d="getAreaPath(ds.data)"
        :fill="`url(#${uid}-area-grad-${di})`"
      />

      <!-- Lines -->
      <path
        v-for="(ds, di) in datasets"
        :key="`line-${di}`"
        :d="getSmoothPath(ds.data)"
        :stroke="getDatasetColor(di)"
        stroke-width="2.5"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Data dots -->
      <g v-for="(ds, di) in datasets" :key="`dots-${di}`">
        <circle
          v-for="(pt, pi) in ds.data"
          :key="`dot-${di}-${pi}`"
          :cx="xPos(pi, ds.data.length)"
          :cy="yPos(pt.value)"
          :fill="getDatasetColor(di)"
          r="3"
        />
      </g>

      <!-- Tooltip vertical line -->
      <line
        v-if="tooltip.show"
        :x1="tooltip.x" :y1="margin.top"
        :x2="tooltip.x" :y2="margin.top + plotHeight"
        class="stroke-slate-300 dark:stroke-slate-600"
        stroke-width="1"
        stroke-dasharray="3,3"
      />
    </svg>

    <!-- HTML Tooltip -->
    <div
      v-if="tooltip.show"
      class="pointer-events-none absolute z-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
      :style="{
        left: `${(tooltip.x / svgWidth) * 100}%`,
        top: `${(tooltip.y / svgHeight) * 100 - 10}px`,
        transform: 'translate(-50%, -100%)',
      }"
    >
      <div v-for="(v, vi) in tooltip.values" :key="vi" class="flex items-center gap-2 whitespace-nowrap">
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: v.color }"></span>
        <span class="text-slate-600 dark:text-slate-300">{{ v.label }}:</span>
        <span class="font-semibold text-slate-950 dark:text-white">{{ formatValue(v.value) }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="datasets.length > 1" class="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 dark:border-slate-700/50">
      <div v-for="(ds, di) in datasets" :key="`legend-${di}`" class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: getDatasetColor(di) }"></span>
        {{ ds.label }}
      </div>
    </div>
  </div>
</template>
