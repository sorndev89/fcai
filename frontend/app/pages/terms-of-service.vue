<script setup lang="ts">
import { FileText, CheckCircle2, DollarSign, AlertCircle, ShieldCheck, ChevronRight, Mail } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';

definePageMeta({
  layout: 'default',
});

const activeSection = ref('section-1');

const sections = [
  { id: 'section-1', label: '1. ການຍອມຮັບຂໍ້ຕົກລົງ' },
  { id: 'section-2', label: '2. ຂອບເຂດການບໍລິການ' },
  { id: 'section-3', label: '3. ຄ່າບໍລິການ & ການຊຳລະເງິນ' },
  { id: 'section-4', label: '4. ຄວາມຮັບຜິດຊອບຂອງຜູ້ໃຊ້' },
  { id: 'section-5', label: '5. ຂໍ້ຈຳກັດຄວາມຮັບຜິດຊອບ' },
  { id: 'section-6', label: '6. ກົດໝາຍທີ່ບັງຄັບໃຊ້' },
];

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  
  activeSection.value = id;
  const offset = 100;
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.scrollY - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

onMounted(() => {
  const observerOptions = {
    root: null,
    rootMargin: '-10% 0px -75% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id;
      }
    });
  }, observerOptions);

  sections.forEach((sec) => {
    const el = document.getElementById(sec.id);
    if (el) observer.observe(el);
  });

  onUnmounted(() => {
    observer.disconnect();
  });
});
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
    <!-- Breadcrumbs / Top Indicator -->
    <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
      <NuxtLink to="/" class="hover:text-sky-500 transition-colors">ໜ້າຫຼັກ</NuxtLink>
      <ChevronRight class="h-3.5 w-3.5" />
      <span class="text-slate-600 dark:text-slate-350">ຂໍ້ກຳນົດ ແລະ ເງື່ອນໄຂການບໍລິການ</span>
    </div>

    <!-- Page Header -->
    <div class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl"></div>
      <div class="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
        <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
          <FileText class="h-8 w-8" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            ຂໍ້ກຳນົດ ແລະ ເງື່ອນໄຂການບໍລິການ (Terms of Service)
          </h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            ສະບັບປັບປຸງຫຼ້າສຸດ: 31 ພຶດສະພາ 2026 • ບໍລິສັດ ສອນເທັກ ອິນໂນເວຊັ່ນ ຈຳກັດຜູ້ດຽວ
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-8 md:grid-cols-3">
      <!-- Sidebar / Quick links -->
      <div class="md:col-span-1 space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sticky top-24">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">ຂໍ້ຕົກລົງບໍລິການ</h3>
          <ul class="space-y-3 text-sm font-semibold">
            <li 
              v-for="sec in sections" 
              :key="sec.id"
              class="flex items-center gap-2 cursor-pointer transition-colors duration-250 select-none"
              :class="activeSection === sec.id ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white'"
              @click="scrollToSection(sec.id)"
            >
              <span 
                class="w-1.5 h-1.5 rounded-full transition-all duration-250"
                :class="activeSection === sec.id ? 'bg-indigo-500 scale-125 shadow-sm shadow-indigo-500/50' : 'bg-slate-300 dark:bg-slate-700'"
              ></span>
              {{ sec.label }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Terms details -->
      <div class="md:col-span-2 space-y-6">
        <!-- 1. Acceptance -->
        <section id="section-1" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <CheckCircle2 class="h-5 w-5 text-indigo-500" />
            <h2>1. ການຍອມຮັບຂໍ້ຕົກລົງການໃຊ້ບໍລິການ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              ຍິນດີຕ້ອນຮັບສູ່ລະບົບ **FCAI** (Facebook Chat AI). ໂດຍການສະໝັກໃຊ້ງານ, ເຂົ້າສູ່ລະບົບ ຫຼື ນຳໃຊ້ລະບົບຂອງພວກເຮົາ, ທ່ານຕົກລົງທີ່ຈະຜູກພັນຕົນເອງ ແລະ ປະຕິບັດຕາມຂໍ້ກຳນົດ ແລະ ເງື່ອນໄຂການບໍລິການເຫຼົ່ານີ້ທຸກປະການ. ຫາກທ່ານບໍ່ຍອມຮັບຂໍ້ຕົກລົງ, ທ່ານຈະບໍ່ສາມາດເຂົ້າໃຊ້ງານລະບົບໄດ້.
            </p>
          </div>
        </section>

        <!-- 2. Service Scope -->
        <section id="section-2" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <ShieldCheck class="h-5 w-5 text-indigo-500" />
            <h2>2. ຂອບເຂດ ແລະ ການສະໜອງບໍລິການ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              FCAI ສະໜອງລະບົບ chatbot ປັນຍາປະດິດເພື່ອຕອບຂໍ້ຄວາມໃນ Facebook Page ແທນຜູ້ໃຊ້ບໍລິການ (Tenant) ໂດຍມີເງື່ອນໄຂດັ່ງນີ້:
            </p>
            <ul class="list-disc pl-5 space-y-2">
              <li>ຈຳນວນເພຈ໌ສູງສຸດ ແລະ ຈຳນວນການໃຊ້ງານ Token ຕໍ່ເດືອນ ຈະຖືກກຳນົດຕາມແພັກເກດທີ່ທ່ານເລືອກ ແລະ ຊຳລະເງິນ.</li>
              <li>ພວກເຮົາຂໍສະຫງວນສິດໃນການປັບປຸງ, ປ່ຽນແປງ ຫຼື ຢຸດຕິການໃຫ້ບໍລິການບາງສ່ວນຊົ່ວຄາວ ເພື່ອບຳລຸງຮັກສາລະບົບ.</li>
              <li>ພວກເຮົາຂໍສະຫງວນສິດໃນການລະງັບບັນຊີຜູ້ໃຊ້ງານທີ່ລະເມີດນະໂຍບາຍຂອງ Facebook ຫຼື ນຳໃຊ້ລະບົບໄປໃນທາງທີ່ຜິດກົດໝາຍ (ເຊັ່ນ: ສະແປມຂໍ້ຄວາມ, ສໍ້ໂກງ, ຫຼື ສົ່ງເນື້ອຫາທີ່ບໍ່ເໝາະສົມ).</li>
            </ul>
          </div>
        </section>

        <!-- 3. Billing & Payments -->
        <section id="section-3" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <DollarSign class="h-5 w-5 text-indigo-500" />
            <h2>3. ຄ່າບໍລິການ, ການເຕີມ Token ແລະ ນະໂຍບາຍການຄືນເງິນ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              ...ການໃຊ້ບໍລິການ FCAI ຈະມີຄ່າໃຊ້ຈ່າຍຕາມແພັກເກດລາຍເດືອນ ຫຼື ການຊື້ຊຸດ Token ເພີ່ມເຕີມ:
            </p>
            <ul class="list-disc pl-5 space-y-2">
              <li><strong>ການຊຳລະເງິນ:</strong> ຜູ້ໃຊ້ບໍລິການຈະຕ້ອງໂອນເງິນເຂົ້າບັນຊີທະນາຄານທີ່ກຳນົດໄວ້ໃນລະບົບ ແລະ ແນບຫຼັກຖານໃບບິນໂອນເງິນ (slip) ເພື່ອໃຫ້ຜູ້ດູແລລະບົບກວດສອບ ແລະ ອະນຸມັດ.</li>
              <li><strong>ນະໂຍບາຍການຄືນເງິນ:</strong> ຄ່າບໍລິການແພັກເກດ ແລະ ຄ່າຊື້ Token ເພີ່ມທັງໝົດ **ບໍ່ສາມາດຂໍຄືນເງິນໄດ້ (Non-refundable)** ໃນທຸກກໍລະນີ ຫຼັງຈາກທີ່ຫຼັກຖານການຊຳລະເງິນໄດ້ຮັບການອະນຸມັດ ແລະ ເຕີມເຂົ້າລະບົບແລ້ວ.</li>
              <li><strong>Token ໝົດອາຍຸ:</strong> Token ປົກກະຕິຂອງແພັກເກດຈະຖືກຣີເຊັດໃໝ່ທຸກໆເດືອນ. ສ່ວນ Token ທີ່ຊື້ເພີ່ມ (Bonus tokens) ຈະຖືກເກັບໄວ້ ແລະ ບໍ່ມີການໝົດອາຍຸຈົນກວ່າຈະຖືກນຳໃຊ້ໝົດ.</li>
            </ul>
          </div>
        </section>

        <!-- 4. User Responsibility -->
        <section id="section-4" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <AlertCircle class="h-5 w-5 text-indigo-500" />
            <h2>4. ຄວາມຮັບຜິດຊອບຂອງຜູ້ໃຊ້ບໍລິການ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>ໃນຖານະຜູ້ໃຊ້ບໍລິການ, ທ່ານຕົກລົງ ແລະ ຮັບຜິດຊອບຕໍ່ສິ່ງຕໍ່ໄປນີ້:</p>
            <ul class="list-disc pl-5 space-y-2">
              <li>ຮັກສາຄວາມປອດໄພຂອງລະຫັດຜ່ານບັນຊີ ແລະ ຂໍ້ມູນ Access Tokens ຂອງເພຈທ່ານເອງ.</li>
              <li>ຮັບຜິດຊອບຕໍ່ເນື້ອຫາຄວາມຮູ້ (Knowledge Base) ທີ່ປ້ອນໃຫ້ AI ຕອບລູກຄ້າ ແລະ ຮັບປະກັນວ່າຂໍ້ມູນນັ້ນຖືກຕ້ອງ ແລະ ບໍ່ລະເມີດລິຂະສິດ ຫຼື ສິດທິຂອງບຸກຄົນອື່ນ.</li>
              <li>ບໍ່ດຳເນີນການໃດໆ ທີ່ມີລັກສະນະໂຈມຕີ, ກໍ່ກວນ, ຫຼື ທຳລາຍສະຖຽນລະພາບຂອງລະບົບ FCAI.</li>
            </ul>
          </div>
        </section>

        <!-- 5. Liability Limit -->
        <section id="section-5" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <AlertCircle class="h-5 w-5 text-indigo-500" />
            <h2>5. ຂໍ້ຈຳກັດຄວາມຮັບຜິດຊອບ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              ລະບົບ FCAI ປະມວນຜົນການສົນທະນາຜ່ານປັນຍາປະດິດ (AI). ພວກເຮົາຈະພະຍາຍາມປັບປຸງ AI ໃຫ້ມີຄວາມຖືກຕ້ອງທີ່ສຸດ, ແຕ່:
            </p>
            <ul class="list-disc pl-5 space-y-2">
              <li>ພວກເຮົາ **ບໍ່ຮັບຜິດຊອບ** ຕໍ່ຄວາມເສຍຫາຍ, ຜົນກຳໄລທີ່ເສຍໄປ, ຫຼື ຄວາມເຂົ້າໃຈຜິດໃດໆ ທີ່ເກີດຂຶ້ນຈາກການຕອບຂໍ້ຄວາມທີ່ຜິດພາດ ຫຼື ບໍ່ເໝາະສົມຂອງ AI Chatbot.</li>
              <li>ພວກເຮົາ **ບໍ່ຮັບຜິດຊອບ** ຕໍ່ການທີ່ Facebook ປ່ຽນແປງນະໂຍບາຍ ຫຼື API ເຮັດໃຫ້ບາງຟີເຈີຂອງ Chatbot ບໍ່ສາມາດເຮັດວຽກໄດ້ຊົ່ວຄາວ ຫຼື ຖາວອນ.</li>
            </ul>
          </div>
        </section>

        <!-- 6. Governing Law -->
        <section id="section-6" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/45 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <Mail class="h-5 w-5 text-indigo-500" />
            <h2>6. ກົດໝາຍທີ່ບັງຄັບໃຊ້ & ການຕິດຕໍ່</h2>
          </div>
          <div class="text-sm text-slate-650 dark:text-slate-350 leading-relaxed space-y-2">
            <p>
              ຂໍ້ກຳນົດການບໍລິການນີ້ ຖືກຄວບຄຸມ ແລະ ຕີຄວາມໝາຍຕາມກົດໝາຍຂອງ ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ.
            </p>
            <p class="font-bold pt-2 text-slate-900 dark:text-white">ຕິດຕໍ່ສອບຖາມ:</p>
            <p>ບໍລິສັດ ສອນເທັກ ອິນໂນເວຊັ່ນ ຈຳກັດຜູ້ດຽວ</p>
            <p>ບ້ານ ໜອງແມງດາ ເມືອງໄຊ ແຂວງອຸດົມໄຊ, ປະເທດລາວ</p>
            <p>ເບີໂທ: 020 56859090, 28729723</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
