import { useState } from "react";
import axios from "axios";
import useMessage from "@hooks/useMessage";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

function OrderModal({
    modalType,
    templateOrder,
    getOrders,
    currentPage,
    closeOrderModal,
}) {
    const { showSuccess, showError } = useMessage();
    // Debug log: 檢查收到的 props
    // console.log("OrderModal props", { modalType, templateOrder, getOrders, currentPage, closeOrderModal });

    const [isPaid, setIsPaid] = useState(templateOrder.is_paid || false);

    // 沒有資料時不渲染 Modal
    if (!templateOrder?.id || !modalType) return null;

    const formatDate = (timestamp) => {
        if (!timestamp) return "—";
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

    // 判斷是否為客製化訂單
    const isCustomOrder = (message) => message?.includes("客製化顏色：") ?? false;

    // 解析一般訂單 message（逗號分隔）
    const parseMessage = (message) => {
        if (!message) return {};
        const result = {};
        // 用第一個冒號切 key/value，避免值含多個冒號（如取貨門市）被截斷
        message.split("，").forEach((pair) => {
            const colonIdx = pair.indexOf(":");
            if (colonIdx === -1) return;
            const key   = pair.slice(0, colonIdx).trim();
            const value = pair.slice(colonIdx + 1).trim();
            if (key) result[key] = value;
        });
        return result;
    };

    // 解析客製化訂單 message（換行分隔）
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
        } catch { imgUrls = []; }
        return {
            color: getValue("客製化顏色："),
            pattern: getValue("客製化花色："),
            description: getValue("客製化需求說明："),
            imgUrls,
        };
    };

    // 取得 token
    const getToken = () =>
        document.cookie.replace(
            /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
            "$1"
        );

    // 編輯訂單（更新付款狀態）
    const handleEdit = async () => {
        try {
            const token = getToken();
            await axios.put(
                `${VITE_API_BASE}/api/${VITE_API_PATH}/admin/order/${templateOrder.id}`,
                { data: { ...templateOrder, is_paid: isPaid } },
                { headers: { Authorization: token } }
            );
            showSuccess("訂單更新成功");
            getOrders(currentPage);
            closeOrderModal();
        } catch (error) {
            console.error("更新訂單失敗:", error);
            showError("更新訂單失敗");
        }
    };

    // 刪除訂單
    const handleDelete = async () => {
        try {
            const token = getToken();
            await axios.delete(
                `${VITE_API_BASE}/api/${VITE_API_PATH}/admin/order/${templateOrder.id}`,
                { headers: { Authorization: token } }
            );
            showSuccess("訂單刪除成功");
            getOrders(currentPage);
            closeOrderModal();
        } catch (error) {
            console.error("刪除訂單失敗:", error);
            showError("刪除訂單失敗");
        }
    };

    const isCustom = isCustomOrder(templateOrder?.message);
    const parsed = parseMessage(templateOrder?.message);
    const custom = parseCustomMessage(templateOrder?.message);
    const products = Object.values(templateOrder?.products || {});

    return (
        <>
        <div
            className="modal fade"
            id="orderModal"
            tabIndex="-1"
            aria-labelledby="orderModalLabel"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-xl">
                <div className="modal-content border-0">

                    {/* Header */}
                    <div className={`modal-header bg-${modalType === "delete" ? "danger" : "dark"} text-white`}>
                        <h5 className="modal-title" id="orderModalLabel">
                            {modalType === "delete" ? "刪除" : "編輯"}訂單
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    {/* Body */}
                    <div className="modal-body p-4">
                        {templateOrder && (
                            <>
                                {/* 刪除確認訊息 */}
                                {modalType === "delete" && (
                                    <div className="alert alert-danger">
                                        確定要刪除訂單 <strong>{templateOrder.id}</strong> 嗎？此操作無法復原。
                                    </div>
                                )}

                                <div className="row g-4">

                                    {/* 左欄：訂單資訊 + 付款狀態編輯 */}
                                    <div className="col-12 col-lg-5">

                                        {/* 訂單基本資訊 */}
                                        <h6 className="fw-bold border-bottom pb-2 mb-3">訂單資訊</h6>
                                        <div className="mb-2">
                                            <small className="text-muted">訂單編號</small>
                                            <p className="mb-0 text-break small">{templateOrder.id}</p>
                                        </div>
                                        <div className="mb-2">
                                            <small className="text-muted">建立日期</small>
                                            <p className="mb-0">{formatDate(templateOrder.create_at)}</p>
                                        </div>
                                        {templateOrder.is_paid && templateOrder.paid_date && (
                                            <div className="mb-2">
                                                <small className="text-muted">付款日期</small>
                                                <p className="mb-0">{formatDate(templateOrder.paid_date)}</p>
                                            </div>
                                        )}
                                        <div className="mb-3">
                                            <small className="text-muted">訂單金額</small>
                                            {isCustom ? (
                                                <p className="mb-0 fw-bold" style={{ color: "#a07850" }}>另行報價</p>
                                            ) : (
                                                <p className="mb-0 fw-bold">NT$ {templateOrder.total?.toLocaleString()}</p>
                                            )}
                                        </div>

                                        {/* 付款狀態（客製化訂單隱藏） */}
                                        {!isCustom && (
                                            <>
                                                <h6 className="fw-bold border-bottom pb-2 mb-3">付款狀態</h6>
                                                <div className="form-check form-switch mb-4">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="isPaidSwitch"
                                                        checked={isPaid}
                                                        onChange={(e) => setIsPaid(e.target.checked)}
                                                        disabled={modalType === "delete"}
                                                    />
                                                    <label className="form-check-label" htmlFor="isPaidSwitch">
                                                        <span className={`badge ${isPaid ? "bg-success" : "bg-secondary"}`}>
                                                            {isPaid ? "已付款" : "未付款"}
                                                        </span>
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        {/* 購買人資訊 */}
                                        <h6 className="fw-bold border-bottom pb-2 mb-3">購買人資訊</h6>
                                        {[
                                            { label: "姓名", value: templateOrder.user?.name },
                                            { label: "電話", value: templateOrder.user?.tel },
                                            { label: "Email", value: templateOrder.user?.email },
                                            { label: "地址", value: templateOrder.user?.address },
                                        ].map(({ label, value }) => (
                                            <div className="mb-2" key={label}>
                                                <small className="text-muted">{label}</small>
                                                <p className="mb-0 text-break">{value || "—"}</p>
                                            </div>
                                        ))}

                                        {/* 一般訂單：收件人 + 付款方式 */}
                                        {!isCustom && (
                                            <>
                                                {(parsed["收件人"] || parsed["電話"] || parsed["地址"]) && (
                                                    <div className="mt-3">
                                                        <h6 className="fw-bold border-bottom pb-2 mb-3">收件人資訊</h6>
                                                        {[
                                                            { label: "姓名", key: "收件人" },
                                                            { label: "電話", key: "電話" },
                                                            { label: "Email", key: "Email" },
                                                            { label: "地址", key: "地址" },
                                                        ].map(({ label, key }) => parsed[key] && (
                                                            <div className="mb-2" key={key}>
                                                                <small className="text-muted">{label}</small>
                                                                <p className="mb-0 text-break">{parsed[key]}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {parsed["付款方式"] && (
                                                    <div className="mt-3">
                                                        <h6 className="fw-bold border-bottom pb-2 mb-3">付款方式</h6>
                                                        <p className="mb-0">{parsed["付款方式"]}</p>
                                                    </div>
                                                )}
                                                {parsed["取貨門市"] && (
                                                    <div className="mt-3">
                                                        <h6 className="fw-bold border-bottom pb-2 mb-3">取貨門市</h6>
                                                        <p className="mb-0 text-break">{parsed["取貨門市"]}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* 客製化訂單：設計需求 + 參考圖片 */}
                                        {isCustom && (
                                            <div className="mt-3">
                                                <h6 className="fw-bold border-bottom pb-2 mb-3">🎀 客製化需求</h6>
                                                {[
                                                    { label: "顏色", value: custom.color },
                                                    { label: "花色", value: custom.pattern },
                                                    { label: "需求說明", value: custom.description },
                                                ].map(({ label, value }) => (
                                                    <div className="mb-2" key={label}>
                                                        <small className="text-muted">{label}</small>
                                                        <p className="mb-0 text-break">{value || "—"}</p>
                                                    </div>
                                                ))}
                                                {custom.imgUrls.length > 0 && (
                                                    <div className="mt-2">
                                                        <small className="text-muted d-block mb-2">參考圖片</small>
                                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: "8px" }}>
                                                            {custom.imgUrls.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                                                    <img
                                                                        src={url}
                                                                        alt={`參考圖 ${i + 1}`}
                                                                        style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px", border: "1px solid #eee" }}
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 右欄：商品明細 */}
                                    <div className="col-12 col-lg-7">
                                        <h6 className="fw-bold border-bottom pb-2 mb-3">
                                            商品明細
                                            <span className="text-muted fw-normal ms-2" style={{ fontSize: "0.85rem" }}>
                                                共 {products.length} 項
                                            </span>
                                        </h6>

                                        <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                                            {products.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="d-flex gap-3 align-items-start py-3 border-bottom"
                                                >
                                                    {/* 商品圖 */}
                                                    {item.product?.imageUrl && (
                                                        <img
                                                            src={item.product.imageUrl}
                                                            alt={item.product.title}
                                                            style={{
                                                                width: "64px",
                                                                height: "64px",
                                                                objectFit: "cover",
                                                                borderRadius: "6px",
                                                                border: "1px solid #eee",
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    )}
                                                    {/* 商品資訊 */}
                                                    <div className="flex-grow-1 min-w-0">
                                                        <p className="fw-bold mb-0" style={{ fontSize: "0.9rem" }}>
                                                            {item.product?.title}
                                                        </p>
                                                        <p className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
                                                            {item.product?.parentCategory} · {item.product?.category}
                                                        </p>
                                                        <p className="mb-1" style={{ fontSize: "0.82rem" }}>
                                                            NT$ {item.product?.price} × {item.qty} {item.product?.unit}
                                                        </p>
                                                        {item.coupon && (
                                                            <span
                                                                className="badge"
                                                                style={{
                                                                    background: "#fff0f4",
                                                                    color: "#c0607a",
                                                                    border: "1px solid #f5c6d0",
                                                                    fontSize: "0.72rem",
                                                                }}
                                                            >
                                                                🏷 {item.coupon.title}（{item.coupon.percent}折）
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* 小計：客製化不顯示 */}
                                                    {!isCustom && (
                                                        <div className="text-end flex-shrink-0">
                                                            {item.coupon && (
                                                                <p className="text-muted text-decoration-line-through mb-0"
                                                                   style={{ fontSize: "0.78rem" }}>
                                                                    NT$ {item.total}
                                                                </p>
                                                            )}
                                                            <p className="fw-bold mb-0" style={{ color: "#c0607a", fontSize: "0.9rem" }}>
                                                                NT$ {item.final_total?.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* 訂單合計 */}
                                        <div className="d-flex justify-content-between align-items-center pt-3">
                                            <span className="text-muted">訂單合計</span>
                                            {isCustom ? (
                                                <span className="fw-bold fs-5" style={{ color: "#a07850" }}>另行報價</span>
                                            ) : (
                                                <span className="fw-bold fs-5" style={{ color: "#c0607a" }}>
                                                    NT$ {templateOrder.total?.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-outline-primary cancelBtn"
                            data-bs-dismiss="modal"
                        >
                            取消
                        </button>
                        {modalType === "delete" ? (
                            <button
                                type="button"
                                className="btn btn-danger text-white"
                                onClick={handleDelete}
                            >
                                確認刪除
                            </button>
                        ) : isCustom ? (
                            // 客製化訂單：不顯示付款相關的儲存按鈕
                            null
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary text-white"
                                onClick={handleEdit}
                            >
                                儲存變更
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
        </>
    );
}

export default OrderModal;