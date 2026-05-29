import { db, ticketsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tickets';
    `);
    console.log("Columns in tickets table:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
}

main();
