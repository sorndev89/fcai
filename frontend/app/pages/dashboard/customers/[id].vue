<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const route = useRoute();
const authStore = useAuthStore();
const apiUrl = useApiUrl();

const customerId = route.params.id as string;
const customer = ref<any>(null);
const chatLogs = ref<any[]>([]);
const chatContainer = ref<HTMLElement | null>(null);
const loading = ref(true);

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

watch(chatLogs, () => {
  scrollToBottom();
}, { deep: true });

// Profile Edit form states
const phone = ref('');
const email = ref('');
const shippingAddress = ref('');
const notesForAi = ref('');

const editLoading = ref(false);
const editSuccess = ref(false);
const editError = ref('');

// Viewport layout logic (unified device detection logic)
const { isMobile, isTablet, isDesktop } = useDevice();
const activeMobileTab = ref<'crm' | 'chat'>('crm');

// AI Order Summary states
const showSummaryModal = ref(false);
const analyzing = ref(false);
const summaryResult = ref<any>(null);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

async function handleAnalyzeOrder() {
  analyzing.value = true;
  showSummaryModal.value = true;
  summaryResult.value = null;

  try {
    const res = await $fetch<any>(`${apiUrl}/api/customers/${customerId}/order-summary`, {
      method: 'POST',
      headers: headers.value,
    });
    summaryResult.value = { success: true, hasPurchase: true, summary: res.summary };
  } catch (err: any) {
    console.error('AI Summary failed:', err);
    summaryResult.value = { success: false, hasPurchase: false, summary: 'ບໍ່ສາມາດວິເຄາະຂໍ້ມູນດ້ວຍ AI ໄດ້: ' + (err.data?.error || err.message) };
  } finally {
    analyzing.value = false;
  }
}

async function applyAiSummaryToCrm() {
  if (summaryResult.value?.summary) {
    const s = summaryResult.value.summary;
    if (s.phone) phone.value = s.phone;
    if (s.shippingAddress) shippingAddress.value = s.shippingAddress;
    showSummaryModal.value = false;
    
    // Auto-save the updated values to the database
    await handleSaveProfile();
  }
}

async function loadCustomerDetails() {
  try {
    const data = await $fetch<any>(`${apiUrl}/api/customers/${customerId}`, {
      headers: headers.value,
    });
    customer.value = data;
    phone.value = data.phoneNumber || '';
    email.value = data.email || '';
    shippingAddress.value = data.address || '';
    notesForAi.value = data.notes || '';

    // Load actual DB chat history
    const logs = await $fetch<any[]>(`${apiUrl}/api/customers/${customerId}/chats`, {
      headers: headers.value,
    });
    
    // Flat map: each chatLog record contains a prompt (messageIn) and a reply (messageOut)
    const formatted: any[] = [];
    for (const log of logs) {
      if (log.messageIn) {
        formatted.push({
          id: `${log.id}-in`,
          senderId: data.fbPsid,
          messageText: log.messageIn,
          createdAt: log.createdAt,
        });
      }
      if (log.messageOut) {
        formatted.push({
          id: `${log.id}-out`,
          senderId: 'bot',
          messageText: log.messageOut,
          createdAt: log.createdAt,
        });
      }
    }
    chatLogs.value = formatted;
  } catch (err: any) {
    console.error('Error loading customer details:', err);
    editError.value = 'ບໍ່ສາມາດດຶງຂໍ້ມູນ CRM ຈາກ Backend ໄດ້';
  } finally {
    loading.value = false;
  }
}

