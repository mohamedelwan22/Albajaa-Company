import Groq from "groq-sdk";
import { z } from "zod";
import fs from "fs";

let groq: Groq | null = null;

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is required for ticket extraction.");
  }

  groq ??= new Groq({ apiKey });
  return groq;
}

const FlightSchema = z.object({
  from: z.string().default(""),
  to: z.string().default(""),
  departureDate: z.string().default(""),
  departureTime: z.string().default(""),
  arrivalTime: z.string().default(""),
  airline: z.string().default(""),
  flightNumber: z.string().default(""),
  class: z.string().default(""),
  baggageAllowance: z.string().default(""),
  gate: z.string().nullable().default(null),
});

const TicketDataSchema = z.object({
  passengerName: z.string().default(""),
  ticketNumber: z.string().default(""),
  bookingRef: z.string().default(""),
  issueDate: z.string().default(""),
  flights: z.array(FlightSchema).default([]),
  price: z.number().nullable().default(null),
  currency: z.string().nullable().default(null),
});

export type TicketData = z.infer<typeof TicketDataSchema>;

// ---------- Extraction Prompt ----------
const EXTRACTION_PROMPT = `
أنت نظام استخراج بيانات متخصص في تذاكر الطيران.
استخرج جميع المعلومات المتاحة وأرجعها كـ JSON فقط بدون أي نص إضافي.

${JSON.stringify({
  passengerName: "",
  ticketNumber: "",
  bookingRef: "",
  issueDate: "",
  flights: [{
    from: "",
    to: "",
    departureDate: "",
    departureTime: "",
    arrivalTime: "",
    airline: "",
    flightNumber: "",
    class: "",
    baggageAllowance: "",
    gate: null
  }],
  price: null,
  currency: null
}, null, 2)}`;

export async function extractTicketData(pdfText: string, pdfPath?: string): Promise<TicketData> {
  const text = pdfText.trim().length > 100 ? pdfText : "";
  if (!text && !pdfPath) return getEmptyTicket();

  try {
    console.log("[Gemini/Groq] استخراج من النص...");
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",  // مجاني وسريع جداً
      messages: [{
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nنص التذكرة:\n${text.substring(0, 12000)}`
      }],
      temperature: 0,
    });
    
    console.log(`[Gemini/Groq] نجح مع موديل: llama-3.3-70b-versatile`);
    return parseAIResponse(completion.choices[0].message.content ?? "");
  } catch (err: any) {
    console.error("[Gemini/Groq] فشل الاستخراج:", err.message);
    return getEmptyTicket();
  }
}

function getEmptyTicket(): TicketData {
  return TicketDataSchema.parse({
    passengerName: "",
    ticketNumber: "",
    bookingRef: "",
    issueDate: "",
    flights: [],
    price: null,
    currency: null,
  });
}

function parseAIResponse(content: string): TicketData {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("الـ AI لم يرجع JSON صحيح");
    }
  }
  if (typeof parsed === "object" && parsed !== null && "error" in (parsed as any)) {
    throw new Error("الملف المرفوع ليس تذكرة طيران");
  }
  const validated = TicketDataSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn("[Gemini/Groq] بيانات جزئية، سيتم استخدامها", validated.error.message);
    return TicketDataSchema.parse({
      ...(parsed as any),
      flights: (parsed as any).flights ?? [],
    });
  }
  return validated.data;
}
