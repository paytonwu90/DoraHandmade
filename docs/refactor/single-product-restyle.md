# SingleProduct 頁面樣式重構記錄

**涉及檔案**
- `src/pages/frontend/SingleProduct.jsx`
- `src/assets/scss/pages/_singleProduct.scss`

**背景**
原版本由其他人撰寫，此次由 Payton 依設計稿與個人審美重新整理。

---

## 待改項目

> 逐條填入後，完成的打 ✅，放棄的打 ❌ 並補說明。

| # | 項目 | 狀態 | 備註 |
|---|------|------|------|

---

## MessageToast 優化討論

**涉及檔案**：`src/components/MessageToast.jsx`、`src/slice/messageSlice.js`

### 現況問題

截圖觀察（2026-06-09）：

1. **色彩與網站不協調** — 錯誤用 `bg-orange`（`#fd7e14`），在粉色系網站裡非常突兀；成功用 `bg-primary` 飽和度偏高，兩者都像後台系統 alert 而非前台通知。
2. **Header / Body 雙層結構太笨重** — 「失敗」/「成功」標題列佔去一半面積，卻只有兩個字，資訊密度低，視覺像 Bootstrap admin template。
3. **無 icon，只用文字標題** — 現代 Toast 通常用 icon 取代文字標題，更直覺也更輕巧。

### 優化方向比較

#### 方向 A：左色邊卡片（推薦）

```
成功：▌粉色邊  ✓  商品已加入購物車！           [×]
失敗：▌紅色邊  ✗  商品載入失敗，請稍後再試     [×]
```

- 移除 header/body 雙層，改為單一白底卡片
- 左側 4px 色邊：成功用 `$primary`（粉色），失敗用 `$danger`（紅色）
- Lucide `CheckCircle` / `XCircle` icon 取代文字標題，icon 顏色跟隨色邊
- 加淡 `box-shadow` 讓 toast 從頁面浮起來
- **優點**：顏色只在 4px 邊條，紅色不搶眼但清楚區分；風格輕量現代
- **缺點**：無

#### 方向 B：淡色背景

```
成功：淡粉色底（$primary-100）  ✓  商品已加入購物車！           [×]
失敗：淡紅色底（$danger tint）  ✗  商品載入失敗，請稍後再試     [×]
```

- 移除雙層結構，整塊使用淡色背景
- **優點**：柔和，符合粉色系風格
- **缺點**：網站本身是粉色系，淡粉（成功）與淡紅（失敗）視覺上都偏粉，使用者難以快速區分成功／失敗

#### 方向 C：白底對齊 CartToast 風格

```
成功：白底  ✓（粉色 icon）  商品已加入購物車！           [×]
失敗：白底  ✗（紅色 icon）  商品載入失敗，請稍後再試     [×]
```

- 與 CartToast 視覺語言一致，全站統一感最強
- 靠 icon 顏色區分成功／失敗
- **優點**：整站最統一
- **缺點**：失敗訊息不夠醒目，差異僅靠 icon 顏色，訊息重要性不易察覺

---

> **採用方向 A。** 三個方向皆移除現有的 header/body 雙層結構，差異在於色彩處理方式。方向 A 的失敗狀態區分最清楚。

---

## 改動記錄

### 2026-06-05

- **#1** 重整 JSX container 結構：原本有 3 層巢狀 `.container`（麵包屑、商品詳情各一層），加上相關商品 section 內又有一個獨立 container，全部合併為最外層單一 `<div className="container mt-4">`。`<section>` 相關商品也收進同一 container（設計稿顯示無全寬需求）。順手修掉 `single-product` class 與 `mt-4` 重複出現的 bug，以及 `text-white ` 多餘空白。
- **#2** 最外層 container class 由 `mt-4` 改為 `pt-6 pt-lg-12`，底部 padding 移至相關商品 section 自行管理。
- **#5** 相關商品 `<section>` 由 `py-7` → `pt-10 pb-4 py-lg-12` → 最終 `pb-10 py-lg-12`，依設計稿區塊分界獨立控制上下間距。
- **#3** breadcrumb `<nav>` 新增 `className="mb-6"`，對齊設計稿中麵包屑與商品圖之間的間距。
- **#4** 將 Bootstrap `ol.breadcrumb` 替換為自訂 `div.breadcrumb-custom`，分隔符改用 `<ChevronRight size={16} />`，active 項目加上 `className="active" aria-current="page"`。SCSS 新增 `.breadcrumb-custom` 樣式，非 active 連結用 `$gray-400`，active 用 `$primary`，font-size `0.875rem`，font-weight `700`。同時修正分類連結路徑錯誤，新增 `CATEGORY_PATH_MAP` 對照表（`/category/蝴蝶結` → `/category/handmade/bow`）。

