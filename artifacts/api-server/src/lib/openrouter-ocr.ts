import { pdf } from "pdf-to-img";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { z } from "zod";

// ── Zod Schemas ────────────────────────────────────────────────────
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

/**
 * تحويل الصفحة الأولى من الـ PDF إلى صورة PNG مؤقتة
 */
export async function convertPdfToImage(pdfPath: string): Promise<string> {
  console.log(`[OCR] Converting PDF: ${pdfPath} to image...`);
  try {
    const document = await pdf(pdfPath, { scale: 2 });
    const firstPageBuffer = await document.getPage(1);

    const tempDir = path.join(os.tmpdir(), "albaja-temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempImagePath = path.join(tempDir, `${Date.now()}-page1.png`);
    await fs.promises.writeFile(tempImagePath, firstPageBuffer);
    console.log(`[OCR] Saved PDF page 1 to temp image: ${tempImagePath}`);
    return tempImagePath;
  } catch (error) {
    console.error("[OCR] Failed to convert PDF to image:", error);
    throw new Error(`فشل تحويل ملف PDF إلى صورة: ${(error as Error).message}`);
  }
}

/**
 * استدعاء fetch مع محاولات إعادة الاتصال (Retry Mechanism)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 2000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status === 503 || res.status >= 500) {
        console.warn(
          `[OpenRouter] Request failed with status ${res.status}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`
        );
        if (i === retries - 1) return res;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`[OpenRouter] Network error: ${(err as Error).message}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Failed to fetch after retries");
}

/**
 * إرسال الصورة لـ OpenRouter لاستخراج بيانات التذكرة
 */
export async function extractTicketData(
  imagePath: string,
  pdfText?: string
): Promise<TicketData> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined in the environment variables");
  }

  console.log(`[OCR] Reading image: ${imagePath}`);
  let imageBuffer = await fs.promises.readFile(imagePath);

  // ضغط الصورة إذا كانت أكبر من 2MB
  if (imageBuffer.length > 2 * 1024 * 1024) {
    console.log(
      `[OCR] Image size too large (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB). Compressing with sharp...`
    );
    imageBuffer = Buffer.from(
      await sharp(imageBuffer)
        .png({ compressionLevel: 9 })
        .toBuffer()
    );
    console.log(
      `[OCR] Compressed image size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`
    );
  }

  const base64Image = imageBuffer.toString("base64");

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
      "from": "كود المطار مثال DXB",
      "to": "كود المطار مثال CAI",
      "departureDate": "تاريخ المغادرة YYYY-MM-DD",
      "departureTime": "وقت المغادرة HH:MM",
      "arrivalTime": "وقت الوصول HH:MM",
      "airline": "اسم شركة الطيران",
      "flightNumber": "رقم الرحلة مثال FZ123",
      "class": "Economy أو Business",
      "baggageAllowance": "مثال 20KG أو 1PC",
      "gate": "رقم البوابة أو null"
    }
  ],
  "price": 150.00,
  "currency": "AED"
}

إذا لم تكن الصورة تذكرة طيران، أرجع JSON يحتوي على خطأ: {"error": "not_a_ticket"}
إذا كان الحقل غير موجود في التذكرة، استخدم null أو string فارغ.
`;

  console.log("[OCR] Sending image to OpenRouter...");

  const response = await fetchWithRetry(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Albaja Tickets",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash:free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[OCR] OpenRouter error response: ${errText}`);
    throw new Error(
      `فشل الاتصال بـ OpenRouter (الحالة: ${response.status}): ${errText}`
    );
  }

  const resJson = (await response.json()) as any;
  const rawText = resJson.choices?.[0]?.message?.content?.trim() || "";

  console.log(
    `[OCR] Raw response first 200 chars: ${rawText.substring(0, 200)}`
  );

  // تنظيف الـ Markdown لو أرجعها النموذج بالخطأ
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

  const validated = TicketDataSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[OCR] Zod validation failed:", validated.error.format());
    throw new Error("البيانات المستخرجة لا تتطابق مع الهيكل المطلوب");
  }

  console.log(
    `[OCR] Successfully extracted ticket data for passenger: ${validated.data.passengerName}`
  );
  return validated.data;
}
