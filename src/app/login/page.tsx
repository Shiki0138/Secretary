"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("システムが正しく設定されていません");
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo("ログイン処理中...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        setDebugInfo(`エラー: ${error.message}`);
        // Translate common error messages
        if (error.message.includes("Invalid login credentials")) {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else if (error.message.includes("Email not confirmed")) {
          setError("メールアドレスが確認されていません。確認メールをご確認ください");
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else {
        console.log("Login success:", data);
        setDebugInfo(`ログイン成功！セッション確立中...`);

        // Wait for session to be established in cookies
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh session to ensure cookies are set
        await supabase.auth.refreshSession();

        setDebugInfo(`リダイレクト中: ${redirect}`);
        // Use window.location for more reliable redirect
        window.location.href = redirect;
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("予期しないエラーが発生しました");
      setDebugInfo(`例外: ${err}`);
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const redirectUrl = redirect.includes("?") ? `${redirect}&demo=true` : `${redirect}?demo=true`;
    window.location.href = redirectUrl;
  };

  return (
    <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          AI翻訳秘書
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          経営者ダッシュボードにログイン
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {debugInfo && (
          <div className="bg-blue-50 border border-blue-200 text-blue-600 p-4 rounded-lg text-sm">
            {debugInfo}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <div className="mt-4">
        <button
          onClick={handleDemoLogin}
          className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          デモモードで開く（開発用）
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        アカウントをお持ちでない場合は{" "}
        <a href="/signup" className="text-blue-600 hover:underline font-medium">
          新規登録
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50">
      <Suspense fallback={
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
