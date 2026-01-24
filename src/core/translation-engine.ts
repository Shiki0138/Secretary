import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { parseOpenAIResponse } from "@/lib/json";

/**
 * 翻訳エンジン
 * 
 * このモジュールは「回答」ではなく「翻訳」を行う。
 * - 従業員の質問 → マイルドで明確な表現に
 * - 経営者の回答 → わかりやすい表現に
 */

export const translationResultSchema = z.object({
    translatedText: z.string(),
    clarificationNeeded: z.boolean(),
    clarificationQuestion: z.string().optional(),
    summary: z.string(),
});

export type TranslationResult = z.infer<typeof translationResultSchema>;

const EMPLOYEE_TO_OWNER_PROMPT = `あなたは職場コミュニケーションの翻訳者です。
従業員からの質問や相談を、経営者に伝えるためにわかりやすく整理してください。

【重要なルール】
1. 意図を変えない（言いたいことの本質は維持）
2. 感情的な表現を中立的に変換
3. 具体的で明確な質問形式に整理
4. 攻撃的・批判的なトーンを除去
5. 相手との比較（「○○さんより〜」）は除去

【出力形式】
JSON形式で返してください：
{
  "translatedText": "翻訳後のテキスト",
  "clarificationNeeded": true/false（意図が不明確な場合はtrue）,
  "clarificationQuestion": "確認したい質問（clarificationNeededがtrueの場合）",
  "summary": "この質問の要点を一行で"
}`;

const OWNER_TO_EMPLOYEE_PROMPT = `あなたは職場コミュニケーションの翻訳者です。
経営者からの回答を、従業員にわかりやすく伝えるために整理してください。

【重要なルール】
1. 意図を変えない（伝えたいことの本質は維持）
2. 専門用語をわかりやすく言い換え
3. 威圧的・上から目線のトーンを除去
4. 具体的で行動可能な内容に
5. 感謝・配慮の言葉を適切に追加

【出力形式】
JSON形式で返してください：
{
  "translatedText": "翻訳後のテキスト",
  "clarificationNeeded": true/false（意図が不明確な場合はtrue）,
  "clarificationQuestion": "確認したい質問（clarificationNeededがtrueの場合）",
  "summary": "この回答の要点を一行で"
}`;

/**
 * 従業員のメッセージを経営者向けに翻訳
 */
export async function translateEmployeeToOwner(
    originalText: string,
    context?: string
): Promise<TranslationResult> {
    const client = getOpenAIClient();

    const userMessage = context
        ? `【背景情報】\n${context}\n\n【従業員の原文】\n${originalText}`
        : `【従業員の原文】\n${originalText}`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: EMPLOYEE_TO_OWNER_PROMPT },
            { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const parseResult = parseOpenAIResponse(
        response.choices[0].message.content,
        translationResultSchema
    );

    if (!parseResult.success) {
        throw new Error(`Failed to parse translation response: ${parseResult.error}`);
    }

    return parseResult.data!;
}

/**
 * 経営者のメッセージを従業員向けに翻訳
 */
export async function translateOwnerToEmployee(
    originalText: string,
    context?: string
): Promise<TranslationResult> {
    const client = getOpenAIClient();

    const userMessage = context
        ? `【背景情報】\n${context}\n\n【経営者の原文】\n${originalText}`
        : `【経営者の原文】\n${originalText}`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: OWNER_TO_EMPLOYEE_PROMPT },
            { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const parseResult = parseOpenAIResponse(
        response.choices[0].message.content,
        translationResultSchema
    );

    if (!parseResult.success) {
        throw new Error(`Failed to parse translation response: ${parseResult.error}`);
    }

    return parseResult.data!;
}
