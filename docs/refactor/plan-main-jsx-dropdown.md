# 待辦計畫：移除 main.jsx 全域 Dropdown Handler

> **狀態：已完成（2026-06-01）**

## 背景問題

`main.jsx` 目前有一段 lines 10–39 的全域 click 監聽器（capture 階段），處理 `data-bs-toggle="dropdown"` 的開關與點外部關閉邏輯。問題：

1. **位置不對**：`main.jsx` 只應做 app 掛載，業務邏輯不屬於這裡
2. **DOM 與 React state 脫鉤**：直接操作 `.show` class，React 不知道開關狀態
3. **殘留 `console.log`**（line 13）需清除
4. **模式不一致**：商品分類選單和排序下拉已用 `useRef` + React state，只剩 Header 兩個使用者選單還用 `data-bs-toggle`

## 完成項目

- `src/main.jsx` — 全域 handler 已刪除，`StrictMode` 未使用 import 已移除
- `src/components/Header.jsx` — 使用者選單改用 `isUserMenuOpen` state + `useRef` click-outside；desktop toggle 從 `<a>` 改為 `<button>`；移除 `data-bs-toggle` 依賴；移除 `console.log`
- `scripts/verify.js` — user-dropdown selector 更新為直接子元素選擇器（`> button`）
- `handleUserMenuEnter` 與 `.user-menu-left` 移除，改由 `data-bs-popper="static"` 讓 Bootstrap CSS 定位規則直接生效

## 相關 commit

- `refactor: 將使用者選單改為 React state，移除 main.jsx 全域 handler`
- `refactor: 移除 handleUserMenuEnter 與 .user-menu-left，由 Bootstrap CSS 負責定位`
