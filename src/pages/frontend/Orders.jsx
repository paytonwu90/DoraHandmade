import { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import UserContext from "@contexts/UserContext";
import useMessage from "@hooks/useMessage";
import Loading from "@components/Loading";
import axios from 'axios';
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

function Orders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { showError, showSuccess } = useMessage();
    const { user } = useContext(UserContext);

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/orders`);
            setOrders(response.data.orders);
        } catch (error) {
            console.error("獲取訂單列表失敗:", error);
            showError("獲取訂單列表失敗");
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        setIsLoading(true);
        fetchOrders();
    }, [fetchOrders]);

    const handleViewMoreOrder = (orderId) => {
        navigate(`/order/${orderId}`);
    };

    const handlePayment = async (orderId) => {
        try {
            const response = await axios.post(`${VITE_API_BASE}/api/${VITE_API_PATH}/pay/${orderId}`);
            if (response.data.success) {
                showSuccess("付款成功！");
                fetchOrders();
            } else {
                showError("付款失敗，請稍後再試。");
            }
        } catch (e) {
            console.error("付款失敗:", e);
            showError("付款失敗，請稍後再試。");
        }
    };

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

    // 判斷是否為客製化訂單
    const isCustomOrder = (message) => message?.includes("客製化顏色：") ?? false;

    const filteredOrders = user
        ? orders.filter((order) => order.user?.email === user.email)
        : [];

    return (
        <div className="container my-5">
            <Loading isLoading={isLoading} text="訂單列表載入中" />
            {/* 麵包屑 */}
            <nav aria-label="breadcrumb" className="mb-3">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <Link to="/">首頁</Link>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        訂單列表
                    </li>
                </ol>
            </nav>
            <h2 className="order-heading-title mb-4">
                {user?.name} 訂單列表
            </h2>

            {/* 電腦版 */}
            <div className="table-responsive d-none d-md-block">
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th style={{ background: "#EAE1E3" }} scope="col">訂單編號</th>
                            <th style={{ background: "#EAE1E3" }} scope="col">訂單日期</th>
                            <th style={{ background: "#EAE1E3" }} scope="col">購買人</th>
                            <th style={{ background: "#EAE1E3" }} scope="col">訂單狀態</th>
                            <th style={{ background: "#EAE1E3" }} scope="col">訂單金額</th>
                            <th style={{ background: "#EAE1E3" }} scope="col">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {user ? (
                            filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="text-break" style={{ maxWidth: "160px", fontSize: "0.85rem" }}>
                                            {order.id}
                                        </td>
                                        <td>{formatDate(order.create_at)}</td>
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
                                        <td>
                                            {isCustomOrder(order.message)
                                                ? <span style={{ color: "#a07850", fontWeight: 600 }}>另行報價</span>
                                                : `NT$ ${order.total?.toLocaleString()}`}
                                        </td>
                                        <td>
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    type="button"
                                                    className="btn viewMoreBtn"
                                                    onClick={() => handleViewMoreOrder(order.id)}
                                                >查看</button>
                                                {!order.is_paid && !isCustomOrder(order.message) && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-success"
                                                        onClick={() => handlePayment(order.id)}
                                                    >付款</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        沒有符合的訂單。
                                    </td>
                                </tr>
                            )
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-4 text-muted">
                                    請先登入以查看訂單列表。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 手機版卡片 */}
            <div className="d-md-none">
                {user ? (
                    filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <div key={order.id} className="card mb-3 shadow-sm">
                                <div className="card-body">

                                    {/* 訂單編號 + 狀態 */}
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <small className="text-muted">訂單編號</small>
                                            <p className="mb-0 text-break"
                                               style={{ fontSize: "0.8rem", maxWidth: "200px" }}>
                                                {order.id}
                                            </p>
                                        </div>
                                        {isCustomOrder(order.message) ? (
                                            <span className="badge bg-warning text-dark">另行報價</span>
                                        ) : (
                                            <span className={`badge ${order.is_paid ? "bg-success" : "bg-secondary"}`}>
                                                {order.is_paid ? "已付款" : "未付款"}
                                            </span>
                                        )}
                                    </div>

                                    <hr className="my-2" />

                                    {/* 訂單資訊 */}
                                    <div className="row g-2 mb-2">
                                        <div className="col-6">
                                            <small className="text-muted d-block">購買人</small>
                                            <span>{order.user?.name}</span>
                                        </div>
                                        <div className="col-6">
                                            <small className="text-muted d-block">訂單金額</small>
                                            {isCustomOrder(order.message) ? (
                                                <span style={{ color: "#a07850", fontWeight: 600 }}>另行報價</span>
                                            ) : (
                                                <span className="fw-bold">NT$ {order.total?.toLocaleString()}</span>
                                            )}
                                        </div>
                                        <div className="col-12">
                                            <small className="text-muted d-block">訂單日期</small>
                                            <span style={{ fontSize: "0.875rem" }}>
                                                {formatDate(order.create_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 操作按鈕 */}
                                    <div className="d-flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            className="btn viewMoreBtn btn-sm flex-fill"
                                            onClick={() => handleViewMoreOrder(order.id)}
                                        >查看訂單</button>
                                        {!order.is_paid && !isCustomOrder(order.message) && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-success btn-sm flex-fill"
                                                onClick={() => handlePayment(order.id)}
                                            >立即付款</button>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <p>沒有符合的訂單。</p>
                        </div>
                    )
                ) : (
                    <div className="text-center py-5 text-muted">
                        <p>請先登入以查看訂單列表。</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Orders;
