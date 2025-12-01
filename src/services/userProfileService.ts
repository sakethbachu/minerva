import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  lives_in_us: boolean;
  created_at: string;
  updated_at: string;
}

let supabaseClient: SupabaseClient | null = null;

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Supabase credentials not found in environment variables");
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return supabaseClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
}

/**
 * Get user profile from Supabase
 * @param userId - User ID from authenticated request
 * @returns UserProfile if found, null otherwise
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available for fetching user profile");
    return null;
  }

  try {
    const { data, error } = await client
      .from("user_profiles")
      .select("id, name, age, gender, lives_in_us, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      // Handle "not found" errors gracefully
      if (error.code === "PGRST116" || error.message.includes("No rows")) {
        return null;
      }
      console.error("Error fetching user profile:", error);
      return null;
    }

    if (data) {
      return data as UserProfile;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile (catch block):", error);
    return null;
  }
}
