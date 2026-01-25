import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * LINE Login OAuth Callback
 * 
 * Receives authorization code from LINE, exchanges for access token,
 * gets user profile, and completes registration
 */

export async function GET(request: NextRequest) {
    const authCode = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    const baseUrl = request.nextUrl.origin;

    if (error) {
        return NextResponse.redirect(`${baseUrl}/join?error=${error}`);
    }

    if (!authCode || !state) {
        return NextResponse.redirect(`${baseUrl}/join?error=missing_params`);
    }

    // Decode state
    let inviteCode: string;
    let userName: string;
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
        inviteCode = decoded.code;
        userName = decoded.name;
    } catch {
        return NextResponse.redirect(`${baseUrl}/join?error=invalid_state`);
    }

    const lineLoginChannelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const lineLoginChannelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

    if (!lineLoginChannelId || !lineLoginChannelSecret) {
        return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?error=not_configured`);
    }

    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: authCode,
                redirect_uri: `${baseUrl}/api/line/callback`,
                client_id: lineLoginChannelId,
                client_secret: lineLoginChannelSecret,
            }),
        });

        if (!tokenResponse.ok) {
            console.error("Token exchange failed:", await tokenResponse.text());
            return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Get user profile
        const profileResponse = await fetch("https://api.line.me/v2/profile", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!profileResponse.ok) {
            console.error("Profile fetch failed:", await profileResponse.text());
            return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?error=profile_fetch_failed`);
        }

        const profile = await profileResponse.json();
        const lineUserId = profile.userId;
        const lineDisplayName = profile.displayName;

        // Complete registration
        const supabase = getSupabaseAdmin();

        // Verify invitation code
        const { data: invitation, error: inviteError } = await supabase
            .from("invitation_codes")
            .select("id, org_id, max_uses, used_count, expires_at")
            .eq("code", inviteCode.toUpperCase())
            .single();

        if (inviteError || !invitation) {
            return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?error=invalid_code`);
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("line_user_id", lineUserId)
            .single();

        if (existingUser) {
            // User already registered
            return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?success=already_registered`);
        }

        // Create user
        const { error: userError } = await supabase
            .from("users")
            .insert({
                org_id: invitation.org_id,
                line_user_id: lineUserId,
                display_name: userName || lineDisplayName,
                role: "employee",
            });

        if (userError) {
            console.error("User creation error:", userError);
            return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?error=registration_failed`);
        }

        // Increment invitation usage
        await supabase
            .from("invitation_codes")
            .update({ used_count: invitation.used_count + 1 })
            .eq("id", invitation.id);

        // Redirect to success page
        return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?success=true`);
    } catch (error) {
        console.error("LINE callback error:", error);
        return NextResponse.redirect(`${baseUrl}/join/${inviteCode}?error=unknown`);
    }
}
