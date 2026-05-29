import { Router } from "express";
import { db, ticketsTable, companiesTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth.js";
import { uploadFile } from "../lib/supabase.js";
import { extractTextFromPDF } from "../lib/pdf-reader.js";
import { generateTicketPDF } from "../lib/pdf-generator.js";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { extractTicketData } from "../lib/ticket-extractor.js";
import { sendTicketEmail } from "../lib/email.service.js";

const router = Router();

type AuthRequest = Parameters<typeof requireAuth>[0] & {
  user?: { id: string; companyId?: string | null; role: string };
};

function paramId(req: AuthRequest): string {
  const v = (req as { params: Record<string, string | string[]> }).params.id;
  return Array.isArray(v) ? v[0] : v;
}

async function findUser(id: string) {
  const rows = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return rows[0] ?? null;
}

// GET /api/tickets/stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const all = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.companyId, user.companyId))
      .orderBy(desc(ticketsTable.createdAt));

    const recent = all.slice(0, 5);
    const recentWithNames = await Promise.all(recent.map(async (t) => {
      const u = await findUser(t.createdBy);
      return { ...t, userName: u?.name ?? null };
    }));

    res.json({
      total: all.length,
      pending: all.filter(t => t.status === "PENDING").length,
      editing: all.filter(t => t.status === "EDITING").length,
      generated: all.filter(t => t.status === "GENERATED").length,
      sent: all.filter(t => t.status === "SENT").length,
      recentTickets: recentWithNames,
    });
  } catch (e: unknown) {
    req.log.error(e, "getTicketStats error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// GET /api/tickets
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const tickets = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.companyId, user.companyId))
      .orderBy(desc(ticketsTable.createdAt));

    const withNames = await Promise.all(tickets.map(async (t) => {
      const u = await findUser(t.createdBy);
      return { ...t, userName: u?.name ?? null };
    }));

    res.json({ tickets: withNames, total: withNames.length });
  } catch (e: unknown) {
    req.log.error(e, "listTickets error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/tickets
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const body = req.body as { passengerName?: string };
    const [ticket] = await db.insert(ticketsTable).values({
      id: randomUUID(),
      companyId: user.companyId,
      createdBy: user.id,
      originalFileUrl: null,
      rawText: null,
      passengerName: body.passengerName ?? null,
      status: "EDITING",
      updatedAt: new Date(),
    }).returning();

    res.status(201).json({ success: true, ticket: { ...ticket, userName: null } });
  } catch (e: unknown) {
    req.log.error(e, "createTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/tickets/upload
router.post("/upload", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const chunks: Buffer[] = [];
    let fileBuffer: Buffer | null = null;
    let originalFileName = "";
    let fileSizeBytes = 0;

    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const Busboy = require("busboy");

    await new Promise<void>((resolve, reject) => {
      const bb = Busboy({ headers: req.headers });
      bb.on("file", (fieldname: string, stream: NodeJS.ReadableStream, filename: string) => {
        originalFileName = filename;
        stream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            fileSizeBytes += chunk.length;
        });
        stream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });
      bb.on("close", resolve);
      bb.on("error", reject);
      req.pipe(bb);
    });

    if (!fileBuffer || (fileBuffer as Buffer).length === 0) {
      res.status(400).json({ error: "يجب رفع ملف PDF" });
      return;
    }

    console.log(`[Upload] ملف: ${originalFileName}`);
    console.log(`[Upload] حجم: ${fileSizeBytes} bytes`);
    
    const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, fileBuffer as Buffer);
      const rawText = await extractTextFromPDF(tmpPath);
      console.log(`[Upload] نص مستخرج: ${rawText.length} حرف`);

    const bucket = process.env.SUPABASE_BUCKET || "tickets";
    const fileUrl = await uploadFile(
      bucket,
      `tickets/${user.companyId}/${randomUUID()}.pdf`,
      fileBuffer as Buffer,
      "application/pdf"
    );

    const [ticket] = await db.insert(ticketsTable).values({
      id: randomUUID(),
      companyId: user.companyId,
      createdBy: user.id,
      originalFileUrl: fileUrl,
      rawText: rawText || null,
      status: "PENDING",
      updatedAt: new Date(),
    }).returning();

    let ticketData: any = null;
    let extractionErrorOccurred = false;

    try {
      ticketData = await extractTicketData(tmpPath);
    } catch (extractionError) {
      req.log.error(extractionError, "Ticket extraction failed");
      extractionErrorOccurred = true;
    }
    
    fs.unlinkSync(tmpPath);

    let finalTicket = ticket;

    if (extractionErrorOccurred || !ticketData) {
      const [fallback] = await db
        .update(ticketsTable)
        .set({
          status: "PENDING",
          extractedData: null,
          updatedAt: new Date(),
        })
        .where(eq(ticketsTable.id, ticket.id))
        .returning();
      finalTicket = fallback;

      res.json({
        success: true,
        warning: "تم رفع الملف لكن استخراج البيانات تلقائياً فشل، يمكنك التعديل يدوياً",
        ticket: { ...finalTicket, userName: null }
      });
    } else {
      const firstFlight = ticketData.flights?.[0];

      const [updated] = await db
        .update(ticketsTable)
        .set({
          extractedData:    ticketData,
          passengerName:    ticketData.passengerName    || null,
          ticketNumber:     ticketData.ticketNumber     || null,
          bookingReference: ticketData.bookingRef       || null,
          issueDate:        ticketData.issueDate        || null,
          price:            ticketData.price != null ? String(ticketData.price) : null,
          currency:         ticketData.currency         || null,
          flightFrom:       firstFlight?.from            || null,
          flightTo:         firstFlight?.to              || null,
          departureDate:    firstFlight?.departureDate   || null,
          departureTime:    firstFlight?.departureTime   || null,
          arrivalDate:      firstFlight?.arrivalDate     || null,
          arrivalTime:      firstFlight?.arrivalTime     || null,
          airline:          firstFlight?.airline         || null,
          flightNumber:     firstFlight?.flightNumber    || null,
          cabinClass:       firstFlight?.class           || null,
          baggageAllowance: firstFlight?.baggageAllowance || null,
          gate:             firstFlight?.gate            || null,
          status:           "EDITING",
          updatedAt:        new Date(),
        })
        .where(eq(ticketsTable.id, ticket.id))
        .returning();

      finalTicket = updated;
      req.log.info({ ticketId: ticket.id, name: ticketData.passengerName }, "Ticket extraction succeeded");

      res.json({
        success: true,
        ticket: { ...finalTicket, userName: null }
      });
    }
  } catch (e: unknown) {
    req.log.error(e, "uploadTicket error");
    res.status(500).json({ error: `فشل رفع الملف: ${(e as Error).message}` });
  }
});


