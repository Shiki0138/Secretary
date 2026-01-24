import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    acknowledgeDocument,
    getDocumentWithAckStatus,
} from "@/services/document.service";
import { getAuthUser, verifyAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

/**
 * Document Acknowledgment API
 */

const acknowledgmentSchema = z.object({
    userId: z.string().uuid(),
    documentId: z.string().uuid(),
    orgId: z.string().uuid(),
});

// Submit acknowledgment
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { userId, documentId, orgId } = acknowledgmentSchema.parse(body);

        // Verify org access
        const accessCheck = verifyAccess(user, orgId);
        if (!accessCheck.allowed) {
            return forbiddenResponse(accessCheck.reason);
        }

        // Verify user is acknowledging for themselves
        if (user.id !== userId) {
            return forbiddenResponse("Can only acknowledge documents for yourself");
        }

        // Get IP and user agent for audit trail
        const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        // Save to database
        await acknowledgeDocument(orgId, documentId, userId, ipAddress, userAgent);

        return NextResponse.json({
            success: true,
            message: "確認が記録されました",
            data: {
                userId,
                documentId,
                orgId,
                acknowledgedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Acknowledgment error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Get acknowledgment status for documents
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || user.id;
        const orgId = searchParams.get("orgId") || user.orgId;

        // Verify org access
        const accessCheck = verifyAccess(user, orgId);
        if (!accessCheck.allowed) {
            return forbiddenResponse(accessCheck.reason);
        }

        // Verify user is accessing their own status or is owner/manager
        if (user.id !== userId && user.role === "staff") {
            return forbiddenResponse("Can only view your own acknowledgment status");
        }

        // Fetch from database
        const documents = await getDocumentWithAckStatus(orgId, userId);

        const formattedDocuments = documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            docType: doc.doc_type,
            requiresAck: true, // All documents require acknowledgment
            isAcknowledged: doc.isAcknowledged,
            acknowledgedAt: doc.acknowledgedAt,
        }));

        const pendingCount = formattedDocuments.filter(
            (d) => d.requiresAck && !d.isAcknowledged
        ).length;

        return NextResponse.json({
            success: true,
            data: {
                documents: formattedDocuments,
                pendingCount,
            },
        });
    } catch (error) {
        console.error("Get acknowledgments error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
