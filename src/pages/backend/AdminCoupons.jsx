import axios from 'axios';
import useMessage from "@hooks/useMessage.jsx";
import { useState, useCallback, useEffect } from 'react';
import Pagination from '@components/Pagination';
import { confirmDelete } from "@utils/sweetAlert";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

const INITIAL_COUPON = {
    title: "",
    code: "",
    percent: "",
    due_date: "",
    is_enabled: 1,
};

// 將 timestamp 轉為 datetime-local 輸入格式 (YYYY-MM-DDTHH:mm)
const timestampToDatetimeLocal = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// datetime-local 字串轉 timestamp（秒）
const datetimeLocalToTimestamp = (str) => {
    if (!str) return "";
    return Math.floor(new Date(str).getTime() / 1000);
};

function AdminCoupons() {
    const [coupons, setCoupons] = useState([]);
    const { showError, showSuccess } = useMessage();
    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);

    // 表單狀態
    const [formMode, setFormMode] = useState(null); // null | 'create' | 'edit'
    const [formData, setFormData] = useState(INITIAL_COUPON);
    const [editingId, setEditingId] = useState(null);

    const getToken = () =>
        document.cookie.replace(
            /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
            "$1"
        );

    const fetchCoupons = useCallback(async (page = 1) => {
        try {
            const token = getToken();
            axios.defaults.headers.common.Authorization = token;
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/coupons`, {
                params: { page }
            });
            setCoupons(response.data.coupons);
            setPagination(response.data.pagination);
            setCurrentPage(page);
        } catch (error) {
            console.error("取得優惠券列表失敗:", error);
            showError("取得優惠券列表失敗");
        }
    }, [showError]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCoupons(currentPage);
    }, [fetchCoupons, currentPage]);

    // 分類：現在時間（秒）
    const nowTimestamp = Math.floor(new Date().getTime() / 1000);
    const activeCoupons  = coupons.filter(c => c.is_enabled && c.due_date >= nowTimestamp);
    const expiredCoupons = coupons.filter(c => c.due_date < nowTimestamp || !c.is_enabled);

    const formatDate = (timestamp) => {
        if (!timestamp) return "—";
        return new Date(timestamp * 1000).toLocaleString("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Taipei",
        });
    };

    // 表單欄位變更
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
        }));
    };

    // 開啟新增表單
    const handleOpenCreate = () => {
        setFormData(INITIAL_COUPON);
        setEditingId(null);
        setFormMode("create");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // 開啟編輯表單
    const handleOpenEdit = (coupon) => {
        setFormData({
            title: coupon.title,
            code: coupon.code,
            percent: coupon.percent,
            due_date: timestampToDatetimeLocal(coupon.due_date),
            is_enabled: coupon.is_enabled,
        });
        setEditingId(coupon.id);
        setFormMode("edit");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // 關閉表單
    const handleCancel = () => {
        setFormMode(null);
        setFormData(INITIAL_COUPON);
        setEditingId(null);
    };

    // 送出表單（新增 or 編輯）
    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = getToken();
        const payload = {
            data: {
                ...formData,
                percent: Number(formData.percent),
                due_date: datetimeLocalToTimestamp(formData.due_date),
            }
        };

        try {
            if (formMode === "create") {
                await axios.post(
                    `${VITE_API_BASE}/api/${VITE_API_PATH}/admin/coupon`,
                    payload,
                    { headers: { Authorization: token } }
                );
                showSuccess("優惠券新增成功");
            } else {
                await axios.put(
                    `${VITE_API_BASE}/api/${VITE_API_PATH}/admin/coupon/${editingId}`,
                    payload,
                    { headers: { Authorization: token } }
                );
                showSuccess("優惠券更新成功");
            }
            handleCancel();
            fetchCoupons(currentPage);
        } catch (error) {
            console.error("儲存優惠券失敗:", error);
            showError("儲存優惠券失敗");
        }
    };

    // 刪除優惠券
    const handleDelete = async (coupon) => {
        const confirmed = await confirmDelete(
            `確定刪除優惠券？`,
            `「${coupon.title}」刪除後無法復原`
        );
        if (!confirmed) return;
        try {
            const token = getToken();
            await axios.delete(
                `${VITE_API_BASE}/api/${VITE_API_PATH}/admin/coupon/${coupon.id}`,
                { headers: { Authorization: token } }
            );
            showSuccess("優惠券刪除成功");
            fetchCoupons(currentPage);
        } catch (error) {
            console.error("刪除優惠券失敗:", error);
            showError("刪除優惠券失敗");
        }
    };

    // 共用表格 row
    const CouponRow = ({ coupon, expired }) => (
        <tr className={expired ? "table-secondary text-muted" : ""}>
            <td>{coupon.title}</td>
            <td>
                <code>{coupon.code}</code>
            </td>
            <td>{coupon.percent} 折</td>
            <td>
                <span className={expired ? "text-danger" : ""}>
                    {formatDate(coupon.due_date)}
                </span>
            </td>
            <td>
                <span className={`badge ${coupon.is_enabled ? "bg-success" : "bg-secondary"}`}>
                    {coupon.is_enabled ? "啟用" : "停用"}
                </span>
            </td>
            <td>
                <div className="btn-group btn-group-sm">
                    <button
                        type="button"
                        className="btn btn-outline-blue btn-sm editBtn"
                        onClick={() => handleOpenEdit(coupon)}
                    >
                        編輯
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm delBtn"
                        onClick={() => handleDelete(coupon)}
                    >
                        刪除
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="container mt-4 py-5 px-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="mb-0">優惠券管理</h1>
                <button
                    className="btn btn-primary btn-sm text-white"
                    onClick={handleOpenCreate}
                    disabled={formMode === "create"}
                >
                    + 新增優惠券
                </button>
            </div>

            {/* ========== 新增 / 編輯表單 ========== */}
            {formMode && (
                <div className="card border-primary mb-4 shadow-sm">
                    <div className="card-header bg-primary text-white fw-bold">
                        {formMode === "create" ? "✚ 新增優惠券" : "✎ 編輯優惠券"}
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">

                                {/* 名稱 */}
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold">優惠券名稱 <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="例：新會員折扣"
                                        required
                                    />
                                </div>

                                {/* 代碼 */}
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold">優惠代碼 <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleChange}
                                        placeholder="例：newmember"
                                        required
                                    />
                                </div>

                                {/* 折扣 */}
                                <div className="col-12 col-md-4">
                                    <label className="form-label fw-bold">折扣（%） <span className="text-danger">*</span></label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="percent"
                                        value={formData.percent}
                                        onChange={handleChange}
                                        placeholder="例：95（即 95 折）"
                                        min="1"
                                        max="99"
                                        required
                                    />
                                </div>

                                {/* 到期日 */}
                                <div className="col-12 col-md-5">
                                    <label className="form-label fw-bold">到期日 <span className="text-danger">*</span></label>
                                    <input
                                        type="datetime-local"
                                        className="form-control"
                                        name="due_date"
                                        value={formData.due_date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {/* 啟用狀態 */}
                                <div className="col-12 col-md-3 d-flex align-items-end pb-2">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isEnabledSwitch"
                                            name="is_enabled"
                                            checked={formData.is_enabled === 1}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label fw-bold" htmlFor="isEnabledSwitch">
                                            {formData.is_enabled ? "啟用" : "停用"}
                                        </label>
                                    </div>
                                </div>

                            </div>

                            <div className="d-flex gap-2 justify-content-end mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary cancelBtn"
                                    onClick={handleCancel}
                                >
                                    取消
                                </button>
                                <button type="submit" className="btn btn-primary text-white">
                                    {formMode === "create" ? "新增" : "儲存變更"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== (1) 已啟用、未過期 ========== */}
            <div className="mb-5">
                <h5 className="fw-bold mb-3">
                    ✅ 有效優惠券
                    <span className="badge bg-success ms-2">{activeCoupons.length}</span>
                </h5>
                {activeCoupons.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-bordered align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>名稱</th>
                                    <th>代碼</th>
                                    <th>折扣</th>
                                    <th>到期日</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCoupons.map(coupon => (
                                    <CouponRow key={coupon.id} coupon={coupon} expired={false} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-muted">目前沒有有效的優惠券。</p>
                )}
            </div>

            {/* ========== (2) 已啟用、已過期 ========== */}
            <div className="mb-4">
                <h5 className="fw-bold mb-3 text-muted">
                    ⏰ 已過期優惠券
                    <span className="badge bg-secondary ms-2">{expiredCoupons.length}</span>
                </h5>
                {expiredCoupons.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-bordered align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>名稱</th>
                                    <th>代碼</th>
                                    <th>折扣</th>
                                    <th>到期日</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expiredCoupons.map(coupon => (
                                    <CouponRow key={coupon.id} coupon={coupon} expired={true} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-muted">目前沒有已過期的優惠券。</p>
                )}
            </div>

            <Pagination pagination={pagination} onPageChange={fetchCoupons} />
        </div>
    );
}

export default AdminCoupons;
