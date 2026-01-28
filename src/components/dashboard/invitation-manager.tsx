"use client";

import { useState, useEffect } from "react";

interface InvitationCode {
    id: string;
    code: string;
    expires_at: string | null;
    used_count: number;
    max_uses: number;
    status: "active" | "used" | "expired";
    created_at: string;
}

interface PendingRegistration {
    id: string;
    line_user_id: string;
    line_display_name: string;
    org_id: string;
    status: string;
    created_at: string;
}

interface Props {
    orgId: string;
    isDemo?: boolean;
}

export function InvitationManager({ orgId, isDemo = false }: Props) {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch data on mount
    useEffect(() => {
        if (isDemo) {
            // Demo data
            setCodes([
                {
                    id: "demo-1",
                    code: "ABC12XYZ",
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    used_count: 0,
                    max_uses: 1,
                    status: "active",
                    created_at: new Date().toISOString(),
                },
            ]);
            setPendingRegs([
                {
                    id: "demo-reg-1",
                    line_user_id: "U123",
                    line_display_name: "山田 太郎",
                    org_id: orgId,
                    status: "pending",
                    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                },
            ]);
            setIsLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const [codesRes, regsRes] = await Promise.all([
                    fetch(`/api/invitations?orgId=${orgId}`),
                    fetch(`/api/registrations?orgId=${orgId}`),
                ]);

                if (codesRes.ok) {
                    const data = await codesRes.json();
                    setCodes(data.codes || []);
                }

                if (regsRes.ok) {
                    const data = await regsRes.json();
                    setPendingRegs(data.registrations || []);
                }
            } catch (e) {
                console.error("Failed to fetch data:", e);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [orgId, isDemo]);

    const generateCode = async () => {
        if (isDemo) {
            const newCode: InvitationCode = {
                id: `demo-${Date.now()}`,
                code: Math.random().toString(36).substring(2, 10).toUpperCase(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                used_count: 0,
                max_uses: 1,
                status: "active",
                created_at: new Date().toISOString(),
            };
            setCodes([newCode, ...codes]);
            setSuccess("招待コードを発行しました（デモ）");
            setTimeout(() => setSuccess(null), 3000);
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const res = await fetch("/api/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId }),
            });

            if (!res.ok) throw new Error("Failed to generate code");

            const data = await res.json();
            setCodes([
                {
                    id: data.id,
                    code: data.code,
                    expires_at: data.expiresAt,
                    used_count: 0,
                    max_uses: 1,
                    status: "active",
                    created_at: new Date().toISOString(),
                },
                ...codes,
            ]);
            setSuccess("招待コードを発行しました");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError("コードの発行に失敗しました");
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApproval = async (regId: string, action: "approve" | "reject") => {
        if (isDemo) {
            setPendingRegs(pendingRegs.filter((r) => r.id !== regId));
            setSuccess(action === "approve" ? "従業員を承認しました（デモ）" : "登録を拒否しました（デモ）");
            setTimeout(() => setSuccess(null), 3000);
            return;
        }

        try {
            const res = await fetch("/api/registrations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registrationId: regId, action }),
            });

            if (!res.ok) throw new Error("Failed to process registration");

            setPendingRegs(pendingRegs.filter((r) => r.id !== regId));
            setSuccess(action === "approve" ? "従業員を承認しました" : "登録を拒否しました");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError("処理に失敗しました");
            console.error(e);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString("ja-JP", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {/* Pending Registrations */}
            {pendingRegs.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <span className="size-2 bg-amber-500 rounded-full animate-pulse"></span>
                        承認待ちの従業員 ({pendingRegs.length})
                    </h3>
                    <div className="space-y-3">
                        {pendingRegs.map((reg) => (
                            <div
                                key={reg.id}
                                className="bg-white border border-amber-200 rounded-lg p-4 flex items-center justify-between"
                            >
                                <div>
                                    <div className="font-medium text-gray-900">{reg.line_display_name}</div>
                                    <div className="text-sm text-gray-500">
                                        申請日時: {formatDate(reg.created_at)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproval(reg.id, "approve")}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        承認
                                    </button>
                                    <button
                                        onClick={() => handleApproval(reg.id, "reject")}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                    >
                                        拒否
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invitation Codes */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">招待コード</h3>
                    <button
                        onClick={generateCode}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? "発行中..." : "新しいコードを発行"}
                    </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    招待コードを従業員に共有してください。従業員がLINEで入力すると、承認リクエストが届きます。
                </p>

                {codes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        招待コードがありません。新しいコードを発行してください。
                    </div>
                ) : (
                    <div className="space-y-2">
                        {codes.map((code) => (
                            <div
                                key={code.id}
                                className={`border rounded-lg p-4 flex items-center justify-between ${code.status === "active"
                                        ? "border-green-200 bg-green-50"
                                        : "border-gray-200 bg-gray-50"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <code className="text-lg font-mono font-bold tracking-wider">
                                        {code.code}
                                    </code>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium ${code.status === "active"
                                                ? "bg-green-100 text-green-700"
                                                : code.status === "used"
                                                    ? "bg-gray-100 text-gray-600"
                                                    : "bg-red-100 text-red-600"
                                            }`}
                                    >
                                        {code.status === "active"
                                            ? "有効"
                                            : code.status === "used"
                                                ? "使用済み"
                                                : "期限切れ"}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {code.expires_at && (
                                        <span>期限: {formatDate(code.expires_at)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
