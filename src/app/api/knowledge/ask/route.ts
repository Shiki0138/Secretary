import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/services/rag.service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth";

/**
 * Knowledge Q&A API
 * 
 * Answers questions using RAG based on uploaded documents
 * Available to both owners and employees
 */

const askQuestionSchema = z.object({
    question: z.string().min(2).max(1000),
});

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error: authError } = await getAuthUser();
        if (authError || !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const parsed = askQuestionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: "質問を入力してください" },
                { status: 400 }
            );
        }

        const { question } = parsed.data;

        // Get RAG answer with references
        const result = await answerQuestion(user.orgId, question);

        return NextResponse.json({
            success: true,
            data: {
                answer: result.answer,
                references: result.references,
                confidence: result.confidence,
                needsHumanReview: result.needsHumanReview,
            },
        });
    } catch (error) {
        console.error("Knowledge ask error:", error);
        return NextResponse.json(
            { success: false, error: "回答の生成に失敗しました。もう一度お試しください。" },
            { status: 500 }
        );
    }
}
