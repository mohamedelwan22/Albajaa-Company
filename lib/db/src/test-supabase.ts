import { uploadFile } from "../../../artifacts/api-server/src/lib/supabase";

async function main() {
  const buf = Buffer.from("hello world");
  console.log("Testing Supabase upload from db package context...");
  try {
    const url = await uploadFile("tickets", `test-${Date.now()}.txt`, buf, "text/plain");
    console.log("Upload succeeded! Public URL:", url);
  } catch (err) {
    console.error("Upload failed with error:", err);
  }
}

main();
