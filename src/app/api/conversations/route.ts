import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getConversations,
    getMessages,
    updateConversationStatus,
} from "@/services/conversation.service";
import { getUserById } from "@/services/user.service";
import { getAuthUser, verifyAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Conversations API
 *
 * Manages employee-owner conversations (Web chat only)
 */

const replySchema = z.object({
    conversationId: z.string().uuid(),
    message: z.string().min(1).max(1000),
    employeeId: z.string().uuid(),
});

// Send a reply to employee (saved to database)
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // Only owners/managers can send replies
        if (user.role === "staff") {
            return forbiddenResponse("Only managers can send replies");
        }

        const body = await request.json();
        const { conversationId, message, employeeId } = replySchema.parse(body);

        // Verify employee exists
        const employee = await getUserById(employeeId);
        if (!employee) {
            return NextResponse.json(
                { success: false, error: "従業員が見つかりません" },
                { status: 400 }
            );
        }

        // Save message to database
        const supabase = getSupabaseAdmin();
        const { error: msgError } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            direction: "owner_to_employee",
            original_text: message,
            translated_text: message,
            is_confirmed: true,
        });

        if (msgError) {
            console.error("Save reply error:", msgError);
            return NextResponse.json(
                { success: false, error: "メッセージの保存に失敗しました" },
                { status: 500 }
            );
        }

        // Update conversation status to pending (owner replied)
        await updateConversationStatus(conversationId, "pending");

        return NextResponse.json({
            success: true,
            message: "返信を送信しました",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Send reply error:", error);
        return NextResponse.json(
            { success: false, error: "返信の送信に失敗しました" },
            { status: 500 }
        );
    }
}



// Get conversations for an organization
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get("orgId") || user.orgId;
        const status = searchParams.get("status") as "open" | "pending" | "resolved" | "closed" | null;
        const conversationId = searchParams.get("conversationId");

        // Verify org access
        const accessCheck = verifyAccess(user, orgId);
        if (!accessCheck.allowed) {
            return forbiddenResponse(accessCheck.reason);
        }

        // If specific conversation requested, return with messages
        if (conversationId) {
            // 🔒 会話の所有者チェック
            const conversations = await getConversations(orgId);
            const conversation = conversations.find(c => c.id === conversationId);

            if (!conversation) {
                return forbiddenResponse("Conversation not found or access denied");
            }

            // 🔒 スタッフは自分の会話のみアクセス可能
            if (user.role === "staff" && conversation.employee_id !== user.id) {
                return forbiddenResponse("You can only view your own conversations");
            }

            const messages = await getMessages(conversationId);

            // 原文はシステム管理者のみアクセス可能（プライバシー保護）
            const canViewOriginal = user.role === 'system_admin';

            return NextResponse.json({
                success: true,
                data: {
                    conversationId,
                    messages: messages.map((m) => ({
                        id: m.id,
                        senderId: m.sender_id,
                        direction: m.direction,
                        // 原文は非表示（システム管理者のみ閲覧可能）
                        originalText: canViewOriginal ? m.original_text : null,
                        translatedText: m.translated_text,
                        isConfirmed: m.is_confirmed,
                        isRead: m.is_read,
                        createdAt: m.created_at,
                    })),
                },
            });
        }


        // Get all conversations
        const conversations = await getConversations(orgId, status || undefined);

        // Enrich with employee names
        const enrichedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const employee = await getUserById(conv.employee_id);
                const messages = await getMessages(conv.id);
                const lastMessage = messages[messages.length - 1];

                return {
                    id: conv.id,
                    employeeId: conv.employee_id,
                    employeeName: employee?.display_name || "Unknown",
                    subject: conv.subject,
                    status: conv.status,
                    lastMessage: lastMessage?.translated_text || "",
                    createdAt: conv.created_at,
                    updatedAt: conv.updated_at,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                conversations: enrichedConversations,
            },
        });
    } catch (error) {
        console.error("Get conversations error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

const updateConversationSchema = z.object({
    conversationId: z.string().uuid(),
    status: z.enum(["open", "pending", "resolved", "closed"]),
});

// Update conversation status
export async function PATCH(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        // Only owners/managers can update conversation status
        if (user.role === "staff") {
            return forbiddenResponse("Only managers can update conversation status");
        }

        const body = await request.json();
        const { conversationId, status } = updateConversationSchema.parse(body);

        await updateConversationStatus(conversationId, status);

        return NextResponse.json({
            success: true,
            message: "ステータスを更新しました",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Update conversation error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