### 2026-06-06

- **#6** 相關商品區塊以 `ProductCard` 元件取代原本 60 行的 inline card 實作。移除 `handleToggleFavoriteRelated`（連同其 `showToast` bug）。收藏、購物車、連結全由 `ProductCard` 內部處理。欄數改為 `row-cols-1 row-cols-md-2 row-cols-lg-4`，與 `Home.jsx` 的 `ul/li` 模式一致。
- **#7** 主商品圖移除 hover 放大效果，class 由 `.image-hover` 改名為 `.product-img`。SCSS 改用 `aspect-ratio: 1/1`（手機）/ `5/3`（桌機 md 以上）搭配 `object-fit: cover` 正確裁切，移除無效的 `width: 636px` inline style。R4 視為刻意決策（hover 效果醜，主動移除）。
- **#8** 商品詳情 row 間距改為 `row-gap-6 pb-10 pb-lg-12`；商品描述改用 `.text-p-20`（20px regular）；價格改用 `.text-p-6-b`（28px bold），取代原本的 Bootstrap `fs-3 fw-bold`。
- **#9** 手機版收藏按鈕移除 `ms-auto`（父層 justify-content-between 已處理）、`d-block`（flex container 內無效）、`btn`（立即被其他 class 覆蓋）、`p-1`，改為 `d-flex p-3 border-0 bg-transparent`。
- **#10** 修正 `Home.jsx`（4 處）與 `SingleProduct.jsx` 的 `.text-p-28-b` → `.text-p-6-b`。`.text-p-28-b` 不存在於 `$font-sizes` map（28px 對應的 key 是 `6`），字體樣式原本靜默失效。
- **#11–15** 商品詳情區全面調整：欄位斷點 `col-md-6` → `col-lg-6`；移除 `img-fluid`；按鈕區改為手機各佔 50%（`flex-grow-1 flex-md-grow-0`）、新增 `.btn-compact-mobile`（手機 `padding-x: 0.75rem`，md 以上自動回復）；移除冗餘的全域 `button { border-radius: 0 }` 補丁；移除 `btn-sm`；價格行與 input 加 `mb-6`；修正 `mr-2` → `me-2`。
- **#16** 移除 `_singleProduct.scss` 死碼：`.product-card-sm`（含 hover）、`.card-title`、`.btn-add-cart-icon`（含 hover）、`.wishlist-btn`（含 hover），相關商品改用 `ProductCard` 後已無任何使用點。

### 2026-06-07

- 桌機版收藏按鈕 class 由 `.btn-add-cart` 改名為 `.btn-favorite`（語意錯誤修正，實際用途為收藏功能）。同步清理 SCSS 中由 Bootstrap `.btn` 已覆蓋的冗餘屬性（background、color、font-weight、border-radius: none），hover 色改用設計 token `$primary-700`。修正 JSX 中 `d-flex + d-md-block` 的顯示衝突 → `d-none d-md-flex`，移除 Heart icon 外層多餘的 `<span>` wrapper。
- **#18** 收藏按鈕改用 `HeartFill`/`Heart` 切換取代 `.is-favorite` CSS class，與 `ProductCard` 實作對齊。刪除 `_singleProduct.scss` 的 `.is-favorite` 規則，icon 間距改由父層 `gap-2` 統一控制。
- **#19** 桌機版收藏按鈕新增 `.is-favorited` 狀態 class：已收藏時文字改為 `$gray-400`、hover 改為 `$gray-600`，視覺上降低「取消收藏」誘惑力，避免與「加入收藏」hover 效果混淆。以 `--bs-btn-active-color` 覆蓋 Bootstrap mousedown 時的文字顏色重置。
- **#20** 商品詳情各區塊（商品介紹、商品特色、商品規格、保養與注意事項、貼心提醒）間距調整：區塊下方 `mb-5` → `mb-6 mb-md-8`；標題下方 `mb-3` → `mb-4`。
- **#21** 數量 counter 重整：`input-group` → `d-flex`（排版需求單純）；移除 inline style `width: 192px`，改以 `w-auto + size="2"` 控制 input 寬度；套用 `fw-bold fs-24`；SCSS 新增 `.qty-input` 隱藏原生上下箭頭、`.btn-qty` 修正 active 時黑框問題（以 `opacity: 0.5` 表示按壓感）。
- **#22** 數量 input 改為可直接輸入：新增 `qtyDisplay` state 分離顯示值與真實數量；`onChange` 即時 clamp 到 1–99；`onBlur` 空值或非數字時重設為 1；`onKeyDown` 攔截非數字輸入，同時放行瀏覽器快捷鍵與 Function key；IME 輸入（注音等）無法在 keydown 攔截，由 onBlur 兜底。

