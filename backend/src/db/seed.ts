import { db, poolConnection } from '../config/db';
import { packages, users, pages, customers, chatLogs, payments, aiConfig } from './schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function uuid() {
  return crypto.randomUUID();
}

async function seed() {
  console.log('Seeding SaaS database...');
  try {
    // ─── 1. Packages ───────────────────────────────────────────────
    console.log('Generating packages...');
    const pkgData = [
      { id: 'pkg-starter',   name: 'Starter (ທົດລອງ)',     maxPages: 1,  maxTokens: 10000,  price: '0.00',     isActive: true },
      { id: 'pkg-standard',  name: 'Standard (ຂະໜາດກາງ)',  maxPages: 3,  maxTokens: 50000,  price: '150000.00', isActive: true },
      { id: 'pkg-enterprise',name: 'Enterprise (ທຸລະກິດໃຫຍ່)', maxPages: 10, maxTokens: 250000, price: '450000.00', isActive: true },
    ];
    for (const pkg of pkgData) {
      try {
        await db.insert(packages).values(pkg);
        console.log(`  ✓ Package "${pkg.name}" created.`);
      } catch {
        console.log(`  - Package "${pkg.name}" already exists, skipping.`);
      }
    }

    // ─── 2. Master Admin ──────────────────────────────────────────
    console.log('Generating admin user...');
    const adminHashed = await bcrypt.hash('admin123', 10);
    try {
      await db.insert(users).values({
        id: 'admin-user-id',
        email: 'admin@saas.com',
        password: adminHashed,
        name: 'SaaS Administrator',
        role: 'admin',
        status: 'approved',
      });
      console.log('  ✓ Admin account created (admin@saas.com / admin123).');
    } catch {
      console.log('  - Admin account already exists, skipping.');
    }

    // ─── 3. Sample Tenant Users ──────────────────────────────────
    console.log('Generating tenant users...');
    const tenantHashed = await bcrypt.hash('tenant123', 10);
    const tenantUsers = [
      { id: 'tenant-user-1', email: 'souk@example.com',  name: 'ສຸກ ຈັນທະວົງ',      role: 'tenant', status: 'approved',  packageId: 'pkg-enterprise' },
      { id: 'tenant-user-2', email: 'kham@example.com',   name: 'ຄຳ ສີວິໄລ',        role: 'tenant', status: 'approved',  packageId: 'pkg-standard'  },
      { id: 'tenant-user-3', email: 'phone@example.com',  name: 'ໂພນ ສຸລິຍະ',        role: 'tenant', status: 'approved',  packageId: 'pkg-starter'   },
      { id: 'tenant-user-4', email: 'seng@example.com',   name: 'ເຊັງ ອິນທະລັງສີ',    role: 'tenant', status: 'pending',   packageId: 'pkg-standard'  },
      { id: 'tenant-user-5', email: 'vilay@example.com',  name: 'ວິໄລ ພົມມະວົງ',      role: 'tenant', status: 'suspended', packageId: 'pkg-starter'   },
    ];
    for (const t of tenantUsers) {
      try {
        await db.insert(users).values({ ...t, password: tenantHashed });
        console.log(`  ✓ Tenant "${t.name}" (${t.email}) created.`);
      } catch {
        console.log(`  - Tenant "${t.email}" already exists, skipping.`);
      }
    }

    // ─── 4. Sample Facebook Pages ─────────────────────────────────
    console.log('Generating Facebook pages...');
    const pageData = [
      { id: 'page-1', userId: 'tenant-user-1', fbPageId: 'fb-page-101', fbPageName: 'ຮ້ານອາຫານ ສຸກແຊບ',    fbPageAccessToken: 'EAATokenPage101', knowledgeBase: 'ຮ້ານອາຫານສຸກແຊບ ເປີດບໍລິການ 08:00-22:00 ທຸກວັນ. ໂທ 020 5555 1111.' },
      { id: 'page-2', userId: 'tenant-user-1', fbPageId: 'fb-page-102', fbPageName: 'ຮ້ານເສີມສວຍ ສຸກງາມ',  fbPageAccessToken: 'EAATokenPage102', knowledgeBase: 'ຮ້ານເສີມສວຍສຸກງາມ ເປີດ 09:00-20:00, ປິດວັນອາທິດ.' },
      { id: 'page-3', userId: 'tenant-user-2', fbPageId: 'fb-page-201', fbPageName: 'ຮ້ານຂາຍເຄື່ອງ ຄຳດີ',   fbPageAccessToken: 'EAATokenPage201', knowledgeBase: 'ຮ້ານຂາຍເຄື່ອງຄຳດີ ມີສິນຄ້າທຸກປະເພດ. ເປີດ 08:00-17:00.' },
      { id: 'page-4', userId: 'tenant-user-2', fbPageId: 'fb-page-202', fbPageName: 'ບໍລິການຂົນສົ່ງ ຄຳໄວ',  fbPageAccessToken: 'EAATokenPage202', knowledgeBase: 'ບໍລິການຂົນສົ່ງ 24ຊົ່ວໂມງ. ໂທ 020 7777 8888.' },
      { id: 'page-5', userId: 'tenant-user-3', fbPageId: 'fb-page-301', fbPageName: 'ຮ້ານກາເຟ ໂພນຫອມ',     fbPageAccessToken: 'EAATokenPage301', knowledgeBase: 'ຮ້ານກາເຟໂພນຫອມ ເປີດ 06:00-21:00. ມີ WiFi ຟຣີ.' },
    ];
    for (const p of pageData) {
      try {
        await db.insert(pages).values(p);
        console.log(`  ✓ Page "${p.fbPageName}" created.`);
      } catch {
        console.log(`  - Page "${p.fbPageName}" already exists, skipping.`);
      }
    }

    // ─── 5. Sample Customers ──────────────────────────────────────
    console.log('Generating customers...');
    const customerData = [
      { id: 'cust-1',  pageId: 'page-1', fbPsid: 'psid-1001', fullName: 'ອຳໄພ ມະນີວົງ',   phoneNumber: '020 5111 1111' },
      { id: 'cust-2',  pageId: 'page-1', fbPsid: 'psid-1002', fullName: 'ຈັນທາ ພົມມະວົງ',  phoneNumber: '020 5222 2222' },
      { id: 'cust-3',  pageId: 'page-2', fbPsid: 'psid-1003', fullName: 'ມາລິ ສີວິໄລ',     phoneNumber: '020 5333 3333' },
      { id: 'cust-4',  pageId: 'page-3', fbPsid: 'psid-2001', fullName: 'ທອງ ຈັນທະລັງສີ',  phoneNumber: '020 5444 4444' },
      { id: 'cust-5',  pageId: 'page-3', fbPsid: 'psid-2002', fullName: 'ນາງ ແສງດາວ',        phoneNumber: '020 5555 5555' },
      { id: 'cust-6',  pageId: 'page-4', fbPsid: 'psid-2003', fullName: 'ບຸນມີ ໄຊຍະວົງ',    phoneNumber: '020 5666 6666' },
      { id: 'cust-7',  pageId: 'page-5', fbPsid: 'psid-3001', fullName: 'ວັນນາ ສຸລິຍະ',     phoneNumber: '020 5777 7777' },
      { id: 'cust-8',  pageId: 'page-5', fbPsid: 'psid-3002', fullName: 'ຄຳພູ ວົງສາ',       phoneNumber: '020 5888 8888' },
      { id: 'cust-9',  pageId: 'page-1', fbPsid: 'psid-1004', fullName: 'ສົມຈິດ ພົມມະວົງ', phoneNumber: '020 5999 9999' },
      { id: 'cust-10', pageId: 'page-3', fbPsid: 'psid-2004', fullName: 'ແສງອາທິດ ຈັນທະລາ', phoneNumber: '020 5000 0001' },
    ];
    for (const c of customerData) {
      try {
        await db.insert(customers).values(c);
        console.log(`  ✓ Customer "${c.fullName}" created.`);
      } catch {
        console.log(`  - Customer "${c.fullName}" already exists, skipping.`);
      }
    }

    // ─── 6. Sample Chat Logs with Token Counts ────────────────────
    console.log('Generating chat logs...');
    const chatLogData = [
      // Page 1 (Souk's restaurant) – 5 conversations
      { pageId: 'page-1', customerId: 'cust-1', messageIn: 'ສະບາຍດີ, ຢາກສັ່ງອາຫານ',                        messageOut: 'ສະບາຍດີ ທ່ານອຳໄພ! ກະລຸນາເບິ່ງລາຍການອາຫານໄດ້ເລີຍ.',          tokenCount: 45 },
      { pageId: 'page-1', customerId: 'cust-1', messageIn: 'ຂ້ອຍຢາກໄດ້ເຂົ້າຫນຽວຫມູ',                     messageOut: 'ໄດ້ເລີຍ ທ່ານ! ເຂົ້າໜຽວໝູ ລາຄາ 35,000 ກີບ. ຕ້ອງການເພີ່ມຫຍັງອີກ?', tokenCount: 62 },
      { pageId: 'page-1', customerId: 'cust-1', messageIn: 'ແລ້ວຢາກໄດ້ ນ້ຳຕານເຢັນ 1 ຈອກ',               messageOut: 'ນ້ຳຕານເຢັນ ລາຄາ 8,000 ກີບ. ລວມທັງໝົດ 43,000 ກີບ.',          tokenCount: 58 },
      { pageId: 'page-1', customerId: 'cust-2', messageIn: 'ສະບາຍດີ, ຢາກຖາມວ່າຮ້ານເປີດເວລາໃດ',         messageOut: 'ສະບາຍດີ! ຮ້ານເປີດ 08:00-22:00 ທຸກວັນເດີ້.',                     tokenCount: 38 },
      { pageId: 'page-1', customerId: 'cust-9', messageIn: 'ຂໍສັ່ງ ລາບຫມູ 1 ຖ້ວຍ ແລະ ປີ້ງປາ 1 ຢ່າງ',   messageOut: 'ໄດ້ເລີຍ! ລາບໝູ 40,000 ກີບ, ປີ້ງປາ 55,000 ກີບ. ລວມ 95,000 ກີບ.',  tokenCount: 71 },
      // Page 3 (Khamdee's shop) – 4 conversations
      { pageId: 'page-3', customerId: 'cust-4', messageIn: 'ສະບາຍດີ, ຢາກຊື້ເສື້ອຍືດ',                      messageOut: 'ສະບາຍດີ ທ່ານທອງ! ພວກເຮົາມີເສື້ອຍືດຫຼາຍສີ. ລາຄາເລີ່ມຕົ້ນ 50,000 ກີບ.', tokenCount: 55 },
      { pageId: 'page-3', customerId: 'cust-5', messageIn: 'ມີກະເປົາໃບຫຍໍ້ຂາຍບໍ່',                        messageOut: 'ມີເດີ້! ກະເປົາໃບຫຍໍ້ ລາຄາ 120,000 ກີບ. ມີຫຼາຍສີໃຫ້ເລືອກ.',      tokenCount: 50 },
      { pageId: 'page-3', customerId: 'cust-10', messageIn: 'ຢາກໄດ້ໂທລະສັບມືຖື ລາຄາບໍ່ເກີນ 2 ລ້ານ',   messageOut: 'ມີຫຼາຍລຸ້ນໃຫ້ເລືອກເດີ້. ຂໍແນະນຳ Xiaomi Redmi Note ລາຄາ 1,800,000 ກີບ.', tokenCount: 68 },
      { pageId: 'page-3', customerId: 'cust-4', messageIn: 'ຂອບໃຈ ແລ້ວຂ້ອຍຈະມາເບິ່ງທີ່ຮ້ານ',            messageOut: 'ຍິນດີຕ້ອນຮັບເດີ້! ເປີດ 08:00-17:00 ເດີ້.',                              tokenCount: 35 },
      // Page 5 (Phone's coffee shop) – 3 conversations
      { pageId: 'page-5', customerId: 'cust-7', messageIn: 'ກາເຟຮ້ອນ ມີບໍ່',                                 messageOut: 'ມີເດີ້! ກາເຟຮ້ອນ ລາຄາ 15,000 ກີບ. ຕ້ອງການເພີ່ມນົມຂົ້ນບໍ່?',              tokenCount: 48 },
      { pageId: 'page-5', customerId: 'cust-8', messageIn: 'ມີ WiFi ໃຊ້ບໍ່ທີ່ຮ້ານ',                           messageOut: 'ມີ WiFi ຟຣີໃຊ້ເດີ້ ທ່ານ! ລະຫັດຜ່ານ: 12345678',                          tokenCount: 42 },
      { pageId: 'page-5', customerId: 'cust-7', messageIn: 'ຂໍກາເຟເຢັນ 1 ຈອກ ແລະ ເຄັກຊັອກໂກແລັດ 1 ຊິ້ນ', messageOut: 'ໄດ້ເລີຍ! ກາເຟເຢັນ 18,000 ກີບ, ເຄັກຊັອກໂກແລັດ 25,000 ກີບ. ລວມ 43,000 ກີບ.', tokenCount: 74 },
      // Page 2 (Souk's beauty salon) – 2 conversations
      { pageId: 'page-2', customerId: 'cust-3', messageIn: 'ຢາກຈອງຄິວຕັດຜົມ ວັນເສົານີ້',                 messageOut: 'ໄດ້ເລີຍ! ວັນເສົານີ້ ເວລາ 10:00 ສະດວກບໍ່?',                                   tokenCount: 44 },
      { pageId: 'page-2', customerId: 'cust-3', messageIn: 'ສະດວກເດີ້ ຂອບໃຈຫຼາຍ',                           messageOut: 'ຍິນດີຕ້ອນຮັບ! ເຈົ້າຈະມາ 10:00 ໂມງ ວັນເສົາ. ພົບກັນເດີ້.',                          tokenCount: 40 },
      // Page 4 (Kham's delivery) – 2 conversations
      { pageId: 'page-4', customerId: 'cust-6', messageIn: 'ຢາກສົ່ງເຄື່ອງຈາກ ນະຄອນຫຼວງ ໄປ ຫຼວງພະບາງ',      messageOut: 'ຄ່າສົ່ງ 50,000 ກີບ. ໃຊ້ເວລາ 2-3 ວັນ. ສົນໃຈໃຊ້ບໍລິການບໍ່?',                      tokenCount: 55 },
      { pageId: 'page-4', customerId: 'cust-6', messageIn: 'ແພກເກດໃຫຍ່ ຮັບໄດ້ບໍ່',                         messageOut: 'ຮັບໄດ້ເດີ້ ສູງສຸດ 50 ກິໂລກຣາມ. ລາຄາຂຶ້ນກັບນ້ຳໜັກ.',                        tokenCount: 48 },
    ];
    for (const chat of chatLogData) {
      try {
        await db.insert(chatLogs).values({ ...chat, id: uuid() });
      } catch {
        // skip if exists
      }
    }
    console.log(`  ✓ ${chatLogData.length} chat logs created.`);

    // ─── 7. Sample Payments ───────────────────────────────────────
    console.log('Generating payments...');
    const paymentData = [
      { userId: 'tenant-user-1', packageId: 'pkg-enterprise', amount: '450000.00', status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2025-12-01') },
      { userId: 'tenant-user-1', packageId: 'pkg-enterprise', amount: '450000.00', status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2026-01-01') },
      { userId: 'tenant-user-1', packageId: 'pkg-enterprise', amount: '450000.00', status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2026-02-01') },
      { userId: 'tenant-user-1', packageId: 'pkg-enterprise', amount: '450000.00', status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2026-03-01') },
      { userId: 'tenant-user-2', packageId: 'pkg-standard',   amount: '150000.00', status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2026-01-15') },
      { userId: 'tenant-user-2', packageId: 'pkg-standard',   amount: '150000.00', status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2026-02-15') },
      { userId: 'tenant-user-2', packageId: 'pkg-standard',   amount: '150000.00', status: 'pending', recordedBy: null,          paymentDate: new Date('2026-03-15') },
      { userId: 'tenant-user-3', packageId: 'pkg-starter',    amount: '0.00',      status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2026-02-10') },
      { userId: 'tenant-user-4', packageId: 'pkg-standard',   amount: '150000.00', status: 'pending', recordedBy: null,          paymentDate: new Date('2026-03-20') },
      { userId: 'tenant-user-5', packageId: 'pkg-starter',    amount: '0.00',      status: 'paid', recordedBy: 'admin-user-id', paymentDate: new Date('2025-12-10') },
    ];
    for (const pm of paymentData) {
      try {
        await db.insert(payments).values({ id: uuid(), ...pm });
      } catch {
        // skip
      }
    }
    console.log(`  ✓ ${paymentData.length} payments created.`);

    // ─── 8. AI Config (default Gemini) ────────────────────────────
    console.log('Generating AI config...');
    try {
      await db.insert(aiConfig).values({
        id: 'ai-config-1',
        provider: 'gemini',
        modelName: 'gemini-2.0-flash',
        apiKey: process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE',
        isActive: true,
      });
      console.log('  ✓ Default AI config created (Gemini 2.0 Flash).');
    } catch {
      console.log('  - AI config already exists, skipping.');
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Failed to seed database:', error);
  } finally {
    await poolConnection.end();
  }
}

seed();
