import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Question } from "../types/question.types.js";

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

export interface SearchHistoryEntry {
  user_id: string;
  query: string;
  answers: Record<string, string>;
  questions?: Question[];
  search_results?: Array<{ title: string; description?: string; url?: string; relevance?: number }>;
  failed?: boolean;
  error_message?: string;
}

/**
 * Save search history to Supabase database
 * The database trigger will automatically keep only the last 10 searches per user
 * @param entry - Search history entry to save
 * @returns true if successful, false otherwise
 */
export async function saveSearchHistory(entry: SearchHistoryEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available for saving search history");
    return false;
  }

  try {
    // Prepare the data to insert
    const historyData: {
      user_id: string;
      query: string;
      answers: Record<string, string>;
      questions?: Question[];
      search_results?: Array<{
        title: string;
        description?: string;
        url?: string;
        relevance?: number;
      }>;
    } = {
      user_id: entry.user_id,
      query: entry.query,
      answers: entry.answers,
    };

    // Add optional fields if they exist
    if (entry.questions) {
      historyData.questions = entry.questions;
    }

    if (entry.search_results) {
      historyData.search_results = entry.search_results;
    } else if (entry.failed) {
      // If search failed, store error info in search_results as metadata
      // Since search_results is JSONB, we can store an array with error info
      // This allows us to track failed searches while maintaining the schema
      historyData.search_results = [
        {
          title: "Search Failed",
          description: entry.error_message || "Search service returned an error",
          url: "",
          relevance: 0,
        },
      ];
    }

    const { error } = await client.from("user_search_history").insert(historyData);

    if (error) {
      console.error("Error saving search history:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return false;
    }

    console.log(`✅ Search history saved for user ${entry.user_id}`);
    return true;
  } catch (error) {
    console.error("Error saving search history (catch block):", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

/**
 * Get search history for a user (last 10 searches)
 * @param userId - User ID
 * @returns Array of search history entries, or null if error
 */
export async function getSearchHistory(userId: string): Promise<Array<{
  id: string;
  query: string;
  answers: Record<string, string>;
  questions?: Question[];
  search_results?: Array<{ title: string; description?: string; url?: string; relevance?: number }>;
  created_at: string;
}> | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available for getting search history");
    return null;
  }

  try {
    const { data, error } = await client
      .from("user_search_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error getting search history:", error);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error("Error getting search history (catch block):", error);
    return null;
  }
}
