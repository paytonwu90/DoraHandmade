import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import axios from 'axios';
// import { Toast } from 'bootstrap';
// TODO: 考慮是否統一使用 import from 'bootstrap';
// https://chatgpt.com/share/6995f1df-8118-800e-b0ef-78fa5ced6b15
import { Toast } from "bootstrap/dist/js/bootstrap.bundle.min.js";
import CartToast from '@components/CartToast';
import { CartActionContext } from './CartActionContext';

const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

export function CartActionProvider({ children }) {
  const [addingProductId, setAddingProductId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const toastRef = useRef(null);
  const bsToastRef = useRef(null);
  const timeoutRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    bsToastRef.current = new Toast(toastRef.current, { autohide: false });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      bsToastRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!bsToastRef.current) return;
    if (showToast) {
      bsToastRef.current.show();
    }
    else {
      bsToastRef.current.hide();
    }
  }, [showToast]);

  // 路徑變動時關閉 toast
  useEffect(() => {
    setShowToast(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [location.pathname]);

  function showCartToast(message, isSuccess = true) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setShowToast(false);
      setTimeout(() => {
        setMessage(message);
        setIsSuccess(isSuccess);
        setShowToast(true);
        setHideTimeout();
      }, 300); // 等待隱藏動畫
    }
    else {
      setMessage(message);
      setIsSuccess(isSuccess);
      setShowToast(true);
      setHideTimeout();
    }

    function setHideTimeout() {
      timeoutRef.current = setTimeout(() => {
        setShowToast(false);
        timeoutRef.current = null;
      }, 5000);
    }
  }

  async function handleAddToCart(product, qty = 1) {
    if (addingProductId) return false; // 防止重複點擊
    setAddingProductId(product.id);

    try {
      const response = await axios.post(`${API_BASE}/api/${API_PATH}/cart`, {
        data: {
          product_id: product.id,
          qty, // 後端會自行判斷若商品已存在在購物車，則自動累加
        }
      });

      if (response.data.success) {
        showCartToast('商品已加入購物車！', true);
        return true;
      } else {
        showCartToast("商品加入失敗，請稍後再試！", false);
        return false;
      }
    } catch (error) {
      console.log(error);
      showCartToast("商品加入失敗，請稍後再試！", false);
      return false;
    } finally {
      setAddingProductId(null);
    }
  }

  const value = {
    addingProductId,
    handleAddToCart
  };

  return (
    <CartActionContext.Provider value={value}>
      {children}
      {/* 統一在這裡渲染 UI，這樣全站只會出現這一個元件 */}
      <CartToast ref={toastRef} message={message} isSuccess={isSuccess} />
    </CartActionContext.Provider>
  );
}
