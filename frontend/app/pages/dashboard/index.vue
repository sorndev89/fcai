<script setup lang="ts">
import {
  Bot, CheckCircle2, Database, MessageSquare, Plus, Settings, Trash2, TrendingUp, Users, Zap,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { useMockStore } from '~/stores/mockData';
import type { ChartDataset } from '~/components/AppLineChart.vue';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const authStore = useAuthStore();
const mockStore = useMockStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const pagesList = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const isMockMode = ref(false);

const showAddForm = ref(false);
const fbPageId = ref('');
const fbPageName = ref('');
const fbPageAccessToken = ref('');
const formError = ref('');
const formLoading = ref(false);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// ─── Real Data State (from API) ──────────────────────────
const usageData = ref<any>(null);
const packagesList = ref<any[]>([]);
const totalCustomersCount = ref(0);
const customerGrowthCount = ref(0);

// ─── Derived Metrics ─────────────────────────────────────
const activePackage = computed(() => {
  const pkgs = packagesList.value.length > 0 ? packagesList.value : mockStore.getPackages();
  const user = mockStore.getTenants().find((t) => t.id === authStore.user?.id) || authStore.user;
  const pkgId = (user as any)?.packageId || 'pkg-starter';
  return pkgs.find((pkg: any) => pkg.id === pkgId) || pkgs[0];
});

const tokensUsed = computed(() => {
  if (usageData.value) return usageData.value.totalTokens || 0;
  const user = mockStore.getTenants().find((t) => t.id === authStore.user?.id);
  return user?.tokensUsed || 0;
});

const tokenPercentage = computed(() => {
  if (!activePackage.value) return 0;
  return Math.min(100, Math.round((tokensUsed.value / activePackage.value.maxTokens) * 100));
});

const activePages = computed(() => pagesList.value.filter((p) => p.isActive).length);
const totalCustomers = computed(() => totalCustomersCount.value || mockStore.getCustomers().length);

// ─── Chart Data ──────────────────────────────────────────
function generateDailyData(days: number, base: number, variance: number, seed = 1): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const noise = Math.sin((i + seed) * 1.2) * variance + (Math.random() - 0.5) * variance * 0.4;
    result.push({ label, value: Math.round(Math.max(0, base + noise)) });
  }
  return result;
}

const conversationChartData = computed<ChartDataset[]>(() => [
  {
    label: 'Conversations',
    data: generateDailyData(7, 24, 12, 1),
    color: '#0ea5e9',
  },
  {
    label: 'Resolved',
    data: generateDailyData(7, 18, 10, 3),
    color: '#10b981',
  },
]);

const tokenChartData = computed<ChartDataset[]>(() => [
  {
    label: 'Tokens Used',
    data: generateDailyData(7, 3200, 1500, 5),
    color: '#8b5cf6',
  },
]);

const customerGrowth = computed(() => {
  if (customerGrowthCount.value > 0) return customerGrowthCount.value;
  const all = mockStore.getCustomers();
  const recent = all.filter((c) => {
    const created = new Date(c.createdAt).getTime();
    return Date.now() - created < 7 * 24 * 60 * 60 * 1000;
  });
  return recent.length;
});

const totalMessagesToday = computed(() => {
  const data = conversationChartData.value[0]?.data ?? [];
  const last = data[data.length - 1];
  return last?.value ?? 0;
});

const activeConversations = computed(() => {
  const data = conversationChartData.value[0]?.data ?? [];
  return data.reduce((sum, d) => sum + d.value, 0);
});

// ─── Page Management ──────────────────────────────────────
function resetForm() {
  fbPageId.value = '';
  fbPageName.value = '';
  fbPageAccessToken.value = '';
  formError.value = '';
}

async function fetchPages() {
  loading.value = true;
  error.value = '';

  if (isMockMode.value || authStore.token?.startsWith('mock')) {
    isMockMode.value = true;
    pagesList.value = mockStore.getPages();
    loading.value = false;
    return;
  }

  try {
    pagesList.value = await $fetch<any[]>(`${apiUrl}/api/pages`, {
      headers: headers.value,
    });
  } catch (err) {
    console.warn('Backend unavailable. Using mock data.', err);
    isMockMode.value = true;
    pagesList.value = mockStore.getPages();
  } finally {
    loading.value = false;
  }
}

