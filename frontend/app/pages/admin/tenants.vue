<script setup lang="ts">
import { Ban, Check, Clock, Search, Building2, Plus, X } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { computed, onMounted, ref, watch } from 'vue';
import AppMetricCard from '~/components/AppMetricCard.vue';
import AppPagination from '~/components/AppPagination.vue';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const authStore = useAuthStore();
const apiUrl = useApiUrl();
const dialog = useDialog();

const tenants = ref<any[]>([]);
const packages = ref<any[]>([]);
const loading = ref(true);
const aiConfigs = ref<any[]>([]);
const aiConfigsLoading = ref(false);
const aiConfigsError = ref('');
const search = ref('');
const statusFilter = ref('all');
const tenantPage = ref(1);
const tenantPageSize = ref(10);

// --- Form State for New Tenant ---
const showAddTenantModal = ref(false);
const newTenantName = ref('');
const newTenantEmail = ref('');
const newTenantPassword = ref('');
const newTenantPackage = ref('pkg-starter');
const newTenantStatus = ref('approved');
const formLoading = ref(false);
const formError = ref('');
const formSuccess = ref(false);

// --- Form State for Editing Tenant ---
const showEditTenantModal = ref(false);
const editingTenantId = ref('');
const editTenantName = ref('');
const editTenantEmail = ref('');
const editTenantPassword = ref('');
const editTenantPackage = ref('');
const editTenantStatus = ref('approved');
const editFormLoading = ref(false);
const editFormError = ref('');
const editFormSuccess = ref(false);

// --- Form State for Managing Tenant Pages ---
const showManagePagesModal = ref(false);
const selectedTenant = ref<any>(null);
const tenantPages = ref<any[]>([]);
const pagesLoading = ref(false);
const pagesError = ref('');

// Dynamic View State inside Manage Pages Modal
const managePagesView = ref<'list' | 'add' | 'edit'>('list');
const editingPageId = ref('');
const pageFormName = ref('');
const pageFormFbId = ref('');
const pageFormToken = ref('');
const pageFormKb = ref('');
const pageFormAiConfigId = ref('');
const pageFormLoading = ref(false);
const pageFormError = ref('');
const pageFormSuccess = ref(false);

// Test Connection inside Manage Pages Modal
const testLoading = ref(false);
const testResult = ref<any>(null);

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

async function fetchPackages() {
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/auth/packages`);
    packages.value = Array.isArray(data) ? data : [];
    if (packages.value.length > 0 && !newTenantPackage.value) {
      newTenantPackage.value = packages.value[0].id;
    }
  } catch (err) {
    console.error('[Admin] Cannot fetch packages from API.', err);
    packages.value = [];
  }
}

async function fetchAiConfigs() {
  aiConfigsLoading.value = true;
  aiConfigsError.value = '';
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/ai-config`, { headers: headers.value });
    aiConfigs.value = Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.error('[Admin] Cannot fetch AI configs from API.', err);
    aiConfigs.value = [];
    aiConfigsError.value = err.data?.error || 'ບໍ່ສາມາດດຶງຂໍ້ມູນ AI Config ໄດ້';
  } finally {
    aiConfigsLoading.value = false;
  }
}

function resetTenantForm() {
  newTenantName.value = '';
  newTenantEmail.value = '';
  newTenantPassword.value = '';
  newTenantPackage.value = packages.value[0]?.id || 'pkg-starter';
  newTenantStatus.value = 'approved';
  formError.value = '';
  formSuccess.value = false;
}

async function handleAddTenant() {
  if (!newTenantName.value.trim() || !newTenantEmail.value.trim() || !newTenantPassword.value.trim() || !newTenantPackage.value) {
    formError.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ.';
    return;
  }

  formLoading.value = true;
  formError.value = '';
  formSuccess.value = false;

  try {
    await $fetch(`${apiUrl}/api/admin/tenants`, {
      method: 'POST',
      headers: headers.value,
      body: {
        name: newTenantName.value.trim(),
        email: newTenantEmail.value.trim(),
        password: newTenantPassword.value.trim(),
        packageId: newTenantPackage.value,
        status: newTenantStatus.value,
      },
    });

    formSuccess.value = true;
    await fetchTenants();
    setTimeout(() => {
      showAddTenantModal.value = false;
      resetTenantForm();
    }, 1500);
  } catch (err: any) {
    formError.value = err.data?.error || 'ບໍ່ສາມາດລົງທະບຽນລູກຄ້າໄດ້';
  } finally {
    formLoading.value = false;
  }
}

