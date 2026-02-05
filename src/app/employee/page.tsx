import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { KnowledgeQA } from "@/components/knowledge/knowledge-qa";
import { ChatInterface } from "@/components/employee/chat-interface";

/**
 * 従業員ポータル
 * ブラウザからアクセスするシンプルなWebページ
 */

async function getEmployeeInfo(userId: string) {
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

    // Get pending documents
    const { data: docs } = await supabase
        .from("documents")
        .select("id")
        .eq("org_id", org.id)
        .eq("is_active", true);

    const { data: acks } = await supabase
        .from("document_acknowledgments")
        .select("document_id")
        .eq("user_id", userId);

    const acknowledgedIds = new Set(acks?.map((a) => a.document_id) || []);
    const pendingDocs = (docs || []).filter((d) => !acknowledgedIds.has(d.id));

    // Get recent announcements
    const { data: announcements } = await supabase
        .from("announcements")
        .select("id, title, translated_text, published_at")
        .eq("org_id", org.id)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(5);

    return {
        org,
        user,
        pendingDocCount: pendingDocs.length,
        announcements: announcements || [],
    };
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-gray-500">読み込み中...</div>
        </div>
    );
}

export default async function EmployeePortalPage() {
    // Get authenticated user
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
        redirect("/login");
    }

    const info = await getEmployeeInfo(authUser.id);

    if (!info) {
        redirect("/login");
    }

    const { org, user, pendingDocCount, announcements } = info;

    return (
        <div className="min-h-dvh bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <h1 className="text-lg font-bold text-gray-900">{org.name}</h1>
                    <p className="text-sm text-gray-500">従業員ポータル</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Pending Notifications */}
                {pendingDocCount > 0 && (
                    <div
                        className="bg-red-50 border border-red-200 rounded-xl p-4"
                        role="alert"
                        aria-label="未確認の項目があります"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-red-600 font-medium" aria-hidden="true">
                                未確認の項目
                            </span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                {pendingDocCount}件
                            </span>
                        </div>
                        <p className="text-sm text-red-700">
                            規則の確認をお願いします
                        </p>
                    </div>
                )}

                {/* Quick Actions */}
                <nav aria-label="クイックアクション">
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="#chat"
                            className="p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label="経営者へ連絡"
                        >
                            <span className="text-2xl mb-1 block" aria-hidden="true">
                                💬
                            </span>
                            <span className="text-sm font-medium text-blue-700">経営者へ連絡</span>
                        </a>
                        <a
                            href="#question"
                            className="p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label="質問する"
                        >
                            <span className="text-2xl mb-1 block" aria-hidden="true">
                                ?
                            </span>
                            <span className="text-sm font-medium text-gray-900">規則Q&A</span>
                        </a>
                        <a
                            href="#announcements"
                            className="p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label="お知らせを見る"
                        >
                            <span className="text-2xl mb-1 block" aria-hidden="true">
                                📢
                            </span>
                            <span className="text-sm font-medium text-gray-900">お知らせ</span>
                        </a>
                        <a
                            href="#documents"
                            className="p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label="規則を確認"
                        >
                            <span className="text-2xl mb-1 block" aria-hidden="true">
                                📄
                            </span>
                            <span className="text-sm font-medium text-gray-900">規則確認</span>
                        </a>
                    </div>
                </nav>

                {/* Chat with Owner */}
                <section
                    id="chat"
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    aria-labelledby="chat-heading"
                >
                    <div className="p-4 border-b border-gray-200 bg-blue-50">
                        <h2 id="chat-heading" className="font-semibold text-gray-900">
                            💬 経営者へ連絡
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            休暇申請やシフト相談など、経営者に直接連絡できます
                        </p>
                    </div>
                    <ChatInterface userId={authUser.id} orgId={org.id} />
                </section>

                {/* Knowledge Q&A */}
                <section
                    id="question"
                    className="bg-white rounded-xl border border-gray-200 p-4"
                    aria-labelledby="question-heading"
                >
                    <h2 id="question-heading" className="sr-only">規則について質問</h2>
                    <KnowledgeQA isDemo={false} />
                </section>

                {/* Documents Placeholder */}
                <section
                    id="documents"
                    className="bg-white rounded-xl border border-gray-200 p-4"
                    aria-labelledby="documents-heading"
                >
                    <h2 id="documents-heading" className="font-semibold text-gray-900 mb-3">
                        規則確認
                    </h2>
                    <Suspense fallback={<LoadingFallback />}>
                        {pendingDocCount > 0 ? (
                            <div className="text-sm text-red-600">
                                {pendingDocCount}件の未確認規則があります
                            </div>
                        ) : (
                            <div className="text-sm text-green-600">
                                全ての規則を確認済みです
                            </div>
                        )}
                    </Suspense>
                </section>

                {/* Recent Announcements */}
                <section
                    id="announcements"
                    className="bg-white rounded-xl border border-gray-200 p-4"
                    aria-labelledby="announcements-heading"
                >
                    <h2 id="announcements-heading" className="font-semibold text-gray-900 mb-3">
                        最近のお知らせ
                    </h2>
                    {announcements.length === 0 ? (
                        <div className="text-gray-500 text-sm">お知らせはありません</div>
                    ) : (
                        <ul className="space-y-2" role="list">
                            {announcements.map((ann) => (
                                <li
                                    key={ann.id}
                                    className="p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-900 text-sm">
                                            {ann.title}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {ann.published_at
                                                ? new Date(ann.published_at).toLocaleDateString("ja-JP", {
                                                    month: "numeric",
                                                    day: "numeric",
                                                })
                                                : ""}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2">
                                        {ann.translated_text}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
}
