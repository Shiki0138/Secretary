"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Announcement {
    id: string;
    title: string;
    content: string;
    readCount: number;
    totalCount: number;
    publishedAt: string | null;
}

export function AnnouncementComposer() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [translatedContent, setTranslatedContent] = useState("");
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [step, setStep] = useState<"compose" | "preview">("compose");
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/announcements");
                const data = await res.json();
                if (data.success) {
                    setAnnouncements(data.data.announcements);
                }
            } catch (err) {
                console.error("Failed to fetch announcements:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    const handleTranslate = async () => {
        if (!content.trim()) return;
        setIsTranslating(true);

        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: content,
                    direction: "owner_to_employee",
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTranslatedContent(data.data.translatedText);
                setStep("preview");
            }
        } catch (error) {
            console.error("Translation error:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !translatedContent.trim()) return;
        setIsSending(true);

        try {
            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // These will be populated from auth context in real implementation
                    orgId: "placeholder-org-id",
                    senderId: "placeholder-sender-id",
                    title,
                    originalText: content,
                    translatedText: translatedContent,
                }),
            });

            const data = await res.json();
            if (data.success) {
                // Reset form
                setTitle("");
                setContent("");
                setTranslatedContent("");
                setStep("compose");

                // Refresh announcements
                const refreshRes = await fetch("/api/announcements");
                const refreshData = await refreshRes.json();
                if (refreshData.success) {
                    setAnnouncements(refreshData.data.announcements);
                }
            }
        } catch (error) {
            console.error("Send error:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {step === "compose" ? (
                <>
                    <div>
                        <label
                            htmlFor="announcement-title"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            タイトル
                        </label>
                        <input
                            id="announcement-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="お知らせのタイトル"
                            aria-required="true"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="announcement-content"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            内容
                        </label>
                        <textarea
                            id="announcement-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={6}
                            className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="お知らせの内容を入力..."
                            aria-required="true"
                        />
                    </div>
                    <button
                        onClick={handleTranslate}
                        disabled={isTranslating || !title.trim() || !content.trim()}
                        className={cn(
                            "w-full py-3 rounded-xl font-medium transition-colors",
                            isTranslating || !title.trim() || !content.trim()
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                        type="button"
                        aria-label="わかりやすく整形して確認"
                    >
                        {isTranslating ? "整形中..." : "わかりやすく整形して確認"}
                    </button>
                </>
            ) : (
                <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">{title}</h3>
                        <p className="text-blue-800 whitespace-pre-wrap">{translatedContent}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep("compose")}
                            className="flex-1 py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            type="button"
                            aria-label="編集に戻る"
                        >
                            編集に戻る
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending}
                            className={cn(
                                "flex-1 py-3 rounded-xl font-medium transition-colors",
                                isSending
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            )}
                            type="button"
                            aria-label="全員に送信"
                        >
                            {isSending ? "送信中..." : "全員に送信"}
                        </button>
                    </div>
                </>
            )}

            {/* Past Announcements */}
            <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">過去のお知らせ</h3>
                {isLoading ? (
                    <div className="animate-pulse text-gray-500 text-sm">読み込み中...</div>
                ) : announcements.length === 0 ? (
                    <div className="text-gray-500 text-sm">お知らせはまだありません</div>
                ) : (
                    <div className="space-y-3" role="list" aria-label="過去のお知らせ一覧">
                        {announcements.map((ann) => (
                            <div
                                key={ann.id}
                                className="bg-gray-50 rounded-xl p-4"
                                role="listitem"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">{ann.title}</span>
                                    <span
                                        className="text-sm text-gray-500"
                                        aria-label={`既読 ${ann.readCount}人 全${ann.totalCount}人中`}
                                    >
                                        既読 {ann.readCount}/{ann.totalCount}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{ann.content}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {ann.publishedAt
                                        ? new Date(ann.publishedAt).toLocaleString("ja-JP")
                                        : "未公開"}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