function openEditModal(tenant: any) {
  editingTenantId.value = tenant.id;
  editTenantName.value = tenant.name;
  editTenantEmail.value = tenant.email;
  editTenantPassword.value = ''; 
  editTenantPackage.value = tenant.packageId || packages.value[0]?.id || '';
  editTenantStatus.value = tenant.status;
  editFormError.value = '';
  editFormSuccess.value = false;
  showEditTenantModal.value = true;
}

async function handleEditTenant() {
  if (!editTenantName.value.trim() || !editTenantEmail.value.trim() || !editTenantPackage.value) {
    editFormError.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ.';
    return;
  }

  editFormLoading.value = true;
  editFormError.value = '';
  editFormSuccess.value = false;

  try {
    await $fetch(`${apiUrl}/api/admin/tenants/${editingTenantId.value}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        name: editTenantName.value.trim(),
        email: editTenantEmail.value.trim(),
        password: editTenantPassword.value.trim() || undefined, 
        packageId: editTenantPackage.value,
        status: editTenantStatus.value,
      },
    });

    editFormSuccess.value = true;
    await fetchTenants();
    setTimeout(() => {
      showEditTenantModal.value = false;
    }, 1500);
  } catch (err: any) {
    editFormError.value = err.data?.error || 'ບໍ່ສາມາດອັບເດດຂໍ້ມູນລູກຄ້າໄດ້';
  } finally {
    editFormLoading.value = false;
  }
}

async function openManagePagesModal(tenant: any) {
  selectedTenant.value = tenant;
  managePagesView.value = 'list';
  pagesError.value = '';
  showManagePagesModal.value = true;
  await fetchTenantPages();
}

async function fetchTenantPages() {
  if (!selectedTenant.value) return;
  pagesLoading.value = true;
  pagesError.value = '';
  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/admin/tenants/${selectedTenant.value.id}/pages`, {
      headers: headers.value,
    });
    tenantPages.value = Array.isArray(data) ? data : [];
  } catch (err: any) {
    pagesError.value = err.data?.error || 'ບໍ່ສາມາດດຶງຂໍ້ມູນເພຈຂອງລູກຄ້າໄດ້';
  } finally {
    pagesLoading.value = false;
  }
}

function openAddPageForm() {
  managePagesView.value = 'add';
  pageFormName.value = '';
  pageFormFbId.value = '';
  pageFormToken.value = '';
  pageFormKb.value = '';
  pageFormAiConfigId.value = '';
  pageFormError.value = '';
  pageFormSuccess.value = false;
  testResult.value = null;
}

function openEditPageForm(page: any) {
  managePagesView.value = 'edit';
  editingPageId.value = page.id;
  pageFormName.value = page.fbPageName;
  pageFormFbId.value = page.fbPageId;
  pageFormToken.value = page.fbPageAccessToken || '';
  pageFormKb.value = page.knowledgeBase || '';
  pageFormAiConfigId.value = page.aiConfigId || '';
  pageFormError.value = '';
  pageFormSuccess.value = false;
  testResult.value = null;
}

async function handleSavePage() {
  if (!pageFormName.value.trim() || !pageFormFbId.value.trim() || !pageFormToken.value.trim()) {
     pageFormError.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ.';
     return;
  }

  if (!pageFormAiConfigId.value && activeAiConfigs.value.length === 0) {
    pageFormError.value = 'ບໍ່ພົບ AI Config ຫຼັກ (Default) ທີ່ Active. ກະລຸນາໄປເປີດໃຊ້ງານ AI Config ຫຼັກກ່ອນ ຫຼື ເລືອກ AI Agent ສະເພາະ.';
    return;
  }

  pageFormLoading.value = true;
  pageFormError.value = '';
  pageFormSuccess.value = false;

  const isEdit = managePagesView.value === 'edit';
  const url = isEdit
    ? `${apiUrl}/api/admin/tenants/${selectedTenant.value.id}/pages/${editingPageId.value}`
    : `${apiUrl}/api/admin/tenants/${selectedTenant.value.id}/pages`;

  try {
    await $fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: headers.value,
      body: {
        fbPageName: pageFormName.value.trim(),
        fbPageId: pageFormFbId.value.trim(),
        fbPageAccessToken: pageFormToken.value.trim(),
        knowledgeBase: pageFormKb.value,
        aiConfigId: pageFormAiConfigId.value || undefined,
      },
    });

    pageFormSuccess.value = true;
    await fetchTenantPages();
    setTimeout(() => {
      managePagesView.value = 'list';
    }, 1500);
  } catch (err: any) {
    pageFormError.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນເພຈໄດ້';
  } finally {
    pageFormLoading.value = false;
  }
}

