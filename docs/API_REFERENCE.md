# AI翻訳秘書 API リファレンス

最終更新日: 2026-01-24

---

## 認証

すべてのAPIは認証が必要です（`/api/line/webhook` を除く）。

### ヘッダー

```
Authorization: Bearer <supabase-jwt-token>
```

---

## エンドポイント一覧

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/translate` | 必要 | メッセージ翻訳 |
| GET/PATCH | `/api/conversations` | 必要 | 会話管理 |
| GET/POST | `/api/announcements` | 必要 | 全社通知 |
| GET/POST | `/api/shifts` | 必要 | シフト管理 |
| GET/POST | `/api/documents/acknowledge` | 必要 | 規則確認 |
| POST | `/api/line/webhook` | 署名 | LINE Webhook |
| POST | `/api/analyze` | 必要 | メッセージ分析 |

---

## POST /api/translate

メッセージを翻訳します。

### リクエスト

```json
{
  "text": "今月のシフト多すぎ！少し減らしてもらえませんか？",
  "direction": "employee_to_owner"
}
```

### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| text | string | ✓ | 翻訳するテキスト |
| direction | string | ✓ | `employee_to_owner` または `owner_to_employee` |

### レスポンス

```json
{
  "success": true,
  "data": {
    "originalText": "今月のシフト多すぎ！少し減らしてもらえませんか？",
    "translatedText": "今月のシフトについてご相談があります。可能であれば、一部調整いただけると助かります。",
    "summary": "シフト調整の相談",
    "clarificationNeeded": false
  }
}
```

---

## GET /api/conversations

会話一覧を取得します。

### クエリパラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| status | string | - | フィルター: `open`, `pending`, `resolved`, `closed` |
| conversationId | string | - | 特定の会話のメッセージを取得 |

### レスポンス（一覧）

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "subject": "シフト調整の相談",
        "status": "open",
        "employee_id": "uuid",
        "created_at": "2026-01-24T10:00:00Z",
        "updated_at": "2026-01-24T10:30:00Z"
      }
    ]
  }
}
```

---

## PATCH /api/conversations

会話のステータスを更新します。

### リクエスト

```json
{
  "conversationId": "uuid",
  "status": "resolved"
}
```

---

## GET /api/announcements

通知一覧を取得します。

### レスポンス

```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "uuid",
        "title": "年末年始のスケジュール",
        "translated_text": "12月29日から...",
        "published_at": "2026-01-24T09:00:00Z",
        "readCount": 8,
        "totalCount": 10
      }
    ]
  }
}
```

---

## POST /api/announcements

通知を作成・配信します。

### リクエスト

```json
{
  "title": "新しいお知らせ",
  "originalText": "来週から新しい制服になります",
  "translatedText": "来週より制服が新しくなります。ご確認ください。"
}
```

---

## GET /api/shifts

シフト情報を取得します。

### クエリパラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| userId | string | ✓ | ユーザーID |
| startDate | string | - | 開始日（YYYY-MM-DD） |
| endDate | string | - | 終了日（YYYY-MM-DD） |

---

## POST /api/shifts

シフト希望を提出します。

### リクエスト

```json
{
  "requests": [
    {
      "date": "2026-02-01",
      "preference": "full",
      "notes": "午後は外せない用事があります"
    }
  ]
}
```

### preference の値

| 値 | 説明 |
|----|------|
| full | 終日（9:00-18:00） |
| morning | 午前のみ（9:00-13:00） |
| afternoon | 午後のみ（13:00-18:00） |
| off | 休み希望 |

---

## POST /api/documents/acknowledge

規則確認署名を送信します。

### リクエスト

```json
{
  "documentId": "uuid"
}
```

---

## POST /api/line/webhook

LINE Messaging API からのイベントを受信します。

### 認証

LINE署名検証（`x-line-signature` ヘッダー）

### サポートイベント

| イベント | 処理 |
|---------|------|
| message | メッセージ処理・翻訳 |
| follow | 新規ユーザー登録案内 |
| unfollow | ログ記録 |

---

## エラーレスポンス

### 形式

```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### ステータスコード

| コード | 説明 |
|--------|------|
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | 権限なし |
| 404 | リソースなし |
| 500 | サーバーエラー |

---

以上
