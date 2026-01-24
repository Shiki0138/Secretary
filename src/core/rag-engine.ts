import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { parseOpenAIResponse } from "@/lib/json";

/**
 * RAGエンジン
 * 
 * 就業規則PDFからの質問応答
 * 「規則第○条によると〜」と参照付きで回答
 */

export const ragResultSchema = z.object({
    answer: z.string(),
    references: z.array(z.object({
        documentTitle: z.string(),
        section: z.string(),
        content: z.string(),
    })),
    confidence: z.number().min(0).max(1),
    needsHumanReview: z.boolean(),
});

export type RAGResult = z.infer<typeof ragResultSchema>;

// Embedding生成
export async function generateEmbedding(text: string): Promise<number[]> {
    const client = getOpenAIClient();

    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    return response.data[0].embedding;
}

// ドキュメントチャンクの類似検索（Supabase使用時）
export interface DocumentChunk {
    id: string;
    documentId: string;
    documentTitle: string;
    content: string;
    similarity: number;
}

const RAG_SYSTEM_PROMPT = `あなたは就業規則に関する質問に回答するアシスタントです。

【重要なルール】
1. 必ず提供されたドキュメントの内容に基づいて回答する
2. 回答には必ず「〇〇規則第△条によると」のように参照を明記する
3. ドキュメントに記載がない場合は「この点については規則に明記されていないため、直接ご確認ください」と回答
4. 自分の解釈や推測を加えない
5. 法的なアドバイスはしない

【出力形式】
JSON形式で返してください：
{
  "answer": "質問への回答（参照を含む）",
  "references": [
    {
      "documentTitle": "参照したドキュメント名",
      "section": "参照した条項（例：第15条）",
      "content": "該当箇所の原文（短く抜粋）"
    }
  ],
  "confidence": 0.0-1.0（回答の確信度）,
  "needsHumanReview": true/false（人間の確認が必要か）
}`;

/**
 * RAGによる質問応答
 */
export async function answerWithRAG(
    question: string,
    relevantChunks: DocumentChunk[]
): Promise<RAGResult> {
    const client = getOpenAIClient();

    // チャンクが見つからない場合
    if (relevantChunks.length === 0) {
        return {
            answer: "申し訳ございません。ご質問に関連する規則の記載が見つかりませんでした。詳細は直接経営者にお問い合わせください。",
            references: [],
            confidence: 0,
            needsHumanReview: true,
        };
    }

    // コンテキスト構築
    const context = relevantChunks
        .map((chunk, i) => `【参照${i + 1}: ${chunk.documentTitle}】\n${chunk.content}`)
        .join("\n\n");

    const userMessage = `【質問】\n${question}\n\n【参照可能なドキュメント】\n${context}`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: RAG_SYSTEM_PROMPT },
            { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // 低めの温度で一貫性を保つ
    });

    const parseResult = parseOpenAIResponse(
        response.choices[0].message.content,
        ragResultSchema
    );

    if (!parseResult.success) {
        console.error("RAG response parse error:", parseResult.error);
        // Return a fallback response instead of throwing
        return {
            answer: "申し訳ございません。回答の生成中にエラーが発生しました。もう一度お試しください。",
            references: [],
            confidence: 0,
            needsHumanReview: true,
        };
    }

    return parseResult.data!;
}

/**
 * 質問がRAGで回答可能かを判定
 */
export function isRAGQuestion(message: string): boolean {
    const ragKeywords = [
        "規則", "規定", "ルール",
        "有給", "休暇", "休み",
        "給与", "給料", "手当",
        "勤務", "シフト", "時間",
        "申請", "届出", "手続き",
        "制服", "服装", "身だしなみ",
    ];

    return ragKeywords.some(keyword => message.includes(keyword));
}
