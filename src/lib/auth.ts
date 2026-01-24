import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { User } from "@/services/user.service";

/**
 * Authentication Helpers
 *
 * Provides utilities for authenticating users and verifying permissions
 */

export interface AuthUser {
    id: string;
    orgId: string;
    role: User["role"];
    email: string | null;
    displayName: string;
}

export interface AuthResult {
    user: AuthUser | null;
    error: string | null;
}

/**
 * Get authenticated user from session
 */
export async function getAuthUser(): Promise<AuthResult> {
    try {
        const supabase = await createClient();
        const {
            data: { user: authUser },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
            return { user: null, error: "Not authenticated" };
        }

        // Get user profile from database
        const admin = getSupabaseAdmin();
        const { data: profile, error: profileError } = await admin
            .from("users")
            .select("id, org_id, role, email, display_name")
            .eq("id", authUser.id)
            .single();

        if (profileError || !profile) {
            return { user: null, error: "User profile not found" };
        }

        return {
            user: {
                id: profile.id,
                orgId: profile.org_id,
                role: profile.role,
                email: profile.email,
                displayName: profile.display_name,
            },
            error: null,
        };
    } catch (error) {
        console.error("Auth error:", error);
        return { user: null, error: "Authentication failed" };
    }
}

/**
 * Verify user has access to a specific organization
 */
export function verifyOrgAccess(user: AuthUser, orgId: string): boolean {
    return user.orgId === orgId;
}

/**
 * Verify user has required role
 */
export function verifyRole(
    user: AuthUser,
    allowedRoles: User["role"][]
): boolean {
    return allowedRoles.includes(user.role);
}

/**
 * Combined verification for org access and role
 */
export function verifyAccess(
    user: AuthUser,
    orgId: string,
    allowedRoles?: User["role"][]
): { allowed: boolean; reason?: string } {
    if (!verifyOrgAccess(user, orgId)) {
        return { allowed: false, reason: "Access denied: wrong organization" };
    }

    if (allowedRoles && !verifyRole(user, allowedRoles)) {
        return { allowed: false, reason: "Access denied: insufficient role" };
    }

    return { allowed: true };
}

/**
 * Extract org_id from request for API routes
 * Checks body, query params, and headers
 */
export function extractOrgId(request: Request): string | null {
    const url = new URL(request.url);

    // Check query params first
    const queryOrgId = url.searchParams.get("orgId");
    if (queryOrgId) return queryOrgId;

    // Check x-org-id header
    const headerOrgId = request.headers.get("x-org-id");
    if (headerOrgId) return headerOrgId;

    return null;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized") {
    return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = "Access denied") {
    return new Response(JSON.stringify({ error: message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
}
