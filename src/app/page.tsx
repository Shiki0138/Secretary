import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 sticky top-0 z-10 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">
                職場コミュニケーション支援
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 px-4 py-2 rounded-md"
              >
                登録
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-20">
          <h2 className="text-3xl font-semibold text-neutral-900 mb-6 tracking-tight">
            従業員と経営者の<br />
            コミュニケーションを円滑に
          </h2>
          <p className="text-lg text-neutral-600 max-w-xl mb-8 leading-relaxed">
            感情的になりがちな相談も、伝わりやすい言葉に整理。
            お互いの意図が正しく伝わる対話を実現します。
          </p>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
            >
              無料で始める
            </Link>
            <Link
              href="/dashboard?demo=true"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-300 hover:border-neutral-400 rounded-md"
            >
              デモを見る
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-neutral-200 pt-16">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-8">
            機能
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">メッセージ整理</h4>
              <p className="text-sm text-neutral-600 leading-relaxed">
                感情的な表現を、ビジネスに適した言葉に自動で整理します
              </p>
            </div>
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">Webチャット</h4>
              <p className="text-sm text-neutral-600 leading-relaxed">
                ブラウザから直接相談できます。アプリのインストールは不要です
              </p>
            </div>
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">質問対応</h4>
              <p className="text-sm text-neutral-600 leading-relaxed">
                就業規則や社内ルールについて、すぐに回答を得られます
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="border-t border-neutral-200 pt-16 mt-16">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-8">
            ご利用の流れ
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm font-medium text-neutral-400 mb-2">01</div>
              <div className="font-medium text-neutral-900 mb-1">組織を登録</div>
              <p className="text-sm text-neutral-600">メールアドレスで簡単登録</p>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-400 mb-2">02</div>
              <div className="font-medium text-neutral-900 mb-1">従業員を招待</div>
              <p className="text-sm text-neutral-600">招待リンクを共有するだけ</p>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-400 mb-2">03</div>
              <div className="font-medium text-neutral-900 mb-1">規則を登録</div>
              <p className="text-sm text-neutral-600">就業規則などをアップロード</p>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-400 mb-2">04</div>
              <div className="font-medium text-neutral-900 mb-1">運用開始</div>
              <p className="text-sm text-neutral-600">相談対応を自動化</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200 mt-20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-xs text-neutral-400">
            職場コミュニケーション支援システム
          </p>
        </div>
      </footer>
    </main>
  );
}
