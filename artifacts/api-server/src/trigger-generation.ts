import { generateToken } from "./lib/auth.js";

async function main() {
  const token = generateToken({
    userId: "admin-main-id",
    email: "admin@albaja.com.iq",
    role: "SUPER_ADMIN"
  });

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
