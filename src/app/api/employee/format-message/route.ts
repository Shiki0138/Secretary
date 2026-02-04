import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * メッセージ整理API
 * 従業員のメッセージをAIで整理して返す
 */

export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
        }

        const formattedMessage = await formatMessageForOwner(message);

        return NextResponse.json({
            success: true,
            formattedMessage,
        });
    } catch (error) {
        console.error("Format message error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
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

    // 今日から14日間の日付を生成
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
