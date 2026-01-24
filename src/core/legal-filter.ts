import { z } from "zod";

// Blocked topics - legal safeguard against unauthorized practice of law
export const BLOCKED_TOPIC_PATTERNS = [
    // Compensation negotiation (compensation)
    {
        pattern: /給与|賃金|時給|昇給|ボーナス|賞与|手当|残業代/g,
        category: "compensation",
        message: "給与・賃金に関する内容は、直接の話し合いまたは社会保険労務士にご相談ください。",
    },
    // Termination (termination)
    {
        pattern: /退職|辞職|離職|解雇|クビ|辞めたい|辞める/g,
        category: "termination",
        message: "退職に関する事項は、直接の話し合いまたは労働基準監督署にご相談ください。",
    },
    // Leave and working hours (leave)
    {
        pattern: /有給|有休|休暇|欠勤|シフト変更/g,
        category: "leave",
        message: "休暇・シフトに関する調整は、直接お話しいただくことをお勧めします。",
    },
    // Working hours (working_hours)
    {
        pattern: /残業|労働時間|休日出勤|深夜勤務|36協定/g,
        category: "working_hours",
        message: "労働時間に関する内容は、社会保険労務士または労働基準監督署にご相談ください。",
    },
    // Union activities - protected (union_protected)
    {
        pattern: /組合|ストライキ|団体交渉|労働争議/g,
        category: "union_protected",
        message: "労働組合活動に関する内容は法的に保護されており、このシステムでは取り扱いません。",
    },
    // Harassment claims (harassment)
    {
        pattern: /パワハラ|セクハラ|モラハラ|いじめ|嫌がらせ/g,
        category: "harassment",
        message: "ハラスメントに関するご相談は、専門の相談窓口または弁護士にご連絡ください。",
    },
] as const;

export type BlockedTopicCategory = typeof BLOCKED_TOPIC_PATTERNS[number]["category"];

export const blockedTopicResultSchema = z.object({
    isBlocked: z.boolean(),
    blockedTopics: z.array(z.object({
        category: z.string(),
        matchedText: z.string(),
        message: z.string(),
    })),
    cleanedMessage: z.string().optional(),
});

export type BlockedTopicResult = z.infer<typeof blockedTopicResultSchema>;

/**
 * Check message for blocked topics (legal safeguard)
 * These topics require direct human communication or professional consultation
 */
export function checkBlockedTopics(message: string): BlockedTopicResult {
    const blockedTopics: BlockedTopicResult["blockedTopics"] = [];

    for (const { pattern, category, message: warningMessage } of BLOCKED_TOPIC_PATTERNS) {
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        const matches = message.match(pattern);

        if (matches) {
            blockedTopics.push({
                category,
                matchedText: matches.join(", "),
                message: warningMessage,
            });
        }
    }

    return {
        isBlocked: blockedTopics.length > 0,
        blockedTopics,
        cleanedMessage: blockedTopics.length > 0 ? undefined : message,
    };
}

// External referral links for blocked topics
export const REFERRAL_LINKS = {
    compensation: {
        name: "全国社会保険労務士会連合会",
        url: "https://www.shakaihokenroumushi.jp/",
    },
    termination: {
        name: "厚生労働省 総合労働相談コーナー",
        url: "https://www.mhlw.go.jp/general/seido/chihou/kaiketu/soudan.html",
    },
    leave: {
        name: "労働条件相談ほっとライン",
        url: "https://www.check-roudou.mhlw.go.jp/lp/hotline/",
    },
    working_hours: {
        name: "労働基準監督署",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/location.html",
    },
    union_protected: {
        name: "中央労働委員会",
        url: "https://www.mhlw.go.jp/churoi/",
    },
    harassment: {
        name: "ハラスメント悩み相談室",
        url: "https://harasu-soudan.mhlw.go.jp/",
    },
} as const;

export function getReferralLink(category: BlockedTopicCategory) {
    return REFERRAL_LINKS[category];
}
