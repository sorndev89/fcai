<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const route = useRoute();
const authStore = useAuthStore();
const apiUrl = useApiUrl();

const pageId = route.params.id as string;
const pageData = ref<any>(null);
const customers = ref<any[]>([]);
const loading = ref(true);

// KB Editor state
const knowledgeBase = ref('');
const saveLoading = ref(false);
const saveSuccess = ref(false);
const saveError = ref('');

// Edit Page Connection state
const showEditForm = ref(false);
const editFbPageId = ref('');
const editFbPageName = ref('');
const editFbPageAccessToken = ref('');
const editAiName = ref('');
const editFormError = ref('');
const editFormLoading = ref(false);
const editFormSuccess = ref(false);

// Test Connection state
const testLoading = ref(false);
const testResult = ref<{ success: boolean; message: string; pageName?: string } | null>(null);

// Simulator state
const messages = ref<any[]>([]);
const inputMessage = ref('');
const simLoading = ref(false);
const simUserPsid = ref('test-user-123');
const activeSimulatorTab = ref('chat'); // 'chat' or 'logs'
const debugLogs = ref<string[]>([]);
const chatContainer = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

watch(messages, () => {
  scrollToBottom();
}, { deep: true });

watch(simLoading, () => {
  scrollToBottom();
});

watch(activeSimulatorTab, (val) => {
  if (val === 'chat') {
    scrollToBottom();
  }
});

// Viewport layout logic (unified device detection logic)
const { isMobile, isTablet, isDesktop } = useDevice();
const activeMobileTab = ref<'kb' | 'crm' | 'simulator'>('kb');

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// ─── Token expiry helper ────────────────────────────────────
const tokenExpiryInfo = computed(() => {
  if (!pageData.value) return null;
  const expiresAt = pageData.value.fbTokenExpiresAt;
  const hasOAuth = !!pageData.value.fbUserAccessToken;
  if (!expiresAt) return null;
  
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let status: 'valid' | 'warning' | 'expired' = 'valid';
  if (daysLeft <= 0) status = 'expired';
  else if (daysLeft <= 14) status = 'warning';
  
  return {
    hasOAuth,
    expiryDate,
    daysLeft: Math.max(0, daysLeft),
    status,
    formattedDate: expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
});

async function loadPageDetails() {
  try {
    const data = await $fetch<any>(`${apiUrl}/api/pages/${pageId}`, {
      headers: headers.value,
    });
    pageData.value = data;
    knowledgeBase.value = data.knowledgeBase || '';
    
    // Load page's customers
    const custData = await $fetch<any[]>(`${apiUrl}/api/customers/page/${pageId}`, {
      headers: headers.value,
    });
    customers.value = custData;
  } catch (err: any) {
    console.error('Error loading page details:', err);
  } finally {
    loading.value = false;
  }
}

function openEditModal() {
  if (pageData.value) {
    editFbPageId.value = pageData.value.fbPageId || '';
    editFbPageName.value = pageData.value.fbPageName || '';
    editFbPageAccessToken.value = pageData.value.fbPageAccessToken || '';
    editAiName.value = pageData.value.aiName || '';
  }
  editFormError.value = '';
  editFormSuccess.value = false;
  testResult.value = null;
  showEditForm.value = true;
}

async function handleTestConnection(isSaved = false) {
  testLoading.value = true;
  testResult.value = null;
  try {
    const body = isSaved ? {} : {
      fbPageId: editFbPageId.value.trim(),
      fbPageAccessToken: editFbPageAccessToken.value.trim()
    };
    const endpoint = isSaved 
      ? `${apiUrl}/api/pages/${pageId}/test-connection`
      : `${apiUrl}/api/pages/test-connection`;

    const res = await $fetch<any>(endpoint, {
      method: 'POST',
      headers: headers.value,
      body: isSaved ? undefined : body,
    });

    testResult.value = {
      success: true,
      message: res.message || 'ການເຊື່ອມຕໍ່ສຳເລັດແລ້ວ!',
      pageName: res.pageName,
    };
  } catch (err: any) {
    testResult.value = {
      success: false,
      message: err.data?.error || 'ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບ Facebook Page ໄດ້.',
    };
  } finally {
    testLoading.value = false;
  }
}

async function handleUpdatePage() {
  editFormError.value = '';
  editFormSuccess.value = false;

  if (!editFbPageId.value.trim() || !editFbPageName.value.trim()) {
    editFormError.value = 'ກະລຸນາປ້ອນ Facebook Page ID ແລະ ຊື່ເພຈ.';
    return;
  }

  editFormLoading.value = true;

  try {
    await $fetch(`${apiUrl}/api/pages/${pageId}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        fbPageId: editFbPageId.value.trim(),
        fbPageName: editFbPageName.value.trim(),
        fbPageAccessToken: editFbPageAccessToken.value.trim(),
        aiName: editAiName.value.trim(),
      },
    });
    
    editFormSuccess.value = true;
    await loadPageDetails();
    setTimeout(() => {
      showEditForm.value = false;
    }, 1500);
  } catch (err: any) {
    editFormError.value = err.data?.error || 'ບໍ່ສາມາດອັບເດດຂໍ້ມູນໄດ້';
  } finally {
    editFormLoading.value = false;
  }
}

async function handleSaveKB() {
  saveLoading.value = true;
  saveSuccess.value = false;
  saveError.value = '';

  try {
    await $fetch(`${apiUrl}/api/pages/${pageId}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        knowledgeBase: knowledgeBase.value,
      },
    });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    console.error('Save KB error:', err);
    saveError.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້';
  } finally {
    saveLoading.value = false;
  }
}

