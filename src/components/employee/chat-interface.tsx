"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
    id: string;
    direction: "employee_to_owner" | "owner_to_employee";
    originalText: string | null;
    translatedText: string;
    createdAt: string;
    isConfirmed: boolean;
}

interface ChatInterfaceProps {
    userId: string;
    orgId: string;
}

export function ChatInterface({ userId, orgId }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [formattedMessage, setFormattedMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load messages on mount
    useEffect(() => {
        loadMessages();
        // Poll for new messages every 5 seconds
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadMessages = async () => {
        try {
            const res = await fetch(`/api/employee/messages?orgId=${orgId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMessages(data.data.messages || []);
                }
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;

        const text = input.trim();
        setIsSending(true);

        try {
            // Step 1: Format the message with AI
            const formatRes = await fetch("/api/employee/format-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            });

            if (!formatRes.ok) {
                throw new Error("Failed to format message");
            }

            const formatData = await formatRes.json();
            setPendingMessage(text);
            setFormattedMessage(formatData.formattedMessage);
            setInput("");
        } catch (error) {
            console.error("Format error:", error);
            alert("メッセージの整理に失敗しました");
        } finally {
            setIsSending(false);
        }
    };

    const handleConfirmSend = async () => {
        if (!formattedMessage) return;
        setIsSending(true);

        try {
            const res = await fetch("/api/employee/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    message: formattedMessage,
                    originalMessage: pendingMessage,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to send message");
            }

            setPendingMessage(null);
            setFormattedMessage(null);
            loadMessages();
        } catch (error) {
            console.error("Send error:", error);
            alert("送信に失敗しました");
        } finally {
            setIsSending(false);
        }
    };

    const handleCancelSend = () => {
        setPendingMessage(null);
        setFormattedMessage(null);
        setInput(pendingMessage || "");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                読み込み中...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[400px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-t-xl">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                        経営者への連絡履歴はありません
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.direction === "employee_to_owner" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.direction === "employee_to_owner"
                                        ? "bg-blue-500 text-white rounded-br-md"
                                        : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">
                                    {msg.translatedText}
                                </p>
                                <p
                                    className={`text-xs mt-1 ${msg.direction === "employee_to_owner"
                                            ? "text-blue-100"
                                            : "text-gray-400"
                                        }`}
                                >
                                    {new Date(msg.createdAt).toLocaleString("ja-JP", {
                                        month: "numeric",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Confirmation Dialog */}
            {formattedMessage && (
                <div className="p-4 bg-blue-50 border-t border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">
                        📝 以下の内容を経営者に送信します：
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-blue-200 mb-3">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {formattedMessage}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleConfirmSend}
                            disabled={isSending}
                            className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSending ? "送信中..." : "送信する"}
                        </button>
                        <button
                            onClick={handleCancelSend}
                            disabled={isSending}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            {/* Input */}
            {!formattedMessage && (
                <form
                    onSubmit={handleSubmit}
                    className="p-3 bg-white border-t border-gray-200 rounded-b-xl"
                >
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="経営者へのメッセージを入力..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isSending}
                            className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? "..." : "送信"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
