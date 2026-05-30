<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { Check, Eye, EyeOff, Plus, Trash2, ToggleLeft, ToggleRight, Info, Lightbulb, Edit } from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const configs = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

// Provider config definitions with model suggestions and descriptions
const providerOptions = {
  gemini: {
    label: 'Google Gemini',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    icon: '🔵',
    description: 'ໃຊ້ງານກັບ Google Gemini API — ຮອງຮັບ Gemini 1.5, 2.0 Flash, 2.5 Flash ແລະ ອື່ນໆ.',
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ],
    defaultModel: 'gemini-2.5-flash',
    placeholder: 'gemini-2.5-flash',
    baseUrlHint: 'ບໍ່ຕ້ອງການ (Google ຈັດການໃຫ້ອັດຕະໂນມັດ)',
    keyPrefix: 'AIzaSy...',
  },
  openai: {
    label: 'OpenAI',
    color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    icon: '🟢',
    description: 'ໃຊ້ງານກັບ OpenAI API — ຮອງຮັບ GPT-4o, GPT-4, GPT-3.5 ແລະ ອື່ນໆ.',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1',
      'o3-mini',
    ],
    defaultModel: 'gpt-4o',
    placeholder: 'gpt-4o',
    baseUrlHint: 'https://api.openai.com/v1',
    keyPrefix: 'sk-...',
  },
  anthropic: {
    label: 'Anthropic Claude',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    icon: '🟠',
    description: 'ໃຊ້ງານກັບ Anthropic Claude API — ຮອງຮັບ Claude 3.5 Sonnet, Claude 4 ແລະ ອື່ນໆ.',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    placeholder: 'claude-sonnet-4-20250514',
    baseUrlHint: 'https://api.anthropic.com/v1',
    keyPrefix: 'sk-ant-...',
  },
  openrouter: {
    label: 'OpenRouter',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    icon: '🟣',
    description: 'ໃຊ້ງານກັບ OpenRouter — ເຊື່ອມຕໍ່ AI ຫຼາຍຕົວຜ່ານ API ດຽວ (Claude, GPT, Gemini, DeepSeek ແລະ ອື່ນໆ).',
    models: [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-sonnet-4',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash',
      'deepseek/deepseek-chat',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-small-3.1-24b-instruct',
    ],
    defaultModel: 'openai/gpt-4o',
    placeholder: 'openai/gpt-4o',
    baseUrlHint: 'https://openrouter.ai/api/v1',
    keyPrefix: 'sk-or-v1-...',
  },
  deepseek: {
    label: 'DeepSeek',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    icon: '🔷',
    description: 'ໃຊ້ງານກັບ DeepSeek API — ຮອງຮັບ DeepSeek V3, R1 ແລະ ອື່ນໆ.',
    models: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
    defaultModel: 'deepseek-chat',
    placeholder: 'deepseek-chat',
    baseUrlHint: 'https://api.deepseek.com/v1',
    keyPrefix: 'sk-...',
  },
  groq: {
    label: 'Groq',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
    icon: '🩷',
    description: 'ໃຊ້ງານກັບ Groq API — ຮອງຮັບ Llama, Mixtral, Gemma ດ້ວຍຄວາມໄວສູງ.',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    placeholder: 'llama-3.3-70b-versatile',
    baseUrlHint: 'https://api.groq.com/openai/v1',
    keyPrefix: 'gsk_...',
  },
  together: {
    label: 'Together AI',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    icon: '🟡',
    description: 'ໃຊ້ງານກັບ Together AI — ຮອງຮັບ Llama, Mistral, DeepSeek ແລະ ໂມເດນ open-source ອື່ນໆ.',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'deepseek-ai/DeepSeek-V3',
    ],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    placeholder: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    baseUrlHint: 'https://api.together.xyz/v1',
    keyPrefix: '...',
  },
  custom: {
    label: 'Custom (OpenAI Compatible)',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
    icon: '⚙️',
    description: 'ໃຊ້ງານກັບ API ທີ່ຮອງຮັບ OpenAI-compatible format ຕົວອື່ນໆ (Ollama, LocalAI, ແລະ ອື່ນໆ).',
    models: [],
    defaultModel: '',
    placeholder: 'ປ້ອນຊື່ໂມເດນຕາມທີ່ຕ້ອງການ',
    baseUrlHint: 'ປ້ອນ Base URL ຂອງ API (ຈຳເປັນ)',
    keyPrefix: '...',
  },
};