### 2026-06-08

- 移除 `handleAddToCartClick` wrapper：`CartActionContext.handleAddToCart` 已在內部 catch 中呼叫 `showCartToast`，不會 rethrow，外層 try/catch 永遠不會觸發，屬死碼。呼叫點改為直接呼叫 `handleAddToCart(product)`。一併移除未使用的 `showToast` 解構（Context 根本未導出此函式，解構後為 `undefined`，對應 Code Review R1）。
- 移除 `handleToggleFavoriteProduct` wrapper：決定收藏切換不顯示 toast（HeartFill/Heart 視覺切換已足夠回饋），wrapper 僅剩單行，直接 inline 為 `onClick={() => toggleFavoriteProduct(product)}`。
- **#23** 相關商品改為真實 API 資料：`Promise.all` 同時打 `/product/:id` 與 `/products/all`；過濾停用商品（`is_enabled`）與佔位商品（`is_placeholder`），與 `Products.jsx` 一致；同類別優先、排除自身，不足 4 筆再從其他類別補足；移除靜態假資料與 `product1–4` 圖片 import。
- **#24** `CartActionProvider.handleAddToCart` 新增 `qty` 參數（預設 1），回傳布林值表示成功與否；`handleBuyNow` 改為複用 `handleAddToCart(product, qty)`，成功後 `navigate("/cart")`，移除重複的 axios 呼叫與 `alert` 錯誤處理。
- **#25** 「加入購物車」與「立即購買」按鈕新增 `disabled={addingProductId != null}`；操作中顯示 loading 文字（「加入中…」／「處理中…」）並隱藏 icon，與 `ProductCard.jsx` 的防重複點擊規範對齊。同步更新 `AGENTS.md` 記錄全站統一寫法。

### 2026-06-09

- **#26** `catch` 中的 `alert("商品載入失敗，請稍後再試")` 改為 `showError(...)`（`useMessage` hook），與全站通知系統對齊。同步引入 `useMessage`，並將 `showError` 加入 `useEffect` dependency array。

---

## 已知問題 / 未來再看

> 本次暫不動但值得記一筆的事。

### `.breadcrumb-custom` 與 `.btn-compact-mobile` 位置

目前放在 `pages/_singleProduct.scss`，命名上偏通用。決定暫時留在此處，等其他頁面有相同需求時再搬到 `components/`。

### `_base.scss` 需要整理（獨立 branch）

`src/assets/scss/_base.scss` 是 Vite 建立專案時的預設 `index.css` 殘留，與 Bootstrap 有多處衝突，建議另開 branch 處理：

- **button 樣式**（`padding: 0.6em 1.2em`、`border-radius: 8px`、`background-color: #f9f9f9`）與 Bootstrap Reboot 衝突，造成所有按鈕需要額外用 `bg-transparent`、`border-0` 覆蓋
- **`:root` 區塊重複兩次**（L1–14 和 L16–29），內容完全相同
- **`@media (prefers-color-scheme: light)` 重複兩次**（L76–87 和 L89–100），內容完全相同
- **dark mode 預設值**（`color: rgba(255,255,255,0.87)`、`background-color: #242424`）對 light-only 網站沒有意義
- **`h1 { font-size: 3.2em }`** 覆蓋 Bootstrap 的 h1 樣式

Bootstrap Reboot 已處理大部分 reset 工作，`_base.scss` 只需保留 `body`、`#root` 的必要設定與 `.logo-title`。
