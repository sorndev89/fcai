<script setup lang="ts">
import { Bot, Shield, MessageSquare, Terminal, Heart, Building2, MapPin, Phone, BookOpen, LogIn, UserPlus } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();

withDefaults(defineProps<{
  show?: boolean;
}>(), {
  show: true,
});
</script>

<template>
  <footer v-if="show" class="border-t border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 mt-auto">
    <div class="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <!-- Brand Info -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/25">
              <Bot class="h-5 w-5 animate-pulse" />
            </span>
            <span class="text-base font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-indigo-400">
              FCAI - AI ສົນທະນາ
            </span>
          </div>
          <p class="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            ລະບົບຕອບແຊັດອັດສະລິຍະ ດ້ວຍປັນຍາປະດິດ (AI Chatbot) ທີ່ຊ່ວຍຈັດການເພຈ Facebook, ຕອບລູກຄ້າໄດ້ຕະຫຼອດ 24 ຊົ່ວໂມງ ຢ່າງເປັນມືອາຊີບ.
          </p>
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              ສະຖານະລະບົບ: ທຳງານປົກກະຕິ
            </span>
          </div>
        </div>

        <!-- Links Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:col-span-2">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              ລະບົບຂອງພວກເຮົາ
            </p>
            <ul class="mt-4 space-y-2 text-xs">
              <li>
                <NuxtLink to="/dashboard" class="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors">
                  <Terminal class="h-3.5 w-3.5" />
                  ແດດຊບອດຫຼັກ
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/dashboard/pages" class="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors">
                  <MessageSquare class="h-3.5 w-3.5" />
                  ຈັດການເພຈ໌
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/dashboard/packages" class="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors">
                  <Shield class="h-3.5 w-3.5" />
                  ແພັກເກດທັງໝົດ
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              ຂໍ້ມູນ & ການຊ່ວຍເຫຼືອ
            </p>
            <ul class="mt-4 space-y-2 text-xs">
              <li>
                <NuxtLink to="/dashboard/ai-training-guide" class="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors">
                  <BookOpen class="h-3.5 w-3.5" />
                  ຄູ່ມືການຝຶກສອນ AI
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/login" class="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors">
                  <LogIn class="h-3.5 w-3.5" />
                  ເຂົ້າລະບົບ
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/register" class="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors">
                  <UserPlus class="h-3.5 w-3.5" />
                  ລົງທະບຽນໃໝ່
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              ຜູ້ພັດທະນາລະບົບ
            </p>
            <ul class="mt-4 space-y-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <li class="flex items-start gap-2">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 mt-0.5">
                  <Building2 class="h-3.5 w-3.5" />
                </span>
                <span class="font-bold text-slate-800 dark:text-slate-200">ບໍລິສັດ ສອນເທັກ ອິນໂນເວຊັ່ນ ຈຳກັດຜູ້ດຽວ</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 mt-0.5">
                  <MapPin class="h-3.5 w-3.5" />
                </span>
                <span>ບ້ານ ໜອງແມງດາ ເມືອງໄຊ ແຂວງອຸດົມໄຊ</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400 mt-0.5">
                  <Phone class="h-3.5 w-3.5" />
                </span>
                <span>020 56859090, 28729723</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Copyright & Bottom Section -->
      <div class="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800/80 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-[10px] text-slate-400 dark:text-slate-500">
          &copy; {{ new Date().getFullYear() }} FCAI. ພັດທະນາດ້ວຍ <Heart class="inline h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" /> ໃນປະເທດລາວ.
        </p>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
          <NuxtLink to="/privacy-policy" class="hover:text-sky-500 dark:hover:text-sky-400 transition-colors">ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ</NuxtLink>
          <span>•</span>
          <NuxtLink to="/terms-of-service" class="hover:text-sky-500 dark:hover:text-sky-400 transition-colors">ຂໍ້ກຳນົດ ແລະ ເງື່ອນໄຂ</NuxtLink>
          <span>•</span>
          <span>ເວີຊັນ 1.2.0 (AI Enhanced)</span>
        </div>
      </div>
    </div>
  </footer>
</template>
