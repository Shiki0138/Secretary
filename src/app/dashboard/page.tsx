import { Suspense } from "react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { AnnouncementComposer } from "@/components/dashboard/announcement-composer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

async function getOrgInfo(userId: string) {
    const supabase = getSupabaseAdmin();

    // Get user's org
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("org_id, display_name, role")
        .eq("id", userId)
        .single();

    if (userError || !user) {
        return null;
    }

    // Get org details
    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", user.org_id)
        .single();

    if (orgError || !org) {
        return null;
    }

    // Get stats
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
        stats: {
            openCount: openCount || 0,
            weeklyCount: weeklyCount || 0,
        },
    };
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-gray-500">読み込み中...</div>
        </div>
    );
}

export default async function DashboardPage() {
    // Get authenticated user
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
        redirect("/login");
    }

    const orgInfo = await getOrgInfo(authUser.id);

    if (!orgInfo) {
        redirect("/login");
    }

    const { org, stats } = orgInfo;

    return (
        <div className="min-h-dvh bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                                AI秘書 ダッシュボード
                            </h1>
                            <p className="text-sm text-gray-500">{org.name}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {stats.openCount > 0 && (
                                <span
                                    className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium"
                                    role="status"
                                    aria-label={`${stats.openCount}件の対応待ち`}
                                >
                                    {stats.openCount}件の対応待ち
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                {/* Stats - Responsive grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">今週の質問</div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">
                            {stats.weeklyCount}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">対応待ち</div>
                        <div className="text-xl sm:text-2xl font-bold text-red-600">
                            {stats.openCount}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">お知らせ既読率</div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">-</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">規則確認</div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">-</div>
                    </div>
                </div>

                {/* Two Column Layout - Stack on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Conversations */}
                    <div
                        className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden"
                        style={{ minHeight: "400px", maxHeight: "70vh" }}
                    >
                        <Suspense fallback={<LoadingFallback />}>
                            <ConversationList />
                        </Suspense>
                    </div>

                    {/* Announcements */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">
                            <span role="img" aria-label="お知らせ">
                                全社通知
                            </span>
                        </h2>
                        <Suspense fallback={<LoadingFallback />}>
                            <AnnouncementComposer />
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
}
