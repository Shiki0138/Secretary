import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";

/**
 * Announcement Service
 * Handles announcements and read tracking
 */

export type Announcement = Tables<"announcements">;

export async function createAnnouncement(
    orgId: string,
    senderId: string,
    title: string,
    originalText: string,
    translatedText: string
): Promise<Announcement> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("announcements")
        .insert({
            org_id: orgId,
            sender_id: senderId,
            title,
            original_text: originalText,
            translated_text: translatedText,
            is_published: true,
            published_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getAnnouncements(
    orgId: string,
    limit = 20
): Promise<Announcement[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

export async function getAnnouncementsWithReadStatus(
    orgId: string,
    userId: string,
    limit = 20
): Promise<Array<Announcement & { isRead: boolean }>> {
    const supabase = getSupabaseAdmin();

    // Get announcements
    const { data: announcements, error: annError } = await supabase
        .from("announcements")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(limit);

    if (annError) throw annError;

    const announcementIds = (announcements as Announcement[])?.map((a: Announcement) => a.id) || [];

    // Get read status
    const { data: reads, error: readError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", userId)
        .in("announcement_id", announcementIds);

    if (readError) throw readError;

    const readSet = new Set((reads as { announcement_id: string }[])?.map((r: { announcement_id: string }) => r.announcement_id) || []);

    return ((announcements || []) as Announcement[]).map((ann: Announcement) => ({
        ...ann,
        isRead: readSet.has(ann.id),
    }));
}

export async function markAnnouncementAsRead(
    orgId: string,
    announcementId: string,
    userId: string
): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("announcement_reads")
        .upsert({
            org_id: orgId,
            announcement_id: announcementId,
            user_id: userId,
            read_at: new Date().toISOString(),
        }, { onConflict: "announcement_id,user_id" });

    if (error) throw error;
}

export async function getAnnouncementReadStats(
    announcementId: string,
    orgId: string
): Promise<{ total: number; read: number }> {
    const supabase = getSupabaseAdmin();

    // Get total users in org (excluding owner)
    const { count: total, error: userError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", true)
        .neq("role", "owner");

    if (userError) throw userError;

    // Get read count
    const { count: read, error: readError } = await supabase
        .from("announcement_reads")
        .select("*", { count: "exact", head: true })
        .eq("announcement_id", announcementId);

    if (readError) throw readError;

    return {
        total: total || 0,
        read: read || 0,
    };
}
