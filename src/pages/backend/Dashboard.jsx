import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import useMessage from "@hooks/useMessage";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

const getToken = () =>
    document.cookie.replace(
        /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
        "$1"
    );

function StatCard({ title, value, sub, color, icon, onClick }) {
    return (
        <div
            className={`card border-0 shadow-sm h-100 ${onClick ? "cursor-pointer" : ""}`}
            style={{ borderLeft: `4px solid ${color}`, cursor: onClick ? "pointer" : "default" }}
            onClick={onClick}
        >
            <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                    <p className="text-muted small mb-1">{title}</p>
                    <h3 className="fw-bold mb-0">{value}</h3>
                    {sub && <p className="text-muted small mb-0 mt-1">{sub}</p>}
                </div>
                <div style={{ fontSize: "2.2rem", opacity: 0.25 }}>{icon}</div>
            </div>
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const { showError } = useMessage();
    const [loading, setLoading] = useState(true);

    // 商品
    const [products, setProducts] = useState([]);
    // 訂單
    const [orders, setOrders] = useState([]);
    // 優惠券
    const [coupons, setCoupons] = useState([]);

    const fetchAll = useCallback(async () => {
        const token = getToken();
        axios.defaults.headers.common.Authorization = token;
        setLoading(true);
        try {
            // 商品：先取第一頁拿 total_pages，再並行取剩餘頁
            const firstProdRes = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/products`, {
                params: { page: 1 }
            });
            const totalPages = firstProdRes.data.pagination?.total_pages || 1;
            let allProducts = [...(firstProdRes.data.products || [])];

            if (totalPages > 1) {
                const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
                const restRes = await Promise.all(
                    restPages.map(page =>
                        axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/products`, { params: { page } })
                    )
                );
                restRes.forEach(res => {
                    allProducts = [...allProducts, ...(res.data.products || [])];
                });
            }

            // 訂單、優惠券取第一頁即可（儀表板顯示摘要）
            const [orderRes, couponRes] = await Promise.all([
                axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/orders`, { params: { page: 1 } }),
                axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/coupons`, { params: { page: 1 } }),
            ]);

            setProducts(allProducts);
            setOrders(orderRes.data.orders || []);
            setCoupons(couponRes.data.coupons || []);
        } catch (err) {
            console.error("Dashboard 資料取得失敗:", err);
            showError("Dashboard 資料取得失敗");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // ---- 商品統計 ----
    const enabledProducts  = products.filter(p => p.is_enabled);
    const disabledProducts = products.filter(p => !p.is_enabled);
    const hotProducts      = products.filter(p => p.is_hot);
    const newProducts      = products.filter(p => p.is_new);

    // ---- 訂單統計 ----
    const paidOrders   = orders.filter(o => o.is_paid);
    const unpaidOrders = orders.filter(o => !o.is_paid);
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const unpaidRevenue = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // ---- 優惠券統計 ----
    const nowTs = Math.floor(Date.now() / 1000);
    const activeCoupons  = coupons.filter(c => c.is_enabled && c.due_date >= nowTs);
    const expiredCoupons = coupons.filter(c => c.due_date < nowTs || !c.is_enabled);

    // ---- 最新 5 筆訂單 ----
    const recentOrders = [...orders]
        .sort((a, b) => b.create_at - a.create_at)
        .slice(0, 5);

    const isCustomOrder = (message) => message?.includes("客製化顏色：") ?? false;

    const formatDate = (ts) => {
        if (!ts) return "—";
        return new Date(ts * 1000).toLocaleString("zh-TW", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
            timeZone: "Asia/Taipei",
        });
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">載入中...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5 px-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="mb-0">儀表板</h1>
                    <p className="text-muted small mb-0">後台管理系統總覽</p>
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchAll}>
                    ↻ 重新整理
                </button>
            </div>

            {/* ========== 商品統計 ========== */}
            <h5 className="fw-bold text-muted mb-3 border-bottom pb-2">🛍️ 商品</h5>
            <div className="row g-3 mb-5">
                <div className="col-6 col-md-3">
                    <StatCard
                        title="已啟用商品"
                        value={enabledProducts.length}
                        sub={`共 ${products.length} 項商品`}
                        color="#198754"
                        icon="✅"
                        onClick={() => navigate("/admin/product")}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="未啟用商品"
                        value={disabledProducts.length}
                        color="#6c757d"
                        icon="🚫"
                        onClick={() => navigate("/admin/product")}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="本週熱賣"
                        value={hotProducts.length}
                        color="#fd7e14"
                        icon="🔥"
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="新品上架"
                        value={newProducts.length}
                        color="#0dcaf0"
                        icon="🆕"
                    />
                </div>
            </div>

            {/* ========== 訂單統計 ========== */}
            <h5 className="fw-bold text-muted mb-3 border-bottom pb-2">📦 訂單</h5>
            <div className="row g-3 mb-5">
                <div className="col-6 col-md-3">
                    <StatCard
                        title="已付款訂單"
                        value={paidOrders.length}
                        sub={`NT$ ${totalRevenue.toLocaleString()}`}
                        color="#198754"
                        icon="💰"
                        onClick={() => navigate("/admin/order")}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="未付款訂單"
                        value={unpaidOrders.length}
                        sub={`待收 NT$ ${unpaidRevenue.toLocaleString()}`}
                        color="#dc3545"
                        icon="⏳"
                        onClick={() => navigate("/admin/order")}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="本頁訂單總數"
                        value={orders.length}
                        color="#0d6efd"
                        icon="📋"
                        onClick={() => navigate("/admin/order")}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="已付款金額"
                        value={`NT$ ${totalRevenue.toLocaleString()}`}
                        color="#6f42c1"
                        icon="📊"
                    />
                </div>
            </div>

            {/* ========== 優惠券統計 ========== */}
            <h5 className="fw-bold text-muted mb-3 border-bottom pb-2">🏷️ 優惠券</h5>
            <div className="row g-3 mb-5">
                <div className="col-6 col-md-3">
                    <StatCard
                        title="有效優惠券"
                        value={activeCoupons.length}
                        color="#198754"
                        icon="✅"
                        onClick={() => navigate("/admin/coupon")}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <StatCard
                        title="已過期 / 停用"
                        value={expiredCoupons.length}
                        color="#6c757d"
                        icon="⏰"
                        onClick={() => navigate("/admin/coupon")}
                    />
                </div>
            </div>

            {/* ========== 最新訂單列表 ========== */}
            <h5 className="fw-bold text-muted mb-3 border-bottom pb-2">🕐 最新 5 筆訂單</h5>
            {recentOrders.length > 0 ? (
                <div className="table-responsive mb-4">
                    <table className="table table-bordered align-middle">
                        <thead className="table-light">
                            <tr>
                                <th style={{ minWidth: "160px" }}>訂單編號</th>
                                <th>顧客</th>
                                <th>狀態</th>
                                <th>日期</th>
                                <th className="text-end">金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map(order => (
                                <tr key={order.id}>
                                    <td className="text-break small">{order.id}</td>
                                    <td>{order.user?.name}</td>
                                    <td>
                                        {isCustomOrder(order.message) ? (
                                            <span className="badge bg-warning text-dark">另行報價</span>
                                        ) : (
                                            <span className={`badge ${order.is_paid ? "bg-success" : "bg-secondary"}`}>
                                                {order.is_paid ? "已付款" : "未付款"}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(order.create_at)}</td>
                                    <td className="text-end">
                                        {isCustomOrder(order.message)
                                            ? <span style={{ color: "#a07850", fontWeight: 600 }}>另行報價</span>
                                            : `NT$ ${order.total?.toLocaleString()}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-muted">目前沒有訂單資料。</p>
            )}

            <div className="text-end">
                <button
                    className="btn btn-outline-primary btn-sm checkBtn"
                    onClick={() => navigate("/admin/order")}
                >
                    查看全部訂單 →
                </button>
            </div>
        </div>
    );
}

export default Dashboard;