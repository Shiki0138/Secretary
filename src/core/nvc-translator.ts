import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { type EmotionAnalysis, type RiskAssessment } from "./emotion-analyzer";

// NVC (Nonviolent Communication) transformation result
export const nvcTransformSchema = z.object({
    // Observation: What happened (without evaluation)
    observation: z.string(),
    // Feeling: What the sender is feeling
    feeling: z.string(),
    // Need: What underlying need is not being met
    need: z.string(),
    // Request: Concrete, actionable request
    request: z.string(),
});

export type NVCTransform = z.infer<typeof nvcTransformSchema>;

// Translation suggestion styles
export type TransformStyle = "factual" | "supportive" | "request" | "collaborative";

export const transformSuggestionSchema = z.object({
    style: z.enum(["factual", "supportive", "request", "collaborative"]),
    transformedText: z.string(),
    rationale: z.string(),
    // NVC breakdown if applicable
    nvcAnalysis: nvcTransformSchema.optional(),
});

export type TransformSuggestion = z.infer<typeof transformSuggestionSchema>;

// Complete coaching result
export const coachingResultSchema = z.object({
    originalMessage: z.string(),
    emotion: z.custom<EmotionAnalysis>(),
    risk: z.custom<RiskAssessment>(),
    suggestions: z.array(transformSuggestionSchema),
    blockedTopics: z.array(z.string()),
    requiresHumanDecision: z.boolean(),
    // Quick summary for UI
    summary: z.string(),
});

export type CoachingResult = z.infer<typeof coachingResultSchema>;

const NVC_TRANSLATION_PROMPT = `あなたは非暴力コミュニケーション（NVC）のエキスパートです。
職場でのメッセージを、より建設的で相手に受け入れられやすい表現に変換してください。

変換の際は以下の観点を考慮：
1. 事実と評価を分離する
2. 感情を「私は〜と感じている」の形で表現
3. 相手を非難せず、自分のニーズを明確にする
4. 具体的で実行可能なリクエストにする

3つの異なるスタイルで提案を作成してください：

1. factual（事実ベース）: 感情を排除し、事実と具体的な依頼のみ
2. supportive（支援的）: 相手への配慮を示しつつ依頼
3. collaborative（協調的）: チームとしての解決を志向

各提案にはその変換を選んだ理由（rationale）も含めてください。

JSON形式で回答（suggestions配列として）：
{
  "suggestions": [
    {
      "style": "factual",
      "transformedText": "...",
      "rationale": "..."
    },
    ...
  ]
}`;

export async function generateTransformSuggestions(
    originalMessage: string,
    emotion: EmotionAnalysis,
    risk: RiskAssessment
): Promise<TransformSuggestion[]> {
    const client = getOpenAIClient();

    const contextPrompt = `
元のメッセージ: "${originalMessage}"

分析結果:
- 感情価（valence）: ${emotion.valence}
- 興奮度（arousal）: ${emotion.arousal}
- 検出感情: ${emotion.emotions.join(", ")}
- 攻撃性スコア: ${risk.aggressionScore}/100
- 心理的安全性への影響: ${risk.psychSafetyImpact}
- リスクレベル: ${risk.riskLevel}
- 懸念点: ${risk.concerns.join(", ")}

この分析を踏まえて、より建設的な表現への変換提案を作成してください。`;

    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: NVC_TRANSLATION_PROMPT },
            { role: "user", content: contextPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions":[]}');

    return z.array(transformSuggestionSchema).parse(result.suggestions || []);
}

// Generate a quick summary for UI display
export function generateQuickSummary(risk: RiskAssessment): string {
    if (risk.riskLevel === "critical") {
        return "⚠️ このメッセージは受け手に強い威圧感を与える可能性があります。送信前に表現を見直すことを強くお勧めします。";
    }
    if (risk.riskLevel === "high") {
        return "🔶 やや強い表現が含まれています。相手の立場を考慮した言い換えを検討してください。";
    }
    if (risk.riskLevel === "medium") {
        return "💡 より建設的な表現への言い換え案があります。参考にしてみてください。";
    }
    return "✅ このメッセージは適切なトーンです。";
}
