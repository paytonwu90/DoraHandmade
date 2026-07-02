---
description: 對目前 git 變更進行獨立程式碼審查，結果存入 .claude/reviews/。
---

請依照以下步驟執行 code review：

**1. 確認審查範圍**

依序嘗試，取第一個有內容的結果：
- `git diff --cached`（staged 變更）
- `git diff HEAD`（unstaged 變更）
- `git diff HEAD~1`（最近一個 commit）

若使用者在呼叫時有附上說明（例如指定檔案、commit range），以使用者提供的範圍為準。

**2. Spawn 審查 agent**

使用 Agent 工具（subagent_type: general-purpose）執行審查，prompt 包含以下內容：

- 完整 diff 內容
- 專案背景：React SPA（Vite）、Bootstrap 5 SCSS 客製化、React Hook Form、Axios、無測試框架
- 審查角色：你是一位資深工程師，正在做 code review。你對這份 diff 的作者一無所知，以獨立視角審查。
- 審查面向（依重要性排序）：
  1. 正確性與邏輯錯誤（包含邊界案例、非同步競態）
  2. 安全性（XSS、injection、敏感資料外露）
  3. 可維護性（命名清晰度、不必要的複雜度、重複邏輯）
  4. React 慣例（不必要的 re-render、副作用管理、key prop）
  5. 樣式與結構（僅針對 SCSS/JSX，冗餘 class、權重問題）
- 嚴重程度分級：🔴 Critical / 🟡 Significant / 🟠 Minor
- 輸出格式：Markdown，每個問題附上程式碼位置與修正建議
- 將報告儲存至 `.claude/reviews/<描述性 slug>-<YYYY-MM-DD>.md`
- 不得修改任何專案檔案

**3. 回報**

告知使用者 review 檔案路徑，並摘要最高優先級的問題。
