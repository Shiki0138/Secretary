import { getUserByLineId, getOrganization } from "@/services/user.service";
import { translateEmployeeToOwner } from "@/core/translation-engine";
import { isRAGQuestion } from "@/core/rag-engine";
import { answerQuestion } from "@/services/rag.service";
import { createConversation, addMessage } from "@/services/conversation.service";

/**
 * LINE Bot Service
 * Handles LINE messaging logic
 */

const LINE_API_BASE = "https://api.line.me/v2/bot";

// Send reply message (free)
export async function sendReply(
    replyToken: string,
    messages: Array<{ type: string; text: string }>,
    channelAccessToken: string
): Promise<void> {
    await fetch(`${LINE_API_BASE}/message/reply`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({ replyToken, messages }),
    });
}

// Send push message (costs money)
export async function sendPush(
    userId: string,
    messages: Array<{ type: string; text: string }>,
    channelAccessToken: string
): Promise<void> {
    await fetch(`${LINE_API_BASE}/message/push`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({ to: userId, messages }),
    });
}

// Send multicast to multiple users (for announcements)
export async function sendMulticast(
    userIds: string[],
    messages: Array<{ type: string; text: string }>,
    channelAccessToken: string
): Promise<void> {
    await fetch(`${LINE_API_BASE}/message/multicast`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({ to: userIds, messages }),
    });
}

// Process incoming message
export async function processMessage(
    lineUserId: string,
    messageText: string,
    replyToken: string,
    channelAccessToken: string
): Promise<void> {
    try {
        // Find user
        const user = await getUserByLineId(lineUserId);

        if (!user) {
            await sendReply(replyToken, [{
                type: "text",
                text: "アカウントが登録されていません。管理者にお問い合わせください。",
            }], channelAccessToken);
            return;
        }

        // Get organization
        const org = await getOrganization(user.org_id);
        if (!org) {
            await sendReply(replyToken, [{
                type: "text",
                text: "組織情報が見つかりません。管理者にお問い合わせください。",
            }], channelAccessToken);
            return;
        }

        // Check if this is a RAG question (about rules/policies)
        if (isRAGQuestion(messageText)) {
            // Answer using RAG
            const ragResult = await answerQuestion(user.org_id, messageText);

            let responseText = ragResult.answer;

            if (ragResult.needsHumanReview) {
                responseText += "\n\n※ この回答はAIによるものです。詳細は経営者に直接ご確認ください。";
            }

            await sendReply(replyToken, [{
                type: "text",
                text: responseText,
            }], channelAccessToken);
            return;
        }

        // Otherwise, treat as a consultation (translate and forward to owner)
        const translationResult = await translateEmployeeToOwner(messageText);

        if (translationResult.clarificationNeeded && translationResult.clarificationQuestion) {
            // Need clarification from employee
            await sendReply(replyToken, [{
                type: "text",
                text: `確認させてください。\n\n${translationResult.clarificationQuestion}`,
            }], channelAccessToken);
            return;
        }

        // Create conversation and message
        const conversation = await createConversation(
            user.org_id,
            user.id,
            translationResult.summary
        );

        await addMessage(
            user.org_id,
            conversation.id,
            user.id,
            "employee_to_owner",
            messageText, // Original text (private)
            translationResult.translatedText // Translated text (visible to owner)
        );

        // Confirm to employee
        await sendReply(replyToken, [{
            type: "text",
            text: `ご相談を受け付けました。\n\n【送信内容】\n${translationResult.translatedText}\n\n経営者からの返信をお待ちください。`,
        }], channelAccessToken);

        // TODO: Notify owner via dashboard/push notification

    } catch (error) {
        console.error("Message processing error:", error);
        await sendReply(replyToken, [{
            type: "text",
            text: "申し訳ございません。エラーが発生しました。しばらく経ってからもう一度お試しください。",
        }], channelAccessToken);
    }
}

// Handle follow event (new user registration)
export async function handleFollow(
    lineUserId: string,
    replyToken: string,
    channelAccessToken: string
): Promise<void> {
    const user = await getUserByLineId(lineUserId);

    if (user) {
        await sendReply(replyToken, [{
            type: "text",
            text: `おかえりなさい、${user.display_name}さん！\n\nご質問やご相談があれば、いつでもメッセージをお送りください。`,
        }], channelAccessToken);
    } else {
        await sendReply(replyToken, [{
            type: "text",
            text: "ご登録ありがとうございます！\n\nこのアカウントを利用するには、管理者による登録が必要です。\n\n管理者にLINE連携の依頼をしてください。",
        }], channelAccessToken);
    }
}
