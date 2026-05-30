<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'admin',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();

// Payment list state
const paymentsList = ref<any[]>([]);
const tenantsList = ref<any[]>([]);
const packagesList = ref<any[]>([]);
const loading = ref(false);

// Pagination state
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);
const totalPages = ref(0);

// Form inputs
const showRecordForm = ref(false);
const selectedUserId = ref('');
const paidAmount = ref(150000);
const error = ref('');

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

async function loadData() {
  loading.value = true;
  try {
    const [paymentsRes, tenants, pkgs] = await Promise.all([
      $fetch<any>(`${apiUrl}/api/admin/payments?page=${currentPage.value}&limit=${pageSize.value}`, {
        headers: headers.value,
      }),
      $fetch<any[]>(`${apiUrl}/api/admin/tenants`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/auth/packages`),
    ]);

    paymentsList.value = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
    totalItems.value = paymentsRes.total || 0;
    totalPages.value = paymentsRes.totalPages || 0;
    currentPage.value = paymentsRes.page || 1;
    tenantsList.value = Array.isArray(tenants) ? tenants : [];
    packagesList.value = Array.isArray(pkgs) ? pkgs : [];
  } catch (err) {
    console.error('[Admin Billing] Failed to load data', err);
    paymentsList.value = [];
    tenantsList.value = [];
    packagesList.value = [];
  } finally {
    loading.value = false;
  }

  if (tenantsList.value.length > 0 && !selectedUserId.value) {
    selectedUserId.value = tenantsList.value[0].id;
  }
}

onMounted(() => {
  loadData();
});

// Watch tenant selection to auto-fill matching package price
watch(selectedUserId, (newVal) => {
  const user = tenantsList.value.find(u => u.id === newVal);
  if (user) {
    const pkg = packagesList.value.find((p: any) => p.id === user.packageId);
    if (pkg) {
      const cleanPrice = parseFloat(String(pkg.price).replace(/,/g, ''));
      paidAmount.value = isNaN(cleanPrice) ? 0 : cleanPrice;
    }
  }
});

async function handleRecordPayment() {
  if (!selectedUserId.value || paidAmount.value <= 0) {
    error.value = 'ກະລຸນາເລືອກຜູ້ໃຊ້ ແລະ ປ້ອນຈຳນວນເງິນໃຫ້ຖືກຕ້ອງ';
    return;
  }

  error.value = '';

  try {
    await $fetch(`${apiUrl}/api/admin/payments`, {
      method: 'POST',
      headers: headers.value,
      body: {
        userId: selectedUserId.value,
        amount: paidAmount.value,
        packageId: '',
      },
    });

    // Clear & Close
    showRecordForm.value = false;
    await loadData();
  } catch (err: any) {
    error.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກການຊຳລະເງິນໄດ້';
  }
}

async function handleConfirmPayment(paymentId: string) {
  try {
    await $fetch(`${apiUrl}/api/admin/payments/${paymentId}/pay`, {
      method: 'PUT',
      headers: headers.value,
    });
    await loadData();
  } catch (err: any) {
    console.error('Confirm payment error:', err);
    error.value = err.data?.error || 'ບໍ່ສາມາດຢືນຢັນການຊຳລະເງິນໄດ້';
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'ລໍຖ້າການຢືນຢັນ';
  return new Date(dateStr).toLocaleDateString('lo-LA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadData();
}

// Generate pagination page numbers
const paginationRange = computed(() => {
  const range: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) range.push(i);
  } else {
    range.push(1);
    if (current > 3) range.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) range.push(i);
    if (current < total - 2) range.push('...');
    range.push(total);
  }
  return range;
});
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span class="material-icons select-none text-indigo-600 dark:text-indigo-400 text-3xl">receipt_long</span>
          ບັນທຶກການຊຳລະເງິນ (ບິນ ແລະ ໃບແຈ້ງໜີ້)
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ຕິດຕາມ ແລະ ບັນທຶກລາຍຮັບ, ຄ່າບໍລິການແພັກເກດລາຍເດືອນຂອງລູກຄ້າ.
        </p>
      </div>

      <button
        @click="showRecordForm = !showRecordForm"
        class="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
      >
        <span class="material-icons select-none text-base">{{ showRecordForm ? 'close' : 'add' }}</span>
        {{ showRecordForm ? 'ປິດຟອມ' : 'ບັນທຶກໃບບິນໃໝ່' }}
      </button>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="text-center py-12 text-slate-500">
      <span class="material-icons select-none text-5xl block mb-2 animate-spin text-indigo-500">refresh</span>
      ກຳລັງໂຫຼດຂໍ້ມູນ...
    </div>

    <!-- Record Payment Form -->
    <div
      v-if="showRecordForm"
      class="mb-8 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl transition-all"
    >
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">ບັນທຶກການຊຳລະເງິນຂອງລູກຄ້າ</h2>

      <div v-if="error" class="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- User Selection -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ເລືອກຮ້ານຄ້າ / ລູກຄ້າ</label>
          <select
            v-model="selectedUserId"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option v-for="tenant in tenantsList" :key="tenant.id" :value="tenant.id">
              {{ tenant.name }} ({{ tenant.email }})
            </option>
          </select>
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ຈຳນວນເງິນຊຳລະ (Kip)</label>
          <input
            v-model.number="paidAmount"
            type="number"
            min="0"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-4">
        <button
          @click="showRecordForm = false"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all"
        >
          ຍົກເລີກ
        </button>
        <button
          @click="handleRecordPayment"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          ຢືນຢັນການຊຳລະເງິນ
        </button>
      </div>
    </div>

    <!-- Payments Ledger (Desktop View) -->
    <div class="hidden md:block bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-200">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th class="py-4 px-6">ລະຫັດໃບບິນ</th>
              <th class="py-4 px-6">ຮ້ານຄ້າ / ລູກຄ້າ</th>
              <th class="py-4 px-6">ແພັກເກດທີ່ຊື້</th>
              <th class="py-4 px-6">ຍອດຊຳລະ</th>
              <th class="py-4 px-6">ສະຖານະ</th>
              <th class="py-4 px-6">ວັນທີຊຳລະ</th>
              <th class="py-4 px-6 text-center">ຈັດການ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800/80 text-sm">
            <tr
              v-for="pay in paymentsList"
              :key="pay.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
            >
              <td class="py-4 px-6 font-mono text-xs text-slate-500">
                {{ pay.id }}
              </td>
              <td class="py-4 px-6">
                <span class="font-bold text-slate-900 dark:text-slate-100 block">{{ pay.userName }}</span>
                <span class="text-xs text-slate-400 block font-semibold">ID ຜູ້ໃຊ້: {{ pay.userId }}</span>
              </td>
              <td class="py-4 px-6">
                <span class="font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-2.5 py-1 rounded-lg">
                  {{ pay.packageName }}
                </span>
              </td>
              <td class="py-4 px-6">
                <span class="font-extrabold text-slate-900 dark:text-slate-100">
                  {{ Number(pay.amount).toLocaleString() }} Kip
                </span>
              </td>
              <td class="py-4 px-6">
                <span
                  v-if="pay.status === 'paid'"
                  class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  ຊຳລະແລ້ວ
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  ລໍຖ້າຊຳລະ
                </span>
              </td>
              <td class="py-4 px-6 text-slate-500 dark:text-slate-400">
                {{ formatDate(pay.paymentDate) }}
              </td>
              <td class="py-4 px-6 text-center">
                <button
                  v-if="pay.status !== 'paid'"
                  @click="handleConfirmPayment(pay.id)"
                  class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-all"
                >
                  <span class="material-icons select-none text-sm">check_circle</span>
                  ຊຳລະ
                </button>
                <span
                  v-else
                  class="text-xs text-slate-400 dark:text-slate-500 italic"
                >
                  —
                </span>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="!loading && paymentsList.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-500 dark:text-slate-600">
                <span class="material-icons select-none text-5xl block mb-2 text-slate-300 dark:text-slate-800">receipt_long</span>
                ຍັງບໍ່ມີປະຫວັດການຊຳລະເງິນໃນລະບົບ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination (Desktop) -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
      >
        <span class="text-xs text-slate-500 dark:text-slate-400">
          ທັງໝົດ {{ totalItems }} ລາຍການ
        </span>
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            ກ່ອນໜ້າ
          </button>
          <template v-for="(p, i) in paginationRange" :key="i">
            <span v-if="p === '...'" class="px-2 text-slate-400 dark:text-slate-600 text-xs">...</span>
            <button
              v-else
              @click="goToPage(Number(p))"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                currentPage === p
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
              ]"
            >
              {{ p }}
            </button>
          </template>
          <button
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            ໜ້າຕໍ່ໄປ
          </button>
        </div>
      </div>
    </div>

    <!-- Payments Ledger (Mobile View) -->
    <div class="block md:hidden space-y-4 mt-6">
      <div
        v-for="pay in paymentsList"
        :key="pay.id"
        class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-md transition-all duration-200"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="font-bold text-slate-900 dark:text-slate-100 block text-base">{{ pay.userName }}</span>
            <span class="text-[10px] text-slate-400 block font-mono mt-0.5">ID ໃບບິນ: {{ pay.id }}</span>
          </div>
          <span
            v-if="pay.status === 'paid'"
            class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full"
          >
            <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
            ຊຳລະແລ້ວ
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full"
          >
            <span class="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
            ລໍຖ້າຊຳລະ
          </span>
        </div>

        <div class="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div class="flex justify-between">
            <span class="text-slate-500">ແພັກເກດທີ່ຊື້:</span>
            <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ pay.packageName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">ຍອດຊຳລະ:</span>
            <span class="font-extrabold text-slate-900 dark:text-slate-200">{{ Number(pay.amount).toLocaleString() }} Kip</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">ວັນທີຊຳລະ:</span>
            <span class="text-slate-600 dark:text-slate-300">{{ formatDate(pay.paymentDate) }}</span>
          </div>
        </div>

        <!-- Mobile Pay Button -->
        <button
          v-if="pay.status !== 'paid'"
          @click="handleConfirmPayment(pay.id)"
          class="w-full flex items-center justify-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 rounded-xl transition-all"
        >
          <span class="material-icons select-none text-lg">check_circle</span>
          ຢືນຢັນການຊຳລະເງິນ
        </button>
      </div>

      <!-- Empty State (Mobile) -->
      <div v-if="!loading && paymentsList.length === 0" class="text-center py-12 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
        <span class="material-icons select-none text-5xl block mb-2 text-slate-300 dark:text-slate-800">receipt_long</span>
        ຍັງບໍ່ມີປະຫວັດການຊຳລະເງິນໃນລະບົບ
      </div>

      <!-- Pagination (Mobile) -->
      <div
        v-if="totalPages > 1"
        class="flex flex-col items-center gap-3 pt-4"
      >
        <span class="text-xs text-slate-500 dark:text-slate-400">
          ໜ້າ {{ currentPage }} / {{ totalPages }} (ທັງໝົດ {{ totalItems }} ລາຍການ)
        </span>
        <div class="flex items-center gap-2">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            ກ່ອນໜ້າ
          </button>
          <button
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
          >
            ໜ້າຕໍ່ໄປ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
