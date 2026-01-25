"use client";

import { useState, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

function generateOrgSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "org";
}

export default function SignupPage() {
    const [step, setStep] = useState<"email" | "org" | "complete">("email");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [orgName, setOrgName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const router = useRouter();

    const supabase = useMemo<SupabaseClient | null>(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return null;
        return createClient(url, key);
    }, []);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setError("Supabase is not configured");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setStep("org");
            setLoading(false);
        }
    };

    const handleOrgSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: orgName,
                    slug: generateOrgSlug(orgName),
                    ownerName,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "組織の作成に失敗しました");
            }

            setInviteCode(data.inviteCode);
            setStep("complete");
        } catch (err) {
            setError(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full">
                {/* Progress indicator */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <StepIndicator number={1} active={step === "email"} completed={step !== "email"} />
                        <div className="w-8 h-0.5 bg-gray-300" />
                        <StepIndicator number={2} active={step === "org"} completed={step === "complete"} />
                        <div className="w-8 h-0.5 bg-gray-300" />
                        <StepIndicator number={3} active={step === "complete"} completed={false} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {step === "email" && (
                        <>
                            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                                AI翻訳秘書を始める
                            </h1>
                            <p className="text-center text-gray-600 mb-6">
                                まずは経営者アカウントを作成
                            </p>

                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        メールアドレス
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        パスワード
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="8文字以上"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? "処理中..." : "次へ"}
                                </button>
                            </form>

                            <p className="mt-6 text-center text-sm text-gray-500">
                                すでにアカウントをお持ちですか？{" "}
                                <a href="/login" className="text-blue-600 hover:underline">
                                    ログイン
                                </a>
                            </p>
                        </>
                    )}

                    {step === "org" && (
                        <>
                            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                                組織情報を入力
                            </h1>
                            <p className="text-center text-gray-600 mb-6">
                                医院・クリニック名を登録してください
                            </p>

                            <form onSubmit={handleOrgSubmit} className="space-y-4">
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        医院・クリニック名
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="〇〇歯科医院"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        あなたの名前
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="山田 太郎"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? "作成中..." : "組織を作成"}
                                </button>
                            </form>
                        </>
                    )}

                    {step === "complete" && inviteCode && (
                        <>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                    登録完了！
                                </h1>
                                <p className="text-gray-600 mb-6">
                                    従業員を招待しましょう
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <p className="text-sm text-gray-600 mb-2">招待リンク</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteCode}`}
                                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/join/${inviteCode}`);
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                                    >
                                        コピー
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 text-center mb-6">
                                このリンクを従業員に共有してください。<br />
                                LINE登録するだけで使い始められます。
                            </p>

                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                ダッシュボードへ
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function StepIndicator({ number, active, completed }: { number: number; active: boolean; completed: boolean }) {
    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${completed ? "bg-green-500 text-white" :
                active ? "bg-blue-600 text-white" :
                    "bg-gray-200 text-gray-500"
            }`}>
            {completed ? "✓" : number}
        </div>
    );
}
