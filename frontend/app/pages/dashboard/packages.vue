<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Package, CheckCircle2, Zap, Users, MessageSquare, TrendingUp, ArrowUpCircle,
  CreditCard, Shield, HelpCircle, Loader2, Star,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// ─── State ──────────────────────────────────────────────
const allPackages = ref<any[]>([]);
const tokenTopupBundles = ref<any[]>([]);
const usageData = ref<any>(null);
const currentPackage = ref<any>(null);
const userProfile = ref<any>(null);
const pagesCount = ref(0);
const loading = ref(true);
const upgrading = ref(false);
const errorMsg = ref('');
const paymentStatus = ref<any>({ hasPending: false, latest: null });

// ─── Computed ───────────────────────────────────────────
const currentPkgId = computed(() => {
  return userProfile.value?.packageId || authStore.user?.packageId || 'pkg-starter';
});

const bonusTokens = computed(() => Number(usageData.value?.bonusTokens ?? authStore.user?.bonusTokens ?? 0));

const effectiveMaxTokens = computed(() => {
  if (!currentPackage.value) return 0;
  return Number(currentPackage.value.maxTokens || 0) + bonusTokens.value;
});

const usagePercent = computed(() => {
  if (!currentPackage.value || !usageData.value) return 0;
  const maxTokens = effectiveMaxTokens.value || 1;
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
    const [pkgRes, usageRes, meRes, pagesRes, statusRes, bundlesRes] = await Promise.all([
      $fetch<any[]>(`${apiUrl}/api/auth/packages`, { headers: headers.value }),
      $fetch<any>(`${apiUrl}/api/usage/my`, { headers: headers.value }),
      $fetch<any>(`${apiUrl}/api/auth/me`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/pages`, { headers: headers.value }),
      $fetch<any>(`${apiUrl}/api/payments/my-status`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/payments/token-bundles`, { headers: headers.value }),
    ]);

    allPackages.value = Array.isArray(pkgRes) ? pkgRes : [];
    usageData.value = usageRes;
    userProfile.value = meRes;
    pagesCount.value = Array.isArray(pagesRes) ? pagesRes.length : 0;
    paymentStatus.value = statusRes || { hasPending: false, latest: null };
    tokenTopupBundles.value = Array.isArray(bundlesRes) ? bundlesRes : [];

    // Find the current package
    const pkgId = meRes?.packageId || authStore.user?.packageId || 'pkg-starter';
    currentPackage.value = allPackages.value.find((p: any) => p.id === pkgId) || allPackages.value[0];
  } catch (e: any) {
    errorMsg.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້';
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

  // Redirect to checkout page
  navigateTo(`/dashboard/checkout?packageId=${packageId}`);
}

function handleTopup(bundleId: string) {
  const bundle = tokenTopupBundles.value.find((item) => item.id === bundleId);
  if (!bundle) return;
  navigateTo(`/dashboard/checkout?mode=token-topup&bundleId=${bundle.id}`);
}

onMounted(() => {
  fetchAll();
});
</script>

<template>
  <div class="space-y-8 w-full">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">ແພັກເກດ & ການນຳໃຊ້</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        ຈັດການແພັກເກດຂອງທ່ານ ແລະ ເບິ່ງສະຖານະການນຳໃຊ້
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="space-y-3">
        <AppSkeletonBlock class="h-4 w-32" />
        <AppSkeletonBlock class="h-8 w-80 max-w-full" />
        <AppSkeletonBlock class="h-4 w-[28rem] max-w-full" />
      </div>

      <div class="grid gap-6 lg:grid-cols-5">
        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div class="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5">
            <div class="flex items-center justify-between">
              <div class="space-y-2">
                <AppSkeletonBlock class="h-3 w-28 bg-white/30 dark:bg-white/20" />
                <AppSkeletonBlock class="h-6 w-48 bg-white/30 dark:bg-white/20" />
              </div>
              <AppSkeletonBlock class="h-12 w-12 rounded-xl bg-white/20" />
            </div>
          </div>
          <div class="grid gap-6 p-6 sm:grid-cols-2">
            <div v-for="n in 2" :key="n" class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 space-y-3">
              <AppSkeletonBlock class="h-4 w-28" />
              <AppSkeletonBlock class="h-8 w-32" />
              <AppSkeletonBlock class="h-2 w-full rounded-full" />
              <AppSkeletonBlock class="h-3 w-20" />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div class="space-y-2">
            <AppSkeletonBlock class="h-4 w-32" />
            <AppSkeletonBlock class="h-3 w-24" />
          </div>
          <div class="mt-6 space-y-4">
            <div v-for="n in 5" :key="n" class="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <AppSkeletonBlock class="h-12 w-12 rounded-2xl" />
              <div class="flex-1 space-y-2">
                <AppSkeletonBlock class="h-4 w-40 max-w-full" />
                <AppSkeletonBlock class="h-3 w-28 max-w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-if="!loading">
      <!-- Error -->
      <div
        v-if="errorMsg"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
      >
        {{ errorMsg }}
      </div>

      <!-- Pending Payment Warning -->
      <div
        v-if="paymentStatus.hasPending"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-3"
      >
        <span class="material-icons select-none text-amber-500 text-xl mt-0.5">hourglass_empty</span>
        <div>
          <p class="font-bold">ກຳລັງລໍຖ້າການຢືນຢັນຊຳລະເງິນ</p>
          <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
            ທ່ານໄດ້ສົ່ງຫຼັກຖານການໂອນເງິນສຳລັບແພັກເກດ <strong>{{ paymentStatus.latest?.packageName }}</strong> ({{ paymentStatus.latest?.amount?.toLocaleString() }} Kip) ແລ້ວ. ລະບົບກຳລັງລໍຖ້າຜູ້ດູແລລະບົບກວດສອບ ແລະ ຢືນຢັນເພື່ອເປີດໃຊ້ງານ.
          </p>
        </div>
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
              <span class="text-sm text-slate-500">/ {{ effectiveMaxTokens.toLocaleString() || '0' }}</span>
            </div>
            <div class="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                :class="usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-sky-500'"
                :style="{ width: usagePercent + '%' }"
              />
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ usagePercent }}% ຂອງຈຳນວນທີ່ມີ • bonus {{ bonusTokens.toLocaleString() }} tokens</p>
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
              :disabled="pkg.id === currentPkgId || upgrading || !canUpgrade || paymentStatus.hasPending"
              @click="handleUpgrade(pkg.id)"
            >
              <Loader2 v-if="upgrading" class="h-4 w-4 animate-spin" />
              <ArrowUpCircle v-else class="h-4 w-4" />
              {{ pkg.id === currentPkgId ? 'ກຳລັງໃຊ້ຢູ່' : paymentStatus.hasPending ? 'ລໍຖ້າຢືນຢັນບິນ' : 'ເລືອກແພັກເກດນີ້' }}
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

      <!-- Token Top-up Bundles -->
      <div class="mt-8">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">ຊື້ token ເພີ່ມ</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              ເລືອກຊຸດ token ເພີ່ມເພື່ອໃຫ້ລະບົບໃຊ້ຕໍ່ໄດ້ທັນທີ ກ່ອນຮອບເດືອນຖັດໄປ
            </p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p class="text-[10px] uppercase tracking-wider text-slate-400">token bonus ຄົງເຫຼືອ</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400">{{ bonusTokens.toLocaleString() }}</p>
          </div>
        </div>

        <div v-if="tokenTopupBundles.length > 0" class="grid gap-4 sm:grid-cols-3">
          <button
            v-for="bundle in tokenTopupBundles"
            :key="bundle.id"
            type="button"
            class="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
            :disabled="!canUpgrade || paymentStatus.hasPending"
            @click="handleTopup(bundle.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{{ bundle.name }}</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">+{{ Number(bundle.tokenAmount).toLocaleString() }} tokens</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">ໃຊ້ງານຕໍ່ໄດ້ທັນທີ ຫຼັງຢືນຢັນບິນ</p>
              </div>
              <ArrowUpCircle class="h-5 w-5 text-indigo-500" />
            </div>
            <div class="mt-4 flex items-end justify-between">
              <div>
                <p class="text-[10px] uppercase tracking-wider text-slate-400">ລາຄາ</p>
                <p class="text-lg font-black text-slate-900 dark:text-slate-100">{{ new Intl.NumberFormat('lo-LA').format(Number(bundle.price)) }} Kip</p>
              </div>
              <span class="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">Top-up</span>
            </div>
          </button>
        </div>
        <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          ຍັງບໍ່ມີ token bundle ທີ່ active.
        </div>
      </div>
    </template>
  </div>
</template>
