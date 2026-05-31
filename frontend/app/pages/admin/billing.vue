<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'admin',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();

// Active tab state
const activeTab = ref<'pending' | 'history' | 'banks'>('pending');

// Data Lists
const pendingPayments = ref<any[]>([]);
const historyPayments = ref<any[]>([]);
const bankAccounts = ref<any[]>([]);
const tenantsList = ref<any[]>([]);
const packagesList = ref<any[]>([]);

// Loading states
const pendingLoading = ref(false);
const historyLoading = ref(false);
const banksLoading = ref(false);
const basicDataLoading = ref(false);

// Global pending count state from useState (synced with admin layout!)
const pendingCountState = useState<number>('pendingPaymentsCount', () => 0);

// Search & Pagination for History
const historySearch = ref('');
const historyPage = ref(1);
const historyPageSize = ref(10);
const historyTotalItems = ref(0);
const historyTotalPages = ref(0);

// Error states
const error = ref('');
const bankError = ref('');
const actionError = ref('');

// Add manual record form states
const showRecordForm = ref(false);
const selectedUserId = ref('');
const paidAmount = ref(150000);

// Bank CRUD Modals
const showBankModal = ref(false);
const isEditingBank = ref(false);
const bankSubmitLoading = ref(false);
const bankForm = ref({
  id: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  isActive: true,
  qrCodeBase64: '',
  qrCodeName: '',
  qrCodeUrl: ''
});

