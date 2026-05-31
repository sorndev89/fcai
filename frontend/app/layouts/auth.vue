<script setup lang="ts">
import { Bot, Moon, Sun, ArrowLeft } from 'lucide-vue-next';

const isDark = ref(false);

function applyTheme(theme: 'dark' | 'light') {
  isDark.value = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark.value);
  document.body.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  applyTheme(isDark.value ? 'light' : 'dark');
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex transition-colors duration-200">
    <!-- Theme Toggle at Top Right -->
    <div class="absolute right-4 top-4 z-50">
      <button 
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 backdrop-blur text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm transition-all duration-200" 
        type="button" 
        title="ປ່ຽນຮູບແບບ" 
        @click="toggleTheme"
      >
        <Sun v-if="isDark" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
      </button>
    </div>

    <!-- Back to Home at Top Left -->
    <div class="absolute left-4 top-4 z-50">
      <NuxtLink 
        to="/" 
        class="inline-flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm transition-all duration-200"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        <span>ກັບຄືນໜ້າຫຼັກ</span>
      </NuxtLink>
    </div>

    <!-- Left Side: Cover (Hidden on Mobile) -->
    <div class="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
      <!-- Glow effect circles -->
      <div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-sky-500/20 blur-[100px]"></div>
      <div class="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-500/15 blur-[100px]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/0 via-slate-950/40 to-slate-950/90 z-0"></div>

      <!-- Tech Dot Grid Overlay -->
      <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] z-0"></div>
      
      <!-- Content Container -->
      <div class="relative z-10 max-w-md text-white space-y-8">
        <!-- Floating Logo Badge -->
        <div class="flex items-center gap-3">
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/35">
            <Bot class="h-6 w-6 animate-pulse" />
          </span>
          <span class="text-xl font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            FCAI PLATFORM
          </span>
        </div>

        <div class="space-y-4">
          <h2 class="text-4xl font-extrabold leading-tight tracking-tight">
            ເພີ່ມຍອດຂາຍດ້ວຍ <br />
            <span class="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">AI Chatbot ອັດສະລິຍະ</span>
          </h2>
          <p class="text-slate-400 text-sm leading-relaxed">
            ເຊື່ອມຕໍ່ Facebook Page ຂອງທ່ານກັບ AI ເພື່ອຕອບແຊັດ, ສະເໜີຂາຍສິນຄ້າ ແລະ ດູແລລູກຄ້າໄດ້ຕະຫຼອດ 24 ຊົ່ວໂມງ ໂດຍບໍ່ມີວັນຢຸດ.
          </p>
        </div>

        <!-- Features list -->
        <div class="space-y-4 pt-4 border-t border-slate-800">
          <div class="flex items-start gap-3">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <span class="material-icons text-base">check</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-200">ຕອບແຊັດອັດຕະໂນມັດ 24/7</p>
              <p class="text-[11px] text-slate-400 mt-0.5">ຕອບກັບທັນທີພາຍໃນ 1 ວິນາທີ ດ້ວຍພາສາທຳມະຊາດ.</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span class="material-icons text-base">check</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-200">ຝຶກສອນ AI ໄດ້ງ່າຍໆ</p>
              <p class="text-[11px] text-slate-400 mt-0.5">ປ້ອນຂໍ້ມູນສິນຄ້າ ຫຼື ບໍລິການເພື່ອໃຫ້ AI ຮຽນຮູ້ໄດ້ທັນທີ.</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <span class="material-icons text-base">check</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-200">ວິເຄາະລາຍຮັບ ແລະ ລູກຄ້າ</p>
              <p class="text-[11px] text-slate-400 mt-0.5">ຕິດຕາມສະຖິຕິການສົນທະນາ ແລະ ລູກຄ້າໃໝ່ຢ່າງລະອຽດ.</p>
            </div>
          </div>
        </div>

        <!-- Footer watermark -->
        <p class="text-[11px] text-slate-500">
          © {{ new Date().getFullYear() }} FCAI. ພັດທະນາດ້ວຍຄວາມຮັກໃນປະເທດລາວ.
        </p>
      </div>
    </div>

    <!-- Right Side: Content (Forms) -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <!-- Glow effect for mobile/tablet background -->
      <div class="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-500/5 blur-[80px] lg:hidden"></div>
      <div class="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/5 blur-[80px] lg:hidden"></div>

      <div class="w-full max-w-xl lg:max-w-3xl relative z-10">
        <slot />
      </div>
    </div>
  </div>
</template>
