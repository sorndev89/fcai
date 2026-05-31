<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  BadgePlus,
  Coins,
  Edit3,
  History,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldPlus,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'admin',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

const loading = ref(false);
const savingBundle = ref(false);
const grantingTokens = ref(false);
const error = ref('');
const success = ref('');

const bundles = ref<any[]>([]);
const tenants = ref<any[]>([]);
const topupHistory = ref<any[]>([]);

const selectedUserId = ref('');
const userTokenAmount = ref(50000);

const bundleForm = ref({
  id: '' as string,
  name: '',
  tokenAmount: 50000,
  price: 90000,
  sortOrder: 0,
  isActive: true,
});

const searchQuery = ref('');

const activeBundleCount = computed(() => bundles.value.filter((bundle) => bundle.isActive).length);
const totalTopupTokens = computed(() =>
  topupHistory.value.reduce((sum, payment) => sum + Number(payment.tokenAmount || 0), 0)
);
const totalGrantedTokens = computed(() =>
  tenants.value.reduce((sum, tenant) => sum + Number(tenant.bonusTokens || 0), 0)
);

const filteredHistory = computed(() => {
  if (!searchQuery.value) return topupHistory.value;
  const q = searchQuery.value.toLowerCase();
  return topupHistory.value.filter((pay) =>
    String(pay.id || '').toLowerCase().includes(q)
    || String(pay.userName || '').toLowerCase().includes(q)
    || String(pay.userId || '').toLowerCase().includes(q)
    || String(pay.tokenAmount || '').toLowerCase().includes(q)
  );
});

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('lo-LA').format(Number(value || 0));
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('lo-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resetBundleForm() {
  bundleForm.value = {
    id: '',
    name: '',
    tokenAmount: 50000,
    price: 90000,
    sortOrder: 0,
    isActive: true,
  };
}

function editBundle(bundle: any) {
  bundleForm.value = {
    id: bundle.id,
    name: bundle.name,
    tokenAmount: Number(bundle.tokenAmount || 0),
    price: Number(bundle.price || 0),
    sortOrder: Number(bundle.sortOrder || 0),
    isActive: Boolean(bundle.isActive),
  };
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [bundlesRes, tenantsRes, paymentsRes] = await Promise.all([
      $fetch<any[]>(`${apiUrl}/api/admin/token-bundles`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/admin/tenants`, { headers: headers.value }),
      $fetch<any>(`${apiUrl}/api/admin/payments?page=1&limit=100`, { headers: headers.value }),
    ]);

    bundles.value = Array.isArray(bundlesRes) ? bundlesRes : [];
    tenants.value = Array.isArray(tenantsRes) ? tenantsRes : [];
    topupHistory.value = Array.isArray(paymentsRes?.data)
      ? paymentsRes.data.filter((pay: any) => {
          const kind = String(pay.paymentKind || pay.paymentType || '').toLowerCase();
          return kind === 'token_topup' || Number(pay.tokenAmount || 0) > 0;
        })
      : [];

    if (!selectedUserId.value && tenants.value.length > 0) {
      selectedUserId.value = tenants.value[0].id;
    }
  } catch (err) {
    console.error('[Admin Tokens] Load failed:', err);
    error.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນ token ໄດ້';
  } finally {
    loading.value = false;
  }
}

async function saveBundle() {
  if (!bundleForm.value.name.trim()) {
    error.value = 'ກະລຸນາປ້ອນຊື່ bundle';
    return;
  }
  if (bundleForm.value.tokenAmount <= 0 || bundleForm.value.price <= 0) {
    error.value = 'Token ແລະລາຄາຕ້ອງຫຼາຍກວ່າ 0';
    return;
  }

  savingBundle.value = true;
  error.value = '';
  try {
    const payload = {
      name: bundleForm.value.name,
      tokenAmount: bundleForm.value.tokenAmount,
      price: bundleForm.value.price,
      sortOrder: bundleForm.value.sortOrder,
      isActive: bundleForm.value.isActive,
    };

    if (bundleForm.value.id) {
      await $fetch(`${apiUrl}/api/admin/token-bundles/${bundleForm.value.id}`, {
        method: 'PUT',
        headers: headers.value,
        body: payload,
      });
      success.value = 'ອັບເດດ token bundle ສຳເລັດ';
    } else {
      await $fetch(`${apiUrl}/api/admin/token-bundles`, {
        method: 'POST',
        headers: headers.value,
        body: payload,
      });
      success.value = 'ສ້າງ token bundle ສຳເລັດ';
    }

    setTimeout(() => {
      success.value = '';
    }, 3000);

    resetBundleForm();
    await loadData();
  } catch (err: any) {
    console.error('[Admin Tokens] Save bundle failed:', err);
    error.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກ bundle ໄດ້';
  } finally {
    savingBundle.value = false;
  }
}

async function toggleBundle(bundle: any) {
  savingBundle.value = true;
  error.value = '';
  try {
    await $fetch(`${apiUrl}/api/admin/token-bundles/${bundle.id}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        name: bundle.name,
        tokenAmount: Number(bundle.tokenAmount),
        price: Number(bundle.price),
        sortOrder: Number(bundle.sortOrder || 0),
        isActive: !bundle.isActive,
      },
    });
    await loadData();
  } catch (err: any) {
    console.error('[Admin Tokens] Toggle failed:', err);
    error.value = err.data?.error || 'ບໍ່ສາມາດປ່ຽນສະຖານະ bundle ໄດ້';
  } finally {
    savingBundle.value = false;
  }
}

