import { db, ticketsTable } from "./index";

async function main() {
  const tickets = await db.select().from(ticketsTable);
  console.log("Found tickets:", tickets.map(t => ({ id: t.id, passengerName: t.passengerName, status: t.status, companyId: t.companyId, createdBy: t.createdBy })));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
