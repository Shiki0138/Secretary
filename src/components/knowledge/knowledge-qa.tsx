"use client";

import { useState } from "react";

/**
 * Knowledge Q&A Component
 * 
 * Allows employees (and owners) to ask questions about company rules
 * Uses RAG to provide answers with citations
 */

interface Reference {
    documentTitle: string;
    section: string;
    content: string;
}

interface QAResult {
    answer: string;
    references: Reference[];
    confidence: number;
    needsHumanReview: boolean;
}

export function KnowledgeQA({ isDemo = false }: { isDemo?: boolean }) {
    const [question, setQuestion] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<QAResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        if (isDemo) {
            // Demo mode: return mock response
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setResult(DEMO_RESPONSES[question.includes("有給") ? "leave" : "default"]);
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/knowledge/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question }),
            });

            const data = await res.json();

            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.error);
            }
        } catch {
            setError("エラーが発生しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleClick = (example: string) => {
        setQuestion(example);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">❓ 規則について質問</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="例：有給休暇の申請方法を教えてください"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500">例:</span>
                    {EXAMPLE_QUESTIONS.map((q, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleExampleClick(q)}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                        >
                            {q}
                        </button>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? "回答を生成中..." : "質問する"}
                </button>
            </form>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {result && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    {/* Confidence Warning */}
                    {result.confidence < 0.5 && (
                        <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                            ⚠️ この回答の確信度が低いため、経営者に直接確認することをお勧めします。
                        </div>
                    )}

                    {/* Answer */}
                    <div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{result.answer}</p>
                    </div>

                    {/* References */}
                    {result.references.length > 0 && (
                        <div className="pt-3 border-t border-blue-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">📋 参照元:</p>
                            <div className="space-y-2">
                                {result.references.map((ref, i) => (
                                    <div key={i} className="p-2 bg-white rounded border border-gray-200 text-xs">
                                        <p className="font-medium text-gray-700">
                                            {ref.documentTitle} {ref.section && `- ${ref.section}`}
                                        </p>
                                        <p className="text-gray-500 mt-1">「{ref.content}」</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Human Review Notice */}
                    {result.needsHumanReview && (
                        <div className="pt-3 border-t border-blue-200">
                            <p className="text-xs text-gray-600">
                                💡 詳細は経営者に直接お問い合わせください。
                            </p>
                        </div>
                    )}
                </div>
            )}

            {isDemo && !result && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600">
                        🤖 AIが就業規則や給与規定を参照して回答します。
                        回答には必ず参照元が明記されます。
                    </p>
                </div>
            )}
        </div>
    );
}

const EXAMPLE_QUESTIONS = [
    "有給休暇の申請方法",
    "残業手当について",
    "服装規定",
];

const DEMO_RESPONSES: Record<string, QAResult> = {
    leave: {
        answer: `有給休暇の申請方法についてお答えします。

就業規則第15条によると、有給休暇を取得する場合は、原則として3日前までに所定の申請書を提出する必要があります。

申請手順：
1. 「休暇申請書」を記入
2. 直属の上司に提出
3. 承認後、人事部門に提出

緊急の場合は、当日の始業時刻までに電話連絡の上、事後申請が認められる場合があります。`,
        references: [
            {
                documentTitle: "就業規則 2026年版",
                section: "第15条",
                content: "年次有給休暇を取得しようとする者は、原則として3日前までに所定の様式により届け出なければならない",
            },
            {
                documentTitle: "有給休暇・特別休暇規定",
                section: "第3条",
                content: "緊急やむを得ない事由による場合は、始業時刻までに電話連絡の上、事後申請を認めることがある",
            },
        ],
        confidence: 0.92,
        needsHumanReview: false,
    },
    default: {
        answer: `ご質問ありがとうございます。

申し訳ございませんが、ご質問の内容に関連する規則の記載を見つけることができませんでした。

詳細については、直接経営者にお問い合わせください。`,
        references: [],
        confidence: 0.3,
        needsHumanReview: true,
    },
};
