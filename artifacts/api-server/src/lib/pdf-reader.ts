import { PDFParse } from "pdf-parse";
import fs from "fs";

export async function extractTextFromPDF(filePath: string): Promise<string> {
  let parser: PDFParse | null = null;
  try {
    const buffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const text = textResult.text?.trim() ?? "";

    if (text.length > 100) {
      console.log(`[PDF] ✅ نص استخراج ناجح — ${text.length} حرف`);
      return text;
    }

    console.log(`[PDF] ⚠️ النص قصير (${text.length} حرف) — التذكرة على الأرجح صورة`);
    return text;
  } catch (err) {
    console.error("[PDF] ❌ فشل استخراج النص:", err);
    return "";
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (e) {
        // ignore
      }
    }
  }
}

export function getPDFBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}
