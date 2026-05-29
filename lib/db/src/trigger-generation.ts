import jwt from "jsonwebtoken";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) throw new Error("JWT_SECRET is missing");

const token = jwt.sign(
  { userId: "admin-main-id", email: "admin@albaja.com.iq", role: "SUPER_ADMIN" },
  SECRET,
  { expiresIn: "7d" }
);

async function main() {
  const ticketId = "e35b7bbb-2f0d-4210-bd6c-58be506c42e3";
  const url = `http://localhost:3001/api/tickets/${ticketId}/generate`;

  console.log(`Sending POST request to ${url}...`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response body:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
