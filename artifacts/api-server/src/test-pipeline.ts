import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);

async function testPipeline() {
  console.log("\n═══════════════════════════════");
  console.log("اختبار pipeline استخراج PDF");
  console.log("═══════════════════════════════\n");

  // اختبار ١: pdf-parse
  console.log("١. اختبار pdf-parse...");
  try {
    const { PDFParse } = await import("pdf-parse");
    console.log("✅ pdf-parse محمّل بنجاح");
    
    // ابحث عن أي PDF موجود في المشروع للاختبار
    const testPDFs = [
      "test.pdf",
      "sample.pdf", 
      "ticket.pdf",
      "../../dummy.pdf"
    ];
    
    let testFile = null;
    for (const f of testPDFs) {
      if (fs.existsSync(f)) { testFile = f; break; }
    }
    
    if (testFile) {
      const buffer = fs.readFileSync(testFile);
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const data = { text: textResult.text };
      await parser.destroy();
      console.log(`✅ استخراج نص نجح: ${data.text.trim().length} حرف`);
      console.log("أول 200 حرف:", data.text.trim().substring(0, 200));
    } else {
      console.log("⚠️ لا يوجد ملف PDF للاختبار — سيتم تخطي هذا الاختبار");
    }
  } catch (err: any) {
    console.error("❌ خطأ في pdf-parse:", err.message);
  }

  // اختبار ٢: OpenRouter API
  console.log("\n٢. اختبار OpenRouter API...");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY غير موجود في .env");
  } else {
    console.log("✅ OPENROUTER_API_KEY موجود:", apiKey.substring(0, 15) + "...");
    
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash:free",
          messages: [{
            role: "user",
            content: 'رد بـ JSON فقط: {"test": "نجح", "status": "ok"}'
          }],
        }),
      });
      
      const data = await response.json() as any;
      
      if (data.error) {
        console.error("❌ خطأ من OpenRouter:", data.error.message);
        
        // جرب موديل تاني
        console.log("جرب موديل بديل: meta-llama/llama-3.3-70b-instruct:free");
        const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [{ role: "user", content: 'رد بـ JSON فقط: {"test": "نجح"}' }],
          }),
        });
        const data2 = await response2.json() as any;
        if (data2.choices?.[0]?.message?.content) {
          console.log("✅ llama-3.3 شغال:", data2.choices[0].message.content);
        } else {
          console.error("❌ llama-3.3 فشل:", JSON.stringify(data2));
        }
      } else {
        console.log("✅ OpenRouter شغال!");
        console.log("الموديل المستخدم:", data.model);
        console.log("الرد:", data.choices?.[0]?.message?.content);
      }
    } catch (err: any) {
      console.error("❌ خطأ في الاتصال بـ OpenRouter:", err.message);
    }
  }

  // اختبار ٣: الموديلات المتاحة مجاناً
  console.log("\n٣. فحص الموديلات المتاحة...");
  const apiKey2 = process.env.OPENROUTER_API_KEY;
  if (apiKey2) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey2}` }
      });
      const models = await res.json() as any;
      const freeModels = models.data?.filter((m: any) => 
        m.id.includes(":free") || m.pricing?.prompt === "0"
      ).map((m: any) => m.id);
      
      console.log("✅ الموديلات المجانية المتاحة:");
      freeModels?.slice(0, 10).forEach((m: string) => console.log("  -", m));
    } catch (err: any) {
      console.error("❌ خطأ في جلب الموديلات:", err.message);
    }
  }

  // اختبار ٤: Supabase
  console.log("\n٤. اختبار Supabase...");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL أو SUPABASE_SERVICE_KEY غير موجود");
  } else {
    console.log("✅ Supabase credentials موجودة");
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { "apikey": supabaseKey }
      });
      console.log("✅ Supabase متصل — status:", res.status);
    } catch (err: any) {
      console.error("❌ خطأ في الاتصال بـ Supabase:", err.message);
    }
  }

  console.log("\n═══════════════════════════════");
  console.log("انتهى الاختبار");
  console.log("═══════════════════════════════\n");
}

testPipeline().catch(console.error);