async function handleConnectPage() {
  if (!fbPageId.value || !fbPageName.value || !fbPageAccessToken.value) {
    formError.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບທຸກຊ່ອງ.';
    return;
  }

  if (!activePackage.value) return;
  if (pagesList.value.length >= activePackage.value.maxPages) {
    formError.value = `ແພັກເກດ ${activePackage.value.name} ເຊື່ອມຕໍ່ໄດ້ສູງສຸດ ${activePackage.value.maxPages} ເພຈ.`;
    return;
  }

  formError.value = '';
  formLoading.value = true;

  try {
    if (isMockMode.value) {
      mockStore.addPage(fbPageId.value, fbPageName.value, fbPageAccessToken.value);
    } else {
      await $fetch(`${apiUrl}/api/pages`, {
        method: 'POST',
        headers: headers.value,
        body: { fbPageId: fbPageId.value, fbPageName: fbPageName.value, fbPageAccessToken: fbPageAccessToken.value },
      });
    }
    resetForm();
    showAddForm.value = false;
    await fetchPages();
    await dialog.success('ເຊື່ອມຕໍ່ເພຈສຳເລັດ', 'ທ່ານສາມາດເຂົ້າໄປກຳນົດ knowledge base ແລະທົດສອບ bot ໄດ້ແລ້ວ.');
  } catch (err: any) {
    console.error('Connect page error:', err);
    formError.value = err.data?.error || 'ບໍ່ສາມາດເຊື່ອມຕໍ່ເພຈໄດ້.';
  } finally {
    formLoading.value = false;
  }
}

async function togglePageActive(page: any) {
  const nextStatus = !page.isActive;
  try {
    if (isMockMode.value) {
      mockStore.updatePage(page.id, { isActive: nextStatus });
    } else {
      await $fetch(`${apiUrl}/api/pages/${page.id}`, {
        method: 'PUT',
        headers: headers.value,
        body: { isActive: nextStatus },
      });
    }
    page.isActive = nextStatus;
  } catch (err) {
    await dialog.error('ອັບເດດສະຖານະບໍ່ສຳເລັດ', 'ກະລຸນາລອງໃໝ່ ຫຼືກວດສອບການເຊື່ອມຕໍ່ backend.');
  }
}

async function handleDeletePage(pageId: string) {
  const confirmed = await dialog.warning({
    title: 'ຢືນຢັນການລຶບເພຈ',
    message: 'ການລຶບນີ້ຈະຕັດການເຊື່ອມຕໍ່ Facebook Page ແລະຂໍ້ມູນທີ່ຜູກກັບເພຈນີ້.',
    confirmLabel: 'ລຶບເພຈ',
    cancelLabel: 'ຍົກເລີກ',
  });
  if (!confirmed) return;
  try {
    if (isMockMode.value) {
      mockStore.deletePage(pageId);
    } else {
      await $fetch(`${apiUrl}/api/pages/${pageId}`, { method: 'DELETE', headers: headers.value });
    }
    pagesList.value = pagesList.value.filter((page) => page.id !== pageId);
  } catch (err) {
    await dialog.error('ລຶບເພຈບໍ່ສຳເລັດ', 'ກະລຸນາລອງໃໝ່ອີກຄັ້ງ.');
  }
}

async function fetchUsageData() {
  if (isMockMode.value || authStore.token?.startsWith('mock')) return;
  try {
    const data = await $fetch<any>(`${apiUrl}/api/usage/my`, { headers: headers.value });
    usageData.value = data;
  } catch (err) {
    console.warn('[Dashboard] Cannot fetch usage data from API.');
  }
}

