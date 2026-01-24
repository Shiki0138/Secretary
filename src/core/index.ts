export { processMessage } from "./coaching-gateway";
export type {
    CoachingResult,
    TransformSuggestion,
    EmotionAnalysis,
    RiskAssessment,
    BlockedTopicResult,
    UrgencyResult,
} from "./coaching-gateway";

export { analyzeEmotion, assessRisk, analyzeMessage } from "./emotion-analyzer";
export { generateTransformSuggestions, generateQuickSummary } from "./nvc-translator";
export { checkBlockedTopics, getReferralLink, BLOCKED_TOPIC_PATTERNS, REFERRAL_LINKS } from "./legal-filter";
export { detectUrgency, shouldBypass, EMERGENCY_KEYWORDS, PRIORITY_KEYWORDS } from "./urgency-detector";
