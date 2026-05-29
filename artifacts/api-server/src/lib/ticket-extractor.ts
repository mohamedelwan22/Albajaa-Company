// ============================================================
// ملف: artifacts/api-server/src/lib/ticket-extractor.ts
// ============================================================
// هدف: استخراج بيانات تذكرة الطيران من أي شركة بأي شكل
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import Groq from "groq-sdk";
import { pdf } from "pdf-to-img";

let groq: Groq | null = null;

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is required for ticket extraction.");
  }

  groq ??= new Groq({ apiKey });
  return groq;
}

// ============================================================
// أنواع التذاكر المدعومة
// ============================================================
type TicketType =
  | "emirates"
  | "fly_cham"
  | "trip_com"
  | "egyptair"
  | "pegasus"
  | "turkish_airlines"
  | "airarabia"
  | "royal_jordanian"
  | "ur_airlines"
  | "generic";

interface ExtractedTicket {
  passengerName: string;
  ticketNumber: string;
  bookingRef: string;
  issueDate: string;
  flights: Flight[];
  price: number | null;
  currency: string | null;
  airline: string;
  ticketType: TicketType;
  rawConfidence: number;
}

interface Flight {
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  class: string;
  baggageAllowance: string;
  gate: string | null;
}

// ============================================================
// المرحلة 1: كشف نوع التذكرة من النص
// ============================================================
function detectTicketType(text: string): { type: TicketType; confidence: number } {
  const lower = text.toLowerCase();

  const patterns: { type: TicketType; keywords: string[]; weight: number }[] = [
    { type: "emirates", keywords: ["emirates", "record locator", "dubai international", "ek"], weight: 1 },
    { type: "fly_cham", keywords: ["fly cham", "isa aviation", "cham wings", "fyc"], weight: 1 },
    { type: "trip_com", keywords: ["trip.com", "trip.com group", "iata"], weight: 0.8 },
    { type: "egyptair", keywords: ["egyptair", "star alliance", "cairo", "ms"], weight: 1 },
    { type: "pegasus", keywords: ["pegasus", "flypgs", "sabiha gokcen", "pc -"], weight: 1 },
    { type: "turkish_airlines", keywords: ["turkish airlines", "turk hava yollari", "thy", "tk "], weight: 1 },
    { type: "airarabia", keywords: ["airarabia", "air arabia", "sharjah", "g9"], weight: 1 },
    { type: "royal_jordanian", keywords: ["royal jordanian", "viewtrip", "amman", "rj"], weight: 1 },
    { type: "ur_airlines", keywords: ["ur airlines", "urairlines", "baghdad", "ud"], weight: 1 },
  ];

  let bestMatch: TicketType = "generic";
  let bestScore = 0;

  for (const pattern of patterns) {
    const matches = pattern.keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
    const score = (matches / pattern.keywords.length) * pattern.weight;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern.type;
    }
  }

  return { type: bestMatch, confidence: bestScore };
}

