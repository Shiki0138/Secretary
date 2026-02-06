"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  // Check existing session on mount
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus(`既存セッション検出: ${session.user.email}`);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("システムが正しく設定されていません");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("ログイン処理中...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else if (error.message.includes("Email not confirmed")) {
          setError("メールアドレスが確認されていません。確認メールをご確認ください。Supabaseで確認メールの再送信が必要かもしれません。");
        } else {
          setError(error.message);
        }
        setStatus(null);
        setLoading(false);
        return;
      }

      setStatus(`ログイン成功: ${data.user?.email || "unknown"}`);

      // Verify session was created
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("セッションが作成されませんでした。ブラウザのcookieを許可してください。");
        setLoading(false);
        return;
      }

      // Redirect immediately
      window.location.replace(redirect);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("予期しないエラーが発生しました");
      setStatus(null);
      setLoading(false);
    }
  };


  return (
    <div className="max-w-sm w-full space-y-6 p-8 bg-white border border-neutral-200 rounded-lg">
      <div>
        <h2 className="text-center text-xl font-semibold text-neutral-900">
          ログイン
        </h2>
        <p className="mt-1 text-center text-sm text-neutral-500">
          経営者ダッシュボード
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {status && (
          <div className="bg-neutral-50 border border-neutral-200 text-neutral-600 p-3 rounded text-sm">
            {status}
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
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
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
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>


      <p className="mt-4 text-center text-sm text-gray-500">
        アカウントをお持ちでない場合は{" "}
        <a href="/signup" className="text-neutral-900 hover:underline font-medium">
          新規登録
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-neutral-50">
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
