---
description: ローカル開発サーバーを起動
---
// turbo-all

1. 既存のポート3000を解放
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
```

2. 開発サーバーを起動
```bash
cd /Users/MBP/Projects/Secretary && npm run dev
```

3. ブラウザで確認
- Dashboard: http://localhost:3000/dashboard?demo=true
- Login: http://localhost:3000/login
- Signup: http://localhost:3000/signup