// GET /api/tickets/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const id = paramId(req);
    const rows = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
    const ticket = rows[0];
    if (!ticket || ticket.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    const u = await findUser(ticket.createdBy);
    res.json({ success: true, ticket: { ...ticket, userName: u?.name ?? null } });
  } catch (e: unknown) {
    req.log.error(e, "getTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PATCH /api/tickets/:id
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const id = paramId(req);
    const existingRows = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing || existing.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    const allowed = [
      "passengerName","ticketNumber","bookingReference","flightFrom","flightTo",
      "departureDate","departureTime","arrivalDate","arrivalTime","airline","flightNumber",
      "cabinClass","baggageAllowance","gate","price","currency","issueDate","hidePrice",
      "extractedData"
    ] as const;
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }

    // إذا تم إرسال extractedData يدوياً، نقوم بتحديث الحقول المفصلة أيضاً لضمان المزامنة
    if ("extractedData" in body && body.extractedData) {
      const ext = body.extractedData as any;
      data.passengerName = ext.passengerName || null;
      data.ticketNumber = ext.ticketNumber || null;
      data.bookingReference = ext.bookingRef || null;
      data.issueDate = ext.issueDate || null;
      data.price = ext.price != null ? String(ext.price) : null;
      data.currency = ext.currency || null;

      const firstFlight = ext.flights?.[0];
      if (firstFlight) {
        data.flightFrom = firstFlight.from || null;
        data.flightTo = firstFlight.to || null;
        data.departureDate = firstFlight.departureDate || null;
        data.departureTime = firstFlight.departureTime || null;
        data.arrivalTime = firstFlight.arrivalTime || null;
        data.airline = firstFlight.airline || null;
        data.flightNumber = firstFlight.flightNumber || null;
        data.cabinClass = firstFlight.class || null;
        data.baggageAllowance = firstFlight.baggageAllowance || null;
        data.gate = firstFlight.gate || null;
      }
      data.status = "EDITING";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [updated] = await db.update(ticketsTable).set(data as any).where(eq(ticketsTable.id, id)).returning();
    res.json({ success: true, ticket: { ...updated, userName: null } });
  } catch (e: unknown) {
    req.log.error(e, "updateTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE /api/tickets/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const id = paramId(req);
    const existingRows = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing || existing.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    await db.delete(ticketsTable).where(eq(ticketsTable.id, id));
    res.json({ success: true });
  } catch (e: unknown) {
    req.log.error(e, "deleteTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/tickets/:id/generate
router.post("/:id/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const id = paramId(req);

    let ticketRows;
    try {
      ticketRows = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
    } catch (error) {
      console.error("PDF GENERATION ERROR");
      console.error(error);
      console.error((error as any)?.stack);
      throw error;
    }

    let ticket;
    try {
      ticket = ticketRows[0];
      console.log("Verification - ticket data is not null:", !!ticket);
      if (!ticket || ticket.companyId !== user.companyId) {
        throw new Error("Ticket not found or unauthorized");
      }
    } catch (error) {
      console.error("PDF GENERATION ERROR");
      console.error(error);
      console.error((error as any)?.stack);
      throw error;
    }

    let companyRows;
    try {
      companyRows = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);
    } catch (error) {
      console.error("PDF GENERATION ERROR");
      console.error(error);
      console.error((error as any)?.stack);
      throw error;
    }
    const company = companyRows[0];
    if (!company) { res.status(404).json({ error: "الشركة غير موجودة" }); return; }

    console.log("[STEP] Ticket loaded");

    const pdfBuf = await generateTicketPDF(
      {
        ticketId: ticket.id,
        passengerName: ticket.passengerName,
        ticketNumber: ticket.ticketNumber,
        bookingReference: ticket.bookingReference,
        flightFrom: ticket.flightFrom,
        flightTo: ticket.flightTo,
        departureDate: ticket.departureDate,
        departureTime: ticket.departureTime,
        arrivalDate: ticket.arrivalDate,
        arrivalTime: ticket.arrivalTime,
        airline: ticket.airline,
        flightNumber: ticket.flightNumber,
        cabinClass: ticket.cabinClass,
        baggageAllowance: ticket.baggageAllowance,
        gate: ticket.gate,
        price: ticket.price,
        currency: ticket.currency,
        issueDate: ticket.issueDate,
      },
      {
        name: company.name,
        logoUrl: company.logoUrl,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        phone: company.phone,
        email: company.email,
        website: company.website,
        address: company.address,
        travelNotes: company.travelNotes,
      },
      ticket.hidePrice
    );

    const bucket = process.env.SUPABASE_BUCKET || "tickets";
    const url = await uploadFile(
      bucket,
      `generated/${user.companyId}/${randomUUID()}.pdf`,
      pdfBuf,
      "application/pdf"
    );

    const [updated] = await db.update(ticketsTable)
      .set({ generatedFileUrl: url, status: "GENERATED", updatedAt: new Date() })
      .where(eq(ticketsTable.id, id))
      .returning();

    res.json({ success: true, ticket: { ...updated, userName: null } });
  } catch (error: any) {
    console.error("PDF GENERATION ERROR");
    console.error(error);
    console.error(error.stack);

    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development"
        ? error.stack
        : undefined
    });
  }
});

