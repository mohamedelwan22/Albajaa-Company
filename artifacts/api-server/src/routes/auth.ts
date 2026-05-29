import { Router } from "express";
import { db, usersTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, getTokenFromRequest, verifyToken } from "../lib/auth.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      return;
    }

    const userRows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = userRows[0];

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

    let company = null;
    if (user.companyId) {
      const companyRows = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);
      company = companyRows[0] ?? null;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company,
      },
    });
  } catch (e: unknown) {
    req.log.error(e, "login error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.cookie("token", "", { httpOnly: true, maxAge: 0, path: "/" });
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: "غير مصرح" });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "جلسة منتهية" });
      return;
    }
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "المستخدم غير موجود" });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
  } catch (e: unknown) {
    req.log.error(e, "getMe error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
