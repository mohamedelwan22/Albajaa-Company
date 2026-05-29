import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// توليد barcode data واقعي للعرض يشبه تذاكر الطيران الاحترافية
function generateBarcodeData(ticketNumber: string) {
  const seed = ticketNumber || "386230682177";
  
  // توليد هاش مميز للمسلسل للحصول على تسلسل فريد
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const bars = [];
  const startX = 15;
  const totalWidth = 210;
  
  const pattern = [];
  let currentHash = Math.abs(hash);
  
  // حراس البداية
  pattern.push(1, 1, 1);
  
  // توليد 15 عنصراً متناوباً فقط لضمان حجم وحدات كبير وخطوط واضحة جداً
  for (let i = 0; i < 15; i++) {
    currentHash = (currentHash * 1664525 + 1013904223) >>> 0;
    const width = (currentHash % 3) + 1; // خط بعرض 1 أو 2 أو 3 وحدات
    pattern.push(width);
  }
  
  // حراس النهاية
  pattern.push(1, 1, 1);
  
  // حساب عدد الوحدات الكلية لتقسيم المساحة بدقة
  const totalUnits = pattern.reduce((sum, w) => sum + w, 0);
  const unitSize = totalWidth / totalUnits;
  
  let currentX = startX;
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i] * unitSize;
    if (i % 2 === 0) {
      // خط أسود
      bars.push({
        x: Number(currentX.toFixed(2)),
        w: Number(width.toFixed(2))
      });
    }
    currentX += width; // تحريك المؤشر
  }
  
  return bars;
}

interface TicketData {
  ticketId?: string | null;
  passengerName?: string | null;
  ticketNumber?: string | null;
  bookingReference?: string | null;
  flightFrom?: string | null;
  flightTo?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  baggageAllowance?: string | null;
  gate?: string | null;
  price?: string | null;
  currency?: string | null;
  issueDate?: string | null;
}

interface CompanyData {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  travelNotes?: string | null;
}

// خريطة كودات المطارات للمدن
const airportCities: Record<string, { ar: string; en: string }> = {
  DAM: { ar: "دمشق", en: "Damascus" },
  BGW: { ar: "بغداد", en: "Baghdad" },
  DXB: { ar: "دبي", en: "Dubai" },
  CAI: { ar: "القاهرة", en: "Cairo" },
  AMM: { ar: "عمّان", en: "Amman" },
  BEY: { ar: "بيروت", en: "Beirut" },
  IST: { ar: "إسطنبول", en: "Istanbul" },
  DOH: { ar: "الدوحة", en: "Doha" },
  KWI: { ar: "الكويت", en: "Kuwait" },
  RUH: { ar: "الرياض", en: "Riyadh" },
  JED: { ar: "جدة", en: "Jeddah" },
  AUH: { ar: "أبوظبي", en: "Abu Dhabi" },
  BSR: { ar: "البصرة", en: "Basra" },
  NJF: { ar: "النجف", en: "Najaf" },
  EBL: { ar: "أربيل", en: "Erbil" },
};

function getCityInfo(code: string) {
  const upper = (code ?? "").toUpperCase();
  return airportCities[upper] ?? { ar: code ?? "", en: code ?? "" };
}

