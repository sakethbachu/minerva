import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Question } from "../types/question.types.js";

export interface SessionData {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  originalQuery: string;
  questions: Question[];
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
 * Create a new session in Supabase database
 * @param userId - User ID from authenticated request
 * @param sessionId - Unique session ID
 * @param originalQuery - User's original query
 * @param questions - Generated questions
 * @returns true if successful, false otherwise
 */
export async function createSession(
  userId: string,
  sessionId: string,
  originalQuery: string,
  questions: Question[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available");
    return false;
  }

  try {
    // Set expires_at to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await client.from("user_sessions").insert({
      user_id: userId,
      session_id: sessionId,
      original_query: originalQuery,
      questions: questions,
      answers: {},
      current_question_index: 0,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("Error creating session:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Session data attempted:", {
        user_id: userId,
        session_id: sessionId,
        original_query: originalQuery,
      });
      return false;
    }

    console.log(`✅ Session ${sessionId} created successfully in database for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error creating session (catch block):", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

/**
 * Get session from Supabase database
 * Checks expiration and returns null if expired
 * @param sessionId - Session ID to retrieve
 * @returns SessionData or null if not found/expired
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available");
    return null;
  }

  try {
    const { data, error } = await client
      .from("user_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      console.error("Error getting session:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Check if session is expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      // Session expired - delete it
      await deleteSession(sessionId);
      return null;
    }

    // Convert database format to SessionData
    return {
      currentQuestionIndex: data.current_question_index || 0,
      answers: (data.answers as Record<string, string>) || {},
      originalQuery: data.original_query,
      questions: (data.questions as Question[]) || [],
    };
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Update session answers in Supabase database
 * @param sessionId - Session ID to update
 * @param answers - Updated answers object
 * @returns true if successful, false otherwise
 */
export async function updateSessionAnswers(
  sessionId: string,
  answers: Record<string, string>
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available");
    return false;
  }

  try {
    // First check if session exists and is not expired
    const session = await getSession(sessionId);
    if (!session) {
      return false;
    }

    // Update answers
    const { error } = await client
      .from("user_sessions")
      .update({
        answers: answers,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating session:", error);
    return false;
  }
}

/**
 * Delete session from Supabase database
 * @param sessionId - Session ID to delete
 * @returns true if successful, false otherwise
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available");
    return false;
  }

  try {
    const { error } = await client.from("user_sessions").delete().eq("session_id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
}

/**
 * Check if session exists and is valid (not expired)
 * @param sessionId - Session ID to check
 * @returns true if session exists and is valid, false otherwise
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  return session !== null;
}
