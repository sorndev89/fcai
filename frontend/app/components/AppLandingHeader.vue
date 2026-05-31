<script setup lang="ts">
import { Menu, X, ArrowRight, Sparkles } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const isOpen = ref(false);

const navItems = [
  { label: 'ຄຸນສົມບັດ', href: '#features' },
  { label: 'ວິທີໃຊ້', href: '#how-it-works' },
  { label: 'ບັນຫາ', href: '#problems' },
  { label: 'ຕິດຕໍ່', href: '#cta' },
];

function scrollToSection(href: string) {
  if (route.path !== '/') {
    // If not on home page, go to home page with hash
    router.push({ path: '/', hash: href });
    closeMenu();
    return;
  }

  const id = href.startsWith('#') ? href.slice(1) : href;
  const target = document.getElementById(id);

  if (!target) return;

  const headerOffset = 88;
  const top = window.scrollY + target.getBoundingClientRect().top - headerOffset;

  window.scrollTo({
    top,
    behavior: 'smooth',
  });

  closeMenu();
}

function closeMenu() {
  isOpen.value = false;
}
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50">
    <div class="border-b p-2 border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75">
      <div class="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <NuxtLink to="/" class="flex items-center gap-3" @click="closeMenu">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <Sparkles class="h-5 w-5 text-sky-500" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">FCAI</p>
            <p class="truncate text-[11px] text-slate-500 dark:text-slate-400">Facebook AI Chatbot</p>
          </div>
        </NuxtLink>

        <nav class="hidden items-center gap-1 lg:flex">
          <a
            v-for="item in navItems"
            :key="item.href"
            :href="route.path === '/' ? item.href : '/' + item.href"
            class="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            @click.prevent="scrollToSection(item.href)"
          >
            {{ item.label }}
          </a>
        </nav>

        <div class="hidden items-center gap-2 lg:flex">
          <NuxtLink
            to="/login"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ເຂົ້າລະບົບ
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            ເລີ່ມຟຣີ
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          @click="isOpen = !isOpen"
        >
          <X v-if="isOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in"
        enter-from-class="-translate-y-2 opacity-0"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <div v-if="isOpen" class="border-t border-slate-200/70 px-5 py-4 dark:border-slate-800/80 lg:hidden">
          <nav class="mx-auto flex w-full max-w-7xl flex-col gap-2">
            <a
              v-for="item in navItems"
              :key="item.href"
              :href="route.path === '/' ? item.href : '/' + item.href"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              @click.prevent="scrollToSection(item.href)"
            >
              {{ item.label }}
            </a>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <NuxtLink to="/login" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" @click="closeMenu">
                ເຂົ້າລະບົບ
              </NuxtLink>
              <NuxtLink to="/register" class="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-slate-950" @click="closeMenu">
                ເລີ່ມຟຣີ
              </NuxtLink>
            </div>
          </nav>
        </div>
      </Transition>
    </div>
  </header>
</template>
