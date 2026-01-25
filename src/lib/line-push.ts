/**
 * LINE Push Notification Utility
 * 
 * Send push messages to users (primarily for owner notifications)
 */

interface PushMessageOptions {
    accessToken: string;
    userId: string;
    messages: Array<{
        type: "text";
        text: string;
    }>;
}

export async function sendLinePushMessage(options: PushMessageOptions): Promise<boolean> {
    const { accessToken, userId, messages } = options;

    try {
        const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                to: userId,
                messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LINE push error:", errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Failed to send LINE push:", error);
        return false;
    }
}

/**
 * Notify owner about new employee message
 */
export async function notifyOwnerNewMessage(
    accessToken: string,
    ownerLineId: string,
    employeeName: string,
    translatedMessage: string
): Promise<boolean> {
    const message = `📩 ${employeeName}さんから相談がありました：

「${translatedMessage}」

💡 返信するには：
「@${employeeName} [返信内容]」と入力してください

例：@${employeeName} 承知しました`;

    return sendLinePushMessage({
        accessToken,
        userId: ownerLineId,
        messages: [{ type: "text", text: message }],
    });
}

/**
 * Ask owner for confirmation before sending
 */
export async function askOwnerConfirmation(
    accessToken: string,
    ownerLineId: string,
    employeeName: string,
    originalMessage: string,
    translatedMessage: string
): Promise<boolean> {
    const message = `📝 ${employeeName}さんへの返信を確認してください：

【あなたの入力】
${originalMessage}

【AI翻訳後】
${translatedMessage}

━━━━━━━━━━━━
✅ 送信する → 「はい」と返信
✏️ 修正する → 修正内容を入力
❌ キャンセル → 「キャンセル」と返信`;

    return sendLinePushMessage({
        accessToken,
        userId: ownerLineId,
        messages: [{ type: "text", text: message }],
    });
}

/**
 * Notify owner that message was sent
 */
export async function notifyOwnerMessageSent(
    accessToken: string,
    ownerLineId: string,
    employeeName: string
): Promise<boolean> {
    const message = `✅ ${employeeName}さんにメッセージを送信しました。`;

    return sendLinePushMessage({
        accessToken,
        userId: ownerLineId,
        messages: [{ type: "text", text: message }],
    });
}

/**
 * Notify owner that reply was cancelled
 */
export async function notifyOwnerCancelled(
    accessToken: string,
    ownerLineId: string
): Promise<boolean> {
    const message = `❌ 返信をキャンセルしました。`;

    return sendLinePushMessage({
        accessToken,
        userId: ownerLineId,
        messages: [{ type: "text", text: message }],
    });
}