async function handleSaveProfile() {
  editLoading.value = true;
  editSuccess.value = false;
  editError.value = '';

  try {
    await $fetch(`${apiUrl}/api/customers/${customerId}`, {
      method: 'PUT',
      headers: headers.value,
      body: {
        phoneNumber: phone.value,
        email: email.value,
        address: shippingAddress.value,
        notes: notesForAi.value,
      },
    });
    editSuccess.value = true;
    setTimeout(() => {
      editSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    console.error('Save profile error:', err);
    editError.value = err.data?.error || 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນ CRM ໄດ້';
  } finally {
    editLoading.value = false;
  }
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString('lo-LA', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

onMounted(() => {
  loadCustomerDetails();
});
</script>

<template>
  <div v-if="loading" class="space-y-6 transition-colors duration-200">
    <div class="flex items-center justify-between">
      <AppSkeletonBlock class="h-4 w-48" />
      <AppSkeletonBlock class="h-9 w-40 rounded-xl" />
    </div>

    <div class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
      <div class="flex items-center gap-4">
        <AppSkeletonBlock class="h-14 w-14 rounded-full" />
        <div class="space-y-2">
          <AppSkeletonBlock class="h-6 w-56" />
          <AppSkeletonBlock class="h-3 w-40" />
        </div>
      </div>
      <AppSkeletonBlock class="h-10 w-60 rounded-xl" />
    </div>

    <div class="grid gap-6 lg:grid-cols-12">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 lg:col-span-7 space-y-4">
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

  <div class="space-y-6 transition-colors duration-200" v-else-if="customer">
    <!-- Breadcrumbs -->
    <div class="flex items-center justify-between">
      <NuxtLink
        :to="`/dashboard/pages/${customer.pageId}`"
        class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <span class="material-icons select-none text-base">arrow_back</span>
        ກັບຄືນຫາໜ້າກຳນົດຄ່າບັອດ
      </NuxtLink>


    </div>

    <!-- Customer Card Header -->
    <div class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
      <div class="flex items-center gap-4">
        <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <span class="material-icons select-none text-3xl text-indigo-600 dark:text-indigo-400">person</span>
        </div>
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {{ customer.firstName }} {{ customer.lastName }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Facebook PSID: {{ customer.fbPsid }}</p>
        </div>
      </div>
      <div>
        <button
          @click="handleAnalyzeOrder"
          class="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <span class="material-icons select-none text-base">auto_awesome</span>
          ວິເຄາະໃບບິນດ້ວຍ AI (AI Order Summary)
        </button>
      </div>
    </div>

    <!-- Unified Device Layout Selector (Mobile / Tablet Tabs) -->
    <div v-if="!isDesktop" class="flex border border-slate-200 dark:border-slate-800 gap-1 p-1 bg-white/60 dark:bg-slate-900/40 backdrop-blur rounded-2xl shadow-sm">
      <button
        type="button"
        @click="activeMobileTab = 'crm'"
        class="flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        :class="activeMobileTab === 'crm' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'"
      >
        <span class="material-icons select-none text-base">notes</span>
        ຂໍ້ມູນ CRM
      </button>
      <button
        type="button"
        @click="activeMobileTab = 'chat'"
        class="flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        :class="activeMobileTab === 'chat' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'"
      >
        <span class="material-icons select-none text-base">chat</span>
        ປະຫວັດການສົນທະນາ
      </button>
    </div>

    <!-- 2 Column Layout (Responsive layout using single logic) -->
    <div :class="isDesktop ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'space-y-6'">
      <!-- Left: Edit Contact Profile & AI Notes (Only show if Desktop or CRM tab active) -->
      <div 
        v-if="isDesktop || activeMobileTab === 'crm'"
        :class="isDesktop ? 'lg:col-span-7 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors' : 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors'"
      >
        <h3 class="font-bold text-lg text-slate-900 dark:text-slate-200 mb-6 border-b border-slate-200 dark:border-slate-800/80 pb-4 flex items-center gap-2">
          <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">notes</span>
          | ຂໍ້ມູນລູກຄ້າ CRM & ບັນທຶກ AI
        </h3>

        <form @submit.prevent="handleSaveProfile" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Phone -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ເບີໂທລະສັບ</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                  <span class="material-icons select-none text-lg">phone</span>
                </span>
                <input
                  type="text"
                  v-model="phone"
                  placeholder="020 99xxxxxx"
                  class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ອີເມວ</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                  <span class="material-icons select-none text-lg">mail</span>
                </span>
                <input
                  type="email"
                  v-model="email"
                  placeholder="customer@email.com"
                  class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          <!-- Shipping Address -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ທີ່ຢູ່ຈັດສົ່ງ</label>
            <div class="relative">
              <span class="absolute top-3 left-3 text-slate-400 dark:text-slate-500">
                <span class="material-icons select-none text-lg">location_on</span>
              </span>
              <textarea
                v-model="shippingAddress"
                rows="2"
                placeholder="ບ້ານ, ເມືອງ, ແຂວງ..."
                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
              ></textarea>
            </div>
          </div>

          <!-- AI Context Notes -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              📝 ບັນທຶກຄວາມຮູ້ສ່ວນຕົວຂອງລູກຄ້າ (ສໍາລັບ AI ໃຊ້ໃນການຕອບ)
            </label>
            <textarea
              v-model="notesForAi"
              rows="5"
              placeholder="ຕົວຢ່າງ:
- ລູກຄ້າຊື່ ສົມພອນ ເປັນລູກຄ້າ VIP.
- ມັກຊື້ແຢມສະຕໍເບີຣີ 2 ກະປຸກທຸກໆວັນເສົາ.
- ບອກ AI ໃຫ້ເວົ້າສຸພາບ ແລະ ແນະນຳຂອງແຖມໃຫ້ລາວ."
              class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm font-sans"
            ></textarea>
            <p class="text-[10px] text-slate-500 mt-1">
              * AI ຈະດຶງຂໍ້ມູນບັນທຶກສ່ວນຕົວນີ້ມາປະກອບການຕອບແຊັດຮ່ວມກັບຖານຂໍ້ມູນຄວາມຮູ້ຫຼັກ.
            </p>
          </div>

          <div v-if="editError" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {{ editError }}
          </div>

          <!-- Submit Button -->
          <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <span v-if="editSuccess" class="text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-1">
              <span class="material-icons select-none text-base">check_circle</span>
              ອັບເດດຂໍ້ມູນ CRM ສໍາເລັດ!
            </span>
            <span v-else></span>

            <button
              type="submit"
              :disabled="editLoading"
              class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md text-sm"
            >
              <span class="material-icons select-none text-base">save</span>
              {{ editLoading ? 'ກຳລັງອັບເດດ...' : 'ບັນທຶກຂໍ້ມູນ CRM' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Right: Chronological Conversation Threads (Only show if Desktop or Chat tab active) -->
      <div 
        v-if="isDesktop || activeMobileTab === 'chat'"
        :class="isDesktop ? 'lg:col-span-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg overflow-hidden flex flex-col h-[650px] transition-colors' : 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-lg overflow-hidden flex flex-col h-[650px] transition-colors'"
      >
        <!-- Log Header -->
        <div class="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 p-4">
          <h3 class="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <span class="material-icons select-none text-indigo-600 dark:text-indigo-400">chat</span>
            ປະຫວັດການສົນທະນາຈິງ
          </h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ລາຍການບັນທຶກແຊັດ Facebook Messenger ທັງໝົດ</p>
        </div>

        <!-- Chat Stream -->
        <div ref="chatContainer" class="flex-grow p-4 overflow-y-auto flex flex-col space-y-4">
          <div v-if="chatLogs.length === 0" class="text-center my-auto p-6 space-y-2 text-slate-500">
            <span class="material-icons select-none text-slate-300 dark:text-slate-600 text-4xl">chat</span>
            <p class="text-xs">ບໍ່ທັນມີປະຫວັດການສົນທະນາເທື່ອ</p>
          </div>

          <div
            v-for="log in chatLogs"
            :key="log.id"
            class="flex flex-col"
            :class="log.senderId === customer.fbPsid ? 'items-end' : 'items-start'"
          >
            <div
              class="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
              :class="log.senderId === customer.fbPsid ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-none'"
            >
              {{ log.messageText }}
            </div>
            <span class="text-[8px] text-slate-400 mt-1 px-1">
              {{ formatTime(log.createdAt) }}
            </span>
        </div>
      </div>
    </div>
  </div>

  <AppModal
      v-model="showSummaryModal"
      title="AI Order Summary"
      description="ສະຫຼຸບລາຍການສັ່ງຊື້ຈາກປະຫວັດແຊັດຂອງລູກຄ້າ."
      size="lg"
    >
      <div v-if="analyzing" class="flex flex-col items-center gap-4 py-12 text-center">
        <div class="h-12 w-12 rounded-full border-4 border-sky-500/20 border-t-sky-600 animate-spin"></div>
        <div>
          <p class="font-bold text-slate-900 dark:text-slate-100">ກຳລັງວິເຄາະປະຫວັດການສົນທະນາ...</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">AI ກຳລັງສະກັດລາຍການສິນຄ້າ, ເບີໂທ ແລະທີ່ຢູ່ຈັດສົ່ງ.</p>
        </div>
      </div>

      <div v-else-if="summaryResult" class="space-y-4">
        <div
          class="rounded-lg border p-3 text-sm font-semibold"
          :class="summaryResult.hasPurchase ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'"
        >
          {{ summaryResult.hasPurchase ? 'ພົບຂໍ້ມູນການສັ່ງຊື້ໃນແຊັດ.' : 'ບໍ່ພົບການຕົກລົງຊື້ຂາຍໃນບົດສົນທະນານີ້.' }}
        </div>

        <pre v-if="typeof summaryResult.summary === 'string'" class="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{{ summaryResult.summary }}</pre>

        <div v-else-if="summaryResult.summary?.products" class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th class="p-3">ລາຍການສິນຄ້າ</th>
                <th class="p-3 text-center">ຈຳນວນ</th>
                <th class="p-3 text-right">ລາຄາ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="item in summaryResult.summary.products" :key="item.name">
                <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">{{ item.name }}</td>
                <td class="p-3 text-center font-bold">{{ item.qty }}</td>
                <td class="p-3 text-right font-bold">{{ item.price.toLocaleString() }} Kip</td>
              </tr>
              <tr class="bg-slate-50 font-bold dark:bg-slate-950">
                <td colspan="2" class="p-3 text-right">ລວມທັງໝົດ</td>
                <td class="p-3 text-right text-sky-700 dark:text-sky-300">{{ summaryResult.summary.totalPrice.toLocaleString() }} Kip</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button class="app-btn-secondary" type="button" @click="showSummaryModal = false">ປິດ</button>
          <button v-if="summaryResult?.hasPurchase" class="app-btn-primary" type="button" @click="applyAiSummaryToCrm">
            ບັນທຶກເຂົ້າ CRM
          </button>
        </div>
      </template>
    </AppModal>
  </div>

  <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
    ບໍ່ພົບຂໍ້ມູນລູກຄ້າ
  </div>
</template>

