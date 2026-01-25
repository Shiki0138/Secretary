import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * LINE Webhook Handler
 * 
 * Simplified for reliability during verification and message processing
 */

function verifySignature(body: string, signature: string, channelSecret: string): boolean {
    try {
        const hash = crypto
            .createHmac("SHA256", channelSecret)
            .update(body)
            .digest("base64");

        // Use timing-safe comparison
        const hashBuffer = Buffer.from(hash, "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        if (hashBuffer.length !== signatureBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
    } catch (error) {
        console.error("Signature verification error:", error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-line-signature");

        // Get credentials from environment
        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        // Log for debugging (remove in production)
        console.log("LINE Webhook received");
        console.log("Has signature:", !!signature);
        console.log("Has channelSecret:", !!channelSecret);
        console.log("Has channelAccessToken:", !!channelAccessToken);

        if (!channelSecret || !channelAccessToken) {
            console.error("LINE credentials not configured");
            return NextResponse.json({ error: "Not configured" }, { status: 500 });
        }

        if (!signature) {
            console.error("Missing signature header");
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }

        // Verify signature
        if (!verifySignature(body, signature, channelSecret)) {
            console.error("Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Parse body
        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        } catch {
            console.error("Invalid JSON body");
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const events = parsedBody.events || [];

        // Handle verification request (empty events array)
        if (events.length === 0) {
            console.log("LINE webhook verification successful");
            return NextResponse.json({ success: true });
        }

        // Process events
        for (const event of events) {
            const userId = event.source?.userId;
            const replyToken = event.replyToken;

            console.log(`Event type: ${event.type}, userId: ${userId}`);

            if (!userId) continue;

            if (event.type === "message" && event.message?.type === "text") {
                const text = event.message.text;
                console.log(`Message from ${userId}: ${text}`);

                // Reply with confirmation (simple echo for now)
                if (replyToken) {
                    await replyToLine(replyToken, `メッセージを受け取りました: "${text}"`, channelAccessToken);
                }
            } else if (event.type === "follow") {
                console.log(`New follower: ${userId}`);
                if (replyToken) {
                    await replyToLine(
                        replyToken,
                        "AI翻訳秘書へようこそ！\n\nこちらにメッセージを送ると、経営者に安全に伝えることができます。",
                        channelAccessToken
                    );
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LINE webhook error:", error);
        // Return 200 to prevent LINE from retrying
        return NextResponse.json({ success: true, error: "Internal error handled" });
    }
}

async function replyToLine(replyToken: string, message: string, accessToken: string) {
    try {
        const response = await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                replyToken,
                messages: [{ type: "text", text: message }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LINE reply error:", errorText);
        }
    } catch (error) {
        console.error("Failed to reply to LINE:", error);
    }
}

export async function GET() {
    return NextResponse.json({ status: "ok", service: "line-webhook" });
}
