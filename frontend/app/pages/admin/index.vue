<script setup lang="ts">
import { Users, Building2, DollarSign, TrendingUp, Activity, CreditCard, Package } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { computed, onMounted, ref } from 'vue';
import AppMetricCard from '~/components/AppMetricCard.vue';
import AppLineChart from '~/components/AppLineChart.vue';
import type { ChartDataset } from '~/components/AppLineChart.vue';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();
const tenants = ref<any[]>([]);
const payments = ref<any[]>([]);
const packages = ref<any[]>([]);
const loading = ref(true);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

async function fetchTenants() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/tenants`, { headers: headers.value });
    tenants.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[Admin] Cannot fetch tenants from API.', err);
    tenants.value = [];
  }
}

async function fetchPayments() {
  try {
    const res = await $fetch<any>(`${apiUrl}/api/admin/payments?limit=1000`, { headers: headers.value });
    const data = res?.data;
    payments.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[Admin] Cannot fetch payments from API.', err);
    payments.value = [];
  }
}

async function fetchPackages() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/auth/packages`);
    packages.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[Admin] Cannot fetch packages from API.', err);
    packages.value = [];
  }
}

async function fetchData() {
  loading.value = true;
  await Promise.allSettled([
    fetchTenants(),
    fetchPayments(),
    fetchPackages(),
  ]);
  loading.value = false;
}

onMounted(() => {
  fetchData();
});

const stats = computed(() => ({
  total: tenants.value.length,
  pending: tenants.value.filter((t: any) => t.status === 'pending').length,
  approved: tenants.value.filter((t: any) => t.status === 'approved').length,
  suspended: tenants.value.filter((t: any) => t.status === 'suspended').length,
}));

const totalRevenue = computed(() => {
  return payments.value.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
});

const totalTokensUsed = computed(() => {
  return tenants.value.reduce((sum: number, t: any) => sum + (t.tokensUsed || 0), 0);
});

const avgRevenuePerTenant = computed(() => {
  if (stats.value.approved === 0) return 0;
  return Math.round(totalRevenue.value / stats.value.approved);
});

const avgTokensPerTenant = computed(() => {
  if (stats.value.approved === 0) return 0;
  return Math.round(totalTokensUsed.value / stats.value.approved);
});

// ── Chart Data Generators ──────────────────────────────────

type DayBucket = { label: string; date: string; count: number; revenue: number };

function last7Days(): DayBucket[] {
  const days: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('lo-LA', { weekday: 'short' });
    const date = d.toISOString().slice(0, 10);
    days.push({ label, date, count: 0, revenue: 0 });
  }
  return days;
}

const registrationChartData = computed<ChartDataset[]>(() => {
  const buckets = last7Days();
  for (const t of tenants.value) {
    const day = (t.createdAt || '').slice(0, 10);
    const found = buckets.find((b) => b.date === day);
    if (found) found.count++;
  }
  return [
    {
      label: 'ລູກຄ້າໃໝ່',
      data: buckets.map((b) => ({ label: b.label, value: b.count })),
      color: '#6366f1',
      gradientFrom: '#6366f1',
      gradientTo: '#a5b4fc',
    },
  ];
});

const revenueChartData = computed<ChartDataset[]>(() => {
  const buckets = last7Days();
  for (const p of payments.value) {
    const day = (p.createdAt || '').slice(0, 10);
    const found = buckets.find((b) => b.date === day);
    if (found) found.revenue += Number(p.amount || 0);
  }
  return [
    {
      label: 'ລາຍຮັບ (Kip)',
      data: buckets.map((b) => ({ label: b.label, value: b.revenue })),
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#6ee7b7',
    },
  ];
});

const packageDistribution = computed(() => {
  const map: Record<string, number> = {};
  for (const t of tenants.value) {
    const pkgId = t.packageId || 'none';
    map[pkgId] = (map[pkgId] || 0) + 1;
  }
  return Object.entries(map)
    .map(([id, count]) => ({ id, name: getPackageName(id), count }))
    .sort((a, b) => b.count - a.count);
});

function getPackageName(packageId: string) {
  const pkg = packages.value.find((item: any) => item.id === packageId);
  return pkg ? pkg.name : 'ບໍ່ມີແພັກເກດ';
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('lo-LA') + ' ₭';
}
</script>

