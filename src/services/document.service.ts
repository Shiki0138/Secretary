import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";

/**
 * Document Service
 * Handles document management and acknowledgments
 */

export type Document = Tables<"documents">;

export async function getDocuments(orgId: string): Promise<Document[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getDocumentWithAckStatus(
    orgId: string,
    userId: string
): Promise<Array<Document & { isAcknowledged: boolean; acknowledgedAt?: string }>> {
    const supabase = getSupabaseAdmin();

    // Get documents
    const { data: documents, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true);

    if (docError) throw docError;

    // Get acknowledgments for this user
    const { data: acks, error: ackError } = await supabase
        .from("document_acknowledgments")
        .select("document_id, acknowledged_at")
        .eq("user_id", userId);

    if (ackError) throw ackError;

    type AckRow = { document_id: string; acknowledged_at: string | null };
    const ackMap = new Map((acks as AckRow[] | null)?.map((a: AckRow) => [a.document_id, a.acknowledged_at]) || []);

    return ((documents || []) as Document[]).map((doc: Document) => ({
        ...doc,
        isAcknowledged: ackMap.has(doc.id),
        acknowledgedAt: ackMap.get(doc.id) || undefined,
    }));
}

export async function acknowledgeDocument(
    orgId: string,
    documentId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("document_acknowledgments")
        .upsert({
            org_id: orgId,
            document_id: documentId,
            user_id: userId,
            acknowledged_at: new Date().toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent,
        }, { onConflict: "document_id,user_id" });

    if (error) throw error;
}

export async function getAcknowledgmentStats(
    orgId: string,
    documentId: string
): Promise<{ total: number; acknowledged: number }> {
    const supabase = getSupabaseAdmin();

    // Get total users in org
    const { count: total, error: userError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", true)
        .neq("role", "owner");

    if (userError) throw userError;

    // Get acknowledgment count
    const { count: acknowledged, error: ackError } = await supabase
        .from("document_acknowledgments")
        .select("*", { count: "exact", head: true })
        .eq("document_id", documentId);

    if (ackError) throw ackError;

    return {
        total: total || 0,
        acknowledged: acknowledged || 0,
    };
}

export async function uploadDocument(
    orgId: string,
    title: string,
    docType: Document["doc_type"],
    content: string,
    uploadedBy: string
): Promise<Document> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("documents")
        .insert({
            org_id: orgId,
            title,
            doc_type: docType,
            content,
            uploaded_by: uploadedBy,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}
