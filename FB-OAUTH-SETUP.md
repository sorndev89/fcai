# ຄູ່ມືການຕັ້ງຄ່າ Facebook Login (OAuth)
## Facebook Login (OAuth) — Setup Guide

ຄູ່ມືນີ້ຈະອະທິບາຍວິທີການຕັ້ງຄ່າ **Facebook Login (OAuth)** ເພື່ອໃຫ້ລູກຄ້າຂອງທ່ານສາມາດເຊື່ອມຕໍ່ Facebook Page ຜ່ານການ Login ດ້ວຍບັນຊີ Facebook ຂອງເຂົາເຈົ້າໄດ້ຢ່າງງ່າຍດາຍ — ໂດຍບໍ່ຕ້ອງຄັດລອກ Page Access Token ດ້ວຍຕົນເອງ.

---

## 📋 ສິ່ງທີ່ຕ້ອງກຽມ

| ລາຍການ | ລາຍລະອຽດ | ໄດ້ມາຈາກໃສ? |
|----------|-------------|----------------|
| `FB_APP_ID` | ເລກ ID ຂອງ Facebook App | Facebook Developers Console |
| `FB_APP_SECRET` | ລະຫັລັບ App Secret | Facebook Developers Console |
| Valid OAuth Redirect URI | URL ທີ່ Facebook ຈະສົ່ງ callback ມາ | ຕັ້ງຄ່າໃນ Facebook App |

---

## 🧱 ຂັ້ນຕອນທີ 1: ສ້າງ Facebook App

