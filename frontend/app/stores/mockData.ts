import { defineStore } from 'pinia';

interface MockPage {
  id: string;
  fbPageId: string;
  fbPageName: string;
  fbPageAccessToken: string;
  isActive: boolean;
  knowledgeBase: string;
  createdAt: string;
}

interface MockCustomer {
  id: string;
  pageId: string;
  fbPsid: string;
  fullName: string;
  firstName: string;
  lastName: string;
  profilePic: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

interface MockChatLog {
  id: string;
  pageId: string;
  customerId: string;
  messageIn: string;
  messageOut: string;
  tokenCount: number;
  createdAt: string;
}

interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'tenant';
  status: 'pending' | 'approved' | 'suspended';
  packageId: string;
  tokensUsed: number;
  createdAt: string;
}

interface MockPackage {
  id: string;
  name: string;
  maxPages: number;
  maxTokens: number;
  price: string; // Kip
  isActive: boolean;
}

interface MockPayment {
  id: string;
  userId: string;
  userName: string;
  packageId: string;
  packageName: string;
  amount: number;
  status: 'pending' | 'paid';
  paymentDate?: string;
  createdAt: string;
}

export const useMockStore = defineStore('mockData', () => {
  const pages = ref<MockPage[]>([]);
  const customers = ref<MockCustomer[]>([]);
  const chatLogs = ref<MockChatLog[]>([]);
  const users = ref<MockUser[]>([]);
  const packages = ref<MockPackage[]>([]);
  const payments = ref<MockPayment[]>([]);

  // Default Mock packages
  const defaultPackages: MockPackage[] = [
    { id: 'pkg-starter', name: 'Starter (ທົດລອງ)', maxPages: 1, maxTokens: 10000, price: '0.00', isActive: true },
    { id: 'pkg-standard', name: 'Standard (ຂະໜາດກາງ)', maxPages: 3, maxTokens: 50000, price: '150,000.00', isActive: true },
    { id: 'pkg-enterprise', name: 'Enterprise (ທຸລະກິດໃຫຍ່)', maxPages: 10, maxTokens: 250000, price: '450,000.00', isActive: true },
  ];

  // Default Mock Users
  const defaultUsers: MockUser[] = [
    {
      id: 'admin-user-id',
      email: 'admin@fcai.com',
      name: 'ຜູ້ດູແລລະບົບ (ແອດມິນ)',
      role: 'admin',
      status: 'approved',
      packageId: '',
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tenant-1',
      email: 'somchit@organic.com',
      name: 'ສົມຈິດ ສີສະຫວັດ',
      role: 'tenant',
      status: 'approved',
      packageId: 'pkg-standard',
      tokensUsed: 24500,
      createdAt: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    },
    {
      id: 'tenant-2',
      email: 'phonexay@cookies.com',
      name: 'ພອນໄຊ ວິໄລ',
      role: 'tenant',
      status: 'pending',
      packageId: 'pkg-starter',
      tokensUsed: 0,
      createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    },
    {
      id: 'tenant-3',
      email: 'aluna@fashion.com',
      name: 'ອາລຸນາ ສາຍສະໝອນ',
      role: 'tenant',
      status: 'suspended',
      packageId: 'pkg-enterprise',
      tokensUsed: 120500,
      createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    },
  ];

  // Default Mock Pages
  const defaultPages: MockPage[] = [
    {
      id: 'mock-page-1',
      fbPageId: '10992837465',
      fbPageName: 'ຮ້ານ ຜັກອໍແກນິກ ວຽງຈັນ (Green Shop)',
      fbPageAccessToken: 'mock-token-green-shop',
      isActive: true,
      knowledgeBase: `ຍິນດີຕ້ອນຮັບເຂົ້າສູ່ ຮ້ານ ຜັກອໍແກນິກ ວຽງຈັນ!
ພວກເຮົາເປີດໃຫ້ບໍລິການທຸກມື້: ເວລາ 8:00 ໂມງເຊົ້າ ຫາ 20:00 ໂມງແລງ.
ສະຖານທີ່ຕັ້ງ: ຮ່ອມ 5, ບ້ານ ໂພນຕ້ອງ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ.
ສິນຄ້າທີ່ພວກເຮົາຂາຍ: ຜັກສົດອໍແກນິກ (ກິໂລລະ 30,000 ກີບ), ໝາກໄມ້ປອດສານພິດ (ກ່ອງລະ 45,000 ກີບ), ແລະ ເຄື່ອງດື່ມເພື່ອສຸຂະພາບ.
ຄ່າບໍລິການຈັດສົ່ງ: 15,000 ກີບ ພາຍໃນນະຄອນຫຼວງວຽງຈັນ. ສົ່ງຟຣີ ສໍາລັບຍອດສັ່ງຊື້ 200,000 ກີບຂຶ້ນໄປ.
ຊ່ອງທາງການຊໍາລະເງິນ: ໂອນຜ່ານ BCEL One ຫຼື ຊໍາລະດ້ວຍເງິນສົດປາຍທາງ.`,
      createdAt: new Date().toISOString(),
    },
  ];

  // Default Mock Customers
  const defaultCustomers: MockCustomer[] = [
    {
      id: 'mock-customer-1',
      pageId: 'mock-page-1',
      fbPsid: 'test-user-123',
      fullName: 'ສົມຊາຍ ແສງຈັນ',
      firstName: 'ສົມຊາຍ',
      lastName: 'ແສງຈັນ',
      profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      phoneNumber: '020 5555 4433',
      email: 'somchay@gmail.com',
      address: 'ບ້ານ ດົງໂດກ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ',
      notes: 'ລູກຄ້າມັກຖາມຫາຜັກສະຫຼັດ, ເປັນລູກຄ້າປະຈຳ, ມັກຈັດສົ່ງຕອນແລງ.',
      createdAt: new Date().toISOString(),
    },
  ];

  // Default Mock Chat Logs (Simulating buyer discussion)
  const defaultChatLogs: MockChatLog[] = [
    {
      id: 'mock-chat-1',
      pageId: 'mock-page-1',
      customerId: 'mock-customer-1',
      messageIn: 'ສະບາຍດີ ຮ້ານຕັ້ງຢູ່ໃສນໍ້?',
      messageOut: 'ສະບາຍດີທ່ານ ສົມຊາຍ ແສງຈັນ! ຮ້ານ Green Shop ຕັ້ງຢູ່ ຮ່ອມ 5, ບ້ານ ໂພນຕ້ອງ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ ເດີ້.',
      tokenCount: 450,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock-chat-2',
      pageId: 'mock-page-1',
      customerId: 'mock-customer-1',
      messageIn: 'ຂ້ອຍຢາກໄດ້ ຜັກສົດອໍແກນິກ 2 ກິໂລ ແລະ ໝາກໄມ້ປອດສານພິດ 1 ກ່ອງ ສົ່ງດົງໂດກ.',
      messageOut: 'ໄດ້ເລີຍທ່ານ ສົມຊາຍ! ຜັກສົດອໍແກນິກ 2 ກິໂລ (60,000 ກີບ) ແລະ ໝາກໄມ້ປອດສານພິດ 1 ກ່ອງ (45,000 ກີບ) ລວມທັງໝົດ 105,000 ກີບ + ຄ່າສົ່ງ 15,000 ກີບ, ລວມຍອດທັງໝົດ 120,000 ກີບ. ທ່ານຕົກລົງສັ່ງຊື້ເລີຍບໍ່?',
      tokenCount: 680,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'mock-chat-3',
      pageId: 'mock-page-1',
      customerId: 'mock-customer-1',
      messageIn: 'ຕົກລົງສັ່ງເລີຍ ໂອນຈ່າຍເດີ້ ຂໍເລກບັນຊີແດ່.',
      messageOut: 'ຂອບໃຈຫຼາຍໆເດີ້ ທ່ານ ສົມຊາຍ! ທ່ານສາມາດໂອນເງິນເຂົ້າບັນຊີ BCEL One ເລກບັນຊີ 160-12-00-1099283-001 (ຊື່ບັນຊີ Green Shop) ແລ້ວສົ່ງສະລິບຢັ້ງຢືນການໂອນໃຫ້ພວກເຮົາໄດ້ເລີຍ.',
      tokenCount: 520,
      createdAt: new Date(Date.now() - 900000).toISOString(),
    },
  ];

  // Default Mock Payments
  const defaultPayments: MockPayment[] = [
    {
      id: 'pay-1',
      userId: 'tenant-1',
      userName: 'ສົມຈິດ ສີສະຫວັດ',
      packageId: 'pkg-standard',
      packageName: 'Standard (ຂະໜາດກາງ)',
      amount: 150000,
      status: 'paid',
      paymentDate: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    },
    {
      id: 'pay-2',
      userId: 'tenant-3',
      userName: 'ອາລຸນາ ສາຍສະໝອນ',
      packageId: 'pkg-enterprise',
      packageName: 'Enterprise (ທຸລະກິດໃຫຍ່)',
      amount: 450000,
      status: 'pending',
      createdAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    },
  ];

  function initStore() {
    if (process.client) {
      // 1. Pages
      const storedPages = localStorage.getItem('mock_pages');
      if (storedPages) pages.value = JSON.parse(storedPages);
      else {
        pages.value = defaultPages;
        savePages();
      }

      // 2. Customers
      const storedCustomers = localStorage.getItem('mock_customers');
      if (storedCustomers) customers.value = JSON.parse(storedCustomers);
      else {
        customers.value = defaultCustomers;
        saveCustomers();
      }

      // 3. ChatLogs
      const storedChatLogs = localStorage.getItem('mock_chat_logs');
      if (storedChatLogs) chatLogs.value = JSON.parse(storedChatLogs);
      else {
        chatLogs.value = defaultChatLogs;
        saveChatLogs();
      }

      // 4. Users (Tenants list)
      const storedUsers = localStorage.getItem('mock_users');
      if (storedUsers) users.value = JSON.parse(storedUsers);
      else {
        users.value = defaultUsers;
        saveUsers();
      }

      // 5. Packages
      const storedPackages = localStorage.getItem('mock_packages');
      if (storedPackages) packages.value = JSON.parse(storedPackages);
      else {
        packages.value = defaultPackages;
        savePackages();
      }

      // 6. Payments
      const storedPayments = localStorage.getItem('mock_payments');
      if (storedPayments) payments.value = JSON.parse(storedPayments);
      else {
        payments.value = defaultPayments;
        savePayments();
      }
    }
  }

  function savePages() { if (process.client) localStorage.setItem('mock_pages', JSON.stringify(pages.value)); }
  function saveCustomers() { if (process.client) localStorage.setItem('mock_customers', JSON.stringify(customers.value)); }
  function saveChatLogs() { if (process.client) localStorage.setItem('mock_chat_logs', JSON.stringify(chatLogs.value)); }
  function saveUsers() { if (process.client) localStorage.setItem('mock_users', JSON.stringify(users.value)); }
  function savePackages() { if (process.client) localStorage.setItem('mock_packages', JSON.stringify(packages.value)); }
  function savePayments() { if (process.client) localStorage.setItem('mock_payments', JSON.stringify(payments.value)); }

  // Tenants Management
  function getTenants() {
    initStore();
    return users.value.filter(u => u.role === 'tenant');
  }

  function updateTenantStatus(userId: string, status: 'pending' | 'approved' | 'suspended') {
    const idx = users.value.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users.value[idx].status = status;
      saveUsers();
      return users.value[idx];
    }
    return null;
  }

  // Packages Management
  function getPackages() {
    initStore();
    return packages.value;
  }

  function addPackage(name: string, maxPages: number, maxTokens: number, price: string) {
    const newPkg: MockPackage = {
      id: `pkg-${Date.now()}`,
      name,
      maxPages,
      maxTokens,
      price,
      isActive: true,
    };
    packages.value.push(newPkg);
    savePackages();
    return newPkg;
  }

  // Payments Management
  function getPayments() {
    initStore();
    return payments.value;
  }

  function addPayment(userId: string, amount: number) {
    const user = users.value.find(u => u.id === userId);
    if (!user) return null;

    const pkg = packages.value.find(p => p.id === user.packageId);
    
    const newPay: MockPayment = {
      id: `pay-${Date.now()}`,
      userId,
      userName: user.name,
      packageId: user.packageId,
      packageName: pkg ? pkg.name : 'Unknown Pack',
      amount,
      status: 'paid',
      paymentDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    payments.value.push(newPay);
    savePayments();
    return newPay;
  }

  // Pages & CRM
  function getPages() {
    initStore();
    return pages.value;
  }

  function addPage(fbPageId: string, fbPageName: string, fbPageAccessToken: string) {
    const newPage: MockPage = {
      id: `mock-page-${Date.now()}`,
      fbPageId,
      fbPageName,
      fbPageAccessToken,
      isActive: true,
      knowledgeBase: 'ໃສ່ຂໍ້ມູນຮ້ານຄ້າ ແລະ ບໍລິການຂອງທ່ານຢູ່ບ່ອນນີ້...',
      createdAt: new Date().toISOString(),
    };
    pages.value.push(newPage);
    savePages();
    return newPage;
  }

  function updatePage(id: string, updates: Partial<MockPage>) {
    const pageIndex = pages.value.findIndex((p) => p.id === id);
    if (pageIndex !== -1) {
      pages.value[pageIndex] = { ...pages.value[pageIndex], ...updates };
      savePages();
      return pages.value[pageIndex];
    }
    return null;
  }

  function deletePage(id: string) {
    pages.value = pages.value.filter((p) => p.id !== id);
    savePages();
    customers.value = customers.value.filter((c) => c.pageId !== id);
    saveCustomers();
  }

  function getCustomers(pageId?: string) {
    initStore();
    if (pageId) {
      return customers.value.filter((c) => c.pageId === pageId);
    }
    return customers.value;
  }

  function getCustomer(id: string) {
    initStore();
    return customers.value.find((c) => c.id === id) || null;
  }

  function updateCustomer(id: string, updates: Partial<MockCustomer>) {
    const index = customers.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      customers.value[index] = { ...customers.value[index], ...updates };
      saveCustomers();
      return customers.value[index];
    }
    return null;
  }

  function getChatLogs(pageId: string, fbPsid: string) {
    initStore();
    const cust = customers.value.find((c) => c.fbPsid === fbPsid && c.pageId === pageId);
    if (!cust) return [];
    return chatLogs.value
      .filter((log) => log.customerId === cust.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Simulated AI RAG response matching layout calls
  function simulateAiReply(pageId: string, senderPsid: string, messageText: string) {
    initStore();
    const page = pages.value.find((p) => p.id === pageId);
    if (!page) return { reply: 'Error: page not found', notesUsed: '' };

    let cust = customers.value.find((c) => c.fbPsid === senderPsid && c.pageId === pageId);
    if (!cust) {
      cust = {
        id: `mock-cust-${Date.now()}`,
        pageId,
        fbPsid: senderPsid,
        fullName: `ລູກຄ້າຈຳລອງ (${senderPsid.slice(0, 4)})`,
        firstName: 'ລູກຄ້າຈຳລອງ',
        lastName: senderPsid.slice(0, 4),
        profilePic: '',
        createdAt: new Date().toISOString(),
      };
      customers.value.push(cust);
      saveCustomers();
    }

    const text = messageText.toLowerCase();
    let replyText = '';
    let notesUsed = cust.notes || '';

    // 1. Simple Keyword Match in Lao
    if (text.includes('ສະບາຍດີ') || text.includes('hi') || text.includes('hello')) {
      replyText = `ສະບາຍດີທ່ານ ${cust.fullName}! ຂ້ອຍແມ່ນ AI ຜູ້ຊ່ວຍບໍລິການລູກຄ້າ. ຕ້ອງການໃຫ້ຂ້ອຍຊ່ວຍຫຍັງກ່ຽວກັບສິນຄ້າບໍ່?`;
    } else if (text.includes('ຕັ້ງຢູ່ໃສ') || text.includes('ຮ້ານຢູ່ໃສ') || text.includes('ສະຖານທີ່')) {
      const match = page.knowledgeBase.split('\n').find(l => l.includes('ສະຖານທີ່') || l.includes('ຕັ້ງຢູ່'));
      replyText = match ? match : `ຮ້ານ Green Shop ຕັ້ງຢູ່ ຮ່ອມ 5, ບ້ານ ໂພນຕ້ອງ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ ເດີ້.`;
    } else if (text.includes('ເວລາ') || text.includes('ເປີດ') || text.includes('ປິດ')) {
      const match = page.knowledgeBase.split('\n').find(l => l.includes('ເປີດ') || l.includes('ເວລາ'));
      replyText = match ? match : `ຮ້ານພວກເຮົາເປີດໃຫ້ບໍລິການທຸກມື້: ເວລາ 8:00 ໂມງເຊົ້າ ຫາ 20:00 ໂມງແລງ.`;
    } else if (text.includes('ຈັດສົ່ງ') || text.includes('ຄ່າສົ່ງ') || text.includes('ຄ່າຈັດສົ່ງ')) {
      const match = page.knowledgeBase.split('\n').find(l => l.includes('ຈັດສົ່ງ') || l.includes('ສົ່ງ'));
      replyText = match ? match : `ຄ່າຈັດສົ່ງ: 15,000 ກີບ ພາຍໃນນະຄອນຫຼວງວຽງຈັນ. ສົ່ງຟຣີ ສໍາລັບຍອດສັ່ງຊື້ 200,000 ກີບຂຶ້ນໄປ.`;
    } else if (text.includes('ຈ່າຍ') || text.includes('ໂອນ') || text.includes('ຊຳລະ')) {
      const match = page.knowledgeBase.split('\n').find(l => l.includes('ຊໍາລະ') || l.includes('ໂອນ'));
      replyText = match ? match : `ຊ່ອງທາງການຊໍາລະເງິນ: ໂອນຜ່ານ BCEL One ຫຼື ຊໍາລະດ້ວຍເງິນສົດປາຍທາງ.`;
    } else if (text.includes('ຊື້') || text.includes('ຜັກ') || text.includes('ໝາກໄມ້') || text.includes('ລາຄາ')) {
      replyText = `ຜັກສົດອໍແກນິກ ກິໂລລະ 30,000 ກີບ ແລະ ໝາກໄມ້ປອດສານພິດ ກ່ອງລະ 45,000 ກີບເດີ້. ຕ້ອງການສັ່ງຈຳນວນເທົ່າໃດແຈ້ງໄດ້ເລີຍ!`;
    } else if (text.includes('ຊື້ຫຍັງ') || text.includes('ຂໍ້ມູນ') || text.includes('ປະຫວັດ')) {
      if (cust.notes) {
        replyText = `ຈາກບັນທຶກທີ່ຂ້ອຍມີ: ${cust.notes}`;
      } else {
        replyText = `ຂ້ອຍຍັງບໍ່ມີຂໍ້ມູນບັນທຶກຂອງທ່ານເທື່ອ. ລໍຖ້າແອດມິນມາເພີ່ມຂໍ້ມູນໃນ CRM ໃຫ້ເດີ້.`;
      }
    } else {
      replyText = `ຂໍອະໄພນຳເດີ້ທ່ານ ${cust.fullName}, ຂ້ອຍບໍ່ພົບຂໍ້ມູນກ່ຽວກັບເລື່ອງນີ້ໃນຖານຂໍ້ມູນຄວາມຮູ້ຂອງຮ້ານ. ລໍຖ້າສັກຄູ່ເດີ້, ຈະມີພະນັກງານຕົວຈິງມາຕອບໂດຍໄວ!`;
    }

    // Save logs
    const mockTokens = Math.floor(Math.random() * 300) + 300;
    const newLog: MockChatLog = {
      id: `mock-chat-log-${Date.now()}`,
      pageId,
      customerId: cust.id,
      messageIn: messageText,
      messageOut: replyText,
      tokenCount: mockTokens,
      createdAt: new Date().toISOString(),
    };
    chatLogs.value.push(newLog);
    saveChatLogs();

    // Increment tenant token consumption
    const currentUser = users.value.find(u => u.role === 'tenant'); // Assume single tenant login simulation
    if (currentUser) {
      currentUser.tokensUsed += mockTokens;
      saveUsers();
    }

    return {
      reply: replyText,
      notesUsed,
    };
  }

  // Simulated AI Order Summarizer (Extracts from conversation logs)
  function simulateAiOrderSummary(customerId: string) {
    initStore();
    const cust = customers.value.find(c => c.id === customerId);
    if (!cust) return { success: false, error: 'Customer not found' };

    const logs = chatLogs.value.filter(log => log.customerId === customerId);
    if (logs.length === 0) {
      return { success: false, error: 'ບໍ່ພົບປະຫວັດການສົນທະນາ' };
    }

    // Check if there is any checkout / order keywords in the logs
    const concatText = logs.map(l => l.messageIn + ' ' + l.messageOut).join(' ').toLowerCase();
    
    const hasPurchase = concatText.includes('ຕົກລົງ') || concatText.includes('ສັ່ງ') || concatText.includes('ຊື້') || concatText.includes('ໂອນ');
    
    if (!hasPurchase) {
      return {
        success: true,
        hasPurchase: false,
        summary: 'ບໍ່ພົບການຕົກລົງສັ່ງຊື້ສິນຄ້າໃນການສົນທະນາຂອງລູກຄ້າຄົນນີ້.'
      };
    }

    // Extracted mock summary based on default logs or simulated values
    return {
      success: true,
      hasPurchase: true,
      summary: `🛒 **ສະຫຼຸບການສັ່ງຊື້ດ້ວຍ AI:**
-----------------------------------------
👤 **ຊື່ລູກຄ້າ:** ${cust.fullName}
📞 **ເບີໂທ:** ${cust.phoneNumber || 'ບໍ່ທັນລະບຸ'}
📍 **ທີ່ຢູ່ຈັດສົ່ງ:** ${cust.address || 'ບໍ່ທັນລະບຸ'}
📦 **ລາຍການສິນຄ້າ:** 
  - ຜັກສົດອໍແກນິກ 2 ກິໂລ (60,000 Kip)
  - ໝາກໄມ້ປອດສານພິດ 1 ກ່ອງ (45,000 Kip)
💰 **ຄ່າຈັດສົ່ງ:** 15,000 Kip
💵 **ຍອດລວມທັງໝົດ:** 120,000 Kip
💳 **ສະຖານະການຊຳລະ:** ໂອນເງິນຜ່ານ BCEL One (ລໍຖ້າກວດສອບສະລິບ)
-----------------------------------------
👉 *AI ວິເຄາະ: ລູກຄ້າມີຄວາມຕັ້ງໃຈສັ່ງຊື້ສູງ ແລະ ຕົກລົງຮັບສິນຄ້າແລ້ວ.*`
    };
  }

  return {
    initStore,
    getPages,
    addPage,
    updatePage,
    deletePage,
    getCustomers,
    getCustomer,
    updateCustomer,
    getChatLogs,
    simulateAiReply,
    simulateAiOrderSummary,
    
    // Admin additions
    getTenants,
    updateTenantStatus,
    getPackages,
    addPackage,
    getPayments,
    addPayment,
  };
});
