import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * LINE Webhook Handler - Full Implementation
 * 
 * 1. Receive message from LINE
 * 2. Translate with OpenAI GPT-4o-mini
 * 3. Save to Supabase
 * 4. Reply with confirmation
 */

function verifySignature(body: string, signature: string, channelSecret: string): boolean {
    try {
        const hash = crypto
            .createHmac("SHA256", channelSecret)
            .update(body)
            .digest("base64");

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

async function translateMessage(text: string): Promise<string> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        console.error("OpenAI API key not configured");
        return text;
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `あなたは従業員と経営者の間のコミュニケーションを仲介するAI秘書です。
従業員からのメッセージを、経営者に伝えやすい形に翻訳してください。

ルール:
1. 感情的な表現は中立的に言い換える
2. 要件を明確にする
3. 丁寧で簡潔な表現にする
4. 原文の意図は必ず保持する

出力は翻訳後のメッセージのみを返してください。`,
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
                max_tokens: 500,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            console.error("OpenAI error:", await response.text());
            return text;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || text;
    } catch (error) {
        console.error("Translation error:", error);
        return text;
    }
}

async function saveToDatabase(
    lineUserId: string,
    originalMessage: string,
    translatedMessage: string
): Promise<{ success: boolean; conversationId?: string }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase not configured");
        return { success: false };
    }

    try {
        // Find or create user
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?line_user_id=eq.${lineUserId}&select=id,org_id,display_name`, {
            headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
            },
        });

        const users = await userResponse.json();
        let user = users?.[0];

        // If user doesn't exist, create a temporary one
        if (!user) {
            console.log("User not found, creating temporary user");
            // For now, just log - user needs to register via invitation link first
            return { success: false };
        }

        // Create or get existing open conversation
        const convResponse = await fetch(
            `${supabaseUrl}/rest/v1/conversations?employee_id=eq.${user.id}&status=eq.open&select=id`,
            {
                headers: {
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`,
                },
            }
        );

        const conversations = await convResponse.json();
        let conversationId: string;

        if (conversations?.length > 0) {
            conversationId = conversations[0].id;
        } else {
            // Create new conversation
            const createConvResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`,
                    "Prefer": "return=representation",
                },
                body: JSON.stringify({
                    org_id: user.org_id,
                    employee_id: user.id,
                    status: "open",
                    subject: translatedMessage.slice(0, 50),
                }),
            });

            const newConv = await createConvResponse.json();
            conversationId = newConv?.[0]?.id;
        }

        if (!conversationId) {
            console.error("Failed to create/get conversation");
            return { success: false };
        }

        // Save message
        await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                sender_type: "employee",
                sender_id: user.id,
                original_content: originalMessage,
                translated_content: translatedMessage,
                channel: "line",
            }),
        });

        return { success: true, conversationId };
    } catch (error) {
        console.error("Database error:", error);
        return { success: false };
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-line-signature");

        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        if (!channelSecret || !channelAccessToken) {
            console.error("LINE credentials not configured");
            return NextResponse.json({ error: "Not configured" }, { status: 500 });
        }

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }

        if (!verifySignature(body, signature, channelSecret)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const parsedBody = JSON.parse(body);
        const events = parsedBody.events || [];

        // Handle verification request
        if (events.length === 0) {
            return NextResponse.json({ success: true });
        }

        // Process events
        for (const event of events) {
            const userId = event.source?.userId;
            const replyToken = event.replyToken;

            if (!userId) continue;

            if (event.type === "message" && event.message?.type === "text") {
                const originalText = event.message.text;
                console.log(`Message from ${userId}: ${originalText}`);

                // Translate message
                const translatedText = await translateMessage(originalText);
                console.log(`Translated: ${translatedText}`);

                // Save to database
                const result = await saveToDatabase(userId, originalText, translatedText);

                // Reply to user
                if (replyToken) {
                    if (result.success) {
                        await replyToLine(
                            replyToken,
                            "メッセージを受け付けました。経営者に安全にお伝えします。",
                            channelAccessToken
                        );
                    } else {
                        await replyToLine(
                            replyToken,
                            "まだ登録が完了していません。経営者から招待リンクを受け取り、登録を完了してください。",
                            channelAccessToken
                        );
                    }
                }
            } else if (event.type === "follow") {
                console.log(`New follower: ${userId}`);
                if (replyToken) {
                    await replyToLine(
                        replyToken,
                        "AI翻訳秘書へようこそ！\n\n経営者から招待リンクを受け取り、登録を完了してください。登録後、こちらにメッセージを送ると経営者に安全に伝えることができます。",
                        channelAccessToken
                    );
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LINE webhook error:", error);
        return NextResponse.json({ success: true });
    }
}

export async function GET() {
    return NextResponse.json({ status: "ok", service: "line-webhook" });
}
