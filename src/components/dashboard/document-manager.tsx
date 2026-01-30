"use client";

import { useState } from "react";

/**
 * Document Manager Component
 * 
 * Allows owners to upload and manage knowledge base documents
 */

interface Document {
    id: string;
    title: string;
    doc_type: string;
    created_at: string;
}

const DOC_TYPES = [
    { value: "employment_rules", label: "就業規則" },
    { value: "salary_rules", label: "給与規定" },
    { value: "leave_policy", label: "休暇規定" },
    { value: "other", label: "その他" },
];

export function DocumentManager({ isDemo = false }: { isDemo?: boolean }) {
    const [documents, setDocuments] = useState<Document[]>(
        isDemo ? DEMO_DOCUMENTS : []
    );
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState("");
    const [docType, setDocType] = useState("employment_rules");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isDemo) {
            // Demo mode: just add to local state
            const newDoc: Document = {
                id: `demo-${Date.now()}`,
                title,
                doc_type: docType,
                created_at: new Date().toISOString(),
            };
            setDocuments([newDoc, ...documents]);
            setIsAdding(false);
            setTitle("");
            setContent("");
            setSuccess("ドキュメントを登録しました");
            setTimeout(() => setSuccess(null), 3000);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, docType, content }),
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(data.message);
                setIsAdding(false);
                setTitle("");
                setContent("");
                // Refresh document list
                loadDocuments();
            } else {
                setError(data.error);
            }
        } catch {
            setError("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const loadDocuments = async () => {
        if (isDemo) return;
        try {
            const res = await fetch("/api/documents");
            const data = await res.json();
            if (data.success) {
                setDocuments(data.data.documents);
            }
        } catch {
            console.error("Failed to load documents");
        }
    };

    const handleDelete = async (id: string) => {
        if (isDemo) {
            setDocuments(documents.filter((d) => d.id !== id));
            return;
        }

        try {
            const res = await fetch(`/api/documents?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setDocuments(documents.filter((d) => d.id !== id));
            }
        } catch {
            setError("削除に失敗しました");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">📚 ナレッジベース</h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                        + 追加
                    </button>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {success}
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            タイトル
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="例：就業規則 2026年版"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            種類
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            {DOC_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            内容（本文）
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="規則の本文をここに貼り付けてください..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                            rows={8}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            ※ AIが質問に回答する際、この内容を参照します
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? "登録中..." : "登録する"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsAdding(false);
                                setTitle("");
                                setContent("");
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                            キャンセル
                        </button>
                    </div>
                </form>
            )}

            {/* Document List */}
            <div className="space-y-2">
                {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        <p>まだドキュメントがありません</p>
                        <p className="text-xs mt-1">「+ 追加」から就業規則などを登録してください</p>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
                        >
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                                <p className="text-xs text-gray-500">
                                    {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}
                                    {" • "}
                                    {new Date(doc.created_at).toLocaleDateString("ja-JP")}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                            >
                                削除
                            </button>
                        </div>
                    ))
                )}
            </div>

            {isDemo && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                        💡 従業員がLINEで「有給の申請方法は？」などと質問すると、
                        登録したドキュメントを参照してAIが回答します。
                    </p>
                </div>
            )}
        </div>
    );
}

// Demo data
const DEMO_DOCUMENTS: Document[] = [
    {
        id: "demo-1",
        title: "就業規則 2026年版",
        doc_type: "employment_rules",
        created_at: "2026-01-15T00:00:00Z",
    },
    {
        id: "demo-2",
        title: "給与規定",
        doc_type: "salary_rules",
        created_at: "2026-01-10T00:00:00Z",
    },
    {
        id: "demo-3",
        title: "有給休暇・特別休暇規定",
        doc_type: "leave_policy",
        created_at: "2026-01-05T00:00:00Z",
    },
];
