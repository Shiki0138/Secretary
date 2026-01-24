import { Suspense } from "react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { AnnouncementComposer } from "@/components/dashboard/announcement-composer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

// Demo data for unauthenticated demo mode
const DEMO_ORG = {
    org: { id: "demo", name: "デモ歯科医院", slug: "demo-clinic" },
    stats: { openCount: 2, weeklyCount: 8 },
    isDemo: true,
};

async function getOrgInfo(userId: string) {
    const supabase = getSupabaseAdmin();

    const { data: user, error: userError } = await supabase
        .from("users")
        .select("org_id, display_name, role")
        .eq("id", userId)
        .single();

    if (userError || !user) return null;

    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", user.org_id)
        .single();

    if (orgError || !org) return null;

    const { count: openCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("status", "open");

    const { count: weeklyCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return {
        org,
        user,
        stats: { openCount: openCount || 0, weeklyCount: weeklyCount || 0 },
        isDemo: false,
    };
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-gray-500">読み込み中...</div>
        </div>
    );
}

interface PageProps {
    searchParams: Promise<{ demo?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const isDemo = params.demo === "true";

    if (isDemo) {
        const { org, stats } = DEMO_ORG;
        return <DashboardUI org={org} stats={stats} isDemo={true} />;
    }

    const authUser = await getAuthenticatedUser();
    if (!authUser) redirect("/login");

    const orgInfo = await getOrgInfo(authUser.id);
    if (!orgInfo) redirect("/login");

    return <DashboardUI org={orgInfo.org} stats={orgInfo.stats} isDemo={false} />;
}

function DashboardUI({ org, stats, isDemo }: {
    org: { name: string };
    stats: { openCount: number; weeklyCount: number };
    isDemo: boolean;
}) {
    return (
        <div className="min-h-dvh bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                                AI秘書 ダッシュボード
                                {isDemo && <span className="ml-2 text-sm font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded">(デモ)</span>}
                            </h1>
                            <p className="text-sm text-gray-500">{org.name}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {stats.openCount > 0 && (
                                <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                                    {stats.openCount}件の対応待ち
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <StatCard label="今週の相談" value={stats.weeklyCount} />
                    <StatCard label="対応待ち" value={stats.openCount} isAlert />
                    <StatCard label="お知らせ既読率" value="92%" />
                    <StatCard label="規則確認済み" value="5/6" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <Suspense fallback={<LoadingFallback />}>
                            {isDemo ? <DemoConversations /> : <ConversationList />}
                        </Suspense>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">📢 全社通知</h2>
                        <Suspense fallback={<LoadingFallback />}>
                            {isDemo ? <DemoAnnouncements /> : <AnnouncementComposer />}
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, isAlert }: { label: string; value: string | number; isAlert?: boolean }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">{label}</div>
            <div className={`text-xl sm:text-2xl font-bold ${isAlert ? "text-red-600" : "text-gray-900"}`}>
                {value}
            </div>
        </div>
    );
}

function DemoConversations() {
    const conversations = [
        {
            id: 1,
            employee: "田中 太郎",
            status: "open",
            time: "10分前",
            messages: [
                {
                    from: "employee",
                    original: "来週の月曜日、子供の学校行事があるのでシフト変更をお願いしたいんですけど...",
                    translated: "来週月曜日にシフト変更を希望します（理由：子供の学校行事のため）",
                    time: "10分前"
                },
            ]
        },
        {
            id: 2,
            employee: "佐藤 花子",
            status: "open",
            time: "1時間前",
            messages: [
                {
                    from: "employee",
                    original: "有給休暇って何日残ってますか？確認方法がわからなくて...",
                    translated: "有給休暇の残日数の確認方法についてお問い合わせ",
                    time: "1時間前"
                },
            ]
        },
        {
            id: 3,
            employee: "鈴木 一郎",
            status: "resolved",
            time: "昨日",
            messages: [
                {
                    from: "employee",
                    original: "給与明細のダウンロード方法を教えてください",
                    translated: "給与明細のダウンロード方法についてのお問い合わせ",
                    time: "昨日 14:30"
                },
                {
                    from: "owner",
                    original: "従業員ポータルの「給与明細」タブからダウンロードできます。",
                    translated: "従業員ポータルから給与明細をダウンロードする手順をご案内しました。",
                    time: "昨日 15:00"
                },
            ]
        },
    ];

    return (
        <div className="divide-y divide-gray-100">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">💬 従業員からの相談</h3>
                <p className="text-xs text-gray-500 mt-1">LINEで受信したメッセージがAI翻訳されて表示されます</p>
            </div>

            {conversations.map((conv) => (
                <div key={conv.id} className="p-4 hover:bg-gray-50">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                                {conv.employee.slice(0, 1)}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{conv.employee}</p>
                                <p className="text-xs text-gray-500">{conv.time}</p>
                            </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${conv.status === "open" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                            }`}>
                            {conv.status === "open" ? "対応待ち" : "完了"}
                        </span>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3 ml-12">
                        {conv.messages.map((msg, i) => (
                            <div key={i} className={`p-3 rounded-lg ${msg.from === "employee" ? "bg-blue-50 border-l-4 border-blue-400" : "bg-green-50 border-l-4 border-green-400"
                                }`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-medium text-gray-600">
                                        {msg.from === "employee" ? "📱 従業員 (LINE)" : "👤 経営者 (ダッシュボード)"}
                                    </span>
                                    <span className="text-xs text-gray-400">{msg.time}</span>
                                </div>

                                {/* Original message */}
                                <p className="text-sm text-gray-700 mb-2">
                                    <span className="text-xs text-gray-400 block mb-1">原文:</span>
                                    {msg.original}
                                </p>

                                {/* AI Translation */}
                                <div className="bg-white/50 p-2 rounded border border-gray-200">
                                    <span className="text-xs text-purple-600 font-medium">✨ AI翻訳:</span>
                                    <p className="text-sm text-gray-800 mt-1">{msg.translated}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reply Box (for open conversations) */}
                    {conv.status === "open" && (
                        <div className="mt-3 ml-12 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">💡 返信はAI翻訳されて従業員のLINEに送信されます</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="返信を入力..."
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                    defaultValue=""
                                />
                                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                    送信
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function DemoAnnouncements() {
    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                    📱 全社通知はAI翻訳されて全従業員のLINEに一斉送信されます
                </p>
            </div>

            <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="お知らせを入力...&#10;&#10;例: 来週月曜日は臨時休診となります。"
                rows={4}
            />

            <div className="flex gap-2">
                <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    📤 全員に送信
                </button>
            </div>

            <hr className="my-4" />

            <h4 className="text-sm font-medium text-gray-700">送信履歴</h4>
            <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-700">年末年始の休診日のお知らせ</p>
                        <span className="text-xs text-gray-400">1/20</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">✓ 6人中6人が既読</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-700">健康診断の日程について</p>
                        <span className="text-xs text-gray-400">1/15</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">✓ 6人中5人が既読</p>
                </div>
            </div>
        </div>
    );
}
