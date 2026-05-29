import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, { contentType, upsert: true });
      if (error) {
        throw new Error(error.message);
      }
      return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Supabase Upload] Attempt ${attempt} failed: ${err.message || err}. Retrying...`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw new Error(`Supabase upload failed after ${maxRetries} attempts. Last error: ${lastError?.message || lastError}`);
}
