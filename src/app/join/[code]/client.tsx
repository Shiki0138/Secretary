"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OrgInfo {
    name: string;
    valid: boolean;
    error?: string;
}

export function JoinPageClient({ code }: { code: string }) {
    const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"loading" | "form" | "line" | "complete" | "error">("loading");
    const router = useRouter();

    // Verify invitation code on mount
    useEffect(() => {
        async function verifyCode() {
            try {
                const response = await fetch(`/api/join/verify?code=${code}`);
                const data = await response.json();

                if (data.valid) {
                    setOrgInfo(data);
                    setStep("form");
                } else {
                    setOrgInfo({ name: "", valid: false, error: data.error });
                    setStep("error");
                }
            } catch {
                setOrgInfo({ name: "", valid: false, error: "招待コードの確認に失敗しました" });
                setStep("error");
            }
        }

        verifyCode();
    }, [code]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep("line");
    };

    const handleLineLogin = () => {
        // In production, this would redirect to LINE Login OAuth
        // For now, we'll simulate the flow
        const lineLoginUrl = `/api/line/login?code=${code}&name=${encodeURIComponent(name)}`;
        router.push(lineLoginUrl);
    };

    const handleDemoComplete = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/join/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    name,
                    lineUserId: `demo_${Date.now()}`, // Demo user
                }),
            });

            if (response.ok) {
                setStep("complete");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (step === "loading") {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">招待コードを確認中...</p>
                </div>
            </div>
        );
    }

    if (step === "error") {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">招待リンクが無効です</h1>
                    <p className="text-gray-600 mb-6">
                        {orgInfo?.error || "リンクの有効期限が切れているか、正しくありません。"}
                    </p>
                    <p className="text-sm text-gray-500">
                        経営者に新しい招待リンクを依頼してください。
                    </p>
                </div>
            </div>
        );
    }

    if (step === "complete") {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">登録完了！</h1>
                    <p className="text-gray-600 mb-6">
                        {orgInfo?.name}への登録が完了しました。<br />
                        LINEでメッセージを送信して相談できます。
                    </p>
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-700">
                            💡 AI秘書がメッセージを翻訳して、経営者に安全に伝えます。
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                {step === "form" && (
                    <>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">👋</span>
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 mb-1">
                                {orgInfo?.name}
                            </h1>
                            <p className="text-gray-600">
                                AI翻訳秘書に登録しましょう
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    あなたの名前
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="山田 花子"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                            >
                                次へ
                            </button>
                        </form>
                    </>
                )}

                {step === "line" && (
                    <>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 mb-2">
                                LINEで登録
                            </h1>
                            <p className="text-gray-600">
                                LINEアカウントを連携して完了です
                            </p>
                        </div>

                        <button
                            onClick={handleLineLogin}
                            className="w-full py-3 bg-[#00B900] text-white rounded-lg font-medium hover:bg-[#00a000] flex items-center justify-center gap-2 mb-4"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                            LINEでログイン
                        </button>

                        {/* Demo mode for testing */}
                        <button
                            onClick={handleDemoComplete}
                            disabled={loading}
                            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                        >
                            {loading ? "処理中..." : "デモモードで登録（開発用）"}
                        </button>

                        <p className="text-xs text-gray-500 text-center mt-4">
                            LINEアカウントを使って安全に登録します。<br />
                            個人情報は経営者には公開されません。
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