// ============================================================
// المرحلة 2: تنظيف النص حسب نوع التذكرة
// ============================================================
function cleanTextForType(text: string, type: TicketType): string {
  let cleaned = text;

  switch (type) {
    case "pegasus":
      cleaned = cleaned
        .replace(/Uçuş No\s+Flight\s+Number/gi, "Flight")
        .replace(/Kalkış\s+Saati\s+Dep\.\s+Time/gi, "Departure")
        .replace(/Varış\s+Saati\s+Arr\.\s+Time/gi, "Arrival")
        .replace(/Nereden\s+From/gi, "From")
        .replace(/Nereye\s+To/gi, "To")
        .replace(/Tarih\s+Date/gi, "Date")
        .replace(/Bilet\s+Durumu\s+Ticket\s+Status/gi, "Status")
        .replace(/Toplam\s+Bagaj\s+Hakki\s+\/Total\s+Baggage\s+Allowance/gi, "Baggage");
      break;

    case "turkish_airlines":
      cleaned = cleaned
        .replace(/Yolcu ismi \/Passenger Name/gi, "Passenger")
        .replace(/Bilet No \/Ticket Number/gi, "Ticket")
        .replace(/Rezervasyon No \/Booking Ref/gi, "BookingRef")
        .replace(/Kalkış\s+Varış/gi, "Departure Arrival")
        .replace(/From\/To/gi, "Route");
      break;

    case "royal_jordanian":
      cleaned = cleaned
        .replace(/ViewTrip/g, "")
        .replace(/My Trip/g, "")
        .replace(/NON STOP/g, "")
        .replace(/Confirmed/gi, "")
        .replace(/Carry-On[\s\S]*?Baggage Allowance/g, "Baggage:")
        .replace(/\|[\s\w]+\|/g, " ")
        .replace(/□/g, "")
        .replace(/|||/g, " ");
      break;

    case "trip_com":
      cleaned = cleaned
        .replace(/Trip\.com Group IATA/g, "Trip.com")
        .replace(/Wealdv1s poss1bIe/g, "")
        .replace(/[•·]\s*\d+\./g, "\n");
      break;

    default:
      break;
  }

  return cleaned
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// ============================================================
// المرحلة 3: استخراج النص من PDF
// ============================================================
export async function extractTextFromPDF(filePath: string): Promise<{ text: string; isImageBased: boolean }> {
  let parser: PDFParse | null = null;

  try {
    const buffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const text = data.text?.trim() ?? "";
    const isImageBased = text.length < 50;

    if (isImageBased) {
      console.log(`[PDF] تذكرة صورة — النص: ${text.length} حرف`);
      return { text: "", isImageBased: true };
    }

    console.log(`[PDF] نص مستخرج — ${text.length} حرف`);
    return { text, isImageBased: false };
  } catch (err) {
    console.error("[PDF] خطأ:", err);
    return { text: "", isImageBased: true };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

// ============================================================
// المرحلة 4: بناء Prompt مخصص حسب نوع التذكرة
// ============================================================
function buildPrompt(text: string, type: TicketType): string {
  const baseInstructions = `
أنت خبير في استخراج بيانات تذاكر الطيران. استخرج البيانات التالية من النص وأرجع JSON فقط.
لو في رحلات متعددة (ذهاب وإياب أو ترانزيت)، ضعهم كلهم في مصفوفة flights.
`;

  const typeSpecificInstructions: Record<TicketType, string> = {
    emirates: `
تعليمات خاصة بـ Emirates:
- Passenger Name: ابحث عن "MR" أو "MRS" أو "MS" متبوعاً بالاسم
- Record Locator: كود 6 حروف (مثال: O6DBGT)
- Flight #: رقم الرحلة (مثال: 359, 2072)
- From/To: مطارات (مثال: Jakarta, Dubai, Baghdad)
- Date & Time: التاريخ والوقت (مثال: MON 20APR 00:25)
- Class: حرف واحد (M, Y, C, F)
- Baggage: "30KG" أو "1PC" أو "2PC"
`,

    fly_cham: `
تعليمات خاصة بـ Fly Cham:
- Passenger Name: بعد "Passenger Name(s)" أو في جدول المسافرين
- PNR: كود 6 حروف (مثال: CZ9VGE)
- E Ticket Number: رقم طويل (مثال: 3862304862177)
- Flight: رقم الرحلة (مثال: XH502)
- Origin/Destination: BGW/DAM أو DAM/BGW
- Departure/Arrival: التاريخ والوقت
- Class of Service: Economy Class أو Business Class
- Baggage: "30 Kgs" أو "40 Kgs"
`,

    egyptair: `
تعليمات خاصة بـ EgyptAir:
- Passenger: بعد "Passenger:"
- Booking ref: كود 6 حروف (مثال: 8QP5BL)
- Ticket number: رقم طويل يبدأ بـ 077 (مثال: 0772450553150)
- Flight: رقم يبدأ بـ MS (مثال: MS628, MS881)
- From/To: BAGHDAD, CAIRO, ACCRA
- Departure/Arrival: التاريخ والوقت
- Class: حرف (K, Y, C)
- Baggage: "2PC" أو "30KG"
`,

    pegasus: `
تعليمات خاصة بـ Pegasus:
- Passenger Name: في الهيدر (مثال: HUSSEIN MALIKI أو BASHEER SHKARA)
- Booking Ref: كود 6 حروف (مثال: 212ZQC)
- Ticket Number: رقم طويل (مثال: 6242249607799)
- Flight Number: يبدأ بـ PC- (مثال: PC-657, PC-1257)
- From: BGW (Baghdad), SAW (Sabiha Gokcen), AMS (Amsterdam)
- To: نفس الكودات
- Date: DD/MM/YYYY (مثال: 26/05/2026)
- Dep. Time: HH:MM (مثال: 08:50)
- Arr. Time: HH:MM (مثال: 11:45)
- Class: Saver أو Comfort Flex
- Baggage: "20KG" أو "15KG"
ملاحظة: التذكرة ممكن تكون لأكثر من مسافر — استخرج كل المسافرين
`,

    turkish_airlines: `
تعليمات خاصة بـ Turkish Airlines:
- Passenger Name: بعد "Yolcu ismi /Passenger Name" (مثال: ALOMAR HUDA MRS)
- Ticket Number: بعد "Bilet No /Ticket Number" (مثال: 2352275616976)
- Booking Ref: بعد "Rezervasyon No /Booking Ref" (مثال: UL45A3)
- Flight: يبدأ بـ TK (مثال: TK 0799, TK 0201)
- From/To: BSR (Basra), IST (Istanbul), DEN (Denver), DTW (Detroit)
- Dep. Time: HH:MM
- Arr. Time: HH:MM
- Day-Mon: DD-MM (مثال: 25-09)
- Class: حرف (U, W, C, Y)
- Baggage: "2P" (2 pieces) أو بالكيلو
`,

    airarabia: `
تعليمات خاصة بـ AirArabia:
- Passenger: بعد "Mr" أو "Mrs" (مثال: Mr Ali Alkhafaji)
- E-ticket number: رقم طويل (مثال: 5142382775723)
- Reservation Number: كود 6 حروف (مثال: 6XKHXI)
- Sectors: NJF/SHJ, SHJ/HKT, HKT/SHJ, SHJ/BGW
- Checked Baggage: "20 Kg 1 Piece Free"
- Meals: نوع الوجبة
- Seat: رقم المقعد
`,

    royal_jordanian: `
تعليمات خاصة بـ Royal Jordanian (ViewTrip):
- Passengers: قائمة أسماء (مثال: ALOBAIDI, ALI)
- eTicket Number: رقم طويل (مثال: 5122300785487)
- Confirmation Number: كود 6 حروف (مثال: 9UO67C)
- Flight: يبدأ بـ RJ (مثال: RJ 815, RJ 555)
- From/To: BGW (Baghdad), AMM (Amman), CMN (Casablanca)
- Depart/Arrive: التاريخ والوقت
- Class Of Service: Economy أو Business
- Baggage: "1 Piece Plan" + الوزن
`,

    ur_airlines: `
تعليمات خاصة بـ UR Airlines:
- Booking Reference: كود 6 حروف (مثال: TYSOLI)
- Passenger Name: بعد "Mr." (مثال: Mr.ALLAMI, ABDULLAH)
- E-Ticket: رقم طويل (مثال: 5410010602741)
- Flight No: يبدأ بـ UD (مثال: UD105, UD106)
- From/To: BGW (Baghdad), BEY (Beirut)
- Date: Tue, May 12, 2026
- Time: HH:MM (مثال: 18:00 - 19:30)
- Class: Economy/Q
- Baggage: "25Kg" cargo + "7Kg" hand
`,

    trip_com: `
تعليمات خاصة بـ Trip.com:
- النص مشوش جداً — ابحث عن:
- Booking Reference: كود 6 حروف
- Passenger names: أسماء المسافرين
- Flight details: أرقام الرحلات والمطارات
- Baggage: "1 piece(s) per person, 30kg"
`,

    generic: `
تعليمات عامة:
- ابحث عن أي بيانات متعلقة بتذاكر الطيران
- Passenger name, ticket number, booking reference, flights, dates, times
- أي شركة طيران، أي مطار، أي رحلة
`,
  };

  return `${baseInstructions}
${typeSpecificInstructions[type]}

النص المستخرج من التذكرة:
"""
${text.substring(0, 15000)}
"""

أرجع JSON بهذا الشكل بالضبط:
{
  "passengerName": "الاسم الكامل",
  "ticketNumber": "رقم التذكرة",
  "bookingRef": "رقم الحجز",
  "issueDate": "تاريخ الإصدار",
  "airline": "اسم شركة الطيران",
  "flights": [
    {
      "from": "مطار المغادرة",
      "to": "مطار الوصول",
      "departureDate": "YYYY-MM-DD",
      "departureTime": "HH:MM",
      "arrivalDate": "YYYY-MM-DD",
      "arrivalTime": "HH:MM",
      "airline": "شركة الطيران",
      "flightNumber": "رقم الرحلة",
      "class": "درجة السفر",
      "baggageAllowance": "وزن الأمتعة",
      "gate": null
    }
  ],
  "price": null,
  "currency": null
}

قواعد مهمة:
- التاريخ: YYYY-MM-DD (مثال: 2026-04-20)
- الوقت: HH:MM 24-hour format
- لو في أكتر من مسافر، استخرج أسمائهم كلهم مفصولين بفاصلة
- لو في أكتر من رحلة (ذهاب/إياب/ترانزيت)، ضعهم كلهم في flights
- JSON فقط بدون أي كلام قبله أو بعده
`;
}

// ============================================================
// المرحلة 5: استدعاء Groq AI
// ============================================================
async function callGroq(prompt: string): Promise<string> {
  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ];

  for (const model of models) {
    try {
      console.log(`[Groq] جرب موديل: ${model}`);
      const response = await getGroq().chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message.content?.trim() ?? "";
      if (content.length > 50) {
        console.log(`[Groq] نجح مع: ${model}`);
        return content;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Groq] فشل ${model}:`, message);
    }
  }

  throw new Error("كل الموديلات فشلت");
}

function parseJsonResponse(aiResponse: string): Record<string, unknown> {
  const cleaned = aiResponse
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as Record<string, unknown>;
    throw new Error("الـ AI لم يرجع JSON صحيح");
  }
}

function valueToString(value: unknown): string {
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join(", ");
  return typeof value === "string" ? value : "";
}

function valueToNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function valueToObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

// ============================================================
// دالة استخراج النص كصورة باستخدام Gemini Vision عبر OpenRouter
// ============================================================
async function extractTicketDataOCR(filePath: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined in the environment variables");
  }

  console.log(`[OCR] Converting PDF: ${filePath} to image buffer...`);
  const document = await pdf(filePath, { scale: 2 });
  const firstPageBuffer = await document.getPage(1);
  const base64Image = firstPageBuffer.toString("base64");
  console.log(`[OCR] Image converted successfully. Base64 length: ${base64Image.length}`);

  const promptText = `
أنت نظام استخراج بيانات متخصص في تذاكر الطيران.
اقرأ صورة تذكرة الطيران المرفقة واستخرج جميع البيانات وأرجعها كـ JSON فقط.
لا تكتب أي نصوص أو شروحات إضافية قبل أو بعد الـ JSON.
لا تستخدم backticks أو markdown.

أرجع JSON بهذا الشكل بالضبط:
{
  "passengerName": "الاسم الكامل للمسافر",
  "ticketNumber": "رقم التذكرة",
  "bookingRef": "رقم الحجز PNR",
  "issueDate": "تاريخ الإصدار",
  "flights": [
    {
      "from": "كود المطار أو المدينة (مثال: DXB)",
      "to": "كود المطار أو المدينة (مثال: CAI)",
      "departureDate": "تاريخ المغادرة YYYY-MM-DD",
      "departureTime": "وقت المغادرة HH:MM",
      "arrivalDate": "تاريخ الوصول YYYY-MM-DD",
      "arrivalTime": "وقت الوصول HH:MM",
      "airline": "اسم شركة الطيران",
      "flightNumber": "رقم الرحلة",
      "class": "الدرجة (مثال: Economy)",
      "baggageAllowance": "وزن الأمتعة المسموح (مثال: 30KG)",
      "gate": "البوابة أو null"
    }
  ],
  "price": 150.00,
  "currency": "USD"
}

إذا لم تكن الصورة تذكرة طيران، أرجع JSON يحتوي على خطأ: {"error": "not_a_ticket"}
إذا كان الحقل غير موجود في التذكرة، استخدم null أو string فارغ.
`;

  const models = [
    "google/gemini-2.5-flash:free",
    "openrouter/free",
    "google/gemini-2.5-flash"
  ];

  let response: Response | null = null;
  let lastError: Error | null = null;

  console.log("[OCR] Sending image to OpenRouter Gemini Vision...");
  for (const model of models) {
    try {
      console.log(`[OCR] Trying model: ${model}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3001",
          "X-Title": "Albaja Tickets OCR",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                  },
                },
                {
                  type: "text",
                  text: promptText,
                },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        console.log(`[OCR] Successfully fetched from model: ${model}`);
        response = res;
        break;
      } else {
        const errText = await res.text();
        console.warn(`[OCR] Model ${model} failed: ${errText}`);
        lastError = new Error(`Model ${model} returned ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      console.warn(`[OCR] Error with model ${model}:`, err.message);
      lastError = err;
    }
  }

  if (!response) {
    throw new Error(`كل محاولات استخراج التذكرة كصورة (OCR) فشلت. الخطأ الأخير: ${lastError?.message}`);
  }

  const resJson = (await response.json()) as any;
  const rawText = resJson.choices?.[0]?.message?.content?.trim() || "";

  console.log(`[OCR] Raw response first 200 chars: ${rawText.substring(0, 200)}`);

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[OCR] Failed to parse JSON response:", cleaned);
    throw new Error("لم يقم الذكاء الاصطناعي بإرجاع JSON صالح");
  }

  if (parsed && typeof parsed === "object" && "error" in parsed) {
    throw new Error("الملف المرفوع لا يبدو أنه تذكرة طيران صالحة");
  }

  return parsed;
}

// ============================================================
// الدالة الرئيسية
// ============================================================
export async function extractTicketData(filePath: string): Promise<ExtractedTicket> {
  console.log("\n═══════════════════════════════════════");
  console.log(`بدء استخراج: ${path.basename(filePath)}`);
  console.log("═══════════════════════════════════════\n");

  const { text, isImageBased } = await extractTextFromPDF(filePath);

  if (isImageBased) {
    console.log("[OCR] PDF is image-based, starting OCR extraction via OpenRouter...");
    try {
      const parsed = await extractTicketDataOCR(filePath);
      const flights = valueToObjectArray(parsed.flights);
      const airline = valueToString(parsed.airline) || "GENERIC";

      const result: ExtractedTicket = {
        passengerName: valueToString(parsed.passengerName) || valueToString(parsed.passengers),
        ticketNumber: valueToString(parsed.ticketNumber),
        bookingRef:
          valueToString(parsed.bookingRef) ||
          valueToString(parsed.pnr) ||
          valueToString(parsed.reservationNumber),
        issueDate: valueToString(parsed.issueDate),
        flights: flights.map((flight) => ({
          from: valueToString(flight.from),
          to: valueToString(flight.to),
          departureDate: valueToString(flight.departureDate),
          departureTime: valueToString(flight.departureTime),
          arrivalDate: valueToString(flight.arrivalDate) || valueToString(flight.departureDate),
          arrivalTime: valueToString(flight.arrivalTime),
          airline: valueToString(flight.airline) || airline,
          flightNumber: valueToString(flight.flightNumber),
          class: valueToString(flight.class),
          baggageAllowance: valueToString(flight.baggageAllowance) || valueToString(flight.baggage),
          gate: valueToString(flight.gate) || null,
        })),
        price: valueToNumberOrNull(parsed.price),
        currency: valueToString(parsed.currency) || null,
        airline,
        ticketType: "generic",
        rawConfidence: 1.0,
      };

      console.log(`[OCR Result] استخراج ناجح — ${result.flights.length} رحلة`);
      return result;
    } catch (ocrError: any) {
      console.error("[OCR] Failed extraction:", ocrError);
      throw new Error(`فشل استخراج التذكرة كصورة (OCR): ${ocrError.message}`);
    }
  }

  const { type, confidence } = detectTicketType(text);
  console.log(`[Detector] نوع التذكرة: ${type} (ثقة: ${(confidence * 100).toFixed(0)}%)`);

  const cleanedText = cleanTextForType(text, type);
  console.log(`[Cleaner] النص بعد التنظيف: ${cleanedText.length} حرف`);

  const prompt = buildPrompt(cleanedText, type);
  console.log(`[Prompt] طول: ${prompt.length} حرف`);

  const aiResponse = await callGroq(prompt);
  const parsed = parseJsonResponse(aiResponse);
  const flights = valueToObjectArray(parsed.flights);
  const airline = valueToString(parsed.airline) || type.replace("_", " ").toUpperCase();

  const result: ExtractedTicket = {
    passengerName: valueToString(parsed.passengerName) || valueToString(parsed.passengers),
    ticketNumber: valueToString(parsed.ticketNumber),
    bookingRef:
      valueToString(parsed.bookingRef) ||
      valueToString(parsed.pnr) ||
      valueToString(parsed.reservationNumber),
    issueDate: valueToString(parsed.issueDate),
    flights: flights.map((flight) => ({
      from: valueToString(flight.from),
      to: valueToString(flight.to),
      departureDate: valueToString(flight.departureDate),
      departureTime: valueToString(flight.departureTime),
      arrivalDate: valueToString(flight.arrivalDate) || valueToString(flight.departureDate),
      arrivalTime: valueToString(flight.arrivalTime),
      airline: valueToString(flight.airline) || airline,
      flightNumber: valueToString(flight.flightNumber),
      class: valueToString(flight.class),
      baggageAllowance: valueToString(flight.baggageAllowance) || valueToString(flight.baggage),
      gate: valueToString(flight.gate) || null,
    })),
    price: valueToNumberOrNull(parsed.price),
    currency: valueToString(parsed.currency) || null,
    airline,
    ticketType: type,
    rawConfidence: confidence,
  };

  console.log(`[Result] استخراج ناجح — ${result.flights.length} رحلة`);
  return result;
}

// ============================================================
// للاختبار المباشر
// ============================================================
const currentFilePath = fileURLToPath(import.meta.url);

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === currentFilePath &&
  path.basename(currentFilePath).startsWith("ticket-extractor.")
) {
  const testFile = process.argv[2];
  if (!testFile) {
    console.log("Usage: npx tsx ticket-extractor.ts <path-to-pdf>");
    process.exit(1);
  }

  extractTicketData(testFile)
    .then((data) => {
      console.log("\nالنتيجة النهائية:");
      console.log(JSON.stringify(data, null, 2));
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("\nخطأ:", message);
      process.exit(1);
    });
}
