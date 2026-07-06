# DoraHandmade

串接兩個獨立後端的手工飾品電商 SPA，部署至 GitHub Pages。

**線上預覽：** https://paytonwu90.github.io/DoraHandmade/

## 技術選擇與決策原因

### `createHashRouter`，而非 `createBrowserRouter`

GitHub Pages 是純靜態託管，沒有 server 端 rewrite，`createBrowserRouter` 在子路徑重新整理會 404，因此選擇 `createHashRouter`。

### Redux 只管 Toast，其餘業務狀態用 Context

Redux（RTK）只負責一個全域訊息佇列（API 成功/失敗提示，3 秒自動消失）；購物車、使用者驗證、收藏清單等需要持久化到 `localStorage` 的業務狀態，則用 Context 管理，省去額外的 action/reducer 模板。

### 收藏功能用 Context + `localStorage`，而非後端持久化

六角學院電商 API 沒有提供收藏相關端點，考量專題截止日，組員沒有額外為此功能建置 PHP 後端。因此商品與文章的收藏分別用獨立的 Context（`FavoriteProductsContext`、`FavoriteArticlesContext`）管理，狀態持久化到 `localStorage`，換取不依賴後端也能運作的收藏功能。

## 實作細節

### 購物車數量更新：debounce + `updatingId` 防止 race condition

+/- 按鈕觸發的數量變更不會立即打 API，而是用 debounce（300ms）合併連續點擊；輸入框則在 `onBlur` 時清掉待送出的 debounce、直接呼叫 API，避免舊的 debounce 呼叫在 blur 已送出新數字之後才執行，用過期的數值把畫面覆蓋回去。同時用 `updatingId` 標記當前正在更新的品項並在 API 回應前 disable 對應操作，避免同一品項的請求互相搶跑。

### 整合兩套獨立後端，分開管理驗證狀態

商品、購物車、訂單、優惠券走六角學院電商 API；使用者驗證（註冊、登入、登出、Google OAuth）則串接組員另外用 PHP + MySQL 建置的 API。兩套系統的驗證狀態分開處理：後台管理員 token 存在 Cookie 並設為 Axios 預設 header，前台使用者登入資訊則存在 `localStorage`。

### 優惠券折扣未套用至後續新增商品

六角學院電商 API 的 coupon 折扣是 item-level，只對呼叫 `POST /coupon` 當下已在購物車裡的品項生效，之後新增的商品不會套用折扣，且後端無法修改此行為。因此在購物車資料載入完成後，偵測是否已有套用中的 coupon，若有則重新呼叫一次套用，讓後端對所有品項重新計算折扣。重新套用的過程包在既有的 loading overlay 內，避免使用者看到「正在套用...」的畫面閃爍；`cartData` 與 `finalTotal` 也統一從同一次 cart re-fetch 賦值，不使用 coupon API 回應的快照，確保兩者資料一致。

### 抽出 RecipientSelectorContent 共用元件

購物車頁面原本有 Modal（桌機版）和 Offcanvas（手機版）兩套幾乎相同的常用收件人選擇 UI，分開維護容易造成不一致，因此抽成 `RecipientSelectorContent` 共用元件，透過 `variant` prop 處理 modal / offcanvas 的細節差異；響應式切換也改用 Bootstrap 的 CSS breakpoint class（`d-none d-md-block` / `d-md-none`）控制觸發按鈕的顯示，取代原本用 JS 判斷螢幕寬度的邏輯。重構過程中一併修掉了幾個既有 bug（Esc 無法關閉 Modal、backdrop 點擊後新增表單未重設、重開時未恢復上次選取狀態等），並補上 Playwright 腳本（`scripts/verify.js`）驗證表單驗證與重設邏輯，確保重構後行為正確。

### 訊息通知系統：用 `createAsyncThunk` 包裝 `setTimeout` 副作用

Reducer 必須是同步純函式，無法直接包含 `setTimeout`，因此用 `createAsyncThunk` 包一層，dispatch 後再排定 3 秒後移除訊息。訊息 id 用 RTK 自動產生的 `requestId`（nanoid），而非 `Date.now()`，避免連續觸發時毫秒撞名、`removeMessage` 找錯目標。

## 已知限制

- **API 呼叫直接寫在各元件的 `useEffect` 裡**，沒有抽出獨立的 service layer。專題時程有限，優先把功能做出來；如果專案要繼續發展，會考慮把重複的 API 呼叫邏輯（如 base URL、header 設定）整理成統一的 service 層，減少各頁面重複的樣板程式碼。
- **沒有導入正式的測試框架**（如 Vitest、`@playwright/test`）。UI 改動目前用手動執行的 Playwright 腳本（`scripts/verify.js`）做視覺與行為驗證，未整合進 CI 自動執行；後續若功能持續增加，會考慮導入正式框架並接上 CI。
