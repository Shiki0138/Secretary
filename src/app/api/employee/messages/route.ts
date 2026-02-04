import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 従業員メッセージAPI
 * GET: メッセージ一覧取得
 * POST: メッセージ送信
 */

// Get messages for an employee
export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get user info
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, org_id")
            .eq("id", authUser.id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Get conversations for this employee
        const { data: conversations } = await supabase
            .from("conversations")
            .select("id")
            .eq("employee_id", user.id)
            .order("created_at", { ascending: false });

        if (!conversations || conversations.length === 0) {
            return NextResponse.json({
                success: true,
                data: { messages: [] },
            });
        }

        // Get messages from all conversations
        const conversationIds = conversations.map((c) => c.id);
        const { data: messages, error: msgError } = await supabase
            .from("messages")
            .select("id, direction, original_text, translated_text, created_at, is_confirmed")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: true });

        if (msgError) {
            console.error("Messages fetch error:", msgError);
            return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                messages: (messages || []).map((m) => ({
                    id: m.id,
                    direction: m.direction,
                    originalText: m.original_text,
                    translatedText: m.translated_text,
                    createdAt: m.created_at,
                    isConfirmed: m.is_confirmed,
                })),
            },
        });
    } catch (error) {
        console.error("Get messages error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

// Send a message from employee to owner
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { message, originalMessage, orgId } = body;

        if (!message || !orgId) {
            return NextResponse.json({ success: false, error: "Message and orgId are required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get user info
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, org_id, display_name")
            .eq("id", authUser.id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Get or create conversation
        let conversationId: string;

        const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("employee_id", user.id)
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (existingConv) {
            conversationId = existingConv.id;
        } else {
            const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({
                    org_id: user.org_id,
                    employee_id: user.id,
                    status: "open",
                    subject: message.slice(0, 50),
                })
                .select("id")
                .single();

            if (convError || !newConv) {
                console.error("Create conversation error:", convError);
                return NextResponse.json({ success: false, error: "Failed to create conversation" }, { status: 500 });
            }

            conversationId = newConv.id;
        }

        // Save message
        const { error: msgError } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            direction: "employee_to_owner",
            original_text: originalMessage || message,
            translated_text: message,
            is_confirmed: true,
        });

        if (msgError) {
            console.error("Save message error:", msgError);
            return NextResponse.json({ success: false, error: "Failed to save message" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "メッセージを送信しました",
        });
    } catch (error) {
        console.error("Send message error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
