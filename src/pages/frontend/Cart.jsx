import axios from "axios";
import OrderToast from "@components/OrderToast";
import Loading from "@components/Loading";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { Minus, Plus, TriangleAlert, X } from "lucide-react";
import { currency } from "@utils/filter";
import * as bootstrap from "bootstrap";
import { emailValidation, twPhoneValidation } from "@utils/validation";
import { useEcpay } from "@hooks/useEcpay";
import RecipientPicker from "@components/RecipientPicker";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

// 六角學院未提供前台 GET coupon API，暫時寫死可用的優惠券清單
const availableCoupons = [
    { name: "618年中慶", code: "happy2026618", discount: "9折" },
    { name: "新會員折扣",   code: "newmember",   discount: "95折" },
];


function Cart() {
    const [ cartData, setCartData ] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // ── 新增：每個 item 的本地數量暫存 ──
    const [localQty, setLocalQty] = useState({});
    const [cartError, setCartError] = useState("");
    const debounceRef = useRef({});
    // 新品項才初始化 localQty，已追蹤的不覆寫（避免並發 API 回傳時閃回舊值）；
    // 同時清除已從購物車移除的品項
    useEffect(() => {
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
    }, [cartData]);
    const [deliveryMethod, setDeliveryMethod] = useState("familyMart");
    const [ updatingId, setUpdatingId ] = useState(null);
    // 優惠券、運費等狀態可在此新增
    const [ couponCode, setCouponCode ] = useState("");
    const { selectedStore, setSelectedStore, openCvsMap } = useEcpay();
    const [ couponStatus, setCouponStatus ] = useState({ message: "", type: "" });
    const [ showCouponList, setShowCouponList ] = useState(false);

    // 折扣後的金額
    const [finalTotal, setFinalTotal] = useState(0);
    // useForm 表單驗證
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset,
        watch,
        setValue,
    } = useForm({
        mode: "onChange",
        defaultValues: {
            name: "林小明",
            tel: "0910552225",
            email: "ming.lin@gmail.com",
            address: "台北市中正區三愛里信義路二段277號",
            paymentMethod: "creditCard",
        }
    });

    // 收件人選擇
    const [isSameAsBuyer, setIsSameAsBuyer] = useState(true);

    const recipientPickerRef = useRef(null);
    const toastRef = useRef(null);
    const [ orderId, setOrderId ] = useState(null);
    
    const showToast = () => {
    const toast = new bootstrap.Toast(toastRef.current);
    toast.show();
    };
    // 更新購物車數量
    const updateCartQty = useCallback(async (item, newQty) => {
        if (newQty < 1) return;
        setUpdatingId(item.id);
        try {
            await axios.put(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart/${item.id}`, {
                data: {
                    product_id: item.product_id,
                    qty: newQty
                }
            });
            // 重新取得購物車資料
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
            setCartData(response.data.data.carts ?? []);
            setFinalTotal(response.data.data.final_total);
            setCartError("")
        } catch (error) {
            setCartError("數量更新失敗，請稍後再試", error);
            // 恢復為原本數量
            setLocalQty(prev => ({ ...prev, [item.id]: item.qty }));
        }
        setUpdatingId(null);
    }, []);

    // debounce 版本的數量更新（+/- 按鈕用）
    const handleQtyChange = useCallback((item, newQty) => {
        if (newQty < 1) return;
        // 立即更新 UI
        setLocalQty(prev => ({ ...prev, [item.id]: newQty }));
        // 清掉上一個 timer
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


    // 刪除購物車項目
    const removeCartItem = async (itemId) => {
        if (debounceRef.current[itemId]) {
            clearTimeout(debounceRef.current[itemId]);
            delete debounceRef.current[itemId];
        }
        setUpdatingId(itemId);
        try {
            await axios.delete(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart/${itemId}`);
            // 重新取得購物車資料
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
            setCartData(response.data.data.carts ?? []);
            setFinalTotal(response.data.data.final_total);
            setCartError("")
        } catch (error) {
            setCartError("刪除商品失敗，請稍後再試", error);
        }
        setUpdatingId(null);
    };


    // 使用優惠券
    const applyCoupon = async (codeOverride) => {
        const code = codeOverride ?? couponCode;
        if (!code) return;
        setCouponStatus({ message: "正在套用...", type: "" });
        try {
            const response = await axios.post(`${VITE_API_BASE}/api/${VITE_API_PATH}/coupon`, {
                data: {
                    code: code
                }
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

    // 計算折扣金額
    const subtotal = cartData.reduce((sum, item) => sum + item.total, 0);

    // 取得表單資料並送出訂單
    const onSubmit = async (formData) => {
        try {
            const recipient = isSameAsBuyer ? {
                name: formData.name,
                email: formData.email,
                tel: formData.tel,
                address: formData.address,
            } : {
                name: formData.recipientName,
                tel: formData.recipientTel,
                address: formData.recipientAddress,
            };
            const data = {
                data: {
                    user: {
                        name: formData.name,
                        email: formData.email,
                        tel: formData.tel,
                        address: formData.address,
                    },
                    message: [
                        `付款方式:${formData.paymentMethod}`,
                        `取貨方式:${deliveryMethod}`,
                        `收件人:${recipient.name}`,
                        `電話:${recipient.tel}`,
                        `地址:${recipient.address}`,
                        selectedStore
                            ? `取貨門市:${selectedStore.label}`
                            : `取貨門市:未選擇`,
                    ].join("，"),
                    recipient,
                }
            };
            const response = await axios.post(`${VITE_API_BASE}/api/${VITE_API_PATH}/order`, data);
            setOrderId(response.data.orderId);
            // 更新購物車列表
            const responses2 = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
            setCartData(responses2.data.data.carts || []);
            reset();
            showToast();
        } catch (error) {
            console.error("送出訂單失敗:", error);
        }
    }



    // API 取得購物車資料
    useEffect(() => {
        const fetchCartData = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
                const data = response.data.data;
                const carts = data.carts ?? [];
                setCartData(carts);
                setFinalTotal(data.final_total);

                // 若購物車內有品項已套用 coupon，重新呼叫一次讓後端對所有品項套用折扣，
                // 解決「先套 coupon 再加商品，新商品不享折扣」的 API 限制。
                // applyCoupon 內部會更新 couponStatus（"已套用優惠券:xxx"），
                // 此過程在 isLoading=true 的 overlay 遮蓋下不可見；
                // overlay 消失後顯示的成功訊息屬於預期行為（告知使用者優惠券仍生效）。
                const appliedCoupon = carts.find(item => item.coupon);
                if (appliedCoupon) {
                    await applyCoupon(appliedCoupon.coupon.code);
                }
            } catch (error) {
                setCartError("購物車資料載入失敗，請稍後再試", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCartData();
    // applyCoupon 捕捉的值（state setter、模組常數）在 mount 後不變，
    // 呼叫時永遠傳入 codeOverride，不依賴 couponCode state，無 stale closure 風險
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  return (
    <>
    <div className="container" style={{ position: "relative", minHeight: 300 }}>
        <Loading isLoading={isLoading} text="購物車載入中" />
        <div className="row">
            <div className="col-lg-9">
                <div className="mt-6 mb-6 mt-md-15 mb-md-15">
                    <h2 className="cart-heading-title">購物車</h2>
                    {cartError && (
                        <p className="text-danger mb-3" style={{ fontSize: "0.9rem" }}>
                            <TriangleAlert size="1em" /> {cartError}
                        </p>
                    )}
                    {/* ── 空購物車提示 ── */}
                    {cartData.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "64px 24px 80px",
                            fontFamily: "'Noto Serif TC', 'PingFang TC', sans-serif",
                        }}>
                            {/* 浮動 icon */}
                            <div className="float-icon" style={{ fontSize: "3rem", marginBottom: "24px" }}>
                                🛍️
                            </div>

                            {/* Badge */}
                            <div style={{
                                display: "inline-block",
                                padding: "6px 20px",
                                borderRadius: "20px",
                                background: "#FFF0F4",
                                border: "1.5px solid #ECD4DE",
                                color: "#C2547A",
                                fontSize: "0.78rem",
                                letterSpacing: "0.2em",
                                fontWeight: 600,
                                marginBottom: "24px",
                                textTransform: "uppercase",
                            }}>
                                Empty Cart
                            </div>

                            <h3 style={{
                                fontFamily: "'Noto Serif TC', serif",
                                fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
                                fontWeight: 600,
                                color: "#2a2a2a",
                                margin: "0 0 16px",
                                lineHeight: "1.6",
                            }}>
                                目前購物車還沒有商品
                            </h3>

                            <p style={{
                                color: "#888",
                                fontSize: "0.92rem",
                                lineHeight: "1.9",
                                margin: "0 0 40px",
                            }}>
                                快去挑選喜歡的手作飾品，<br />
                                為日常增添一點儀式感吧 ♡
                            </p>

                            {/* 分隔線 */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: "12px",
                                marginBottom: "36px", maxWidth: 360, margin: "0 auto 36px",
                            }}>
                                <div style={{ flex: 1, height: "1px", background: "#F0E4EA" }} />
                                <span style={{ color: "#D4A0B4", fontSize: "0.8rem", letterSpacing: "0.1em" }}>立即選購</span>
                                <div style={{ flex: 1, height: "1px", background: "#F0E4EA" }} />
                            </div>

                            {/* 選購按鈕 */}
                            <Link
                                to="/product"
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                    padding: "12px 32px", borderRadius: "24px",
                                    background: "#C2547A", color: "#fff",
                                    fontSize: "0.9rem", fontWeight: 500,
                                    textDecoration: "none",
                                }}
                            >前往商品頁面 →</Link>
                        </div>
                    ) : (
                        <>
                        {/* 電腦版購物車顯示 */}
                        <div className="d-none d-md-block">
                        <div className="bg-white border border-secondary-100 rounded-4 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table table-borderless align-middle mb-0">
                                <thead>
                                    <tr>
                                    <th className="bg-secondary-50 text-gray-600" scope="col">商品明細</th>
                                    <th className="bg-secondary-50 text-gray-600" scope="col">單價</th>
                                    <th className="bg-secondary-50 text-gray-600" scope="col">數量</th>
                                    <th className="bg-secondary-50 text-gray-600" scope="col">小計</th>
                                    <th className="bg-secondary-50 text-gray-600" scope="col"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartData.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                        <img src={item.product.imageUrl} alt={item.product.title} style={{width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', marginRight: 8}} />
                                        {item.product.title}
                                        </td>
                                        <td>${item.product.price}</td>
                                        <td>
                                            <div className="input-group" style={{maxWidth: 140}}>
                                                <button
                                                    className={`btn btn-sm border-0${(localQty[item.id] ?? item.qty) === 1 ? ' text-muted border-muted' : ''}`}
                                                    type="button"
                                                    disabled={(localQty[item.id] ?? item.qty) === 1}
                                                    onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) - 1)}
                                                ><Minus /></button>
                                                <input
                                                    type="number" min="1"
                                                    value={localQty[item.id] ?? item.qty}
                                                    onChange={e => setLocalQty(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                                    onBlur={e => handleInputBlur(item, e.target.value)}
                                                    className="text-center fs-20 bg-white border-0 cart-qty-input"
                                                    style={{width: 40}}
                                                />
                                                <button className="btn btn-sm border-0" type="button" onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) + 1)}><Plus /></button>
                                            </div>
                                        </td>
                                        <td>{currency(item.total)}</td>
                                        <td>
                                            <button className="btn p-1 border-0 text-gray-500" disabled={updatingId===item.id} onClick={() => removeCartItem(item.id)}><X size={18} /></button>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>
                        </div>
                        </div>
                        {/* 手機版購物車顯示 */}
                        <div className="d-md-none">
                            <div className="bg-white border border-secondary-100 rounded-4 overflow-hidden">
                                <div className="fw-bold text-gray-600 bg-secondary-50 px-3 py-2 mb-2">商品明細</div>
                                {cartData.map(item => (
                                <div key={item.id} className="px-3 py-2">
                                    {/* 第一排：商品名稱 + 刪除 */}
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="fw-bold text-p-20-b">{item.product.title}</div>
                                        <button className="btn p-1 ms-2 flex-shrink-0 border-0 text-gray-500" disabled={updatingId===item.id} onClick={() => removeCartItem(item.id)}><X size={18} /></button>
                                    </div>
                                    {/* 第二排：單價／數量控制 + 小計 */}
                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                        <div className="d-flex align-items-center text-p-16-b flex-grow-1">
                                            <span className="text-gray-600">單價 ${item.product.price} / 數量</span>
                                            <div className="d-flex flex-nowrap ms-2">
                                                <button
                                                    className={`btn btn-sm border-0${(localQty[item.id] ?? item.qty) === 1 ? ' text-muted border-muted' : ''}`}
                                                    type="button"
                                                    disabled={(localQty[item.id] ?? item.qty) === 1}
                                                    onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) - 1)}
                                                ><Minus size={16} className="text-gray-600" /></button>
                                                <input
                                                    type="number" min="1"
                                                    value={localQty[item.id] ?? item.qty}
                                                    onChange={e => setLocalQty(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                                    onBlur={e => handleInputBlur(item, e.target.value)}
                                                    className="text-center fs-20 bg-white border-0 cart-qty-input"
                                                    style={{width: 40}}
                                                />
                                                <button
                                                    className="btn btn-sm border-0"
                                                    type="button"
                                                    onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) + 1)}
                                                ><Plus size={16} className="text-gray-600" /></button>
                                            </div>
                                        </div>
                                        <div className="text-p-20-b ms-2">${item.total}</div>
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                        </>
                    )}
                </div>
                {/* 優惠券輸入區塊 */}
                <div className="mt-6 mb-6 mt-md-8 mb-md-8">
                    <h2 className="cart-heading-title">使用優惠券</h2>

                    {/* 優惠券列表（可折疊） */}
                    {showCouponList && (
                        <div className="mb-3" style={{ maxWidth: 500 }}>
                            <div className="border rounded-4 overflow-hidden">
                                <div className="px-3 py-1 d-flex justify-content-between align-items-center bg-secondary-50 border-bottom">
                                    <span className="text-p-16-b text-secondary-700">可用優惠券</span>
                                    <button
                                        type="button"
                                        className="btn border-0 p-1 text-gray-500"
                                        onClick={() => setShowCouponList(false)}
                                    ><X size={16} /></button>
                                </div>
                                {availableCoupons.map((coupon, idx) => (
                                    <div
                                        key={coupon.code}
                                        className={`d-flex align-items-center justify-content-between px-3 py-3${idx < availableCoupons.length - 1 ? " border-bottom" : ""}`}
                                    >
                                        <div>
                                            <p className="mb-0 text-p-16-b text-secondary-700">
                                                {coupon.name}
                                            </p>
                                            <p className="mb-0 small text-gray-500">
                                                代碼：<code className="text-primary">{coupon.code}</code>
                                                &nbsp;折扣：<span className="fw-bold text-secondary-700">{coupon.discount}</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-apply-coupon ms-3 flex-shrink-0"
                                            onClick={() => {
                                                setCouponCode(coupon.code);
                                                setShowCouponList(false);
                                                applyCoupon(coupon.code);  // ← 直接帶入 code 觸發
                                            }}
                                        >套用此券</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 輸入框 + 按鈕列 */}
                    <div className="input-group" style={{ maxWidth: 500 }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="輸入優惠券代碼"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value)}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-coupon px-3"
                            onClick={() => setShowCouponList(prev => !prev)}
                        >{showCouponList ? "收起" : "檢視"}</button>
                    </div>
                    {couponStatus.message && (
                        <p className={`mt-2 ${couponStatus.type ? `text-${couponStatus.type}` : "text-secondary"}`}
                        style={{ fontSize: "0.9rem" }}>
                            {couponStatus.message}
                        </p>
                    )}
                </div>
                {/* 付款與取貨方式 */}
                <h2 className="cart-heading-title">付款與取貨方式</h2>
                {/* 付款方式：信用卡、超商取貨付款 */}
                <h3 className="text-p-20-b text-gray-600 mb-3">付款方式</h3>
                <div className="d-flex flex-column mb-6 mb-md-8">
                    <div className="form-check mb-2">
                        <input type="radio" id="creditCard" name="paymentMethod" value="creditCard" className="form-check-input"
                        {...register("paymentMethod", { required: "請選擇付款方式" }) }
                        />
                        <label htmlFor="creditCard" className="form-check-label text-p-16-b">信用卡</label>
                    </div>
                    <div className="form-check mb-2">
                        <input type="radio" id="storePickup" name="paymentMethod" value="storePickup" className="form-check-input"
                        {...register("paymentMethod", { required: "請選擇付款方式" }) }
                        />
                        <label htmlFor="storePickup" className="form-check-label text-p-16-b">超商取貨付款</label>
                    </div>
                </div>

                <hr className="border text-gray-100 mb-6 mb-md-8" />
                <h3 className="text-p-20-b text-gray-600 mb-3">購買人資訊</h3>
                <div className="mb-3">
                <label htmlFor="buyerName" className="form-label text-p-16-b">
                    購買人姓名
                </label>
                <input
                    id="buyerName"
                    name="name"
                    type="text"
                    className="form-control"
                    placeholder="請輸入購買人姓名"
                    {...register("name", {
                        required: "請輸入購買人姓名",
                        minLength: {
                            value: 2,
                            message: "購買人姓名至少需要 2 個字",
                        },
                    })}
                />
                {errors.name && <p className="text-danger">{errors.name.message}</p>}
                </div>
                <div className="mb-3">
                <label htmlFor="tel" className="form-label text-p-16-b">
                    聯絡電話
                </label>
                <input
                    id="tel"
                    name="tel"
                    type="tel"
                    className="form-control"
                    placeholder="請輸入聯絡電話"
                    {...register("tel", {
                        ...twPhoneValidation, required: "請輸入聯絡電話"
                    })}
                />
                {errors.tel && <p className="text-danger">{errors.tel.message}</p>}
                </div>
                <div className="mb-6 mb-md-8">
                <label htmlFor="email" className="form-label text-p-16-b">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-control"
                    placeholder="請輸入 Email"
                    {...register("email", {
                        ...emailValidation, required: "請輸入 Email"
                    })}
                />
                {errors.email && <p className="text-danger">{errors.email.message}</p>}
                </div>
                <div className="mb-6 mb-md-8">
                <label htmlFor="address" className="form-label text-p-16-b">
                    購買人地址
                </label>
                <input
                    id="address"
                    name="address"
                    type="text"
                    className="form-control"
                    placeholder="請輸入地址"
                    {...register("address", {
                        required: "請輸入地址",
                    })}
                />
                {errors.address && <p className="text-danger">{errors.address.message}</p>}
                </div>
                <hr className="border text-gray-100 mb-6 mb-md-8" />
                <h3 className="text-p-20-b text-gray-600 mb-3">收件人資訊</h3>
                <div className="d-flex flex-column mb-3">
                    <div className="form-check mb-2">
                        <input
                            type="radio"
                            id="sameAsBuyer"
                            name="recipientType"
                            className="form-check-input me-2"
                            checked={isSameAsBuyer}
                            onChange={() => setIsSameAsBuyer(true)}
                        />
                        <label htmlFor="sameAsBuyer" className="form-check-label text-p-16-b">同購買人</label>
                    </div>
                    {isSameAsBuyer && (
                        <div className="border-0 rounded-4 p-5 mb-4 bg-gray-100">
                            <p className="mb-2">姓名: {watch("name")}</p>
                            <p className="mb-2">電話: {watch("tel")}</p>
                            <p className="mb-2">Email: {watch("email")}</p>
                            <p className="mb-2">地址: {watch("address")}</p>
                        </div>
                    )}
                    <div className="form-check d-flex align-items-center">
                        <input
                            type="radio"
                            id="otherRecipient"
                            name="recipientType"
                            className="form-check-input me-2"
                            onChange={() => setIsSameAsBuyer(false)}
                        />
                        <label htmlFor="otherRecipient" className="form-check-label text-p-16-b">指定其他收件人</label>
                        {!isSameAsBuyer && (<>
                            {/* 電腦版（≥768px）：開啟 Modal */}
                            <button
                                className="btn btn-underline ms-auto d-none d-md-block"
                                type="button"
                                onClick={() => recipientPickerRef.current?.openModal()}
                            >選擇常用收件人</button>
                            {/* 手機版（<768px）：開啟 Offcanvas */}
                            <button
                                className="btn btn-underline ms-auto d-md-none"
                                type="button"
                                onClick={() => recipientPickerRef.current?.openOffcanvas()}
                            >選擇常用收件人</button>
                        </>)}
                    </div>
                    {!isSameAsBuyer && (
                        <div className="rounded-4 p-5 mt-4 mb-8 bg-gray-100">
                            <div className="row mb-2">
                                <div className="col-6">
                                    <label className="fw-bold mb-1">收件人</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="收件人姓名"
                                        {...register("recipientName", {
                                            required: "請輸入收件人姓名",
                                            shouldUnregister: true,
                                        })}
                                    />
                                    {errors.recipientName && <p className="text-danger mt-1" style={{ fontSize: "0.85rem" }}>{errors.recipientName.message}</p>}
                                </div>
                                <div className="col-6">
                                    <label className="fw-bold mb-1">聯絡電話</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="收件人電話"
                                        {...register("recipientTel", {
                                            required: "請輸入收件人電話",
                                            pattern: twPhoneValidation.pattern,
                                            shouldUnregister: true,
                                        })}
                                    />
                                    {errors.recipientTel && <p className="text-danger mt-1" style={{ fontSize: "0.85rem" }}>{errors.recipientTel.message}</p>}
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className="fw-bold mb-1">收件地址</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="收件人地址"
                                    {...register("recipientAddress", {
                                        required: "請輸入收件人地址",
                                        shouldUnregister: true,
                                    })}
                                />
                                {errors.recipientAddress && <p className="text-danger mt-1" style={{ fontSize: "0.85rem" }}>{errors.recipientAddress.message}</p>}
                            </div>
                        </div>
                    )}
                </div>
                <RecipientPicker
                    ref={recipientPickerRef}
                    onConfirm={(recipient) => {
                        setValue("recipientName", recipient.name, { shouldValidate: true });
                        setValue("recipientTel", recipient.tel, { shouldValidate: true });
                        setValue("recipientAddress", recipient.address, { shouldValidate: true });
                    }}
                />
                <hr className="border text-gray-100 mb-6 mb-md-8" />
                {/* 取貨方式 */}
                <h3 className="text-p-20-b text-gray-600 mb-3">取貨方式</h3>
                <div className="d-flex flex-column mb-6 mb-md-8">

                    {/* 全家 */}
                    <div className="form-check d-flex align-items-center mb-2">
                        <input type="radio"
                            id="familyMart"
                            name="deliveryMethod"
                            value="familyMart"
                            className="form-check-input me-1"
                            checked={deliveryMethod === "familyMart"}
                            onChange={() => setDeliveryMethod("familyMart")}
                        />
                        <label htmlFor="familyMart" className="form-check-label text-p-16-b me-2">全家超商取貨</label>
                        {
                            deliveryMethod === "familyMart" && (
                                <>
                                <button
                                    className="btn border-0"
                                    type="button"
                                    style={{ padding: "12px 24px", gap: "8px" }}
                                    onClick={() => openCvsMap("FAMIC2C")}
                                >
                                    <span className="text-p-16-b" style={{ color: "#493B3F", borderBottom: "1px solid #493B3F", lineHeight: "150%", paddingBottom: "8px" }}>搜尋門市</span>
                                </button>
                                </>
                            )
                        }
                    </div>

                    {/* 711 */}
                    <div className="form-check d-flex align-items-center mb-2">
                        <input type="radio"
                            id="uniMart"
                            name="deliveryMethod"
                            value="uniMart"
                            className="form-check-input me-1"
                            checked={deliveryMethod === "uniMart"}
                            onChange={() => setDeliveryMethod("uniMart")}
                        />
                        <label htmlFor="uniMart" className="form-check-label text-p-16-b me-2">711 超商取貨</label>
                        {
                            deliveryMethod === "uniMart" && (
                                <>
                                <button
                                    className="btn border-0"
                                    type="button"
                                    style={{ padding: "12px 24px", gap: "8px" }}
                                    onClick={() => openCvsMap("UNIMARTC2C")}
                                >
                                    <span className="text-p-16-b" style={{ color: "#493B3F", borderBottom: "1px solid #493B3F", lineHeight: "150%", paddingBottom: "8px" }}>搜尋門市</span>
                                </button>
                                </>)
                        }
                    </div>

                    {/* 已選門市顯示卡片 */}
                    {selectedStore && (
                        <div
                            className="mt-3 p-3 rounded-3 d-flex align-items-start gap-3"
                            style={{ background: "#fff8f5", border: "1px solid #f0e0d8", maxWidth: 480 }}
                        >
                            <div style={{ fontSize: "1.4rem", lineHeight: 1.2 }}>
                                {selectedStore.brand === "全家" ? "🏪" : "🏬"}
                            </div>
                            <div className="flex-grow-1">
                                <p className="mb-0 fw-bold text-p-16-b" style={{ color: "#493B3F" }}>
                                    {selectedStore.brand} · {selectedStore.name}
                                </p>
                                {selectedStore.id && (
                                    <p className="mb-0 small" style={{ color: "#888" }}>
                                        門市代號：{selectedStore.id}
                                    </p>
                                )}
                                {selectedStore.address && (
                                    <p className="mb-0 small" style={{ color: "#888" }}>
                                        {selectedStore.address}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="btn border-0 p-0 flex-shrink-0"
                                style={{ color: "#aaa", fontSize: "1rem" }}
                                onClick={() => setSelectedStore(null)}
                            >✕</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="col-lg-3">
                <div className="mt-6 mb-6 mt-md-15 mb-md-15">
                <form onSubmit={handleSubmit(onSubmit)}>
                <h2 className="cart-heading-title">結帳明細</h2>
                <div className="billDetails rounded-4 p-5 mb-6 mb-lg-8">
                    <div className="d-flex">
                        <div className="p-2 flex-grow-1">商品小計</div>
                        <div className="p-2">
                            {currency(subtotal)}
                        </div>
                    </div>
                    <div className="d-flex">
                        <div className="p-2 flex-grow-1">優惠券</div>
                        {subtotal - finalTotal > 0 ? (
                            <div className="p-2 text-success">
                                折扣：- {currency(subtotal - Math.ceil(finalTotal))}
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div className="d-flex">
                        <div className="p-2 flex-grow-1">結帳金額</div>
                        <div className="p-2">
                            {subtotal === 0 ? 0 : currency(Math.ceil(finalTotal))}
                        </div>
                    </div>
                </div>
                <div className="text-center">
                    <button
                        className="btn btn-dora w-lg-100"
                        style={{ '--bs-btn-padding-x': '66px' }}
                        disabled={cartData.length === 0 || !isValid}
                    >
                        立即結帳
                    </button>
                </div>
                </form>
                </div>
            </div>
        </div>
    </div>
    <OrderToast ref={toastRef} message="訂單已成立！" isSuccess={true} orderId={orderId} />
    </>
  );
}

export default Cart;