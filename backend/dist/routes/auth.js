"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'fb-chatbot-super-secret-key-12345';
// Public endpoint to retrieve active subscription packages for registration form
router.get('/packages', async (req, res) => {
    try {
        const list = await db_1.db
            .select()
            .from(schema_1.packages)
            .where((0, drizzle_orm_1.eq)(schema_1.packages.isActive, true))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.packages.price));
        res.json(list);
    }
    catch (error) {
        console.error('Fetch packages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Register User (with Package Selection)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, packageId } = req.body;
        if (!email || !password || !name || !packageId) {
            return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ ລວມທັງເລືອກແພັກເກດ' });
        }
        // Check if email already exists
        const existingUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'ອີເມວນີ້ຖືກລົງທະບຽນໃນລະບົບແລ້ວ' });
        }
        // Verify selected package exists
        const targetPkg = await db_1.db.select().from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, packageId)).limit(1);
        if (targetPkg.length === 0) {
            return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກໃນລະບົບ' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const userId = crypto_1.default.randomUUID();
        // Insert user with role 'tenant' and status 'pending' (pending SaaS Owner approval)
        await db_1.db.insert(schema_1.users).values({
            id: userId,
            email,
            password: hashedPassword,
            name,
            role: 'tenant',
            status: 'pending',
            packageId,
        });
        res.status(201).json({
            message: 'ລົງທະບຽນສຳເລັດ! ກະລຸນາລໍຖ້າການອານຸມັດບັນຊີຈາກຜູ້ດູແລລະບົບ (SaaS Admin)',
            user: { id: userId, email, name, role: 'tenant', status: 'pending' },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'ກະລຸນາປ້ອນອີເມວ ແລະ ລະຫັດຜ່ານ' });
        }
        // Fetch user
        const userResult = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        if (userResult.length === 0) {
            return res.status(401).json({ error: 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
        }
        const user = userResult[0];
        // Check password
        const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
        }
        // Check account status for tenants
        if (user.role !== 'admin') {
            if (user.status === 'pending') {
                return res.status(403).json({ error: 'ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າການອານຸມັດຈາກ SaaS Owner' });
            }
            if (user.status === 'suspended') {
                return res.status(403).json({ error: 'ບັນຊີຂອງທ່ານຖືກລະງັບການໃຊ້ງານຊົ່ວຄາວ' });
            }
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'ເຂົ້າສູ່ລະບົບສຳເລັດ',
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, packageId: user.packageId },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user profile (authenticated)
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'ບໍ່ມີສິດເຂົ້າເຖິງ' });
        }
        const userResult = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (userResult.length === 0) {
            return res.status(404).json({ error: 'ບໍ່ພົບຜູ້ໃຊ້' });
        }
        const user = userResult[0];
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            packageId: user.packageId,
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Upgrade / change package (tenant)
router.put('/upgrade', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { packageId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'ບໍ່ມີສິດເຂົ້າເຖິງ' });
        }
        if (!packageId) {
            return res.status(400).json({ error: 'ກະລຸນາເລືອກແພັກເກດ' });
        }
        // Verify package exists and is active
        const targetPkg = await db_1.db.select().from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, packageId)).limit(1);
        if (targetPkg.length === 0) {
            return res.status(400).json({ error: 'ບໍ່ພົບແພັກເກດທີ່ເລືອກ' });
        }
        if (!targetPkg[0].isActive) {
            return res.status(400).json({ error: 'ແພັກເກດນີ້ບໍ່ສາມາດໃຊ້ງານໄດ້' });
        }
        // Update user's package
        await db_1.db.update(schema_1.users).set({ packageId }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        res.json({ message: 'ອັບເກຣດແພັກເກດສຳເລັດ', packageId });
    }
    catch (error) {
        console.error('Upgrade package error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map