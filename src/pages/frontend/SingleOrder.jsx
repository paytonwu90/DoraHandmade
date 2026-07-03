import { useParams, Link } from "react-router";
import { useState, useEffect, useContext, useCallback } from "react";
import useMessage from "@hooks/useMessage";
import Loading from "@components/Loading";
import axios from 'axios';
import UserContext from "@contexts/UserContext";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

function SingleOrder() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const { user } = useContext(UserContext);
    const [isOwner, setIsOwner] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { showError, showSuccess } = useMessage();

    const fetchOrder = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/order/${id}`);
            const fetchedOrder = response.data.order;
            setOrder(fetchedOrder);

            // 取得 order 資料後才判斷是否為本人
            if (fetchedOrder && user) {
                setIsOwner(
                    fetchedOrder.user?.email === user.email
                );
            }
        } catch (error) {
            console.error("Error fetching order:", error);
            showError("訂單資料讀取失敗，請稍後再試。");
        } finally {
            setIsLoading(false);
        }
    }, [id, user, showError]);

    useEffect(() => {
        setIsLoading(true);
        fetchOrder();
    }, [fetchOrder]);

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        return new Date(timestamp * 1000).toLocaleString("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Taipei",
        });
    };

    const handlePayment = async (orderId) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${VITE_API_BASE}/api/${VITE_API_PATH}/pay/${orderId}`);
            if (response.data.success) {
                showSuccess("付款成功！");
                fetchOrder();
            } else {
                showError("付款失敗，請稍後再試。");
            }
        } catch (e) {
            console.error("付款失敗:", e);
            showError("付款失敗，請稍後再試。");
        }
    };

    // ── 判斷是否為客製化訂單 ──────────────────────────────────
    const isCustomOrder = (message) => {
        return message?.includes("客製化顏色：") ?? false;
    };

    // ── 解析一般訂單 message（逗號分隔格式）────────────────────
    const parseMessage = (message) => {
        if (!message) return {};
        const result = {};
        // 用第一個冒號切 key/value，避免值本身含冒號（如取貨門市）被截斷
        message.split("，").forEach((pair) => {
            const colonIdx = pair.indexOf(":");
            if (colonIdx === -1) return;
            const key   = pair.slice(0, colonIdx).trim();
            const value = pair.slice(colonIdx + 1).trim();
            if (key) result[key] = value;
        });
        return result;
    };

    // ── 解析客製化訂單 message（換行分隔格式）──────────────────
    const parseCustomMessage = (message) => {
        if (!message) return { color: "", pattern: "", description: "", imgUrls: [] };
        const lines = message.split("\n");
        const getValue = (prefix) => {
            const line = lines.find((l) => l.startsWith(prefix));
            return line ? line.replace(prefix, "").trim() : "";
        };
        let imgUrls = [];
        try {
            const raw = getValue("imgUrls：");
            imgUrls = raw ? JSON.parse(raw) : [];
        } catch {
            imgUrls = [];
        }
        return {
            color: getValue("客製化顏色："),
            pattern: getValue("客製化花色："),
            description: getValue("客製化需求說明："),
            imgUrls,
        };
    };

    return (
        <div className="single-order-page py-5">
            <div className="container">
                <Loading text="訂單資料讀取中" isLoading={isLoading} />
                {/* 麵包屑 */}
                <nav
                    style={{ "--bs-breadcrumb-divider": "'>'" }}
                    aria-label="breadcrumb"
                    className="mb-3"
                >
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item">
                            <Link to="/">首頁</Link>
                        </li>
                        <li className="breadcrumb-item">
                            <Link to="/order">訂單列表</Link>
                        </li>
                        <li className="breadcrumb-item active" aria-current="page">
                            訂單明細
                        </li>
                    </ol>
                </nav>

                {/* 標題 */}
                <div className="mb-4">
                    <h2 className="order-heading-title mb-1">訂單明細</h2>
                    <p className="info-label mb-0">
                        訂單編號：<span className="text-break">{id}</span>
                    </p>
                </div>

                {/* 訂單內容：只有本人才能查看 */}
                {order && !isOwner ? (
                    <div className="order-card p-5 text-center">
                        <p className="info-value mb-0" style={{ color: "#CC355D" }}>
                            您無權限查看此訂單
                        </p>
                    </div>
                ) : isOwner ? (
                    <div className="row g-4">

                        {/* 左欄：訂單狀態 + 商品明細 */}
                        <div className="col-12 col-lg-8">

                            {/* 訂單狀態卡 */}
                            <div className="order-card mb-4">
                                <div className="order-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <h5>🎀 訂單資訊</h5>
                                    {/* 客製化訂單不顯示付款狀態 */}
                                    {!isCustomOrder(order.message) && (
                                        <span className={order.is_paid ? "badge-paid" : "badge-unpaid"}>
                                            {order.is_paid ? "✓ 已付款" : "✗ 未付款"}
                                        </span>
                                    )}
                                </div>
                                <div className="p-3 p-md-4">
                                    <div className="row g-3">
                                        <div className="col-6 col-md-4">
                                            <p className="info-label">建立日期</p>
                                            <p className="info-value">{formatDate(order.create_at)}</p>
                                        </div>
                                        {/* 客製化訂單不顯示付款日期與訂單總額 */}
                                        {!isCustomOrder(order.message) && (
                                            <>
                                                {order.is_paid && order.paid_date && (
                                                    <div className="col-6 col-md-4">
                                                        <p className="info-label">付款日期</p>
                                                        <p className="info-value">{formatDate(order.paid_date)}</p>
                                                    </div>
                                                )}
                                                <div className="col-6 col-md-4">
                                                    <p className="info-label">訂單總額</p>
                                                    <p className="info-value total-amount" style={{ fontSize: "1rem" }}>
                                                        NT$ {order.total?.toLocaleString()}
                                                    </p>
                                                </div>
                                                {!order.is_paid && (
                                                    <div className="col-6 col-md-4">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success btn-sm mt-2"
                                                            onClick={() => handlePayment(order.id)}
                                                        >立即付款</button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 商品明細卡 */}
                            <div className="order-card mb-4">
                                <div className="order-card-header">
                                    <h5>🛍️ 商品明細</h5>
                                </div>
                                <div className="px-3 px-md-4">
                                    {Object.values(order.products || {}).map((item) => (
                                        <div key={item.id} className="product-row d-flex gap-3 align-items-start">
                                            {item.product?.imageUrl && (
                                                <img
                                                    src={item.product.imageUrl}
                                                    alt={item.product.title}
                                                    className="product-img"
                                                />
                                            )}
                                            <div className="flex-grow-1 min-w-0">
                                                <p className="product-title mb-1">{item.product?.title}</p>
                                                <p className="product-meta mb-1">
                                                    {item.product?.parentCategory} · {item.product?.category}
                                                </p>
                                                {/* 客製化訂單不顯示單價 */}
                                                {!isCustomOrder(order.message) && (
                                                    <p className="product-meta mb-2">
                                                        單價 NT$ {item.product?.price} × {item.qty} {item.product?.unit}
                                                    </p>
                                                )}
                                                {item.coupon && !isCustomOrder(order.message) && (
                                                    <span className="coupon-badge">
                                                        🏷 {item.coupon.title}（{item.coupon.percent}折）
                                                    </span>
                                                )}
                                            </div>
                                            {/* 客製化訂單不顯示小計金額 */}
                                            {!isCustomOrder(order.message) && (
                                                <div className="text-end flex-shrink-0">
                                                    {item.coupon && (
                                                        <p className="info-label text-decoration-line-through">
                                                            NT$ {item.total}
                                                        </p>
                                                    )}
                                                    <p className="total-amount" style={{ fontSize: "1rem" }}>
                                                        NT$ {item.final_total?.toLocaleString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* 合計：客製化訂單顯示"另行報價" */}
                                    <div className="total-row d-flex justify-content-between align-items-center pb-3">
                                        <span className="info-label" style={{ fontSize: "0.9rem" }}>訂單合計</span>
                                        {isCustomOrder(order.message) ? (
                                            <span className="info-value" style={{ color: "#a07850", fontWeight: 600 }}>另行報價</span>
                                        ) : (
                                            <span className="total-amount">NT$ {order.total?.toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 右欄：收件人 + 付款資訊 */}
                        <div className="col-12 col-lg-4">
                            <div className="order-card mb-4">
                                <div className="order-card-header">
                                    <h5>👤 購買人資訊</h5>
                                </div>
                                <div className="p-3 p-md-4">
                                    {[
                                        { label: "姓名", value: order.user?.name },
                                        { label: "電話", value: order.user?.tel },
                                        { label: "Email", value: order.user?.email },
                                        { label: "地址", value: order.user?.address },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="mb-3">
                                            <p className="info-label">{label}</p>
                                            <p className="info-value text-break mb-0">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 根據訂單類型顯示不同資訊卡片 */}
                            {order.message && isCustomOrder(order.message) ? (
                                // ── 客製化訂單：顯示設計需求 + 參考圖片 ──
                                (() => {
                                    const custom = parseCustomMessage(order.message);
                                    return (
                                        <>
                                            <div className="order-card mb-4">
                                                <div className="order-card-header">
                                                    <h5>🎀 客製化需求</h5>
                                                </div>
                                                <div className="p-3 p-md-4">
                                                    {[
                                                        { label: "顏色", value: custom.color },
                                                        { label: "花色", value: custom.pattern },
                                                        { label: "需求說明", value: custom.description },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="mb-3">
                                                            <p className="info-label">{label}</p>
                                                            <p className="info-value text-break mb-0">{value || "—"}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {custom.imgUrls.length > 0 && (
                                                <div className="order-card mb-4">
                                                    <div className="order-card-header">
                                                        <h5>🖼️ 參考圖片</h5>
                                                    </div>
                                                    <div className="p-3 p-md-4">
                                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "8px" }}>
                                                            {custom.imgUrls.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                                                    <img
                                                                        src={url}
                                                                        alt={`參考圖 ${i + 1}`}
                                                                        style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px" }}
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()
                            ) : (
                                // ── 一般訂單：顯示收件人 + 付款方式 ──
                                (() => {
                                    const parsed = parseMessage(order.message);
                                    return (
                                        <>
                                            <div className="order-card mb-4">
                                                <div className="order-card-header">
                                                    <h5>📦 收件人資訊</h5>
                                                </div>
                                                <div className="p-3 p-md-4">
                                                    {[
                                                        { label: "姓名", value: parsed["收件人"] },
                                                        { label: "電話", value: parsed["電話"] },
                                                        { label: "Email", value: parsed["Email"] },
                                                        { label: "地址", value: parsed["地址"] },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="mb-3">
                                                            <p className="info-label">{label}</p>
                                                            <p className="info-value text-break mb-0">{value || "—"}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {parsed["付款方式"] && (
                                                <div className="order-card mb-4">
                                                    <div className="order-card-header">
                                                        <h5>💳 付款資訊</h5>
                                                    </div>
                                                    <div className="p-3 p-md-4">
                                                        <p className="info-label">付款方式</p>
                                                        <p className="info-value mb-0">{parsed["付款方式"]}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {parsed["取貨門市"] && (
                                                <div className="order-card mb-4">
                                                    <div className="order-card-header">
                                                        <h5>🏪 取貨門市</h5>
                                                    </div>
                                                    <div className="p-3 p-md-4">
                                                        <p className="info-value text-break mb-0">{parsed["取貨門市"]}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()
                            )}
                        </div>

                    </div>
                ) : (
                    <div className="order-card p-5 text-center">
                        <p className="info-value mb-0" style={{ color: "#CC355D" }}>
                            無此訂單，請重新選擇訂單
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SingleOrder;