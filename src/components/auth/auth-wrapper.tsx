"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthWrapperProps {
    children: (user: User) => React.ReactNode;
    fallback?: React.ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Get initial session
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
            } else {
                // Redirect to login
                window.location.href = "/login?redirect=/dashboard";
            }
            setLoading(false);
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session?.user) {
                    setUser(session.user);
                } else if (event === "SIGNED_OUT") {
                    window.location.href = "/login";
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return fallback || (
            <div className="min-h-dvh flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-gray-500">読み込み中...</div>
            </div>
        );
    }

    if (!user) {
        return fallback || (
            <div className="min-h-dvh flex items-center justify-center bg-gray-50">
                <div className="text-gray-500">ログインが必要です...</div>
            </div>
        );
    }

    return <>{children(user)}</>;
}
