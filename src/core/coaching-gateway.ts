import { analyzeMessage } from "./emotion-analyzer";
import {
    generateTransformSuggestions,
    generateQuickSummary,
    type CoachingResult,
} from "./nvc-translator";
import { checkBlockedTopics, getReferralLink } from "./legal-filter";
import { detectUrgency, shouldBypass } from "./urgency-detector";

export interface CoachingGatewayOptions {
    /** Skip AI analysis for very short messages */
    minMessageLength?: number;
    /** Force analysis even for low-risk messages */
    forceAnalysis?: boolean;
}

const DEFAULT_OPTIONS: Required<CoachingGatewayOptions> = {
    minMessageLength: 10,
    forceAnalysis: false,
};

/**
 * Main entry point for the Coaching Gateway
 * Orchestrates all analysis modules and returns unified result
 */
export async function processMessage(
    message: string,
    options: CoachingGatewayOptions = {}
): Promise<CoachingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // 1. Check for emergency - bypass all processing
    if (shouldBypass(message)) {
        return {
            originalMessage: message,
            emotion: {
                valence: 0,
                arousal: 1,
                emotions: ["anticipation"],
                confidence: 0.5,
            },
            risk: {
                aggressionScore: 0,
                psychSafetyImpact: 0,
                riskLevel: "low",
                concerns: [],
            },
            suggestions: [],
            blockedTopics: [],
            requiresHumanDecision: false,
            summary: "🚨 緊急メッセージとして検出されました。フィルタなしで送信されます。",
        };
    }

    // 2. Check for blocked topics (legal safeguard)
    const blockedResult = checkBlockedTopics(message);
    if (blockedResult.isBlocked) {
        const referralLinks = blockedResult.blockedTopics.map(t => {
            const link = getReferralLink(t.category as Parameters<typeof getReferralLink>[0]);
            return link ? `${link.name}: ${link.url}` : null;
        }).filter(Boolean);

        return {
            originalMessage: message,
            emotion: {
                valence: 0,
                arousal: 0,
                emotions: ["neutral"],
                confidence: 0,
            },
            risk: {
                aggressionScore: 0,
                psychSafetyImpact: 0,
                riskLevel: "low",
                concerns: ["法的リスクのあるトピックが含まれています"],
            },
            suggestions: [],
            blockedTopics: blockedResult.blockedTopics.map(t => t.message),
            requiresHumanDecision: true,
            summary: `⚠️ この内容はシステムで取り扱えません。\n\n${blockedResult.blockedTopics.map(t => t.message).join("\n")}\n\n参考リンク:\n${referralLinks.join("\n")}`,
        };
    }

    // 3. Skip analysis for very short messages
    if (message.length < opts.minMessageLength && !opts.forceAnalysis) {
        return {
            originalMessage: message,
            emotion: {
                valence: 0,
                arousal: 0,
                emotions: ["neutral"],
                confidence: 0.5,
            },
            risk: {
                aggressionScore: 0,
                psychSafetyImpact: 0,
                riskLevel: "low",
                concerns: [],
            },
            suggestions: [],
            blockedTopics: [],
            requiresHumanDecision: false,
            summary: "✅ このメッセージは問題ありません。",
        };
    }

    // 4. Full AI analysis
    const { emotion, risk } = await analyzeMessage(message);

    // 5. Check urgency (not emergency, but priority)
    const urgency = detectUrgency(message);

    // 6. Generate suggestions if risk is medium or higher
    let suggestions: CoachingResult["suggestions"] = [];
    if (risk.riskLevel !== "low" || opts.forceAnalysis) {
        suggestions = await generateTransformSuggestions(message, emotion, risk);
    }

    // 7. Determine if human decision is required
    const requiresHumanDecision =
        risk.riskLevel === "high" ||
        risk.riskLevel === "critical" ||
        risk.aggressionScore > 50;

    // 8. Generate quick summary
    let summary = generateQuickSummary(risk);
    if (urgency.isPriority && !urgency.isEmergency) {
        summary = `⚡ 優先メッセージとして処理されます。\n\n${summary}`;
    }

    return {
        originalMessage: message,
        emotion,
        risk,
        suggestions,
        blockedTopics: [],
        requiresHumanDecision,
        summary,
    };
}

// Re-export types for convenience
export type { CoachingResult, TransformSuggestion } from "./nvc-translator";
export type { EmotionAnalysis, RiskAssessment } from "./emotion-analyzer";
export type { BlockedTopicResult } from "./legal-filter";
export type { UrgencyResult } from "./urgency-detector";
