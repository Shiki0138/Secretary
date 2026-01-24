import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getConversations,
    getMessages,
    updateConversationStatus,
} from "@/services/conversation.service";
import { getUserById } from "@/services/user.service";
import { getAuthUser, verifyAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

/**
 * Conversations API
 *
 * Manages employee-owner conversations
 */

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
            const messages = await getMessages(conversationId);

            return NextResponse.json({
                success: true,
                data: {
                    conversationId,
                    messages: messages.map((m) => ({
                        id: m.id,
                        senderId: m.sender_id,
                        direction: m.direction,
                        originalText: m.original_text,
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
