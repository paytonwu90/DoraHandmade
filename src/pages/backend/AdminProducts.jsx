import { useState, useEffect, useRef , useCallback } from "react";
import axios from 'axios'
import * as bootstrap from 'bootstrap';
import ProductModal from '@components/backend/ProductModal';
import Pagination from '@components/Pagination';
import useMessage from "@hooks/useMessage";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;
const INITIAL_TEMPLATE_DATA = {
    id: "",
    title: "",
    category: "",
    origin_price: "",
    price: "",
    unit: "",
    description: "",
    content: "",
    is_enabled: false,
    imageUrl: "",
    imagesUrl: [],
    parentCategory: "",
    features: "",
    specifications: "",
    is_hot: false,
    is_new: false,
    published_at: "",
    is_placeholder: false, // 佔位商品（用於客製化表單送出時暫時填充購物車）
};

function AdminProducts() {
    // const [isAuth, setIsAuth] = useState(false);
    const [products, setProducts] = useState([]);
    const [templateProduct, setTemplateProduct] = useState(INITIAL_TEMPLATE_DATA);
    const [ modalType, setModalType ] = useState(""); // 'create', 'edit', 'delete'
    const [ pagination, setPagination ] = useState({});
    const [currentPage, setCurrentPage] = useState(1);// 目前頁碼
    const productModalRef = useRef(null);
    const { showError } = useMessage();

    // 取得產品列表的 API 呼叫
    const fetchProducts = useCallback(async (page = 1) => {
        try {
            const response = await axios.get(`${VITE_API_BASE}/api/${VITE_API_PATH}/admin/products?page=${page}`);
            setProducts(response.data.products);
            setPagination(response.data.pagination);
            setCurrentPage(page);
            // showSuccess("產品列表取得成功");
        } catch (error) {
            showError("取得產品列表失敗", error.message);
        }
    }, [showError]);

    const openProductModal = (type, product) => {
        setModalType(type);
        setTemplateProduct(() => ({
        ...INITIAL_TEMPLATE_DATA,
        ...product,
        imagesUrl: (product.imagesUrl && product.imagesUrl.length > 0) ? product.imagesUrl : [""],
        }));
        productModalRef.current.show();
    };

    const closeProductModal = () => {
        productModalRef.current.hide();
    };

    useEffect(() => {
        productModalRef.current = new bootstrap.Modal('#productModal', {
            keyboard: false
        });

        // Modal 關閉時移除焦點
        document
        .querySelector("#productModal")
        .addEventListener("hide.bs.modal", () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProducts();
    }, [fetchProducts]);

    return (
        <>
        <div className="container py-5 px-3">
            <h2>產品管理</h2>
            <div className="text-end mt-4">
                <button
                className="btn btn-primary btn-sm text-white"
                onClick={() => openProductModal("create", INITIAL_TEMPLATE_DATA)}>
                    建立新的產品
                </button>
            </div>
            <table className="table mt-4">
                <thead>
                <tr>
                    <th width="120">父分類</th>
                    <th width="120">子分類</th>
                    <th>產品名稱</th>
                    <th width="120">原價</th>
                    <th width="120">售價</th>
                    <th width="100">是否啟用</th>
                    <th width="120">發布日期</th>
                    <th width="100">佔位商品</th>
                    <th width="120">編輯</th>
                </tr>
                </thead>
                <tbody>
                {products.map((item) => (
                <tr key={item.id}>
                    <td>{item.parentCategory}</td>
                    <td>{item.category}</td>
                    <td>{item.title}</td>
                    <td className="text-end">{item.origin_price}</td>
                    <td className="text-end">{item.price}</td>
                    <td>
                        <span className={`badge ${item.is_enabled ? "bg-success" : "bg-secondary"}`}>
                            {item.is_enabled ? "已啟用" : "未啟用"}
                        </span>
                    </td>
                    <td>{new Date(item.published_at).toLocaleDateString()}</td>
                    <td>
                        {item.is_placeholder && (
                            <span className="badge bg-warning text-dark">佔位</span>
                        )}
                    </td>
                    <td>
                    <div className="btn-group">
                        <button
                        type="button"
                        className="btn btn-outline-primary btn-sm editBtn"
                        onClick={() => openProductModal("edit", item)}
                        >
                        編輯
                        </button>
                        <button
                        type="button"
                        className="btn btn-outline-danger btn-sm delBtn"
                        onClick={() => openProductModal("delete", item)}
                        >
                        刪除
                        </button>
                    </div>
                    </td>
                </tr>
                ))}
                </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchProducts} />
        </div>

        <ProductModal
            modalType={modalType}
            templateProduct={templateProduct}
            getProducts={fetchProducts}
            currentPage={currentPage}
            closeProductModal={closeProductModal}
        />
        </>
    )
}

export default AdminProducts;