type ProviderKey = keyof typeof providerOptions;

// Form
const showCreateForm = ref(false);
const provider = ref<ProviderKey>('gemini');
const modelName = ref('gemini-2.5-flash');
const apiKey = ref('');
const baseUrl = ref('');
const isActive = ref(true);
const formLoading = ref(false);
const formError = ref('');

// Edit state
const showEditModal = ref(false);
const editingId = ref<string>('');
const editProvider = ref<ProviderKey>('gemini');
const editModelName = ref('');
const editApiKey = ref('');
const editBaseUrl = ref('');
const editIsActive = ref(true);
const editLoading = ref(false);
const editError = ref('');

// Derived provider info
const selectedProvider = computed(() => providerOptions[provider.value] || providerOptions.custom);

// Watch provider to auto-update modelName and baseUrl suggestions
watch(provider, (newVal) => {
  const opt = providerOptions[newVal];
  if (opt) {
    modelName.value = opt.defaultModel;
    baseUrl.value = opt.baseUrlHint?.startsWith('http') ? opt.baseUrlHint : '';
  }
});

// Visibility toggles for API keys
const visibleKeys = ref<Record<string, boolean>>({});

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

async function fetchConfigs() {
  loading.value = true;
  error.value = '';
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/ai-config`, { headers: headers.value });
    configs.value = Array.isArray(data) ? data : [];
  } catch (err: any) {
    error.value = err.data?.error || 'ບໍ່ສາມາດດຶງຂໍ້ມູນ AI Config ໄດ້';
  } finally {
    loading.value = false;
  }
}

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

function toggleKeyVisibility(id: string) {
  visibleKeys.value[id] = !visibleKeys.value[id];
}

function getProviderColor(prov: string) {
  const key = prov?.toLowerCase() as ProviderKey;
  return providerOptions[key]?.color || providerOptions.custom.color;
}

function getProviderLabel(prov: string) {
  const key = prov?.toLowerCase() as ProviderKey;
  return providerOptions[key]?.label || prov;
}

function getProviderIcon(prov: string) {
  const key = prov?.toLowerCase() as ProviderKey;
  return providerOptions[key]?.icon || '⚙️';
}

async function handleCreate() {
  if (!apiKey.value) {
    formError.value = 'ກະລຸນາປ້ອນ API Key';
    return;
  }

  formError.value = '';
  formLoading.value = true;

  try {
    await $fetch(`${apiUrl}/api/admin/ai-config`, {
      method: 'POST',
      headers: headers.value,
      body: {
        provider: provider.value,
        modelName: modelName.value,
        apiKey: apiKey.value,
        baseUrl: baseUrl.value || undefined,
        isActive: isActive.value,
      },
    });

    // Reset form
    provider.value = 'gemini';
    modelName.value = providerOptions.gemini.defaultModel;
    apiKey.value = '';
    baseUrl.value = '';
    isActive.value = true;
    showCreateForm.value = false;

    await fetchConfigs();
    await dialog.success('ເພີ່ມ AI Config ສຳເລັດ', 'ການຕັ້ງຄ່າ AI ຖືກບັນທຶກແລ້ວ.');
  } catch (err: any) {
    formError.value = err.data?.error || 'ບໍ່ສາມາດເພີ່ມ AI Config ໄດ້';
  } finally {
    formLoading.value = false;
  }
}

async function handleToggle(id: string) {
  try {
    const updated = await $fetch<any>(`${apiUrl}/api/admin/ai-config/${id}/toggle`, {
      method: 'PUT',
      headers: headers.value,
    });
    const idx = configs.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      configs.value[idx] = updated;
    }
  } catch (err: any) {
    await dialog.error('ປ່ຽນສະຖານະບໍ່ສຳເລັດ', err.data?.error || 'ກະລຸນາລອງໃໝ່');
  }
}

async function handleDelete(id: string) {
  const confirmed = await dialog.warning({
    title: 'ລຶບ AI Config',
    message: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບການຕັ້ງຄ່າ AI ນີ້?',
    confirmLabel: 'ລຶບ',
    cancelLabel: 'ຍົກເລີກ',
  });
  if (!confirmed) return;

  try {
    await $fetch(`${apiUrl}/api/admin/ai-config/${id}`, {
      method: 'DELETE',
      headers: headers.value,
    });
    configs.value = configs.value.filter(c => c.id !== id);
  } catch (err: any) {
    await dialog.error('ລຶບບໍ່ສຳເລັດ', err.data?.error || 'ກະລຸນາລອງໃໝ່');
  }
}

function openEdit(cfg: any) {
  showEditModal.value = true;
  editingId.value = cfg.id;
  editProvider.value = (cfg.provider?.toLowerCase() as ProviderKey) || 'gemini';
  editModelName.value = cfg.modelName || '';
  editApiKey.value = cfg.apiKey || '';
  editBaseUrl.value = cfg.baseUrl || '';
  editIsActive.value = cfg.isActive ?? true;
  editError.value = '';
  editLoading.value = false;
}

function closeEdit() {
  showEditModal.value = false;
  editingId.value = '';
  editError.value = '';
}

const selectedEditProvider = computed(() => providerOptions[editProvider.value] || providerOptions.custom);

watch(editProvider, (newVal) => {
  const opt = providerOptions[newVal];
  if (opt) {
    if (!editModelName.value || editModelName.value === '') {
      editModelName.value = opt.defaultModel;
    }
    if (!editBaseUrl.value || editBaseUrl.value === '') {
      editBaseUrl.value = opt.baseUrlHint?.startsWith('http') ? opt.baseUrlHint : '';
    }
  }
});

async function handleEdit() {
  if (!editApiKey.value) {
    editError.value = 'ກະລຸນາປ້ອນ API Key';
    return;
  }

  editError.value = '';
  editLoading.value = true;

  try {
    const updated = await $fetch<any>(`${apiUrl}/api/admin/ai-config/${editingId.value}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        provider: editProvider.value,
        modelName: editModelName.value,
        apiKey: editApiKey.value,
        baseUrl: editBaseUrl.value || undefined,
        isActive: editIsActive.value,
      },
    });

    // Update in-place
    const idx = configs.value.findIndex(c => c.id === editingId.value);
    if (idx !== -1) {
      configs.value[idx] = updated;
    }

    closeEdit();
    await dialog.success('ອັບເດດ AI Config ສຳເລັດ', 'ການຕັ້ງຄ່າ AI ຖືກປັບປຸງແລ້ວ.');
  } catch (err: any) {
    editError.value = err.data?.error || 'ບໍ່ສາມາດອັບເດດ AI Config ໄດ້';
  } finally {
    editLoading.value = false;
  }
}

