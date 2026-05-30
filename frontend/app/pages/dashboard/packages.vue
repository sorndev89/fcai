<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Package, CheckCircle2, Zap, Users, MessageSquare, TrendingUp, ArrowUpCircle,
  CreditCard, Shield, HelpCircle, Loader2, Star,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { useMockStore } from '~/stores/mockData';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const authStore = useAuthStore();
const mockStore = useMockStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// ─── State ──────────────────────────────────────────────
const allPackages = ref<any[]>([]);
const usageData = ref<any>(null);
const currentPackage = ref<any>(null);
const userProfile = ref<any>(null);
const pagesCount = ref(0);
const loading = ref(true);
const upgrading = ref(false);
const errorMsg = ref('');

// ─── Computed ───────────────────────────────────────────
const currentPkgId = computed(() => {
  return userProfile.value?.packageId || authStore.user?.packageId || 'pkg-starter';
});

const usagePercent = computed(() => {
  if (!currentPackage.value || !usageData.value) return 0;
  const maxTokens = currentPackage.value.maxTokens || 1;
  const used = usageData.value.totalTokens || 0;
  return Math.min(100, Math.round((used / maxTokens) * 100));
});

const pagesPercent = computed(() => {
  if (!currentPackage.value) return 0;
  const max = currentPackage.value.maxPages || 1;
  return Math.min(100, Math.round((pagesCount.value / max) * 100));
});

const canUpgrade = computed(() => {
  return userProfile.value?.status === 'approved';
});

// ─── Fetch Data ─────────────────────────────────────────
async function fetchAll() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const [pkgRes, usageRes, meRes, pagesRes] = await Promise.all([
      $fetch<any[]>(`${apiUrl}/auth/packages`, { headers: headers.value }).catch(() => []),
      $fetch<any>(`${apiUrl}/usage/my`, { headers: headers.value }).catch(() => null),
      $fetch<any>(`${apiUrl}/auth/me`, { headers: headers.value }).catch(() => null),
      $fetch<any[]>(`${apiUrl}/pages`, { headers: headers.value }).catch(() => []),
    ]);

    allPackages.value = pkgRes.length > 0 ? pkgRes : mockStore.getPackages();
    usageData.value = usageRes;
    userProfile.value = meRes;
    pagesCount.value = Array.isArray(pagesRes) ? pagesRes.length : mockStore.getPages().length;

    // Find the current package
    const pkgId = meRes?.packageId || authStore.user?.packageId || 'pkg-starter';
    currentPackage.value = allPackages.value.find((p: any) => p.id === pkgId) || allPackages.value[0];
  } catch (e: any) {
    errorMsg.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້';
    // Fallback to mock data
    allPackages.value = mockStore.getPackages();
    currentPackage.value = allPackages.value[0];
  } finally {
    loading.value = false;
  }
}

// ─── Upgrade Action ─────────────────────────────────────
async function handleUpgrade(packageId: string) {
  if (packageId === currentPkgId.value) {
    dialog.open({
      type: 'info',
      title: 'ແພັກເກດປັດຈຸບັນ',
      message: 'ທ່ານກຳລັງໃຊ້ແພັກເກດນີ້ຢູ່ແລ້ວ',
    });
    return;
  }

  const targetPkg = allPackages.value.find((p: any) => p.id === packageId);
  if (!targetPkg) return;

  const confirmed = await dialog.open({
    type: 'warning',
    title: 'ຢືນຢັນການປ່ຽນແພັກເກດ',
    message: `ທ່ານຕ້ອງການປ່ຽນເປັນແພັກເກດ "${targetPkg.name}" ບໍ?`,
    actions: [
      { label: 'ຍົກເລີກ', variant: 'secondary' as const, value: false },
      { label: 'ຢືນຢັນ', variant: 'primary' as const, value: true },
    ],
  });

  if (!confirmed) return;

  upgrading.value = true;
  try {
    await $fetch(`${apiUrl}/auth/upgrade`, {
      method: 'PUT',
      headers: headers.value,
      body: { packageId },
    });
    dialog.open({
      type: 'success',
      title: 'ສຳເລັດ',
      message: `ປ່ຽນເປັນແພັກເກດ "${targetPkg.name}" ຮຽບຮ້ອຍແລ້ວ`,
    });
    // Refresh data
    await fetchAll();
  } catch (e: any) {
    dialog.open({
      type: 'error',
      title: 'ເກີດຂໍ້ຜິດພາດ',
      message: e?.data?.error || 'ບໍ່ສາມາດປ່ຽນແພັກເກດໄດ້, ກະລຸນາລອງໃໝ່ພາຍຫຼັງ',
    });
  } finally {
    upgrading.value = false;
  }
}

