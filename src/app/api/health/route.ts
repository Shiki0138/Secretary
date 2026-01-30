import { NextResponse } from "next/server";

export async function GET() {
    const lineConfigured = !!(
        process.env.LINE_CHANNEL_ID &&
        process.env.LINE_CHANNEL_SECRET &&
        process.env.LINE_CHANNEL_ACCESS_TOKEN
    );

    const supabaseConfigured = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const openaiConfigured = !!process.env.OPENAI_API_KEY;

    return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
            line: {
                configured: lineConfigured,
                channelIdSet: !!process.env.LINE_CHANNEL_ID,
                channelSecretSet: !!process.env.LINE_CHANNEL_SECRET,
                accessTokenSet: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
            },
            supabase: {
                configured: supabaseConfigured,
            },
            openai: {
                configured: openaiConfigured,
            },
        },
    });
}
