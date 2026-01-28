import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            // Exchange code for session
            const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                console.error("Auth callback error:", error);
                return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
            }

            if (session?.user) {
                // Check if user has an organization
                const supabaseAdmin = createClient(
                    supabaseUrl,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
                );

                const { data: user } = await supabaseAdmin
                    .from("users")
                    .select("org_id")
                    .eq("id", session.user.id)
                    .single();

                if (user?.org_id) {
                    // User has organization, go to dashboard
                    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
                } else {
                    // User needs to create organization
                    return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
                }
            }
        }
    }

    // Default: redirect to login
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
