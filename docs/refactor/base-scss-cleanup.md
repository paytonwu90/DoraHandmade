# _base.scss 清理記錄

**涉及檔案**：`src/assets/scss/_base.scss`、`src/assets/scss/components/_productCard.scss`、`src/components/ProductCard.jsx`

## 背景

`_base.scss` 是 Vite 建立專案時的預設 `index.css` 殘留，與 Bootstrap 有多處衝突。

## 處理項目

- ✅ **`button` 樣式衝突**：移除 `border-radius: 8px`、`padding`、`background-color` 等全域覆蓋，只留 `border: none` 移除瀏覽器預設邊框
- ✅ **`:root` 區塊重複**：移除重複的第二個 `:root` 區塊
- ✅ **`@media (prefers-color-scheme: light)` 重複且多餘**：兩個重複區塊全數移除；light-only 網站不需要此 media query
- ✅ **dark mode 預設值**：移除 `color-scheme: light dark`、`color: rgba(255,255,255,0.87)`、`background-color: #242424`
- ✅ **`h1 { font-size: 3.2em }`**：移除，Bootstrap 自行處理 h1 樣式
- ✅ **冗餘屬性**：移除 `:root` 的 `font-family`、`line-height`、`font-weight`（Bootstrap 已透過變數設定）；移除 `#root {}`（div 預設即 100% 寬、無 margin）；移除未使用的 `.logo-title`

## 最終保留內容

```scss
:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
}

a { ... }   // 連結顏色使用設計 token

button {
  border: none;
}
```

## 連帶修正

清理過程中發現 `ProductCard` 的心型按鈕白底依賴全域 `button { background-color: #f9f9f9 }`（隱性耦合），且 `bg-gray-50` class 從未被定義。一併修正：
- `_productCard.scss` 的 `.product-card__like button` 補上明確的 `background-color: rgba(255, 255, 255, .95)`
- `ProductCard.jsx` 移除不存在的 `bg-gray-50` class

## 相關 commit

- `cc4b42c` refactor: 清理 _base.scss Vite 殘留樣式，修正按鈕預設干擾
