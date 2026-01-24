import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { translateEmployeeToOwner, translateOwnerToEmployee } from "@/core/translation-engine";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth";

/**
 * Translation API
 *
 * メッセージの翻訳を行うエンドポイント
 */

const translateRequestSchema = z.object({
    text: z.string().min(1),
    direction: z.enum(["employee_to_owner", "owner_to_employee"]),
    context: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { text, direction, context } = translateRequestSchema.parse(body);

        const result = direction === "employee_to_owner"
            ? await translateEmployeeToOwner(text, context)
            : await translateOwnerToEmployee(text, context);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Translation error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