async function handleSimulateSend() {
  if (!inputMessage.value.trim()) return;

  const userMsg = inputMessage.value;
  inputMessage.value = '';
  
  // Add to local chat simulator UI
  messages.value.push({
    id: Date.now().toString(),
    senderId: simUserPsid.value,
    messageText: userMsg,
    createdAt: new Date().toISOString(),
  });

  simLoading.value = true;
  debugLogs.value.push(`[Simulator] ສົ່ງຂໍ້ຄວາມຈາກຜູ້ໃຊ້: "${userMsg}" (PSID: ${simUserPsid.value})`);

  try {
    const res = await $fetch<{ reply: string; debug?: any }>(`${apiUrl}/webhook/facebook/simulate`, {
      method: 'POST',
      headers: headers.value,
      body: {
        fbPageId: pageData.value.fbPageId,
        senderPsid: simUserPsid.value,
        messageText: userMsg,
      },
    });

    messages.value.push({
      id: (Date.now() + 1).toString(),
      senderId: 'bot',
      messageText: res.reply,
      createdAt: new Date().toISOString(),
    });

    debugLogs.value.push(`[API Server] ໄດ້ຮັບຄຳຕອບ: "${res.reply}"`);
    if (res.debug) {
      debugLogs.value.push(`[AI Query Context] ${JSON.stringify(res.debug)}`);
    }

    // Refresh the customers CRM list from the backend
    try {
      const custData = await $fetch<any[]>(`${apiUrl}/api/customers/page/${pageId}`, {
        headers: headers.value,
      });
      customers.value = custData;
    } catch (refreshErr) {
      console.error('Failed to refresh customers list:', refreshErr);
    }
  } catch (err: any) {
    console.error('Simulation error:', err);
    debugLogs.value.push(`[Error] ບໍ່ສາມາດເຊື່ອມຕໍ່ຫາ backend simulator: ${err.message}`);
  } finally {
    simLoading.value = false;
  }
}

