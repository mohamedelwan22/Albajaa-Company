// ============================================================
// ملف: artifacts/api-server/src/lib/ticket-extractor.ts
// ============================================================
// هدف: استخراج بيانات تذكرة الطيران من أي شركة بأي شكل
// ============================================================

process.env.PYTHONIOENCODING = 'utf-8';

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import Groq from "groq-sdk";

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
  transitAirports: string | null;
  isRoundTrip: boolean;
  returnFlightFrom: string | null;
  returnFlightTo: string | null;
  returnDepartureDate: string | null;
  returnDepartureTime: string | null;
  returnArrivalDate: string | null;
  returnArrivalTime: string | null;
  returnAirline: string | null;
  returnFlightNumber: string | null;
  returnTransitAirports: string | null;
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
        .replace(/|||/g, " ");
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
// المرحلة 4: بناء Prompt لاستخراج التذكرة
// ============================================================
function buildPrompt(text: string, _type: TicketType): string {
  return `You are a flight ticket data extraction expert.
Extract data from the following airline ticket text and return ONLY a JSON object.

EXTRACTION RULES (follow strictly):

1. SEGMENT SELECTION:
   - Find ALL flight segments in the ticket, listed in order
   - Extract flightFrom = IATA code of the FIRST segment's departure airport
   - Extract flightTo = IATA code of the LAST segment's arrival airport
   - Extract departureDate and departureTime from the FIRST segment
   - Extract arrivalDate and arrivalTime from the LAST segment
   - For connecting flights (e.g. DXB→CGK→DPS): flightFrom=DXB, flightTo=DPS (final destination, not transit stop)
   - Do NOT try to detect outbound vs return based on country or Iraqi airports

2. ROUND TRIP HANDLING:
   - A round trip is when the ticket returns to the same origin airport
   - When this is detected, extract the first half (segments with the EARLIEST departure date) as main fields (flightFrom, flightTo, etc.)
   - Additionally, extract the return half (segments with the LATER departure date) as return* fields
   - Set "isRoundTrip": true when round trip detected, false otherwise
   - Example: CGK→DXB→BGW on 20APR then BGW→DXB→CGK on 25APR → main: CGK→DXB→BGW, return: BGW→DXB→CGK
   - For one-way tickets: isRoundTrip = false, all return* fields = null

3. MULTI-PASSENGER TICKETS:
   - Extract ONLY the FIRST passenger listed
   - Use their name and ticket number only

4. FIELD FORMATS:
   - flightFrom: exactly 3 uppercase letters (IATA code)
   - flightTo: exactly 3 uppercase letters (IATA code)
   - departureDate: YYYY-MM-DD format
   - departureTime: HH:MM 24-hour format
   - arrivalDate: YYYY-MM-DD format
   - arrivalTime: HH:MM 24-hour format
   - baggageAllowance: number + KG only, e.g. "30 KG"
   - cabinClass: "Economy" or "Business"
   - ticketNumber: digits only, remove slashes, take part before "/" if present
   - bookingReference: 5-6 alphanumeric PNR code — look for labels like "Reservation Code", "Confirmation Number", "PNR", "Booking Ref", "Record Locator"
   - transitAirports: comma-separated IATA codes of ALL intermediate airports (not origin, not final destination). For CGK→DXB→BGW: transitAirports = "DXB". For BGW→AMM→CMN: transitAirports = "AMM". For direct flights: transitAirports = null

5. AIRLINE NAME:
   - Always use the MARKETING carrier name (the main airline printed on the ticket)
   - Do NOT use the operating carrier (ignore "Operated by" or "Operated By" text)
   - flightNumber: use the flight number from the FIRST segment

Return ONLY this JSON structure, no explanation, no markdown:
{
  "passengerName": "full name in UPPERCASE",
  "ticketNumber": "digits only",
  "bookingReference": "PNR code",
  "flightFrom": "XXX",
  "flightTo": "XXX",
  "departureDate": "YYYY-MM-DD",
  "departureTime": "HH:MM",
  "arrivalDate": "YYYY-MM-DD",
  "arrivalTime": "HH:MM",
  "airline": "Airline Name",
  "flightNumber": "XX000",
  "cabinClass": "Economy",
  "baggageAllowance": "30 KG",
  "gate": null,
  "price": null,
  "currency": "USD",
  "issueDate": "YYYY-MM-DD",
  "transitAirports": null,
  "isRoundTrip": false,
  "returnFlightFrom": null,
  "returnFlightTo": null,
  "returnDepartureDate": null,
  "returnDepartureTime": null,
  "returnArrivalDate": null,
  "returnArrivalTime": null,
  "returnAirline": null,
  "returnFlightNumber": null,
  "returnTransitAirports": null
}
If any field is unknown, use null. Never invent data.

TICKET TEXT:
"""
${text.substring(0, 15000)}
"""
`;
}

