<script setup lang="ts">
import { Store, Mail, Lock, UserPlus, Check, ArrowRight, CheckCircle } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'auth',
});

const authStore = useAuthStore();
const router = useRouter();
const apiUrl = useApiUrl();

const name = ref('');
const email = ref('');
const password = ref('');
const selectedPackageId = ref('');
const error = ref('');
const successMessage = ref('');
const loading = ref(false);
const packagesList = ref<any[]>([]);

function formatKip(amount: string | number | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : Number(amount ?? 0);
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('lo-LA').format(Math.round(value));
}

onMounted(async () => {
  if (authStore.isAuthenticated) {
    if (authStore.user?.role === 'admin') {
      navigateTo('/admin');
    } else {
      navigateTo('/dashboard');
    }
  }
  
  // Load packages
  try {
    const res = await $fetch<any[]>(`${apiUrl}/api/auth/packages`);
    packagesList.value = res;
    if (!selectedPackageId.value && packagesList.value.length > 0) {
      selectedPackageId.value = packagesList.value[0].id;
    }
  } catch (err) {
    error.value = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນແພັກເກດໄດ້';
  }
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
    console.error('Registration error:', err);
    error.value = err.data?.error || err.data?.message || 'ບໍ່ສາມາດເຊື່ອມຕໍ່ຫາ Backend ໄດ້. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl w-full mx-auto my-12 bg-white dark:bg-slate-900/50 backdrop-blur-lg border border-slate-100 dark:border-slate-800/80 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-200">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">ລົງທະບຽນນຳໃຊ້ລະບົບ FCAI</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">ເລືອກແພັກເກດທີ່ເໝາະສົມກັບທຸລະກິດຂອງທ່ານ</p>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
      {{ error }}
    </div>

    <!-- Success Alert -->
    <div v-if="successMessage" class="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex flex-col gap-4">
      <div class="flex items-center gap-2 font-bold text-sm">
        <CheckCircle class="h-5 w-5 text-emerald-500 shrink-0" />
        <span>{{ successMessage }}</span>
      </div>
      <NuxtLink to="/login" class="self-start px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20">
        <LogIn class="h-4 w-4" />
        <span>ໄປໜ້າເຂົ້າສູ່ລະບົບ</span>
      </NuxtLink>
    </div>

    <form v-else @submit.prevent="handleRegister" class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Name Field -->
        <div>
          <label for="name" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ຊື່ຮ້ານ / ຊື່ຜູ້ຕິດຕໍ່</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
              <Store class="h-4.5 w-4.5" />
            </span>
            <input
              id="name"
              type="text"
              v-model="name"
              placeholder="Green Shop ຜັກອໍແກນິກ"
              required
              class="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-sm"
            />
          </div>
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ອີເມວຜູ້ໃຊ້</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
              <Mail class="h-4.5 w-4.5" />
            </span>
            <input
              id="email"
              type="email"
              v-model="email"
              placeholder="owner@greenshop.com"
              required
              class="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Password Field -->
      <div>
        <label for="password" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ລະຫັດຜ່ານ</label>
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
            <Lock class="h-4.5 w-4.5" />
          </span>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="••••••••"
            required
            class="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-sm"
          />
        </div>
      </div>

      <!-- Pricing Plans Selector -->
      <div>
        <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">ເລືອກແພັກເກດການນຳໃຊ້ (Subscription Tier)</label>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="pkg in packagesList"
            :key="pkg.id"
            @click="selectedPackageId = pkg.id"
            :class="[
              'cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex flex-col justify-between hover:scale-[1.02] hover:shadow-md',
              selectedPackageId === pkg.id
                ? 'border-sky-500 bg-sky-500/5 dark:bg-sky-500/10'
                : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-700'
            ]"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-xs text-slate-900 dark:text-white">{{ pkg.name }}</span>
                <span
                  class="w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-colors"
                  :class="selectedPackageId === pkg.id ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-600'"
                >
                  <Check class="h-3 w-3" v-if="selectedPackageId === pkg.id" />
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                ຮອງຮັບ: <strong class="text-slate-800 dark:text-slate-200">{{ pkg.maxPages }} ເພຈ໌</strong><br/>
                Token: <strong class="text-slate-800 dark:text-slate-200">{{ formatKip(pkg.maxTokens) }}</strong>
              </p>
            </div>
            <div class="border-t border-dashed border-slate-150 dark:border-slate-800/80 pt-2.5 mt-2">
              <span class="text-base font-extrabold text-sky-600 dark:text-sky-400">{{ formatKip(pkg.price) }} Kip</span>
              <span class="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">/ ເດືອນ</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus class="h-4.5 w-4.5" />
        <span>{{ loading ? 'ກຳລັງດຳເນີນການ...' : 'ລົງທະບຽນນຳໃຊ້' }}</span>
      </button>
    </form>

    <div class="mt-8 text-center text-xs text-slate-500 dark:text-slate-500 font-medium">
      ມີບັນຊີຜູ້ໃຊ້ແລ້ວບໍ?
      <NuxtLink to="/login" class="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-bold inline-flex items-center gap-1 transition-colors">
        <span>ເຂົ້າສູ່ລະບົບ</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </NuxtLink>
    </div>
  </div>
</template>
