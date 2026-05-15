# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
npm run dev        # 啟動 Vite 開發伺服器
npm run build      # 建置正式環境（輸出至 dist/）
npm run preview    # 本地預覽正式建置結果
npm run lint       # 執行 ESLint 靜態分析
npm run deploy     # 將 dist/ 部署至 GitHub Pages（gh-pages 分支）
```

專案目前**未設定測試框架**。

## 視覺驗證

修改 UI 元件後，用 Playwright 截圖確認視覺結果是否符合設計稿：

```bash
node scripts/verify.js                  # 全跑
node scripts/verify.js user-dropdown    # 只跑 User Dropdown（Desktop + Mobile）
node scripts/verify.js sort-dropdown    # 只跑 Sort Dropdown
```

- 截圖輸出至 `scripts/screenshots/`（已 gitignore）
- 設計稿參考截圖與說明：`scripts/design-specs/index.md`
- 執行後讀取對應的 zoom 截圖，與 `design-specs/` 中的設計稿比對

## 架構概覽

**DoraHandmade** 是一個以 React SPA 建置的手工蝴蝶結飾品電商網站，使用 Vite 建置，部署至 GitHub Pages（base path：`/DoraHandmade/`）。

### 路由

使用 `createHashRouter`（Hash-based 路由），所有路由定義於 [src/routes/index.jsx](src/routes/index.jsx)。

- **前台路由**（`/`）— 由 `FrontendLayout` 包裝：首頁、商品列表、商品詳情、購物車、客製化訂單、訂單列表、登入、會員帳號、我的收藏、文章、FAQ、工作坊、關於本店
- **後台路由**（`/admin`）— 由 `BackendLayout` 包裝（需登入）：Dashboard、商品管理、訂單管理、優惠券管理

### 狀態管理：兩套系統並行

1. **Redux（RTK）** — 僅用於全域訊息提示 Toast（`src/slice/messageSlice.js`）。訊息 3 秒後自動消失，透過 `useMessage` hook 存取。

2. **React Context API** — 管理業務邏輯狀態，全部在 `FrontendLayout` 中初始化：
   - `UserContext` — 使用者驗證狀態，持久化至 `localStorage`（key：`doraUser`）
   - `CartActionContext` — 購物車操作，搭配 Bootstrap Toast 通知
   - `FavoriteProductsContext` / `FavoriteArticlesContext` — 持久化至 `localStorage`

### API 連線

專案串接**兩個獨立後端**：
- **六角學校電商 API**（`VITE_API_BASE` + `VITE_API_PATH`）— 商品、購物車、訂單、優惠券、後台 CRUD
- **自建 PHP/MySQL API**（`roc-central-ai-edu.org/api/`）— 使用者驗證（signup、login、logout、user_check、Google OAuth）

管理員的 auth token 儲存於 Cookie（`hexToken`），並設為 Axios 的 default header。使用者驗證資訊儲存於 `localStorage`（key：`doraUser`）。

**無集中式 API 服務層**，所有 API 呼叫直接寫在各元件的 `useEffect` 中。

### 樣式

採用 SCSS 7-1 架構，位於 `src/assets/scss/`：
- `abstract/` — `_variables.scss` 是核心設計 token 檔（色彩系統、字體排版、間距），內容超過 5000 行
- `components/` — 各元件的 SCSS 分片
- `pages/` — 各頁面的 SCSS 分片
- `all.scss` — 主進入點，負責 import 所有分片

Bootstrap 5 透過 SCSS 變數覆寫方式客製化。自訂工具類別如 `.text-p-28-b`（段落 28px 粗體）和 `.btn-dora` 定義於 abstract 層。

### Vite 路徑別名（vite.config.js）

```
@           → src/
@components → src/components/
@hooks      → src/hooks/
@contexts   → src/contexts/
@images     → src/assets/images/
@utils      → src/utils/
@data       → src/data/
```

### 值得注意的設計模式

**Bootstrap Dropdown 修正** — `main.jsx` 手動綁定 click 事件監聽器，修正 Bootstrap 5 下拉選單在 React SPA 環境中的觸發問題。

**客製化訂單流程** — `CustomForm.jsx` 使用 Uploadcare 上傳圖片，並將結構化訊息字串作為「佔位商品」提交訂單。詳見 `custom-order-flow.md`。

**通知系統** — 專案同時使用三種提示機制：
1. Redux `MessageToast` — API 回應的成功／錯誤訊息
2. Bootstrap Toast（`CartActionContext`）— 加入購物車的即時回饋
3. SweetAlert2（`src/utils/sweetAlert.js`）— 刪除等操作的確認對話框

**收藏功能** — 商品與文章的收藏僅存於 `localStorage`，無後端持久化，由各 Context Provider 管理同步。

**文章內容** — 文章資料為靜態資料，定義於 `src/data/articles.js`，非從 API 取得。

**色彩與設計 Token** — 處理樣式相關任務前，先讀取 `src/assets/scss/abstract/_variables.scss` 確認主色、輔助色與間距等設計 token。
