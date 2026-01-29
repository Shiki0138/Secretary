---
description: LINE公式アカウントのWebhookをテスト
---
// turbo-all

## ローカルテスト（ngrok使用）

1. ngrokを起動
```bash
ngrok http 3000
```

2. LINE Developers ConsoleでWebhook URLを更新
https://developers.line.biz/console/

3. Webhook URL形式:
`https://xxx.ngrok.io/api/line/webhook`

## 本番環境

- Webhook URL: https://secretary-delta.vercel.app/api/line/webhook
- Channel ID: 環境変数 LINE_CHANNEL_ID
- Channel Secret: 環境変数 LINE_CHANNEL_SECRET
- Access Token: 環境変数 LINE_CHANNEL_ACCESS_TOKEN

## テストメッセージ送信

LINE公式アカウントに以下を送信してテスト:
- 招待コード入力: `ABC12XYZ`（8桁英数字）
- 規則に関する質問: `有給休暇は何日ありますか？`
- 通常メッセージ: `こんにちは`
