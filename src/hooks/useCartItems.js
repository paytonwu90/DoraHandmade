import { useState, useRef, useCallback } from "react";
import axios from "axios";

const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

export function useCartItems({ setFinalTotal }) {
  const [cartData, setCartData] = useState([]);
  const [prevCartData, setPrevCartData] = useState([]);
  const [localQty, setLocalQty] = useState({});
  const [cartError, setCartError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const debounceRef = useRef({});

  // localQty 與 cartData 的同步邏輯
  //
  // 為什麼不用 useEffect？
  // useEffect 是在 React commit DOM 之後才執行，所以當 cartData 變動時，
  // 會先 render 一次（舊 localQty），再進 Effect 更新 localQty，再 render 一次。
  // 這種「Effect 裡呼叫 setState」的模式稱為 cascade render，
  // React 官方文件（You Might Not Need an Effect）明確建議避免。
  //
  // 正確做法：在 render 期間直接調整 state（Adjusting state during rendering）。
  // 當偵測到 cartData 已改變（cartData !== prevCartData），
  // 在同一次 render 中呼叫 setLocalQty，React 會丟棄這次 render 的輸出、
  // 立刻以新的 state 重新 render，整個過程只有一次 DOM commit，沒有 cascade。
  //
  // 同步規則：
  // - 新品項（不在 localQty 裡的）：初始化為伺服器的 qty
  // - 已追蹤的品項：保留 localQty 現有值，不覆寫
  //   （避免並發 API 回傳時，使用者正在點擊的數字被舊值閃回）
  // - 已從購物車刪除的品項：從 localQty 清除
  if (cartData !== prevCartData) {
    setPrevCartData(cartData);
    setLocalQty(prev => {
      const next = { ...prev };
      const cartIds = new Set(cartData.map(item => item.id));
      cartData.forEach(item => {
        if (!(item.id in next)) next[item.id] = item.qty;
      });
      Object.keys(next).forEach(id => {
        if (!cartIds.has(id)) delete next[id];
      });
      return next;
    });
  }

  const updateCartQty = useCallback(async (item, newQty) => {
    if (newQty < 1) return;
    setUpdatingId(item.id);
    try {
      await axios.put(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart/${item.id}`, {
        data: {
          product_id: item.product_id,
          qty: newQty,
        },
      });
      const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
      setCartData(response.data.data.carts ?? []);
      setFinalTotal(response.data.data.final_total);
      setCartError("");
    } catch (error) {
      console.error(error);
      setCartError("數量更新失敗，請稍後再試");
      setLocalQty(prev => ({ ...prev, [item.id]: item.qty }));
    }
    setUpdatingId(null);
  }, [setFinalTotal]);

  // debounce 版本的數量更新（+/- 按鈕用）
  const handleQtyChange = useCallback((item, newQty) => {
    if (newQty < 1) return;
    setLocalQty(prev => ({ ...prev, [item.id]: newQty }));
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    // 300ms 後才打 API
    debounceRef.current[item.id] = setTimeout(() => {
      updateCartQty(item, newQty);
    }, 300);
  }, [updateCartQty]);

  // input onBlur 時清掉 pending debounce，直接送 API
  const handleInputBlur = useCallback((item, value) => {
    const newQty = Math.max(1, Number(value) || 1);
    if (debounceRef.current[item.id]) {
      clearTimeout(debounceRef.current[item.id]);
      delete debounceRef.current[item.id];
    }
    setLocalQty(prev => ({ ...prev, [item.id]: newQty }));
    updateCartQty(item, newQty);
  }, [updateCartQty]);

  const removeCartItem = async (itemId) => {
    if (debounceRef.current[itemId]) {
      clearTimeout(debounceRef.current[itemId]);
      delete debounceRef.current[itemId];
    }
    setUpdatingId(itemId);
    try {
      await axios.delete(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart/${itemId}`);
      const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
      setCartData(response.data.data.carts ?? []);
      setFinalTotal(response.data.data.final_total);
      setCartError("");
    } catch (error) {
      console.error(error);
      setCartError("刪除商品失敗，請稍後再試");
    }
    setUpdatingId(null);
  };

  return {
    cartData, setCartData,
    localQty, setLocalQty,
    cartError, setCartError,
    updatingId,
    handleQtyChange,
    handleInputBlur,
    removeCartItem,
  };
}
