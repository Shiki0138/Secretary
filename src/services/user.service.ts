import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";

/**
 * User Service
 * Handles user-related database operations
 */

export type User = Tables<"users">;
export type Organization = Tables<"organizations">;

export async function getUserByLineId(lineUserId: string): Promise<User | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("line_user_id", lineUserId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
    }
    return data;
}

export async function getUserById(userId: string): Promise<User | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
    }
    return data;
}

export async function getUsersInOrg(orgId: string): Promise<User[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("display_name", { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
    }
    return data;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
    }
    return data;
}

/**
 * Get organization by LINE channel ID
 * Used for multi-tenant LINE webhook handling
 */
export async function getOrganizationByLineChannel(
    lineChannelId: string
): Promise<Organization | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("line_channel_id", lineChannelId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
    }
    return data;
}

/**
 * Get LINE credentials for an organization
 */
export interface LineCredentials {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
}

export async function getOrgLineCredentials(
    orgId: string
): Promise<LineCredentials | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("organizations")
        .select("line_channel_id, line_channel_secret, line_channel_access_token")
        .eq("id", orgId)
        .single();

    if (error || !data) return null;

    if (!data.line_channel_id || !data.line_channel_secret || !data.line_channel_access_token) {
        return null;
    }

    return {
        channelId: data.line_channel_id,
        channelSecret: data.line_channel_secret,
        channelAccessToken: data.line_channel_access_token,
    };
}

export async function createUser(
    orgId: string,
    displayName: string,
    role: User["role"],
    lineUserId?: string,
    email?: string
): Promise<User> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("users")
        .insert({
            org_id: orgId,
            display_name: displayName,
            role,
            line_user_id: lineUserId || null,
            email: email || null,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function linkLineUser(userId: string, lineUserId: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("users")
        .update({ line_user_id: lineUserId, updated_at: new Date().toISOString() })
        .eq("id", userId);

    if (error) throw error;
}
