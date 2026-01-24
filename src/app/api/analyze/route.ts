import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processMessage } from "@/core";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth";

const analyzeRequestSchema = z.object({
    message: z.string().min(1, "Message is required"),
    options: z.object({
        forceAnalysis: z.boolean().optional(),
    }).optional(),
});

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { message, options } = analyzeRequestSchema.parse(body);

        const result = await processMessage(message, options);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Validation error",
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        console.error("Analysis error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "coaching-gateway",
        timestamp: new Date().toISOString(),
    });
}
