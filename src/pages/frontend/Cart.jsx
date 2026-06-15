import axios from "axios";
import OrderToast from "@components/OrderToast";
import Loading from "@components/Loading";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { Minus, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { currency } from "../../utils/filter";
import * as bootstrap from "bootstrap";
import { emailValidation, twPhoneValidation } from "../../utils/validation";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

// 綠界物流設定（從 .env 讀取，金鑰不寫死在程式碼）
const VITE_ECPAY_MERCHANT_ID = import.meta.env.VITE_ECPAY_MERCHANT_ID;
const VITE_ECPAY_HASH_KEY    = import.meta.env.VITE_ECPAY_HASH_KEY;
const VITE_ECPAY_HASH_IV     = import.meta.env.VITE_ECPAY_HASH_IV;
const VITE_ECPAY_MAP_BASE    = import.meta.env.VITE_ECPAY_MAP_BASE;
const VITE_ECPAY_REPLY_URL   = import.meta.env.VITE_ECPAY_REPLY_URL;
const VITE_ECPAY_POLL_URL    = import.meta.env.VITE_ECPAY_POLL_URL;

function Cart() {
    const [ cartData, setCartData ] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // ── 新增：每個 item 的本地數量暫存 ──
    const [localQty, setLocalQty] = useState({});
    const [cartError, setCartError] = useState("");
    const debounceRef = useRef({});
    // 初始化 localQty（cartData 載入後同步）
    useEffect(() => {
        const init = {};
        cartData.forEach(item => { init[item.id] = item.qty; });
        setLocalQty(init);
    }, [cartData]);
    const [deliveryMethod, setDeliveryMethod] = useState("familyMart");
    const [ updatingId, setUpdatingId ] = useState(null);
    // 優惠券、運費等狀態可在此新增
    const [ couponCode, setCouponCode ] = useState("");
    // 選擇的門市資訊
    const [selectedStore, setSelectedStore] = useState(null); // { name, id, type }

    // 綠界超商地圖設定
    // 綠界物流設定（從頂部 .env 變數讀入）
    const ECPAY_MERCHANT_ID = VITE_ECPAY_MERCHANT_ID;
    const ECPAY_HASH_KEY    = VITE_ECPAY_HASH_KEY;
    const ECPAY_HASH_IV     = VITE_ECPAY_HASH_IV;
    const ECPAY_MAP_BASE    = VITE_ECPAY_MAP_BASE;

    // 綠界 CheckMacValue 產生（依官方文件規格）
    const generateCheckMacValue = async (params) => {
        // Step 1：按 key 字母順序排序（case-insensitive）
        const sorted = Object.keys(params)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .map(k => `${k}=${params[k]}`)
            .join("&");

        // Step 2：前後加上 HashKey / HashIV
        const raw = `HashKey=${ECPAY_HASH_KEY}&${sorted}&HashIV=${ECPAY_HASH_IV}`;

        // Step 3：URLEncode 整個字串（.NET 風格）
        const urlEncoded = encodeURIComponent(raw)
            .replace(/%20/g, "+")
            .replace(/%21/g, "!")
            .replace(/%27/g, "'")
            .replace(/%28/g, "(")
            .replace(/%29/g, ")")
            .replace(/%2A/g, "*")
            .replace(/%7E/g, "~");

        // Step 4：轉小寫
        const lowerStr = urlEncoded.toLowerCase();

        // Step 5：SHA256 → 轉大寫
        const msgBuffer  = new TextEncoder().encode(lowerStr);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray  = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    };

    // 開啟綠界超商地圖
    const openCvsMap = async (subType) => {
        // 監聽子視窗透過 postMessage 傳回的門市資訊（後端已組好格式化字串）
        const handleMessage = (event) => {
            if (!event.data || event.data.type !== "CVS_STORE_SELECTED") return;
            setSelectedStore({
                label:   event.data.storeLabel || "",  // 後端組好的完整字串，直接存入 message
                id:      event.data.storeID    || "",  // 備用顯示
                name:    event.data.storeName  || "",
                address: event.data.address    || "",
                brand:   event.data.brand      || "",
                subType: event.data.subType    || subType,
            });
            window.removeEventListener("message", handleMessage);
        };
        window.addEventListener("message", handleMessage);

        const tradeNo  = "Cart" + Date.now().toString().slice(-8);
        const replyUrl = VITE_ECPAY_REPLY_URL;

        // 組成要簽章的參數（不含 HashKey/HashIV）
        const params = {
            MerchantID:       ECPAY_MERCHANT_ID,
            MerchantTradeNo:  tradeNo,
            LogisticsType:    "CVS",
            LogisticsSubType: subType,
            IsCollection:     "N",
            ServerReplyURL:   replyUrl,
            // 手機裝置帶 Device=1，讓綠界顯示行動版地圖介面
            Device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "1" : "0",
        };

        const checkMac = await generateCheckMacValue(params);
        const formParams = { ...params, CheckMacValue: checkMac };

        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

        if (isMobile) {
            // ── 手機版：開新分頁 → 選完門市 → cvsmap.php 存 session ────────
            // 使用者切回購物車頁時，visibilitychange 觸發輪詢撈取門市資料

            // 開新分頁提交 POST
            const form = document.createElement("form");
            form.method  = "POST";
            form.action  = ECPAY_MAP_BASE;
            form.target  = "_blank";
            form.enctype = "application/x-www-form-urlencoded";

            Object.entries(formParams).forEach(([k, v]) => {
                const input = document.createElement("input");
                input.type  = "hidden";
                input.name  = k;
                input.value = v;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            // 監聽使用者切回本頁（visibilitychange）
            let pollTimer = null;
            let pollCount = 0;
            const MAX_POLL = 20; // 最多輪詢 20 次（約 10 秒）

            const stopPoll = () => {
                clearInterval(pollTimer);
                document.removeEventListener("visibilitychange", onVisible);
            };

            const pollStore = async () => {
                try {
                    const res = await fetch(
                        `${VITE_ECPAY_POLL_URL}?clear=1`,
                        { credentials: "include" }
                    );
                    const data = await res.json();

                    if (data.found) {
                        setSelectedStore({
                            label:   data.storeLabel,
                            id:      data.storeID,
                            name:    data.storeName,
                            address: data.address,
                            brand:   data.brand,
                            subType: data.subType,
                        });
                        stopPoll();
                        return "found";
                    }
                    return "empty"; // 尚無資料，繼續等
                } catch (e) {
                    console.error("搜尋門市資料失敗:", e);
                    return "error"; // fetch 失敗，停止搜尋
                }
            };

            const onVisible = async () => {
                if (document.visibilityState !== "visible") return;

                // 切回頁面時立即查一次
                const result = await pollStore();
                if (result === "found" || result === "error") return;

                // 還沒有資料，每 500ms 輪詢，最多 MAX_POLL 次
                pollTimer = setInterval(async () => {
                    pollCount++;
                    const result = await pollStore();
                    if (result === "found" || result === "error" || pollCount >= MAX_POLL) {
                        stopPoll();
                    }
                }, 500);
            };

            document.addEventListener("visibilitychange", onVisible);
        } else {
            // ── 桌機版：開新視窗，選完由 postMessage 傳回 ──────────────────
            const mapWindow = window.open("", "cvsMap", "width=900,height=700,scrollbars=yes");

            const form = document.createElement("form");
            form.method  = "POST";
            form.action  = ECPAY_MAP_BASE;
            form.target  = "cvsMap";
            form.enctype = "application/x-www-form-urlencoded";

            Object.entries(formParams).forEach(([k, v]) => {
                const input = document.createElement("input");
                input.type  = "hidden";
                input.name  = k;
                input.value = v;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            if (!mapWindow || mapWindow.closed) {
                alert("請允許瀏覽器開啟彈出視窗後再試一次");
            }
        }
    };
    const [ couponStatus, setCouponStatus ] = useState({ message: "", type: "" });
    const [ showCouponList, setShowCouponList ] = useState(false);

    // 優惠券列表（固定資料）
    const availableCoupons = [
        { name: "2026新春優惠", code: "newyear2026", discount: "9折" },
        { name: "新會員折扣",   code: "newmember",   discount: "95折" },
    ];
    // 折扣後的金額
    const [finalTotal, setFinalTotal] = useState(null);
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
    // 其他收件人資訊
    const [recipientInfo, setRecipientInfo] = useState({
        name: "",
        tel: "",
        email: "",
        address: ""
    });

    // 設定常用收件人資訊，這裡先寫死三筆資料
    const [commonRecipients, setCommonRecipients] = useState([
        {
            id: 1,
            name: "林小魚",
            tel: "0910552225",
            email: "fish.lin@gmail.com",
            address: "台北市信義區信義路五段7號"
        },
        {
            id: 2,
            name: "林鮭魚",
            tel: "0921628826",
            email: "xiaohua.li@gmail.com",
            address: "台北市大安區和平東路三段12號"
        },
        {
            id: 3,
            name: "林葦辰",
            tel: "0919104401",
            email: "weicheng.lin@gmail.com",
            address: "台北市中正區忠孝東路一段1號"
        }
    ]);
    // 更新指定收件人資訊
    const updateRecipientData = (e) => {
        const { name, value } = e.target;
        setRecipientInfo(prev => ({ ...prev, [name]: value }));
    };

    // Modal/Offcanvas ref
    const recipientModalRef = useRef(null);
    const recipientOffcanvasRef = useRef(null);
    const toastRef = useRef(null);
    const [ orderId, setOrderId ] = useState(null);
    // 開啟收件人選單
    const openRecipientSelector = () => {
    if (window.innerWidth < 768) {
        if (!recipientOffcanvasRef.current) {
        recipientOffcanvasRef.current = new bootstrap.Offcanvas('#recipientOffcanvas');
        }
        recipientOffcanvasRef.current.show();
    } else {
        if (!recipientModalRef.current) {
        recipientModalRef.current = new bootstrap.Modal('#recipientModal', { keyboard: false });
        }
        recipientModalRef.current.show();
    }
    };

    const showToast = () => {
    const toast = new bootstrap.Toast(toastRef.current);
    toast.show();
    };
    const closeRecipientModal = () => {
        if (recipientModalRef.current) recipientModalRef.current.hide();
    };
    const closeRecipientOffcanvas = () => {
        if (recipientOffcanvasRef.current) recipientOffcanvasRef.current.hide();
    };

    const handleSelectCommonRecipient = (recipient) => {
        setRecipientInfo({
            name: recipient.name,
            tel: recipient.tel,
            email: recipient.email,
            address: recipient.address
        });
        setValue("recipientName", recipient.name, { shouldValidate: true });
        setValue("recipientTel", recipient.tel, { shouldValidate: true });
        setValue("recipientEmail", recipient.email, { shouldValidate: true });
    };

    const [showAddRecipientForm, setShowAddRecipientForm] = useState(false);

    const deleteCommonRecipient = (id) => {
        setCommonRecipients(prev => prev.filter(recipient => recipient.id !== id));
    }

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
            setCartError("")
        } catch (error) {
            setCartError("數量更新失敗，請稍後再試", error);
            // 恢復為原本數量
            setLocalQty(prev => ({ ...prev, [item.id]: item.qty }));
        }
        setUpdatingId(null);
    }, []);

    // debounce 版本的數量更新
    const handleQtyChange = useCallback((item, newQty) => {
        if (newQty < 1) return;
        // 立即更新 UI
        setLocalQty(prev => ({ ...prev, [item.id]: newQty }));
        // 清掉上一個 timer
        if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
        // 800ms 後才打 API
        debounceRef.current[item.id] = setTimeout(() => {
            updateCartQty(item, newQty);
        }, 800);
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
            setFinalTotal(response.data.data.final_total);

            // 重新取得購物車資料
            const cartRes = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
            setCartData(cartRes.data.data.carts);
        } catch {
            setCouponStatus({ message: "優惠券無效或已使用。", type: "danger" });
            setFinalTotal(null);
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
                email: formData.recipientEmail,
                tel: formData.recipientTel,
                address: recipientInfo.address,
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
                        `Email:${recipient.email}`,
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
            setRecipientInfo({ name: "", tel: "", email: "", address: "" })
            showToast();
        } catch (error) {
            console.error("送出訂單失敗:", error);
        }
    }



    // API 取得購物車資料顯示在此
    useEffect(() => {
        recipientModalRef.current = new bootstrap.Modal('#recipientModal', {
            keyboard: false
        });

        // Modal 關閉時移除焦點
        document
        .querySelector("#recipientModal")
        .addEventListener("hide.bs.modal", () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        });

    const fetchCartData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`);
            setCartData(response.data.data.carts);
        } catch (error) {
            setCartError("購物車資料載入失敗，請稍後再試", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchCartData();
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
                        <div className="card">
                            <div className="table-responsive">
                                <table className="table table-borderless align-middle mb-0">
                                <thead>
                                    <tr>
                                    <th style={{background: "#EAE1E3"}} scope="col">商品</th>
                                    <th style={{background: "#EAE1E3"}} scope="col">單價</th>
                                    <th style={{background: "#EAE1E3"}} scope="col">數量</th>
                                    <th style={{background: "#EAE1E3"}} scope="col">單位</th>
                                    <th style={{background: "#EAE1E3"}} scope="col">小計</th>
                                    <th style={{background: "#EAE1E3"}} scope="col">操作</th>
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
                                                    className={`btn btn-sm border-0${(localQty[item.id] ?? item.qty) === 1 ? ' text-muted border-muted' : ''} me-2`}
                                                    type="button"
                                                    disabled={(localQty[item.id] ?? item.qty) === 1 || updatingId === item.id}
                                                    onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) - 1)}
                                                ><Minus /></button>
                                                <input
                                                    type="number" min="1"
                                                    value={localQty[item.id] ?? item.qty}
                                                    onChange={e => handleQtyChange(item, Number(e.target.value))}
                                                    // 移除 disabled，讓使用者可以直接輸入
                                                    className="text-center bg-white border-0"
                                                    style={{width: 40, fontSize: "20px"}}
                                                />
                                                <button className="btn btn-sm border-0" type="button" disabled={updatingId===item.id} onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) + 1)}><Plus /></button>
                                            </div>
                                        </td>
                                        <td className="text-center">{item.product.unit}</td>
                                        <td>{currency(item.total)}</td>
                                        <td>
                                            <button className="btn btn-danger btn-sm text-white" disabled={updatingId===item.id} onClick={() => removeCartItem(item.id)}><Trash2 color="white" /> 刪除</button>
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
                            <div className="card rounded-4 overflow-hidden">
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
                                                    disabled={(localQty[item.id] ?? item.qty) === 1 || updatingId === item.id}
                                                    onClick={() => handleQtyChange(item, (localQty[item.id] ?? item.qty) - 1)}
                                                ><Minus size={16} className="text-gray-600" /></button>
                                                <input
                                                    type="number" min="1"
                                                    value={localQty[item.id] ?? item.qty}
                                                    onChange={e => handleQtyChange(item, Number(e.target.value))}
                                                    className="text-center bg-white border-0 cart-qty-input"
                                                    style={{width: 40, fontSize: "20px"}}
                                                />
                                                <button
                                                    className="btn btn-sm border-0"
                                                    type="button"
                                                    disabled={updatingId===item.id}
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
                    //onChange={updateBuyerData}
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
                        <div className="border-0 rounded-4 p-5 mb-4" style={{backgroundColor: "#EFEFEF"}}>
                            <p className="text-p-16-r mb-2">姓名: {watch("name")}</p>
                            <p className="text-p-16-r mb-2">電話: {watch("tel")}</p>
                            <p className="text-p-16-r mb-2">Email: {watch("email")}</p>
                            <p className="text-p-16-r mb-2">地址: {watch("address")}</p>
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
                        {/* 新增選擇常用收件人按鈕，按鈕在最右邊 */}
                        {!isSameAsBuyer && (
                            <button
                                className="btn btn-underline ms-auto"
                                type="button"
                                onClick={openRecipientSelector}
                            >選擇常用收件人</button>
                        )}
                    </div>
                    {!isSameAsBuyer && (
                        <div style={{ background: "#f3f3f3", borderRadius: 16, padding: 20, marginTop: 16, marginBottom: 32 }}>
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
                                            shouldUnregister: true,
                                        })}
                                    />
                                    {errors.recipientTel && <p className="text-danger mt-1" style={{ fontSize: "0.85rem" }}>{errors.recipientTel.message}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="fw-bold mb-1">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="收件人 Email"
                                    {...register("recipientEmail", {
                                        required: "請輸入收件人 Email",
                                        shouldUnregister: true,
                                    })}
                                />
                                {errors.recipientEmail && <p className="text-danger mt-1" style={{ fontSize: "0.85rem" }}>{errors.recipientEmail.message}</p>}
                            </div>
                        </div>
                    )}
                </div>
                {/* 電腦版 Modal */}
                <div className="modal" id="recipientModal">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-body">
                                <div className="d-flex">
                                    <h2 className="h6 flex-grow-1">選擇常用收件人</h2>
                                    <button
                                        className="btn btn-underline ms-auto"
                                        type="button"
                                        onClick={() => setShowAddRecipientForm(true)}
                                    >新增常用收件人</button>
                                </div>
                                {/* 這裡可放常用收件人列表與選擇按鈕，若有資料才顯示 */}
                                {commonRecipients.length > 0 ? (
                                    commonRecipients.map(recipient => (
                                        <div key={recipient.id} className="form-check d-flex align-items-center mb-3">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="commonRecipient"
                                                id={`recipient-${recipient.id}`}
                                                onChange={() => handleSelectCommonRecipient(recipient)}
                                            />
                                            <label className="form-check-label me-2" htmlFor={`recipient-${recipient.id}`}>
                                                {recipient.name} {recipient.tel}
                                            </label>
                                            <button
                                                type="button"
                                                className="btn btn-link p-0"
                                                onClick={() => deleteCommonRecipient(recipient.id)}
                                            >
                                                刪除
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p>尚無常用收件人</p>
                                )}
                                {showAddRecipientForm && (
                                <div style={{ background: "#f3f3f3", borderRadius: 16, padding: 20, marginTop: 16, marginBottom: 32 }}>
                                    <div className="row mb-2">
                                    <div className="col-6">
                                        <label className="fw-bold mb-1">收件人</label>
                                        <input
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        value={recipientInfo.name || ""}
                                        onChange={updateRecipientData}
                                        placeholder="收件人姓名"
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="fw-bold mb-1">聯絡電話</label>
                                        <input
                                        type="text"
                                        name="tel"
                                        className="form-control"
                                        value={recipientInfo.tel || ""}
                                        onChange={updateRecipientData}
                                        placeholder="收件人電話"
                                        />
                                    </div>
                                    </div>
                                    <div>
                                    <label className="fw-bold mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        value={recipientInfo.email || ""}
                                        onChange={updateRecipientData}
                                        placeholder="收件人 Email"
                                    />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-secondary mt-2 w-100"
                                        onClick={() => {
                                            if (recipientInfo.name && recipientInfo.tel && recipientInfo.email) {
                                        setCommonRecipients(prev => [...prev, { id: prev.length + 1, ...recipientInfo }]);
                                    }
                                        }}
                                    >新增常用收件人</button>
                                </div>
                                )}
                            </div>
                            <div className="modal-footer d-flex flex-row gap-2">
                                <button type="button" className="btn btn-dora-outline flex-fill" data-bs-dismiss="modal" onClick={closeRecipientModal}>取消</button>
                                <button
                                    type="button"
                                    className="btn btn-dora flex-fill"
                                    onClick={() => {
                                        setShowAddRecipientForm(false);
                                        closeRecipientModal(); closeRecipientOffcanvas();}}
                                >
                                    確定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* 手機版 Offcanvas */}
                <div className="offcanvas offcanvas-bottom custom-offcanvas-80" id="recipientOffcanvas">
                    <div className="offcanvas-body">
                        <div className="d-flex">
                            <h2 className="text-p-24 flex-grow-1">選擇常用收件人</h2>
                            <button
                                className="btn border-0 ms-auto"
                                type="button"
                                style={{ padding: "12px", gap: "10px" }}
                                onClick={() => setShowAddRecipientForm(true)}
                            >
                                <span className="text-p-16-b" style={{color: "#493B3F"}}><Plus size={24} /></span>
                            </button>
                        </div>
                        {/* 這裡可放常用收件人列表與選擇按鈕 */}
                        {commonRecipients.length > 0 ? (
                            commonRecipients.map(recipient => (
                                <div key={recipient.id} className="form-check d-flex align-items-center mb-3">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="commonRecipient"
                                        id={`recipient-${recipient.id}`}
                                        onChange={() => handleSelectCommonRecipient(recipient)}
                                    />
                                    <label className="form-check-label me-2" htmlFor={`recipient-${recipient.id}`}>
                                        {recipient.name} {recipient.tel}
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-link p-0"
                                        onClick={() => deleteCommonRecipient(recipient.id)}
                                    >
                                        刪除
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>尚無常用收件人</p>
                        )}
                        {showAddRecipientForm && (
                        <div style={{ background: "#f3f3f3", borderRadius: 16, padding: 20, marginTop: 16, marginBottom: 32 }}>
                            <div className="row mb-2">
                                <div className="col-6">
                                    <label className="fw-bold mb-1">收件人</label>
                                    <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    value={recipientInfo.name || ""}
                                    onChange={updateRecipientData}
                                    placeholder="收件人姓名"
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="fw-bold mb-1">聯絡電話</label>
                                    <input
                                    type="text"
                                    name="tel"
                                    className="form-control"
                                    value={recipientInfo.tel || ""}
                                    onChange={updateRecipientData}
                                    placeholder="收件人電話"
                                    />
                                </div>
                            </div>
                            <div>
                            <label className="fw-bold mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                value={recipientInfo.email || ""}
                                onChange={updateRecipientData}
                                placeholder="收件人 Email"
                            />
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary mt-2 w-100"
                                onClick={() => {
                                    if (recipientInfo.name && recipientInfo.tel && recipientInfo.email) {
                                setCommonRecipients(prev => [...prev, { id: prev.length + 1, ...recipientInfo }]);
                            }
                                }}
                            >新增常用收件人</button>
                        </div>
                        )}
                    </div>
                    <div className="offcanvas-footer d-flex justify-content-between p-3">
                        <button type="button" className="btn btn-dora-outline w-50 me-2" onClick={closeRecipientOffcanvas}>取消</button>
                        <button type="button" className="btn btn-dora w-50" onClick={() => {
                            setShowAddRecipientForm(false);
                            closeRecipientModal(); closeRecipientOffcanvas();}}>確定</button>
                    </div>
                </div>
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
                            {currency(cartData.reduce((sum, item) => sum + item.total, 0))}
                        </div>
                    </div>
                    <div className="d-flex">
                        <div className="p-2 flex-grow-1">優惠券</div>
                        {finalTotal !== null ? (
                            <div className="p-2 text-success">
                                折扣：- {currency(Math.floor(subtotal - finalTotal))}
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div className="d-flex">
                        <div className="p-2 flex-grow-1">結帳金額</div>
                        <div className="p-2">
                            {cartData.reduce((sum, item) => sum + item.total, 0) === 0 ? 0 : currency(finalTotal !== null ? Math.floor(finalTotal) : subtotal)}
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