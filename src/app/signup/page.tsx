"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const [isExistingUser, setIsExistingUser] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const supabase = getSupabaseClient();
        if (!supabase) {
            setError("システムが正しく設定されていません");
            return;
        }

        setLoading(true);
        setError(null);
        setIsExistingUser(false);

        // Get the current origin for redirect URL
        const redirectUrl = typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
            },
        });

        if (error) {
            // Translate common error messages
            if (error.message.includes("already registered")) {
                setError("このメールアドレスは既に登録されています。ログインしてください。");
                setIsExistingUser(true);
            } else if (error.message.includes("password")) {
                setError("パスワードは8文字以上で入力してください");
            } else {
                setError(error.message);
            }
            setLoading(false);
            return;
        }

        // Check if user already exists (Supabase returns user but no session for existing users)
        // When a user already exists, identities array is empty
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            setError("このメールアドレスは既に登録されています。ログインしてください。");
            setIsExistingUser(true);
            setLoading(false);
            return;
        }

        setEmailSent(true);
        setLoading(false);
    };

    // Show email sent confirmation
    if (emailSent) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        確認メールを送信しました
                    </h1>
                    <p className="text-gray-600 mb-6">
                        <span className="font-medium text-gray-900">{email}</span> に確認メールを送信しました。
                        <br />
                        メール内のリンクをクリックして登録を完了してください。
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-4">
                        <p className="text-sm text-amber-800">
                            <strong>メールが届かない場合：</strong>
                        </p>
                        <ul className="text-sm text-amber-700 mt-2 list-disc list-inside space-y-1">
                            <li>迷惑メールフォルダを確認してください</li>
                            <li>数分待ってから再度お試しください</li>
                            <li>既に登録済みの場合はメールが届きません</li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                        <p className="text-sm text-blue-800">
                            <strong>既にアカウントをお持ちですか？</strong>
                        </p>
                        <a
                            href="/login"
                            className="mt-2 inline-block text-sm text-blue-600 font-medium hover:underline"
                        >
                            → ログインページへ
                        </a>
                    </div>

                    <button
                        onClick={() => {
                            setEmailSent(false);
                            setEmail("");
                            setPassword("");
                        }}
                        className="mt-6 text-sm text-gray-500 hover:underline"
                    >
                        別のメールアドレスで登録する
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        AI翻訳秘書を始める
                    </h1>
                    <p className="text-center text-gray-600 mb-6">
                        経営者アカウントを作成
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
                                <p>{error}</p>
                                {isExistingUser && (
                                    <a
                                        href="/login"
                                        className="mt-2 inline-block text-red-700 font-medium hover:underline"
                                    >
                                        → ログインページへ
                                    </a>
                                )}
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
                            {loading ? "処理中..." : "確認メールを送信"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        すでにアカウントをお持ちですか？{" "}
                        <a href="/login" className="text-blue-600 hover:underline font-medium">
                            ログイン
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