onMounted(() => {
  loadPageDetails();
});
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <AppSkeletonBlock class="h-4 w-4 rounded-full" />
        <AppSkeletonBlock class="h-4 w-44" />
      </div>
      <AppSkeletonBlock class="h-9 w-28 rounded-xl" />
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div class="space-y-3">
        <AppSkeletonBlock class="h-4 w-36" />
        <AppSkeletonBlock class="h-8 w-80 max-w-full" />
        <AppSkeletonBlock class="h-3 w-64 max-w-full" />
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-12">
      <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 lg:col-span-7">
        <AppSkeletonBlock class="h-6 w-64" />
        <div class="grid gap-4 md:grid-cols-2">
          <AppSkeletonBlock v-for="n in 4" :key="n" class="h-16 rounded-xl" />
        </div>
        <AppSkeletonBlock class="h-44 rounded-2xl" />
      </div>

      <div class="space-y-4 lg:col-span-5">
        <AppSkeletonBlock class="h-64 rounded-2xl" />
        <AppSkeletonBlock class="h-96 rounded-2xl" />
      </div>
    </div>
  </div>

  <div class="space-y-6 transition-colors duration-200" v-else-if="pageData">
    <!-- Breadcrumbs -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/dashboard"
        class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <span class="material-icons select-none text-base">arrow_back</span>
        ກັບຄືນຫາໜ້າຫຼັກ
      </NuxtLink>


    </div>

    <!-- Header info card -->
    <div class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
      <div>
        <h2 class="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {{ pageData.fbPageName }}
        </h2>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
          <span>Facebook Page ID: {{ pageData.fbPageId }}</span>
          <span class="inline-flex items-center gap-1">
            <span class="material-icons text-sm text-indigo-500">smart_toy</span>
            ຊື່ AI: <strong class="text-indigo-600 dark:text-indigo-400">{{ pageData.aiName || 'ຜູ້ຊ່ວຍ AI' }}</strong>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          @click="handleTestConnection(true)"
          :disabled="testLoading"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-bold rounded-xl border border-sky-200 dark:border-sky-500/30 transition-all text-xs"
        >
          <span class="material-icons select-none text-sm animate-spin" v-if="testLoading">sync</span>
          <span class="material-icons select-none text-sm" v-else>check_circle_outline</span>
          {{ testLoading ? 'ກຳລັງທົດສອບ...' : 'ທົດສອບເຊື່ອມຕໍ່' }}
        </button>

        <button
          type="button"
          @click="openEditModal"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-xs"
        >
          <span class="material-icons select-none text-sm">edit</span>
          ແກ້ໄຂການເຊື່ອມຕໍ່
        </button>

        <span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
          :class="pageData.isActive ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'">
          <span class="w-1.5 h-1.5 rounded-full" :class="pageData.isActive ? 'bg-emerald-500' : 'bg-rose-500'"></span>
          {{ pageData.isActive ? 'ບັອດເປີດໃຊ້ງານຢູ່' : 'ບັອດປິດການໃຊ້ງານ' }}
        </span>

        <!-- Token Expiry Badge (for OAuth-connected pages) -->
        <span
          v-if="tokenExpiryInfo"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border"
          :class="tokenExpiryInfo.status === 'expired'
            ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
            : tokenExpiryInfo.status === 'warning'
              ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
              : 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30'"
          :title="`ໝົດອາຍຸ: ${tokenExpiryInfo.formattedDate}`"
        >
          <span class="material-icons select-none text-sm">
            {{ tokenExpiryInfo.status === 'expired' ? 'error' : tokenExpiryInfo.status === 'warning' ? 'warning' : 'verified_user' }}
          </span>
          <span>
            <template v-if="tokenExpiryInfo.status === 'expired'">
              Token ໝົດອາຍຸ
            </template>
            <template v-else-if="tokenExpiryInfo.status === 'warning'">
              Token ໝົດອາຍຸໃນ {{ tokenExpiryInfo.daysLeft }} ວັນ
            </template>
            <template v-else>
              Token ໃຊ້ໄດ້ {{ tokenExpiryInfo.daysLeft }} ວັນ
            </template>
          </span>
        </span>
      </div>
    </div>

    <!-- Live test connection result banner -->
    <div v-if="testResult && !showEditForm" class="p-4 rounded-2xl border transition-all duration-350 flex items-center justify-between"
      :class="testResult.success 
        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'">
      <div class="flex items-center gap-2.5">
        <span class="material-icons select-none animate-pulse" :class="testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
          {{ testResult.success ? 'check_circle' : 'error' }}
        </span>
        <span class="text-sm">
          <strong>ຜົນການທົດສອບ:</strong> {{ testResult.message }} 
          <span v-if="testResult.pageName" class="underline font-bold">({{ testResult.pageName }})</span>
        </span>
      </div>
      <button type="button" @click="testResult = null" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex">
        <span class="material-icons select-none text-base">close</span>
      </button>
    </div>

    <!-- Bootstrap Edit & Test Modal (slides from top) -->
    <Teleport to="body">
      <div 
        class="modal modal-top fade" 
        :class="{ 'show block bg-slate-950/60 backdrop-blur-sm': showEditForm }"
        tabindex="-1"
        role="dialog"
        style="transition: all 0.3s ease; position: fixed; inset: 0; z-index: 1050; overflow-y: auto;"
        v-if="showEditForm"
      >
        <div 
          class="modal-dialog" 
          role="document"
          style="max-width: 600px; margin: 1.75rem auto; transform: translateY(-50px); transition: transform 0.3s ease-out;"
          :style="showEditForm ? 'transform: translateY(0);' : ''"
        >
          <div class="modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="modal-header border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h5 class="modal-title font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">edit</span>
                ແກ້ໄຂການເຊື່ອມຕໍ່ Facebook Page
              </h5>
              <button 
                type="button" 
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex p-1" 
                @click="showEditForm = false"
              >
                <span class="material-icons select-none">close</span>
              </button>
            </div>
            
            <form @submit.prevent="handleUpdatePage">
              <div class="modal-body px-6 py-6 space-y-4">
                <!-- Page Name -->
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editFbPageName">
                    ຊື່ເພຈ <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="editFbPageName"
                    v-model="editFbPageName"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="ຕົວຢ່າງ: ຮ້ານຂອງຂ້ອຍ"
                  />
                </div>

                <!-- AI Name -->
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editAiName">
                    ຊື່ AI ປະຈຳເພຈ໌ (AI Name)
                  </label>
                  <input
                    id="editAiName"
                    v-model="editAiName"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm"
                    type="text"
                    placeholder="ຕົວຢ່າງ: ຜູ້ຊ່ວຍ AI"
                  />
                </div>

                <!-- Page ID -->
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editFbPageId">
                    Facebook Page ID <span class="text-rose-500">*</span>
                  </label>
                  <input
                    id="editFbPageId"
                    v-model="editFbPageId"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm font-mono"
                    type="text"
                    placeholder="123456789012345"
                  />
                </div>

                <!-- Page Access Token -->
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300" for="editFbPageAccessToken">
                    Page Access Token
                  </label>
                  <textarea
                    id="editFbPageAccessToken"
                    v-model="editFbPageAccessToken"
                    rows="3"
                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm font-mono"
                    placeholder="EAAx... (ເລືອກໄດ້)"
                  ></textarea>
                </div>

                <!-- Live Test Connection inside Modal -->
                <div class="pt-2">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      @click="handleTestConnection(false)"
                      :disabled="testLoading"
                      class="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-bold rounded-xl border border-sky-200 dark:border-sky-500/30 transition-all text-xs"
                    >
                      <span class="material-icons select-none text-sm animate-spin" v-if="testLoading">sync</span>
                      <span class="material-icons select-none text-sm" v-else>offline_bolt</span>
                      {{ testLoading ? 'ກຳລັງກວດສອບ...' : 'ກວດສອບການເຊື່ອມຕໍ່ (Test Connection)' }}
                    </button>
                  </div>

                  <!-- Test result alert inside Modal -->
                  <div v-if="testResult" class="mt-3 p-3.5 rounded-xl border text-xs"
                    :class="testResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250/20 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-250/20 text-rose-800 dark:text-rose-300'">
                    <div class="flex items-start gap-2">
                      <span class="material-icons select-none text-base mt-0.5" :class="testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ testResult.success ? 'check_circle' : 'error' }}
                      </span>
                      <div>
                        <strong class="block mb-0.5">{{ testResult.success ? 'ການເຊື່ອມຕໍ່ຖືກຕ້ອງ!' : 'ການເຊື່ອມຕໍ່ຫຼົ້ມເຫຼວ' }}</strong>
                        <p class="leading-relaxed">{{ testResult.message }}</p>
                        <p v-if="testResult.pageName" class="mt-1 font-bold">ຊື່ເພຈ: {{ testResult.pageName }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Messages -->
                <p v-if="editFormError" class="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-350">
                  {{ editFormError }}
                </p>
                <p v-if="editFormSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-350">
                  ອັບເດດຂໍ້ມູນການເຊື່ອມຕໍ່ສຳເລັດແລ້ວ!
                </p>
              </div>

              <div class="modal-footer border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                <button 
                  type="button" 
                  class="px-4 py-2 rounded-xl text-sm font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all" 
                  @click="showEditForm = false"
                >
                  ຍົກເລີກ
                </button>
                <button 
                  type="submit" 
                  :disabled="editFormLoading"
                  class="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 shadow-md"
                >
                  {{ editFormLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການແກ້ໄຂ' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>


    <!-- Unified Device Layout Selector (Mobile / Tablet Tabs) -->
    <div v-if="!isDesktop" class="flex border border-slate-200 dark:border-slate-800 gap-1 p-1 bg-white/60 dark:bg-slate-900/40 backdrop-blur rounded-2xl shadow-sm">
      <button
        type="button"
        @click="activeMobileTab = 'kb'"
        class="flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        :class="activeMobileTab === 'kb' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'"
      >
        <span class="material-icons select-none text-base">menu_book</span>
        ຖານຂໍ້ມູນ
      </button>
      <button
        type="button"
        @click="activeMobileTab = 'crm'"
        class="flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        :class="activeMobileTab === 'crm' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'"
      >
        <span class="material-icons select-none text-base">group</span>
        ລູກຄ້າ CRM ({{ customers.length }})
      </button>
      <button
        type="button"
        @click="activeMobileTab = 'simulator'"
        class="flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        :class="activeMobileTab === 'simulator' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'"
      >
        <span class="material-icons select-none text-base">terminal</span>
        ເຄື່ອງທົດລອງ
      </button>
    </div>

    <!-- Main Workspace Grid (Responsive layout using single logic) -->
    <div :class="isDesktop ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'space-y-6'">
      <!-- Left Column (Knowledge Base & CRM Customers) -->
      <div 
        v-if="isDesktop || activeMobileTab === 'kb' || activeMobileTab === 'crm'" 
        :class="isDesktop ? 'lg:col-span-7 space-y-6' : 'space-y-6'"
      >
        <!-- Left: Knowledge Base Training Config (Only show if Desktop or KB tab active) -->
        <div 
          v-if="isDesktop || activeMobileTab === 'kb'" 
          class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors"
        >
          <div class="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <h3 class="font-bold text-lg text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">menu_book</span>
              ຝຶກສອນ AI: ຖານຂໍ້ມູນຄວາມຮູ້ຮ້ານຄ້າ
            </h3>
          </div>

          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            ປ້ອນຂໍ້ມູນກ່ຽວກັບຮ້ານຄ້າຂອງທ່ານ ເຊັ່ນ: ຂໍ້ມູນຮ້ານ, ເວລາເປີດ/ປິດ, ລາຍການສິນຄ້າ, ລາຄາ, ວິທີການຈັດສົ່ງ, ນະໂຍບາຍການຊຳລະ, ນະໂຍບາຍການຄືນເງິນ ແລະ ຂໍ້ມູນທີ່ລູກຄ້າມັກຖາມເລື້ອຍໆ.
            <strong class="block mt-2">ຄຳແນະນຳ:</strong> ແບ່ງຂໍ້ມູນເປັນໝວດໝູ່ດ້ວຍ <code>=== ຫົວຂໍ້ ===</code>, ຂຽນໃຫ້ຊັດເຈນ ແລະ ຄົບຖ້ວນ. AI ຈະອ່ານຂໍ້ມູນນີ້ເພື່ອຕອບແຊັດລູກຄ້າ ແລະ ຈະບໍ່ຕອບຂໍ້ມູນທີ່ບໍ່ມີໃນນີ້ເດັດຂາດ.
          </p>

          <!-- Link to AI Training Guide standalone page -->
          <NuxtLink
            to="/dashboard/ai-training-guide"
            class="mb-4 flex items-center justify-between gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all group"
          >
            <span class="flex items-center gap-2">
              <span class="material-icons select-none text-base">lightbulb</span>
              ເບິ່ງຄູ່ມືການຝຶກສອນ AI: ຂໍ້ມູນແບບໃດຄວນ / ບໍ່ຄວນໃສ່?
            </span>
            <span class="material-icons select-none text-base transition-transform group-hover:translate-x-0.5">arrow_forward</span>
          </NuxtLink>

          <form @submit.prevent="handleSaveKB" class="space-y-4">
            <textarea
              v-model="knowledgeBase"
              rows="16"
              placeholder="=== ຂໍ້ມູນຮ້ານຄ້າ (ບັງຄັບ) ===
ຊື່ຮ້ານ: ສະບາຍດີຊົອບ
ທີ່ຢູ່: ບ້ານສີຫອມ, ເມືອງຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ
ເບີໂທຕິດຕໍ່: 020 12345678
ເວັບໄຊ: www.sabaideeshop.la

=== ເວລາເປີດ-ປິດ (ບັງຄັບ) ===
ວັນຈັນ ຫາ ວັນສຸກ: 8:00 - 17:00 ໂມງ
ວັນເສົາ: 9:00 - 12:00 ໂມງ
ວັນອາທິດ ແລະ ວັນພັກລັດຖະການ: ປິດ

=== ສິນຄ້າ ແລະ ລາຄາ (ບັງຄັບ) ===
1. ແຢມສະຕໍເບີຣີປອດສານພິດ (250g) — 45,000 ກີບ/ກະປຸກ
2. ເຂົ້າຈີ່ຝຣັ່ງເສັ້ນໃຫຍ່ (200g) — 20,000 ກີບ/ອັນ
3. ນ້ຳເຜິ້ງດອກໄມ້ປ່າ 100% (500ml) — 80,000 ກີບ/ຂວດ
4. ຊາໃບໝາກນາວຫອມ (50g) — 25,000 ກີບ/ຖົງ

=== ສິນຄ້າທີ່ຮ້ານບໍ່ມີຂາຍ (ແນະນຳ) ===
- ຮ້ານບໍ່ມີຄຸກກີຊັອກໂກແລັດຂາຍ
- ຮ້ານບໍ່ມີນ້ຳດື່ມຫຼາຍຊະນິດ
- ຮ້ານບໍ່ຮັບສັ່ງເຄັກຕາມໃບສັ່ງ

=== ນະໂຍບາຍການຈັດສົ່ງ (ບັງຄັບ) ===
- ສົ່ງຟຣີໃນນະຄອນຫຼວງວຽງຈັນ ເມື່ອຊື້ຄົບ 3 ລາຍການຂຶ້ນໄປ
- ນອກເຂດນະຄອນຫຼວງ: ຄ່າສົ່ງ 20,000 ກີບ
- ໃຊ້ເວລາຈັດສົ່ງ 1-3 ວັນທຳການ (ນະຄອນຫຼວງ) ຫຼື 3-7 ວັນ (ຕ່າງແຂວງ)
- ບໍລິການຈັດສົ່ງດ່ວນ (ພາຍໃນ 24 ຊົ່ວໂມງ) ມີຄ່າເພີ່ມ 15,000 ກີບ

=== ນະໂຍບາຍການຊຳລະເງິນ (ບັງຄັບ) ===
- ໂອນຜ່ານທະນາຄານ: BCEL ເລກບັນຊີ 1234567890 (ຊື່: ສະບາຍດີ ຊົອບ)
- ເກັບປາຍທາງຈ່າຍ (COD): ມີບໍລິການສະເພາະໃນເຂດນະຄອນຫຼວງ
- ໂອນຜ່ານທະນາຄານກະສິກອນ: ເລກບັນຊີ 9876543210

=== ນະໂຍບາຍການຄືນເງິນ (ແນະນຳ) ===
- ສາມາດຄືນເງິນໄດ້ພາຍໃນ 7 ວັນ ຫຼັງໄດ້ຮັບສິນຄ້າ
- ສິນຄ້າຕ້ອງຢູ່ໃນສະພາບເດີມ ຍັງບໍ່ໄດ້ເປີດໃຊ້
- ລູກຄ້າຮັບຜິດຊອບຄ່າສົ່ງຄືນ

=== ຄຳຖາມທີ່ລູກຄ້າມັກຖາມ (FAQ) ===
- ຖາມ: ມີສ່ວນຫຼຸດບໍ່?
  ຕອບ: ປັດຈຸບັນຮ້ານຍັງບໍ່ມີໂປຣໂມຊັນພິເສດ, ແຕ່ມີສົ່ງຟຣີເມື່ອຊື້ຄົບ 3 ລາຍການ.
- ຖາມ: ສິນຄ້າໝົດອາຍຸດົນປານໃດ?
  ຕອບ: ແຢມສະຕໍເບີຣີ ໝົດອາຍຸ 6 ເດືອນ, ນ້ຳເຜິ້ງ ໝົດອາຍຸ 2 ປີ.
- ຖາມ: ສັ່ງແລ້ວຍົກເລີກໄດ້ບໍ່?
  ຕອບ: ສາມາດຍົກເລີກໄດ້ກ່ອນທີ່ຮ້ານຈະຈັດສົ່ງ (ພາຍໃນ 2 ຊົ່ວໂມງຫຼັງສັ່ງ)."
              class="w-full px-4 py-3 bg-slate-950/5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm font-mono leading-relaxed tracking-tight"
            ></textarea>

            <div v-if="saveError" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {{ saveError }}
            </div>

            <div class="flex items-center justify-between">
              <span v-if="saveSuccess" class="text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <span class="material-icons select-none text-base">check_circle</span>
                ບັນທຶກຂໍ້ມູນສຳເລັດແລ້ວ!
              </span>
              <span v-else></span>

              <button
                type="submit"
                :disabled="saveLoading"
                class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md text-sm"
              >
                <span class="material-icons select-none text-base">save</span>
                {{ saveLoading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນຄວາມຮູ້' }}
              </button>
            </div>
          </form>
        </div>

        <!-- CRM Linkage info list (Only show if Desktop or CRM tab active) -->
        <div 
          v-if="isDesktop || activeMobileTab === 'crm'" 
          class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors"
        >
          <h3 class="font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">group</span>
            ລາຍຊື່ລູກຄ້າ CRM ຂອງເພຈ໌ ({{ customers.length }} ຄົນ)
          </h3>

          <div v-if="customers.length === 0" class="text-center py-8 text-slate-500 text-sm bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/50 rounded-xl">
            ບໍ່ທັນມີຂໍ້ມູນລູກຄ້າເທື່ອ. ລອງສົນທະນາກັບ AI ຢູ່ກ່ອງຈຳລອງເພື່ອສ້າງລູກຄ້າໃໝ່!
          </div>

          <div v-else class="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-[300px] overflow-y-auto pr-2 space-y-2">
            <div
              v-for="customer in customers"
              :key="customer.id"
              class="flex justify-between items-center py-3 bg-slate-50 dark:bg-slate-950/30 px-3 rounded-xl border border-slate-200 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-slate-200">{{ customer.firstName }} {{ customer.lastName }}</h4>
                <p class="text-xs text-slate-500">PSID: {{ customer.fbPsid }}</p>
              </div>

              <NuxtLink
                :to="`/dashboard/customers/${customer.id}`"
                class="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-600/10 px-3 py-1.5 rounded-xl border border-indigo-250/20 hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all"
              >
                ເບິ່ງ CRM & ປະຫວັດແຊັດ
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column (Chatbot Simulator) (Only show if Desktop or Simulator tab active) -->
      <div 
        v-if="isDesktop || activeMobileTab === 'simulator'" 
        :class="isDesktop ? 'lg:col-span-5' : 'w-full'"
      >
        <div class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg overflow-hidden flex flex-col h-[650px] transition-colors">
          <!-- Simulator Header -->
          <div class="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 p-4">
            <h3 class="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">terminal</span>
              ເຄື່ອງທົດລອງແຊັດບັອດຈຳລອງ (Simulator)
            </h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ທົດສອບການຕອບຄຳຖາມຂອງ AI ໂດຍບໍ່ຕ້ອງເຊື່ອມຕໍ່ Facebook ແອັບຈິງ</p>
          </div>

          <!-- Configuration options -->
          <div class="bg-slate-100/50 dark:bg-slate-950/40 px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-500 dark:text-slate-400">ID ຜູ້ໃຊ້ຈຳລອງ:</span>
              <input
                type="text"
                v-model="simUserPsid"
                class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-slate-900 dark:text-slate-200 focus:outline-none w-[100px] font-mono text-[10px]"
              />
            </div>
            
            <div class="flex gap-2">
              <button
                @click="activeSimulatorTab = 'chat'"
                class="px-2.5 py-1 rounded font-bold transition-all"
                :class="activeSimulatorTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
              >
                ໜ້າແຊັດ
              </button>
              <button
                @click="activeSimulatorTab = 'logs'"
                class="px-2.5 py-1 rounded font-bold transition-all"
                :class="activeSimulatorTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
              >
                Debug Logs ({{ debugLogs.length }})
              </button>
            </div>
          </div>

          <!-- Simulator Tab Content -->
          <div ref="chatContainer" class="flex-grow p-4 overflow-y-auto flex flex-col space-y-4" v-if="activeSimulatorTab === 'chat'">
            <!-- Helper Instruction if chat is empty -->
            <div v-if="messages.length === 0" class="text-center my-auto p-6 space-y-3">
              <span class="material-icons select-none text-slate-300 dark:text-slate-600 text-5xl">auto_awesome</span>
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">ເລີ່ມຕົ້ນສົນທະນາທົດສອບ</h4>
              <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                ລອງພິມຖາມຄຳຖາມ ເຊັ່ນ: "ສະບາຍດີ ເປີດຮ້ານວັນໃດແດ່?" ຫຼື "ມີແຢມສະຕໍເບີຣີຂາຍບໍ່?" ເພື່ອທົດສອບວ່າ AI ຕອບຕາມຖານຄວາມຮູ້ຖືກຕ້ອງຫຼືບໍ່.
              </p>
            </div>

            <!-- Messages Stream -->
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex flex-col"
              :class="msg.senderId === 'bot' ? 'items-start' : 'items-end'"
            >
              <div
                class="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                :class="msg.senderId === 'bot' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-none' : 'bg-indigo-600 text-white rounded-tr-none'"
              >
                {{ msg.messageText }}
              </div>
              <span class="text-[9px] text-slate-400 mt-1 px-1">
                {{ msg.senderId === 'bot' ? 'AI Bot' : 'ລູກຄ້າ' }}
              </span>
            </div>

            <div v-if="simLoading" class="flex items-center gap-2 text-slate-500 text-xs italic pl-2">
              <div class="flex gap-1">
                <span class="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                <span class="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span class="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              ບັອດ AI ກຳລັງວິເຄາະຫາຄຳຕອບ...
            </div>
          </div>

          <!-- Debug Console Logs Tab -->
          <div class="flex-grow p-4 bg-slate-100/60 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-900 font-mono text-[11px] overflow-y-auto space-y-1.5 text-slate-700 dark:text-slate-300" v-else>
            <div v-if="debugLogs.length === 0" class="text-slate-500 text-center py-12">
              ຍັງບໍ່ທັນມີຂໍ້ມູນ debug ເທື່ອ. ພິມແຊັດເພື່ອເບິ່ງຂັ້ນຕອນການທຳງານຂອງ AI RAG.
            </div>
            <div v-for="(log, idx) in debugLogs" :key="idx" class="border-b border-slate-200 dark:border-slate-900/60 pb-1.5 leading-relaxed">
              {{ log }}
            </div>
          </div>

          <!-- Message Input area -->
          <form @submit.prevent="handleSimulateSend" class="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
            <input
              type="text"
              v-model="inputMessage"
              placeholder="ພິມຂໍ້ຄວາມທົດສອບຢູ່ບ່ອນນີ້..."
              :disabled="simLoading"
              class="flex-grow px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <button
              type="submit"
              :disabled="simLoading || !inputMessage.trim()"
              class="bg-indigo-600 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="material-icons select-none">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
    ບໍ່ພົບຂໍ້ມູນເພຈ
  </div>
</template>