// ============================================================
// المرحلة 5: استدعاء Groq AI
// ============================================================
async function callGroq(prompt: string): Promise<string> {
  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
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

  // OpenRouter fallback — try multiple models
  console.log("[Groq] All models rate-limited, falling back to OpenRouter...");
  const openRouterModels = [
    "google/gemini-2.0-flash-001",
    "google/gemini-flash-1.5",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
  ];
  for (const orModel of openRouterModels) {
    try {
      console.log(`[OpenRouter] Trying model: ${orModel}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: orModel,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      console.log(`[OpenRouter] ${orModel} status:`, res.status);
      const text = await res.text();
      if (res.status === 404 || res.status === 400) {
        console.log(`[OpenRouter] ${orModel} not available, trying next...`);
        continue;
      }
      const data = JSON.parse(text);
      const content = data.choices?.[0]?.message?.content ?? "";
      if (content.trim().length > 50) {
        console.log(`[OpenRouter] Success with model: ${orModel}`);
        return content;
      }
    } catch (e) {
      console.warn(`[OpenRouter] ${orModel} failed:`, e);
      continue;
    }
  }
  throw new Error("كل الموديلات فشلت");
}

function parseJsonResponse(aiResponse: string): Record<string, unknown> {
  let cleaned = aiResponse.trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Find JSON object boundaries
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // ✅ Remove trailing commas before } or ] (invalid JSON)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(cleaned);
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

  console.log(`[OCR] Converting PDF: ${filePath} to image using pdfjs-dist...`);
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const pdfData = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);

  const loadingTask = pdfjsLib.getDocument({
    data: pdfData
  });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context as any, viewport }).promise;
  const base64Image = canvas.toDataURL('image/png').split(',')[1];
  console.log(`[OCR] Image converted successfully. Base64 length: ${base64Image.length}`);

  const visionPrompt = `You are a flight ticket data extraction expert.
Extract data from the airline ticket image and return ONLY a JSON object.

EXTRACTION RULES (follow strictly):

1. SEGMENT SELECTION:
   - Find ALL flight segments visible in the ticket image, listed in order
   - Extract flightFrom = IATA code of the FIRST segment's departure airport
   - Extract flightTo = IATA code of the LAST segment's arrival airport
   - Extract departureDate and departureTime from the FIRST segment
   - Extract arrivalDate and arrivalTime from the LAST segment
   - For connecting flights (e.g. DXB→CGK→DPS): flightFrom=DXB, flightTo=DPS (final destination, not transit stop)
   - Do NOT try to detect outbound vs return based on country or Iraqi airports

2. ROUND TRIP HANDLING:
   - A round trip is when the ticket returns to the same origin airport
   - When this is detected, extract the first half (segments with the EARLIEST departure date) as main fields
   - Additionally, extract the return half as return* fields
   - Set "isRoundTrip": true when round trip detected, false otherwise
   - For one-way tickets: isRoundTrip = false, all return* fields = null

3. MULTI-PASSENGER TICKETS:
   - Extract ONLY the FIRST passenger listed

4. FIELD FORMATS:
   - flightFrom/flightTo: exactly 3 uppercase letters (IATA code)
   - departureDate/arrivalDate: YYYY-MM-DD
   - departureTime/arrivalTime: HH:MM 24-hour
   - baggageAllowance: number + KG only
   - cabinClass: "Economy" or "Business"
   - ticketNumber: digits only
   - transitAirports: comma-separated IATA codes of intermediate airports, null for direct

5. AIRLINE NAME:
   - Always use the MARKETING carrier name
   - flightNumber: from the FIRST segment

Return ONLY this JSON structure, no explanation, no markdown:
{
  "passengerName": "full name in UPPERCASE",
  "ticketNumber": "digits only",
  "bookingReference": "PNR code",
  "flightFrom": "XXX",
  "flightTo": "XXX",
  "departureDate": "YYYY-MM-DD",
  "departureTime": "HH:MM",
  "arrivalDate": "YYYY-MM-DD",
  "arrivalTime": "HH:MM",
  "airline": "Airline Name",
  "flightNumber": "XX000",
  "cabinClass": "Economy",
  "baggageAllowance": "30 KG",
  "gate": null,
  "price": null,
  "currency": "USD",
  "issueDate": "YYYY-MM-DD",
  "transitAirports": null,
  "isRoundTrip": false,
  "returnFlightFrom": null,
  "returnFlightTo": null,
  "returnDepartureDate": null,
  "returnDepartureTime": null,
  "returnArrivalDate": null,
  "returnArrivalTime": null,
  "returnAirline": null,
  "returnFlightNumber": null,
  "returnTransitAirports": null
}
If any field is unknown, use null. Never invent data.`;

  const models = [
    "google/gemini-2.0-flash-001",
    "google/gemini-flash-1.5",
    "openrouter/free",
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
                  text: visionPrompt,
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

  let cleanedOCR = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ✅ Remove trailing commas
  cleanedOCR = cleanedOCR.replace(/,(\s*[}\]])/g, '$1');

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedOCR);
  } catch (err) {
    console.error("[OCR] Failed to parse JSON response:", cleanedOCR);
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
      console.log('[AI RAW RESPONSE]', JSON.stringify(parsed, null, 2));
      const airline = valueToString(parsed.airline) || "GENERIC";
      let flights = valueToObjectArray(parsed.flights);
      if (flights.length === 0 && parsed.flightFrom) {
        flights = [{
          from: valueToString(parsed.flightFrom),
          to: valueToString(parsed.flightTo),
          departureDate: valueToString(parsed.departureDate),
          departureTime: valueToString(parsed.departureTime),
          arrivalDate: valueToString(parsed.arrivalDate),
          arrivalTime: valueToString(parsed.arrivalTime),
          airline,
          flightNumber: valueToString(parsed.flightNumber),
          class: valueToString(parsed.cabinClass),
          baggageAllowance: valueToString(parsed.baggageAllowance),
          gate: valueToString(parsed.gate) || null,
        }];
      }

      const result: ExtractedTicket = {
        passengerName: valueToString(parsed.passengerName) || valueToString(parsed.passengers),
        ticketNumber: valueToString(parsed.ticketNumber),
        bookingRef:
          valueToString(parsed.bookingRef) ||
          valueToString(parsed.bookingReference) ||
          valueToString(parsed.pnr) ||
          valueToString(parsed.reservationNumber) ||
          valueToString(parsed.reservationCode) ||
          valueToString(parsed.confirmationNumber),
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
        transitAirports: valueToString(parsed.transitAirports) || null,
        isRoundTrip: parsed.isRoundTrip === true,
        returnFlightFrom: valueToString(parsed.returnFlightFrom) || null,
        returnFlightTo: valueToString(parsed.returnFlightTo) || null,
        returnDepartureDate: valueToString(parsed.returnDepartureDate) || null,
        returnDepartureTime: valueToString(parsed.returnDepartureTime) || null,
        returnArrivalDate: valueToString(parsed.returnArrivalDate) || null,
        returnArrivalTime: valueToString(parsed.returnArrivalTime) || null,
        returnAirline: valueToString(parsed.returnAirline) || null,
        returnFlightNumber: valueToString(parsed.returnFlightNumber) || null,
        returnTransitAirports: valueToString(parsed.returnTransitAirports) || null,
      };

      console.log(`[OCR Result] استخراج ناجح — ${result.flights.length} رحلة`);
      console.log('[BOOKING DEBUG] after OCR AI extraction:', { bookingRef: result.bookingRef, ticketNumber: result.ticketNumber });
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
  console.log('[AI RAW RESPONSE]', JSON.stringify(parsed, null, 2));
  const airline = valueToString(parsed.airline) || type.replace("_", " ").toUpperCase();
  let flights = valueToObjectArray(parsed.flights);
  if (flights.length === 0 && parsed.flightFrom) {
    flights = [{
      from: valueToString(parsed.flightFrom),
      to: valueToString(parsed.flightTo),
      departureDate: valueToString(parsed.departureDate),
      departureTime: valueToString(parsed.departureTime),
      arrivalDate: valueToString(parsed.arrivalDate),
      arrivalTime: valueToString(parsed.arrivalTime),
      airline,
      flightNumber: valueToString(parsed.flightNumber),
      class: valueToString(parsed.cabinClass),
      baggageAllowance: valueToString(parsed.baggageAllowance),
      gate: valueToString(parsed.gate) || null,
    }];
  }

  const result: ExtractedTicket = {
    passengerName: valueToString(parsed.passengerName) || valueToString(parsed.passengers),
    ticketNumber: valueToString(parsed.ticketNumber),
    bookingRef:
      valueToString(parsed.bookingRef) ||
      valueToString(parsed.bookingReference) ||
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
    transitAirports: valueToString(parsed.transitAirports) || null,
    isRoundTrip: parsed.isRoundTrip === true,
    returnFlightFrom: valueToString(parsed.returnFlightFrom) || null,
    returnFlightTo: valueToString(parsed.returnFlightTo) || null,
    returnDepartureDate: valueToString(parsed.returnDepartureDate) || null,
    returnDepartureTime: valueToString(parsed.returnDepartureTime) || null,
    returnArrivalDate: valueToString(parsed.returnArrivalDate) || null,
    returnArrivalTime: valueToString(parsed.returnArrivalTime) || null,
    returnAirline: valueToString(parsed.returnAirline) || null,
    returnFlightNumber: valueToString(parsed.returnFlightNumber) || null,
    returnTransitAirports: valueToString(parsed.returnTransitAirports) || null,
  };

  console.log('[BOOKING DEBUG] after AI extraction:', { bookingRef: result.bookingRef, ticketNumber: result.ticketNumber });
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