// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false, // SPA mode for single-server deployment with Express

  // Move Nuxt build cache outside node_modules to avoid Windows EPERM
  // (VS Code's TS server locks files in node_modules/.cache/nuxt/)
  cacheDir: '.nuxt-cache',

  css: [
    '@material-design-icons/font/index.css',
    '~/assets/css/tailwind.css'
  ],
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  tailwindcss: {
    config: {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Nuanta', 'Nuanta-Medium', 'Inter', 'sans-serif'],
          },
        },
      },
    }
  },
  nitro: {
    output: {
      dir: '.output-dist',
      publicDir: '.output-dist/public',
    },
    // Store Nitro build cache outside node_modules to avoid Windows EPERM file-locking
    buildDir: '.nitro-cache',
  },
  // Vite cache outside node_modules to avoid Windows EPERM file-locking on .cache
  vite: {
    cacheDir: '.vite-cache',
    build: {
      emptyOutDir: true, // Clean output before each build
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'lucide-vue-next',
        'pinia',
      ],
    },
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        module: 'ESNext',
        types: ['@pinia/nuxt'],
      },
      include: ['../app/types/**/*.d.ts'],
    },
  },
})
