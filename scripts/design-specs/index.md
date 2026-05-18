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

---

## category-dropdown-mobile.png

手機版「商品分類」dropdown 展開，「材料」submenu 打開的狀態。
第一層 item（全部商品、成品、材料）靠左對齊；submenu 項目（帶子、夾子、貼片）有左側粉紅色 accent border，並縮排靠左對齊。

對應 verify.js：`Category Dropdown (Mobile)` 區段

---

## category-dropdown-desktop.png

桌面版「商品分類」dropdown 展開，hover 到「材料」時 submenu 向左浮出的狀態。
hover 的 item 背景為 $primary-50，submenu 以 Bootstrap 預設浮動樣式呈現。

對應 verify.js：`Category Dropdown (Desktop 1024px)` 區段（向左展開）、`Category Dropdown (Desktop 1920px)` 區段（向右展開）
