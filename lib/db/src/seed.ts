import { db, pool } from "./index.js";
import { companiesTable, usersTable } from "./schema/index.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Company
  const companyId = "albaja-main-id";
  const existingCompany = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);

  if (existingCompany.length === 0) {
    console.log("Adding company: شركة البجع للسفر والسياحة...");
    await db.insert(companiesTable).values({
      id: companyId,
      name: "شركة البجع للسفر والسياحة",
      email: "info@albaja.com.iq",
      phone: "07708809825",
      website: "https://www.albaja.com.iq",
      address: "بغداد – المنصور – شارع الأميرات – مبنى أعمال",
      primaryColor: "#F7931E",
      secondaryColor: "#00AEEF",
      travelNotes: "الحضور إلى المطار قبل موعد الرحلة بثلاث ساعات.\nأن تكون صلاحية جواز السفر أكثر من 6 أشهر.\nالتأكد من صلاحية التأشيرة.\nالالتزام بوزن الأمتعة المسموح به.\nالتأكد من متطلبات الدولة المسافر إليها.",
      isActive: true,
    });
    console.log("✅ Company added successfully.");
  } else {
    console.log("Company already exists, skipping insertion.");
  }

  // 2. Seed Admin User
  const adminEmail = "admin@albaja.com.iq";
  const existingAdmin = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, adminEmail))
    .limit(1);

  if (existingAdmin.length === 0) {
    console.log(`Adding admin user: ${adminEmail}...`);
    const passwordHash = await bcrypt.hash("Admin123!", 12);
    const adminId = "admin-main-id";
    
    await db.insert(usersTable).values({
      id: adminId,
      name: "عيسى",
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      companyId: companyId,
      isActive: true,
    });
    console.log("✅ Admin user added successfully.");
  } else {
    console.log("Admin user already exists, skipping insertion.");
  }

  console.log("🌱 Seeding finished successfully!");
}

main()
  .catch((err) => {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
