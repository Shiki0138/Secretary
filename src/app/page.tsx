import { MessageAnalyzer } from "@/components/message-analyzer";

export default function Home() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Coaching Gateway
              </h1>
              <p className="text-sm text-gray-500">
                AI コミュニケーション支援システム
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Demo
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            感情的なメッセージを建設的な対話へ
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AIがメッセージのトーンを分析し、より効果的なコミュニケーションへの
            変換提案を行います。送信前に確認し、職場の心理的安全性を高めましょう。
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">感情分析</h3>
            <p className="text-sm text-gray-600">
              Russell's Circumplex Modelに基づき、メッセージの感情的トーンを科学的に分析
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">NVC変換</h3>
            <p className="text-sm text-gray-600">
              非暴力コミュニケーションに基づいた、建設的な表現への変換提案
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">⚖️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">法的セーフガード</h3>
            <p className="text-sm text-gray-600">
              労働条件交渉など法的リスクのあるトピックを自動検出し、専門家へ誘導
            </p>
          </div>
        </div>

        {/* Analyzer Component */}
        <MessageAnalyzer />

        {/* Example Messages */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            🔬 テスト用サンプルメッセージ
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">高リスク（攻撃的）</div>
              <p className="text-sm text-gray-700">
                なんで何度言ってもできないんだ！やる気がないなら帰れ！
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">中リスク（威圧的）</div>
              <p className="text-sm text-gray-700">
                このミス、本当に信じられない。プロとしてありえない。
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">法的トピック</div>
              <p className="text-sm text-gray-700">
                給与を上げてくれないなら退職したいです。
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">緊急メッセージ</div>
              <p className="text-sm text-gray-700">
                至急バキューム！患者さんが出血してます！
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-500 text-center">
            Coaching Gateway Demo - AI Communication Support System
          </p>
        </div>
      </footer>
    </main>
  );
}
