import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { uploadFile } from "../lib/supabase.js";
import { randomUUID } from "crypto";

const router = Router();

type AuthRequest = Parameters<typeof requireAuth>[0] & { user?: { companyId?: string | null; role: string } };

// GET /api/company
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(404).json({ error: "لا توجد شركة مرتبطة بهذا المستخدم" });
      return;
    }
    const rows = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);
    const company = rows[0];
    if (!company) {
      res.status(404).json({ error: "الشركة غير موجودة" });
      return;
    }
    res.json(company);
  } catch (e: unknown) {
    req.log.error(e, "getCompany error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PATCH /api/company
router.patch("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ error: "غير مصرح" });
      return;
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      res.status(403).json({ error: "غير مسموح لك بتعديل إعدادات الشركة" });
      return;
    }
    const allowed = ["name", "logoUrl", "primaryColor", "secondaryColor", "email", "phone", "website", "address", "travelNotes"] as const;
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }
    const [updated] = await db
      .update(companiesTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(data as any)
      .where(eq(companiesTable.id, user.companyId))
      .returning();
    res.json(updated);
  } catch (e: unknown) {
    req.log.error(e, "updateCompany error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/company/upload-logo
router.post("/upload-logo", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ error: "غير مصرح" });
      return;
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      res.status(403).json({ error: "غير مسموح لك بتعديل إعدادات الشركة" });
      return;
    }

    const chunks: Buffer[] = [];
    let fileBuffer: Buffer | null = null;
    let filename = "logo.png";
    let contentType = "image/png";

    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const Busboy = require("busboy");

    await new Promise<void>((resolve, reject) => {
      const bb = Busboy({ headers: req.headers });
      bb.on("file", (_fieldname: string, stream: NodeJS.ReadableStream, filenameOrInfo: any, _encoding?: string, mimeType?: string) => {
        let fname = "logo.png";
        let mtype = "image/png";
        if (typeof filenameOrInfo === "string") {
          fname = filenameOrInfo;
          mtype = mimeType || "image/png";
        } else if (filenameOrInfo && typeof filenameOrInfo === "object") {
          fname = filenameOrInfo.filename || "logo.png";
          mtype = filenameOrInfo.mimeType || "image/png";
        }
        filename = fname;
        contentType = mtype;
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });
      bb.on("close", resolve);
      bb.on("error", reject);
      req.pipe(bb);
    });

    if (!fileBuffer || (fileBuffer as Buffer).length === 0) {
      res.status(400).json({ error: "يجب رفع ملف صورة" });
      return;
    }

    // الرفع لـ Supabase Storage في bucket "logos"
    const bucket = "logos";
    const fileExtension = filename.split(".").pop() || "png";
    const logoPath = `logos/${user.companyId}/${randomUUID()}.${fileExtension}`;
    const fileUrl = await uploadFile(bucket, logoPath, fileBuffer, contentType);

    // تحديث قاعدة البيانات
    const [updated] = await db
      .update(companiesTable)
      .set({ logoUrl: fileUrl, updatedAt: new Date() })
      .where(eq(companiesTable.id, user.companyId))
      .returning();

    res.json({ success: true, logoUrl: fileUrl, company: updated });
  } catch (err) {
    req.log.error(err, "uploadLogo error");
    res.status(500).json({ error: "فشل رفع الشعار" });
  }
});

export default router;
