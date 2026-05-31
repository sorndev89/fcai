<script setup lang="ts">
// FCAI Checkout Page
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowLeft, CreditCard, UploadCloud, CheckCircle, ShieldAlert,
  Loader2, Sparkles, Building, Info, FileImage, Trash2
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const route = useRoute();
const authStore = useAuthStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const checkoutMode = computed(() => String(route.query.mode || 'package'));
const packageId = computed(() => String(route.query.packageId || authStore.user?.packageId || ''));
const tokenBundleId = computed(() => String(route.query.bundleId || ''));

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// ─── State ──────────────────────────────────────────────
const loading = ref(true);
const submitting = ref(false);
const errorMsg = ref('');
const targetPackage = ref<any>(null);
const bankAccounts = ref<any[]>([]);
const tokenBundles = ref<any[]>([]);
const selectedBank = ref<any>(null);
const selectedTokenBundle = ref<any>(null);

// Slip Upload State
const slipFile = ref<File | null>(null);
const slipPreview = ref<string>('');
const slipBase64 = ref<string>('');
const selectedTopupAmount = computed(() => Number(selectedTokenBundle.value?.price || 0));
const selectedTopupTokens = computed(() => Number(selectedTokenBundle.value?.tokenAmount || 0));
const selectedBankQrUrl = computed(() => {
  const qrUrl = selectedBank.value?.qrCodeUrl;
  if (!qrUrl) return '';
  return qrUrl.startsWith('http') ? qrUrl : `${apiUrl}${qrUrl}`;
});

