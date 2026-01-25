import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
    notifyOwnerNewMessage,
    askOwnerConfirmation,
    notifyOwnerMessageSent,
    notifyOwnerCancelled,
    sendLinePushMessage,
} from "@/lib/line-push";

/**
 * LINE Webhook Handler - Full Implementation with Owner Confirmation Flow
 */

function verifySignature(body: string, signature: string, channelSecret: string): boolean {
    try {
        const hash = crypto.createHmac("SHA256", channelSecret).update(body).digest("base64");
        const hashBuffer = Buffer.from(hash, "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");
        if (hashBuffer.length !== signatureBuffer.length) return false;
        return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
    } catch {
        return false;
    }
}

async function translateMessage(text: string, direction: "to_owner" | "to_employee", employeeName?: string): Promise<string> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return text;

    const systemPrompt = direction === "to_owner"
        ? `あなたは従業員と経営者の間のコミュニケーションを仲介するAI秘書です。
従業員からのメッセージを、経営者に伝えやすい形に整理してください。

ルール:
- 感情的な表現があれば中立的に言い換える
- 要件を明確にする
- 原文の意図は必ず保持する
- 過度に文章を膨らませない`
        : `あなたは経営者から従業員への返信を整える秘書です。
経営者のメッセージを、${employeeName || '従業員'}さん個人に送る自然な返信に整えてください。

重要なルール:
- これは個人への1対1の返信です。「皆さん」「みなさま」などグループ向け表現は絶対に使わない
- 元のメッセージの意図を維持し、過度に丁寧にしたり膨らませたりしない
- 簡潔で自然な文章にする
- 威圧的にならない程度にビジネスライクに`;

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
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text },
                ],
                max_tokens: 500,
                temperature: 0.3,
            }),
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || text;
    } catch {
        return text;
    }
}

async function supabaseFetch(path: string, options: RequestInit = {}) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase not configured");

    const response = await fetch(`${url}/rest/v1${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "apikey": key,
            "Authorization": `Bearer ${key}`,
            "Prefer": options.method === "POST" ? "return=representation" : "",
            ...(options.headers || {}),
        },
    });
    return response.json();
}

async function getUserByLineId(lineUserId: string) {
    const users = await supabaseFetch(`/users?line_user_id=eq.${lineUserId}&select=id,org_id,display_name,role,line_user_id`);
    return users?.[0] || null;
}

async function getOwnerByOrgId(orgId: string) {
    const owners = await supabaseFetch(`/users?org_id=eq.${orgId}&role=eq.owner&select=id,org_id,display_name,line_user_id`);
    return owners?.[0] || null;
}

async function getOwnerState(ownerId: string) {
    const states = await supabaseFetch(`/owner_conversation_state?owner_id=eq.${ownerId}&select=*`);
    return states?.[0] || null;
}

async function setOwnerState(ownerId: string, orgId: string, state: string, employeeId?: string, pendingReplyId?: string) {
    const existing = await getOwnerState(ownerId);
    if (existing) {
        await supabaseFetch(`/owner_conversation_state?owner_id=eq.${ownerId}`, {
            method: "PATCH",
            body: JSON.stringify({
                state,
                current_employee_id: employeeId || null,
                pending_reply_id: pendingReplyId || null,
                updated_at: new Date().toISOString(),
            }),
        });
    } else {
        await supabaseFetch("/owner_conversation_state", {
            method: "POST",
            body: JSON.stringify({
                owner_id: ownerId,
                org_id: orgId,
                state,
                current_employee_id: employeeId || null,
                pending_reply_id: pendingReplyId || null,
            }),
        });
    }
}

async function createPendingReply(orgId: string, employeeId: string, ownerId: string, original: string, translated: string) {
    const result = await supabaseFetch("/pending_replies", {
        method: "POST",
        body: JSON.stringify({
            org_id: orgId,
            employee_id: employeeId,
            owner_id: ownerId,
            original_message: original,
            translated_message: translated,
            status: "pending",
        }),
    });
    return result?.[0] || null;
}

async function confirmPendingReply(replyId: string) {
    await supabaseFetch(`/pending_replies?id=eq.${replyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed", confirmed_at: new Date().toISOString() }),
    });
}

