<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();

onMounted(() => {
  if (authStore.isAuthenticated) {
    navigateTo('/dashboard');
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 md:py-20">
    <!-- Hero Header -->
    <div class="text-center max-w-3xl space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-sm font-semibold animate-pulse">
        <span class="material-icons select-none text-base">auto_awesome</span>
        ລະບົບແຊັດບັອດ AI ອັດສະລິຍະສໍາລັບ Facebook SaaS
      </div>
      <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
        ເຊື່ອມຕໍ່ໜ້າເພຈ໌ Facebook ຂອງທ່ານກັບ
        <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
          ລະບົບ AI ອັດສະລິຍະ
        </span>
      </h1>
      <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
        ອັບໂຫຼດຖານຂໍ້ມູນຄວາມຮູ້ຂອງຮ້ານຄ້າ ແລະໃຫ້ AI ຂອງພວກເຮົາຕອບຄຳຖາມລູກຄ້າຕະຫຼອດ 24 ຊົ່ວໂມງ ໂດຍບໍ່ມີການເດົາຂໍ້ມູນເອງ. ລະບົບຈະກວດຫາຂໍ້ມູນລູກຄ້າ ແລະປັບແຕ່ງການສົນທະນາໃຫ້ເໝາະສົມໂດຍອັດຕະໂນມັດ.
      </p>

      <div class="flex flex-wrap justify-center gap-4 pt-4">
        <NuxtLink
          to="/register"
          class="flex items-center gap-2 bg-indigo-600 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 dark:shadow-indigo-600/30"
        >
          ເລີ່ມຕົ້ນໃຊ້ງານຟຣີ
          <span class="material-icons select-none">arrow_forward</span>
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="flex items-center gap-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold px-6 py-3.5 rounded-xl transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          ເຂົ້າສູ່ລະບົບຜູ້ໃຊ້
        </NuxtLink>
      </div>
    </div>

    <!-- Feature Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-24">
      <div class="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm dark:shadow-none">
        <div class="bg-indigo-50 dark:bg-indigo-600/10 p-3 rounded-lg text-indigo-600 dark:text-indigo-400 w-fit mb-6 flex items-center justify-center">
          <span class="material-icons select-none text-3xl">smart_toy</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">ຕອບຕາມຄວາມຈິງ ບໍ່ເດົາຂໍ້ມູນ</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          AI ຈະຕອບຄຳຖາມໂດຍອີງໃສ່ຂໍ້ມູນຄວາມຮູ້ທີ່ທ່ານປ້ອນໃຫ້ເທົ່ານັ້ນ. ຫາກບໍ່ມີຂໍ້ມູນ, AI ຈະປະຕິເສດການເດົາຂໍ້ມູນເອງ.
        </p>
      </div>

      <div class="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm dark:shadow-none">
        <div class="bg-purple-50 dark:bg-purple-600/10 p-3 rounded-lg text-purple-600 dark:text-purple-400 w-fit mb-6 flex items-center justify-center">
          <span class="material-icons select-none text-3xl">shield</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">ລະບົບ CRM ເກັບຂໍ້ມູນລູກຄ້າ</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          ດຶງຂໍ້ມູນໂປຣໄຟລ໌ລູກຄ້າຈາກ Facebook ໂດຍອັດຕະໂນມັດ. ສາມາດເພີ່ມບັນທຶກສ່ວນຕົວເພື່ອໃຫ້ AI ນໍາໃຊ້ໃນການຕອບແຊັດໃຫ້ເໝາະສົມ.
        </p>
      </div>

      <div class="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm dark:shadow-none">
        <div class="bg-pink-50 dark:bg-pink-600/10 p-3 rounded-lg text-pink-600 dark:text-pink-400 w-fit mb-6 flex items-center justify-center">
          <span class="material-icons select-none text-3xl">bolt</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">ຕັ້ງຄ່າງ່າຍໃນ 1 ນາທີ</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          ພຽງແຕ່ໃສ່ລະຫັດເພຈ໌ (Token), ວາງຂໍ້ຄວາມຄວາມຮູ້ຮ້ານຄ້າ, ແລະ ເປີດໃຊ້ງານ, ບັອດຂອງທ່ານກໍຈະເລີ່ມຕອບແຊັດລູກຄ້າທັນທີ.
        </p>
      </div>
    </div>
  </div>
</template>

