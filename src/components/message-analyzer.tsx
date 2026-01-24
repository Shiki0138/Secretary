"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CoachingResult {
    originalMessage: string;
    emotion: {
        valence: number;
        arousal: number;
        emotions: string[];
        confidence: number;
    };
    risk: {
        aggressionScore: number;
        psychSafetyImpact: number;
        riskLevel: "low" | "medium" | "high" | "critical";
        concerns: string[];
    };
    suggestions: {
        style: string;
        transformedText: string;
        rationale: string;
    }[];
    blockedTopics: string[];
    requiresHumanDecision: boolean;
    summary: string;
}

export function MessageAnalyzer() {
    const [message, setMessage] = useState("");
    const [result, setResult] = useState<CoachingResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!message.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Analysis failed");
            }

            setResult(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const getRiskBadgeColor = (level: string) => {
        switch (level) {
            case "low": return "bg-green-100 text-green-800";
            case "medium": return "bg-yellow-100 text-yellow-800";
            case "high": return "bg-orange-100 text-orange-800";
            case "critical": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Input Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    メッセージ分析
                </h2>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="分析したいメッセージを入力してください..."
                    className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-500">
                        {message.length} 文字
                    </span>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !message.trim()}
                        className={cn(
                            "px-6 py-2.5 rounded-xl font-medium transition-all",
                            isLoading || !message.trim()
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                        )}
                    >
                        {isLoading ? "分析中..." : "分析する"}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
                    {error}
                </div>
            )}

            {/* Results Section */}
            {result && (
                <div className="space-y-6">
                    {/* Summary Card */}
                    <div className={cn(
                        "rounded-2xl p-6 border",
                        result.risk.riskLevel === "critical"
                            ? "bg-red-50 border-red-200"
                            : result.risk.riskLevel === "high"
                                ? "bg-orange-50 border-orange-200"
                                : result.risk.riskLevel === "medium"
                                    ? "bg-yellow-50 border-yellow-200"
                                    : "bg-green-50 border-green-200"
                    )}>
                        <p className="text-lg whitespace-pre-wrap">{result.summary}</p>
                    </div>

                    {/* Blocked Topics Warning */}
                    {result.blockedTopics.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                            <h3 className="font-semibold text-amber-800 mb-2">
                                ⚠️ 法的リスクのあるトピック
                            </h3>
                            <ul className="space-y-2">
                                {result.blockedTopics.map((topic, idx) => (
                                    <li key={idx} className="text-amber-700">{topic}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="text-sm text-gray-500 mb-1">リスクレベル</div>
                            <span className={cn(
                                "inline-block px-3 py-1 rounded-full text-sm font-medium",
                                getRiskBadgeColor(result.risk.riskLevel)
                            )}>
                                {result.risk.riskLevel.toUpperCase()}
                            </span>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="text-sm text-gray-500 mb-1">攻撃性スコア</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {result.risk.aggressionScore}
                                <span className="text-sm font-normal text-gray-400">/100</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="text-sm text-gray-500 mb-1">心理的安全性</div>
                            <div className={cn(
                                "text-2xl font-bold",
                                result.risk.psychSafetyImpact > 0
                                    ? "text-green-600"
                                    : result.risk.psychSafetyImpact < 0
                                        ? "text-red-600"
                                        : "text-gray-900"
                            )}>
                                {result.risk.psychSafetyImpact > 0 ? "+" : ""}
                                {result.risk.psychSafetyImpact}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="text-sm text-gray-500 mb-1">検出感情</div>
                            <div className="flex flex-wrap gap-1">
                                {result.emotion.emotions.map((e, idx) => (
                                    <span
                                        key={idx}
                                        className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                                    >
                                        {e}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">
                                💡 改善提案
                            </h3>
                            <div className="space-y-4">
                                {result.suggestions.map((suggestion, idx) => (
                                    <div
                                        key={idx}
                                        className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                {suggestion.style}
                                            </span>
                                        </div>
                                        <p className="text-gray-900 mb-2">{suggestion.transformedText}</p>
                                        <p className="text-sm text-gray-500">{suggestion.rationale}</p>
                                        <button
                                            onClick={() => setMessage(suggestion.transformedText)}
                                            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            この提案を使用する →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Human Decision Required */}
                    {result.requiresHumanDecision && (
                        <div className="bg-white rounded-2xl border-2 border-orange-300 p-6">
                            <h3 className="font-semibold text-orange-800 mb-2">
                                👤 人間の判断が必要です
                            </h3>
                            <p className="text-orange-700">
                                このメッセージは高いリスクスコアのため、送信前に内容を再確認することを強くお勧めします。
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
