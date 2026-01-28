"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

function generateOrgSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "org";
}

export default function OnboardingPage() {
    const [orgName, setOrgName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const supabase = useMemo<SupabaseClient | null>(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return null;
        return createClient(url, key);
    }, []);

    // Check authentication on mount
    useEffect(() => {
        async function checkAuth() {
            if (!supabase) {
                router.push("/login");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push("/login");
                return;
            }

            setUser(session.user);
            setChecking(false);
        }

        checkAuth();
    }, [supabase, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

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
                    userId: user.id,
                    email: user.email,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "組織の作成に失敗しました");
            }

            // Success - go to dashboard
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="animate-pulse text-gray-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        メール確認完了！
                    </h1>
                    <p className="text-center text-gray-600 mb-6">
                        組織情報を入力して登録を完了しましょう
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                会社・組織名
                            </label>
                            <input
                                type="text"
                                required
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="〇〇株式会社"
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
                            {loading ? "作成中..." : "組織を作成してダッシュボードへ"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