async function cancelPendingReply(replyId: string) {
    await supabaseFetch(`/pending_replies?id=eq.${replyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
    });
}

async function getPendingReply(replyId: string) {
    const replies = await supabaseFetch(`/pending_replies?id=eq.${replyId}&select=*,employee:employee_id(id,display_name,line_user_id)`);
    return replies?.[0] || null;
}

async function getEmployeeById(employeeId: string) {
    const users = await supabaseFetch(`/users?id=eq.${employeeId}&select=id,display_name,line_user_id`);
    return users?.[0] || null;
}

async function findEmployeeByName(orgId: string, name: string) {
    const users = await supabaseFetch(`/users?org_id=eq.${orgId}&role=eq.staff&select=id,display_name,line_user_id`);
    return users?.find((u: { display_name?: string }) => u.display_name?.includes(name)) || null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-line-signature");
        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        if (!channelSecret || !channelAccessToken) {
            return NextResponse.json({ error: "Not configured" }, { status: 500 });
        }
        if (!signature || !verifySignature(body, signature, channelSecret)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const parsedBody = JSON.parse(body);
        const events = parsedBody.events || [];

        if (events.length === 0) {
            return NextResponse.json({ success: true });
        }

        for (const event of events) {
            const userId = event.source?.userId;
            const replyToken = event.replyToken;

            if (!userId) continue;

            if (event.type === "message" && event.message?.type === "text") {
                const text = event.message.text;
                const user = await getUserByLineId(userId);

                if (!user) {
                    // Unregistered user
                    if (replyToken) {
                        await replyToLine(replyToken, "まだ登録が完了していません。経営者から招待リンクを受け取り、登録を完了してください。", channelAccessToken);
                    }
                    continue;
                }

                if (user.role === "owner") {
                    // Owner message - handle reply flow
                    await handleOwnerMessage(user, text, replyToken, channelAccessToken);
                } else {
                    // Employee message - notify owner
                    await handleEmployeeMessage(user, text, replyToken, channelAccessToken);
                }
            } else if (event.type === "follow") {
                await replyToLine(replyToken, "AI翻訳秘書へようこそ！\n\n経営者から招待リンクを受け取り、登録を完了してください。", channelAccessToken);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LINE webhook error:", error);
        return NextResponse.json({ success: true });
    }
}

async function handleEmployeeMessage(user: { id: string; org_id: string; display_name?: string }, text: string, replyToken: string, accessToken: string) {
    // Translate message for owner
    const translated = await translateMessage(text, "to_owner");

    // Save to database
    try {
        // Get or create conversation
        const convs = await supabaseFetch(`/conversations?employee_id=eq.${user.id}&status=eq.open&select=id`);
        let convId: string;
        if (convs?.length > 0) {
            convId = convs[0].id;
        } else {
            const newConv = await supabaseFetch("/conversations", {
                method: "POST",
                body: JSON.stringify({
                    org_id: user.org_id,
                    employee_id: user.id,
                    status: "open",
                    subject: translated.slice(0, 50),
                }),
            });
            convId = newConv?.[0]?.id;
        }

        if (convId) {
            await supabaseFetch("/messages", {
                method: "POST",
                body: JSON.stringify({
                    conversation_id: convId,
                    sender_type: "employee",
                    sender_id: user.id,
                    original_content: text,
                    translated_content: translated,
                    channel: "line",
                }),
            });
        }
    } catch (err) {
        console.error("DB save error:", err);
    }

    // Notify owner
    const owner = await getOwnerByOrgId(user.org_id);
    if (owner?.line_user_id) {
        await notifyOwnerNewMessage(
            accessToken,
            owner.line_user_id,
            user.display_name || "従業員",
            translated
        );
    }

    // Reply to employee
    if (replyToken) {
        await replyToLine(replyToken, "メッセージを受け付けました。経営者に安全にお伝えします。", accessToken);
    }
}

async function handleOwnerMessage(user: { id: string; org_id: string; display_name?: string; line_user_id?: string }, text: string, replyToken: string, accessToken: string) {
    const ownerState = await getOwnerState(user.id);
    const lowerText = text.toLowerCase().trim();

    // Check for confirmation responses
    if (ownerState?.state === "confirming" && ownerState.pending_reply_id) {
        if (lowerText === "はい" || lowerText === "ok" || lowerText === "送信" || lowerText === "yes") {
            // Confirm and send
            const pendingReply = await getPendingReply(ownerState.pending_reply_id);
            if (pendingReply) {
                const employee = pendingReply.employee;
                if (employee?.line_user_id) {
                    // Send translated message to employee
                    await sendLinePushMessage({
                        accessToken,
                        userId: employee.line_user_id,
                        messages: [{ type: "text", text: pendingReply.translated_message }],
                    });

                    await confirmPendingReply(ownerState.pending_reply_id);
                    await setOwnerState(user.id, user.org_id, "idle");

                    if (user.line_user_id) {
                        await notifyOwnerMessageSent(accessToken, user.line_user_id, employee.display_name || "従業員");
                    }
                }
            }
            return;
        } else if (lowerText === "キャンセル" || lowerText === "cancel" || lowerText === "いいえ" || lowerText === "no") {
            await cancelPendingReply(ownerState.pending_reply_id);
            await setOwnerState(user.id, user.org_id, "idle");
            if (user.line_user_id) {
                await notifyOwnerCancelled(accessToken, user.line_user_id);
            }
            return;
        } else {
            // Treat as modification - create new pending reply
            const pendingReply = await getPendingReply(ownerState.pending_reply_id);
            if (pendingReply) {
                await cancelPendingReply(ownerState.pending_reply_id);
                const employee = await getEmployeeById(pendingReply.employee_id);
                if (employee) {
                    const translated = await translateMessage(text, "to_employee", employee.display_name);
                    const newPending = await createPendingReply(user.org_id, employee.id, user.id, text, translated);
                    if (newPending && user.line_user_id) {
                        await setOwnerState(user.id, user.org_id, "confirming", employee.id, newPending.id);
                        await askOwnerConfirmation(accessToken, user.line_user_id, employee.display_name || "従業員", text, translated);
                    }
                }
            }
            return;
        }
    }

    // Check for @mention reply
    const mentionMatch = text.match(/^@(.+?)\s+([\s\S]+)$/);
    if (mentionMatch) {
        const employeeName = mentionMatch[1].trim();
        const replyContent = mentionMatch[2].trim();

        const employee = await findEmployeeByName(user.org_id, employeeName);
        if (!employee) {
            if (replyToken) {
                await replyToLine(replyToken, `「${employeeName}」という従業員が見つかりませんでした。`, accessToken);
            }
            return;
        }

        // Translate and create pending reply
        const translated = await translateMessage(replyContent, "to_employee", employee.display_name);
        const pendingReply = await createPendingReply(user.org_id, employee.id, user.id, replyContent, translated);

        if (pendingReply && user.line_user_id) {
            await setOwnerState(user.id, user.org_id, "confirming", employee.id, pendingReply.id);
            await askOwnerConfirmation(accessToken, user.line_user_id, employee.display_name || "従業員", replyContent, translated);
        }
        return;
    }

    // Default help message
    if (replyToken) {
        await replyToLine(replyToken, `📋 使い方：
従業員に返信するには：
「@名前 [メッセージ]」と入力してください

例：@田中 承知しました`, accessToken);
    }
}

async function replyToLine(replyToken: string, message: string, accessToken: string) {
    try {
        await fetch("https://api.line.me/v2/bot/message/reply", {
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
    } catch (error) {
        console.error("Reply error:", error);
    }
}

export async function GET() {
    return NextResponse.json({ status: "ok", service: "line-webhook-v2" });
}
