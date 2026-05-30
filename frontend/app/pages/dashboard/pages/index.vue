<script setup lang="ts">
import {
  Bot, CheckCircle2, ExternalLink, Facebook, Plus, Search, Settings, SlidersHorizontal, Trash2, X,
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

// ─── Page state ────────────────────────────────────────────
const pagesList = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const isMockMode = ref(false);

// ─── Search & filter ───────────────────────────────────────
const searchQuery = ref('');
const filterStatus = ref<'all' | 'active' | 'inactive'>('all');

// ─── Add Page modal ────────────────────────────────────────
const showAddForm = ref(false);
const fbPageId = ref('');
const fbPageName = ref('');
const fbPageAccessToken = ref('');
const formError = ref('');
const formLoading = ref(false);

const headers = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

// ─── Filtered pages ────────────────────────────────────────
const filteredPages = computed(() => {
  let list = pagesList.value;

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.fbPageName.toLowerCase().includes(q) ||
        p.fbPageId.toLowerCase().includes(q),
    );
  }

  // Status filter
  if (filterStatus.value === 'active') {
    list = list.filter((p) => p.isActive);
  } else if (filterStatus.value === 'inactive') {
    list = list.filter((p) => !p.isActive);
  }

  return list;
});

// ─── Fetch pages ───────────────────────────────────────────
async function fetchPages() {
  loading.value = true;
  error.value = '';

  if (authStore.token?.startsWith('mock')) {
    isMockMode.value = true;
    pagesList.value = mockStore.getPages();
    loading.value = false;
    return;
  }

  try {
    const data = await $fetch<any[]>(`${apiUrl}/api/pages`, {
      headers: headers.value,
    });
    pagesList.value = data;
  } catch {
    isMockMode.value = true;
    pagesList.value = mockStore.getPages();
  } finally {
    loading.value = false;
  }
}

// ─── Add Page ──────────────────────────────────────────────
function resetForm() {
  fbPageId.value = '';
  fbPageName.value = '';
  fbPageAccessToken.value = '';
  formError.value = '';
  formLoading.value = false;
}

async function handleAddPage() {
  formError.value = '';

  if (!fbPageId.value.trim() || !fbPageName.value.trim()) {
    formError.value = 'ກະລຸນາປ້ອນ Facebook Page ID ແລະ ຊື່ເພຈ.';
    return;
  }

  formLoading.value = true;

  if (isMockMode.value) {
    mockStore.addPage(fbPageId.value.trim(), fbPageName.value.trim(), fbPageAccessToken.value.trim());
    pagesList.value = mockStore.getPages();
    showAddForm.value = false;
    resetForm();
    formLoading.value = false;
    return;
  }

  try {
    await $fetch(`${apiUrl}/api/pages`, {
      method: 'POST',
      headers: headers.value,
      body: {
        fbPageId: fbPageId.value.trim(),
        fbPageName: fbPageName.value.trim(),
        fbPageAccessToken: fbPageAccessToken.value.trim(),
      },
    });
    await fetchPages();
    showAddForm.value = false;
    resetForm();
  } catch (err: any) {
    formError.value = err?.data?.message || 'ບໍ່ສາມາດເພີ່ມເພຈໄດ້. ກະລຸນາລອງໃໝ່.';
  } finally {
    formLoading.value = false;
  }
}

// ─── Toggle active ─────────────────────────────────────────
function togglePageActive(page: any) {
  if (isMockMode.value) {
    mockStore.updatePage(page.id, { isActive: !page.isActive });
    pagesList.value = mockStore.getPages();
    return;
  }

  $fetch(`${apiUrl}/api/pages/${page.id}`, {
    method: 'PUT',
    headers: headers.value,
    body: { isActive: !page.isActive },
  })
    .then(() => fetchPages())
    .catch(() => {
      page.isActive = !page.isActive;
    });
}