onMounted(() => {
  fetchConfigs();
});
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span class="material-icons select-none text-indigo-600 dark:text-indigo-400 text-3xl">settings</span>
          ຕັ້ງຄ່າ AI (AI Config)
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ຈັດການການເຊື່ອມຕໍ່ກັບ AI Provider ຕ່າງໆ (Gemini, OpenAI, Claude, DeepSeek ແລະ ອື່ນໆ).
        </p>
      </div>

      <button
        @click="showCreateForm = !showCreateForm"
        class="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
      >
        <Plus class="h-4 w-4" />
        {{ showCreateForm ? 'ປິດຟອມ' : 'ເພີ່ມ AI Config' }}
      </button>
    </div>

    <!-- Create Form -->
    <div
      v-if="showCreateForm"
      class="mb-8 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl transition-all"
    >
      <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">ເພີ່ມການຕັ້ງຄ່າ AI ໃໝ່</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
        ເລືອກ AI Provider ທີ່ຕ້ອງການ ແລະ ປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ.
      </p>

      <!-- Provider selection with cards -->
      <div class="mb-5">
        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          AI Provider <span class="text-rose-500">*</span>
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <button
            v-for="(opt, key) in providerOptions"
            :key="key"
            type="button"
            @click="provider = key as ProviderKey"
            class="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all"
            :class="provider === key
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600'"
          >
            <span>{{ opt.icon }}</span>
            <span class="truncate">{{ opt.label }}</span>
          </button>
        </div>
        <!-- Provider description -->
        <p class="mt-2 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
          {{ selectedProvider.description }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Model Name -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Model Name <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model="modelName"
              type="text"
              :placeholder="selectedProvider.placeholder"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
              list="model-suggestions"
            />
            <datalist id="model-suggestions">
              <option v-for="m in selectedProvider.models" :key="m" :value="m" />
            </datalist>
          </div>
          <p class="mt-1 flex items-start gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Lightbulb class="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
            ຕົວຢ່າງ:
            <span class="font-mono text-indigo-500 dark:text-indigo-400">
              {{ selectedProvider.models.slice(0, 3).join(', ') }}
              <template v-if="selectedProvider.models.length > 3">, ...</template>
            </span>
          </p>
        </div>

        <!-- API Key -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            API Key <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="apiKey"
            type="password"
            :placeholder="`ໃສ່ API Key (${selectedProvider.keyPrefix})`"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
          />
          <p class="mt-1 flex items-start gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Lightbulb class="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
            Key ຈະຖືກເກັບໄວ້ໃນຖານຂໍ້ມູນ ແລະ ສະແດງແບບປິດບັງ.
            ຕົວຢ່າງ: <span class="font-mono text-indigo-500 dark:text-indigo-400">{{ selectedProvider.keyPrefix }}</span>
          </p>
        </div>

        <!-- Base URL -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Base URL
            <span class="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <input
            v-model="baseUrl"
            type="text"
            :placeholder="selectedProvider.baseUrlHint"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
          />
          <p class="mt-1 flex items-start gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Lightbulb class="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
            <span v-if="provider === 'gemini'">ບໍ່ຈຳເປັນຕ້ອງປ້ອນສຳລັບ Gemini (Google ຈັດການໃຫ້ອັດຕະໂນມັດ).</span>
            <span v-else-if="provider === 'custom'">ຈຳເປັນສຳລັບ Custom API — ຕົວຢ່າງ: <span class="font-mono text-indigo-500 dark:text-indigo-400">http://localhost:11434/v1</span> (Ollama)</span>
            <span v-else>ຕົວຢ່າງ: <span class="font-mono text-indigo-500 dark:text-indigo-400">{{ selectedProvider.baseUrlHint }}</span></span>
          </p>
        </div>

        <!-- Is Active -->
        <div class="flex items-center gap-3 pt-6">
          <label class="relative inline-flex cursor-pointer items-center">
            <input v-model="isActive" type="checkbox" class="peer sr-only" />
            <div class="h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-600"></div>
          </label>
          <div>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">ເປີດໃຊ້ງານ (Active)</span>
            <p class="text-xs text-slate-400 dark:text-slate-500">ເມື່ອເປີດໃຊ້, ລະບົບຈະໃຊ້ AI Config ນີ້ໃນການຕອບກັບລູກຄ້າ.</p>
          </div>
        </div>
      </div>

      <p v-if="formError" class="mt-3 text-sm font-semibold text-red-500">{{ formError }}</p>

      <div class="mt-6 flex gap-3">
        <button
          @click="handleCreate"
          :disabled="formLoading"
          class="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Check class="h-4 w-4" />
          {{ formLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ' }}
        </button>
        <button
          @click="showCreateForm = false"
          class="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-4 py-2.5"
        >
          ຍົກເລີກ
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-slate-500">ກຳລັງໂຫຼດຂໍ້ມູນ...</div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm font-semibold text-red-600 dark:text-red-400">
      {{ error }}
    </div>

    <!-- Config List -->
    <div v-if="!loading && !error" class="space-y-4">
      <div
        v-for="cfg in configs"
        :key="cfg.id"
        class="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-3 flex-wrap">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                :class="getProviderColor(cfg.provider)"
              >
                {{ getProviderIcon(cfg.provider) }}
                {{ getProviderLabel(cfg.provider) }}
              </span>
              <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ cfg.modelName }}</span>
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                :class="cfg.isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="cfg.isActive ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                {{ cfg.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <!-- API Key (masked) -->
            <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span class="font-mono text-xs">
                {{ visibleKeys[cfg.id] ? cfg.apiKey : maskApiKey(cfg.apiKey) }}
              </span>
              <button @click="toggleKeyVisibility(cfg.id)" class="hover:text-slate-700 dark:hover:text-slate-200">
                <Eye v-if="!visibleKeys[cfg.id]" class="h-3.5 w-3.5" />
                <EyeOff v-else class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Base URL if set -->
            <p v-if="cfg.baseUrl" class="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {{ cfg.baseUrl }}
            </p>

            <!-- Dates -->
            <p class="text-xs text-slate-400 dark:text-slate-500">
              ສ້າງເມື່ອ: {{ new Date(cfg.createdAt).toLocaleDateString('lo-LA', { year: 'numeric', month: 'short', day: 'numeric' }) }}
              <span v-if="cfg.updatedAt"> | ອັບເດດ: {{ new Date(cfg.updatedAt).toLocaleDateString('lo-LA', { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="openEdit(cfg)"
              class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition-all"
            >
              <Edit class="h-3.5 w-3.5" />
              ແກ້ໄຂ
            </button>
            <button
              @click="handleToggle(cfg.id)"
              class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
              :class="cfg.isActive
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'"
            >
              <ToggleRight v-if="cfg.isActive" class="h-3.5 w-3.5" />
              <ToggleLeft v-else class="h-3.5 w-3.5" />
              {{ cfg.isActive ? 'Deactivate' : 'Activate' }}
            </button>
            <button
              @click="handleDelete(cfg.id)"
              class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-all"
            >
              <Trash2 class="h-3.5 w-3.5" />
              ລຶບ
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="configs.length === 0"
        class="text-center py-16 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl"
      >
        <p class="text-slate-500 dark:text-slate-400 font-semibold">ຍັງບໍ່ມີການຕັ້ງຄ່າ AI</p>
        <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">ກົດປຸ່ມ "ເພີ່ມ AI Config" ເພື່ອເລີ່ມຕົ້ນ.</p>
      </div>
    </div>

    <!-- Edit AI Config Modal -->
    <AppModal v-model="showEditModal" title="ແກ້ໄຂ AI Config" description="ປັບປຸງການຕັ້ງຄ່າການເຊື່ອມຕໍ່ກັບ AI Provider" size="md" @close="closeEdit">
      <div v-if="editError" class="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ editError }}
      </div>

      <!-- Provider selection -->
      <div class="mb-5">
        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          AI Provider <span class="text-rose-500">*</span>
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <button
            v-for="(opt, key) in providerOptions"
            :key="key"
            type="button"
            @click="editProvider = key as ProviderKey"
            class="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all"
            :class="editProvider === key
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600'"
          >
            <span>{{ opt.icon }}</span>
            <span class="truncate">{{ opt.label }}</span>
          </button>
        </div>
        <p class="mt-2 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
          {{ selectedEditProvider.description }}
        </p>
      </div>

      <div class="space-y-4">
        <!-- Model Name -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Model Name <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model="editModelName"
              type="text"
              :placeholder="selectedEditProvider.placeholder"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
              list="edit-model-suggestions"
            />
            <datalist id="edit-model-suggestions">
              <option v-for="m in selectedEditProvider.models" :key="m" :value="m" />
            </datalist>
          </div>
        </div>

        <!-- API Key -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            API Key <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="editApiKey"
            type="password"
            :placeholder="`ໃສ່ API Key (${selectedEditProvider.keyPrefix})`"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
          />
        </div>

        <!-- Base URL -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Base URL
            <span class="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <input
            v-model="editBaseUrl"
            type="text"
            :placeholder="selectedEditProvider.baseUrlHint"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
          />
        </div>

        <!-- Active Toggle -->
        <div class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <label class="relative inline-flex cursor-pointer items-center">
            <input v-model="editIsActive" type="checkbox" class="peer sr-only" />
            <div class="h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-600"></div>
          </label>
          <div>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">ເປີດໃຊ້ງານ (Active)</span>
            <p class="text-xs text-slate-400 dark:text-slate-500">ເມື່ອເປີດໃຊ້, ລະບົບຈະໃຊ້ AI Config ນີ້ໃນການຕອບກັບລູກຄ້າ.</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="closeEdit"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all"
          >
            ຍົກເລີກ
          </button>
          <button
            @click="handleEdit"
            :disabled="editLoading"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
          >
            <span v-if="editLoading" class="material-icons select-none text-base animate-spin">refresh</span>
            {{ editLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການແກ້ໄຂ' }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
