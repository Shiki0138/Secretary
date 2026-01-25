import { NextResponse } from "next/server";

// Temporary debug endpoint to check environment variables
// DELETE THIS FILE after debugging is complete

export async function GET() {
    return NextResponse.json({
        hasLineChannelId: !!process.env.LINE_CHANNEL_ID,
        hasLineChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
        hasLineChannelAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        // Show partial values for verification (first 10 chars only)
        lineChannelIdPartial: process.env.LINE_CHANNEL_ID?.slice(0, 10) || "NOT SET",
        lineChannelSecretPartial: process.env.LINE_CHANNEL_SECRET?.slice(0, 10) || "NOT SET",
        lineAccessTokenPartial: process.env.LINE_CHANNEL_ACCESS_TOKEN?.slice(0, 10) || "NOT SET",
        nodeEnv: process.env.NODE_ENV,
    });
}
