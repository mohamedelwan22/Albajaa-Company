import { generateTicketPDF } from "./dist/index.mjs";
import fs from "fs";

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
  logoUrl: null,
  primaryColor: "#012E4A",
  secondaryColor: "#004E64",
  phone: "+964-750-000-0000",
  email: "info@albaja.com",
  website: "www.albaja.com",
  travelNotes: null,
};

console.log("Generating PDF...");
const buf = await generateTicketPDF(ticket, company);
fs.writeFileSync("./test-output.pdf", buf);
console.log("✅ Done! PDF saved to test-output.pdf (" + buf.length + " bytes)");