async function handleTogglePageActive(page: any) {
  try {
    await $fetch(`${apiUrl}/api/admin/tenants/${selectedTenant.value.id}/pages/${page.id}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        isActive: !page.isActive,
      },
    });
    await fetchTenantPages();
  } catch (err: any) {
    console.error('Toggle page active status error:', err);
  }
}

async function handleDeleteTenantPage(pageId: string) {
  const confirmed = confirm('ທ່ານຕ້ອງການລຶບການເຊື່ອມຕໍ່ເພຈນີ້ແທ້ບໍ?');
  if (!confirmed) return;

  try {
    await $fetch(`${apiUrl}/api/admin/tenants/${selectedTenant.value.id}/pages/${pageId}`, {
      method: 'DELETE',
      headers: headers.value,
    });
    await fetchTenantPages();
  } catch (err: any) {
    console.error('Delete page connection error:', err);
  }
}

async function handleTestTenantPageConnection() {
  if (!pageFormFbId.value.trim() || !pageFormToken.value.trim()) {
    testResult.value = { success: false, message: 'ກະລຸນາປ້ອນ Facebook Page ID ແລະ Access Token ກ່ອນ.' };
    return;
  }

  testLoading.value = true;
  testResult.value = null;

  try {
    const res = await $fetch<any>(`${apiUrl}/api/pages/test-connection`, {
      method: 'POST',
      headers: headers.value,
      body: {
        fbPageId: pageFormFbId.value.trim(),
        fbPageAccessToken: pageFormToken.value.trim(),
      },
    });
    testResult.value = { success: true, message: res.message, pageName: res.pageName };
  } catch (err: any) {
    testResult.value = { success: false, message: err.data?.error || 'ການເຊື່ອມຕໍ່ຫຼົ້ມເຫຼວ' };
  } finally {
    testLoading.value = false;
  }
}

async function handleDirectTestConnection(page: any) {
  try {
    const res = await $fetch<any>(`${apiUrl}/api/pages/test-connection`, {
      method: 'POST',
      headers: headers.value,
      body: {
        fbPageId: page.fbPageId,
        fbPageAccessToken: page.fbPageAccessToken,
      },
    });
    alert(`ເຊື່ອມຕໍ່ສຳເລັດ! ເພຈ: ${res.pageName}`);
  } catch (err: any) {
    alert(`ເຊື່ອມຕໍ່ຫຼົ້ມເຫຼວ: ${err.data?.error || 'ກະລຸນາກວດສອບ Access Token'}`);
  }
}

onMounted(() => {
  loading.value = true;
  Promise.allSettled([
    fetchTenants(),
    fetchPackages(),
    fetchAiConfigs(),
  ]).finally(() => {
    loading.value = false;
  });
});

async function handleStatusChange(userId: string, newStatus: 'pending' | 'approved' | 'suspended') {
  try {
    await $fetch(`${apiUrl}/api/admin/tenants/${userId}/status`, {
      method: 'PUT',
      headers: headers.value,
      body: { status: newStatus },
    });
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

const paginatedTenants = computed(() => {
  const start = (tenantPage.value - 1) * tenantPageSize.value;
  return filteredTenants.value.slice(start, start + tenantPageSize.value);
});

const activeAiConfigs = computed(() => aiConfigs.value.filter((config: any) => config.isActive));

watch([search, statusFilter], () => {
  tenantPage.value = 1;
});

watch([() => filteredTenants.value.length, tenantPageSize], () => {
  const totalPages = Math.max(1, Math.ceil(filteredTenants.value.length / tenantPageSize.value));
  if (tenantPage.value > totalPages) {
    tenantPage.value = totalPages;
  }
});

const stats = computed(() => ({
  total: tenants.value.length,
  pending: tenants.value.filter((t: any) => t.status === 'pending').length,
  approved: tenants.value.filter((t: any) => t.status === 'approved').length,
  suspended: tenants.value.filter((t: any) => t.status === 'suspended').length,
}));

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

function getAiConfigLabel(aiConfigId?: string) {
  if (!aiConfigId) return 'ໃຊ້ AI ຫຼັກຂອງລະບົບ (ຄ່າເລີ່ມຕົ້ນ)';
  const config = aiConfigs.value.find((item: any) => item.id === aiConfigId);
  if (!config) return 'ບໍ່ພົບ AI config';
  const isDefault = config.isActive ? ' [ຄ່າເລີ່ມຕົ້ນ]' : '';
  return `${config.provider || 'ai'} - ${config.modelName || config.id}${isDefault}`;
}
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-3">
        <AppSkeletonBlock class="h-3 w-28" />
        <AppSkeletonBlock class="h-8 w-72 max-w-full" />
        <AppSkeletonBlock class="h-4 w-[32rem] max-w-full" />
      </div>
      <AppSkeletonBlock class="h-10 w-40 rounded-xl" />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AppSkeletonBlock v-for="n in 4" :key="n" class="h-32 rounded-2xl" />
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div class="grid gap-3 sm:grid-cols-[1fr_200px]">
          <AppSkeletonBlock class="h-10 rounded-xl" />
          <AppSkeletonBlock class="h-10 rounded-xl" />
        </div>
      </div>
      <div class="overflow-hidden">
        <div class="hidden md:block">
          <div class="grid grid-cols-6 gap-0 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
            <AppSkeletonBlock v-for="n in 6" :key="n" class="h-3 rounded-full" />
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="n in 6" :key="n" class="grid grid-cols-6 gap-4 px-5 py-4">
              <AppSkeletonBlock v-for="m in 6" :key="m" class="h-4 rounded-full" />
            </div>
          </div>
        </div>
        <div class="space-y-3 p-4 md:hidden">
          <AppSkeletonBlock v-for="n in 4" :key="n" class="h-28 rounded-2xl" />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">ເຈົ້າຂອງລະບົບ</p>
        <h1 class="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">ຈັດການລູກຄ້າ</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ອະນຸມັດ, ລະງັບ ແລະ ຈັດການການເຊື່ອມຕໍ່ Facebook Page ຂອງລູກຄ້າແຕ່ລະຄົນ
        </p>
      </div>
      <div>
        <button
          type="button"
          @click="showAddTenantModal = true"
          class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
        >
          <Plus class="h-4 w-4" />
          ເພີ່ມລູກຄ້າໃໝ່
        </button>
      </div>
    </div>

    <!-- Metrics row -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AppMetricCard
        label="ລູກຄ້າທັງໝົດ"
        :value="stats.total"
        :icon="Building2"
        color-class="sky"
        :trend="{ value: stats.approved, direction: stats.pending > 0 ? 'up' : 'neutral', label: 'ອະນຸມັດ' }"
        footnote="ລູກຄ້າທີ່ລົງທະບຽນທັງໝົດ"
      />
      <AppMetricCard
        label="ເປີດໃຊ້ (Active)"
        :value="stats.approved"
        :icon="Check"
        color-class="emerald"
        :trend="{ value: stats.pending, direction: stats.pending > 0 ? 'up' : 'neutral', label: 'ລໍຖ້າກວດສອບ' }"
        footnote="ບັນຊີທີ່ອະນຸມັດແລ້ວ"
      />
      <AppMetricCard
        label="ລໍຖ້າອະນຸມັດ"
        :value="stats.pending"
        :icon="Clock"
        color-class="amber"
        :trend="{ value: stats.suspended, direction: stats.suspended > 0 ? 'down' : 'neutral', label: 'ຖືກລະງັບ' }"
        footnote="ລໍຖ້າການຢືນຢັນ"
      />
      <AppMetricCard
        label="ຖືກລະງັບ (Suspended)"
        :value="stats.suspended"
        :icon="Ban"
        color-class="rose"
        :trend="{ value: stats.suspended, direction: 'neutral', label: 'ລະງັບ' }"
        footnote="ບັນຊີທີ່ຖືກລະງັບການໃຊ້ງານ"
      />
    </div>

    <!-- Tenant Management Table -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-lg">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div class="grid gap-3 sm:grid-cols-[1fr_200px]">
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
              <th class="px-5 py-3.5 font-semibold">Token ໃຊ້ງານ</th>
              <th class="px-5 py-3.5 font-semibold">ສະຖານະ</th>
              <th class="px-5 py-3.5 font-semibold">ສ້າງເມື່ອ</th>
              <th class="px-5 py-3.5 text-right font-semibold">ກະທຳ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="tenant in paginatedTenants" :key="tenant.id" class="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50">
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
                  <Check class="h-3.5 w-3.5" /> Active
                </span>
                <span v-else-if="tenant.status === 'pending'" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Clock class="h-3.5 w-3.5" /> Pending
                </span>
                <span v-else class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  <Ban class="h-3.5 w-3.5" /> Suspended
                </span>
              </td>
              <td class="px-5 py-4 text-slate-500">{{ formatDate(tenant.createdAt) }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-all active:scale-95" type="button" @click="openManagePagesModal(tenant)">
                    <span class="material-icons select-none text-xs">facebook</span> ຈັດການເພຈ
                  </button>
                  <button class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all active:scale-95" type="button" @click="openEditModal(tenant)">
                    <span class="material-icons select-none text-xs">settings</span> ຕັ້ງຄ່າ
                  </button>
                  <button v-if="tenant.status !== 'approved'" class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'approved')">
                    ອະນຸມັດ
                  </button>
                  <button v-if="tenant.status === 'approved'" class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-rose-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'suspended')">
                    ລະງັບ
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
        <article v-for="tenant in paginatedTenants" :key="tenant.id" class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ tenant.name }}</p>
              <p class="truncate text-xs text-slate-500">{{ tenant.email }}</p>
            </div>
            <span v-if="tenant.status === 'approved'" class="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Active</span>
            <span v-else-if="tenant.status === 'pending'" class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Pending</span>
            <span v-else class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Suspended</span>
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
            <button class="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-all active:scale-95" type="button" @click="openManagePagesModal(tenant)">
              ຈັດການເພຈ
            </button>
            <button class="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all active:scale-95" type="button" @click="openEditModal(tenant)">
              ຕັ້ງຄ່າ
            </button>
            <button v-if="tenant.status !== 'approved'" class="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'approved')">ອະນຸມັດ</button>
            <button v-if="tenant.status === 'approved'" class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-rose-500 active:scale-95" type="button" @click="handleStatusChange(tenant.id, 'suspended')">ລະງັບ</button>
          </div>
        </article>
        <div v-if="filteredTenants.length === 0" class="py-12 text-center text-sm text-slate-500">
          <Building2 class="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
          ບໍ່ພົບລາຍຊື່
        </div>
      </div>

      <AppPagination
        v-model="tenantPage"
        :total-items="filteredTenants.length"
        :page-size="tenantPageSize"
      />
    </div>

    <!-- Bootstrap Add Tenant Modal -->
    <Teleport to="body">
      <div 
        class="modal modal-top fade" 
        :class="{ 'show block bg-slate-950/60 backdrop-blur-sm': showAddTenantModal }"
        tabindex="-1"
        role="dialog"
        style="transition: all 0.3s ease; position: fixed; inset: 0; z-index: 1050; overflow-y: auto;"
        v-if="showAddTenantModal"
      >
        <div 
          class="modal-dialog" 
          role="document"
          style="max-width: 600px; margin: 1.75rem auto; transform: translateY(-50px); transition: transform 0.3s ease-out;"
          :style="showAddTenantModal ? 'transform: translateY(0);' : ''"
        >
          <div class="modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="modal-header border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h5 class="modal-title font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ລົງທະບຽນລູກຄ້າໃໝ່
              </h5>
              <button 
                type="button" 
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex p-1" 
                @click="showAddTenantModal = false"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
            
            <form @submit.prevent="handleAddTenant">
              <div class="modal-body px-6 py-6 space-y-4">
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="newTenantName">
                    ຊື່ລູກຄ້າ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="newTenantName"
                    v-model="newTenantName"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="ຕົວຢ່າງ: ສົມຊາຍ ໃຈດີ"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="newTenantEmail">
                    ອີເມວ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="newTenantEmail"
                    v-model="newTenantEmail"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="email"
                    placeholder="somchay@example.com"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="newTenantPassword">
                    ລະຫັດຜ່ານ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="newTenantPassword"
                    v-model="newTenantPassword"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="newTenantPackage">
                    ເລືອກແພັກເກດ <span class="text-rose-500">*</span>
                  </label>
                  <select
                    id="newTenantPackage"
                    v-model="newTenantPackage"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                  >
                    <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
                      {{ pkg.name }} ({{ Number(pkg.price).toLocaleString('lo-LA') }} ກີບ/ເດືອນ)
                    </option>
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="newTenantStatus">
                    ສະຖານະບັນຊີ <span class="text-rose-500">*</span>
                  </label>
                  <select
                    id="newTenantStatus"
                    v-model="newTenantStatus"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                  >
                    <option value="approved">ອະນຸມັດທັນທີ (Active)</option>
                    <option value="pending">ລໍຖ້າອະນຸມັດ (Pending)</option>
                    <option value="suspended">ລະງັບການໃຊ້ງານ (Suspended)</option>
                  </select>
                </div>

                <div v-if="formSuccess" class="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2">
                  <span class="material-icons select-none text-base">check_circle</span>
                  <span>ລົງທະບຽນລູກຄ້າໃໝ່ສຳເລັດ ແລະ ເປີດໃຊ້ງານຮຽບຮ້ອຍແລ້ວ!</span>
                </div>

                <div v-if="formError" class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm flex items-center gap-2">
                  <span class="material-icons select-none text-base">error</span>
                  <span>{{ formError }}</span>
                </div>
              </div>

              <div class="modal-footer border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                <button 
                  type="button" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all" 
                  @click="showAddTenantModal = false"
                >
                  ຍົກເລີກ
                </button>
                <button 
                  type="submit" 
                  :disabled="formLoading || formSuccess"
                  class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus class="h-4 w-4" v-if="!formLoading" />
                  <span class="material-icons select-none text-sm animate-spin" v-else>sync</span>
                  {{ formLoading ? 'ກຳລັງລົງທະບຽນ...' : 'ລົງທະບຽນລູກຄ້າ' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bootstrap Edit Tenant Modal -->
    <Teleport to="body">
      <div 
        class="modal modal-top fade" 
        :class="{ 'show block bg-slate-950/60 backdrop-blur-sm': showEditTenantModal }"
        tabindex="-1"
        role="dialog"
        style="transition: all 0.3s ease; position: fixed; inset: 0; z-index: 1050; overflow-y: auto;"
        v-if="showEditTenantModal"
      >
        <div 
          class="modal-dialog" 
          role="document"
          style="max-width: 600px; margin: 1.75rem auto; transform: translateY(-50px); transition: transform 0.3s ease-out;"
          :style="showEditTenantModal ? 'transform: translateY(0);' : ''"
        >
          <div class="modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="modal-header border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h5 class="modal-title font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">settings</span>
                ຕັ້ງຄ່າຂໍ້ມູນລູກຄ້າ
              </h5>
              <button 
                type="button" 
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex p-1" 
                @click="showEditTenantModal = false"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
            
            <form @submit.prevent="handleEditTenant">
              <div class="modal-body px-6 py-6 space-y-4">
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editTenantName">
                    ຊື່ລູກຄ້າ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="editTenantName"
                    v-model="editTenantName"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="ຕົວຢ່າງ: ສົມຊາຍ ໃຈດີ"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editTenantEmail">
                    ອີເມວ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="editTenantEmail"
                    v-model="editTenantEmail"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="email"
                    placeholder="somchay@example.com"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editTenantPassword">
                    ປ່ຽນລະຫັດຜ່ານໃໝ່ <span class="text-slate-400 font-normal text-xs">(ປະຫວ່າງໄວ້ຖ້າບໍ່ຕ້ອງການປ່ຽນ)</span>
                  </label>
                  <input
                    id="editTenantPassword"
                    v-model="editTenantPassword"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editTenantPackage">
                    ແພັກເກດທີ່ໃຊ້ງານ <span class="text-rose-500">*</span>
                  </label>
                  <select
                    id="editTenantPackage"
                    v-model="editTenantPackage"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                  >
                    <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
                      {{ pkg.name }} ({{ Number(pkg.price).toLocaleString('lo-LA') }} ກີບ/ເດືອນ)
                    </option>
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editTenantStatus">
                    ສະຖານະບັນຊີ <span class="text-rose-500">*</span>
                  </label>
                  <select
                    id="editTenantStatus"
                    v-model="editTenantStatus"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                  >
                    <option value="approved">ອະນຸມັດ ແລະ ເປີດໃຊ້ງານ (Active)</option>
                    <option value="pending">ລໍຖ້າອະນຸມັດ (Pending)</option>
                    <option value="suspended">ລະງັບການໃຊ້ງານ (Suspended)</option>
                  </select>
                </div>

                <div v-if="editFormSuccess" class="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2">
                  <span class="material-icons select-none text-base">check_circle</span>
                  <span>ອັບເດດຂໍ້ມູນ ແລະ ຕັ້ງຄ່າແພັກເກດລູກຄ້າສຳເລັດຮຽບຮ້ອຍ!</span>
                </div>

                <div v-if="editFormError" class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm flex items-center gap-2">
                  <span class="material-icons select-none text-base">error</span>
                  <span>{{ editFormError }}</span>
                </div>
              </div>

              <div class="modal-footer border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                <button 
                  type="button" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all" 
                  @click="showEditTenantModal = false"
                >
                  ຍົກເລີກ
                </button>
                <button 
                  type="submit" 
                  :disabled="editFormLoading || editFormSuccess"
                  class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span class="material-icons select-none text-sm animate-spin" v-if="editFormLoading">sync</span>
                  <span class="material-icons select-none text-sm" v-else>save</span>
                  {{ editFormLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການຕັ້ງຄ່າ' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bootstrap Manage Pages Modal -->
    <Teleport to="body">
      <div 
        class="modal modal-top fade" 
        :class="{ 'show block bg-slate-950/60 backdrop-blur-sm': showManagePagesModal }"
        tabindex="-1"
        role="dialog"
        style="transition: all 0.3s ease; position: fixed; inset: 0; z-index: 1050; overflow-y: auto;"
        v-if="showManagePagesModal"
      >
        <div 
          class="modal-dialog" 
          role="document"
          style="max-width: 800px; margin: 1.75rem auto; transform: translateY(-50px); transition: transform 0.3s ease-out;"
          :style="showManagePagesModal ? 'transform: translateY(0);' : ''"
        >
          <div class="modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="modal-header border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h5 class="modal-title font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">facebook</span>
                ຈັດການເພຈ Facebook: {{ selectedTenant?.name }}
              </h5>
              <button 
                type="button" 
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex p-1" 
                @click="showManagePagesModal = false"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- View 1: Pages List -->
            <div v-if="managePagesView === 'list'" class="modal-body px-6 py-6 space-y-4">
              <div class="flex justify-between items-center">
                <p class="text-sm text-slate-500 dark:text-slate-400">ລາຍການເພຈທີ່ເຊື່ອມຕໍ່ກັບລະບົບ AI</p>
                <button 
                  type="button" 
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1"
                  @click="openAddPageForm"
                >
                  <Plus class="h-4 w-4" /> ເພີ່ມເພຈໃໝ່
                </button>
              </div>

              <div v-if="aiConfigsError" class="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs">
                {{ aiConfigsError }}
              </div>

              <div v-if="pagesLoading" class="flex justify-center items-center py-10">
                <span class="material-icons select-none animate-spin text-indigo-600 text-3xl">sync</span>
              </div>

              <div v-if="pagesError" class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm flex items-center gap-2">
                <span class="material-icons select-none text-base">error</span>
                <span>{{ pagesError }}</span>
              </div>

              <div v-if="!pagesLoading && tenantPages.length === 0" class="py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <span class="material-icons select-none text-4xl text-slate-300 dark:text-slate-600 mb-2">link_off</span>
                <p class="font-semibold text-sm">ຍັງບໍ່ມີເພຈໃດທີ່ເຊື່ອມຕໍ່</p>
                <p class="text-xs text-slate-400 mt-1">ກົດປຸ່ມ "ເພີ່ມເພຈໃໝ່" ເພື່ອເຊື່ອມຕໍ່ Facebook Page</p>
              </div>

              <div v-if="!pagesLoading && tenantPages.length > 0" class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table class="w-full text-left text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th class="px-4 py-3 font-semibold">ຊື່ເພຈ / ID</th>
                      <th class="px-4 py-3 font-semibold">ສະຖານະ Bot</th>
                      <th class="px-4 py-3 text-right font-semibold">ການຈັດການ</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr v-for="page in tenantPages" :key="page.id" class="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50">
                      <td class="px-4 py-3">
                        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ page.fbPageName }}</p>
                        <p class="text-xs text-slate-500">ID: {{ page.fbPageId }}</p>
                        <p class="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          AI: {{ getAiConfigLabel(page.aiConfigId) }}
                        </p>
                      </td>
                      <td class="px-4 py-3">
                        <button
                          class="inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition"
                          :class="page.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'"
                          type="button"
                          @click="handleTogglePageActive(page)"
                        >
                          <span
                            class="h-5 w-5 rounded-full bg-white shadow transition"
                            :class="page.isActive ? 'translate-x-5' : 'translate-x-0'"
                          ></span>
                        </button>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex justify-end gap-2">
                          <button 
                            type="button" 
                            class="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs flex items-center gap-0.5"
                            @click="handleDirectTestConnection(page)"
                          >
                            <span class="material-icons select-none text-xs">offline_bolt</span> ທົດສອບ
                          </button>
                          <button 
                            type="button" 
                            class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs"
                            @click="openEditPageForm(page)"
                          >
                            ແກ້ໄຂ
                          </button>
                          <button 
                            type="button" 
                            class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-xs"
                            @click="handleDeleteTenantPage(page.id)"
                          >
                            ລຶບ
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- View 2: Add/Edit Connection Form -->
            <form v-else @submit.prevent="handleSavePage">
              <div class="modal-body px-6 py-6 space-y-4">
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h6 class="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {{ managePagesView === 'edit' ? 'ແກ້ໄຂການເຊື່ອມຕໍ່ເພຈ' : 'ເພີ່ມເພຈ Facebook ໃໝ່' }}
                  </h6>
                  <button 
                    type="button" 
                    class="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                    @click="managePagesView = 'list'"
                  >
                    <span class="material-icons select-none text-xs">arrow_back</span> ກັບຄືນລາຍການ
                  </button>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300" for="pageFormName">
                    ຊື່ເພຈ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="pageFormName"
                    v-model="pageFormName"
                    class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="ຕົວຢ່າງ: ຮ້ານຂອງຂ້ອຍ"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300" for="pageFormFbId">
                    Facebook Page ID <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="pageFormFbId"
                    v-model="pageFormFbId"
                    class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="123456789012345"
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300" for="pageFormToken">
                    Page Access Token <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="pageFormToken"
                    v-model="pageFormToken"
                    class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="EAAx..."
                    required
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300" for="pageFormAiConfigId">
                    ເລືອກ AI Agent ສຳລັບເພຈ໌ນີ້
                  </label>
                  <select
                    id="pageFormAiConfigId"
                    v-model="pageFormAiConfigId"
                    class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    :disabled="aiConfigsLoading || aiConfigs.length === 0"
                  >
                    <option value="">ໃຊ້ AI ຫຼັກຂອງລະບົບ (ຄ່າເລີ່ມຕົ້ນ)</option>
                    <option v-for="config in aiConfigs" :key="config.id" :value="config.id">
                      {{ getAiConfigLabel(config.id) }}
                    </option>
                  </select>
                  <p v-if="aiConfigsLoading" class="mt-1 text-[11px] text-slate-400">ກຳລັງດຶງລາຍການ AI Config...</p>
                  <div v-else class="mt-1 space-y-1">
                    <p v-if="aiConfigs.length === 0" class="text-[11px] text-rose-500">
                      ບໍ່ພົບ AI Config ໃນລະບົບ. ກະລຸນາໄປທີ່ໜ້າ AI Config ເພື່ອສ້າງການຕັ້ງຄ່າ AI ກ່ອນ.
                    </p>
                    <p v-else-if="!pageFormAiConfigId && activeAiConfigs.length === 0" class="text-[11px] text-amber-500">
                      ⚠️ ປະຈຸບັນຍັງບໍ່ມີ AI ຫຼັກ (Default) ທີ່ຖືກເປີດໃຊ້ງານ. ກະລຸນາເລືອກ AI ສະເພາະ ຫຼື ໄປເປີດໃຊ້ງານ AI Config ຫຼັກກ່ອນ.
                    </p>
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300" for="pageFormKb">
                    ຖານຄວາມຮູ້ AI (Knowledge Base)
                  </label>
                  <textarea
                    id="pageFormKb"
                    v-model="pageFormKb"
                    rows="4"
                    class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    placeholder="ຂໍ້ມູນລາຍລະອຽດກ່ຽວກັບຮ້ານ, ສິນຄ້າ, ຫຼື ບໍລິການ ເພື່ອໃຫ້ AI ໃຊ້ຕອບລູກຄ້າ..."
                  ></textarea>
                </div>

                <div>
                  <button
                    type="button"
                    @click="handleTestTenantPageConnection"
                    :disabled="testLoading || !pageFormFbId.trim() || !pageFormToken.trim()"
                    class="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-bold rounded-lg border border-sky-200 dark:border-sky-500/30 transition-all text-xs disabled:opacity-50"
                  >
                    <span class="material-icons select-none text-xs animate-spin" v-if="testLoading">sync</span>
                    <span class="material-icons select-none text-xs" v-else>offline_bolt</span>
                    {{ testLoading ? 'ກຳລັງກວດສອບ...' : 'ກວດສອບການເຊື່ອມຕໍ່ (Test Connection)' }}
                  </button>

                  <div v-if="testResult" class="mt-2 p-3 rounded-lg border text-xs"
                    :class="testResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 text-rose-800 dark:text-rose-300'">
                    <p class="font-semibold">{{ testResult.success ? 'ການເຊື່ອມຕໍ່ຖືກຕ້ອງ!' : 'ການເຊື່ອມຕໍ່ຫຼົ້ມເຫຼວ' }}</p>
                    <p class="mt-0.5">{{ testResult.message }}</p>
                    <p v-if="testResult.pageName" class="font-bold mt-1">ຊື່ເພຈ: {{ testResult.pageName }}</p>
                  </div>
                </div>

                <div v-if="pageFormSuccess" class="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2">
                  <span class="material-icons select-none text-base">check_circle</span>
                  <span>ບັນທຶກຂໍ້ມູນການເຊື່ອມຕໍ່ເພຈ Facebook ສຳເລັດຮຽບຮ້ອຍ!</span>
                </div>

                <div v-if="pageFormError" class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm flex items-center gap-2">
                  <span class="material-icons select-none text-base">error</span>
                  <span>{{ pageFormError }}</span>
                </div>
              </div>

              <div class="modal-footer border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                <button 
                  type="button" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all" 
                  @click="managePagesView = 'list'"
                >
                  ຍົກເລີກ
                </button>
                <button 
                  type="submit" 
                  :disabled="pageFormLoading || pageFormSuccess"
                  class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span class="material-icons select-none text-sm animate-spin" v-if="pageFormLoading">sync</span>
                  <span class="material-icons select-none text-sm" v-else>save</span>
                  {{ pageFormLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນ' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
