<script setup lang="ts">
import { Shield, Eye, Database, Lock, Mail, ChevronRight, FileText } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';

definePageMeta({
  layout: 'default',
});

const activeSection = ref('section-1');

const sections = [
  { id: 'section-1', label: '1. ຂໍ້ມູນທີ່ພວກເຮົາເກັບກຳ' },
  { id: 'section-2', label: '2. ຈຸດປະສົງໃນການນຳໃຊ້' },
  { id: 'section-3', label: '3. ການເປີດເຜີຍຂໍ້ມູນ' },
  { id: 'section-4', label: '4. ຄວາມປອດໄພຂອງຂໍ້ມູນ' },
  { id: 'section-5', label: '5. ສິດທິຂອງທ່ານ' },
  { id: 'section-6', label: '6. ການຕິດຕໍ່ພວກເຮົາ' },
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
      <span class="text-slate-600 dark:text-slate-350">ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ</span>
    </div>

    <!-- Page Header -->
    <div class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-sky-500/10 to-indigo-500/10 blur-3xl"></div>
      <div class="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
        <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/25">
          <Shield class="h-8 w-8" />
        </div>
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ (Privacy Policy)
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
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">ເນື້ອຫາຫຼັກ</h3>
          <ul class="space-y-3 text-sm font-semibold">
            <li 
              v-for="sec in sections" 
              :key="sec.id"
              class="flex items-center gap-2 cursor-pointer transition-colors duration-250 select-none"
              :class="activeSection === sec.id ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white'"
              @click="scrollToSection(sec.id)"
            >
              <span 
                class="w-1.5 h-1.5 rounded-full transition-all duration-250"
                :class="activeSection === sec.id ? 'bg-sky-500 scale-125 shadow-sm shadow-sky-500/50' : 'bg-slate-300 dark:bg-slate-700'"
              ></span>
              {{ sec.label }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Policy details -->
      <div class="md:col-span-2 space-y-6">
        <!-- 1. Data Collection -->
        <section id="section-1" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <Database class="h-5 w-5 text-sky-500" />
            <h2>1. ຂໍ້ມູນທີ່ພວກເຮົາເກັບກຳ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              ເພື່ອການໃຫ້ບໍລິການລະບົບ chatbot ປັນຍາປະດິດ (FCAI) ເຮັດວຽກໄດ້ຢ່າງມີປະສິດທິພາບ, ພວກເຮົາຈຳເປັນຕ້ອງໄດ້ເກັບກຳ ແລະ ປະມວນຜົນຂໍ້ມູນບາງສ່ວນດັ່ງນີ້:
            </p>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <strong>...ຂໍ້ມູນບັນຊີຜູ້ໃຊ້:</strong> ຊື່, ອີເມວ, ລະຫັດຜ່ານ (ເຂົ້າລະຫັດປອດໄພ) ແລະ ປະຫວັດການເລືອກແພັກເກດ/ການຊຳລະເງິນ.
              </li>
              <li>
                <strong>ຂໍ້ມູນການເຊື່ອມຕໍ່ Facebook:</strong> Facebook Page Access Tokens, Facebook User Access Tokens, ລະຫັດ ID ຂອງເພຈ ແລະ ຊື່ເພຈ ທີ່ທ່ານເລືອກເຊື່ອມຕໍ່.
              </li>
              <li>
                <strong>ຂໍ້ມູນການສົນທະນາຂອງລູກຄ້າ:</strong> ລະຫັດ Page-Scoped ID (PSID) ຂອງລູກຄ້າ, ຊື່, ຮູບໂປຣຟາຍ, ເບີໂທ, ທີ່ຢູ່ ແລະ ປະຫວັດການແຊັດ (Chat Logs) ເພື່ອໃຫ້ AI ໃຊ້ໃນການວິເຄາະ ແລະ ຕອບກັບຂໍ້ຄວາມ.
              </li>
            </ul>
          </div>
        </section>

        <!-- 2. Usage Purpose -->
        <section id="section-2" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <Eye class="h-5 w-5 text-indigo-500" />
            <h2>2. ຈຸດປະສົງໃນການນຳໃຊ້ຂໍ້ມູນ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>ພວກເຮົາໃຊ້ຂໍ້ມູນທີ່ເກັບກຳມາໃນຈຸດປະສົງຕໍ່ໄປນີ້:</p>
            <ul class="list-disc pl-5 space-y-2">
              <li>ເພື່ອດຳເນີນການ ແລະ ຮັກສາລະບົບ AI Chatbot ໃຫ້ຕອບກັບລູກຄ້າໃນເພຈ Facebook ຂອງທ່ານໄດ້ຕະຫຼອດ 24 ຊົ່ວໂມງ.</li>
              <li>ເພື່ອໃຫ້ບໍລິການຕັດຈຳນວນ Token (Token usage calculation) ຢ່າງຖືກຕ້ອງຕາມຈຳນວນການໃຊ້ງານຕົວຈິງ.</li>
              <li>ເພື່ອກວດສອບ ແລະ ຢືນຢັນຫຼັກຖານການໂອນເງິນ (Payment slips) ເມື່ອມີການຊື້ແພັກເກດ ຫຼື ເຕີມ Token ເພີ່ມ.</li>
              <li>ເພື່ອວິເຄາະ, ປັບປຸງ, ແລະ ພັດທະນາປະສິດທິພາບຂອງ AI ໃນການສົນທະນາໃຫ້ມີຄວາມຖືກຕ້ອງ ແລະ ເປັນທຳມະຊາດຫຼາຍຂຶ້ນ.</li>
            </ul>
          </div>
        </section>

        <!-- 3. Disclosure -->
        <section id="section-3" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <FileText class="h-5 w-5 text-violet-500" />
            <h2>3. ການເປີດເຜີຍຂໍ້ມູນແກ່ບຸກຄົນພາຍນອກ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              ພວກເຮົາ **ບໍ່ມີນະໂຍບາຍ** ໃນການຂາຍ, ແລກປ່ຽນ, ຫຼື ເປີດເຜີຍຂໍ້ມູນສ່ວນຕົວ ຫຼື ຂໍ້ມູນການສົນທະນາຂອງລູກຄ້າຂອງທ່ານໃຫ້ແກ່ບຸກຄົນພາຍນອກ, ຍົກເວັ້ນແຕ່:
            </p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>การສົ່ງຂໍ້ຄວາມໄປຫາ API ຂອງຜູ້ໃຫ້ບໍລິການປັນຍາປະດິດ (ປັນຍາປະດິດ Gemini ຂອງ Google DeepMind) ເພື່ອປະມວນຜົນການຕອບກັບຂໍ້ຄວາມ.</li>
              <li>ເປັນໄປຕາມການຮຽກຮ້ອງທາງດ້ານກົດໝາຍ ຫຼື ຄຳສັ່ງຂອງເຈົ້າໜ້າທີ່ລັດທີ່ກ່ຽວຂ້ອງ.</li>
            </ul>
          </div>
        </section>

        <!-- 4. Security -->
        <section id="section-4" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <Lock class="h-5 w-5 text-emerald-500" />
            <h2>4. ຄວາມປອດໄພຂອງຂໍ້ມູນ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              ພວກເຮົາໃຫ້ຄວາມສຳຄັນສູງສຸດແກ່ຄວາມປອດໄພຂອງຂໍ້ມູນທ່ານ. ພວກເຮົາໄດ້ນຳໃຊ້ລະບົບປ້ອງກັນ ແລະ ເຕັກໂນໂລຊີທີ່ເໝາະສົມ:
            </p>
            <ul class="list-disc pl-5 space-y-2">
              <li>ຂໍ້ມູນ Access Tokens ແລະ API Keys ທັງໝົດຈະຖືກເກັບຮັກສາໄວ້ຢ່າງປອດໄພ ແລະ ມີການຄວບຄຸມການເຂົ້າເຖິງຢ່າງເຂັ້ມງວດ.</li>
              <li>ລະບົບຖານຂໍ້ມູນຂອງພວກເຮົາຖືກປ້ອງກັນດ້ວຍ Firewalls ແລະ ການເຂົ້າລະຫັດການເຊື່ອມຕໍ່ (SSL/TLS).</li>
            </ul>
          </div>
        </section>

        <!-- 5. Your Rights -->
        <section id="section-5" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <Shield class="h-5 w-5 text-teal-500" />
            <h2>5. ສິດທິຂອງທ່ານ</h2>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
            <p>
              ໃນຖານະເຈົ້າຂອງຂໍ້ມູນ, ທ່ານມີສິດທິຕ່າງໆຕາມກົດໝາຍທີ່ກ່ຽວຂ້ອງ ດັ່ງນີ້:
            </p>
            <ul class="list-disc pl-5 space-y-2">
              <li><strong>ສິດໃນການເຂົ້າເຖິງ ແລະ ຂໍຮັບຂໍ້ມູນ:</strong> ທ່ານມີສິດເຂົ້າເຖິງ ແລະ ຂໍຮັບສຳເນົາຂໍ້ມູນສ່ວນຕົວຂອງທ່ານທີ່ພວກເຮົາເກັບຮັກສາໄວ້.</li>
              <li><strong>ສິດໃນການແກ້ໄຂຂໍ້ມູນ:</strong> ທ່ານມີສິດຮ້ອງຂໍໃຫ້ປັບປຸງ ຫຼື ແກ້ໄຂຂໍ້ມູນສ່ວນຕົວທີ່ບໍ່ຖືກຕ້ອງ ຫຼື ບໍ່ຄົບຖ້ວນ.</li>
              <li><strong>ສິດໃນການລຶບຂໍ້ມູນ:</strong> ທ່ານມີສິດຮ້ອງຂໍໃຫ້ພວກເຮົາລຶບ ຫຼື ທຳລາຍຂໍ້ມູນສ່ວນຕົວຂອງທ່ານອອກຈາກຖານຂໍ້ມູນຂອງພວກເຮົາໄດ້ທຸກເວລາ.</li>
            </ul>
          </div>
        </section>

        <!-- 6. Contact -->
        <section id="section-6" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 backdrop-blur-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
            <Mail class="h-5 w-5 text-amber-500" />
            <h2>6. ການຕິດຕໍ່ພວກເຮົາ</h2>
          </div>
          <div class="text-sm text-slate-650 dark:text-slate-350 space-y-2">
            <p class="font-bold text-slate-900 dark:text-white">ບໍລິສັດ ສອນເທັກ ອິນໂນເວຊັ່ນ ຈຳກັດຜູ້ດຽວ</p>
            <p>ບ້ານ ໜອງແມງດາ ເມືອງໄຊ ແຂວງອຸດົມໄຊ, ປະເທດລາວ</p>
            <p>ເບີໂທຕິດຕໍ່: 020 56859090, 28729723</p>
            <p>ອີເມວ: support@fcai.com</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
