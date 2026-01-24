import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementsWithReadStatus,
    getAnnouncementReadStats,
} from "@/services/announcement.service";
import { getUsersInOrg } from "@/services/user.service";
import { sendMulticast } from "@/services/line.service";
import { getAuthUser, verifyAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

/**
 * Announcements API
 */

const announcementSchema = z.object({
    orgId: z.string().uuid(),
    senderId: z.string().uuid(),
    title: z.string().min(1),
    originalText: z.string().min(1),
    translatedText: z.string().min(1),
});

// Create and publish announcement
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const data = announcementSchema.parse(body);

        // Verify access
        const accessCheck = verifyAccess(user, data.orgId, ["owner", "manager"]);
        if (!accessCheck.allowed) {
            return forbiddenResponse(accessCheck.reason);
        }

        // Save to database
        const announcement = await createAnnouncement(
            data.orgId,
            data.senderId,
            data.title,
            data.originalText,
            data.translatedText
        );

        // Send LINE push notifications to all employees in org
        try {
            const users = await getUsersInOrg(data.orgId);
            const lineUserIds = users
                .filter((u) => u.line_user_id && u.role !== "owner")
                .map((u) => u.line_user_id!);

            if (lineUserIds.length > 0) {
                // Get org LINE credentials (would need to add this)
                const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
                if (channelAccessToken) {
                    await sendMulticast(
                        lineUserIds,
                        [
                            {
                                type: "text",
                                text: `[お知らせ] ${data.title}\n\n${data.translatedText}`,
                            },
                        ],
                        channelAccessToken
                    );
                }
            }
        } catch (lineError) {
            console.error("Failed to send LINE notifications:", lineError);
            // Continue - announcement is saved even if LINE fails
        }

        return NextResponse.json({
            success: true,
            message: "お知らせを配信しました",
            data: announcement,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Announcement error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Get announcements for an organization
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get("orgId") || user.orgId;
        const userId = searchParams.get("userId");

        // Verify org access
        const accessCheck = verifyAccess(user, orgId);
        if (!accessCheck.allowed) {
            return forbiddenResponse(accessCheck.reason);
        }

        // Fetch from database
        let announcements;
        if (userId) {
            announcements = await getAnnouncementsWithReadStatus(orgId, userId);
        } else {
            announcements = await getAnnouncements(orgId);
        }

        // Add read stats for owners/managers
        const announcementsWithStats = await Promise.all(
            announcements.map(async (ann) => {
                const stats = await getAnnouncementReadStats(ann.id, orgId);
                return {
                    id: ann.id,
                    title: ann.title,
                    content: ann.translated_text,
                    publishedAt: ann.published_at,
                    isRead: "isRead" in ann ? ann.isRead : undefined,
                    readCount: stats.read,
                    totalCount: stats.total,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                announcements: announcementsWithStats,
            },
        });
    } catch (error) {
        console.error("Get announcements error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
