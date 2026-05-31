<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  Receipt, Calendar, Info, Clock, CheckCircle2, XCircle, FileImage, 
  ExternalLink, RefreshCw, Eye, X, HelpCircle, CreditCard, TrendingUp,
  ChevronLeft, ChevronRight, Image as ImageIcon
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import AppPagination from '~/components/AppPagination.vue';

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
const history = ref<any[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const errorMsg = ref('');

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Modal Slip Viewer State
const showModal = ref(false);
const selectedSlipUrl = ref('');
const selectedItem = ref<any>(null);

// ─── Fetch Data ─────────────────────────────────────────
async function fetchHistory() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await $fetch<any[]>(`${apiUrl}/api/payments/my-history`, { headers: headers.value });
    history.value = Array.isArray(res) ? res : [];
  } catch (err: any) {
    console.error('Fetch payment history error:', err);
    errorMsg.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນປະຫວັດການຊື້ໄດ້';
  } finally {
    loading.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  try {
    const res = await $fetch<any[]>(`${apiUrl}/api/payments/my-history`, { headers: headers.value });
    history.value = Array.isArray(res) ? res : [];
  } catch (err: any) {
    errorMsg.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນປະຫວັດການຊື້ໄດ້';
  } finally {
    refreshing.value = false;
  }
}

// ─── Computed Statistics ────────────────────────────────
const totalSpent = computed(() => {
  return history.value
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
});

const approvedCount = computed(() => {
  return history.value.filter((item) => item.status === 'paid').length;
});

const pendingCount = computed(() => {
  return history.value.filter((item) => item.status === 'pending').length;
});

// ─── Pagination Computed ────────────────────────────────
const totalPages = computed(() => {
  return Math.ceil(history.value.length / itemsPerPage.value) || 1;
});

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return history.value.slice(start, end);
});

const startIndex = computed(() => {
  if (history.value.length === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const endIndex = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, history.value.length);
});

// Reset page when list updates
watch(history, () => {
  currentPage.value = 1;
});

// ─── Formatting Helpers ─────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat('la-LA').format(value) + ' Kip';
}

