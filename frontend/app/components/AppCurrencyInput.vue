<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Cleave from 'cleave.js';

const props = withDefaults(defineProps<{
  modelValue: string | number;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  suffix?: string; // e.g. " ກີບ"
}>(), {
  label: '',
  placeholder: '0',
  hint: '',
  error: '',
  disabled: false,
  required: false,
  suffix: ' ກີບ',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
let cleave: Cleave | null = null;

// Initialize Cleave
onMounted(() => {
  if (inputRef.value) {
    cleave = new Cleave(inputRef.value, {
      numeral: true,
      numeralThousandsGroupStyle: 'thousand',
      numeralDecimalScale: 0, // No decimals for Kip
      numeralPositiveOnly: true,
      rawValueTrimPrefix: true,
      delimiter: ',',
      onValueChanged: (e: any) => {
        // Emit the raw numeric value (without commas)
        const raw = e.target.rawValue;
        emit('update:modelValue', raw);
      },
    });

    // If there's an initial value, set it
    if (props.modelValue) {
      cleave.setRawValue(String(props.modelValue));
    }
  }
});

// Watch for external value changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (cleave && newVal !== undefined && newVal !== null) {
      const currentRaw = cleave.getRawValue();
      const newRaw = String(newVal);
      if (currentRaw !== newRaw) {
        cleave.setRawValue(newRaw);
      }
    }
  }
);

onBeforeUnmount(() => {
  if (cleave) {
    cleave.destroy();
    cleave = null;
  }
});

// Format a number for display (e.g. in tables)
function formatCurrency(value: string | number): string {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

defineExpose({ formatCurrency });
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
    >
      {{ label }}
      <span v-if="required" class="ml-0.5 text-red-500">*</span>
    </label>

    <!-- Input with currency suffix -->
    <div
      class="flex overflow-hidden rounded-xl border transition-all duration-200"
      :class="[
        error
          ? 'border-red-400 dark:border-red-500'
          : 'border-slate-300 focus-within:border-sky-400 dark:border-slate-600 dark:focus-within:border-sky-500',
        disabled ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900',
      ]"
    >
      <input
        ref="inputRef"
        type="tel"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        class="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div
        class="flex shrink-0 items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
      >
        {{ suffix }}
      </div>
    </div>

    <!-- Error / Hint -->
    <p
      v-if="error"
      class="mt-1.5 text-xs font-medium text-red-500 dark:text-red-400"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      class="mt-1.5 text-xs text-slate-400 dark:text-slate-500"
    >
      {{ hint }}
    </p>
  </div>
</template>