// ─── Fetch Data ─────────────────────────────────────────
async function fetchDetails() {
  if (checkoutMode.value !== 'token-topup' && !packageId.value) {
    errorMsg.value = 'ບໍ່ພົບແພັກເກດທີ່ທ່ານເລືອກ';
    loading.value = false;
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  try {
    const [packagesRes, banksRes, bundlesRes] = await Promise.all([
      $fetch<any[]>(`${apiUrl}/api/auth/packages`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/payments/active-banks`, { headers: headers.value }),
      $fetch<any[]>(`${apiUrl}/api/payments/token-bundles`, { headers: headers.value }),
    ]);

    // Find target package
    targetPackage.value = packagesRes.find((p: any) => p.id === packageId.value) || packagesRes[0] || null;
    if (!targetPackage.value) {
      errorMsg.value = 'ບໍ່ພົບຂໍ້ມູນແພັກເກດທີ່ເລືອກ';
    }

    bankAccounts.value = Array.isArray(banksRes) ? banksRes : [];
    if (bankAccounts.value.length > 0) {
      selectedBank.value = bankAccounts.value.find((bank: any) => bank.qrCodeUrl) || bankAccounts.value[0];
    }

    tokenBundles.value = Array.isArray(bundlesRes) ? bundlesRes : [];
    if (checkoutMode.value === 'token-topup') {
      selectedTokenBundle.value = tokenBundles.value.find((bundle: any) => bundle.id === tokenBundleId.value) || null;
      if (!selectedTokenBundle.value) {
        errorMsg.value = 'ບໍ່ພົບຊຸດ token top-up ທີ່ເລືອກ';
      }
    }
  } catch (err: any) {
    errorMsg.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນການຊຳລະເງິນໄດ້';
  } finally {
    loading.value = false;
  }
}

// ─── File Upload Handlers ───────────────────────────────
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0]);
  }
}

function handleFileDrop(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    processFile(event.dataTransfer.files[0]);
  }
}

function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    dialog.open({
      type: 'error',
      title: 'ປະເພດໄຟລ໌ບໍ່ຖືກຕ້ອງ',
      message: 'ກະລຸນາອັບໂຫຼດສະເພາະໄຟລ໌ຮູບພາບ (PNG, JPG, JPEG) ເທົ່ານັ້ນ',
    });
    return;
  }

  slipFile.value = file;
  slipPreview.value = URL.createObjectURL(file);

  // Convert to Base64
  const reader = new FileReader();
  reader.onloadend = () => {
    slipBase64.value = reader.result as string;
  };
  reader.readAsDataURL(file);
}

function removeFile() {
  slipFile.value = null;
  slipPreview.value = '';
  slipBase64.value = '';
}

// ─── Submit Payment ─────────────────────────────────────
async function handleSubmit() {
  if (!targetPackage.value) return;
  if (!slipBase64.value) {
    dialog.open({
      type: 'warning',
      title: 'ກະລຸນາອັບໂຫຼດສະລິບ',
      message: 'ກະລຸນາອັບໂຫຼດໃບບິນໂອນເງິນ (Payment Slip) ເພື່ອຢືນຢັນການຊຳລະເງິນ',
    });
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      packageId: targetPackage.value.id,
      amount: checkoutMode.value === 'token-topup'
        ? selectedTopupAmount.value
        : parseFloat(targetPackage.value.price),
      paymentType: checkoutMode.value === 'token-topup' ? 'token_topup' : 'package',
      tokenAmount: checkoutMode.value === 'token-topup' ? selectedTopupTokens.value : 0,
      tokenBundleId: checkoutMode.value === 'token-topup' ? selectedTokenBundle.value?.id : undefined,
      slipBase64: slipBase64.value,
      slipName: slipFile.value?.name || 'slip.jpg',
    };

    await $fetch(`${apiUrl}/api/payments/checkout`, {
      method: 'POST',
      headers: headers.value,
      body: payload,
    });

    await dialog.open({
      type: 'success',
      title: 'ສົ່ງຫຼັກຖານສຳເລັດ',
      message: 'ລະບົບໄດ້ຮັບຫຼັກຖານການໂອນເງິນຂອງທ່ານແລ້ວ. ກະລຸນາລໍຖ້າຜູ້ດູແລລະບົບກວດສອບ ແລະ ຢືນຢັນແພັກເກດຂອງທ່ານ.',
    });

    navigateTo('/dashboard/packages');
  } catch (err: any) {
    dialog.open({
      type: 'error',
      title: 'ເກີດຂໍ້ຜິດພາດ',
      message: err.data?.error || 'ບໍ່ສາມາດສົ່ງຫຼັກຖານໄດ້, ກະລຸນາລອງໃໝ່ພາຍຫຼັງ',
    });
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  fetchDetails();
});
</script>

<template>
  <div class="w-full space-y-5 pb-10">
    <!-- Back Header -->
    <div class="flex items-center gap-3">
      <button
        @click="navigateTo('/dashboard/packages')"
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 transition-all"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CreditCard class="h-5 w-5 text-indigo-500" />
          {{ checkoutMode === 'token-topup' ? 'ຊື້ token ເພີ່ມ' : 'ຊຳລະເງິນ & ອັບເກຣດແພັກເກດ' }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ checkoutMode === 'token-topup' ? 'ໂອນເງິນເພື່ອຊື້ token ເພີ່ມ ແລະ ແນບໃບບິນເພື່ອຢືນຢັນ' : 'ໂອນເງິນເຂົ້າບັນຊີທະນາຄານ ແລະ ແນບໃບບິນເພື່ອຢືນຢັນ' }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-5 md:grid-cols-5">
      <div class="space-y-4 md:col-span-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="space-y-3">
            <AppSkeletonBlock class="h-4 w-40" />
            <AppSkeletonBlock class="h-7 w-72 max-w-full" />
            <AppSkeletonBlock class="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="space-y-3">
            <AppSkeletonBlock class="h-4 w-44" />
            <div class="grid grid-cols-2 gap-3">
              <AppSkeletonBlock v-for="n in 4" :key="n" class="h-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
        <div class="space-y-3">
          <AppSkeletonBlock class="h-4 w-36" />
          <AppSkeletonBlock class="h-3 w-24" />
        </div>
        <div class="mt-6 space-y-4">
          <AppSkeletonBlock v-for="n in 5" :key="n" class="h-20 rounded-xl" />
        </div>
      </div>
    </div>

    <template v-else-if="!loading">
      <!-- Error Display -->
      <div
        v-if="errorMsg"
        class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/40 dark:text-red-400 flex items-start gap-3"
      >
        <ShieldAlert class="h-5 w-5 mt-0.5" />
        <div>
          <p class="font-bold">ຂໍ້ຜິດພາດ</p>
          <p class="mt-1 text-xs">{{ errorMsg }}</p>
        </div>
      </div>

      <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <!-- Left Section: Package Info & Bank Accounts (3 cols) -->
        <div class="space-y-6">
          <!-- Package Summary Card -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">
              {{ checkoutMode === 'token-topup' ? 'ລາຍລະອຽດ token top-up' : 'ລາຍລະອຽດແພັກເກດທີ່ເລືອກ' }}
            </h2>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold text-slate-950 dark:text-white">
                  {{ checkoutMode === 'token-topup' ? `${selectedTopupTokens.toLocaleString()} tokens` : targetPackage.name }}
                </h3>
                <p class="mt-1 text-xs text-slate-500">
                  <span v-if="checkoutMode === 'token-topup'">ຊຸດ token ເພີ່ມສຳລັບໃຊ້ງານທັນທີ ກ່ອນ token ໝົດ</span>
                  <span v-else>ເຊື່ອມຕໍ່ໄດ້ສູງສຸດ {{ targetPackage.maxPages }} ເພຈ໌ / Token {{ targetPackage.maxTokens?.toLocaleString() }} ຕໍ່ເດືອນ</span>
                </p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {{ checkoutMode === 'token-topup' ? new Intl.NumberFormat('lo-LA').format(selectedTopupAmount) : new Intl.NumberFormat('lo-LA').format(Number(targetPackage.price)) }}
                </span>
                <span class="text-xs text-slate-500 block">{{ checkoutMode === 'token-topup' ? ' ກີບ' : ' ກີບ/ເດືອນ' }}</span>
              </div>
            </div>
          </div>

          <!-- Bank Accounts Selection Card -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">ເລືອກຊ່ອງທາງການໂອນເງິນ</h2>
            
            <div v-if="bankAccounts.length === 0" class="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Building class="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p class="text-xs text-slate-500">ຍັງບໍ່ມີບັນຊີທະນາຄານສຳລັບໂອນເງິນໃນຂະນະນີ້</p>
            </div>

            <div v-else class="space-y-4">
              <!-- Grid of accounts -->
              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="bank in bankAccounts"
                  :key="bank.id"
                  @click="selectedBank = bank"
                  class="flex flex-col items-start p-4 rounded-xl border text-left transition-all"
                  :class="[
                    selectedBank?.id === bank.id
                      ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  ]"
                >
                  <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">{{ bank.bankName }}</span>
                  <span class="mt-1 text-sm font-bold text-slate-900 dark:text-white">{{ bank.accountNumber }}</span>
                  <span class="mt-0.5 text-xs text-slate-500">{{ bank.accountName }}</span>
                </button>
              </div>

              <!-- Selected Bank QR Code Details -->
              <div
                v-if="selectedBank"
                class="mt-4 p-4 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 flex flex-col sm:flex-row items-center gap-6"
              >
                <!-- QR Code Display -->
                <div v-if="selectedBankQrUrl" class="w-36 h-36 bg-white p-2 rounded-xl shadow-inner shrink-0 border border-slate-200/50">
                  <img
                    :src="selectedBankQrUrl"
                    alt="Bank Transfer QR Code"
                    class="w-full h-full object-contain"
                  />
                </div>
                <div v-else class="w-36 h-36 bg-slate-100 dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center shrink-0 border border-dashed border-slate-200 dark:border-slate-800">
                  <Sparkles class="h-6 w-6 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <span class="text-[10px] text-slate-400 mt-2">ສະແກນ QR ໂອນ</span>
                </div>

                <div class="space-y-2 text-sm text-center sm:text-left">
                  <div>
                    <span class="text-xs text-slate-500 block">ທະນາຄານ</span>
                    <strong class="text-slate-900 dark:text-white text-base">{{ selectedBank.bankName }}</strong>
                  </div>
                  <div>
                    <span class="text-xs text-slate-500 block">ເລກບັນຊີ</span>
                    <strong class="text-slate-900 dark:text-white text-base font-mono">{{ selectedBank.accountNumber }}</strong>
                  </div>
                  <div>
                    <span class="text-xs text-slate-500 block">ຊື່ບັນຊີ</span>
                    <strong class="text-slate-900 dark:text-white text-base">{{ selectedBank.accountName }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Section: Slip Upload & Confirm (2 cols) -->
        <div class="space-y-6">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">ແນບໃບບິນໂອນເງິນ</h2>

            <!-- File Upload Dropzone -->
            <div
              v-if="!slipPreview"
              @dragover.prevent
              @drop="handleFileDrop"
              class="relative h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-950 transition-all duration-200 group"
            >
              <input
                type="file"
                accept="image/*"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                @change="handleFileChange"
              />
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                <UploadCloud class="h-7 w-7" />
              </div>
              <p class="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">ກົດເພື່ອເລືອກຮູບພາບ</p>
              <p class="mt-1 text-xs text-slate-400">ຫຼື ລາກແລ້ວວາງສະລິບລົງທີ່ນີ້</p>
              <span class="mt-2 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2 py-0.5 rounded-full">PNG, JPG, JPEG</span>
            </div>

            <!-- Uploaded Preview -->
            <div v-else class="space-y-3">
              <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-2 flex flex-col items-center group">
                <img
                  :src="slipPreview"
                  alt="Payment Slip Preview"
                  class="max-h-72 w-full object-contain rounded-xl shadow-sm"
                />

                <div class="w-full flex items-center justify-between mt-3 px-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <FileImage class="h-4 w-4 text-slate-400 shrink-0" />
                    <span class="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[140px] font-semibold">{{ slipFile?.name }}</span>
                  </div>
                  <button
                    @click="removeFile"
                    class="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <button
                @click="handleSubmit"
                :disabled="submitting || !slipPreview"
                class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Loader2 v-if="submitting" class="h-5 w-5 animate-spin" />
                <CheckCircle v-else class="h-5 w-5" />
                <span>ຢືນຢັນການຊຳລະເງິນ</span>
              </button>

              <button
                @click="navigateTo('/dashboard/packages')"
                :disabled="submitting"
                class="w-full text-center text-xs font-semibold py-2.5 text-slate-500 hover:text-slate-700 transition-all"
              >
                ຍົກເລີກ
              </button>
            </div>

            <div class="flex items-start gap-2 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 mt-2">
              <Info class="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span>
                ຫຼັງຈາກກົດຢືນຢັນ, ຜູ້ດູແລລະບົບ ຈະກວດສອບສະລິບການໂອນເງິນຂອງທ່ານ ແລະ ທຳການອະນຸມັດແພັກເກດພາຍໃນ 5-10 ນາທີ.
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
