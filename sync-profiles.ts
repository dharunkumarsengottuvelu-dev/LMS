import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncProfiles() {
  console.log("Fetching all auth users...");
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching auth users:", error);
    return;
  }
  
  const users = data.users;
  console.log(`Found ${users.length} users in auth.users.`);
  
  let added = 0;
  for (const user of users) {
    const { first_name, last_name, role } = user.user_metadata || {};
    
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: user.id,
        first_name: first_name || user.email?.split("@")[0] || "User",
        last_name: last_name || "",
        email: user.email,
        role: role || "student",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    
    if (profileError) {
      console.error(`Error upserting profile for ${user.email}:`, profileError);
    } else {
      added++;
      console.log(`Synced profile for ${user.email}`);
    }
  }
  console.log(`Successfully synced ${added} profiles.`);
}

syncProfiles();
