---
description: "分析 staged 變更，產生 conventional commits 格式的 commit message"
---

分析目前 staged 的 git 變更，產生一個合適的 commit message。

規則：
- 不執行 `git add`，只針對已 staged 的檔案
- 使用 conventional commits 格式（feat / fix / docs / refactor 等），**不加 scope**
- 第一行不超過 72 字元
- 用正體中文撰寫
- 在第一行後加上 body，格式依變更性質決定：
  - 單一目的的變更：用段落說明「為什麼」，不超過 3 行
  - 多個獨立變更：用 bullet point 條列各項變更
- Body 換行以**句點**為單位，不以字元數截斷；一句話寫完再換行

前置檢查：
- 若 staged 的檔案混合了性質不同的變更（例如：code 修正 + 文件更新、功能開發 + refactor），**先提出建議拆分成多個 commit**，等使用者決定後再繼續

輸出格式：
- 只輸出 commit message 的文字內容，讓使用者審核
- **不執行 `git commit`**，等使用者確認後才由使用者或下一步執行
