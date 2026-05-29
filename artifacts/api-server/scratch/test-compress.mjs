import fs from "fs";
import sharp from "sharp";

const logoPath = "E:\\My Projects\\travelling\\artifacts\\albaja\\public\\ticket-logo.png";

async function run() {
  const buf = fs.readFileSync(logoPath);
  console.log("Original size:", buf.length);
  
  const compressedBuf = await sharp(buf)
    .resize({ height: 140 }) // 70px rendered height at 2x scale = 140px height is perfect!
    .png({ compressionLevel: 9, quality: 80 })
    .toBuffer();
    
  console.log("Compressed size:", compressedBuf.length);
  console.log("Compressed base64 length:", compressedBuf.toString("base64").length);
}

run().catch(console.error);
