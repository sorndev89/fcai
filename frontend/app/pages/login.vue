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

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

onMounted(() => {
  mockStore.initStore();
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
    console.warn('ບໍ່ສາມາດເຊື່ອມຕໍ່ຫາ Backend ໄດ້. ເປີດໃຊ້ງານໂໝດ Mockup Data.');
    
    // Simulate Login inside Offline Mock Mode
    const mockEmail = email.value.trim().toLowerCase();
    
    if (mockEmail === 'admin@saas.com') {
      authStore.setAuth('mock-token-admin', {
        id: 'admin-user-id',
        email: 'admin@saas.com',
        name: 'SaaS Administrator',
        role: 'admin',
        status: 'approved',
      });
      navigateTo('/admin');
      return;
    }

    // Check in mock store users list
    const tenants = mockStore.getTenants();
    const matchedUser = tenants.find(u => u.email.toLowerCase() === mockEmail);

    if (matchedUser) {
      if (matchedUser.status === 'pending') {
        error.value = 'ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າການອານຸມັດຈາກເຈົ້າຂອງລະບົບ (ລອງໃຊ້ admin@saas.com ລະຫັດຜ່ານໃດກໍໄດ້ ເພື່ອເຂົ້າໄປອານຸມັດ)';
        loading.value = false;
        return;
      }
      if (matchedUser.status === 'suspended') {
        error.value = 'ບັນຊີຂອງທ່ານຖືກລະງັບການໃຊ້ງານຊົ່ວຄາວ. ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ.';
        loading.value = false;
        return;
      }
      
      authStore.setAuth(`mock-token-${matchedUser.id}`, {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        role: 'tenant',
        status: 'approved',
      });
      navigateTo('/dashboard');
    } else {
      // Create and auto-login a demo tenant for normal demo flow, or prompt them
      error.value = 'ບໍ່ພົບບັນຊີນີ້ໃນລະບົບ. ກະລຸນາລົງທະບຽນກ່ອນ ຫຼື ໃຊ້ admin@saas.com ຫຼື somchit@organic.com ຜ່ານໂໝດຈຳລອງ';
    }
  } finally {
    loading.value = false;
  }
}

function loginAsDemo(role: 'admin' | 'tenant') {
  if (role === 'admin') {
    email.value = 'admin@saas.com';
    password.value = 'admin123';
  } else {
    email.value = 'somchit@organic.com';
    password.value = 'password123';
  }
  handleLogin();
}
</script>

<template>
  <div class="max-w-md w-full mx-auto my-12 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl transition-colors duration-200">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-extrabold text-slate-900 dark:text-slate-100">ຍິນດີຕ້ອນຮັບຄືນ</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">ເຂົ້າສູ່ລະບົບເພື່ອຈັດການແຊັດບັອດ AI ຂອງທ່ານ</p>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-6">
      <!-- Email Field -->
      <div>
        <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">ອີເມວຜູ້ໃຊ້</label>
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
            <span class="material-icons select-none text-xl">mail</span>
          </span>
          <input
            id="email"
            type="email"
            v-model="email"
            placeholder="name@business.com"
            required
            class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
          />
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

      <!-- Submit -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span class="material-icons select-none">login</span>
        {{ loading ? 'ກຳລັງເຂົ້າສູ່ລະບົບ...' : 'ເຂົ້າສູ່ລະບົບ' }}
      </button>
    </form>

    <!-- Quick Demo Logins -->
    <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80">
      <p class="text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center justify-center gap-1">
        <span class="material-icons select-none text-sm text-amber-500">bolt</span>
        ເຂົ້າລະບົບທົດສອບດ່ວນ (Quick Demo Login)
      </p>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="loginAsDemo('admin')"
          class="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 py-3 px-3 rounded-xl text-xs font-bold border border-slate-200/55 dark:border-slate-800 active:scale-95 transition-all"
        >
          <span class="material-icons select-none text-base text-violet-500">admin_panel_settings</span>
          ຈັດການລະບົບ
        </button>
        <button
          type="button"
          @click="loginAsDemo('tenant')"
          class="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 py-3 px-3 rounded-xl text-xs font-bold border border-slate-200/55 dark:border-slate-800 active:scale-95 transition-all"
        >
          <span class="material-icons select-none text-base text-emerald-500">storefront</span>
          ຜູ້ໃຊ້ທົ່ວໄປ
        </button>
      </div>
    </div>

    <div class="mt-8 text-center text-sm text-slate-500 dark:text-slate-500">
      ຍັງບໍ່ມີບັນຊີຜູ້ໃຊ້ບໍ?
      <NuxtLink to="/register" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors">
        ລົງທະບຽນຟຣີ <span class="material-icons select-none text-sm">arrow_forward</span>
      </NuxtLink>
    </div>
  </div>
</template>


