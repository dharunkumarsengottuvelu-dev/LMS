import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vdpokcnbslgzyufybxey.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkzNTY1MiwiZXhwIjoyMTAxNTExNjUyfQ.49urHYZdnUAcKdvNJekLIFtCdUF8Ftz2UzoQCvH0gLw";

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  console.log("Checking batches table schema...");

  // Try select * limit 1
  const { data, error } = await adminClient.from("batches").select("*").limit(1);
  if (error) {
    console.error("Select error:", error);
  } else {
    console.log("Sample record:", data);
  }

  // Try inserting with various column names to see which ones work
  const testCols: Record<string, any>[] = [
    { name: "Test Col Batch", batch_name: "Test Col Batch" },
    { name: "Test 2", batch_name: "Test 2", college_name: "C1" },
    { name: "Test 3", batch_name: "Test 3", college: "C1" },
    { name: "Test 4", batch_name: "Test 4", trainer: "T1" },
    { name: "Test 5", batch_name: "Test 5", trainer_name: "T1" },
    { name: "Test 6", batch_name: "Test 6", lead_trainer: "T1" },
    { name: "Test 7", batch_name: "Test 7", course: "Track 1" },
    { name: "Test 8", batch_name: "Test 8", course_name: "Track 1" },
    { name: "Test 9", batch_name: "Test 9", course_track: "Track 1" },
    { name: "Test 10", batch_name: "Test 10", start_date: "2026-09-01" },
  ];

  for (const item of testCols) {
    const { data: ins, error: insErr } = await adminClient
      .from("batches")
      .insert(item)
      .select()
      .single();
    if (insErr) {
      console.log(`Failed with columns ${Object.keys(item).join(", ")}:`, insErr.message);
    } else {
      console.log(`✅ SUCCESS with columns ${Object.keys(item).join(", ")}! Row:`, ins);
      await adminClient.from("batches").delete().eq("id", ins.id);
    }
  }
}

inspect();
