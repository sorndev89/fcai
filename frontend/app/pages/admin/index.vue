<script setup lang="ts">
import { Ban, Check, Clock, Search, Users, Building2, DollarSign, TrendingUp, Activity, CreditCard, Package } from 'lucide-vue-next';
import { useMockStore } from '~/stores/mockData';
import { useAuthStore } from '~/stores/auth';
import { computed, onMounted, ref } from 'vue';
import AppMetricCard from '~/components/AppMetricCard.vue';
import AppLineChart from '~/components/AppLineChart.vue';
import type { ChartDataset } from '~/components/AppLineChart.vue';

definePageMeta({
  layout: 'admin',
});

const mockStore = useMockStore();
const authStore = useAuthStore();
const apiUrl = useApiUrl();
const tenants = ref<any[]>([]);
const payments = ref<any[]>([]);
const packages = ref<any[]>([]);
const search = ref('');
const statusFilter = ref('all');
const isMockMode = ref(false);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

async function fetchTenants() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/tenants`, { headers: headers.value });
    tenants.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Admin] Cannot fetch tenants from API, using mock.', err);
    isMockMode.value = true;
    mockStore.initStore();
    tenants.value = mockStore.getTenants();
  }
}

async function fetchPayments() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/payments`, { headers: headers.value });
    payments.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Admin] Cannot fetch payments from API, using mock.', err);
    payments.value = mockStore.getPayments();
  }
}