// POST /api/tickets/:id/send-email
router.post("/:id/send-email", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ error: "غير مصرح" });
      return;
    }
    const id = paramId(req);
    const { email } = req.body as { email: string };

    if (!email || !email.includes("@")) {
      res.status(400).json({ success: false, message: "البريد الإلكتروني غير صحيح" });
      return;
    }

    const [ticket] = await db
      .select()
      .from(ticketsTable)
      .where(and(eq(ticketsTable.id, id), eq(ticketsTable.companyId, user.companyId)))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ success: false, message: "التذكرة غير موجودة" });
      return;
    }
    if (!ticket.generatedFileUrl) {
      res.status(400).json({ success: false, message: "يجب توليد التذكرة أولاً قبل الإرسال" });
      return;
    }

    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId))
      .limit(1);
    if (!company) {
      res.status(404).json({ success: false, message: "الشركة غير موجودة" });
      return;
    }

    const extractedData = ticket.extractedData as any;

    // تحميل PDF من Supabase
    const pdfResponse = await fetch(ticket.generatedFileUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    await sendTicketEmail({
      to: email,
      passengerName: ticket.passengerName ?? extractedData?.passengerName ?? "العميل",
      pdfBuffer,
      companyName: company.name,
      companyPhone: company.phone ?? "",
      companyEmail: company.email ?? "",
    });

    // تحديث الحالة
    const [updated] = await db.update(ticketsTable)
      .set({ status: "SENT", updatedAt: new Date() })
      .where(eq(ticketsTable.id, id))
      .returning();

    res.json({ success: true, message: "تم إرسال التذكرة بنجاح", ticket: { ...updated, userName: null } });
  } catch (err) {
    req.log.error(err, "خطأ في إرسال الإيميل");
    res.status(500).json({ success: false, message: "فشل إرسال البريد الإلكتروني" });
  }
});

export default router;