export async function generateTicketPDF(
  ticket: TicketData,
  company: CompanyData,
  hidePrice?: boolean | null
): Promise<Buffer> {

  // قراءة الـ template
  let templateSource = "";
  let templatePath = "";
  try {
    console.log("[STEP] Template loaded");
    templatePath = path.join(__dirname, "ticket-template", "ticket-template.hbs");
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, "lib", "ticket-template", "ticket-template.hbs");
    }
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(path.dirname(__dirname), "ticket-template", "ticket-template.hbs");
    }
    
    console.log("Verification - ticket-template.hbs exists:", fs.existsSync(templatePath));
    
    if (fs.existsSync(templatePath)) {
      templateSource = fs.readFileSync(templatePath, "utf-8");
    } else {
      throw new Error("ticket-template.hbs غير موجود في: " + templatePath);
    }
  } catch (error) {
    console.error("PDF GENERATION ERROR");
    console.error(error);
    console.error((error as any)?.stack);
    throw error;
  }

  // استخراج كودات المطارات
  const fromCode = (ticket.flightFrom ?? "---").toUpperCase().substring(0, 3);
  const toCode = (ticket.flightTo ?? "---").toUpperCase().substring(0, 3);
  const fromCity = getCityInfo(fromCode);
  const toCity = getCityInfo(toCode);

  let barcodeData;
  try {
    barcodeData = generateBarcodeData(ticket.ticketNumber ?? "000000000000");
    console.log("Verification - barcodeData exists:", !!barcodeData);
  } catch (error) {
    console.error("PDF GENERATION ERROR");
    console.error(error);
    console.error((error as any)?.stack);
    throw error;
  }

  // تحميل اللوجو الافتراضي كـ base64 مضغوط إذا لم يكن logoUrl موجوداً
  let logoUrl = company.logoUrl;
  try {
    console.log("[STEP] Logo loaded");
    if (!logoUrl) {
      let currentDir = __dirname;
      let logoPath = "";
      for (let i = 0; i < 8; i++) {
        const candidates = [
          path.join(currentDir, "artifacts/albaja/public/ticket-logo.png"),
          path.join(currentDir, "albaja/public/ticket-logo.png"),
          path.join(currentDir, "public/ticket-logo.png"),
        ];
        const found = candidates.find(p => fs.existsSync(p));
        if (found) { logoPath = found; break; }
        const parent = path.dirname(currentDir);
        if (parent === currentDir) break;
        currentDir = parent;
      }

      if (!logoPath) {
        const fallbacks = [
          path.resolve(process.cwd(), "../albaja/public/ticket-logo.png"),
          path.resolve(process.cwd(), "artifacts/albaja/public/ticket-logo.png"),
          "E:\\My Projects\\travelling\\artifacts\\albaja\\public\\ticket-logo.png",
        ];
        logoPath = fallbacks.find(p => fs.existsSync(p)) ?? "";
      }

      console.log("Verification - logo file exists:", fs.existsSync(logoPath));

      if (logoPath && fs.existsSync(logoPath)) {
        console.log("[PDF] Logo found at:", logoPath);
        const rawBuffer = fs.readFileSync(logoPath);
        const compressedBuffer = await sharp(rawBuffer)
          .resize({ width: 500, withoutEnlargement: true })
          .png({ compressionLevel: 9 })
          .toBuffer();
        logoUrl = `data:image/png;base64,${compressedBuffer.toString("base64")}`;
        console.log(`[PDF] Logo embedded as base64 (${compressedBuffer.length} bytes)`);
      } else {
        console.warn("[PDF] Logo file not found — fallback text will be used.");
      }
    } else {
      console.log("Verification - logo file exists: N/A (logoUrl already provided)");
    }
    console.log("Verification - logoUrl exists:", !!logoUrl);
  } catch (error) {
    console.error("PDF GENERATION ERROR");
    console.error(error);
    console.error((error as any)?.stack);
    throw error;
  }

  let html = "";
  try {
    console.log("[STEP] HTML rendered");
    
    Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
    const template = Handlebars.compile(templateSource);

    const defaultNotes = [
      "الحضور إلى المطار قبل موعد الرحلة بثلاث ساعات",
      "أن تكون صلاحية جواز السفر أكثر من 6 أشهر",
      "التأكد من صلاحية التأشيرة",
      "الالتزام بوزن الأمتعة المسموح به",
      "التأكد من متطلبات الدولة المسافر إليها",
    ];

    const travelNotes = company.travelNotes
      ? company.travelNotes.split("\n").filter(n => n.trim())
      : defaultNotes;

    console.log("Verification - travelNotes exists:", !!travelNotes);

    html = template({
      // شركة
      companyName: company.name,
      logoUrl: logoUrl,
      companyPhone: company.phone ?? "",
      companyEmail: company.email ?? "",
      companyWebsite: company.website ?? "",
      primaryColor: company.primaryColor ?? "#0077B6",
      secondaryColor: company.secondaryColor ?? "#00AEEF",
      orangeColor: "#F7931E",

      // مسافر
      passengerName: ticket.passengerName ?? "—",
      ticketNumber: ticket.ticketNumber ?? "—",
      bookingRef: ticket.bookingReference ?? "—",

      // رحلة
      fromCode,
      fromCityAr: fromCity.ar,
      fromCityEn: fromCity.en,
      toCode,
      toCityAr: toCity.ar,
      toCityEn: toCity.en,
      departureTime: ticket.departureTime ?? "--:--",
      departureDate: ticket.departureDate ?? "—",
      arrivalTime: ticket.arrivalTime ?? "--:--",
      arrivalDate: ticket.arrivalDate ?? ticket.departureDate ?? "—",
      airline: ticket.airline ?? "—",
      flightNumber: ticket.flightNumber ?? "—",

      // info
      travelClass: ticket.cabinClass ?? "Economy",
      baggageAllowance: ticket.baggageAllowance ?? "—",
      issueDate: ticket.issueDate ?? "—",
      gate: ticket.gate ?? null,
      
      // سعر
      showPrice: !hidePrice,
      price: ticket.price ?? null,
      currency: ticket.currency ?? "USD",

      // footer
      travelNotes,
      barcodeData,
    });

    console.log("Verification - generated HTML length:", html.length);
    
    console.log("HTML Length:", html.length);
    console.log("Logo Length:", logoUrl?.length);
    console.log("Ticket ID:", ticket.ticketId);
  } catch (error) {
    console.error("PDF GENERATION ERROR");
    console.error(error);
    console.error((error as any)?.stack);
    throw error;
  }

  // Puppeteer
  let browser: any;
  try {
    console.log("[STEP] Puppeteer launched");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    console.log("Verification - Puppeteer browser launch:", !!browser);
  } catch (error) {
    console.error("PDF GENERATION ERROR");
    console.error(error);
    console.error((error as any)?.stack);
    throw error;
  }

  try {
    let page: any;
    try {
      page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      await page.evaluateHandle("document.fonts.ready");
    } catch (error) {
      console.error("PDF GENERATION ERROR");
      console.error(error);
      console.error((error as any)?.stack);
      throw error;
    }
    
    let pdf: any;
    try {
      console.log("[STEP] PDF generated");
      pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      });
    } catch (error) {
      console.error("PDF GENERATION ERROR");
      console.error(error);
      console.error((error as any)?.stack);
      throw error;
    }

    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
