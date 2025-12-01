/// <reference types="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

// Initialize Supabase client (singleton pattern)
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
 * Validate JWT token and extract user information
 * @param token - JWT token from Authorization header
 * @returns User object with id and email, or null if invalid
 */
async function validateToken(token: string): Promise<{ id: string; email?: string } | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase client not available for token validation");
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      console.error("Token validation error:", error?.message || "User not found");
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Error validating token:", error);
    return null;
  }
}

/**
 * Express middleware to require authentication
 * Validates JWT token and attaches user to request object
 *
 * With graceful degradation:
 * - If Supabase is down: allows request but logs warning (degraded mode)
 * - If token is invalid: returns 401 Unauthorized
 * - If token is valid: attaches user to req.user and continues
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid token.",
    });
    return;
  }

  // Validate token
  const user = await validateToken(token);

  if (!user) {
    // Check if Supabase client is available (for graceful degradation)
    const client = getSupabaseClient();
    if (!client) {
      // Supabase is down - allow degraded mode
      console.warn("Supabase unavailable - allowing request in degraded mode");
      // Continue without user (degraded mode)
      req.user = { id: "", isDegraded: true };
      next();
      return;
    }

    // Token is invalid but Supabase is available
    res.status(401).json({
      success: false,
      error: "Invalid or expired token. Please sign in again.",
    });
    return;
  }

  // Attach user to request
  req.user = { ...user, isDegraded: false };
  next();
}

/**
 * Express middleware for optional authentication
 * Validates token if present, but doesn't require it
 * Useful for routes that work with or without authentication
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    // No token provided - continue without user
    return next();
  }

  // Try to validate token
  const user = await validateToken(token);
  if (user) {
    req.user = user;
  }
  // Continue regardless of validation result (optional auth)

  next();
}

/**
 * Helper function to get user_id from request
 * Returns user_id if authenticated, null otherwise
 */
export function getUserId(req: Request): string | null {
  return req.user?.id || null;
}
