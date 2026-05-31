<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'admin',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();
const packagesList = ref<any[]>([]);

// Create form inputs
const showCreateForm = ref(false);
const name = ref('');
const maxPages = ref(1);
const maxTokens = ref(10000);
const price = ref('0.00');
const error = ref('');
const success = ref('');

// Edit form state
const showEditModal = ref(false);
const editingPackage = ref<any>(null);
const editName = ref('');
const editMaxPages = ref(1);
const editMaxTokens = ref(10000);
const editPrice = ref('0.00');
const editIsActive = ref(true);
const editError = ref('');
const editSaving = ref(false);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

/**
 * Format a numeric price string with Lao Kip units.
 * Example: "150000" -> "₭150,000"
 */
function formatPrice(priceVal: string | number): string {
  const num = typeof priceVal === 'string' ? parseFloat(priceVal.replace(/,/g, '')) : priceVal;
  if (isNaN(num)) return '₭0';
  return '₭' + num.toLocaleString('lo-LA');
}

async function loadPackages() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/packages`, { headers: headers.value });
    packagesList.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[Admin Packages] Cannot fetch packages:', err);
    packagesList.value = [];
  }
}

onMounted(() => {
  loadPackages();
});

async function handleCreatePackage() {
  if (!name.value || maxPages.value < 1 || maxTokens.value < 1000 || !price.value) {
    error.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ ແລະ ຖືກຕ້ອງ';
    return;
  }

  error.value = '';
  
  try {
    await $fetch(`${apiUrl}/api/admin/packages`, {
      method: 'POST',
      headers: headers.value,
      body: {
        name: name.value,
        maxPages: maxPages.value,
        maxTokens: maxTokens.value,
        price: price.value,
      },
    });
    
    // Clear inputs
    name.value = '';
    maxPages.value = 1;
    maxTokens.value = 10000;
    price.value = '0.00';
    showCreateForm.value = false;
    success.value = 'ສ້າງແພັກເກດສຳເລັດ!';
    setTimeout(() => (success.value = ''), 3000);
    
    await loadPackages();
  } catch (err: any) {
    error.value = err.data?.error || 'ບໍ່ສາມາດສ້າງແພັກເກດໄດ້';
  }
}

function openEdit(pkg: any) {
  showEditModal.value = true;
  editingPackage.value = pkg;
  editName.value = pkg.name || '';
  editMaxPages.value = pkg.maxPages ?? 1;
  editMaxTokens.value = pkg.maxTokens ?? 10000;
  editPrice.value = String(pkg.price ?? '0');
  editIsActive.value = pkg.isActive ?? true;
  editError.value = '';
  editSaving.value = false;
}

function closeEdit() {
  showEditModal.value = false;
  editingPackage.value = null;
  editError.value = '';
}

async function handleEditPackage() {
  if (!editName.value || editMaxPages.value < 1 || editMaxTokens.value < 1000 || !editPrice.value) {
    editError.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ ແລະ ຖືກຕ້ອງ';
    return;
  }

  editError.value = '';
  editSaving.value = true;

  try {
    await $fetch(`${apiUrl}/api/admin/packages/${editingPackage.value.id}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        name: editName.value,
        maxPages: editMaxPages.value,
        maxTokens: editMaxTokens.value,
        price: editPrice.value,
        isActive: editIsActive.value,
      },
    });

    success.value = 'ອັບເດດແພັກເກດສຳເລັດ!';
    setTimeout(() => (success.value = ''), 3000);
    closeEdit();
    await loadPackages();
  } catch (err: any) {
    editError.value = err.data?.error || 'ບໍ່ສາມາດອັບເດດແພັກເກດໄດ້';
  } finally {
    editSaving.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span class="material-icons select-none text-indigo-600 dark:text-indigo-400 text-3xl">local_offer</span>
          ແພັກເກດລາຄາ (Subscription Tiers)
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ກຳນົດ ແລະ ຈັດການແພັກເກດລາຄາ, ຈຳນວນເພຈ໌ສູງສຸດ ແລະ ຂີດຈຳກັດ Token ຂອງແຕ່ລະແພັກເກດ.
        </p>
      </div>

      <button
        @click="showCreateForm = !showCreateForm"
        class="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
      >
        <span class="material-icons select-none text-base">{{ showCreateForm ? 'close' : 'add' }}</span>
        {{ showCreateForm ? 'ປິດຟອມ' : 'ສ້າງແພັກເກດໃໝ່' }}
      </button>
    </div>

    <!-- Success Toast -->
    <div
      v-if="success"
      class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2"
    >
      <span class="material-icons select-none text-base">check_circle</span>
      {{ success }}
    </div>

    <!-- Create Package Form -->
    <div
      v-if="showCreateForm"
      class="mb-8 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl transition-all"
    >
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">ລາຍລະອຽດແພັກເກດໃໝ່</h2>
      
      <div v-if="error" class="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <!-- Name -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ຊື່ແພັກເກດ</label>
          <input
            v-model="name"
            type="text"
            placeholder="ເຊັ່ນ: Starter Pack"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <!-- Max Pages -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            ຈຳນວນເພຈ໌ສູງສຸດ
            <span class="text-slate-400 lowercase font-normal normal-case">(Pages)</span>
          </label>
          <input
            v-model.number="maxPages"
            type="number"
            min="1"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <!-- Max Tokens -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            ຈຳນວນ Token ສູງສຸດ / ເດືອນ
            <span class="text-slate-400 lowercase font-normal normal-case">(Tokens)</span>
          </label>
          <input
            v-model.number="maxTokens"
            type="number"
            min="1000"
            step="1000"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <!-- Price -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            ລາຄາຕໍ່ເດືອນ
            <span class="text-slate-400 lowercase font-normal normal-case">(₭ Kip)</span>
          </label>
          <input
            v-model="price"
            type="text"
            placeholder="ເຊັ່ນ: 150000"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-4">
        <button
          @click="showCreateForm = false"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all"
        >
          ຍົກເລີກ
        </button>
        <button
          @click="handleCreatePackage"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          ບັນທຶກແພັກເກດ
        </button>
      </div>
    </div>

    <!-- Active Packages List Display -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="pkg in packagesList"
        :key="pkg.id"
        class="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-102 transition-all flex flex-col justify-between"
      >
        <div>
          <!-- Title + Status -->
          <div class="flex items-center justify-between mb-4">
            <span class="font-extrabold text-lg text-slate-900 dark:text-slate-100">{{ pkg.name }}</span>
            <div class="flex items-center gap-2">
              <span
                v-if="!pkg.isActive"
                class="text-3xs font-extrabold bg-rose-500/15 border border-rose-500/35 text-rose-600 px-2 py-0.5 rounded-full"
              >
                ປິດໃຊ້ງານ
              </span>
              <span
                v-else
                class="text-3xs font-extrabold bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 px-2 py-0.5 rounded-full"
              >
                ເປີດໃຊ້ງານ
              </span>
            </div>
          </div>

          <!-- Price Tag with formatted Kip -->
          <div class="mb-6">
            <span class="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {{ formatPrice(pkg.price) }}
            </span>
            <span class="text-xs text-slate-500 block mt-1">/ ຕໍ່ເດືອນ (per month)</span>
          </div>

          <!-- Limits with unit labels -->
          <ul class="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <li class="flex items-center gap-2">
              <span class="material-icons select-none text-emerald-500 text-base">check_circle</span>
              <span>ຈຳນວນເພຈ໌ສູງສຸດ:</span>
              <strong class="text-slate-800 dark:text-slate-200">
                {{ (pkg.maxPages ?? 0).toLocaleString() }}
                <span class="font-normal text-slate-500">ເພຈ໌ (Pages)</span>
              </strong>
            </li>
            <li class="flex items-center gap-2">
              <span class="material-icons select-none text-emerald-500 text-base">check_circle</span>
              <span>ຈຳນວນ Token ສູງສຸດ:</span>
              <strong class="text-slate-800 dark:text-slate-200">
                {{ (pkg.maxTokens ?? 0).toLocaleString() }}
                <span class="font-normal text-slate-500">Tokens / ເດືອນ</span>
              </strong>
            </li>
            <li class="flex items-center gap-2">
              <span class="material-icons select-none text-emerald-500 text-base">check_circle</span>
              ບໍລິການຕອບແຊັດອັດຕະໂນມັດ 24/7
            </li>
          </ul>
        </div>

        <!-- Edit / Toggle Active Buttons -->
        <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 flex gap-2">
          <button
            @click="openEdit(pkg)"
            class="flex-1 flex items-center justify-center gap-1 py-2 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-all"
          >
            <span class="material-icons select-none text-base">edit</span>
            ແກ້ໄຂ (Edit)
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Package Modal -->
    <AppModal v-model="showEditModal" title="ແກ້ໄຂແພັກເກດ" description="ປັບປຸງລາຍລະອຽດ ແລະ ຂີດຈຳກັດຂອງແພັກເກດ" size="md" @close="closeEdit">
      <div v-if="editError" class="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ editError }}
      </div>

      <div class="space-y-4">
        <!-- Package Name -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ຊື່ແພັກເກດ</label>
          <input
            v-model="editName"
            type="text"
            placeholder="ເຊັ່ນ: Starter Pack"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Max Pages -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              ຈຳນວນເພຈ໌ສູງສຸດ
              <span class="text-slate-400 lowercase font-normal normal-case">(Pages)</span>
            </label>
            <input
              v-model.number="editMaxPages"
              type="number"
              min="1"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <!-- Max Tokens -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              ຈຳນວນ Token ສູງສຸດ / ເດືອນ
              <span class="text-slate-400 lowercase font-normal normal-case">(Tokens)</span>
            </label>
            <input
              v-model.number="editMaxTokens"
              type="number"
              min="1000"
              step="1000"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <!-- Price -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            ລາຄາຕໍ່ເດືອນ
            <span class="text-slate-400 lowercase font-normal normal-case">(₭ Kip)</span>
          </label>
          <input
            v-model="editPrice"
            type="text"
            placeholder="ເຊັ່ນ: 150000"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <!-- Active Toggle -->
        <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">ເປີດໃຊ້ງານແພັກເກດ</p>
            <p class="text-xs text-slate-500">ເມື່ອປິດ, ຜູ້ໃຊ້ຈະບໍ່ສາມາດເລືອກແພັກເກດນີ້ໄດ້</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="editIsActive" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="closeEdit"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all"
          >
            ຍົກເລີກ
          </button>
          <button
            @click="handleEditPackage"
            :disabled="editSaving"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
          >
            <span v-if="editSaving" class="material-icons select-none text-base animate-spin">refresh</span>
            {{ editSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການແກ້ໄຂ' }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
