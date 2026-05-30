import { defineStore } from 'pinia';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'tenant';
  status: 'pending' | 'approved' | 'suspended';
  packageId?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const tokenCookie = useCookie<string | null>('auth_token', { maxAge: 60 * 60 * 24 * 7, path: '/' });
  const userCookie = useCookie<User | null>('auth_user', { maxAge: 60 * 60 * 24 * 7, path: '/' });

  const token = ref<string | null>(tokenCookie.value);
  const user = ref<User | null>(userCookie.value);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    tokenCookie.value = newToken;
    userCookie.value = newUser;
  }

  function logout() {
    token.value = null;
    user.value = null;
    tokenCookie.value = null;
    userCookie.value = null;
    navigateTo('/login');
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    setAuth,
    logout,
  };
});
