import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables, Insertable, Updatable } from "@/lib/database.types";

/**
 * Conversation Service
 * Handles all conversation-related database operations
 */

export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;

export async function createConversation(
    orgId: string,
    employeeId: string,
    subject: string
): Promise<Conversation> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("conversations")
        .insert({
            org_id: orgId,
            employee_id: employeeId,
            subject,
            status: "open",
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getConversations(
    orgId: string,
    status?: Conversation["status"]
): Promise<Conversation[]> {
    const supabase = getSupabaseAdmin();

    let query = supabase
        .from("conversations")
        .select("*")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });

    if (status) {
        query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function addMessage(
    orgId: string,
    conversationId: string,
    senderId: string,
    direction: Message["direction"],
    originalText: string | null,
    translatedText: string
): Promise<Message> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("messages")
        .insert({
            org_id: orgId,
            conversation_id: conversationId,
            sender_id: senderId,
            direction,
            original_text: originalText,
            translated_text: translatedText,
            is_confirmed: false,
        })
        .select()
        .single();

    if (error) throw error;

    // Update conversation updated_at
    await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

    return data;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function markMessageAsRead(messageId: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);
}

export async function updateConversationStatus(
    conversationId: string,
    status: Conversation["status"]
): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
        .from("conversations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
}