function formatDate(dateString: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('lo-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openSlipModal(slipUrl: string, item: any) {
  selectedSlipUrl.value = slipUrl.startsWith('http') ? slipUrl : `${apiUrl}${slipUrl}`;
  selectedItem.value = item;
  showModal.value = true;
}

// Alias for backwards compatibility with table actions if any
function openSlipModalCompat(slipUrl: string, name: string) {
  selectedSlipUrl.value = slipUrl.startsWith('http') ? slipUrl : `${apiUrl}${slipUrl}`;
  selectedItem.value = history.value.find(i => i.slipUrl === slipUrl) || { packageName: name, amount: 0, createdAt: new Date() };
  showModal.value = true;
}

function closeSlipModal() {
  showModal.value = false;
  selectedSlipUrl.value = '';
}

onMounted(() => {
  fetchHistory();
});
</script>

<template>
  <div class="space-y-8 w-full">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Receipt class="h-7 w-7 text-sky-500 animate-pulse-slow" />
          ປະຫວັດການຊື້ & ສະຖານະໃບບິນ
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ເບິ່ງປະຫວັດການສັ່ງຊື້ແພັກເກດ ແລະ ເຕີມ Token ຂອງທ່ານ ພ້ອມສະຖານະການກວດສອບໃບບິນ
        </p>
      </div>
      <div>
        <button
          @click="handleRefresh"
          :disabled="loading || refreshing"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing }" />
          ໂຫຼດຂໍ້ມູນຄືນໃໝ່
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMsg"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
    >
      {{ errorMsg }}
    </div>

    <!-- Summary Statistics Cards -->
    <div class="grid gap-5 grid-cols-1 sm:grid-cols-3">
      <!-- Total Spent Card -->
      <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ຍອດລາຍຈ່າຍທັງໝົດ</span>
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CreditCard class="h-5 w-5" />
          </span>
        </div>
        <div class="mt-4">
          <span v-if="loading" class="block h-7 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <span v-else class="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {{ formatCurrency(totalSpent) }}
          </span>
        </div>
        <div class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          ສະເພາະລາຍການທີ່ແອດມິນອະນຸມັດແລ້ວ
        </div>
        <!-- Decorative subtle background shape -->
        <div class="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-emerald-500/5 blur-lg" />
      </div>

      <!-- Approved Orders Card -->
      <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ລາຍການທີ່ອະນຸມັດ</span>
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-950/30 dark:text-sky-400">
            <CheckCircle2 class="h-5 w-5" />
          </span>
        </div>
        <div class="mt-4">
          <span v-if="loading" class="block h-7 w-1/3 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <span v-else class="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {{ approvedCount }} <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">ລາຍການ</span>
          </span>
        </div>
        <div class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          ເປີດໃຊ້ງານແລ້ວ
        </div>
        <div class="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-500/5 blur-lg" />
      </div>

      <!-- Pending Orders Card -->
      <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ລາຍການລໍຖ້າກວດສອບ</span>
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400">
            <Clock class="h-5 w-5" />
          </span>
        </div>
        <div class="mt-4">
          <span v-if="loading" class="block h-7 w-1/3 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <span v-else class="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {{ pendingCount }} <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">ລາຍການ</span>
            <span v-if="pendingCount > 0" class="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          </span>
        </div>
        <div class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          ກຳລັງລໍຖ້າແອດມິນກວດສອບໃບບິນ
        </div>
        <div class="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-amber-500/5 blur-lg" />
      </div>
    </div>

    <!-- Loading Skeleton Table -->
    <div v-if="loading && !refreshing" class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="space-y-3">
          <AppSkeletonBlock class="h-4 w-1/4" />
          <AppSkeletonBlock class="h-10 w-full" />
          <AppSkeletonBlock class="h-10 w-full" />
          <AppSkeletonBlock class="h-10 w-full" />
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Empty State -->
      <div
        v-if="history.length === 0"
        class="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 mb-4">
          <Receipt class="h-8 w-8" />
        </div>
        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">ບໍ່ມີປະຫວັດການສັ່ງຊື້</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          ທ່ານຍັງບໍ່ເຄີຍສົ່ງໃບບິນສັ່ງຊື້ແພັກເກດ ຫຼື ເຕີມ Token ເທື່ອ. ເມື່ອທ່ານຊຳລະເງິນ ປະຫວັດຈະສະແດງຢູ່ນີ້.
        </p>
        <div class="mt-6">
          <NuxtLink
            to="/dashboard/packages"
            class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300 shadow-lg shadow-sky-500/20"
          >
            ເລືອກຊື້ແພັກເກດ
          </NuxtLink>
        </div>
      </div>

      <!-- History List View -->
      <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <!-- Desktop Table View -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th class="px-5 py-3.5 font-semibold">ປະເພດການຊື້</th>
                <th class="px-5 py-3.5 font-semibold">ລາຍລະອຽດ</th>
                <th class="px-5 py-3.5 font-semibold">ຈຳນວນເງິນ</th>
                <th class="px-5 py-3.5 font-semibold">ວັນທີສັ່ງຊື້</th>
                <th class="px-5 py-3.5 font-semibold">ສະຖານະ</th>
                <th class="px-5 py-3.5 text-right font-semibold">ໃບບິນ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="item in paginatedHistory" :key="item.id" class="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50">
                <!-- Purchase Type with Avatar Icon badge -->
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold shadow-sm"
                         :class="item.paymentType === 'token_topup' ? 'from-amber-50 to-amber-100 text-amber-600 dark:from-amber-500/20 dark:to-amber-500/10 dark:text-amber-300' : 'from-sky-50 to-sky-100 text-sky-600 dark:from-sky-500/20 dark:to-sky-500/10 dark:text-sky-300'">
                      <span v-if="item.paymentType === 'token_topup'">⚡</span>
                      <span v-else>📦</span>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {{ item.paymentType === 'token_topup' ? 'ເຕີມ Token' : 'ແພັກເກດ' }}
                      </p>
                      <p class="truncate text-xs text-slate-400 dark:text-slate-500">
                        {{ item.paymentType === 'token_topup' ? 'Top-up Balance' : 'Subscription Plan' }}
                      </p>
                    </div>
                  </div>
                </td>
                
                <!-- Details -->
                <td class="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                  {{ item.paymentType === 'token_topup' ? item.tokenAmount?.toLocaleString() + ' Tokens' : item.packageName }}
                </td>
                
                <!-- Amount -->
                <td class="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">
                  {{ formatCurrency(item.amount) }}
                </td>
                
                <!-- Date -->
                <td class="px-5 py-4 text-slate-500 dark:text-slate-400">
                  {{ formatDate(item.createdAt) }}
                </td>
                
                <!-- Status -->
                <td class="px-5 py-4">
                  <!-- Pending -->
                  <span
                    v-if="item.status === 'pending'"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 animate-pulse-subtle"
                  >
                    <Clock class="h-3.5 w-3.5" /> ລໍຖ້າກວດສອບ
                  </span>
                  
                  <!-- Approved/Paid -->
                  <span
                    v-else-if="item.status === 'paid'"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    <CheckCircle2 class="h-3.5 w-3.5" /> ອະນຸມັດແລ້ວ
                  </span>
                  
                  <!-- Rejected -->
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    <XCircle class="h-3.5 w-3.5" /> ປະຕິເສດແລ້ວ
                  </span>
                </td>
                
                <!-- Action -->
                <td class="px-5 py-4 text-right">
                  <button
                    v-if="item.slipUrl"
                    @click="openSlipModal(item.slipUrl, item)"
                    class="text-sky-600 hover:text-sky-500 dark:text-sky-400 inline-flex items-center gap-1 text-xs font-bold"
                    type="button"
                  >
                    <ImageIcon class="h-4 w-4" />
                    ເບິ່ງສະລິບ
                  </button>
                  <span v-else class="text-xs text-slate-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List View -->
        <div class="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div
            v-for="item in paginatedHistory"
            :key="item.id"
            class="p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20"
          >
            <!-- Top bar: Type & Status -->
            <div class="flex items-center justify-between">
              <span v-if="item.paymentType === 'token_topup'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                ⚡ ເຕີມ Token
              </span>
              <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30">
                📦 ແພັກເກດ
              </span>
              
              <!-- Status Badge -->
              <span
                v-if="item.status === 'pending'"
                class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full animate-pulse-subtle"
              >
                <Clock class="h-3 w-3" /> ລໍຖ້າກວດສອບ
              </span>
              <span
                v-else-if="item.status === 'paid'"
                class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full"
              >
                <CheckCircle2 class="h-3 w-3" /> ອະນຸມັດແລ້ວ
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full"
              >
                <XCircle class="h-3 w-3" /> ປະຕິເສດແລ້ວ
              </span>
            </div>

            <!-- Details -->
            <div class="space-y-1">
              <p class="text-[11px] text-slate-400 dark:text-slate-500">ລາຍລະອຽດ</p>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                {{ item.paymentType === 'token_topup' ? item.tokenAmount?.toLocaleString() + ' Tokens' : item.packageName }}
              </p>
            </div>

            <!-- Amount & Date Grid -->
            <div class="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div class="space-y-1">
                <p class="text-[11px] text-slate-400 dark:text-slate-500">ຈຳນວນເງິນ</p>
                <p class="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {{ formatCurrency(item.amount) }}
                </p>
              </div>
              <div class="space-y-1">
                <p class="text-[11px] text-slate-400 dark:text-slate-500">ວັນທີສັ່ງຊື້</p>
                <p class="text-xs font-medium text-slate-650 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Calendar class="h-3 w-3" />
                  {{ formatDate(item.createdAt) }}
                </p>
              </div>
            </div>

            <!-- Action -->
            <div v-if="item.slipUrl" class="pt-1">
              <button
                @click="openSlipModal(item.slipUrl, item)"
                class="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-sky-600 bg-sky-50 rounded-xl hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:hover:bg-sky-950/70 transition-all"
                type="button"
              >
                <ImageIcon class="h-4 w-4" />
                ເບິ່ງສະລິບ
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <AppPagination
          v-model="currentPage"
          :total-items="history.length"
          :page-size="itemsPerPage"
          hide-on-single-page
        />
      </div>
    </template>

    <!-- Slip Viewer Modal (Slides from the top as per User Rules) -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="modal modal-top fade show fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm transition-all duration-300"
        @click.self="closeSlipModal"
      >
        <div 
          class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 transform translate-y-0 mt-8 mb-8 animate-modal-slide flex flex-col"
        >
          <!-- Modal Header -->
          <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
            <div>
              <h3 class="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase">ກວດສອບສະລິບໂອນເງິນ</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {{ selectedItem?.paymentType === 'token_topup' ? 'ເຕີມ Token' : selectedItem?.packageName }}
              </p>
            </div>
            <button
              @click="closeSlipModal"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-lg"
            >
              &times;
            </button>
          </div>
          
          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto flex flex-col items-center gap-4 flex-1">
            <!-- Slip Image -->
            <div class="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 flex justify-center max-h-72 dark:border-slate-800 dark:bg-slate-900">
              <img
                :src="selectedSlipUrl"
                alt="Payment Slip"
                class="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            
            <!-- Metadata card similar to admin/billing -->
            <div v-if="selectedItem" class="w-full space-y-2 text-xs bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="flex justify-between">
                <span class="text-slate-500">ປະເພດການຊື້:</span>
                <strong class="text-slate-900 dark:text-white">
                  {{ selectedItem.paymentType === 'token_topup' ? '⚡ ເຕີມ Token' : '📦 ແພັກເກດ' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ລາຍລະອຽດ:</span>
                <strong class="text-sky-600 dark:text-sky-400 font-bold">
                  {{ selectedItem.paymentType === 'token_topup' ? `${selectedItem.tokenAmount?.toLocaleString()} Tokens` : selectedItem.packageName }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ຍອດເງິນໂອນ:</span>
                <strong class="text-slate-900 dark:text-white font-extrabold text-sm">{{ Number(selectedItem.amount).toLocaleString() }} Kip</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ວັນທີສັ່ງຊື້:</span>
                <strong class="text-slate-800 dark:text-slate-350 font-medium">{{ formatDate(selectedItem.createdAt) }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ສະຖານະບິນ:</span>
                <span
                  class="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full"
                  :class="selectedItem.status === 'paid' ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20' : selectedItem.status === 'pending' ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20' : 'text-rose-600 bg-rose-500/10 border border-rose-500/20'"
                >
                  {{ selectedItem.status === 'paid' ? 'ຊຳລະແລ້ວ' : selectedItem.status === 'pending' ? 'ລໍຖ້າກວດສອບ' : 'ປະຕິເສດແລ້ວ' }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Modal Footer -->
          <div class="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end bg-slate-50 dark:bg-slate-950/20">
            <button
              @click="closeSlipModal"
              class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              ປິດໜ້າຕ່າງ
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-pulse-subtle {
  animation: pulse-subtle 2s infinite ease-in-out;
}
@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(0.98);
  }
}
.animate-pulse-slow {
  animation: pulse-slow 3s infinite ease-in-out;
}
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    transform: translateY(0);
  }
  50% {
    opacity: 0.85;
    transform: translateY(-2px);
  }
}
.animate-modal-slide {
  animation: modal-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modal-slide {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
