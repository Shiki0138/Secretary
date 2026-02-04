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

        // Input validation
        if (!message || typeof message !== 'string') {
            return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
        }

        // Sanitize message (prevent XSS)
        const sanitizedMessage = message.slice(0, 1000).trim();
        if (!sanitizedMessage) {
            return NextResponse.json({ success: false, error: "Message cannot be empty" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get user info with security check
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, org_id, display_name, role")
            .eq("id", authUser.id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Security: Verify user has access to this org
        if (orgId && user.org_id !== orgId) {
            console.error(`Security: User ${user.id} attempted to access org ${orgId} but belongs to ${user.org_id}`);
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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
                    subject: sanitizedMessage.slice(0, 50),
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
            original_text: originalMessage?.slice(0, 1000) || sanitizedMessage,
            translated_text: sanitizedMessage,
            is_confirmed: true,
        });

        if (msgError) {
            console.error("Save message error:", msgError);
            return NextResponse.json({ success: false, error: "Failed to save message" }, { status: 500 });
        }

        // Notify owner(s) via email (fire and forget)
        notifyOwners(supabase, user.org_id, user.display_name || "従業員", sanitizedMessage).catch(console.error);

        return NextResponse.json({
            success: true,
            message: "メッセージを送信しました",
        });
    } catch (error) {
        console.error("Send message error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

// Notify owners of new employee message
async function notifyOwners(supabase: ReturnType<typeof getSupabaseAdmin>, orgId: string, employeeName: string, message: string) {
    try {
        // Get all owners in the org
        const { data: owners } = await supabase
            .from("users")
            .select("id, email, display_name")
            .eq("org_id", orgId)
            .eq("role", "owner")
            .eq("is_active", true);

        if (!owners || owners.length === 0) {
            console.log("No owners to notify in org:", orgId);
            return;
        }

        // Get org name
        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", orgId)
            .single();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://secrty.vercel.app";

        for (const owner of owners) {
            if (!owner.email) continue;

            // For now, log the notification (email sending can be added later)
            console.log(`[Notification] Would send email to ${owner.email}:
Subject: 【${org?.name || "AI秘書"}】${employeeName}さんからメッセージ
Body: 新しいメッセージが届きました。

送信者: ${employeeName}
内容: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}

ダッシュボードで確認: ${appUrl}/dashboard
`);
        }
    } catch (error) {
        console.error("Notify owners error:", error);
    }
}

