---
description: 変更をビルド・コミット・プッシュしてVercelにデプロイ
---
// turbo-all

1. ビルド確認
```bash
cd /Users/MBP/Projects/Secretary && npm run build
```

2. 変更をステージング
```bash
cd /Users/MBP/Projects/Secretary && git add -A && git status
```

3. コミット（メッセージは変更内容に応じて調整）
```bash
cd /Users/MBP/Projects/Secretary && git commit -m "feat: 変更内容"
```

4. プッシュ（Vercelへ自動デプロイ）
```bash
cd /Users/MBP/Projects/Secretary && git push origin main
```

5. デプロイ確認
- 本番URL: https://secretary-delta.vercel.app
