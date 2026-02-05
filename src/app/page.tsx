import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AI翻訳秘書
              </h1>
              <p className="text-sm text-gray-500">
                職場コミュニケーション支援システム
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                無料で始める
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            従業員と経営者の<br className="sm:hidden" />コミュニケーションを変える
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            AIがメッセージのトーンを分析・翻訳。感情的な表現を建設的な対話へ変換し、
            職場の心理的安全性を高めます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              無料で組織を登録
            </Link>
            <Link
              href="/dashboard?demo=true"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              デモを見る
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI感情フィルター</h3>
            <p className="text-sm text-gray-600">
              従業員からの感情的なメッセージを、AIが自動で建設的なトーンに翻訳して経営者へ届けます
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">シンプルなWebチャット</h3>
            <p className="text-sm text-gray-600">
              ブラウザから直接相談可能。アプリ不要で簡単にコミュニケーションできます
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI質問対応</h3>
            <p className="text-sm text-gray-600">
              就業規則や給与規定をアップロード。AIが従業員の質問に自動回答します
            </p>
          </div>
        </div>


        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h3 className="font-semibold text-gray-900 text-xl text-center mb-8">
            ご利用の流れ
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
              <h4 className="font-medium text-gray-900 mb-1">組織を登録</h4>
              <p className="text-sm text-gray-500">メールアドレスで簡単登録</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
              <h4 className="font-medium text-gray-900 mb-1">従業員を招待</h4>
              <p className="text-sm text-gray-500">招待リンクを共有するだけ</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
              <h4 className="font-medium text-gray-900 mb-1">規則をアップロード</h4>
              <p className="text-sm text-gray-500">就業規則などのPDFを登録</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">4</div>
              <h4 className="font-medium text-gray-900 mb-1">AI秘書が稼働</h4>
              <p className="text-sm text-gray-500">相談対応・翻訳を自動化</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-500 text-center">
            AI翻訳秘書 - 職場コミュニケーション支援システム
          </p>
        </div>
      </footer>
    </main>
  );
}
