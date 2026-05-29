import { generateTicketPDF } from "./dist/index.mjs";
import fs from "fs";

const pdf = await generateTicketPDF(
  {
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
    flightNumber: "XH502",
    cabinClass: "Economy Class",
    baggageAllowance: "Kgs 30",
    issueDate: "2026-05-10",
  },
  {
    name: "البجع للسفر والسياحة",
    phone: "07708809825",
    email: "info@albaja.com.iq",
    website: "www.albaja.com.iq",
    primaryColor: "#012E4A",
    secondaryColor: "#004E64",
  }
);

fs.writeFileSync("test-ticket.pdf", pdf);
console.log("✅ PDF جاهز — test-ticket.pdf");