// Slip view modal
const showSlipModal = ref(false);
const selectedSlipUrl = ref('');
const selectedPayment = ref<any>(null);
const actionLoading = ref(false);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// Load basic dropdown data (tenants and packages for manual billing entry)
async function loadBasicData() {
  basicDataLoading.value = true;
  try {
    const [tenants, pkgs] = await Promise.all([
      $fetch<any[]>(`${apiUrl}/api/admin/tenants`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/auth/packages`),
    ]);
    tenantsList.value = Array.isArray(tenants) ? tenants : [];
    packagesList.value = Array.isArray(pkgs) ? pkgs : [];
  } catch (err) {
    console.error('[Admin Billing] Failed to load basic data', err);
  } finally {
    basicDataLoading.value = false;
  }

  if (tenantsList.value.length > 0 && !selectedUserId.value) {
    selectedUserId.value = tenantsList.value[0].id;
  }
}

// Fetch pending counts
async function fetchPendingCount() {
  try {
    const res = await $fetch<{ count: number }>(`${apiUrl}/api/admin/payments/pending-count`, {
      headers: headers.value,
    });
    pendingCountState.value = res?.count || 0;
  } catch (err) {
    console.error('[Admin Billing] Failed to fetch pending count:', err);
  }
}

// Fetch pending payments (Confirmations tab)
async function fetchPending() {
  pendingLoading.value = true;
  try {
    const res = await $fetch<any>(`${apiUrl}/api/admin/payments?status=pending&limit=100`, {
      headers: headers.value,
    });
    // Filter client-side: only show pending payments with uploaded slips
    const list = Array.isArray(res.data) ? res.data : [];
    pendingPayments.value = list.filter((p: any) => p.slipUrl);
  } catch (err) {
    console.error('[Admin Billing] Failed to fetch pending payments:', err);
    pendingPayments.value = [];
  } finally {
    pendingLoading.value = false;
  }
}

// Fetch payment history (History tab)
async function fetchHistory() {
  historyLoading.value = true;
  try {
    const res = await $fetch<any>(
      `${apiUrl}/api/admin/payments?excludeStatus=pending&page=${historyPage.value}&limit=${historyPageSize.value}`,
      { headers: headers.value }
    );
    historyPayments.value = Array.isArray(res.data) ? res.data : [];
    historyTotalItems.value = res.total || 0;
    historyTotalPages.value = res.totalPages || 0;
    historyPage.value = res.page || 1;
  } catch (err) {
    console.error('[Admin Billing] Failed to fetch payment history:', err);
    historyPayments.value = [];
  } finally {
    historyLoading.value = false;
  }
}

// Fetch bank accounts (Banks tab)
async function fetchBanks() {
  banksLoading.value = true;
  try {
    const res = await $fetch<any[]>(`${apiUrl}/api/admin/bank-accounts`, {
      headers: headers.value,
    });
    bankAccounts.value = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error('[Admin Billing] Failed to fetch bank accounts:', err);
    bankAccounts.value = [];
  } finally {
    banksLoading.value = false;
  }
}

// Global data loading depending on active tab
async function loadData() {
  await Promise.all([
    fetchPendingCount(),
    loadBasicData()
  ]);

  if (activeTab.value === 'pending') {
    await fetchPending();
  } else if (activeTab.value === 'history') {
    await fetchHistory();
  } else if (activeTab.value === 'banks') {
    await fetchBanks();
  }
}

// Watch tab switches to load data automatically
watch(activeTab, () => {
  if (activeTab.value === 'pending') {
    fetchPending();
  } else if (activeTab.value === 'history') {
    fetchHistory();
  } else if (activeTab.value === 'banks') {
    fetchBanks();
  }
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

onMounted(() => {
  loadData();
});

// Create manual billing entry
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

    showRecordForm.value = false;
    await loadData();
  } catch (err: any) {
    error.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກການຊຳລະເງິນໄດ້';
  }
}

// Approve payment action
async function handleApprove(paymentId: string) {
  actionLoading.value = true;
  actionError.value = '';
  try {
    await $fetch(`${apiUrl}/api/admin/payments/${paymentId}/pay`, {
      method: 'PUT',
      headers: headers.value,
    });
    showSlipModal.value = false;
    selectedPayment.value = null;
    await Promise.all([fetchPending(), fetchPendingCount(), fetchHistory()]);
  } catch (err: any) {
    console.error('Approve payment error:', err);
    actionError.value = err.data?.error || 'ບໍ່ສາມາດຢືນຢັນການຊຳລະເງິນໄດ້';
  } finally {
    actionLoading.value = false;
  }
}

// Reject payment action
async function handleReject(paymentId: string) {
  if (!confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການປະຕິເສດໃບບິນນີ້?')) return;
  actionLoading.value = true;
  actionError.value = '';
  try {
    await $fetch(`${apiUrl}/api/admin/payments/${paymentId}/reject`, {
      method: 'PUT',
      headers: headers.value,
    });
    showSlipModal.value = false;
    selectedPayment.value = null;
    await Promise.all([fetchPending(), fetchPendingCount(), fetchHistory()]);
  } catch (err: any) {
    console.error('Reject payment error:', err);
    actionError.value = err.data?.error || 'ບໍ່ສາມາດປະຕິເສດການຊຳລະເງິນໄດ້';
  } finally {
    actionLoading.value = false;
  }
}

// View payment slip modal
function openSlipModal(payment: any) {
  actionError.value = '';
  selectedPayment.value = payment;
  if (payment.slipUrl) {
    selectedSlipUrl.value = payment.slipUrl.startsWith('http')
      ? payment.slipUrl
      : `${apiUrl}${payment.slipUrl}`;
  } else {
    selectedSlipUrl.value = '';
  }
  showSlipModal.value = true;
}

// Close slip modal
function closeSlipModal() {
  showSlipModal.value = false;
  selectedSlipUrl.value = '';
  selectedPayment.value = null;
}

// Open bank configuration modal (Create / Edit)
function openBankModal(bank?: any) {
  bankError.value = '';
  if (bank) {
    isEditingBank.value = true;
    bankForm.value = {
      id: bank.id,
      bankName: bank.bankName,
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      isActive: bank.isActive === 1 || bank.isActive === true,
      qrCodeBase64: '',
      qrCodeName: '',
      qrCodeUrl: bank.qrCodeUrl || ''
    };
  } else {
    isEditingBank.value = false;
    bankForm.value = {
      id: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      isActive: true,
      qrCodeBase64: '',
      qrCodeName: '',
      qrCodeUrl: ''
    };
  }
  showBankModal.value = true;
}

// Handle bank QR Code upload & base64 convert
function handleQrUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    bankForm.value.qrCodeName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      bankForm.value.qrCodeBase64 = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

// Save bank account details
async function handleSaveBank() {
  if (!bankForm.value.bankName || !bankForm.value.accountName || !bankForm.value.accountNumber) {
    bankError.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ';
    return;
  }
  bankSubmitLoading.value = true;
  bankError.value = '';

  try {
    const body: any = {
      bankName: bankForm.value.bankName,
      accountName: bankForm.value.accountName,
      accountNumber: bankForm.value.accountNumber,
      isActive: bankForm.value.isActive,
    };
    if (bankForm.value.qrCodeBase64) {
      body.qrCodeBase64 = bankForm.value.qrCodeBase64;
      body.qrCodeName = bankForm.value.qrCodeName;
    }

    if (isEditingBank.value) {
      await $fetch(`${apiUrl}/api/admin/bank-accounts/${bankForm.value.id}`, {
        method: 'PUT',
        headers: headers.value,
        body,
      });
    } else {
      await $fetch(`${apiUrl}/api/admin/bank-accounts`, {
        method: 'POST',
        headers: headers.value,
        body,
      });
    }
    showBankModal.value = false;
    await fetchBanks();
  } catch (err: any) {
    console.error('Save bank error:', err);
    bankError.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນບັນຊີທະນາຄານໄດ້';
  } finally {
    bankSubmitLoading.value = false;
  }
}

// Toggle bank active status directly
async function handleToggleBankStatus(bank: any) {
  const newActive = !bank.isActive;
  try {
    await $fetch(`${apiUrl}/api/admin/bank-accounts/${bank.id}`, {
      method: 'PUT',
      headers: headers.value,
      body: { isActive: newActive },
    });
    bank.isActive = newActive;
  } catch (err: any) {
    console.error('Toggle bank status error:', err);
    alert(err.data?.error || 'ບໍ່ສາມາດອັບເດດສະຖານະບັນຊີທະນາຄານໄດ້');
  }
}

// Delete bank account
async function handleDeleteBank(id: string) {
  if (!confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບບັນຊີທະນາຄານນີ້?')) return;
  try {
    await $fetch(`${apiUrl}/api/admin/bank-accounts/${id}`, {
      method: 'DELETE',
      headers: headers.value,
    });
    await fetchBanks();
  } catch (err: any) {
    console.error('Delete bank error:', err);
    alert(err.data?.error || 'ບໍ່ສາມາດລຶບບັນຊີທະນາຄານໄດ້');
  }
}

// Date formatter
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

// Go to page (History pagination)
function goToPage(page: number) {
  if (page < 1 || page > historyTotalPages.value) return;
  historyPage.value = page;
  fetchHistory();
}

// Filtered History list
const filteredHistory = computed(() => {
  if (!historySearch.value) return historyPayments.value;
  const q = historySearch.value.toLowerCase();
  return historyPayments.value.filter(p => 
    p.id.toLowerCase().includes(q) || 
    (p.userName && p.userName.toLowerCase().includes(q)) || 
    (p.packageName && p.packageName.toLowerCase().includes(q))
  );
});

// Pagination range generator
const paginationRange = computed(() => {
  const range: (number | string)[] = [];
  const total = historyTotalPages.value;
  const current = historyPage.value;

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
          ລາຍການໃບບິນ & ການຊຳລະເງິນ
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ກວດສອບການຢືນຢັນການຊຳລະເງິນຂອງລູກຄ້າ, ຈັດການປະຫວັດໃບບິນ ແລະ ຕັ້ງຄ່າບັນຊີທະນາຄານ.
        </p>
      </div>

      <div class="flex gap-2 w-full sm:w-auto">
        <!-- New Manual Bill Button -->
        <button
          v-if="activeTab !== 'banks'"
          @click="showRecordForm = !showRecordForm"
          class="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex-1 sm:flex-none"
        >
          <span class="material-icons select-none text-base">{{ showRecordForm ? 'close' : 'add' }}</span>
          {{ showRecordForm ? 'ປິດຟອມ' : 'ບັນທຶກໃບບິນໃໝ່' }}
        </button>

        <!-- New Bank Account Button -->
        <button
          v-else
          @click="openBankModal()"
          class="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex-1 sm:flex-none"
        >
          <span class="material-icons select-none text-base">account_balance</span>
          ເພີ່ມບັນຊີທະນາຄານ
        </button>
      </div>
    </div>

    <!-- Tab Buttons Layout -->
    <div class="mb-6 border-b border-slate-200 dark:border-slate-800 flex gap-4">
      <button
        @click="activeTab = 'pending'"
        :class="[
          'pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all px-1',
          activeTab === 'pending'
            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        ]"
      >
        <span class="material-icons select-none text-lg">pending_actions</span>
        ລໍຖ້າການຢືນຢັນ
        <span
          v-if="pendingCountState > 0"
          class="bg-red-500 text-white text-xxs font-extrabold px-2 py-0.5 rounded-full"
        >
          {{ pendingCountState }}
        </span>
      </button>

      <button
        @click="activeTab = 'history'"
        :class="[
          'pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all px-1',
          activeTab === 'history'
            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        ]"
      >
        <span class="material-icons select-none text-lg">history</span>
        ປະຫວັດການໂອນເງິນ
      </button>

      <button
        @click="activeTab = 'banks'"
        :class="[
          'pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all px-1',
          activeTab === 'banks'
            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        ]"
      >
        <span class="material-icons select-none text-lg">account_balance_wallet</span>
        ບັນຊີທະນາຄານ
      </button>
    </div>

    <!-- Manual Record Form (collapsible) -->
    <div
      v-if="showRecordForm"
      class="mb-6 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl transition-all"
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

    <!-- ==================== TAB 1: PENDING CONFIRMATIONS ==================== -->
    <div v-if="activeTab === 'pending'">
      <!-- Loading -->
      <div v-if="pendingLoading" class="text-center py-12 text-slate-500">
        <span class="material-icons select-none text-5xl block mb-2 animate-spin text-indigo-500">refresh</span>
        ກຳລັງໂຫຼດຂໍ້ມູນ...
      </div>

      <!-- Content Grid -->
      <div v-else>
        <div v-if="pendingPayments.length === 0" class="text-center py-12 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
          <span class="material-icons select-none text-5xl block mb-2 text-slate-300 dark:text-slate-700">playlist_add_check</span>
          ບໍ່ມີລາຍການລໍຖ້າການຢືນຢັນໃນເວລານີ້
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="pay in pendingPayments"
            :key="pay.id"
            class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:shadow-lg transition-all"
          >
            <div>
              <div class="flex justify-between items-start mb-3">
                <span class="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-1 rounded-lg">
                  {{ pay.packageName || '—' }}
                </span>
                <span class="text-xxs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                  ລໍຖ້າກວດສອບ
                </span>
              </div>

              <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">
                {{ pay.userName || 'ບໍ່ລະບຸຊື່' }}
              </h3>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-3">
                ID ຜູ້ໃຊ້: {{ pay.userId }}
              </p>

              <div class="space-y-1.5 border-t border-b border-slate-100 dark:border-slate-800 py-3 my-3 text-xs">
                <div class="flex justify-between">
                  <span class="text-slate-500">ຍອດເງິນໂອນ:</span>
                  <span class="font-extrabold text-slate-950 dark:text-slate-100">
                    {{ Number(pay.amount).toLocaleString() }} Kip
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">ວັນທີສັ່ງຊື້:</span>
                  <span class="text-slate-700 dark:text-slate-300 font-medium">
                    {{ formatDate(pay.createdAt) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-2">
              <button
                @click="openSlipModal(pay)"
                class="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-xl transition-all"
              >
                <span class="material-icons select-none text-sm">visibility</span>
                ເບິ່ງສະລິບ
              </button>
              <button
                @click="handleApprove(pay.id)"
                class="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <span class="material-icons select-none text-sm">check_circle</span>
                ອະນຸມັດ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 2: PAYMENT HISTORY ==================== -->
    <div v-if="activeTab === 'history'">
      <!-- Search Filter -->
      <div class="mb-4 flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <span class="material-icons select-none text-lg">search</span>
          </span>
          <input
            v-model="historySearch"
            type="text"
            placeholder="ຄົ້ນຫາຕາມລະຫັດ, ຊື່ລູກຄ້າ, ແພັກເກດ..."
            class="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="historyLoading" class="text-center py-12 text-slate-500">
        <span class="material-icons select-none text-5xl block mb-2 animate-spin text-indigo-500">refresh</span>
        ກຳລັງໂຫຼດຂໍ້ມູນ...
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Desktop Table -->
        <div class="hidden md:block bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
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
                  <th class="py-4 px-6 text-center">ສະລິບ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800/80 text-sm">
                <tr
                  v-for="pay in filteredHistory"
                  :key="pay.id"
                  class="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                >
                  <td class="py-4 px-6 font-mono text-xs text-slate-400">
                    {{ pay.id }}
                  </td>
                  <td class="py-4 px-6">
                    <span class="font-bold text-slate-900 dark:text-slate-100 block">{{ pay.userName }}</span>
                    <span class="text-xs text-slate-400 block">ID: {{ pay.userId }}</span>
                  </td>
                  <td class="py-4 px-6">
                    <span class="font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-2.5 py-1 rounded-lg">
                      {{ pay.packageName }}
                    </span>
                  </td>
                  <td class="py-4 px-6 font-extrabold text-slate-900 dark:text-slate-100">
                    {{ Number(pay.amount).toLocaleString() }} Kip
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
                      v-else-if="pay.status === 'rejected'"
                      class="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      ປະຕິເສດແລ້ວ
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-50 animate-pulse"></span>
                      ລໍຖ້າຊຳລະ
                    </span>
                  </td>
                  <td class="py-4 px-6 text-slate-500 dark:text-slate-400">
                    {{ formatDate(pay.paymentDate) }}
                  </td>
                  <td class="py-4 px-6 text-center">
                    <button
                      v-if="pay.slipUrl"
                      @click="openSlipModal(pay)"
                      class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 px-2 py-1 rounded-lg transition-all"
                    >
                      <span class="material-icons select-none text-sm">image</span>
                      ເບິ່ງສະລິບ
                    </button>
                    <span v-else class="text-xs text-slate-400 italic">—</span>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="filteredHistory.length === 0">
                  <td colspan="7" class="py-12 text-center text-slate-500 dark:text-slate-600">
                    <span class="material-icons select-none text-5xl block mb-2 text-slate-350 dark:text-slate-700">receipt_long</span>
                    ບໍ່ມີປະຫວັດການຊຳລະເງິນໃນລະບົບ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            v-if="historyTotalPages > 1"
            class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
          >
            <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              ທັງໝົດ {{ historyTotalItems }} ລາຍການ
            </span>
            <div class="flex items-center gap-1">
              <button
                :disabled="historyPage <= 1"
                @click="goToPage(historyPage - 1)"
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
                    historyPage === p
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
                  ]"
                >
                  {{ p }}
                </button>
              </template>
              <button
                :disabled="historyPage >= historyTotalPages"
                @click="goToPage(historyPage + 1)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                ໜ້າຕໍ່ໄປ
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile view for History -->
        <div class="block md:hidden space-y-4">
          <div
            v-for="pay in filteredHistory"
            :key="pay.id"
            class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 shadow-md"
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="font-bold text-slate-900 dark:text-slate-100 block text-base">{{ pay.userName }}</span>
                <span class="text-xxs text-slate-400 font-mono block mt-0.5">ID: {{ pay.id }}</span>
              </div>
              <span
                v-if="pay.status === 'paid'"
                class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
              >
                ຊຳລະແລ້ວ
              </span>
              <span
                v-else-if="pay.status === 'rejected'"
                class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full"
              >
                ປະຕິເສດແລ້ວ
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"
              >
                ລໍຖ້າຊຳລະ
              </span>
            </div>

            <div class="space-y-1.5 text-xs pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div class="flex justify-between">
                <span class="text-slate-400">ແພັກເກດ:</span>
                <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ pay.packageName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">ຍອດຊຳລະ:</span>
                <span class="font-extrabold text-slate-900 dark:text-slate-200">{{ Number(pay.amount).toLocaleString() }} Kip</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">ວັນທີຊຳລະ:</span>
                <span class="text-slate-600 dark:text-slate-350">{{ formatDate(pay.paymentDate) }}</span>
              </div>
            </div>

            <button
              v-if="pay.slipUrl"
              @click="openSlipModal(pay)"
              class="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30"
            >
              <span class="material-icons select-none text-sm">image</span>
              ເບິ່ງສະລິບ
            </button>
          </div>

          <!-- Empty State (Mobile) -->
          <div v-if="filteredHistory.length === 0" class="text-center py-12 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
            <span class="material-icons select-none text-5xl block mb-2 text-slate-350 dark:text-slate-700">receipt_long</span>
            ບໍ່ມີປະຫວັດການຊຳລະເງິນໃນລະບົບ
          </div>

          <!-- Pagination Mobile -->
          <div v-if="historyTotalPages > 1" class="flex flex-col items-center gap-3 pt-4">
            <span class="text-xs text-slate-500 dark:text-slate-400">
              ໜ້າ {{ historyPage }} / {{ historyTotalPages }} (ທັງໝົດ {{ historyTotalItems }} ລາຍການ)
            </span>
            <div class="flex items-center gap-2">
              <button
                :disabled="historyPage <= 1"
                @click="goToPage(historyPage - 1)"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              >
                ກ່ອນໜ້າ
              </button>
              <button
                :disabled="historyPage >= historyTotalPages"
                @click="goToPage(historyPage + 1)"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              >
                ໜ້າຕໍ່ໄປ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 3: BANK ACCOUNTS ==================== -->
    <div v-if="activeTab === 'banks'">
      <!-- Loading -->
      <div v-if="banksLoading" class="text-center py-12 text-slate-500">
        <span class="material-icons select-none text-5xl block mb-2 animate-spin text-indigo-500">refresh</span>
        ກຳລັງໂຫຼດຂໍ້ມູນ...
      </div>

      <div v-else>
        <div v-if="bankAccounts.length === 0" class="text-center py-12 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
          <span class="material-icons select-none text-5xl block mb-2 text-slate-300 dark:text-slate-700">account_balance</span>
          ຍັງບໍ່ມີຂໍ້ມູນບັນຊີທະນາຄານຂອງລະບົບ, ກະລຸນາກົດປຸ່ມ "ເພີ່ມບັນຊີທະນາຄານ" ເພື່ອເລີ່ມຕົ້ນ.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="bank in bankAccounts"
            :key="bank.id"
            class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:shadow-lg transition-all"
          >
            <div>
              <div class="flex justify-between items-start mb-3">
                <span class="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-1 rounded-lg">
                  {{ bank.bankName }}
                </span>

                <!-- Toggle active status -->
                <div class="flex items-center gap-1.5 cursor-pointer" @click="handleToggleBankStatus(bank)">
                  <span
                    :class="[
                      'w-2 h-2 rounded-full',
                      bank.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                    ]"
                  ></span>
                  <span class="text-xxs font-bold text-slate-500 dark:text-slate-400">
                    {{ bank.isActive ? 'ເປີດໃຊ້ງານ' : 'ປິດໃຊ້ງານ' }}
                  </span>
                </div>
              </div>

              <!-- Bank Info -->
              <h4 class="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {{ bank.accountName }}
              </h4>
              <p class="text-lg font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 mb-3">
                {{ bank.accountNumber }}
              </p>

              <!-- QR Code Preview if upload -->
              <div v-if="bank.qrCodeUrl" class="my-3 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/50 p-2 flex justify-center max-h-40">
                <img
                  :src="bank.qrCodeUrl.startsWith('http') ? bank.qrCodeUrl : `${apiUrl}${bank.qrCodeUrl}`"
                  alt="QR Code"
                  class="max-h-full object-contain rounded-lg"
                />
              </div>
              <div v-else class="my-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400 dark:text-slate-650 bg-slate-50/50 dark:bg-slate-950/10">
                ບໍ່ມີຮູບພາບ QR Code
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-3">
              <button
                @click="openBankModal(bank)"
                class="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                <span class="material-icons select-none text-sm">edit</span>
                ແກ້ໄຂ
              </button>
              <button
                @click="handleDeleteBank(bank.id)"
                class="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 transition-all active:scale-95"
              >
                <span class="material-icons select-none text-sm">delete</span>
                ລຶບ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL: SLIP VIEW & ACTIONS ==================== -->
    <div
      v-if="showSlipModal"
      class="modal modal-top fade show fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm transition-all duration-300"
      @click.self="closeSlipModal"
    >
      <div
        class="modal-dialog max-w-md w-full my-8 transition-transform duration-300 ease-out"
        :style="showSlipModal ? 'transform: translateY(0);' : 'transform: translateY(-50px);'"
      >
        <div class="modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div class="modal-header border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
            <div>
              <h3 class="font-extrabold text-slate-900 dark:text-slate-100 text-base">ກວດສອບສະລິບໂອນເງິນ</h3>
              <p class="text-xxs text-slate-400 dark:text-slate-500 mt-0.5">
                ໃບບິນລະຫັດ: {{ selectedPayment?.id }}
              </p>
            </div>
            <button @click="closeSlipModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span class="material-icons select-none font-bold">close</span>
            </button>
          </div>

          <div class="modal-body p-6 flex flex-col items-center gap-4">
            <!-- Alert error in modal -->
            <div v-if="actionError" class="w-full p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl">
              {{ actionError }}
            </div>

            <!-- Image preview -->
            <div class="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2 flex justify-center max-h-80">
              <img
                v-if="selectedSlipUrl"
                :src="selectedSlipUrl"
                alt="Payment Slip"
                class="max-h-full max-w-full object-contain rounded-lg shadow-sm"
              />
              <div v-else class="py-12 text-slate-400 text-xs italic">
                ບໍ່ພົບຮູບພາບສະລິບ
              </div>
            </div>

            <!-- Payment details card -->
            <div v-if="selectedPayment" class="w-full space-y-2 text-xs bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="flex justify-between">
                <span class="text-slate-500">ຮ້ານຄ້າ / ລູກຄ້າ:</span>
                <strong class="text-slate-900 dark:text-white">{{ selectedPayment.userName }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ແພັກເກດທີ່ຊື້:</span>
                <strong class="text-indigo-600 dark:text-indigo-400">{{ selectedPayment.packageName }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ຍອດເງິນໂອນ:</span>
                <strong class="text-slate-900 dark:text-white font-extrabold text-sm">{{ Number(selectedPayment.amount).toLocaleString() }} Kip</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">ວັນທີສັ່ງຊື້:</span>
                <span class="text-slate-800 dark:text-slate-300 font-medium">{{ formatDate(selectedPayment.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="modal-footer border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20">
            <button
              @click="closeSlipModal"
              class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-305 dark:hover:bg-slate-750 transition-all"
            >
              ປິດ
            </button>
            <template v-if="selectedPayment?.status === 'pending'">
              <button
                @click="handleReject(selectedPayment.id)"
                :disabled="actionLoading"
                class="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30 transition-all active:scale-95 disabled:opacity-50"
              >
                ປະຕິເສດບິນ
              </button>
              <button
                @click="handleApprove(selectedPayment.id)"
                :disabled="actionLoading"
                class="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/10 active:scale-95 disabled:opacity-50"
              >
                ຢືນຢັນອະນຸມັດ
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL: BANK CREATE / EDIT ==================== -->
    <div
      v-if="showBankModal"
      class="modal modal-top fade show fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm transition-all duration-300"
      @click.self="showBankModal = false"
    >
      <div
        class="modal-dialog max-w-md w-full my-8 transition-transform duration-300 ease-out"
        :style="showBankModal ? 'transform: translateY(0);' : 'transform: translateY(-50px);'"
      >
        <div class="modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div class="modal-header border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
            <div>
              <h3 class="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                {{ isEditingBank ? 'ແກ້ໄຂຂໍ້ມູນບັນຊີທະນາຄານ' : 'ເພີ່ມຂໍ້ມູນບັນຊີທະນາຄານໃໝ່' }}
              </h3>
              <p class="text-xxs text-slate-400 dark:text-slate-500 mt-0.5">
                ປ້ອນຂໍ້ມູນບັນຊີທະນາຄານຂອງ SaaS ເພື່ອຮັບເງິນໂອນຈາກລູກຄ້າ.
              </p>
            </div>
            <button @click="showBankModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span class="material-icons select-none font-bold">close</span>
            </button>
          </div>

          <div class="modal-body p-6 space-y-4">
            <!-- Error panel -->
            <div v-if="bankError" class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl">
              {{ bankError }}
            </div>

            <!-- Bank Name Input -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ຊື່ທະນາຄານ (e.g. BCEL, LDB)</label>
              <input
                v-model="bankForm.bankName"
                type="text"
                placeholder="ປ້ອນຊື່ທະນາຄານ..."
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <!-- Account Name Input -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ຊື່ບັນຊີທະນາຄານ</label>
              <input
                v-model="bankForm.accountName"
                type="text"
                placeholder="ປ້ອນຊື່ບັນຊີທະນາຄານ..."
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <!-- Account Number Input -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ເລກບັນຊີທະນາຄານ</label>
              <input
                v-model="bankForm.accountNumber"
                type="text"
                placeholder="ປ້ອນເລກບັນຊີທະນາຄານ..."
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <!-- QR Code Upload -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ຮູບພາບ QR Code (ຮັບເງິນໂອນ)</label>
              <input
                type="file"
                accept="image/*"
                @change="handleQrUpload"
                class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 file:cursor-pointer cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-1"
              />

              <!-- Preview of QR code image -->
              <div v-if="bankForm.qrCodeBase64 || bankForm.qrCodeUrl" class="mt-3 p-2 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50 flex justify-center max-h-40">
                <img
                  :src="bankForm.qrCodeBase64 || (bankForm.qrCodeUrl.startsWith('http') ? bankForm.qrCodeUrl : `${apiUrl}${bankForm.qrCodeUrl}`)"
                  alt="QR Preview"
                  class="max-h-full object-contain rounded-lg"
                />
              </div>
            </div>

            <!-- Toggle Active Switch -->
            <div class="flex items-center gap-3 pt-2">
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="bankForm.isActive"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <span class="text-xs font-bold text-slate-600 dark:text-slate-400">ເປີດໃຫ້ລູກຄ້າຊຳລະເງິນຜ່ານບັນຊີນີ້</span>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="modal-footer border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20">
            <button
              @click="showBankModal = false"
              class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 transition-all"
            >
              ຍົກເລີກ
            </button>
            <button
              @click="handleSaveBank"
              :disabled="bankSubmitLoading"
              class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50"
            >
              {{ bankSubmitLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນ' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
