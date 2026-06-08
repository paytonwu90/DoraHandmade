import axios from 'axios'
import { useState, useCallback, useEffect, useRef } from 'react';
import * as bootstrap from 'bootstrap';
import useMessage from "@hooks/useMessage.jsx";
import OrderModal from '@components/backend/OrderModal';
import Pagination from '@components/Pagination';
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

function AdminOrders() {
    const [ orders, setOrders ] = useState([]);
    const [ templateOrder, setTemplateOrder ] = useState({});
    const [ modalType, setModalType ] = useState("");
    const [ pagination, setPagination ] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const { showError } = useMessage();
    const orderModalRef = useRef(null);


    // 取得訂單列表的 API 呼叫
    const fetchOrders = useCallback(async (page = 1) => {
        try {
            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
                "$1"
            );
            axios.defaults.headers.common.Authorization = token;
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/orders`, {
                params: { page },
                headers: { Authorization: token },
            });
            setOrders(response.data.orders);
            setPagination(response.data.pagination);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching orders:", error);
            showError("取得訂單列表失敗");
        }
    }, [showError]);

    const isCustomOrder = (message) => message?.includes("客製化顏色：") ?? false;

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

    const openOrderModal = (type, order) => {
        setTemplateOrder(order);
        setModalType(type);
    };

    const closeOrderModal = () => {
        orderModalRef.current?.hide();
    };

    // Modal 初始化：只有當 templateOrder.id 和 modalType 有值時才初始化 Modal
    useEffect(() => {
        if (templateOrder?.id && modalType) {
            const modalEl = document.querySelector("#orderModal");
            if (modalEl) {
                orderModalRef.current = new bootstrap.Modal(modalEl, { keyboard: false });
                modalEl.addEventListener("hidden.bs.modal", () => {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                });
                orderModalRef.current.show();
            }
        }
    }, [templateOrder, modalType]);

    // 資料 fetch
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders(1);
    }, [fetchOrders]);


    return (
        <>
        <div className="container py-5 px-3">
            <h1>訂單管理</h1>
            <table className="table table-bordered mt-4">
                <thead>
                    <tr>
                        <th>訂單編號</th>
                        <th>顧客名稱</th>
                        <th>訂單狀態</th>
                        <th>訂單日期</th>
                        <th>訂單金額</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order.id}>
                            <td>{order.id}</td>
                            <td>{order.user.name}</td>
                            <td>
                                {isCustomOrder(order.message) ? (
                                    <span className="badge bg-warning text-dark">另行報價</span>
                                ) : (
                                    <span className={`badge ${order.is_paid ? "bg-success" : "bg-secondary"}`}>
                                        {order.is_paid ? "已付款" : "未付款"}
                                    </span>
                                )}
                            </td>
                            <td>{formatDate(order.create_at)}</td>
                            <td>
                                {isCustomOrder(order.message)
                                    ? <span style={{ color: "#a07850", fontWeight: 600 }}>另行報價</span>
                                    : `NT$ ${order.total?.toLocaleString()}`}
                            </td>
                            <td>
                                <div className="btn-group">
                                    <button
                                        type="button"
                                        className="btn btn-outline-blue btn-sm editBtn"
                                        onClick={() => openOrderModal("edit", order)}
                                    >
                                        編輯
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm delBtn"
                                        onClick={() => openOrderModal("delete", order)}
                                        >
                                        刪除
                                        </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchOrders} />
        </div>
        <OrderModal
            key={`${templateOrder?.id ?? "new"}-${modalType}`}
            modalType={modalType}
            templateOrder={templateOrder}
            getOrders={fetchOrders}
            currentPage={currentPage}
            closeOrderModal={closeOrderModal}
        />
        </>
    )
}

export default AdminOrders;