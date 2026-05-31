<script setup lang="ts">
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'auth',
});

const authStore = useAuthStore();
const router = useRouter();
const apiUrl = useApiUrl();

const email = ref('');
const password = ref('');
const remember = ref(false);
const error = ref('');
const loading = ref(false);

onMounted(() => {
  if (authStore.isAuthenticated) {
    if (authStore.user?.role === 'admin') {
      navigateTo('/admin');
    } else {
      navigateTo('/dashboard');
    }
  }
});

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ';
    return;
  }

  error.value = '';
  loading.value = true;

  try {
    const res = await $fetch<{ token: string; user: { id: string; email: string; name: string; role: 'admin' | 'tenant'; status: 'pending' | 'approved' | 'suspended' } }>(
      `${apiUrl}/api/auth/login`,
      {
        method: 'POST',
        body: {
          email: email.value,
          password: password.value,
          remember: remember.value,
        },
      }
    );

    authStore.setAuth(res.token, res.user);
    if (res.user.role === 'admin') {
      navigateTo('/admin');
    } else {
      navigateTo('/dashboard');
    }
  } catch (err: any) {
    error.value = err.data?.error || 'ບໍ່ສາມາດເຊື່ອມຕໍ່ຫາ Backend ໄດ້. ກະລຸນາກວດສອບເຄືອຂ່າຍ.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-md mx-auto bg-white dark:bg-slate-900/50 backdrop-blur-lg border border-slate-100 dark:border-slate-800/80 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-200">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">ຍິນດີຕ້ອນຮັບຄືນ</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">ເຂົ້າສູ່ລະບົບເພື່ອຈັດການແຊັດບັອດ AI ຂອງທ່ານ</p>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
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
            placeholder="name@business.com"
            required
            class="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-sm"
          />
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

      <!-- Remember Me Checkbox -->
      <div class="flex items-center">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="remember"
            class="rounded border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sky-600 focus:ring-sky-500/30 w-4 h-4"
          />
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">ຈົດຈຳຂ້ອຍໄວ້ໃນລະບົບ (Remember Me)</span>
        </label>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogIn class="h-4.5 w-4.5" />
        <span>{{ loading ? 'ກຳລັງເຂົ້າສູ່ລະບົບ...' : 'ເຂົ້າສູ່ລະບົບ' }}</span>
      </button>
    </form>

    <div class="mt-8 text-center text-xs text-slate-500 dark:text-slate-500 font-medium">
      ຍັງບໍ່ມີບັນຊີຜູ້ໃຊ້ບໍ?
      <NuxtLink to="/register" class="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-bold inline-flex items-center gap-1 transition-colors">
        <span>ລົງທະບຽນຟຣີ</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </NuxtLink>
    </div>
  </div>
</template>