// ─── Delete page ───────────────────────────────────────────
async function handleDeletePage(pageId: string) {
  const confirmed = await dialog.open({
    title: 'ລຶບເພຈ',
    message: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບເພຈນີ້? ຂໍ້ມູນ CRM ທັງໝົດຈະຖືກລຶບຖິ້ມ.',
    type: 'warning',
    actions: [
      { label: 'ຍົກເລີກ', value: false, variant: 'secondary' },
      { label: 'ລຶບ', value: true, variant: 'danger' },
    ],
  });

  if (!confirmed) return;

  if (isMockMode.value) {
    mockStore.deletePage(pageId);
    pagesList.value = mockStore.getPages();
    return;
  }

  try {
    await $fetch(`${apiUrl}/api/pages/${pageId}`, {
      method: 'DELETE',
      headers: headers.value,
    });
    await fetchPages();
  } catch {
    // silent
  }
}

// ─── Lifecycle ─────────────────────────────────────────────
onMounted(() => {
  fetchPages();
});
</script>

<template>
  <div>
    <!-- ═══════════════ PAGE HEADER ═══════════════ -->
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-950 dark:text-white">ເພຈ Facebook</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ຈັດການເພຈ Facebook ທີ່ເຊື່ອມຕໍ່ກັບ AI Chatbot ຂອງທ່ານ
        </p>
      </div>
      <button class="app-btn-primary shrink-0" type="button" @click="showAddForm = true">
        <Plus class="h-4 w-4" />
        ເຊື່ອມຕໍ່ເພຈ
      </button>
    </header>

    <!-- ═══════════════ MOCK MODE BANNER ═══════════════ -->
    <section
      v-if="isMockMode"
      class="mb-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        <strong>Mock mode:</strong> backend ຍັງບໍ່ຕອບ, ກຳລັງໃຊ້ຂໍ້ມູນຈຳລອງ.
      </span>
      <button class="app-btn-secondary min-h-9 py-1.5 text-amber-800 dark:text-amber-300" type="button" @click="isMockMode = false; fetchPages();">
        ລອງເຊື່ອມຕໍ່ຄືນ
      </button>
    </section>

    <!-- ═══════════════ ERROR BANNER ═══════════════ -->
    <section
      v-if="error"
      class="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {{ error }}
    </section>

    <!-- ═══════════════ SEARCH & FILTER BAR ═══════════════ -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          class="app-input h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
          type="text"
          placeholder="ຄົ້ນຫາຕາມຊື່ ຫຼື ID ເພຈ..."
        />
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          type="button"
          @click="searchQuery = ''"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <SlidersHorizontal class="h-4 w-4 text-slate-500" />
        <div class="flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          <button
            class="rounded-md px-3 py-1.5 text-xs font-medium transition"
            :class="filterStatus === 'all' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
            type="button"
            @click="filterStatus = 'all'"
          >
            ທັງໝົດ
          </button>
          <button
            class="rounded-md px-3 py-1.5 text-xs font-medium transition"
            :class="filterStatus === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
            type="button"
            @click="filterStatus = 'active'"
          >
            ເປີດໃຊ້
          </button>
          <button
            class="rounded-md px-3 py-1.5 text-xs font-medium transition"
            :class="filterStatus === 'inactive' ? 'bg-slate-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
            type="button"
            @click="filterStatus = 'inactive'"
          >
            ປິດໃຊ້
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ LOADING ═══════════════ -->
    <section v-if="loading" class="app-surface rounded-xl p-12 text-center text-sm text-slate-500">
      <Bot class="mx-auto mb-3 h-8 w-8 animate-pulse text-slate-300 dark:text-slate-600" />
      ກຳລັງໂຫຼດຂໍ້ມູນເພຈ...
    </section>

    <!-- ═══════════════ EMPTY STATE ═══════════════ -->
    <section
      v-else-if="filteredPages.length === 0 && !loading"
      class="app-surface rounded-xl p-12 text-center"
    >
      <Facebook class="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
      <h2 class="mt-4 text-lg font-bold text-slate-950 dark:text-white">
        {{ searchQuery ? 'ບໍ່ພົບເພຈທີ່ກົງກັບການຄົ້ນຫາ' : 'ຍັງບໍ່ມີເພຈທີ່ເຊື່ອມຕໍ່' }}
      </h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {{ searchQuery ? 'ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ລ້າງຕົວກອງ.' : 'ເຊື່ອມຕໍ່ Facebook Page ເພື່ອເລີ່ມຝຶກ AI bot ແລະ ຕິດຕາມ CRM.' }}
      </p>
      <button v-if="!searchQuery" class="app-btn-primary mt-6" type="button" @click="showAddForm = true">
        <Plus class="h-4 w-4" />
        ເຊື່ອມຕໍ່ເພຈ
      </button>
    </section>

    <!-- ═══════════════ PAGES GRID ═══════════════ -->
    <section v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="page in filteredPages"
        :key="page.id"
        class="app-surface group flex min-h-56 flex-col justify-between rounded-xl p-5 transition-all duration-200 hover:shadow-md"
      >
        <div>
          <!-- Header row: name + toggle -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                :class="page.isActive ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
              >
                <Facebook class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <h3 class="truncate text-base font-bold text-slate-950 dark:text-white">{{ page.fbPageName }}</h3>
                <p class="mt-0.5 truncate text-xs text-slate-500">ID: {{ page.fbPageId }}</p>
              </div>
            </div>
            <button
              class="inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition"
              :class="page.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'"
              type="button"
              :title="page.isActive ? 'ປິດ bot' : 'ເປີດ bot'"
              @click="togglePageActive(page)"
            >
              <span
                class="h-6 w-6 rounded-full bg-white shadow transition"
                :class="page.isActive ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>

          <!-- Status badge -->
          <div class="mt-4 flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="page.isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="page.isActive ? 'bg-emerald-500' : 'bg-slate-400'"
              ></span>
              {{ page.isActive ? 'ເປີດໃຊ້ງານ' : 'ປິດໃຊ້ງານ' }}
            </span>
            <span class="text-xs text-slate-400">
              ສ້າງ: {{ new Date(page.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <button
              class="app-btn-secondary h-9 w-9 px-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              type="button"
              :title="'ລຶບ ' + page.fbPageName"
              @click="handleDeletePage(page.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <NuxtLink
            :to="`/dashboard/pages/${page.id}`"
            class="app-btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Settings class="h-4 w-4" />
            ກຳນົດຄ່າ
            <ExternalLink class="h-3 w-3 opacity-60" />
          </NuxtLink>
        </div>
      </article>
    </section>

    <!-- ═══════════════ ADD PAGE MODAL ═══════════════ -->
    <AppModal v-model="showAddForm" title="ເຊື່ອມຕໍ່ Facebook Page" description="ປ້ອນຂໍ້ມູນເພຈ Facebook ຂອງທ່ານເພື່ອເຊື່ອມຕໍ່ກັບ AI Chatbot." size="lg" @close="resetForm">
      <form class="flex flex-col gap-4" @submit.prevent="handleAddPage">
        <!-- Page Name -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" for="fbPageName">
            ຊື່ເພຈ <span class="text-rose-500">*</span>
          </label>
          <input
            id="fbPageName"
            v-model="fbPageName"
            class="app-input h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            type="text"
            placeholder="ຕົວຢ່າງ: ຮ້ານຂອງຂ້ອຍ"
          />
        </div>

        <!-- Page ID -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" for="fbPageId">
            Facebook Page ID <span class="text-rose-500">*</span>
          </label>
          <input
            id="fbPageId"
            v-model="fbPageId"
            class="app-input h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            type="text"
            placeholder="123456789012345"
          />
        </div>

        <!-- Page Access Token -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" for="fbPageAccessToken">
            Page Access Token
          </label>
          <input
            id="fbPageAccessToken"
            v-model="fbPageAccessToken"
            class="app-input h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            type="text"
            placeholder="EAAx... (ເລືອກໄດ້)"
          />

          <!-- Detailed instructions for obtaining Page Access Token -->
          <div class="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
            <h4 class="mb-2 flex items-center gap-1.5 text-sm font-bold text-sky-800 dark:text-sky-300">
              <span>📖</span>
              ວິທີການເອົາ Page Access Token
            </h4>
            <ol class="ml-4 list-decimal space-y-2 text-xs leading-relaxed text-sky-700 dark:text-sky-300">
              <li>
                <strong>ເຂົ້າໄປທີ່ Facebook Developers</strong>
                — ໄປທີ່
                <a class="font-semibold underline underline-offset-2 hover:text-sky-900 dark:hover:text-sky-200" href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">developers.facebook.com</a>
                ແລະ ເຂົ້າສູ່ລະບົບດ້ວຍບັນຊີ Facebook ຂອງທ່ານ.
              </li>
              <li>
                <strong>ສ້າງ ຫຼື ເລືອກ App</strong>
                — ຖ້າທ່ານຍັງບໍ່ມີ App, ໃຫ້ກົດ "Create App" ແລະ ເລືອກປະເພດ "Business".
                ຕັ້ງຊື່ App ຕາມທີ່ຕ້ອງການ ແລະ ກົດ "Create App".
              </li>
              <li>
                <strong>ເພີ່ມ Product "Facebook Login"</strong>
                — ໃນໜ້າ Dashboard ຂອງ App, ຊອກຫາ "Add Product" ແລະ ເລືອກ "Facebook Login".
                ກົດ "Set Up" ເພື່ອເພີ່ມໃສ່ App ຂອງທ່ານ.
              </li>
              <li>
                <strong>ໄປທີ່ Graph API Explorer</strong>
                — ຢູ່ແຖບເບື້ອງຊ້າຍ, ໄປທີ່
                <span class="font-semibold">Tools → Graph API Explorer</span>.
              </li>
              <li>
                <strong>ເລືອກ App ແລະ ຂໍ Token</strong>
                — ຢູ່ມຸມຂວາເທິງຂອງ Graph API Explorer:
                <ul class="ml-4 mt-1 list-disc space-y-1">
                  <li>ເລືອກ App ຂອງທ່ານ (ດຽວກັບທີ່ສ້າງໃນຂັ້ນຕອນທີ 2).</li>
                  <li>ຢູ່ຊ່ອງ "User or Page" ເລືອກ <span class="font-semibold">Page</span>.</li>
                  <li>ກົດປຸ່ມ <span class="font-semibold">"Generate Access Token"</span>.</li>
                  <li>ລະບົບຈະຂໍອະນຸຍາດ (Permissions) — ໃຫ້ອະນຸຍາດ <span class="font-semibold">pages_show_list</span>, <span class="font-semibold">pages_read_engagement</span>, <span class="font-semibold">pages_manage_metadata</span> ແລະ <span class="font-semibold">pages_messaging</span> ສຳລັບການສົ່ງຂໍ້ຄວາມ.</li>
                </ul>
              </li>
              <li>
                <strong>ເລືອກເພຈ ແລະ ຄັດລອກ Token</strong>
                — ຫຼັງຈາກໄດ້ Token ແລ້ວ:
                <ul class="ml-4 mt-1 list-disc space-y-1">
                  <li>ກົດປຸ່ມ <span class="font-semibold">"Add a Page"</span> ແລະ ເລືອກເພຈທີ່ທ່ານຕ້ອງການເຊື່ອມຕໍ່.</li>
                  <li>ກົດປຸ່ມ <span class="font-semibold">"Exchange Token"</span> ເພື່ອແປງ Token ເປັນ Page Access Token ທີ່ມີອາຍຸ 60 ວັນ.</li>
                  <li>ຄັດລອກ Token (ຂຶ້ນຕົ້ນດ້ວຍ <span class="font-mono font-semibold">EAAx...</span>) ແລະ ວາງໃສ່ຊ່ອງດ້ານເທິງ.</li>
                </ul>
              </li>
            </ol>
            <div class="mt-3 border-t border-sky-200 pt-3 dark:border-sky-500/20">
              <p class="text-xs font-medium text-sky-700 dark:text-sky-300">
                💡 ຄຳແນະນຳ: Token ມີອາຍຸ 60 ວັນ ຖ້າໃຊ້ "Exchange Token".
                ເມື່ອ Token ໝົດອາຍຸ, ທ່ານຈະຕ້ອງສ້າງໃໝ່ ແລະ ອັບເດດໃນລະບົບ.
              </p>
            </div>
          </div>
        </div>

        <!-- Form error -->
        <p v-if="formError" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {{ formError }}
        </p>
      </form>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <button class="app-btn-secondary" type="button" @click="showAddForm = false">
            ຍົກເລີກ
          </button>
          <button class="app-btn-primary" type="button" :disabled="formLoading" @click="handleAddPage">
            <Plus v-if="!formLoading" class="h-4 w-4" />
            {{ formLoading ? 'ກຳລັງເຊື່ອມຕໍ່...' : 'ເຊື່ອມຕໍ່ເພຈ' }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
