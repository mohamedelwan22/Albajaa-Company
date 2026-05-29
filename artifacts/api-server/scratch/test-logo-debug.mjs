import { generateTicketPDF } from "../dist/index.mjs";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// تحميل اللوجو يدوياً وتحويله لـ base64 للتأكد
const logoPath = "E:\\My Projects\\travelling\\artifacts\\albaja\\public\\ticket-logo.png";
const rawBuffer = fs.readFileSync(logoPath);
console.log("Original logo size:", rawBuffer.length, "bytes");

const compressedBuffer = await sharp(rawBuffer)
  .resize({ height: 140, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer();

const logoBase64 = `data:image/png;base64,${compressedBuffer.toString("base64")}`;
console.log("Compressed logo size:", compressedBuffer.length, "bytes");
console.log("Base64 URI length:", logoBase64.length);
console.log("Base64 URI prefix:", logoBase64.substring(0, 50));

const ticket = {
  passengerName: "MRS AYAT SALIH",
  ticketNumber: "386230682177",
  bookingReference: "C29VGE",
  flightFrom: "DAM",
  flightTo: "BGW",
  departureTime: "23:00",
  departureDate: "2026-06-11",
  arrivalTime: "21:30",
  arrivalDate: "2026-06-11",
  airline: "Fly Cham",
  flightNumber: "1962",
  cabinClass: "Economy Class",
  baggageAllowance: "Kgs 30",
  issueDate: "2026-05-10",
};

const company = {
  name: "البجع للسفر والسياحة",
  logoUrl: logoBase64,  // تمرير اللوجو مباشرة كـ base64
  primaryColor: "#012E4A",
  secondaryColor: "#004E64",
  phone: "+964-750-000-0000",
  email: "info@albaja.com",
  website: "www.albaja.com",
  travelNotes: null,
};

console.log("Generating PDF with explicit base64 logo...");
const buf = await generateTicketPDF(ticket, company);
fs.writeFileSync("./test-output.pdf", buf);
console.log("✅ Done! PDF saved to test-output.pdf (" + buf.length + " bytes)");
