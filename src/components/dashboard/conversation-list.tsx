"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Conversation {
    id: string;
    employeeId: string;
    employeeName: string;
    subject: string | null;
    lastMessage: string;
    status: "open" | "pending" | "resolved" | "closed";
    createdAt: string;
    updatedAt: string;
}

interface Message {
    id: string;
    senderId: string;
    direction: "employee_to_owner" | "owner_to_employee" | "system";
    originalText: string | null;
    translatedText: string;
    isConfirmed: boolean;
    isRead: boolean;
    createdAt: string;
}

export function ConversationList() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch("/api/conversations");
            const data = await res.json();

            if (data.success) {
                setConversations(data.data.conversations);
            } else {
                setError(data.error || "Failed to load conversations");
            }
        } catch (err) {
            console.error("Failed to fetch conversations:", err);
            setError("ネットワークエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const getStatusBadge = (status: Conversation["status"]) => {
        const styles = {
            open: "bg-red-100 text-red-700",
            pending: "bg-yellow-100 text-yellow-700",
            resolved: "bg-green-100 text-green-700",
            closed: "bg-gray-100 text-gray-700",
        };
        const labels = {
            open: "要対応",
            pending: "確認中",
            resolved: "完了",
            closed: "終了",
        };
        return (
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", styles[status])}>
                {labels[status]}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-gray-500">
                <div className="animate-pulse">読み込み中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <p className="text-red-600 mb-2">{error}</p>
                <button
                    onClick={fetchConversations}
                    className="text-sm text-blue-600 hover:underline"
                    type="button"
                >
                    再読み込み
                </button>
            </div>
        );
    }

    const openCount = conversations.filter((c) => c.status === "open").length;

    return (
        <div className="flex h-full">
            {/* Conversation List */}
            <div className="w-80 border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">相談一覧</h2>
                    <p className="text-sm text-gray-500">
                        {openCount}件の対応待ち
                    </p>
                </div>
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        相談はまだありません
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                className={cn(
                                    "w-full p-4 text-left hover:bg-gray-50 transition-colors",
                                    selectedId === conv.id && "bg-blue-50"
                                )}
                                type="button"
                                aria-label={`${conv.employeeName}さんの相談を選択`}
                                aria-pressed={selectedId === conv.id}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">{conv.employeeName}</span>
                                    {getStatusBadge(conv.status)}
                                </div>
                                <p className="text-sm text-gray-700 mb-1 truncate">
                                    {conv.subject || "件名なし"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(conv.createdAt).toLocaleString("ja-JP")}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Conversation Detail */}
            <div className="flex-1 overflow-y-auto">
                {selectedId ? (
                    <ConversationDetail
                        conversation={conversations.find((c) => c.id === selectedId)}
                        onStatusChange={fetchConversations}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        左のリストから相談を選択してください
                    </div>
                )}
            </div>
        </div>
    );
}

interface ConversationDetailProps {
    conversation: Conversation | undefined;
    onStatusChange: () => void;
}

function ConversationDetail({ conversation, onStatusChange }: ConversationDetailProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [response, setResponse] = useState("");
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);

    useEffect(() => {
        if (!conversation) return;

        const fetchMessages = async () => {
            setIsLoadingMessages(true);
            try {
                const res = await fetch(`/api/conversations?conversationId=${conversation.id}`);
                const data = await res.json();
                if (data.success) {
                    setMessages(data.data.messages);
                }
            } catch (err) {
                console.error("Failed to fetch messages:", err);
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [conversation]);

    if (!conversation) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                相談が見つかりません
            </div>
        );
    }

    const handleTranslate = async () => {
        if (!response.trim()) return;
        setIsTranslating(true);

        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: response,
                    direction: "owner_to_employee",
                }),
            });
            const data = await res.json();
            if (data.success) {
                setResponse(data.data.translatedText);
            }
        } catch (error) {
            console.error("Translation error:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSend = async () => {
        if (!response.trim() || !conversation) return;
        setIsSending(true);

        try {
            // Send message via LINE
            const sendRes = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    message: response,
                    employeeId: conversation.employeeId,
                }),
            });

            const sendData = await sendRes.json();
            if (!sendData.success) {
                alert(sendData.error || "送信に失敗しました");
                return;
            }

            // Update status to resolved
            await fetch("/api/conversations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    status: "resolved",
                }),
            });

            setResponse("");
            onStatusChange();
            alert("返信を送信しました");
        } catch (error) {
            console.error("Send error:", error);
            alert("送信に失敗しました");
        } finally {
            setIsSending(false);
        }
    };

    const lastEmployeeMessage = messages.find((m) => m.direction === "employee_to_owner");

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">
                    {conversation.subject || "件名なし"}
                </h2>
                <p className="text-sm text-gray-500">
                    {conversation.employeeName}さんからの相談
                </p>
            </div>

            {/* Messages */}
            {isLoadingMessages ? (
                <div className="animate-pulse text-gray-500">メッセージを読み込み中...</div>
            ) : (
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "rounded-xl p-4",
                                msg.direction === "employee_to_owner"
                                    ? "bg-gray-50"
                                    : msg.direction === "owner_to_employee"
                                        ? "bg-blue-50"
                                        : "bg-yellow-50"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {msg.direction === "employee_to_owner"
                                        ? "従業員からのメッセージ"
                                        : msg.direction === "owner_to_employee"
                                            ? "あなたの返信"
                                            : "システム"}
                                </span>
                                {msg.direction === "employee_to_owner" && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        翻訳済み
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-900">{msg.translatedText}</p>
                            <p className="text-xs text-gray-400 mt-2">
                                {new Date(msg.createdAt).toLocaleString("ja-JP")}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Response Input */}
            {conversation.status !== "resolved" && conversation.status !== "closed" && (
                <div>
                    <label
                        htmlFor="response-input"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        返信を作成
                    </label>
                    <textarea
                        id="response-input"
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={4}
                        className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="返信内容を入力..."
                        aria-label="返信内容"
                    />
                    <div className="flex gap-3 mt-3">
                        <button
                            onClick={handleTranslate}
                            disabled={isTranslating || !response.trim()}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                isTranslating || !response.trim()
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            )}
                            type="button"
                            aria-label="わかりやすく整形"
                        >
                            {isTranslating ? "翻訳中..." : "わかりやすく整形"}
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || !response.trim()}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                isSending || !response.trim()
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            )}
                            type="button"
                            aria-label="この内容で送信"
                        >
                            {isSending ? "送信中..." : "この内容で送信"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
