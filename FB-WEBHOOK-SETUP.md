# ຄູ່ມືການຕັ້ງຄ່າ Facebook Webhook
## Facebook AI Chatbot — fcai.sdevapp.com

---

## ສາລະບານ

1. [ພາບລວມ](#1-ພາບລວມ)
2. [ຂໍ້ມູນທີ່ຕ້ອງການ](#2-ຂໍ້ມູນທີ່ຕ້ອງການ)
3. [ຂັ້ນຕອນການຕັ້ງຄ່າ Webhook](#3-ຂັ້ນຕອນການຕັ້ງຄ່າ-webhook)
   - [3.1 ເຂົ້າ Facebook Developers Console](#31-ເຂົ້າ-facebook-developers-console)
   - [3.2 ສ້າງ App (ຖ້າຍັງບໍ່ມີ)](#32-ສ້າງ-app-ຖ້າຍັງບໍ່ມີ)
   - [3.3 ເພີ່ມ Messenger Product](#33-ເພີ່ມ-messenger-product)
   - [3.4 ຕັ້ງຄ່າ Callback URL](#34-ຕັ້ງຄ່າ-callback-url)
   - [3.5 ເລືອກ Webhook Events](#35-ເລືອກ-webhook-events)
   - [3.6 ສ້າງ Page Access Token](#36-ສ້າງ-page-access-token)
   - [3.7 Subscribe Webhook ໃສ່ເພຈ](#37-subscribe-webhook-ໃສ່ເພຈ)
4. [ການເຊື່ອມຕໍ່ເພຈໃນ Dashboard](#4-ການເຊື່ອມຕໍ່ເພຈໃນ-dashboard)
5. [ການທົດສອບ](#5-ການທົດສອບ)
6. [ການແກ້ໄຂບັນຫາ](#6-ການແກ້ໄຂບັນຫາ)
7. [ຂໍ້ມູນເພີ່ມເຕີມ](#7-ຂໍ້ມູນເພີ່ມເຕີມ)

---

## 1. ພາບລວມ

Webhook ແມ່ນຈຸດທີ່ Facebook ສົ່ງຂໍ້ຄວາມຈາກ Messenger ມາໃຫ້ Server ຂອງພວກເຮົາ. ເມື່ອຜູ້ໃຊ້ສົ່ງຂໍ້ຄວາມມາຫາ Page Facebook, Facebook ຈະສົ່ງຂໍ້ຄວາມນັ້ນມາທີ່ Webhook URL ຂອງພວກເຮົາ, ແລ້ວ Server ຈະສົ່ງໄປໃຫ້ AI (Gemini) ປຸງແຕ່ງ ແລະ ສົ່ງຄຳຕອບກັບໄປ.

### ສະຖາປັດຕະຍະກຳ

```
ຜູ້ໃຊ້ → Facebook Messenger
                  ↓
        Facebook Server
                  ↓  POST (Webhook Event)
https://fcai.sdevapp.com/webhook/facebook
                  ↓
    Express Server (backend/src/routes/webhook.ts)
                  ↓
        1. ຊອກຫາ Page ໃນ DB (recipient.id)
        2. ຊອກຫາ ຫຼື ສ້າງ Customer
        3. ສົ່ງຂໍ້ຄວາມໄປໃຫ້ Gemini AI
        4. ສົ່ງຄຳຕອບກັບໄປຫາຜູ້ໃຊ້
                  ↓
       ຜູ້ໃຊ້ໄດ້ຮັບຄຳຕອບ ← Facebook Messenger
```

> **ສຳຄັນ:** Webhook ນີ້ຕັ້ງຄ່າ **ພຽງຄັ້ງດຽວ** ເທົ່ານັ້ນ ສຳລັບທຸກເພຈ. ລູກຄ້າທີ່ຕ້ອງການໃຊ້ລະບົບບໍ່ຕ້ອງຕັ້ງຄ່າ Webhook ເອງ — ພຽງແຕ່ Login ເຂົ້າ Dashboard ແລະ ໃສ່ Page ID + Token.

---

## 2. ຂໍ້ມູນທີ່ຕ້ອງການ

| ລາຍການ | ຄ່າ |
|---------|------|
| **Callback URL** | `https://fcai.sdevapp.com/webhook/facebook` |
| **Verify Token** | `e29e8cfbe8f73418a5c5930feae16e635b28151cb08a9331b932d14ed0175731` |
| **Server Status** | ✅ ກຳລັງເຮັດວຽກ (Production Environment) |

---

## 3. ຂັ້ນຕອນການຕັ້ງຄ່າ Webhook

### 3.1 ເຂົ້າ Facebook Developers Console

1. ເປີດ Browser ໄປທີ່ [https://developers.facebook.com](https://developers.facebook.com)
2. Login ດ້ວຍບັນຊີ Facebook (ຄວນໃຊ້ບັນຊີທີ່ເປັນ Admin ຂອງ Page)

### 3.2 ສ້າງ App (ຖ້າຍັງບໍ່ມີ)

ຖ້າທ່ານຍັງບໍ່ມີ App:

1. ກົດ **"My Apps"** ທີ່ມຸມຂວາເທິງ
2. ກົດ **"Create App"**
3. ເລືອກ **"Business"** (ແນະນຳ)
4. ໃສ່ຊື່ App (ຕົວຢ່າງ: "FCAI Chatbot")
5. ໃສ່ Email ຕິດຕໍ່
6. ກົດ **"Create App"**

### 3.3 ເພີ່ມ Messenger Product

1. ຢູ່ App Dashboard, ຊອກຫາ **"Add Product"** (ເມນູຊ້າຍມື)
2. ຊອກຫາ **"Messenger"**
3. ກົດ **"Set Up"**

### 3.4 ຕັ້ງຄ່າ Callback URL

1. ຢູ່ໃນແຖບ **Messenger → Settings**
2. ຊອກຫາສ່ວນ **"Webhooks"**
3. ກົດ **"Add Callback URL"** (ຫຼື **"Edit Callback URL"** ຖ້າມີຢູ່ແລ້ວ)
4. ໃສ່ຄ່າ:

| ຊ່ອງ | ຄ່າທີ່ຕ້ອງໃສ່ |
|-------|-------------------|
| **Callback URL** | `https://fcai.sdevapp.com/webhook/facebook` |
| **Verify Token** | `e29e8cfbe8f73418a5c5930feae16e635b28151cb08a9331b932d14ed0175731` |

5. ກົດ **"Verify and Save"**

> ✅ ຖ້າສຳເລັດ, ຈະເຫັນຂໍ້ຄວາມ **"Webhooks are set up for Messenger"**

### 3.5 ເລືອກ Webhook Events

ຫຼັງຈາກ Verify ສຳເລັດ, ໃຫ້ເລືອກ Events (ປະເພດຂໍ້ມູນ) ທີ່ Webhook ຈະຮັບ:

| Event | ລາຍລະອຽດ | ຈຳເປັນ? |
|-------|-------------|-----------|
| ☑️ **messages** | ຮັບຂໍ້ຄວາມຈາກຜູ້ໃຊ້ | ✅ **ຈຳເປັນ** |
| ☐ **messaging_postbacks** | ຮັບການກົດປຸ່ມ Postback | ເລືອກຕາມຕ້ອງການ |
| ☐ **messaging_optins** | ເມື່ອຜູ້ໃຊ້ Subscribe | ເລືອກຕາມຕ້ອງການ |
| ☐ **message_deliveries** | ສະຖານະການສົ່ງຂໍ້ຄວາມ | ເລືອກຕາມຕ້ອງການ |
| ☐ **message_reads** | ເມື່ອຜູ້ໃຊ້ອ່ານຂໍ້ຄວາມ | ເລືອກຕາມຕ້ອງການ |

> **ຄຳແນະນຳ:** ເລືອກຢ່າງໜ້ອຍ **messages** ເພື່ອໃຫ້ Bot ສາມາດຮັບ ແລະ ຕອບຂໍ້ຄວາມໄດ້.

### 3.6 ສ້າງ Page Access Token

1. ຢູ່ລຸ່ມສຸດຂອງໜ້າ Messenger Settings
2. ຊອກຫາສ່ວນ **"Token Generation"**
3. ເລືອກ **Page** ທີ່ຕ້ອງການ
4. ກົດ **"Generate Access Token"**
5. ລະບົບຈະຂໍອະນຸຍາດ (Permissions) — ອະນຸຍາດຢ່າງໜ້ອຍ:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `pages_messaging` (ສຳຄັນ: ໃຊ້ສົ່ງຂໍ້ຄວາມ)
6. ຄັດລອກ Token (ຈະຂຶ້ນຕົ້ນດ້ວຍ `EAAx...`)

> **ຫມາຍເຫດ:** Token ນີ້ມີອາຍຸ 60 ວັນ. ເມື່ອໝົດອາຍຸ, ຕ້ອງສ້າງໃໝ່.

### 3.7 Subscribe Webhook ໃສ່ເພຈ

1. ຢູ່ສ່ວນ **"Webhooks"** ດຽວກັນ
2. ກົດ **"Add Subscriptions"**
3. ເລືອກ **Page** ທີ່ຕ້ອງການ
4. ກົດ **"Subscribe"**

> ✅ ເມື່ອສຳເລັດ, Webhook ຈະເຊື່ອມຕໍ່ກັບ Page ຂອງທ່ານແລ້ວ.

---

## 4. ການເຊື່ອມຕໍ່ເພຈໃນ Dashboard

ຫຼັງຈາກຕັ້ງຄ່າ Webhook ສຳເລັດ, ໃຫ້ເຊື່ອມຕໍ່ເພຈໃນ Dashboard ຂອງພວກເຮົາ:

1. **Login** ເຂົ້າ [https://fcai.sdevapp.com](https://fcai.sdevapp.com)
2. ໄປທີ່ **"ເພຈ Facebook"** (ເມນູຊ້າຍມື)
3. ກົດ **"ເຊື່ອມຕໍ່ເພຈ"**
4. ໃສ່ຂໍ້ມູນ:

| ຊ່ອງ | ຄຳອະທິບາຍ |
|-------|-------------|
| **ຊື່ເພຈ** | ຊື່ Page Facebook ຂອງທ່ານ (ຕົວຢ່າງ: "ຮ້ານກາເຟຂອງຂ້ອຍ") |
| **Facebook Page ID** | ເລກ ID ຂອງ Page (ເບິ່ງໄດ້ຈາກໜ້າ About ຂອງ Page ໃນ Facebook) |
| **Page Access Token** | Token ທີ່ໄດ້ຈາກຂັ້ນຕອນ 3.6 (ຂຶ້ນຕົ້ນດ້ວຍ `EAAx...`) |

### ການຊອກຫາ Facebook Page ID

ມີ 3 ວິທີ:

1. **ຈາກໜ້າເພຈ:** ໄປທີ່ Page Facebook → ເບິ່ງ URL → `facebook.com/ຊື່ເພຈ` (ໃຊ້ຊື່ນີ້)
2. **ຈາກ Page Source:** ໄປທີ່ Page → ຄລິກຂວາ → View Page Source → ຊອກ `page_id`
3. **ຈາກ Graph API:** `https://graph.facebook.com/v19.0/ຊື່ເພຈ?access_token=XXX`

### ການທົດສອບການເຊື່ອມຕໍ່

ໃນ Dashboard, ກ່ອນຈະບັນທຶກ, ທ່ານສາມາດກົດ **"ກວດສອບການເຊື່ອມຕໍ່ (Test Connection)"** ເພື່ອທົດສອບວ່າ Page ID ແລະ Token ຖືກຕ້ອງ.

---

## 5. ການທົດສອບ

### ທົດສອບ Webhook (ດ້ວຍ curl)

```bash
curl "https://fcai.sdevapp.com/webhook/facebook?hub.mode=subscribe&hub.verify_token=e29e8cfbe8f73418a5c5930feae16e635b28151cb08a9331b932d14ed0175731&hub.challenge=test123"
```

**ຜົນທີ່ຄວນໄດ້:**
```
test123
HTTP_CODE:200
```

### ທົດສອບການສົ່ງຂໍ້ຄວາມ

1. ເປີດ Page Facebook ຂອງທ່ານ
2. ກົດ **"Send Message"**
3. ພິມຂໍ້ຄວາມ (ຕົວຢ່າງ: "ສະບາຍດີ")
4. Bot ຈະຕອບກັບໂດຍອັດຕະໂນມັດ

### ທົດສອບຜ່ານ Simulator (ບໍ່ຕ້ອງໃຊ້ Facebook)

ຖ້າທ່ານຢາກທົດສອບໂດຍບໍ່ຕ້ອງສົ່ງຂໍ້ຄວາມຈາກ Messenger ຈິງ, ໃຊ້ Simulator endpoint:

```bash
curl -X POST "https://fcai.sdevapp.com/webhook/facebook/simulate" \
  -H "Authorization: Bearer ໃສ່_Token_ຂອງທ່ານ" \
  -H "Content-Type: application/json" \
  -d '{
    "fbPageId": "ໃສ່_FB_Page_ID",
    "senderPsid": "test-user-001",
    "messageText": "ສະບາຍດີ"
  }'
```

---

## 6. ການແກ້ໄຂບັນຫາ

### ບັນຫາ: "The callback URL or verify token couldn't be validated"

| ສາເຫດ | ວິທີແກ້ |
|--------|------------|
| Verify Token ບໍ່ກົງກັນ | ກວດສອບວ່າ Token ໃນ Facebook Console ກົງກັບ `FB_VERIFY_TOKEN` ໃນ Server `.env` |
| Server ບໍ່ໄດ້ Restart | ຫຼັງປ່ຽນ `.env` ຕ້ອງ Restart Server (`pm2 restart all`) |
| Callback URL ຜິດ | ຕ້ອງໃຊ້ `https://fcai.sdevapp.com/webhook/facebook` (ມີ `/webhook/facebook`) |

### ບັນຫາ: Bot ບໍ່ຕອບຂໍ້ຄວາມ

| ສາເຫດ | ວິທີແກ້ |
|--------|------------|
| ຍັງບໍ່ໄດ້ Subscribe Webhook ໃສ່ເພຈ | ກວດສອບໃນ Messenger Settings → Webhooks → Subscriptions |
| Page Access Token ໝົດອາຍຸ | ສ້າງ Token ໃໝ່ ແລະ ອັບເດດໃນ Dashboard |
| GEMINI_API_KEY ບໍ່ໄດ້ຕັ້ງຄ່າ | ກວດສອບ `.env` ວ່າມີ `GEMINI_API_KEY=...` |
| Page ຖືກປິດ (Inactive) | ເປີດ Page ໃນ Dashboard |
| Token ຫຼື AI quota ໝົດ | ກວດສອບໃນໜ້າ Usage / ອັບເກຣດແພັກເກດ |

### ບັນຫາ: 403 Forbidden ເມື່ອ Verify

ຖ້າທົດສອບດ້ວຍ curl ແລ້ວໄດ້ 403:

```bash
# ກວດສອບວ່າ Server ກຳລັງຮັບຢູ່
curl https://fcai.sdevapp.com/health

# ທົດສອບ Webhook ດ້ວຍ Token
curl "https://fcai.sdevapp.com/webhook/facebook?hub.mode=subscribe&hub.verify_token=TOKEN_ຂອງທ່ານ&hub.challenge=test123"
```

### ການກວດ Logs ໃນ Server

```bash
# ຖ້າໃຊ້ PM2
pm2 logs

# ຖ້າໃຊ້ systemd
journalctl -u your-service -f
```

---

## 7. ຂໍ້ມູນເພີ່ມເຕີມ

### ໄຟລ໌ທີ່ກ່ຽວຂ້ອງໃນໂປຼເຈັກ

| ໄຟລ໌ | ລາຍລະອຽດ |
|--------|-------------|
| [`backend/src/index.ts`](backend/src/index.ts) | Mount ເສັ້ນທາງ `/webhook/facebook` (ແຖວ 37) |
| [`backend/src/routes/webhook.ts`](backend/src/routes/webhook.ts) | Webhook logic — GET (verify) ແລະ POST (ຮັບຂໍ້ຄວາມ) |
| [`backend/src/services/facebook.ts`](backend/src/services/facebook.ts) | Facebook Graph API — ສົ່ງຂໍ້ຄວາມ, ດຶງ Profile, ທົດສອບການເຊື່ອມຕໍ່ |
| [`backend/src/services/gemini.ts`](backend/src/services/gemini.ts) | Google Gemini AI — ສ້າງຄຳຕອບ |
| [`backend/.env`](backend/.env) | ການຕັ້ງຄ່າ Environment Variables |
| [`backend/src/routes/pages.ts`](backend/src/routes/pages.ts) | API ສຳລັບຈັດການເພຈ (CRUD) |
| [`frontend/app/pages/dashboard/pages/index.vue`](frontend/app/pages/dashboard/pages/index.vue) | UI ສຳລັບເຊື່ອມຕໍ່ເພຈໃນ Dashboard |

### Environment Variables ທີ່ສຳຄັນ

| Variable | ຄ່າ | ລາຍລະອຽດ |
|----------|------|-------------|
| `PORT` | `5002` | Port ທີ່ Server ຮັບ |
| `DATABASE_URL` | `mysql://...` | ການເຊື່ອມຕໍ່ຖານຂໍ້ມູນ |
| `FB_VERIFY_TOKEN` | `e29e8cfbe8f73418a5c5930feae16e635b28151cb08a9331b932d14ed0175731` | Token ສຳລັບ Verify Webhook |
| `GEMINI_API_KEY` | (ຕ້ອງຕັ້ງຄ່າ) | API Key ຂອງ Google Gemini AI |
| `JWT_SECRET` | (ຕັ້ງຄ່າ) | Secret ສຳລັບ JWT Authentication |

### ລິ້ງທີ່ເປັນປະໂຫຍດ

- [Facebook Developers Console](https://developers.facebook.com)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Facebook Webhook Docs](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform/)
- [fcai.sdevapp.com (Dashboard)](https://fcai.sdevapp.com)
- [fcai.sdevapp.com/health (Server Status)](https://fcai.sdevapp.com/health)

---

> **ສະບັບ:** 1.0.0  
> **ອັບເດດລ່າສຸດ:** 2026-05-30  
> **ຈັດທຳໂດຍ:** FCAI Development Team
