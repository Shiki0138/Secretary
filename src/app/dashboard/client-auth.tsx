"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const DEMO_ORG = {
    org: { id: "demo", name: "ログイン確認中...", slug: "loading" },
    stats: { openCount: 0, weeklyCount: 0 },
};

export function ClientAuthDashboard() {
    const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
    const [orgName, setOrgName] = useState("読み込み中...");

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = getSupabaseClient();
            if (!supabase) {
                setStatus("unauthenticated");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                // Not authenticated - redirect to login
                setStatus("unauthenticated");
                window.location.href = "/login?redirect=/dashboard";
                return;
            }

            // Check if user has an organization
            try {
                const response = await fetch("/api/organizations");
                if (response.ok) {
                    const data = await response.json();
                    if (data.organization) {
                        setOrgName(data.organization.name);
                        setStatus("authenticated");
                        // Reload to get server-side rendered dashboard
                        window.location.reload();
                    } else {
                        // No organization - redirect to onboarding
                        window.location.href = "/onboarding";
                    }
                } else if (response.status === 401) {
                    window.location.href = "/login?redirect=/dashboard";
                } else {
                    // No organization found - redirect to onboarding
                    window.location.href = "/onboarding";
                }
            } catch {
                setOrgName("エラー");
            }
        };

        checkAuth();
    }, []);

    if (status === "loading") {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-pulse text-gray-500 mb-2">認証確認中...</div>
                    <p className="text-sm text-gray-400">しばらくお待ちください</p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-gray-500 mb-2">ログインが必要です</div>
                    <a href="/login?redirect=/dashboard" className="text-blue-600 hover:underline">
                        ログインページへ →
                    </a>
                </div>
            </div>
        );
    }

    // Show loading while redirecting
    return (
        <div className="min-h-dvh flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-pulse text-gray-500 mb-2">ダッシュボードを読み込み中...</div>
                <p className="text-sm text-gray-400">{orgName}</p>
            </div>
        </div>
    );
}
