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

    // Handle 204 No Content and empty responses
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        console.error("[SUPABASE] Failed to parse response:", text.substring(0, 100));
        return null;
    }
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
    console.log("[WEBHOOK] Received request");
    try {
        const body = await request.text();
        const signature = request.headers.get("x-line-signature");
        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        console.log("[WEBHOOK] Config check:", {
            hasSecret: !!channelSecret,
            hasToken: !!channelAccessToken,
            hasSignature: !!signature
        });

        if (!channelSecret || !channelAccessToken) {
            console.log("[WEBHOOK] Missing config");
            return NextResponse.json({ error: "Not configured" }, { status: 500 });
        }
        if (!signature || !verifySignature(body, signature, channelSecret)) {
            console.log("[WEBHOOK] Signature verification failed");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        console.log("[WEBHOOK] Signature verified, parsing body");
        const parsedBody = JSON.parse(body);
        const events = parsedBody.events || [];

        console.log("[WEBHOOK] Events count:", events.length);

        if (events.length === 0) {
            return NextResponse.json({ success: true });
        }

        for (const event of events) {
            const userId = event.source?.userId;
            const replyToken = event.replyToken;

            console.log("[WEBHOOK] Processing event:", {
                type: event.type,
                userId: userId?.substring(0, 10) + "...",
                hasReplyToken: !!replyToken
            });

            if (!userId) continue;

            if (event.type === "message" && event.message?.type === "text") {
                const text = event.message.text.trim();
                console.log("[WEBHOOK] Text message received:", text);

                const user = await getUserByLineId(userId);
                console.log("[WEBHOOK] User lookup result:", user ? `Found: ${user.role}` : "Not found");

                if (!user) {
                    // Unregistered user - handle invitation code input
                    console.log("[WEBHOOK] Handling unregistered user");
                    await handleUnregisteredUser(userId, text, replyToken, channelAccessToken);
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
                console.log("[WEBHOOK] Follow event");
                await replyToLine(replyToken, `AI翻訳秘書へようこそ！👋

経営者から受け取った8桁の招待コードを入力してください。

例: ABC12XYZ`, channelAccessToken);
            }
        }

        console.log("[WEBHOOK] Processing complete");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WEBHOOK] Error:", error);
        return NextResponse.json({ success: true });
    }
}

// Handle unregistered user - invitation code flow
async function handleUnregisteredUser(lineUserId: string, text: string, replyToken: string, accessToken: string) {
    console.log("[UNREGISTERED] Processing:", { lineUserId: lineUserId.substring(0, 10), text });

    // Check if user is already pending approval
    const pendingRegs = await supabaseFetch(
        `/pending_registrations?line_user_id=eq.${lineUserId}&status=eq.pending&select=id,org_id`
    );
    console.log("[UNREGISTERED] Pending registrations:", pendingRegs?.length || 0);

    if (pendingRegs?.length > 0) {
        if (replyToken) {
            await replyToLine(replyToken, `現在、経営者の承認待ちです。
しばらくお待ちください。`, accessToken);
        }
        return;
    }

    // Check rate limit
    const isBlocked = await checkRateLimit(lineUserId, "code_attempt");
    console.log("[UNREGISTERED] Rate limit blocked:", isBlocked);

    if (isBlocked) {
        if (replyToken) {
            await replyToLine(replyToken, `試行回数が多すぎます。
24時間後に再度お試しください。`, accessToken);
        }
        return;
    }

    // Validate code format (8 alphanumeric characters)
    const codePattern = /^[A-Z0-9]{8}$/i;
    const isValidFormat = codePattern.test(text);
    console.log("[UNREGISTERED] Code format valid:", isValidFormat, "text:", text);

    if (!isValidFormat) {
        if (replyToken) {
            await replyToLine(replyToken, `8桁の招待コードを入力してください。

例: ABC12XYZ`, accessToken);
        }
        return;
    }

    const code = text.toUpperCase();

    // Look up invitation code
    const codes = await supabaseFetch(
        `/invitation_codes?code=eq.${code}&select=id,org_id,expires_at,used_count,max_uses`
    );

    // Log attempt
    await logRegistrationAttempt(lineUserId, code, codes?.[0]?.org_id || null, !!codes?.length);

    if (!codes || codes.length === 0) {
        await incrementRateLimit(lineUserId, "code_attempt");
        if (replyToken) {
            await replyToLine(replyToken, `無効な招待コードです。
経営者に正しいコードを確認してください。`, accessToken);
        }
        return;
    }

    const invitation = codes[0];

    // Check expiry
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        await incrementRateLimit(lineUserId, "code_attempt");
        if (replyToken) {
            await replyToLine(replyToken, `この招待コードは期限切れです。
経営者に新しいコードを発行してもらってください。`, accessToken);
        }
        return;
    }

    // Check if already used up
    if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
        await incrementRateLimit(lineUserId, "code_attempt");
        if (replyToken) {
            await replyToLine(replyToken, `この招待コードは使用済みです。
経営者に新しいコードを発行してもらってください。`, accessToken);
        }
        return;
    }

    // Get LINE profile for display name
    let displayName = "従業員";
    try {
        const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (profileRes.ok) {
            const profile = await profileRes.json();
            displayName = profile.displayName || "従業員";
        }
    } catch (e) {
        console.error("Failed to get LINE profile:", e);
    }

    // Create pending registration
    await supabaseFetch("/pending_registrations", {
        method: "POST",
        body: JSON.stringify({
            line_user_id: lineUserId,
            line_display_name: displayName,
            org_id: invitation.org_id,
            invitation_code_id: invitation.id,
            status: "pending",
        }),
    });

    // Update invitation used count
    await supabaseFetch(`/invitation_codes?id=eq.${invitation.id}`, {
        method: "PATCH",
        body: JSON.stringify({
            used_count: invitation.used_count + 1,
        }),
    });

    // Notify owner about pending registration
    const owner = await getOwnerByOrgId(invitation.org_id);
    if (owner?.line_user_id) {
        await sendLinePushMessage({
            accessToken,
            userId: owner.line_user_id,
            messages: [{
                type: "text",
                text: `🔔 新しい従業員登録リクエスト

名前: ${displayName}

ダッシュボードで承認または拒否してください。`
            }]
        });
    }

    // Reply to user
    if (replyToken) {
        await replyToLine(replyToken, `招待コードを確認しました！✅

経営者の承認をお待ちください。
承認されると、メッセージの送受信が可能になります。`, accessToken);
    }
}

