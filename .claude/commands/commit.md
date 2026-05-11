---
description: "分析 staged 變更，產生 conventional commits 格式的 commit message"
---

分析目前 staged 的 git 變更，產生一個合適的 commit message。

規則：
- 只針對 staged 的檔案
- 使用 conventional commits 格式（feat / fix / docs / refactor 等）
- 第一行不超過 72 字元
- 用正體中文撰寫
- 在第一行後加上 body，簡短說明「為什麼」要做這個變更，保持簡潔，不超過 3 行
