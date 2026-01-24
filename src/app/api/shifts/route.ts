import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getShiftsForUser,
    submitShiftRequests,
    type ShiftRequest,
} from "@/services/shift.service";
import { getAuthUser, verifyAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

/**
 * Shift Management API
 */

const shiftRequestSchema = z.object({
    userId: z.string().uuid(),
    orgId: z.string().uuid(),
    requests: z.array(z.object({
        date: z.string(), // YYYY-MM-DD
        preference: z.enum(["full", "morning", "afternoon", "off"]),
        notes: z.string().optional(),
    })),
});

// Submit shift requests
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { userId, orgId, requests } = shiftRequestSchema.parse(body);

        // Verify org access
        const accessCheck = verifyAccess(user, orgId);
        if (!accessCheck.allowed) {
            return forbiddenResponse(accessCheck.reason);
        }

        // Verify user is submitting for themselves or is owner/manager
        if (user.id !== userId && user.role === "staff") {
            return forbiddenResponse("Can only submit shifts for yourself");
        }

        // Convert to service format and save to database
        const shiftRequests: ShiftRequest[] = requests.map((r) => ({
            date: r.date,
            preference: r.preference,
            notes: r.notes,
        }));

        const savedShifts = await submitShiftRequests(orgId, userId, shiftRequests);

        return NextResponse.json({
            success: true,
            message: `${requests.length}件のシフト希望を提出しました`,
            data: {
                userId,
                orgId,
                requestCount: requests.length,
                shifts: savedShifts,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Shift request error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Get shifts for a user
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || user.id;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Verify user is accessing their own shifts or is owner/manager
        if (user.id !== userId && user.role === "staff") {
            return forbiddenResponse("Can only view your own shifts");
        }

        // Default date range to current month if not specified
        const today = new Date();
        const start = startDate || today.toISOString().slice(0, 7) + "-01";
        const end = endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10);

        // Fetch from database
        const shifts = await getShiftsForUser(userId, start, end);

        const formattedShifts = shifts.map((s) => ({
            id: s.id,
            date: s.shift_date,
            startTime: s.start_time,
            endTime: s.end_time,
            status: s.status,
            notes: s.notes,
        }));

        return NextResponse.json({
            success: true,
            data: {
                userId,
                startDate: start,
                endDate: end,
                shifts: formattedShifts,
            },
        });
    } catch (error) {
        console.error("Get shifts error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
