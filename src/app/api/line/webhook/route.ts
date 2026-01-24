import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { processMessage, handleFollow } from "@/services/line.service";
import { getOrganizationByLineChannel, getOrgLineCredentials } from "@/services/user.service";
import { getLineCredentials } from "@/lib/env";

/**
 * LINE Webhook Handler
 * 
 * Receives events from LINE Messaging API
 */

const lineEventSchema = z.object({
    type: z.string(),
    timestamp: z.number(),
    source: z.object({
        type: z.string(),
        userId: z.string().optional(),
        groupId: z.string().optional(),
        roomId: z.string().optional(),
    }),
    replyToken: z.string().optional(),
    message: z.object({
        id: z.string(),
        type: z.string(),
        text: z.string().optional(),
    }).optional(),
});

const lineWebhookBodySchema = z.object({
    destination: z.string(),
    events: z.array(lineEventSchema),
});

function verifySignature(body: string, signature: string, channelSecret: string): boolean {
    const hash = crypto
        .createHmac("SHA256", channelSecret)
        .update(body)
        .digest("base64");

    // Use timing-safe comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hash, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    // Ensure buffers are same length before comparison
    if (hashBuffer.length !== signatureBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-line-signature");

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }

        const parsedBody = JSON.parse(body);
        const { destination, events } = lineWebhookBodySchema.parse(parsedBody);

        // Try to get org-specific credentials first (multi-tenant)
        let channelSecret: string | undefined;
        let channelAccessToken: string | undefined;

        const org = await getOrganizationByLineChannel(destination);
        if (org) {
            const orgCredentials = await getOrgLineCredentials(org.id);
            if (orgCredentials) {
                channelSecret = orgCredentials.channelSecret;
                channelAccessToken = orgCredentials.channelAccessToken;
            }
        }

        // Fallback to environment variables (single-tenant mode)
        if (!channelSecret || !channelAccessToken) {
            const envCredentials = getLineCredentials();
            channelSecret = envCredentials.channelSecret;
            channelAccessToken = envCredentials.channelAccessToken;
        }

        if (!channelSecret || !channelAccessToken) {
            console.error("LINE credentials not configured");
            return NextResponse.json({ error: "Not configured" }, { status: 500 });
        }

        if (!verifySignature(body, signature, channelSecret)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Process events asynchronously
        const eventPromises = events.map(async (event) => {
            const userId = event.source.userId;
            const replyToken = event.replyToken;

            if (!userId || !replyToken) return;

            switch (event.type) {
                case "message":
                    if (event.message?.type === "text" && event.message.text) {
                        await processMessage(
                            userId,
                            event.message.text,
                            replyToken,
                            channelAccessToken!
                        );
                    }
                    break;

                case "follow":
                    await handleFollow(userId, replyToken, channelAccessToken!);
                    break;

                case "unfollow":
                    // Log unfollow event
                    console.log(`User unfollowed: ${userId}`);
                    break;
            }
        });

        await Promise.all(eventPromises);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LINE webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: "ok", service: "line-webhook" });
}
