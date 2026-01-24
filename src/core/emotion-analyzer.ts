import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { parseOpenAIResponse } from "@/lib/json";

// Emotion analysis based on Russell's Circumplex Model
export const emotionAnalysisSchema = z.object({
    // Valence: -1 (negative) to 1 (positive)
    valence: z.number().min(-1).max(1),
    // Arousal: 0 (calm) to 1 (excited/agitated)
    arousal: z.number().min(0).max(1),
    // Primary emotions detected
    emotions: z.array(z.enum([
        "anger", "fear", "disgust", "sadness",
        "joy", "surprise", "trust", "anticipation",
        "frustration", "anxiety", "contempt", "neutral"
    ])),
    // Confidence score
    confidence: z.number().min(0).max(1),
});

export type EmotionAnalysis = z.infer<typeof emotionAnalysisSchema>;

// Risk assessment result
export const riskAssessmentSchema = z.object({
    // 0-100 scale for aggressive/threatening tone
    aggressionScore: z.number().min(0).max(100),
    // Estimated impact on recipient's psychological safety (-10 to +10)
    psychSafetyImpact: z.number().min(-10).max(10),
    // Risk level category
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    // Specific concerns identified
    concerns: z.array(z.string()),
});

export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;

const EMOTION_ANALYSIS_PROMPT = `あなたは職場コミュニケーションの感情分析エキスパートです。
与えられたメッセージを分析し、以下のJSON形式で結果を返してください。

分析観点：
1. valence: 感情の正負（-1: 非常にネガティブ, 0: 中立, 1: 非常にポジティブ）
2. arousal: 感情の強度（0: 穏やか, 1: 高揚/興奮）
3. emotions: 検出された主要な感情（複数可）
4. confidence: 分析の確信度（0-1）

回答はJSON形式のみで、説明は不要です。`;

const RISK_ASSESSMENT_PROMPT = `あなたは職場のハラスメント・パワハラ防止の専門家です。
以下のメッセージを評価し、JSON形式で結果を返してください。

評価基準：
1. aggressionScore (0-100): 攻撃的・威圧的表現の度合い
   - 0-20: 問題なし
   - 21-50: やや注意が必要
   - 51-80: 高リスク（パワハラと受け取られる可能性）
   - 81-100: 非常に高リスク（明確なハラスメント）

2. psychSafetyImpact (-10 to +10): 受け手の心理的安全性への影響
   - マイナス: 心理的安全性を損なう
   - プラス: 心理的安全性を高める

3. riskLevel: "low" | "medium" | "high" | "critical"

4. concerns: 具体的な懸念点のリスト

回答はJSON形式のみで返してください。`;

export async function analyzeEmotion(message: string): Promise<EmotionAnalysis> {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: EMOTION_ANALYSIS_PROMPT },
            { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const parseResult = parseOpenAIResponse(
        response.choices[0].message.content,
        emotionAnalysisSchema
    );

    if (!parseResult.success) {
        // Return neutral emotion analysis on parse error
        console.error("Emotion analysis parse error:", parseResult.error);
        return {
            valence: 0,
            arousal: 0.5,
            emotions: ["neutral"],
            confidence: 0,
        };
    }

    return parseResult.data!;
}

export async function assessRisk(message: string): Promise<RiskAssessment> {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: RISK_ASSESSMENT_PROMPT },
            { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const parseResult = parseOpenAIResponse(
        response.choices[0].message.content,
        riskAssessmentSchema
    );

    if (!parseResult.success) {
        // Return medium risk on parse error to be cautious
        console.error("Risk assessment parse error:", parseResult.error);
        return {
            aggressionScore: 50,
            psychSafetyImpact: 0,
            riskLevel: "medium",
            concerns: ["Analysis could not be completed"],
        };
    }

    return parseResult.data!;
}

// Combined analysis for coaching gateway
export async function analyzeMessage(message: string): Promise<{
    emotion: EmotionAnalysis;
    risk: RiskAssessment;
}> {
    const [emotion, risk] = await Promise.all([
        analyzeEmotion(message),
        assessRisk(message),
    ]);

    return { emotion, risk };
}
