<script setup lang="ts">
import {
  Bot, CheckCircle2, Database, MessageSquare, Plus, Trash2, TrendingUp, Users, Zap,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import type { ChartDataset } from '~/components/AppLineChart.vue';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const pagesList = ref<any[]>([]);
const loading = ref(true);
const error = ref('');



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
  const user = authStore.user;
  const pkgId = (user as any)?.packageId || 'pkg-starter';
  return packagesList.value.find((pkg: any) => pkg.id === pkgId) || packagesList.value[0];
});

const bonusTokens = computed(() => Number(usageData.value?.bonusTokens ?? authStore.user?.bonusTokens ?? 0));

const effectiveTokenLimit = computed(() => {
  if (!activePackage.value) return 0;
  return Number(activePackage.value.maxTokens || 0) + bonusTokens.value;
});

const tokensUsed = computed(() => {
  return usageData.value?.totalTokens || 0;
});

const tokenPercentage = computed(() => {
  if (!activePackage.value) return 0;
  return Math.min(100, Math.round((tokensUsed.value / (effectiveTokenLimit.value || 1)) * 100));
});

const activePages = computed(() => pagesList.value.filter((p) => p.isActive).length);
const totalCustomers = computed(() => totalCustomersCount.value);

// ─── Chart Data ──────────────────────────────────────────
const conversationChartData = computed<ChartDataset[]>(() => {
  const dailyStats = usageData.value?.dailyStats || [];
  const statsMap = new Map<string, { conversations: number; tokens: number }>();
  dailyStats.forEach((s: any) => {
    statsMap.set(s.date, {
      conversations: Number(s.conversations || 0),
      tokens: Number(s.tokens || 0)
    });
  });

  const conversationData: { label: string; value: number }[] = [];
  const resolvedData: { label: string; value: number }[] = [];

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const stat = statsMap.get(key) || { conversations: 0, tokens: 0 };
    
    conversationData.push({
      label,
      value: stat.conversations
    });
    resolvedData.push({
      label,
      value: stat.conversations
    });
  }

  return [
    {
      label: 'Conversations',
      data: conversationData,
      color: '#0ea5e9',
    },
    {
      label: 'Resolved',
      data: resolvedData,
      color: '#10b981',
    },
  ];
});

const tokenChartData = computed<ChartDataset[]>(() => {
  const dailyStats = usageData.value?.dailyStats || [];
  const statsMap = new Map<string, number>();
  dailyStats.forEach((s: any) => {
    statsMap.set(s.date, Number(s.tokens || 0));
  });

  const tokenData: { label: string; value: number }[] = [];

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tokens = statsMap.get(key) || 0;
    
    tokenData.push({
      label,
      value: tokens
    });
  }

  return [
    {
      label: 'Tokens Used',
      data: tokenData,
      color: '#8b5cf6',
    },
  ];
});

const customerGrowth = computed(() => {
  return customerGrowthCount.value;
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

async function fetchPages() {
  error.value = '';

  try {
    pagesList.value = await $fetch<any[]>(`${apiUrl}/api/pages`, {
      headers: headers.value,
    });
  } catch (err: any) {
    console.error('Error fetching pages:', err);
    error.value = err.data?.error || 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນເພຈ໌ໄດ້';
  }
}

async function fetchUsageData() {
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
  if (pagesList.value.length === 0) return;
  try {
    let total = 0;
    let recent = 0;
    const now = Date.now();
    for (const page of pagesList.value) {
      const customers = await $fetch<any[]>(`${apiUrl}/api/customers/page/${page.id}`, {
        headers: headers.value,
        cache: 'no-store',
      });
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

async function loadDashboard() {
  loading.value = true;
  await fetchPages();
  await Promise.allSettled([
    fetchPackages(),
    fetchUsageData(),
  ]);
  await fetchCustomersCount();
  loading.value = false;
}

onMounted(() => {
  loadDashboard();
});
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <div class="relative overflow-hidden rounded-2xl border border-sky-100/60 bg-white p-6 shadow-sm dark:border-sky-950/40 dark:bg-slate-900/40">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-3">
          <AppSkeletonBlock class="h-3 w-40" />
          <AppSkeletonBlock class="h-8 w-80 max-w-full" />
          <AppSkeletonBlock class="h-4 w-[34rem] max-w-full" />
        </div>
        <AppSkeletonBlock class="h-10 w-48 rounded-xl" />
      </div>
    </div>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AppSkeletonBlock v-for="n in 4" :key="n" class="h-32 rounded-2xl" />
    </section>

    <section class="grid gap-6 lg:grid-cols-2">
      <AppSkeletonBlock v-for="n in 2" :key="n" class="h-[320px] rounded-2xl" />
    </section>

    <section class="grid gap-4 sm:grid-cols-3">
      <AppSkeletonBlock v-for="n in 3" :key="n" class="h-24 rounded-2xl" />
    </section>
  </div>

  <div v-else class="space-y-6">
    <!-- ═══════════════ HEADER / AI BANNER ═══════════════ -->
    <div class="relative overflow-hidden rounded-2xl border border-sky-100/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent p-6 dark:border-sky-950/40 dark:from-sky-950/20 dark:to-transparent">
      <!-- Glow effect decorative -->
      <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/15 blur-2xl dark:bg-sky-500/10"></div>
      <div class="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl dark:bg-indigo-500/5"></div>
      
      <div class="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30 dark:bg-sky-500 dark:shadow-sky-500/20">
            <Bot class="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">ລະບົບຈັດການອັດສະລິຍະ</p>
            <h1 class="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              ແດດຊບອດ <span class="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">FCAI Chatbot</span>
            </h1>
            <p class="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              ຕິດຕາມການໃຊ້ງານ AI ວິເຄາະຂໍ້ຄວາມ ແລະ ສະຖິຕິຂອງລູກຄ້າທີ່ເຊື່ອມຕໍ່ກັບເພຈ Facebook ຂອງທ່ານໄດ້ແບບຮຽວທາມ (Real-time).
            </p>
          </div>
        </div>
        
        <div class="flex shrink-0 flex-col sm:flex-row gap-3">
          <NuxtLink 
            to="/dashboard/pages" 
            class="app-btn-primary text-center justify-center shadow-md shadow-sky-500/20"
          >
            <MessageSquare class="h-4.5 w-4.5" />
            <span>ຈັດການເພຈ໌ Facebook</span>
          </NuxtLink>
        </div>
      </div>
    </div>

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
        :footnote="`ຈາກ ${effectiveTokenLimit.toLocaleString()} tokens (${bonusTokens.toLocaleString()} bonus)`"
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



    <!-- ═══════════════ ERROR BANNER ═══════════════ -->
    <section
      v-if="error"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {{ error }}
    </section>


  </div>
</template>