<template>
  <div class="space-y-6">
    <template v-if="loading">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-3">
          <AppSkeletonBlock class="h-3 w-28" />
          <AppSkeletonBlock class="h-8 w-72 max-w-full" />
          <AppSkeletonBlock class="h-4 w-[28rem] max-w-full" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppSkeletonBlock v-for="n in 4" :key="n" class="h-32 w-full rounded-2xl" />
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div v-for="n in 2" :key="n" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <div class="mb-4 flex items-center justify-between">
            <div class="space-y-2">
              <AppSkeletonBlock class="h-5 w-40" />
              <AppSkeletonBlock class="h-3 w-24" />
            </div>
            <AppSkeletonBlock class="h-9 w-9 rounded-lg" />
          </div>
          <AppSkeletonBlock class="h-[280px] w-full rounded-2xl" />
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Page Header -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">ເຈົ້າຂອງລະບົບ</p>
          <h1 class="mt-1 text-2xl font-extrabold text-slate-900 dark:white">ແດດຊບອດລະບົບ</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ພາບລວມຂອງລະບົບ — ຈຳນວນຜູ້ໃຊ້, ລາຍຮັບ ແລະ ສະຖິຕິການເຕີບໂຕ
          </p>
        </div>
      </div>

      <!-- Row 1: Metric Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppMetricCard
          label="ລູກຄ້າທັງໝົດ"
          :value="stats.total"
          :icon="Users"
          color-class="sky"
          :trend="{ value: stats.approved, direction: stats.pending > 0 ? 'up' : 'neutral', label: 'ອະນຸມັດ' }"
          footnote="ລູກຄ້າທີ່ລົງທະບຽນທັງໝົດ"
        />
        <AppMetricCard
          label="ເປີດໃຊ້ (Active)"
          :value="stats.approved"
          :icon="Building2"
          color-class="emerald"
          :trend="{ value: stats.pending, direction: stats.pending > 0 ? 'up' : 'neutral', label: 'ລໍຖ້າກວດສອບ' }"
          footnote="ລູກຄ້າທີ່ເປີດໃຊ້ງານຢູ່"
        />
        <AppMetricCard
          label="ລໍຖ້າອະນຸມັດ"
          :value="stats.pending"
          :icon="Activity"
          color-class="amber"
          :trend="{ value: stats.suspended, direction: stats.suspended > 0 ? 'down' : 'neutral', label: 'ຖືກລະງັບ' }"
          footnote="ລໍຖ້າການກວດສອບ"
        />
        <AppMetricCard
          label="ລາຍຮັບທັງໝົດ"
          :value="formatCurrency(totalRevenue)"
          :icon="DollarSign"
          color-class="violet"
          :trend="{ value: stats.approved, direction: stats.approved > 0 ? 'up' : 'neutral', label: 'ລູກຄ້າທີ່ຊຳລະ' }"
          footnote="ຍອດລາຍຮັບລວມທັງໝົດ"
        />
      </div>

      <!-- Row 2: Charts -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- New Registrations Chart -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="font-bold text-slate-900 dark:text-slate-100">ການສະໝັກໃໝ່</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">7 ມື້ຫຼ້າສຸດ</p>
            </div>
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <TrendingUp class="h-4 w-4" />
            </div>
          </div>
          <AppLineChart
          :datasets="registrationChartData"
          :height="220"
          :show-grid="true"
          :show-y-axis="true"
          :show-x-axis="true"
          y-axis-label="ຈຳນວນລູກຄ້າ"
          :empty-message="tenants.length === 0 ? 'ຍັງບໍ່ມີຂໍ້ມູນການສະໝັກ' : ''"
        />
      </div>

      <!-- Revenue Chart -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-slate-100">ແນວໂນ້ມລາຍຮັບ</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">7 ມື້ຫຼ້າສຸດ</p>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <DollarSign class="h-4 w-4" />
          </div>
        </div>
        <AppLineChart
          :datasets="revenueChartData"
          :height="220"
          :show-grid="true"
          :show-y-axis="true"
          :show-x-axis="true"
          y-axis-label="ລາຍຮັບ (Kip)"
          :empty-message="payments.length === 0 ? 'ຍັງບໍ່ມີຂໍ້ມູນການຊຳລະ' : ''"
        />
      </div>
    </div>

    <!-- Row 3: Quick Stats -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- Package Distribution -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
            <Package class="h-4 w-4" />
          </div>
          <span class="text-sm font-bold text-slate-900 dark:text-slate-100">ການແຈກຢາຍແພັກເກດ</span>
        </div>
        <div class="space-y-2">
          <div v-for="pkg in packageDistribution" :key="pkg.id" class="flex items-center justify-between text-sm">
            <span class="text-slate-600 dark:text-slate-400">{{ pkg.name }}</span>
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ pkg.count }}</span>
          </div>
          <div v-if="packageDistribution.length === 0" class="py-2 text-center text-xs text-slate-400">ຍັງບໍ່ມີລູກຄ້າ</div>
        </div>
      </div>

      <!-- Total Tokens -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <Activity class="h-4 w-4" />
          </div>
          <span class="text-sm font-bold text-slate-900 dark:text-slate-100">Token ທີ່ໃຊ້ທັງໝົດ</span>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 dark:text-white">{{ totalTokensUsed.toLocaleString() }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ stats.approved > 0 ? 'ສະເລ່ຍ ' + avgTokensPerTenant.toLocaleString() + ' / ລູກຄ້າ' : 'ບໍ່ມີລູກຄ້າທີ່ເຄື່ອນໄຫວ' }}
        </p>
      </div>

      <!-- Avg Revenue / Tenant -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CreditCard class="h-4 w-4" />
          </div>
          <span class="text-sm font-bold text-slate-900 dark:text-slate-100">ລາຍຮັບສະເລ່ຍ / ລູກຄ້າ</span>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 dark:text-white">{{ formatCurrency(avgRevenuePerTenant) }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ເກັບກຳໄດ້ {{ payments.length }} ລາຍການຊຳລະ
        </p>
      </div>
    </div>
    </template>
  </div>
</template>
