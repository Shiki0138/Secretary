import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client (Server-side only)
 * Uses service role key for admin operations
 *
 * Note: Using generic client type for broader compatibility.
 * Type safety is enforced at the service layer through explicit type annotations.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Generic Supabase client type for admin operations
type AdminClient = SupabaseClient;
let adminClient: AdminClient | null = null;

if (!supabaseUrl) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is not set");
}

// Create admin client (only use on server-side) - Singleton
export function getSupabaseAdmin(): AdminClient {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase configuration is missing");
    }

    if (!adminClient) {
        adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return adminClient;
}
