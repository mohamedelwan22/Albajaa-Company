import { generateTicketPDF } from "../../../artifacts/api-server/src/lib/pdf-generator";
import fs from "fs";
import path from "path";

const ticket = {
  ticketId: "e35b7bbb-2f0d-4210-bd6c-58be506c42e3",
  passengerName: "MRS AYAT SALIH",
  ticketNumber: "3862304862177",
  bookingReference: "CZ9VGE",
  flightFrom: "BGW",
  flightTo: "DAM",
  departureDate: "2026-05-13",
  departureTime: "21:30",
  arrivalDate: "2026-05-13",
  arrivalTime: "23:00",
  airline: "Fly Cham",
  flightNumber: "XH502",
  cabinClass: "Economy Class",
  baggageAllowance: "30 Kgs",
  gate: "",
  price: "200.00",
  currency: "USD",
  issueDate: "2026-05-10"
};

const company = {
  name: "شركة البجع للسفر والسياحة",
  logoUrl: null,
  primaryColor: "#F7931E",
  secondaryColor: "#00AEEF",
  phone: "07708809825",
  email: "info@albaja.com.iq",
  website: "https://www.albaja.com.iq",
  address: "بغداد – المنصور – شارع الأميرات – مبنى أعمال",
  travelNotes: "الحضور إلى المطار قبل موعد الرحلة بثلاث ساعات.\nأن تكون صلاحية جواز السفر أكثر من 6 أشهر.\nالتأكد من صلاحية التأشيرة.\nالالتزام بوزن الأمتعة المسموح به.\nالتأكد من متطلبات الدولة المسافر إليها."
};

async function main() {
  console.log("Generating ticket PDF locally via tsx...");
  const pdfBuf = await generateTicketPDF(ticket, company, false);
  const outputPath = path.resolve(__dirname, "../../../test-ticket-large-logo.pdf");
  fs.writeFileSync(outputPath, pdfBuf);
  console.log("SUCCESS! Ticket PDF saved to:", outputPath);
}

main().catch(console.error);
