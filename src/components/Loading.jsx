import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
/**
 * Loading 元件 — 通用資料載入中畫面
 *
 * Props:
 *   isLoading  {boolean}  是否顯示 loading（預設 true）
 *   text       {string}   自訂提示文字（預設「資料載入中」）
 *   fullPage   {boolean}  是否覆蓋整個視窗（預設 false，僅填滿父容器）
 *
 * 使用範例：
 *   <Loading isLoading={isLoading} />
 *   <Loading isLoading={isLoading} text="訂單處理中" fullPage />
 */
function Loading({ isLoading = true, text = "資料載入中", fullPage = false }) {
  const [dots, setDots] = useState("");

  // 動態省略號
  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "．"));
    }, 450);
    return () => clearInterval(id);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className={`loading-overlay ${fullPage ? 'full-page' : ''}`} role="status" aria-live="polite">
      {/* 旋轉圖示 */}
      <div className="loading-spinner">
        {/* 外圈旋轉環 */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            className="spinner-circle-bg"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            className="spinner-circle"
          />
        </svg>

        {/* 旋轉圖示 */}
        <div className="spinner-icon-wrapper">
          <Loader2 size={32} className="spinner-icon" />
        </div>
      </div>

      {/* 提示文字 */}
      <p className="loading-text">
        {text}
        <span className="loading-dots">{dots}</span>
      </p>

    </div>
  );
}

export default Loading;