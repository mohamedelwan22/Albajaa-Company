import { pdf } from "pdf-to-img";
import fs from "fs";

async function run() {
  console.log("Converting test-output.pdf to image...");
  const document = await pdf("./test-output.pdf", { scale: 2 });
  const page = await document.getPage(1);
  fs.writeFileSync("./test-output-page1.png", page);
  console.log("✅ Saved test-output-page1.png (" + page.length + " bytes)");
}

run().catch(console.error);