async function fetchPackages() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/auth/packages`);
    packages.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Admin] Cannot fetch packages from API, using mock.', err);
    packages.value = mockStore.getPackages();
  }
}

onMounted(() => {
  fetchTenants();
  fetchPayments();
  fetchPackages();
});

async function handleStatusChange(userId: string, newStatus: 'pending' | 'approved' | 'suspended') {
  try {
    if (isMockMode.value) {
      mockStore.updateTenantStatus(userId, newStatus);
    } else {
      await $fetch(`${apiUrl}/api/admin/tenants/${userId}/status`, {
        method: 'PUT',
        headers: headers.value,
        body: { status: newStatus },
      });
    }
    await fetchTenants();
  } catch (err) {
    console.error('[Admin] Failed to update tenant status:', err);
  }
}

const filteredTenants = computed(() => {
  return tenants.value.filter((tenant) => {
    const query = search.value.toLowerCase();
    const matchesSearch = tenant.name.toLowerCase().includes(query) || tenant.email.toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === 'all' || tenant.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const stats = computed(() => ({
  total: tenants.value.length,
  pending: tenants.value.filter((t: any) => t.status === 'pending').length,
  approved: tenants.value.filter((t: any) => t.status === 'approved').length,
  suspended: tenants.value.filter((t: any) => t.status === 'suspended').length,
}));

const totalRevenue = computed(() => {
  return payments.value.reduce((sum: number, p: any) => sum + p.amount, 0);
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
    if (found) found.revenue += p.amount;
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

// Package distribution
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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('lo-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('lo-LA') + ' ₭';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">ເຈົ້າຂອງລະບົບ</p>
        <h1 class="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">ໜ້າຄຸ້ມຄອງລະບົບ</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ພາບລວມຂອງລະບົບ — ຈຳນວນຜູ້ໃຊ້, ລາຍຮັບ, ສະຖິຕິການເຕີບໂຕ
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
        label="ເປີດໃຊ້ (ອະນຸມັດ)"
        :value="stats.approved"
        :icon="Check"
        color-class="emerald"
        :trend="{ value: stats.pending, direction: stats.pending > 0 ? 'up' : 'neutral', label: 'ລໍຖ້າກວດສອບ' }"
        footnote="ກຳລັງໃຊ້ງານຢູ່ໃນເວທີ"
      />
      <AppMetricCard
        label="ລໍຖ້າອະນຸມັດ"
        :value="stats.pending"
        :icon="Clock"
        color-class="amber"
        :trend="{ value: stats.suspended, direction: stats.suspended > 0 ? 'down' : 'neutral', label: 'ຖືກລະງັບ' }"
        footnote="ລໍຖ້າການກວດສອບຂອງທ່ານ"
      />
      <AppMetricCard
        label="ລາຍຮັບທັງໝົດ"
        :value="formatCurrency(totalRevenue)"
        :icon="DollarSign"
        color-class="violet"
        :trend="{ value: stats.approved, direction: stats.approved > 0 ? 'up' : 'neutral', label: 'ລູກຄ້າທີ່ຊຳລະ' }"
        footnote="ການເກັບກຳລາຍຮັບຕະຫຼອດໄລຍະ"
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
          <span class="text-sm font-bold text-slate-900 dark:text-slate-100">ຈຳນວນ Token ທີ່ໃຊ້ທັງໝົດ</span>
        </div>
        <p class="text-3xl font-extrabold text-slate-900 dark:text-white">{{ totalTokensUsed.toLocaleString() }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ stats.approved > 0 ? 'ສະເລ່ຍ ' + avgTokensPerTenant.toLocaleString() + ' / ລູກຄ້າ' : 'ບໍ່ມີລູກຄ້າທີ່ເຄື່ອນໄຫວ' }}
        </p>
      </div>

      <!-- Avg Revenue / Tenant -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
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

    <!-- Row 4: Tenant Management -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
      <!-- Section Header -->
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-bold text-slate-900 dark:text-slate-100">ຈັດການລູກຄ້າ</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">ອະນຸມັດ, ລະງັບ ແລະກວດສອບລູກຄ້າ</p>
          </div>
        </div>
        <!-- Search & Filter -->
        <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_200px]">
          <label class="relative">
            <span class="sr-only">ຄົ້ນຫາລູກຄ້າ</span>
            <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input v-model="search" type="text" class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500" placeholder="ຄົ້ນຫາດ້ວຍຊື່ຮ້ານ ຫຼື email" />
          </label>
          <select v-model="statusFilter" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <option value="all">ສະແດງທັງໝົດ</option>
            <option value="pending">ລໍຖ້າອະນຸມັດ</option>
            <option value="approved">ອະນຸມັດແລ້ວ</option>
            <option value="suspended">ຖືກລະງັບ</option>
          </select>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th class="px-5 py-3.5 font-semibold">ລູກຄ້າ</th>
              <th class="px-5 py-3.5 font-semibold">ແພັກເກດ</th>
              <th class="px-5 py-3.5 font-semibold">Token</th>
              <th class="px-5 py-3.5 font-semibold">ສະຖານະ</th>
              <th class="px-5 py-3.5 font-semibold">ສ້າງເມື່ອ</th>
              <th class="px-5 py-3.5 text-right font-semibold">ກະທຳ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="tenant in filteredTenants" :key="tenant.id" class="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-sm font-bold text-indigo-700 dark:from-indigo-500/20 dark:to-indigo-500/10 dark:text-indigo-300">
                    {{ tenant.name.slice(0, 1).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ tenant.name }}</p>
                    <p class="truncate text-xs text-slate-500">{{ tenant.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 text-slate-700 dark:text-slate-300">{{ getPackageName(tenant.packageId) }}</td>
              <td class="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{{ (tenant.tokensUsed || 0).toLocaleString() }}</td>
              <td class="px-5 py-4">
                <span v-if="tenant.status === 'approved'" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Check class="h-3.5 w-3.5" /> ອະນຸມັດແລ້ວ
                </span>
                <span v-else-if="tenant.status === 'pending'" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Clock class="h-3.5 w-3.5" /> ລໍຖ້າ
                </span>
                <span v-else class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  <Ban class="h-3.5 w-3.5" /> ລະງັບ
                </span>
              </td>
              <td class="px-5 py-4 text-slate-500">{{ formatDate(tenant.createdAt) }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button v-if="tenant.status !== 'approved'" class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'approved')">
                    <Check class="h-3.5 w-3.5" /> ອະນຸມັດ
                  </button>
                  <button v-if="tenant.status === 'approved'" class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-rose-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'suspended')">
                    <Ban class="h-3.5 w-3.5" /> ລະງັບ
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredTenants.length === 0">
              <td colspan="6" class="px-5 py-16 text-center text-slate-500">
                <Building2 class="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p class="font-semibold">ບໍ່ພົບລາຍຊື່ທີ່ກົງກັບການຄົ້ນຫາ</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="space-y-3 p-4 md:hidden">
        <article v-for="tenant in filteredTenants" :key="tenant.id" class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ tenant.name }}</p>
              <p class="truncate text-xs text-slate-500">{{ tenant.email }}</p>
            </div>
            <span v-if="tenant.status === 'approved'" class="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">ອະນຸມັດ</span>
            <span v-else-if="tenant.status === 'pending'" class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">ລໍຖ້າ</span>
            <span v-else class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">ລະງັບ</span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-xs text-slate-500">ແພັກເກດ</p>
              <p class="font-semibold text-slate-900 dark:text-slate-100">{{ getPackageName(tenant.packageId) }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Token</p>
              <p class="font-semibold text-slate-900 dark:text-slate-100">{{ (tenant.tokensUsed || 0).toLocaleString() }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">ສ້າງເມື່ອ</p>
              <p class="text-slate-600 dark:text-slate-400">{{ formatDate(tenant.createdAt) }}</p>
            </div>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button v-if="tenant.status !== 'approved'" class="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'approved')">ອະນຸມັດ</button>
            <button v-if="tenant.status === 'approved'" class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-rose-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'suspended')">ລະງັບ</button>
          </div>
        </article>
        <div v-if="filteredTenants.length === 0" class="py-12 text-center text-sm text-slate-500">
          <Building2 class="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
          ບໍ່ພົບລາຍຊື່
        </div>
      </div>
    </div>
  </div>
</template>