// Rate limiting helpers
async function checkRateLimit(identifier: string, actionType: string): Promise<boolean> {
    try {
        const limits = await supabaseFetch(
            `/rate_limits?identifier=eq.${identifier}&action_type=eq.${actionType}&select=blocked_until,attempt_count`
        );
        if (limits?.length > 0) {
            const limit = limits[0];
            if (limit.blocked_until && new Date(limit.blocked_until) > new Date()) {
                return true;
            }
        }
        return false;
    } catch {
        return false;
    }
}

async function incrementRateLimit(identifier: string, actionType: string): Promise<void> {
    try {
        const limits = await supabaseFetch(
            `/rate_limits?identifier=eq.${identifier}&action_type=eq.${actionType}&select=id,attempt_count`
        );

        const maxAttempts = 5;
        const blockDurationHours = 24;

        if (limits?.length > 0) {
            const newCount = limits[0].attempt_count + 1;
            const blockedUntil = newCount >= maxAttempts
                ? new Date(Date.now() + blockDurationHours * 60 * 60 * 1000).toISOString()
                : null;

            await supabaseFetch(`/rate_limits?id=eq.${limits[0].id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    attempt_count: newCount,
                    blocked_until: blockedUntil,
                }),
            });
        } else {
            await supabaseFetch("/rate_limits", {
                method: "POST",
                body: JSON.stringify({
                    identifier,
                    action_type: actionType,
                    attempt_count: 1,
                }),
            });
        }
    } catch (e) {
        console.error("Rate limit error:", e);
    }
}

async function logRegistrationAttempt(lineUserId: string, code: string, orgId: string | null, success: boolean): Promise<void> {
    try {
        await supabaseFetch("/registration_attempts", {
            method: "POST",
            body: JSON.stringify({
                line_user_id: lineUserId,
                attempted_code: code,
                org_id: orgId,
                success,
            }),
        });
    } catch (e) {
        console.error("Audit log error:", e);
    }
}

async function getEmployeeState(employeeId: string) {
    const states = await supabaseFetch(`/employee_conversation_state?employee_id=eq.${employeeId}&select=*`);
    return states?.[0] || null;
}

async function setEmployeeState(employeeId: string, orgId: string, state: string, intentType?: string, context?: object, pendingMessage?: string) {
    const existing = await getEmployeeState(employeeId);
    const data = {
        state,
        intent_type: intentType || null,
        context: context || {},
        pending_message: pendingMessage || null,
        updated_at: new Date().toISOString(),
    };

    if (existing) {
        await supabaseFetch(`/employee_conversation_state?employee_id=eq.${employeeId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    } else {
        await supabaseFetch("/employee_conversation_state", {
            method: "POST",
            body: JSON.stringify({
                employee_id: employeeId,
                org_id: orgId,
                ...data,
            }),
        });
    }
}

async function formatMessageForOwner(text: string): Promise<string> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        return text;
    }

    // 今日の日付を取得（日本時間）
    const today = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(today.getTime() + jstOffset);

    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const todayWeekday = weekdays[jstDate.getUTCDay()];
    const dateStr = `${jstDate.getFullYear()}年${jstDate.getMonth() + 1}月${jstDate.getDate()}日(${todayWeekday})`;

    // 明日の日付
    const tomorrow = new Date(jstDate.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日(${weekdays[tomorrow.getUTCDay()]})`;

    // 来週の各曜日の日付を計算
    const nextWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
        const daysUntilNextWeek = (7 - jstDate.getUTCDay() + i) % 7 + 7; // 来週の同じ曜日
        if (daysUntilNextWeek <= 7) continue; // 今週はスキップ
        const nextDate = new Date(jstDate.getTime() + daysUntilNextWeek * 24 * 60 * 60 * 1000);
        nextWeekDates.push(`来週${weekdays[i]}: ${nextDate.getMonth() + 1}月${nextDate.getDate()}日`);
    }

    // よりシンプルに：今日から14日間の日付を生成
    const dateReference: string[] = [];
    for (let i = 0; i <= 14; i++) {
        const d = new Date(jstDate.getTime() + i * 24 * 60 * 60 * 1000);
        const label = i === 0 ? '今日' : i === 1 ? '明日' : i === 2 ? '明後日' : '';
        dateReference.push(`${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getUTCDay()]})${label ? '=' + label : ''}`);
    }

    const systemPrompt = `あなたはメッセージを整理するアシスタントです。
従業員からのメッセージを経営者に伝えやすい形に整理してください。

【重要】今日: ${dateStr}
日付カレンダー: ${dateReference.join(', ')}

ルール:
- 「明日」「来週金曜日」などは上のカレンダーを参照して正確な日付に変換
- 来週◯曜日 = 今週の同じ曜日の7日後
- 内容を補完したり質問したりしない
- 与えられた情報だけで整理する
- 簡潔にまとめる

例:
- 「明日休みたい」→「${tomorrowStr}の休暇を希望します」
- 「シフト変更したい」→「シフト変更を希望しています」`;

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
                max_tokens: 200,
                temperature: 0.3,
            }),
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || text;
    } catch (e) {
        console.error("Format message error:", e);
        return text;
    }
}

async function handleEmployeeMessage(user: { id: string; org_id: string; display_name?: string }, text: string, replyToken: string, accessToken: string) {
    const employeeState = await getEmployeeState(user.id);
    const lowerText = text.toLowerCase().trim();

    // 確認中の状態での応答処理
    if (employeeState?.state === "confirming" && employeeState.pending_message) {
        if (lowerText === "はい" || lowerText === "ok" || lowerText === "送信" || lowerText === "yes") {
            // 送信実行
            const messageToSend = employeeState.pending_message;

            // Save to database
            try {
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
                            subject: messageToSend.slice(0, 50),
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
                            original_content: messageToSend,
                            translated_content: messageToSend,
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
                    messageToSend
                );
            }

            // Reset state and reply
            await setEmployeeState(user.id, user.org_id, "idle");
            if (replyToken) {
                await replyToLine(replyToken, "✅ メッセージを送信しました。経営者からの返信をお待ちください。", accessToken);
            }
            return;
        } else if (lowerText === "キャンセル" || lowerText === "cancel" || lowerText === "いいえ" || lowerText === "no") {
            // キャンセル
            await setEmployeeState(user.id, user.org_id, "idle");
            if (replyToken) {
                await replyToLine(replyToken, "キャンセルしました。また何かありましたらお気軽にメッセージをお送りください。", accessToken);
            }
            return;
        } else {
            // 修正内容として扱う - そのまま新しいメッセージとして処理
            await setEmployeeState(user.id, user.org_id, "idle");
        }
    }

    // メッセージを整理して確認画面を表示
    const formattedMessage = await formatMessageForOwner(text);

    // 確認を求める
    await setEmployeeState(user.id, user.org_id, "confirming", undefined, undefined, formattedMessage);
    if (replyToken) {
        await replyToLine(replyToken, `📝 以下の内容を経営者に送信します：\n\n「${formattedMessage}」\n\n━━━━━━━━━━━━\n✅ 送信する→「はい」と返信\n❌ キャンセル→「キャンセル」と返信`, accessToken);
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
