<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useMockStore } from '~/stores/mockData';

definePageMeta({
  layout: 'default',
});

const authStore = useAuthStore();
const mockStore = useMockStore();
const router = useRouter();
const apiUrl = useApiUrl();

const name = ref('');
const email = ref('');
const password = ref('');
const selectedPackageId = ref('pkg-starter');
const error = ref('');
const successMessage = ref('');
const loading = ref(false);
const packagesList = ref<any[]>([]);

onMounted(() => {
  mockStore.initStore();
  if (authStore.isAuthenticated) {
    if (authStore.user?.role === 'admin') {
      navigateTo('/admin');
    } else {
      navigateTo('/dashboard');
    }
  }
  
  // Load packages
  packagesList.value = mockStore.getPackages();
});

async function handleRegister() {
  if (!name.value || !email.value || !password.value || !selectedPackageId.value) {
    error.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ ແລະ ເລືອກແພັກເກດ';
    return;
  }

  error.value = '';
  successMessage.value = '';
  loading.value = true;

  try {
    const res = await $fetch<{ message: string; user: any }>(
      `${apiUrl}/api/auth/register`,
      {
        method: 'POST',
        body: {
          name: name.value,
          email: email.value,
          password: password.value,
          packageId: selectedPackageId.value,
        },
      }
    );

    successMessage.value = 'ລົງທະບຽນສຳເລັດ! ກະລຸນາລໍຖ້າຜູ້ດູແລລະບົບອານຸມັດການນຳໃຊ້.';
  } catch (err: any) {
    console.warn('ບໍ່ສາມາດເຊື່ອມຕໍ່ຫາ Backend ໄດ້. ເປີດໃຊ້ງານໂໝດ Mockup Data ສໍາລັບການລົງທະບຽນ.');
    
    // Simulate register by appending user in mockData
    const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    
    // Check if user exists
    if (mockUsers.some((u: any) => u.email.toLowerCase() === email.value.toLowerCase())) {
      error.value = 'ອີເມວນີ້ຖືກລົງທະບຽນໃນລະບົບແລ້ວ';
      loading.value = false;
      return;
    }

    const newMockUser = {
      id: `tenant-${Date.now()}`,
      email: email.value,
      name: name.value,
      role: 'tenant',
      status: 'pending',
      packageId: selectedPackageId.value,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newMockUser);
    localStorage.setItem('mock_users', JSON.stringify(mockUsers));
    mockStore.initStore(); // Reload stores

    successMessage.value = 'ລົງທະບຽນສຳເລັດ! ບັນຊີຂອງທ່ານຢູ່ໃນສະຖານະ "ລໍຖ້າການອານຸມັດ" (Pending Approval). ທ່ານສາມາດລັອກອິນດ້ວຍ admin@saas.com (ລະຫັດຜ່ານໃດກໍໄດ້) ເພື່ອເຂົ້າໄປອານຸມັດບັນຊີນີ້ໄດ້ທັນທີ!';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl w-full mx-auto my-12 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl transition-colors duration-200">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-extrabold text-slate-900 dark:text-slate-100">ລົງທະບຽນນຳໃຊ້ລະບົບ SaaS</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">ເລືອກແພັກເກດທີ່ເໝາະສົມກັບທຸລະກິດຂອງທ່ານ</p>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ error }}
    </div>

    <!-- Success Alert -->
    <div v-if="successMessage" class="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex flex-col gap-4">
      <div class="flex items-center gap-2 font-bold text-base">
        <span class="material-icons select-none text-xl">check_circle</span>
        <span>{{ successMessage }}</span>
      </div>
      <NuxtLink to="/login" class="self-start px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition-all">
        <span class="material-icons select-none text-sm">login</span>
        ໄປໜ້າເຂົ້າສູ່ລະບົບ
      </NuxtLink>
    </div>

    <form v-else @submit.prevent="handleRegister" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Name Field -->
        <div>
          <label for="name" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ຊື່ຮ້ານ / ຊື່ຜູ້ຕິດຕໍ່</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
              <span class="material-icons select-none text-xl">store</span>
            </span>
            <input
              id="name"
              type="text"
              v-model="name"
              placeholder="Green Shop ຜັກອໍແກນິກ"
              required
              class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ອີເມວຜູ້ໃຊ້ (ໃຊ້ເຂົ້າສູ່ລະບົບ)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
              <span class="material-icons select-none text-xl">mail</span>
            </span>
            <input
              id="email"
              type="email"
              v-model="email"
              placeholder="owner@greenshop.com"
              required
              class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ລະຫັດຜ່ານ</label>
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
            <span class="material-icons select-none text-xl">lock</span>
          </span>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="••••••••"
            required
            class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
          />
        </div>
      </div>

      <!-- Pricing Plans Selector -->
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">ເລືອກແພັກເກດການນຳໃຊ້ (Subscription Tier)</label>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="pkg in packagesList"
            :key="pkg.id"
            @click="selectedPackageId = pkg.id"
            :class="[
              'cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between hover:scale-102',
              selectedPackageId === pkg.id
                ? 'border-indigo-600 bg-indigo-500/5 dark:bg-indigo-600/10'
                : 'border-slate-200 dark:border-slate-800 bg-transparent hover:border-slate-300 dark:hover:border-slate-700'
            ]"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ pkg.name }}</span>
                <span
                  class="w-4 h-4 rounded-full border flex items-center justify-center"
                  :class="selectedPackageId === pkg.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'"
                >
                  <span class="material-icons select-none text-xs" v-if="selectedPackageId === pkg.id">done</span>
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                ຮອງຮັບສູງສຸດ: <strong class="text-slate-700 dark:text-slate-300">{{ pkg.maxPages }} ເພຈ໌</strong><br/>
                ຈຳນວນ Token: <strong class="text-slate-700 dark:text-slate-300">{{ pkg.maxTokens.toLocaleString() }} / ເດືອນ</strong>
              </p>
            </div>
            <div class="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 mt-2">
              <span class="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{{ pkg.price }} Kip</span>
              <span class="text-xs text-slate-500 block">/ ເດືອນ</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span class="material-icons select-none">person_add</span>
        {{ loading ? 'ກຳລັງດຳເນີນການ...' : 'ລົງທະບຽນນຳໃຊ້' }}
      </button>
    </form>

    <div class="mt-8 text-center text-sm text-slate-500 dark:text-slate-500">
      ມີບັນຊີຜູ້ໃຊ້ແລ້ວບໍ?
      <NuxtLink to="/login" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors">
        ເຂົ້າສູ່ລະບົບ <span class="material-icons select-none text-sm">arrow_forward</span>
      </NuxtLink>
    </div>
  </div>
</template>