onMounted(() => {
  fetchAll();
});
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">ແພັກເກດ & ການນຳໃຊ້</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        ຈັດການແພັກເກດຂອງທ່ານ ແລະ ເບິ່ງສະຖານະການນຳໃຊ້
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-sky-500" />
    </div>

    <template v-if="!loading">
      <!-- Error -->
      <div
        v-if="errorMsg"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
      >
        {{ errorMsg }}
      </div>

      <!-- Current Plan Usage Card -->
      <div
        v-if="currentPackage"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium uppercase tracking-wider text-sky-100">ແພັກເກດປັດຈຸບັນ</p>
              <h2 class="mt-1 text-xl font-bold text-white">{{ currentPackage.name }}</h2>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Star class="h-6 w-6 text-yellow-300" />
            </div>
          </div>
        </div>

        <div class="grid gap-6 p-6 sm:grid-cols-2">
          <!-- Token Usage -->
          <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Zap class="h-4 w-4 text-amber-500" />
              ການໃຊ້ Token
            </div>
            <div class="mb-1 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ usageData?.totalTokens?.toLocaleString() || 0 }}</span>
              <span class="text-sm text-slate-500">/ {{ currentPackage.maxTokens?.toLocaleString() || '0' }}</span>
            </div>
            <div class="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                :class="usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-sky-500'"
                :style="{ width: usagePercent + '%' }"
              />
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ usagePercent }}% ຂອງຈຳນວນທີ່ມີ</p>
          </div>

          <!-- Pages Usage -->
          <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <MessageSquare class="h-4 w-4 text-violet-500" />
              ຈຳນວນເພຈ
            </div>
            <div class="mb-1 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ pagesCount }}</span>
              <span class="text-sm text-slate-500">/ {{ currentPackage.maxPages }}</span>
            </div>
            <div class="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                :class="pagesPercent > 80 ? 'bg-red-500' : pagesPercent > 50 ? 'bg-amber-500' : 'bg-violet-500'"
                :style="{ width: pagesPercent + '%' }"
              />
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ pagesPercent }}% ຂອງຈຳນວນທີ່ມີ</p>
          </div>
        </div>
      </div>

      <!-- Package Marketplace -->
      <div>
        <div class="mb-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">ເລືອກແພັກເກດ</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            ປຽບທຽບແພັກເກດ ແລະ ເລືອກແຜນທີ່ເໝາະສົມກັບທຸລະກິດຂອງທ່ານ
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="pkg in allPackages"
            :key="pkg.id"
            class="relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-200"
            :class="[
              pkg.id === currentPkgId
                ? 'border-sky-500 bg-sky-50 shadow-md dark:border-sky-400 dark:bg-sky-950/30'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600',
            ]"
          >
            <!-- Current badge -->
            <div
              v-if="pkg.id === currentPkgId"
              class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white shadow-sm"
            >
              ກຳລັງໃຊ້
            </div>

            <!-- Package Icon -->
            <div class="mb-4 flex items-center justify-center">
              <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl"
                :class="pkg.id === 'pkg-enterprise' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : pkg.id === 'pkg-standard' ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
              >
                <Package class="h-7 w-7" />
              </div>
            </div>

            <!-- Package Name & Price -->
            <h3 class="text-center text-lg font-bold text-slate-900 dark:text-slate-100">{{ pkg.name }}</h3>
            <div class="mt-2 text-center">
              <span class="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {{ pkg.price === '0.00' ? 'ຟຣີ' : new Intl.NumberFormat('lo-LA').format(Number(pkg.price)) }}
              </span>
              <span v-if="pkg.price !== '0.00'" class="text-sm text-slate-500"> ກີບ/ເດືອນ</span>
            </div>

            <!-- Features -->
            <ul class="mt-6 flex-1 space-y-3">
              <li class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>ເຊື່ອມຕໍ່ໄດ້ສູງສຸດ <strong>{{ pkg.maxPages }}</strong> ເພຈ</span>
              </li>
              <li class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>Token ສູງສຸດ <strong>{{ pkg.maxTokens?.toLocaleString() }}</strong> ເທື່ອ/ເດືອນ</span>
              </li>
              <li class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>AI Chatbot ຕອບກັບລູກຄ້າອັດຕະໂນມັດ</span>
              </li>
              <li class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>ບັນທຶກປະຫວັດການສົນທະນາ</span>
              </li>
              <li class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>ລາຍງານການນຳໃຊ້</span>
              </li>
            </ul>

            <!-- Action Button -->
            <button
              class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              :class="pkg.id === currentPkgId
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500'"
              :disabled="pkg.id === currentPkgId || upgrading || !canUpgrade"
              @click="handleUpgrade(pkg.id)"
            >
              <Loader2 v-if="upgrading" class="h-4 w-4 animate-spin" />
              <ArrowUpCircle v-else class="h-4 w-4" />
              {{ pkg.id === currentPkgId ? 'ກຳລັງໃຊ້ຢູ່' : 'ເລືອກແພັກເກດນີ້' }}
            </button>
          </div>
        </div>

        <!-- Warning for pending/suspended users -->
        <div
          v-if="!canUpgrade"
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
        >
          <p class="flex items-center gap-2 font-semibold">
            <HelpCircle class="h-4 w-4" />
            ບັນຊີຂອງທ່ານຍັງບໍ່ທັນໄດ້ຮັບການອະນຸມັດ
          </p>
          <p class="mt-1">ກະລຸນາລໍຖ້າຜູ້ດູແລລະບົບອະນຸມັດບັນຊີກ່ອນ, ຈຶ່ງຈະສາມາດປ່ຽນແພັກເກດໄດ້.</p>
        </div>
      </div>
    </template>
  </div>
</template>
