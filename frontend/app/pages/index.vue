<script setup lang="ts">
import { 
  Bot, Sparkles, MessageSquare, Zap, Shield, ArrowRight, CheckCircle2, 
  Database, Users, AlertTriangle, XCircle, Clock, Moon, HelpCircle
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();

onMounted(() => {
  if (authStore.isAuthenticated) {
    navigateTo('/dashboard');
  }
});

// Interactive chatbot simulation state
const simulatedMessage = ref('');
const simulatedReply = ref('');
const showReply = ref(false);
const isTyping = ref(false);

const mockQuestions = [
  'ສະບາຍດີ ຮ້ານຕັ້ງຢູ່ໃສ ແລະ ເປີດເວລາໃດ?',
  'ມີຜັກສົດອໍແກນິກຂາຍບໍ່ ລາຄາເທົ່າໃດ?',
  'ມີຄ່າບໍລິການຈັດສົ່ງບໍ່ ສົ່ງດົງໂດກເທົ່າໃດ?'
];

function selectQuestion(q: string) {
  if (isTyping.value) return;
  simulatedMessage.value = q;
  showReply.value = false;
  isTyping.value = true;
  
  setTimeout(() => {
    isTyping.value = false;
    showReply.value = true;
    if (q.includes('ຮ້ານຕັ້ງຢູ່ໃສ')) {
      simulatedReply.value = 'ສະບາຍດີ! ຮ້ານ Green Shop ຂອງພວກເຮົາຕັ້ງຢູ່ ຮ່ອມ 5, ບ້ານ ໂພນຕ້ອງ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ. ເປີດໃຫ້ບໍລິການທຸກມື້ ເວລາ 8:00 - 20:00 ໂມງເດີ້.';
    } else if (q.includes('ຜັກສົດອໍແກນິກ')) {
      simulatedReply.value = 'ພວກເຮົາມີຜັກສົດອໍແກນິກປອດສານພິດ 100% ຂາຍໃນລາຄາ ກິໂລລະ 30,000 ກີບ ແລະ ໝາກໄມ້ປອດສານພິດ ກ່ອງລະ 45,000 ກີບ. ທ່ານຕ້ອງການຮັບຈັກກິໂລດີນໍ້?';
    } else {
      simulatedReply.value = 'ຄ່າບໍລິການຈັດສົ່ງພາຍໃນນະຄອນຫຼວງວຽງຈັນແມ່ນ 15,000 ກີບເດີ້. ແຕ່ຫາກທ່ານສັ່ງຊື້ຄົບ 200,000 ກີບຂຶ້ນໄປ ທາງຮ້ານພວກເຮົາຈັດສົ່ງໃຫ້ຟຣີທັນທີ!';
    }
  }, 1200);
}

// Select the first question by default
onMounted(() => {
  setTimeout(() => {
    selectQuestion(mockQuestions[0]);
  }, 1000);
});

// Problems & Solutions Interactive State
const activeScenario = ref<'night' | 'rush' | 'hallucination' | 'crm'>('night');

const scenarios = {
  night: {
    title: 'ຕອນ 2:00 ໂມງເຊົ້າ (ລູກຄ້າທັກມາ)',
    problem: {
      desc: 'ບໍ່ມີແອດມິນຕອບແຊັດ ເພາະເປັນເວລານອນ. ລູກຄ້າຖ້າບໍ່ໄຫວ ແລ້ວປ່ຽນໃຈໄປຊື້ຮ້ານອື່ນທີ່ຕອບໄວກວ່າ.',
      loss: 'ພາດໂອກາດຂາຍ ແລະ ເສຍລູກຄ້າໃຫ້ຄູ່ແຂ່ງ 🚫'
    },
    solution: {
      desc: 'AI ເຮັດວຽກຕະຫຼອດ 24 ຊົ່ວໂມງ ຕອບລູກຄ້າທັນທີໃນ 3 ວິນາທີ ໃຫ້ຂໍ້ມູນຄົບຖ້ວນ ແລະ ສາມາດປິດການຂາຍໄດ້ທັນທີ.',
      gain: 'ໄດ້ຍອດຂາຍເພີ່ມຂຶ້ນ ເຖິງວ່າເຈົ້າຂອງຮ້ານກຳລັງນອນຫຼັບ ⚡️'
    }
  },
  rush: {
    title: 'ຕອນແຊັດຖາໂຖມ (ແຊັດເຂົ້າພ້ອມກັນ 50+ ແຊັດ)',
    problem: {
      desc: 'ແອດມິນຕອບບໍ່ທັນ, ຕອບຊ້າ, ເກີດຄວາມຄຽດ ແລະ ເຮັດໃຫ້ເກີດຄວາມຜິດພາດໃນການບອກລາຄາ ຫຼື ຂໍ້ມູນສິນຄ້າ.',
      loss: 'ລູກຄ້າບໍ່ພໍໃຈກັບການບໍລິການທີ່ຊັກຊ້າ 🚫'
    },
    solution: {
      desc: 'AI ສາມາດຕອບແຊັດໄດ້ເປັນຮ້ອຍໆຄົນພ້ອມກັນໃນເວລາດຽວກັນ ໂດຍບໍ່ມີຄວາມຫຼ້າເພຍ ຂໍ້ມູນຖືກຕ້ອງ 100% ຕາມຖານຂໍ້ມູນ.',
      gain: 'ຫຼຸດຜ່ອນຄວາມກົດດັນຂອງແອດມິນ ແລະ ເພີ່ມຄວາມເພິ່ງພໍໃຈ ⚡️'
    }
  },
  hallucination: {
    title: 'ການຕອບຂໍ້ມູນສິນຄ້າ & ລາຄາ',
    problem: {
      desc: 'ແອດມິນໃໝ່ ຫຼື ບັອດແບບເກົ່າ (Rule-based) ມັກຕອບຜິດພາດ, ເດົາຂໍ້ມູນເອງ ຫຼື ບອກລາຄາສະຕັອກບໍ່ຕົງຄວາມຈິງ.',
      loss: 'ເສຍຄວາມໜ້າເຊື່ອຖືຂອງຮ້ານ ແລະ ອາດຂາດທຶນ 🚫'
    },
    solution: {
      desc: 'FCAI ໃຊ້ລະບົບ RAG ທີ່ຕອບສະເພາະຂໍ້ມູນທີ່ເຈົ້າຂອງຮ້ານອັບໂຫຼດໃຫ້ເທົ່ານັ້ນ. ຫາກບໍ່ຮູ້ ບັອດຈະບໍ່ເດົາ ແຕ່ຈະແຈ້ງໃຫ້ແອດມິນມາຕອບແທນ.',
      gain: 'ປອດໄພ ແລະ ຖືກຕ້ອງ 100% ບໍ່ມີຂໍ້ມູນບິດເບືອນ ⚡️'
    }
  },
  crm: {
    title: 'ການເກັບຂໍ້ມູນລູກຄ້າ & ການໂອນເງິນ',
    problem: {
      desc: 'ແອດມິນຕ້ອງມາຈົດເບີໂທ, ທີ່ຢູ່, ແລະ ຍອດໂອນເອງໃສ່ປຶ້ມ ຫຼື Excel ຍາກຕໍ່ການຄົ້ນຫາ ແລະ ມັກຕົກຫຼົ່ນ.',
      loss: 'ເສຍເວລາຫຼາຍຊົ່ວໂມງ ແລະ ຂໍ້ມູນຕົກຫຼົ່ນງ່າຍ 🚫'
    },
    solution: {
      desc: 'AI ກວດຈັບ ແລະ ດຶງຂໍ້ມູນ ເບີໂທ, ທີ່ຢູ່ຈັດສົ່ງ ແລະ ປະຫວັດການສັ່ງຊື້ ພ້ອມບັນທຶກລົງຖານຂໍ້ມູນ CRM ໃຫ້ອັດຕະໂນມັດ.',
      gain: 'ຈັດການງ່າຍ, ສົ່ງເຄື່ອງຖືກຕ້ອງ ແລະ ວ່ອງໄວ ⚡️'
    }
  }
};

function getScenarioIcon(key: string) {
  switch (key) {
    case 'night': return Moon;
    case 'rush': return Zap;
    case 'hallucination': return HelpCircle;
    case 'crm': return Database;
    default: return HelpCircle;
  }
}
</script>

<template>
  <div class="relative overflow-hidden space-y-24 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
    <!-- Subtle background decorations -->
    <div class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_45%_at_50%_0%,#000_65%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute left-[8%] top-[10%] -z-10 h-[280px] w-[280px] rounded-full bg-sky-500/6 blur-[100px] dark:bg-sky-500/8"></div>
    <div class="pointer-events-none absolute right-[10%] top-[22%] -z-10 h-[340px] w-[340px] rounded-full bg-slate-400/10 blur-[120px] dark:bg-slate-300/5"></div>

    <!-- ═══════════════ HERO SECTION ═══════════════ -->
    <section id="top" class="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-0 lg:grid-cols-12 lg:items-center">
      <!-- Hero Left: Text & CTA -->
      <div class="space-y-6 lg:col-span-7">
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <Sparkles class="h-4 w-4 text-sky-500" />
          <span>ລະບົບຕອບແຊັດອັດສະລິຍະ ຍຸກໃໝ່</span>
        </div>
        
        <h1 class="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          ເຊື່ອມຕໍ່ Facebook Page <br />
          <span class="text-sky-600 dark:text-sky-400">ກັບລະບົບ AI ອັດສະລິຍະ</span>
        </h1>
        
        <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
          ປ່ຽນແຊັດ Facebook Page ໃຫ້ເປັນເຄື່ອງຈັກສ້າງຍອດຂາຍອັດຕະໂນມັດ. ພຽງແຕ່ອັບໂຫຼດຂໍ້ມູນສິນຄ້າ ຫຼື ບໍລິການຂອງທ່ານ, AI ຈະຮຽນຮູ້ ແລະ ຕອບຄຳຖາມລູກຄ້າໄດ້ຢ່າງເປັນທຳມະຊາດ ຕະຫຼອດ 24 ຊົ່ວໂມງ ໂດຍບໍ່ມີການເດົາຂໍ້ມູນເອງ.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 pt-2">
          <NuxtLink to="/register" class="app-btn-primary justify-center px-8 py-3.5 shadow-sm shadow-sky-500/15">
            <span>ເລີ່ມຕົ້ນໃຊ້ງານຟຣີ</span>
            <ArrowRight class="h-4.5 w-4.5" />
          </NuxtLink>
          <NuxtLink to="/login" class="app-btn-secondary justify-center px-8 py-3.5">
            <span>ເຂົ້າສູ່ລະບົບຜູ້ໃຊ້</span>
          </NuxtLink>
        </div>

        <!-- Trust indicators -->
        <div class="flex flex-wrap items-center gap-6 pt-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
          <div class="flex items-center gap-1.5">
            <CheckCircle2 class="h-4 w-4 text-emerald-500" />
            <span>ບໍ່ຕ້ອງໃຊ້ບັດເຄຣດິດ</span>
          </div>
          <div class="flex items-center gap-1.5">
            <CheckCircle2 class="h-4 w-4 text-emerald-500" />
            <span>ເຊື່ອມຕໍ່ Facebook ໃນ 1 ນາທີ</span>
          </div>
          <div class="flex items-center gap-1.5">
            <CheckCircle2 class="h-4 w-4 text-emerald-500" />
            <span>ທົດລອງໃຊ້ງານຟຣີ</span>
          </div>
        </div>
      </div>

      <!-- Hero Right: Interactive Chatbot Simulator -->
      <div class="lg:col-span-5 relative">
        <!-- Glow backing decoration -->
        <div class="absolute -right-10 -bottom-10 h-72 w-72 rounded-full bg-sky-500/10 blur-[80px] dark:bg-sky-500/5"></div>
        <div class="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[80px] dark:bg-indigo-500/5"></div>

        <div class="app-surface overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-xl relative z-10">
          <!-- Chat window header -->
          <div class="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/20">
                <Bot class="h-4 w-4" />
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-200">FCAI - AI ຜູ້ຊ່ວຍອັດສະລິຍະ</p>
                <p class="text-[9px] text-slate-400 dark:text-slate-500">ກຳລັງເຮັດວຽກຢູ່</p>
              </div>
            </div>
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">ຕົວຢ່າງລະບົບ</span>
          </div>

          <!-- Chat body area -->
          <div class="p-4 min-h-64 flex flex-col justify-end space-y-4 bg-slate-50/20 dark:bg-slate-950/20">
            <!-- User incoming bubble -->
            <div v-if="simulatedMessage" class="flex justify-end transition-all duration-300">
              <div class="max-w-[80%] rounded-2xl rounded-tr-none bg-sky-500 text-white px-4 py-2.5 text-xs shadow-sm font-medium">
                {{ simulatedMessage }}
              </div>
            </div>

            <!-- Bot typing indicator -->
            <div v-if="isTyping" class="flex gap-2 items-end">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800">
                <Bot class="h-4 w-4" />
              </div>
              <div class="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
                <span class="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-bounce" style="animation-delay: 0ms"></span>
                <span class="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-bounce" style="animation-delay: 150ms"></span>
                <span class="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-bounce" style="animation-delay: 300ms"></span>
              </div>
            </div>

            <!-- Bot reply bubble -->
            <div v-if="showReply && simulatedReply" class="flex gap-2 items-start transition-all duration-300">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
                <Bot class="h-4 w-4" />
              </div>
              <div class="max-w-[80%] rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-sm font-medium">
                {{ simulatedReply }}
              </div>
            </div>
          </div>

          <!-- Bottom: Actionable buttons simulating questions -->
          <div class="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">ເລືອກຄຳຖາມເພື່ອທົດສອບ:</p>
            <div class="flex flex-col gap-1.5">
              <button 
                v-for="q in mockQuestions" 
                :key="q"
                @click="selectQuestion(q)"
                class="w-full text-left text-xs bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300 font-bold transition-all truncate hover:border-sky-500 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400"
                :class="simulatedMessage === q ? 'border-sky-500 dark:border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/10' : ''"
              >
                {{ q }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ STATS BANNER ═══════════════ -->
    <section id="stats" class="mx-auto w-full max-w-7xl px-0">
      <div class="app-surface overflow-x-auto bg-slate-50/80 p-6 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80">
        <div class="grid min-w-[760px] grid-flow-col auto-cols-fr gap-0 text-center">
          <div class="px-4">
            <p class="text-4xl font-black text-sky-600 dark:text-sky-400 tracking-tight">99.8%</p>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2">ຄວາມຖືກຕ້ອງຂອງຂໍ້ມູນ</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ຕອບສະເພາະສິ່ງທີ່ຮູ້ ບໍ່ມີການເດົາຂໍ້ມູນເອງ</p>
          </div>
          <div class="border-x border-slate-100 px-4 dark:border-slate-800/80">
            <p class="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">24 / 7</p>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2">ເຮັດວຽກອັດຕະໂນມັດ</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ດູແລລູກຄ້າ ແລະ ສະເໜີຂາຍໄດ້ຕະຫຼອດເວລາ</p>
          </div>
          <div class="px-4">
            <p class="text-4xl font-black text-violet-600 dark:text-violet-400 tracking-tight">10X</p>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2">ເພີ່ມປະສິດທິພາບ</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ປະຢັດເວລາ ແລະ ຫຼຸດຜ່ອນຕົ້ນທຶນການຈ້າງແອດມິນ</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ PROBLEMS & SOLUTIONS SECTION ═══════════════ -->
    <section id="problems" class="relative mx-auto w-full max-w-5xl space-y-12">
      <div class="text-center max-w-3xl mx-auto space-y-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
          <AlertTriangle class="h-3.5 w-3.5" />
          <span>ບັນຫາຫຼັກຂອງເຈົ້າຂອງເພຈ໌</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          ພົບກັບບັນຫາເຫຼົ່ານີ້ໃນເພຈ໌ຂອງທ່ານຢູ່ແມ່ນບໍ່?
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          ໃຫ້ FCAI ຊ່ວຍປ່ຽນແຊັດທີ່ວຸ່ນວາຍ ແລະ ບັນຫາການຕອບຊ້າ ໃຫ້ເປັນຍອດຂາຍແບບອັດຕະໂນມັດ ຕະຫຼອດ 24 ຊົ່ວໂມງ.
        </p>
      </div>

      <!-- Scenario Selector Tabs -->
      <div class="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
        <button 
          v-for="(scenario, key) in scenarios" 
          :key="key"
          @click="activeScenario = key"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95 duration-200"
          :class="activeScenario === key 
            ? 'bg-sky-600 text-white border-sky-600 dark:bg-sky-50 dark:border-sky-500 shadow-md shadow-sky-500/20 scale-[1.02]' 
            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
        >
          <component :is="getScenarioIcon(key)" class="h-4 w-4 shrink-0" />
          <span>{{ scenario.title }}</span>
        </button>
      </div>

      <!-- Comparison Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
        <!-- The Problem Card -->
        <div class="app-surface relative overflow-hidden border-slate-200 bg-white p-8 transition-all duration-300 group hover:border-rose-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/40">
          <div class="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-slate-400/5 blur-2xl transition-transform duration-500 group-hover:scale-125"></div>
          
          <div class="flex items-center gap-3 mb-6">
            <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-rose-500 dark:text-rose-400 w-fit shadow-sm">
              <XCircle class="h-6 w-6" />
            </div>
            <div>
              <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest">ບັນຫາທົ່ວໄປ</p>
              <h3 class="text-base font-black text-slate-900 dark:text-white">ຮ້ານຄ້າແບບເກົ່າ (Traditional)</h3>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[72px]">
            {{ scenarios[activeScenario].problem.desc }}
          </p>

          <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <AlertTriangle class="h-4 w-4 shrink-0" />
            <span>ຜົນເສຍ: {{ scenarios[activeScenario].problem.loss }}</span>
          </div>
        </div>

        <!-- The Solution Card -->
        <div class="app-surface relative overflow-hidden border-slate-200 bg-white p-8 transition-all duration-300 group hover:border-sky-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/40">
          <!-- Glow light effect -->
          <div class="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-sky-500/5 blur-2xl transition-transform duration-500 group-hover:scale-125"></div>
          
          <div class="flex items-center gap-3 mb-6">
            <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-sky-500 dark:text-sky-400 w-fit shadow-sm animate-pulse">
              <Bot class="h-6 w-6" />
            </div>
            <div>
              <p class="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">ທາງອອກອັດສະລິຍະ</p>
              <h3 class="text-base font-black text-slate-900 dark:text-white">ແກ້ໄຂດ້ວຍ FCAI (AI Assistant)</h3>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[72px]">
            {{ scenarios[activeScenario].solution.desc }}
          </p>

          <div class="mt-6 pt-5 border-t border-sky-100 dark:border-sky-900/30 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <CheckCircle2 class="h-4 w-4 shrink-0 animate-bounce" />
            <span>ຜົນດີ: {{ scenarios[activeScenario].solution.gain }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FEATURES SECTION ═══════════════ -->
    <section id="features" class="mx-auto w-full max-w-5xl space-y-12">
      <div class="text-center max-w-2xl mx-auto space-y-3">
        <p class="app-kicker">ຄຸນສົມບັດຫຼັກຂອງລະບົບ</p>
        <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          ທຸກຢ່າງທີ່ຮ້ານຄ້າຂອງທ່ານຕ້ອງການ
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          ພວກເຮົາລວມເອົາເທັກໂນໂລຢີ AI ຫຼ້າສຸດ ເຂົ້າມາຊ່ວຍໃນການຂັບເຄື່ອນຍອດຂາຍ ແລະ ຕອບແຊັດໃຫ້ມີປະສິດທິພາບສູງສຸດ.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <!-- Feature 1 -->
        <div class="app-surface border-slate-200 bg-white p-8 transition-all duration-300 group hover:border-sky-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/40">
          <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-sky-600 dark:text-sky-300 w-fit mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm">
            <Bot class="h-6 w-6" />
          </div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white mb-2.5">ຕອບຄຳຖາມຢ່າງອັດສະລິຍະ</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            AI ຕອບກັບດ້ວຍພາສາທຳມະຊາດທີ່ເປັນກັນເອງ ແລະ ສຸພາບ ປຽບເໝືອນມີແອດມິນຕົວຈິງມາຕອບໃຫ້ເອງ.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="app-surface border-slate-200 bg-white p-8 transition-all duration-300 group hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/40">
          <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-indigo-600 dark:text-indigo-300 w-fit mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm">
            <Database class="h-6 w-6" />
          </div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white mb-2.5"> RAG ບໍ່ເດົາຂໍ້ມູນເອງ</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            ບັອດຈະຕອບສະເພາະຂໍ້ມູນທີ່ຖືກຕ້ອງຕາມທີ່ທ່ານປ້ອນໃຫ້ເທົ່ານັ້ນ. ຫາກບໍ່ມີຂໍ້ມູນ, ບັອດຈະປະຕິເສດ ແລະ ລໍຖ້າແອດມິນຕົວຈິງ.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="app-surface border-slate-200 bg-white p-8 transition-all duration-300 group hover:border-violet-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/40">
          <div class="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-violet-600 dark:text-violet-300 w-fit mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm">
            <Users class="h-6 w-6" />
          </div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white mb-2.5">ລະບົບເກັບຂໍ້ມູນລູກຄ້າ CRM</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            ດຶງຂໍ້ມູນໂປຣໄຟລ໌ລູກຄ້າອັດຕະໂນມັດ ພ້ອມທັງເກັບຂໍ້ມູນ ເບີໂທ, ທີ່ຢູ່, ແລະ ປະຫວັດການສັ່ງຊື້ໄວ້ຢ່າງເປັນລະບຽບ.
          </p>
        </div>
      </div>
    </section>

    <!-- ═══════════════ HOW IT WORKS SECTION ═══════════════ -->
    <section id="how-it-works" class="mx-auto w-full max-w-5xl space-y-12">
      <div class="text-center max-w-2xl mx-auto space-y-3">
        <p class="app-kicker">ຂັ້ນຕອນການໃຊ້ງານ</p>
        <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          ເລີ່ມຕົ້ນງ່າຍໆໃນ 3 ຂັ້ນຕອນ
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          ບໍ່ມີຄວາມຮູ້ດ້ານການຂຽນໂປຣແກຣມກໍສາມາດເຮັດໄດ້ ລະບົບຖືກອອກແບບມາໃຫ້ໃຊ້ງານງ່າຍທີ່ສຸດ.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <!-- Connecting lines (desktop only) -->
        <div class="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 border-t border-dashed border-slate-200 dark:border-slate-800 -z-10"></div>
        
        <!-- Step 1 -->
        <div class="flex flex-col items-center text-center space-y-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border-2 border-sky-500 text-sky-600 dark:text-sky-400 shadow-md font-black text-lg">
            1
          </div>
          <h3 class="font-bold text-slate-950 dark:text-white text-sm">ເຊື່ອມຕໍ່ Facebook Page</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            ເຂົ້າສູ່ລະບົບດ້ວຍ Facebook ແລະ ເລືອກເພຈ໌ທີ່ຕ້ອງການເຊື່ອມຕໍ່ລະບົບ.
          </p>
        </div>

        <!-- Step 2 -->
        <div class="flex flex-col items-center text-center space-y-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md font-black text-lg">
            2
          </div>
          <h3 class="font-bold text-slate-950 dark:text-white text-sm">ປ້ອນຂໍ້ມູນຄວາມຮູ້ຮ້ານຄ້າ</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            ພິມ ຫຼື ວາງຂໍ້ມູນສິນຄ້າ, ລາຄາ, ຊ່ອງທາງໂອນເງິນ ແລະ ຂໍ້ມູນຕິດຕໍ່ເພື່ອໃຫ້ AI ຮຽນຮູ້.
          </p>
        </div>

        <!-- Step 3 -->
        <div class="flex flex-col items-center text-center space-y-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border-2 border-violet-500 text-violet-600 dark:text-violet-400 shadow-md font-black text-lg">
            3
          </div>
          <h3 class="font-bold text-slate-950 dark:text-white text-sm">ເປີດໃຊ້ງານ AI Bot</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            ກົດເປີດການທຳງານ, AI ຈະເລີ່ມຕອບແຊັດລູກຄ້າທີ່ທັກເຂົ້າມາໃນເພຈ໌ທັນທີ.
          </p>
        </div>
      </div>
    </section>

    <!-- ═══════════════ CTA SECTION ═══════════════ -->
    <section id="cta" class="mx-auto w-full max-w-5xl">
      <div class="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-12 text-white shadow-2xl dark:border-slate-800">
        <!-- Glow effects decorative -->
        <div class="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-500/10 blur-[60px]"></div>
        <div class="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-slate-500/10 blur-[60px]"></div>

        <div class="relative z-10 flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
            <Bot class="h-6 w-6 animate-pulse" />
          </span>
          <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            ພ້ອມທີ່ຈະເພີ່ມຍອດຂາຍໃຫ້ຮ້ານຄ້າຂອງທ່ານແລ້ວບໍ?
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            ເລີ່ມຕົ້ນທົດລອງໃຊ້ງານຟຣີໄດ້ແລ້ວມື້ນີ້ ບໍ່ຕ້ອງໃຊ້ບັດເຄຣດິດ ພ້ອມມີຄູ່ມືຝຶກສອນ ແລະ ການຊ່ວຍເຫຼືອເປັນພາສາລາວຕະຫຼອດການໃຊ້ງານ.
          </p>
          <div class="pt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <NuxtLink
              to="/register"
              class="bg-white hover:bg-slate-50 text-slate-900 font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] text-center"
            >
              ລົງທະບຽນທົດລອງຟຣີ
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-3.5 rounded-xl transition-all border border-white/10 backdrop-blur active:scale-[0.98] text-center"
            >
              ເຂົ້າສູ່ລະບົບ
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes blob-bounce {
  0%, 100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}

.animate-blob {
  animation: blob-bounce 22s infinite alternate ease-in-out;
}

.animation-delay-2000 {
  animation-delay: 2.2s;
}

.animation-delay-4000 {
  animation-delay: 4.5s;
}
</style>