async function grantBonusTokens() {
  if (!selectedUserId.value) {
    error.value = 'ກະລຸນາເລືອກ user';
    return;
  }
  if (userTokenAmount.value <= 0) {
    error.value = 'Token ທີ່ເພີ່ມຕ້ອງຫຼາຍກວ່າ 0';
    return;
  }

  grantingTokens.value = true;
  error.value = '';
  try {
    await $fetch(`${apiUrl}/api/admin/users/${selectedUserId.value}/bonus-tokens`, {
      method: 'POST',
      headers: headers.value,
      body: { amount: userTokenAmount.value },
    });

    success.value = 'ເພີ່ມ bonus token ໃຫ້ user ສຳເລັດ';
    setTimeout(() => {
      success.value = '';
    }, 3000);

    await loadData();
  } catch (err: any) {
    console.error('[Admin Tokens] Grant failed:', err);
    error.value = err.data?.error || 'ບໍ່ສາມາດເພີ່ມ token ໃຫ້ user ໄດ້';
  } finally {
    grantingTokens.value = false;
  }
}

function getSelectedTenant() {
  return tenants.value.find((tenant) => tenant.id === selectedUserId.value);
}

onMounted(loadData);
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap class="h-8 w-8 text-indigo-500" />
          ຈັດການ Token
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ຈັດການຊຸດ token top-up ແລະເພີ່ມ bonus token ໃຫ້ user ໂດຍກົງ
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="loadData"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        ຣີໂຫລດ
      </button>
    </div>

    <div v-if="success" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
      {{ success }}
    </div>

    <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      {{ error }}
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Active bundles</p>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{{ activeBundleCount }}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Bonus tokens ໃນລະບົບ</p>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{{ formatCurrency(totalGrantedTokens) }}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Top-up tokens</p>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{{ formatCurrency(totalTopupTokens) }}</p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center gap-2">
          <BadgePlus class="h-5 w-5 text-indigo-500" />
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">ຈັດການ Token Bundle</h2>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">ຊື່ bundle</span>
            <input v-model="bundleForm.name" type="text" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" placeholder="25,000 Tokens" />
          </label>

          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Token</span>
            <input v-model.number="bundleForm.tokenAmount" type="number" min="1" step="1000" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          </label>

          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">ລາຄາ (Kip)</span>
            <input v-model.number="bundleForm.price" type="number" min="1" step="1000" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          </label>

          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">ລຳດັບ</span>
            <input v-model.number="bundleForm.sortOrder" type="number" min="0" step="1" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          </label>

          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">ສະຖານະ</span>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              @click="bundleForm.isActive = !bundleForm.isActive"
            >
              <span>{{ bundleForm.isActive ? 'Active' : 'Inactive' }}</span>
              <ToggleRight v-if="bundleForm.isActive" class="h-5 w-5 text-emerald-500" />
              <ToggleLeft v-else class="h-5 w-5 text-slate-400" />
            </button>
          </label>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingBundle"
            @click="saveBundle"
          >
            <Loader2 v-if="savingBundle" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            {{ bundleForm.id ? 'ບັນທຶກການແກ້ໄຂ' : 'ສ້າງ bundle' }}
          </button>
          <button
            v-if="bundleForm.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="resetBundleForm"
          >
            ຍົກເລີກແກ້ໄຂ
          </button>
        </div>

        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400">Bundles ທີ່ມີຢູ່</h3>
            <p class="text-xs text-slate-500">{{ bundles.length }} ລາຍການ</p>
          </div>

          <div v-if="loading" class="space-y-3">
            <div v-for="n in 3" :key="n" class="h-20 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50" />
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="bundle in bundles"
              :key="bundle.id"
              class="rounded-2xl border border-slate-200 p-4 transition dark:border-slate-800"
              :class="bundle.isActive ? 'bg-slate-50 dark:bg-slate-950/50' : 'bg-white dark:bg-slate-900/60 opacity-85'"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-base font-bold text-slate-900 dark:text-slate-100">{{ bundle.name }}</p>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      :class="bundle.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'"
                    >
                      {{ bundle.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    +{{ formatCurrency(bundle.tokenAmount) }} tokens • {{ formatCurrency(bundle.price) }} Kip
                  </p>
                </div>

                <div class="flex gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    @click="editBundle(bundle)"
                  >
                    <Edit3 class="h-3.5 w-3.5" />
                    ແກ້ໄຂ
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition"
                    :class="bundle.isActive ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'"
                    @click="toggleBundle(bundle)"
                  >
                    <ToggleLeft v-if="bundle.isActive" class="h-3.5 w-3.5" />
                    <ToggleRight v-else class="h-3.5 w-3.5" />
                    {{ bundle.isActive ? 'Deactivate' : 'Activate' }}
                  </button>
                </div>
              </div>
            </article>

            <div v-if="bundles.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              ຍັງບໍ່ມີ token bundle ໃນລະບົບ
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center gap-2">
          <ShieldPlus class="h-5 w-5 text-indigo-500" />
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">ເພີ່ມ Bonus Token ໃຫ້ User</h2>
        </div>

        <div class="space-y-4">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">ເລືອກ user</span>
            <select
              v-model="selectedUserId"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
                {{ tenant.name }} ({{ tenant.email }})
              </option>
            </select>
          </label>

          <div v-if="getSelectedTenant()" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/50">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">ຂໍ້ມູນ user</p>
            <p class="mt-2 font-bold text-slate-900 dark:text-slate-100">{{ getSelectedTenant()?.name }}</p>
            <p class="mt-1 text-slate-500 dark:text-slate-400">{{ getSelectedTenant()?.email }}</p>
            <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
              bonus token ປັດຈຸບັນ: <strong>{{ formatCurrency(getSelectedTenant()?.bonusTokens || 0) }}</strong>
            </p>
          </div>

          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Token ທີ່ຈະເພີ່ມ</span>
            <input
              v-model.number="userTokenAmount"
              type="number"
              min="1"
              step="1000"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              placeholder="50000"
            />
          </label>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="grantingTokens"
            @click="grantBonusTokens"
          >
            <Loader2 v-if="grantingTokens" class="h-4 w-4 animate-spin" />
            <Coins v-else class="h-4 w-4" />
            {{ grantingTokens ? 'ກຳລັງເພີ່ມ...' : 'ເພີ່ມ Bonus Token' }}
          </button>

          <div class="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            Token ທີ່ເພີ່ມໃນນີ້ຈະໄປຢູ່ກັບ bonus balance ຂອງ user ແລະຖືກຫັກໃຊ້ເມື່ອ token package ໝົດ.
          </div>

          <div class="mt-6">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400">ລາຍການ user</h3>
              <p class="text-xs text-slate-500">{{ tenants.length }} ຄົນ</p>
            </div>

            <div class="space-y-2">
              <div
                v-for="tenant in tenants"
                :key="tenant.id"
                class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div class="min-w-0">
                  <p class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ tenant.name }}</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ tenant.email }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-400">bonus</p>
                  <p class="font-bold text-slate-900 dark:text-slate-100">{{ formatCurrency(tenant.bonusTokens || 0) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <History class="h-5 w-5 text-indigo-500" />
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">ປະຫວັດການຊື້ Token</h2>
        </div>

        <label class="relative w-full max-w-md">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            placeholder="ຄົ້ນຫາຕາມ user, ID ໃບບິນ, token..."
          />
        </label>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
              <tr>
                <th class="px-5 py-4">Token bundle</th>
                <th class="px-5 py-4">User</th>
                <th class="px-5 py-4">ລາຄາ</th>
                <th class="px-5 py-4">ວັນທີ</th>
                <th class="px-5 py-4">ສະຖານະ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr v-for="pay in filteredHistory" :key="pay.id" class="hover:bg-slate-50/70 dark:hover:bg-slate-950/40">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                      <Zap class="h-5 w-5" />
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900 dark:text-slate-100">+{{ formatCurrency(pay.tokenAmount) }} tokens</p>
                      <p class="text-xs text-slate-400">ID: {{ pay.id }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-900 dark:text-slate-100">{{ pay.userName }}</p>
                  <p class="text-xs text-slate-400">{{ pay.userId }}</p>
                </td>
                <td class="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                  {{ formatCurrency(pay.amount) }} Kip
                </td>
                <td class="px-5 py-4 text-slate-500 dark:text-slate-400">
                  {{ formatDate(pay.paymentDate || pay.createdAt) }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="pay.status === 'paid'
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : pay.status === 'pending'
                        ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                        : 'border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300'"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="pay.status === 'paid'
                        ? 'bg-emerald-500'
                        : pay.status === 'pending'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'"
                    />
                    {{ pay.status }}
                  </span>
                </td>
              </tr>

              <tr v-if="!loading && filteredHistory.length === 0">
                <td colspan="5" class="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                  ບໍ່ມີປະຫວັດ token top-up
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