async function fetchPackages() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/auth/packages`);
    if (Array.isArray(data) && data.length > 0) {
      packagesList.value = data;
    }
  } catch (err) {
    console.warn('[Dashboard] Cannot fetch packages from API.');
  }
}

async function fetchCustomersCount() {
  if (isMockMode.value || pagesList.value.length === 0) return;
  try {
    let total = 0;
    let recent = 0;
    const now = Date.now();
    for (const page of pagesList.value) {
      const customers = await $fetch<any[]>(`${apiUrl}/api/customers/page/${page.id}`, { headers: headers.value });
      if (Array.isArray(customers)) {
        total += customers.length;
        recent += customers.filter((c: any) => {
          const created = new Date(c.createdAt || c.created_at).getTime();
          return now - created < 7 * 24 * 60 * 60 * 1000;
        }).length;
      }
    }
    totalCustomersCount.value = total;
    customerGrowthCount.value = recent;
  } catch (err) {
    console.warn('[Dashboard] Cannot fetch customers from API.');
  }
}

onMounted(() => {
  fetchPages();
  fetchPackages();
  fetchUsageData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- ═══════════════ HEADER ═══════════════ -->
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="app-kicker">ພາບລວມແດດຊບອດ</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">ແດດຊບອດ AI Chatbot</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          ຕິດຕາມສະຖິຕິການໃຊ້ງານ, ກວດສອບ token ແລະຈັດການເພຈ Facebook ຂອງທ່ານ.
        </p>
      </div>

      <button class="app-btn-primary w-full sm:w-auto" type="button" @click="showAddForm = true">
        <Plus class="h-4 w-4" />
        ເຊື່ອມຕໍ່ເພຈໃໝ່
      </button>
    </section>

    <!-- ═══════════════ METRIC CARDS ═══════════════ -->
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AppMetricCard
        label="ເພຈທີ່ເຊື່ອມຕໍ່"
        :value="`${pagesList.length} / ${activePackage?.maxPages ?? 1}`"
        :icon="Database"
        color-class="sky"
        :trend="{ value: 12, direction: 'up', label: 'vs ເດືອນກ່ອນ' }"
        footnote="ຈຳນວນເພຈທັງໝົດ"
      />

      <AppMetricCard
        label="ບັອດທີ່ເປີດໃຊ້ງານ"
        :value="activePages"
        :icon="Bot"
        color-class="emerald"
        :trend="{ value: 8, direction: 'up', label: 'vs ເດືອນກ່ອນ' }"
        footnote="AI bot ກຳລັງຕອບອັດຕະໂນມັດ"
      />

      <AppMetricCard
        label="ລູກຄ້າທັງໝົດ"
        :value="totalCustomers"
        :icon="Users"
        color-class="violet"
        :trend="{ value: customerGrowth, direction: 'up', label: 'ເພີ່ມໃໝ່ 7 ວັນ' }"
        footnote="ຈາກທຸກເພຈ"
      />

      <AppMetricCard
        label="ການໃຊ້ Token"
        :value="`${tokenPercentage}%`"
        :icon="Zap"
        color-class="amber"
        :trend="{ value: tokenPercentage > 60 ? 15 : -5, direction: tokenPercentage > 60 ? 'up' : 'down', label: 'ອັດຕາການໃຊ້' }"
        :footnote="`ຈາກ ${activePackage?.maxTokens?.toLocaleString() ?? 0} tokens`"
      />
    </section>

    <!-- ═══════════════ CHARTS ROW ═══════════════ -->
    <section class="grid gap-6 lg:grid-cols-2">
      <!-- Conversations Chart -->
      <AppLineChart
        :datasets="conversationChartData"
        :height="280"
        y-axis-label="Conversations"
        :empty-message="'ຍັງບໍ່ມີຂໍ້ມູນການສົນທະນາ'"
      />

      <!-- Token Usage Chart -->
      <AppLineChart
        :datasets="tokenChartData"
        :height="280"
        y-axis-label="Tokens"
        :empty-message="'ຍັງບໍ່ມີຂໍ້ມູນການໃຊ້ token'"
      />
    </section>

    <!-- ═══════════════ QUICK STATS ROW ═══════════════ -->
    <section class="grid gap-4 sm:grid-cols-3">
      <div class="app-surface flex items-center gap-4 p-4">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30">
          <MessageSquare class="h-5 w-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-950 dark:text-white">{{ totalMessagesToday }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">ຂໍ້ຄວາມມື້ນີ້</p>
        </div>
      </div>
      <div class="app-surface flex items-center gap-4 p-4">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
          <TrendingUp class="h-5 w-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-950 dark:text-white">{{ activeConversations }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">ການສົນທະນາທັງໝົດ (7 ວັນ)</p>
        </div>
      </div>
      <div class="app-surface flex items-center gap-4 p-4">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
          <Bot class="h-5 w-5" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-950 dark:text-white">{{ activePages }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">ບັອດທີ່ເຮັດວຽກຢູ່</p>
        </div>
      </div>
    </section>

    <!-- ═══════════════ MOCK MODE BANNER ═══════════════ -->
    <section
      v-if="isMockMode"
      class="app-muted-surface flex flex-col gap-3 p-3 text-sm text-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <span><strong>Mock mode:</strong> backend ຍັງບໍ່ຕອບ, ລະບົບກຳລັງໃຊ້ຂໍ້ມູນຈຳລອງ.</span>
      <button class="app-btn-secondary min-h-9 py-1.5" type="button" @click="isMockMode = false; fetchPages();">
        ລອງເຊື່ອມຕໍ່ຄືນ
      </button>
    </section>

    <!-- ═══════════════ ERROR BANNER ═══════════════ -->
    <section
      v-if="error"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {{ error }}
    </section>

    <!-- ═══════════════ LOADING ═══════════════ -->
    <section v-if="loading" class="app-surface p-10 text-center text-sm text-slate-500">
      ກຳລັງໂຫຼດຂໍ້ມູນເພຈ...
    </section>

    <!-- ═══════════════ EMPTY STATE ═══════════════ -->
    <section v-else-if="pagesList.length === 0" class="app-surface p-8 text-center">
      <Bot class="mx-auto h-10 w-10 text-slate-400" />
      <h2 class="mt-3 text-lg font-bold text-slate-950 dark:text-white">ຍັງບໍ່ມີເພຈທີ່ເຊື່ອມຕໍ່</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
        ເຊື່ອມຕໍ່ Facebook Page ເພື່ອເລີ່ມຝຶກ AI bot ແລະຕິດຕາມ CRM.
      </p>
      <button class="app-btn-primary mt-5" type="button" @click="showAddForm = true">
        <Plus class="h-4 w-4" />
        ເຊື່ອມຕໍ່ເພຈ
      </button>
    </section>

    <!-- ═══════════════ CONNECTED PAGES ═══════════════ -->
    <section v-else>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-slate-950 dark:text-white">
          ເພຈທີ່ເຊື່ອມຕໍ່
          <span class="ml-2 text-sm font-normal text-slate-500">({{ pagesList.length }})</span>
        </h2>
        <button class="app-btn-secondary text-sm" type="button" @click="showAddForm = true">
          <Plus class="h-4 w-4" />
          ເພີ່ມເພຈ
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="page in pagesList"
          :key="page.id"
          class="app-surface flex min-h-56 flex-col justify-between p-4 transition-all duration-200 hover:shadow-md"
        >
          <div>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate text-base font-bold text-slate-950 dark:text-white">{{ page.fbPageName }}</h3>
                <p class="mt-1 truncate text-xs text-slate-500">ID: {{ page.fbPageId }}</p>
              </div>
              <button
                class="inline-flex h-9 w-14 shrink-0 items-center rounded-full p-1 transition"
                :class="page.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'"
                type="button"
                :title="page.isActive ? 'Disable bot' : 'Enable bot'"
                @click="togglePageActive(page)"
              >
                <span
                  class="h-7 w-7 rounded-full bg-white shadow transition"
                  :class="page.isActive ? 'translate-x-5' : 'translate-x-0'"
                ></span>
              </button>
            </div>

            <div class="app-muted-surface mt-4 flex items-center gap-2 px-3 py-2 text-xs">
              <CheckCircle2 v-if="page.isActive" class="h-4 w-4 text-emerald-600" />
              <Bot v-else class="h-4 w-4 text-slate-500" />
              <span>{{ page.isActive ? 'Bot ກຳລັງເປີດໃຊ້ງານ' : 'Bot ຖືກປິດໄວ້' }}</span>
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              class="app-btn-secondary h-10 w-10 px-0 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
              type="button"
              title="Delete page"
              @click="handleDeletePage(page.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
            <NuxtLink :to="`/dashboard/pages/${page.id}`" class="app-btn-secondary">
              <Settings class="h-4 w-4" />
              ກຳນົດຄ່າ bot
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <!-- ═══════════════ ADD PAGE MODAL ═══════════════ -->
    <AppModal
      v-model="showAddForm"
      title="ເຊື່ອມຕໍ່ Facebook Page"
      description="ປ້ອນ Page ID ແລະ access token ເພື່ອເປີດໃຊ້ AI bot."
      size="lg"
      @close="resetForm"
    >
      <div class="space-y-4">
        <div
          v-if="formError"
          class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {{ formError }}
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div>
            <label class="app-label">ຊື່ເພຈ</label>
            <input v-model="fbPageName" type="text" class="app-input" placeholder="Green Shop" />
          </div>
          <div>
            <label class="app-label">Facebook Page ID</label>
            <input v-model="fbPageId" type="text" class="app-input" placeholder="1029384756" />
          </div>
          <div>
            <label class="app-label">Page Access Token</label>
            <input v-model="fbPageAccessToken" type="text" class="app-input" placeholder="EAABw..." />
            <p class="mt-1 text-xs text-slate-500">Mock mode: ໃສ່ “mock” ຫຼື “test”.</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button class="app-btn-secondary" type="button" @click="showAddForm = false; resetForm();">ຍົກເລີກ</button>
          <button class="app-btn-primary" type="button" :disabled="formLoading" @click="handleConnectPage">
            {{ formLoading ? 'ກຳລັງເຊື່ອມຕໍ່...' : 'ເຊື່ອມຕໍ່ເພຈ' }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
