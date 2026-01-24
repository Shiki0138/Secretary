import { z } from "zod";

// Emergency keywords for medical/urgent situations
export const EMERGENCY_KEYWORDS = [
    // Japanese emergency terms
    "至急", "緊急", "急いで", "今すぐ",
    // Medical emergencies (dental specific)
    "バキューム", "出血", "大量出血", "アレルギー", "アナフィラキシー",
    "意識", "失神", "誤嚥", "窒息", "痙攣",
    // English equivalents
    "URGENT", "EMERGENCY", "ASAP",
] as const;

// Time-sensitive keywords (less urgent but still priority)
export const PRIORITY_KEYWORDS = [
    "すぐに", "急ぎで", "本日中", "至急対応",
    "患者", "来院", "診療中",
] as const;

export const urgencyResultSchema = z.object({
    isEmergency: z.boolean(),
    isPriority: z.boolean(),
    matchedKeywords: z.array(z.string()),
    recommendedAction: z.enum(["bypass", "expedite", "normal"]),
});

export type UrgencyResult = z.infer<typeof urgencyResultSchema>;

/**
 * Detect emergency situations that should bypass AI processing
 * Critical for medical settings where delays could be dangerous
 */
export function detectUrgency(message: string): UrgencyResult {
    const normalizedMessage = message.toLowerCase();

    const emergencyMatches = EMERGENCY_KEYWORDS.filter(
        kw => normalizedMessage.includes(kw.toLowerCase())
    );

    const priorityMatches = PRIORITY_KEYWORDS.filter(
        kw => normalizedMessage.includes(kw.toLowerCase())
    );

    const isEmergency = emergencyMatches.length > 0;
    const isPriority = priorityMatches.length > 0;

    let recommendedAction: UrgencyResult["recommendedAction"] = "normal";
    if (isEmergency) {
        recommendedAction = "bypass";
    } else if (isPriority) {
        recommendedAction = "expedite";
    }

    return {
        isEmergency,
        isPriority,
        matchedKeywords: [...emergencyMatches, ...priorityMatches],
        recommendedAction,
    };
}

/**
 * Check if message should completely bypass AI processing
 * Used for true emergency situations in medical settings
 */
export function shouldBypass(message: string): boolean {
    const result = detectUrgency(message);
    return result.isEmergency;
}
