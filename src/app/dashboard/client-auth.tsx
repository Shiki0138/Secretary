"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ClientAuthDashboard() {
    const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = getSupabaseClient();
            if (!supabase) {
                setStatus("unauthenticated");
                return;
            }

            // Use getUser() instead of getSession() - makes a request to Supabase
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
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
                // API error - redirect to onboarding
                window.location.href = "/onboarding";
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
            </div>
        </div>
    );
}
