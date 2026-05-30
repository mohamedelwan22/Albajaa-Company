import { pgTable, text, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketStatusEnum = pgEnum("ticket_status", ["PENDING", "EDITING", "GENERATED", "SENT"]);

export const ticketsTable = pgTable("tickets", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  createdBy: text("created_by").notNull(),
  originalFileUrl: text("original_file_url"),
  rawText: text("raw_text"),
  passengerName: text("passenger_name"),
  passengerArabicName: text("passenger_arabic_name"),
  nationality: text("nationality"),
  passengerType: text("passenger_type"),
  dateOfBirth: text("date_of_birth"),
  passportNumber: text("passport_number"),
  seatNumber: text("seat_number"),
  ticketNumber: text("ticket_number"),
  bookingReference: text("booking_reference"),
  flightFrom: text("flight_from"),
  flightTo: text("flight_to"),
  departureDate: text("departure_date"),
  departureTime: text("departure_time"),
  arrivalDate: text("arrival_date"),
  arrivalTime: text("arrival_time"),
  airline: text("airline"),
  flightNumber: text("flight_number"),
  cabinClass: text("cabin_class"),
  baggageAllowance: text("baggage_allowance"),
  gate: text("gate"),
  price: text("price"),
  currency: text("currency"),
  issueDate: text("issue_date"),
  generatedFileUrl: text("generated_file_url"),
  hidePrice: boolean("hide_price").notNull().default(false),
  status: ticketStatusEnum("status").notNull().default("PENDING"),
  extractedData: jsonb("extracted_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ createdAt: true, updatedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
