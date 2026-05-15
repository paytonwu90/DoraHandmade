# Design Specs 索引

設計稿參考截圖，供 Claude Code 在執行 `scripts/verify.js` 後對照視覺結果使用。

命名規則：`[元件].png`

---

## user-dropdown.png

左：無 hover 狀態的使用者選單（登入後）。
右：第一個 item（我的帳戶）hover 時，背景為 $primary-50 全寬淺粉紅色，文字維持深色。

對應 verify.js：`User Dropdown (Desktop)` 區段、`User Dropdown (Mobile)` 區段

---

## sort-dropdown.png

設計稿只包含未 hover 的狀態：下拉選單展開，顯示六個排序選項，無任何 item 被 hover。

hover 狀態預期比照 user-dropdown：底色為 $primary-50 全寬淺粉紅色，文字維持深色。

對應 verify.js：`Sort Dropdown` 區段（Desktop 1280px）