ເຂົ້າໄປທີ່ [https://developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**

1. ເລືອກ **"Business"** ເປັນປະເພດ App
2. ຕັ້ງຊື່ App (ຕົວຢ່າງ: `FCAI Chatbot`)
3. ໃສ່ອີເມວຕິດຕໍ່ ແລະ ກົດ **Create App**

![Create App](https://developers.facebook.com/docs/development/create-app/)

---

## 🧱 ຂັ້ນຕອນທີ 2: ເພີ່ມ Product "Facebook Login"

1. ຢູ່ Dashboard ຂອງ App, ຊອກຫາ **"Add Product"**
2. ຊອກຫາ **Facebook Login** → ກົດ **Set Up**
3. ເລືອກ **"Web"** ເປັນແພລດຟອມ

---

## 🧱 ຂັ້ນຕອນທີ 3: ຕັ້ງຄ່າ OAuth Redirect URI

1. ໄປທີ່ **Facebook Login → Settings** (ຢູ່ເມນູຊ້າຍ)
2. ຊອກຫາຊ່ອງ **"Valid OAuth Redirect URIs"**
3. ເພີ່ມ URL ດັ່ງນີ້:

**ສະພາບແວດລ້ອມພັດທະນາ (localhost):**
```
http://localhost:5002/api/auth/facebook/callback
```

**ສະພາບແວດລ້ອມຈິງ (Production):**
```
https://fcai.sdevapp.com/api/auth/facebook/callback
```

> ⚠️ **ສຳຄັນ:** ຕ້ອງເພີ່ມທັງສອງ URL ຖ້າທ່ານຕ້ອງການທົດສອບໃນທ້ອງຖິ່ນກ່ອນ.

4. ກົດ **Save Changes**

---

## 🧱 ຂັ້ນຕອນທີ 4: ເອົາ App ID ແລະ App Secret

1. ໄປທີ່ **Settings → Basic** (ຢູ່ເມນູຊ້າຍ)
2. ຈະເຫັນ:
   - **App ID** — ເລກຕົວເລກ (ຕົວຢ່າງ: `123456789012345`)
   - **App Secret** — ກົດ **Show** ເພື່ອເບິ່ງ (ຕົວຢ່າງ: `abc123def456...`)
3. ຄັດລອກທັງສອງຄ່າໄວ້

---

## 🧱 ຂັ້ນຕອນທີ 5: ຕັ້ງຄ່າໃນ `.env` ຂອງເຊີບເວີ

ເປີດໄຟລ໌ [`backend/.env`](backend/.env) ແລະ ໃສ່ຄ່າທີ່ໄດ້ມາ:

```env
# ── Facebook OAuth (ສຳລັບ Facebook Login) ──
FB_APP_ID=123456789012345
FB_APP_SECRET=abc123def456...
```

> ຖ້າຢູ່在生产 (production) ໃຫ້ແກ້ໄຂທີ່ `.env` ໃນເຊີບເວີຈິງ.

---

## 🧱 ຂັ້ນຕອນທີ 6: ຮັນ DB Migration

ເພີ່ມຖັນໃໝ່ໃສ່ຕາຕະລາງ `pages` ໃນຖານຂໍ້ມູນ:

**ຖ້າໃຊ້ Drizzle Migrate:**
```bash
cd backend
npm run db:migrate
```

**ຖ້າໃຊ້ Adminer / phpMyAdmin:** ຮັນ SQL ຕໍ່ໄປນີ້:

```sql
ALTER TABLE `pages` ADD `fb_user_access_token` text;
ALTER TABLE `pages` ADD `fb_token_expires_at` timestamp;
```

---

## 🧱 ຂັ້ນຕອນທີ 7: ຕັ້ງຄ່າ Permissions ໃນ Facebook App

ເພື່ອໃຫ້ OAuth ສາມາດດຶງຂໍ້ມູນເພຈ ແລະ Token ໄດ້, ຕ້ອງເພີ່ມ Permissions ດັ່ງນີ້:

1. ໄປທີ່ **App Review → Permissions and Features**
2. ກົດ **Add** ສຳລັບແຕ່ລະ Permission ຕໍ່ໄປນີ້:

| Permission | ໃຊ້ເພື່ອຫຍັງ? | ຕ້ອງການ App Review ບໍ່? |
|------------|-----------------|---------------------------|
| `pages_show_list` | ເບິ່ງລາຍຊື່ເພຈທີ່ຜູ້ໃຊ້ຈັດການ | ❌ ບໍ່ຕ້ອງ (ຖ້າໃຊ້ສະເພາະຜູ້ພັດທະນາ/ທົດສອບ) |
| `pages_manage_metadata` | ຈັດການຂໍ້ມູນເພຈ | ❌ ບໍ່ຕ້ອງ (ຖ້າໃຊ້ສະເພາະຜູ້ພັດທະນາ/ທົດສອບ) |
| `pages_messaging` | ສົ່ງຂໍ້ຄວາມຜ່ານ Messenger | ❌ ບໍ່ຕ້ອງ (ຖ້າໃຊ້ສະເພາະຜູ້ພັດທະນາ/ທົດສອບ) |
| `pages_read_engagement` | ອ່ານຂໍ້ມູນການໂຕ້ຕອບ | ❌ ບໍ່ຕ້ອງ (ຖ້າໃຊ້ສະເພາະຜູ້ພັດທະນາ/ທົດສອບ) |

> **ໝາຍເຫດ:** ຖ້າ App ຂອງທ່ານຢູ່ໃນ **Development Mode** (ຍັງບໍ່ໄດ້ Submit ຮ້ອງຂໍ App Review), ສະເພາະຜູ້ທີ່ມີບົດບາດ Admin/Developer/Tester ໃນ App ເທົ່ານັ້ນທີ່ສາມາດໃຊ້ OAuth ໄດ້. ຖ້າຕ້ອງການໃຫ້ລູກຄ້າທົ່ວໄປໃຊ້ໄດ້, ຕ້ອງສົ່ງຂໍ App Review ສຳລັບແຕ່ລະ Permission.

---

## 🧱 ຂັ້ນຕອນທີ 8: ເພີ່ມຜູ້ທົດສອບ (ຖ້າຍັງບໍ່ໄດ້ສົ່ງ App Review)

1. ໄປທີ່ **Roles → Test Users** (ຢູ່ເມນູຊ້າຍ)
2. ກົດ **Add** → **Create a test user** (ຫຼື Add existing Facebook account)
3. ເພີ່ມບັນຊີ Facebook ຂອງລູກຄ້າທີ່ຕ້ອງການທົດສອບ

---

## 🔄 ການເຮັດວຽກຂອງ OAuth Flow

```
ຜູ້ໃຊ້ກົດ "ເຊື່ອມຕໍ່ຜ່ານ Facebook"
         │
         ▼
  ເຊີບເວີສ້າງ state (CSRF token) ແລະ ສົ່ງກັບ Facebook Login URL
         │
         ▼
  ຜູ້ໃຊ້ຖືກພາໄປທີ່ໜ້າ Login ຂອງ Facebook
         │
         ▼
  ຜູ້ໃຊ້ອະນຸຍາດ Permissions ທີ່ຮ້ອງຂໍ
         │
         ▼
  Facebook ສົ່ງ callback ກັບມາທີ່:
  /api/auth/facebook/callback?code=...&state=...
         │
         ▼
  ເຊີບເວີກວດສອບ state (CSRF) → ແລກ code ເອົາ Token
         │
         ▼
  ແລກ Short-lived Token → Long-lived Token (ອາຍຸ 60 ວັນ)
         │
         ▼
  ດຶງຂໍ້ມູນເພຈທັງໝົດຂອງຜູ້ໃຊ້ (me/accounts)
         │
         ▼
  ບັນທຶກ/ອັບເດດ ຂໍ້ມູນເພຈໃນຖານຂໍ້ມູນ
         │
         ▼
  ສົ່ງກັບໄປໜ້າ Dashboard ດ້ວຍ oauth_success=true
```

---

## 🧪 ວິທີທົດສອບ

### 1. ທົດສອບໃນທ້ອງຖິ່ນ

1. ຕັ້ງຄ່າ `FB_APP_ID` ແລະ `FB_APP_SECRET` ໃນ [`backend/.env`](backend/.env)
2. ຣັນເຊີບເວີ: `cd backend && npm run dev:backend`
3. ເປີດ `http://localhost:3000/dashboard/pages`
4. ກົດ **"ເຊື່ອມຕໍ່ເພຈ"** → ກົດ **"ເຊື່ອມຕໍ່ຜ່ານ Facebook"**
5. ລະບົບຈະພາໄປທີ່ Facebook Login → ອະນຸຍາດ → ກັບມາ Dashboard

### 2. ທົດສອບດ້ວຍ Curl (API ໂດຍກົງ)

```bash
# 1. Login ເອົາ JWT Token ກ່ອນ
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}'

# 2. ໃຊ້ Token ທີ່ໄດ້ມາເພື່ອຂໍ OAuth URL
curl -X GET http://localhost:5002/api/auth/facebook/login \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# ຈະໄດ້ຮັບ:
# { "redirectUrl": "https://www.facebook.com/dialog/oauth?client_id=..." }
```

---

## ⏰ ການຕໍ່ອາຍຸ Token ອັດຕະໂນມັດ

Function `refreshPageAccessToken()` ໃນ [`backend/src/routes/facebook-oauth.ts`](backend/src/routes/facebook-oauth.ts:227) ຖືກອອກແບບມາເພື່ອຕໍ່ອາຍຸ Page Access Token ໂດຍອັດຕະໂນມັດ.

**ວິທີໃຊ້ງານ (ສຳລັບອະນາຄົດ):**
- ສ້າງ cron job ທີ່ເຮັດວຽກທຸກໆອາທິດ ຫຼື ເດືອນ
- ໃຫ້ມັນເອີ້ນໃຊ້ `refreshPageAccessToken(pageId)` ສຳລັບແຕ່ລະເພຈ
- ຖ້າ User Access Token ຍັງໃຊ້ໄດ້, ມັນຈະດຶງ Page Access Token ໃໝ່ມາໃຫ້

```typescript
// ຕົວຢ່າງ: ຕໍ່ອາຍຸ Token ທຸກໆເພຈ
import { refreshPageAccessToken } from './routes/facebook-oauth';

const pageIds = ['uuid-1', 'uuid-2', 'uuid-3'];
for (const pageId of pageIds) {
  const newToken = await refreshPageAccessToken(pageId);
  if (newToken) {
    console.log(`✅ ຕໍ່ອາຍຸ Token ສຳເລັດ: ${pageId}`);
  } else {
    console.warn(`⚠️ ບໍ່ສາມາດຕໍ່ອາຍຸ Token: ${pageId} (ຜູ້ໃຊ້ອາດຈະຕ້ອງ Login ໃໝ່)`);
  }
}
```

---

## ❓ ຄຳຖາມທີ່ພົບເລື້ອຍ (FAQ)

### Q: ລູກຄ້າຕ້ອງເປັນ Admin/Developer ຂອງ Facebook App ບໍ່?
**A:** ຖ້າ App ຢູ່ໃນ **Development Mode**, ແມ່ນ — ສະເພາະຜູ້ທີ່ຖືກເພີ່ມເປັນ Admin/Developer/Tester ເທົ່ານັ້ນ. ຖ້າຕ້ອງການໃຫ້ລູກຄ້າທົ່ວໄປໃຊ້ໄດ້, ຕ້ອງສົ່ງ **App Review** ໃຫ້ Facebook ອະນຸມັດ.

### Q: Token ໝົດອາຍຸແລ້ວຈະເຮັດແນວໃດ?
**A:** ລູກຄ້າຕ້ອງກົດ "ເຊື່ອມຕໍ່ຜ່ານ Facebook" ອີກຄັ້ງ ເພື່ອ Login ໃໝ່. ລະບົບຈະອັບເດດ Token ໃໝ່ໃຫ້ອັດຕະໂນມັດ.

### Q: ລູກຄ້າມີຫຼາຍເພຈ, ຈະເຊື່ອມຕໍ່ຄັ້ງດຽວໄດ້ບໍ່?
**A:** ໄດ້! ເມື່ອລູກຄ້າ Login ຜ່ານ OAuth, ລະບົບຈະດຶງ **ເພຈທັງໝົດ** ທີ່ລູກຄ້າຈັດການຢູ່ ແລະ ເຊື່ອມຕໍ່ໃຫ້ອັດຕະໂນມັດ.

### Q: ແຕກຕ່າງຈາກການປ້ອນ Token ເອງແນວໃດ?
**A:** 
- ປ້ອນເອງ: ຕ້ອງໄປ Graph API Explorer, ສ້າງ Token, ຄັດລອກ, ມາວາງ — Token ມີອາຍຸ 60 ວັນ, ຕ້ອງເຮັດໃໝ່ເອງ
- OAuth: ກົດປຸ່ມດຽວ → Login ຜ່ານ Facebook → ລະບົບເຮັດໃຫ້ໝົດ — Token ມີອາຍຸ 60 ວັນ, ສາມາດຕໍ່ອາຍຸອັດຕະໂນມັດໄດ້

---

## 🔧 ການແກ້ໄຂບັນຫາ

| ບັນຫາ | ສາເຫດ | ວິທີແກ້ |
|---------|---------|-----------|
| `oauth_error=state_mismatch` | CSRF state cookie ບໍ່ກົງ | ລອງໃໝ່ອີກຄັ້ງ, ໃຫ້ແນ່ໃຈວ່າ cookie ຖືກສົ່ງ |
| `oauth_error=token_exchange_failed` | `FB_APP_ID` ຫຼື `FB_APP_SECRET` ບໍ່ຖືກຕ້ອງ | ກວດສອບຄ່າໃນ `.env` |
| `oauth_error=long_token_failed` | ບໍ່ສາມາດຂະຫຍາຍ Token ໄດ້ | ກວດສອບ App Secret |
| `oauth_error=pages_fetch_failed` | ບໍ່ສາມາດດຶງຂໍ້ມູນເພຈ | ກວດສອບວ່າຜູ້ໃຊ້ມີເພຈທີ່ຈັດການຢູ່ ແລະ ໄດ້ອະນຸຍາດ `pages_show_list` ແລ້ວ |
| 403 Forbidden ເມື່ອກົດ OAuth | Redirect URI ບໍ່ກົງກັບທີ່ຕັ້ງໄວ້ | ກວດສອບ Valid OAuth Redirect URIs ໃນ Facebook App Settings |
| ບໍ່ເຫັນປຸ່ມ OAuth | `FB_APP_ID` ຫຼື `FB_APP_SECRET` ຫວ່າງເປົ່າ | ຕັ້ງຄ່າໃຫ້ຄົບຖ້ວນກ່ອນ |

---

## 🔗 ລິ້ງທີ່ກ່ຽວຂ້ອງ

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Facebook Graph API - User Node](https://developers.facebook.com/docs/graph-api/reference/user)
- [Facebook Graph API - Page Access Tokens](https://developers.facebook.com/docs/facebook-login/access-tokens#pagetokens)
- [ຄູ່ມື Webhook Setup](FB-WEBHOOK-SETUP.md)
- [OAuth Route Source Code](backend/src/routes/facebook-oauth.ts)
