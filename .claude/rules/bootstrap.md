---
paths:
  - "**/*.scss"
  - "**/*.jsx"
---

**色彩與設計 Token** — 處理樣式相關任務前，先讀取 `src/assets/scss/abstract/_variables.scss` 確認主色、輔助色與間距等設計 token。

**Bootstrap 元件分析** — 分析或比較任何 Bootstrap 元件（按鈕、表單、間距等）的行為或樣式前，**必須先讀取 `src/assets/scss/abstract/_variables.scss` 的相關設定**，確認專案是否已覆寫 Bootstrap 預設值（如 `$btn-border-radius`、`$btn-padding-y` 等），再下結論。不得假設 Bootstrap 預設值未被修改。

**Bootstrap Utility Class 生成範圍** — 新增任何顏色相關的 utility class（`bg-*`、`border-*`、`text-*`）前，**必須先確認 `$theme-colors` map（`_variables.scss` L346 附近）**，若目標顏色已在 map 中，Bootstrap 會自動生成對應的 utility class，不需在 `_utilities.scss` 重複定義。

**Bootstrap Grid 冗餘 class** — 不得寫 `col-{breakpoint}-12`。Bootstrap 的 col 在未指定的 breakpoint 以下預設即為 100% 寬，`col-sm-12` 等寫法是冗餘的。寫 code 或 review 時一律移除。

**Typography** — 字體 class 來源有三層，優先順序由高到低：
1. **Bootstrap 原生 `fs-*`**：由 `$font-sizes` map 自動生成（key 對應 1–6 及專案自訂的 24、20、16、14），只設 `font-size`，無其他副作用。需要單純設定字體大小時優先考慮。
2. **舊系統**（`src/assets/scss/abstract/_variables.scss` 約 L726）：生成 `.text-p-{size-key}` 與 `.text-p-{size-key}-{b/r}`；size-key 同上；weight suffix：`b` = 700、`r` = 400。會附帶 `line-height` 等字型屬性。
3. **新系統**（`src/assets/scss/_fonts.scss`）：生成 `.t-{name}`（如 `.t-section-title`）、`.t-h-{1-6}`、`.t-p-{l/m/r/s}`。語意最明確，用於排版層級明確的場合。
