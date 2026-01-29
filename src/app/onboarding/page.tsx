"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

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
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [user, setUser] = useState<User | null>(null);

    const addLog = useCallback((msg: string) => {
        console.log("[Onboarding]", msg);
        setDebugLog(prev => [...prev, msg]);
    }, []);

    // Check authentication on mount
    useEffect(() => {
        async function checkAuth() {
            addLog("認証確認開始...");

            const supabase = getSupabaseClient();
            if (!supabase) {
                addLog("ERROR: Supabaseクライアントが取得できません");
                setChecking(false);
                return;
            }
            addLog("Supabaseクライアント取得成功");

            // Try getSession first
            try {
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    addLog(`getSession エラー: ${sessionError.message}`);
                } else if (sessionData.session) {
                    addLog(`getSession 成功: ${sessionData.session.user.email}`);
                } else {
                    addLog("getSession: セッションなし");
                }
            } catch (e) {
                addLog(`getSession 例外: ${e}`);
            }

            // Try getUser
            try {
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
                if (authError) {
                    addLog(`getUser エラー: ${authError.message}`);
                    setChecking(false);
                    return;
                }
                if (!authUser) {
                    addLog("getUser: ユーザーなし");
                    setChecking(false);
                    return;
                }
                addLog(`getUser 成功: ${authUser.email}`);
                setUser(authUser);
                setChecking(false);
            } catch (e) {
                addLog(`getUser 例外: ${e}`);
                setChecking(false);
            }
        }

        checkAuth();
    }, [addLog]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError(null);
        addLog("組織作成開始...");

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

            addLog("組織作成成功！ダッシュボードへ...");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "エラーが発生しました");
            addLog(`組織作成エラー: ${err}`);
            setLoading(false);
        }
    }, [user, orgName, ownerName, addLog]);

    const handleRetryAuth = useCallback(async () => {
        addLog("認証再試行...");
        window.location.reload();
    }, [addLog]);

    if (checking) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
                    <div className="animate-pulse text-gray-500 mb-4 text-center">認証確認中...</div>
                    <div className="bg-gray-100 rounded p-3 text-xs font-mono max-h-40 overflow-auto">
                        {debugLog.map((log, i) => <div key={i} className="text-gray-600">{log}</div>)}
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
                    <div className="text-gray-700 mb-4 text-center font-medium">認証が必要です</div>

                    <div className="bg-gray-100 rounded p-3 text-xs font-mono max-h-60 overflow-auto mb-4">
                        {debugLog.map((log, i) => <div key={i} className="text-gray-600">{log}</div>)}
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={handleRetryAuth}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            再試行
                        </button>
                        <a
                            href="/login?redirect=/onboarding"
                            className="block w-full py-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            ログインページへ
                        </a>
                    </div>
                </div>
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
                        認証成功！
                    </h1>
                    <p className="text-center text-gray-600 mb-4">
                        {user.email}
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

                    {debugLog.length > 0 && (
                        <div className="mt-4 bg-gray-100 rounded p-3 text-xs font-mono max-h-32 overflow-auto">
                            {debugLog.map((log, i) => <div key={i} className="text-gray-600">{log}</div>)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
