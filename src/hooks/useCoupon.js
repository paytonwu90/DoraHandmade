import { useState } from "react";
import axios from "axios";

const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

export function useCoupon({ setCartData, setFinalTotal }) {
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState({ message: "", type: "" });
  const [showCouponList, setShowCouponList] = useState(false);

  const applyCoupon = async (codeOverride) => {
    const code = codeOverride ?? couponCode;
    if (!code) return;
    setCouponStatus({ message: "正在套用...", type: "" });
    try {
      const response = await axios.post(`${VITE_API_BASE}/api/${VITE_API_PATH}/coupon`, {
        data: { code },
      });
      setCouponStatus({ message: response.data.message || "優惠券已套用！", type: "success" });
      // coupon API 的折扣是 item-level，套用後 item 會多出 coupon 欄位且 final_total 更新。
      // re-fetch 確保 cartData 與伺服器狀態同步，也讓 cartData 與 finalTotal 來自同一份快照。
      const cartRes = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
      setCartData(cartRes.data.data.carts ?? []);
      setFinalTotal(cartRes.data.data.final_total);
    } catch {
      setCouponStatus({ message: "優惠券無效或已使用。", type: "danger" });
    }
  };

  return {
    couponCode, setCouponCode,
    couponStatus,
    showCouponList, setShowCouponList,
    applyCoupon,
  };
}
