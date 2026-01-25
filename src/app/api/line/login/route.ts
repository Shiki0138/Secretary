import { NextRequest, NextResponse } from "next/server";

/**
 * LINE Login OAuth - Redirect to LINE authorization
 */

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const name = request.nextUrl.searchParams.get("name");

    // Store in session via cookie (simple approach)
    const inviteCode = code || "";
    const userName = name || "";

    // LINE Login requires a separate LINE Login channel (not Messaging API)
    // For now, redirect to a page explaining the setup needed

    // Check if LINE Login is configured
    const lineLoginChannelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const lineLoginChannelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

    if (!lineLoginChannelId || !lineLoginChannelSecret) {
        // LINE Login not configured - show instructions
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        return NextResponse.redirect(
            `${baseUrl}/join/${inviteCode}?error=line_login_not_configured&name=${encodeURIComponent(userName)}`
        );
    }

    // Redirect to LINE Login authorization
    const redirectUri = `${request.nextUrl.origin}/api/line/callback`;
    const state = Buffer.from(JSON.stringify({ code: inviteCode, name: userName })).toString("base64");

    const lineLoginUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    lineLoginUrl.searchParams.set("response_type", "code");
    lineLoginUrl.searchParams.set("client_id", lineLoginChannelId);
    lineLoginUrl.searchParams.set("redirect_uri", redirectUri);
    lineLoginUrl.searchParams.set("state", state);
    lineLoginUrl.searchParams.set("scope", "profile openid");

    return NextResponse.redirect(lineLoginUrl.toString());
}
