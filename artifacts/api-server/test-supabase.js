import { uploadFile } from "./src/lib/supabase.ts";
import dotenv from "dotenv";
import path from "path";

async function main() {
  const buf = Buffer.from("hello world");
  console.log("Testing Supabase upload...");
  try {
    const url = await uploadFile("tickets", `test-${Date.now()}.txt`, buf, "text/plain");
    console.log("Upload succeeded! Public URL:", url);
  } catch (err) {
    console.error("Upload failed with error:", err);
  }
}

main();
