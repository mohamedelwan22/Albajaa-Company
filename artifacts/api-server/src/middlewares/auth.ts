import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTokenFromRequest, verifyToken } from "../lib/auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "غير مصرح — يجب تسجيل الدخول" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "جلسة منتهية — سجل الدخول مجدداً" });
    return;
  }
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  const user = rows[0];
  if (!user || !user.isActive) {
    res.status(401).json({ error: "الحساب غير نشط" });
    return;
  }
  (req as Request & { user: typeof user }).user = user;
  next();
}
