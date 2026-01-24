"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Document {
    id: string;
    title: string;
    type: string;
    updatedAt: string;
    requiresAck: boolean;
    isAcknowledged: boolean;
    acknowledgedAt?: string;
}

const mockDocuments: Document[] = [
    {
        id: "1",
        title: "就業規則（2026年1月改定版）",
        type: "employment_rules",
        updatedAt: "2026-01-15",
        requiresAck: true,
        isAcknowledged: false,
    },
    {
        id: "2",
        title: "給与規程",
        type: "salary_rules",
        updatedAt: "2025-04-01",
        requiresAck: true,
        isAcknowledged: true,
        acknowledgedAt: "2025-04-05",
    },
    {
        id: "3",
        title: "感染症対策マニュアル",
        type: "other",
        updatedAt: "2025-12-01",
        requiresAck: true,
        isAcknowledged: true,
        acknowledgedAt: "2025-12-03",
    },
];

export function DocumentAcknowledgment() {
    const [documents] = useState<Document[]>(mockDocuments);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const pendingCount = documents.filter(d => d.requiresAck && !d.isAcknowledged).length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">規則・マニュアル</h3>
                {pendingCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        {pendingCount}件の確認待ち
                    </span>
                )}
            </div>

            {/* Document List */}
            <div className="space-y-2">
                {documents.map((doc) => (
                    <button
                        key={doc.id}
                        onClick={() => {
                            setSelectedDoc(doc);
                            if (!doc.isAcknowledged) {
                                setShowConfirmModal(true);
                            }
                        }}
                        className={cn(
                            "w-full p-4 rounded-xl border text-left transition-all",
                            doc.requiresAck && !doc.isAcknowledged
                                ? "bg-red-50 border-red-200 hover:bg-red-100"
                                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">{doc.title}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    更新日: {doc.updatedAt}
                                </div>
                            </div>
                            {doc.requiresAck && (
                                doc.isAcknowledged ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        ✓ 確認済
                                    </span>
                                ) : (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                        要確認
                                    </span>
                                )
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedDoc && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            内容の確認
                        </h3>
                        <p className="text-gray-600 mb-4">
                            「{selectedDoc.title}」の内容を確認してください。
                        </p>

                        {/* Document preview area */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-4 h-48 overflow-y-auto text-sm text-gray-700">
                            <p className="mb-2">【重要な変更点】</p>
                            <p>・第15条（有給休暇）の申請期限を5日前から3日前に変更</p>
                            <p>・第22条（服装規定）に新しい項目を追加</p>
                            <p className="mt-4 text-xs text-gray-500">
                                全文は添付PDFをご確認ください。
                            </p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                ⚠️ 「確認しました」を押すと、内容を確認したことが記録されます。
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            >
                                後で確認
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: API call to acknowledge
                                    setShowConfirmModal(false);
                                }}
                                className="flex-1 py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                確認しました
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
