import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ShoppingCart, Heart, Minus, Plus, ChevronRight } from "lucide-react";
import { HeartFill } from "@components/icons";
import axios from "axios";
import { useCartActionContext } from "@contexts/CartAction";
import { useFavoriteProductsContext } from "@contexts/FavoriteProducts";
import ProductCard from "@components/ProductCard";

// API 設定
const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

// 商品 category 欄位（中文）對應路由路徑
const CATEGORY_PATH_MAP = {
  蝴蝶結: "handmade/bow",
  帶子: "material/ribbon",
  夾子: "material/clip",
  貼片: "material/patch",
};

function SingleProduct() {
  const [qty, setQty] = useState(1);
  const [qtyDisplay, setQtyDisplay] = useState("1");
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  const { handleAddToCart } = useCartActionContext();

  // 收藏 Context
  const { toggleFavoriteProduct, isProductFavorite } = useFavoriteProductsContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, allProductsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/${API_PATH}/product/${id}`),
          axios.get(`${API_BASE}/api/${API_PATH}/products/all`),
        ]);

        const currentProduct = productRes.data.product;
        setProduct(currentProduct);

        // 相關商品：同類別優先，不足 4 筆再從其他類別補
        const allProducts = allProductsRes.data.products?.filter(
          (p) => p.is_enabled && !p.is_placeholder
        ) || [];
        const sameCategory = allProducts.filter(
          (p) => p.category === currentProduct.category && p.id !== currentProduct.id
        );
        const others = allProducts.filter(
          (p) => p.category !== currentProduct.category
        );
        setRelatedProducts([...sameCategory, ...others].slice(0, 4));
      } catch (error) {
        console.error("取得商品失敗：", error);
        alert("商品載入失敗，請稍後再試");
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleQtyChange = (delta) => {
    const newQty = Math.max(1, Math.min(99, qty + delta));
    setQty(newQty);
    setQtyDisplay(String(newQty));
  };

  const handleQtyInput = (e) => {
    setQtyDisplay(e.target.value);
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setQty(Math.max(1, Math.min(99, val)));
    }
  };

  const handleQtyBlur = () => {
    if (qtyDisplay === "" || isNaN(parseInt(qtyDisplay, 10))) {
      setQty(1);
      setQtyDisplay("1");
    } else {
      setQtyDisplay(String(qty));
    }
  };

  const handleQtyKeyDown = (e) => {
    // Ctrl / Meta（Mac Cmd）/ Alt 組合鍵一律放行，避免攔截到瀏覽器快捷鍵（如 Ctrl+R、Ctrl+A）
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    // Function key（F1–F12）放行，避免攔截 F5 重新整理、F12 開發者工具等
    if (/^F\d+$/.test(e.key)) return;
    
    // 允許數字（0–9）以及編輯與導覽用的控制鍵
    const controlKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End"];
    if (controlKeys.includes(e.key) || /^\d$/.test(e.key)) return;
    
    // 其餘直接攔截（字母、符號等）；IME 輸入（如注音）無法在此攔截，由 onBlur 重設處理
    e.preventDefault();
  };

  const handleBuyNow = async () => {
    const success = await handleAddToCart(product, qty);
    if (success) navigate("/cart");
  };

  if (!product) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">商品資料讀取中...</p>
      </div>
    );
  }

  // 單一商品收藏狀態
  const isCurrentFavorite = isProductFavorite(product);

  return (
    <div className="container pt-6 pt-lg-12">
      <nav className="mb-6" aria-label="breadcrumb">
        <div className="breadcrumb-custom">
          <a href="#">首頁</a>
          <ChevronRight size={16} />
          <a href="#/product">全部商品</a>
          <ChevronRight size={16} />
          <a href={`#/category/${CATEGORY_PATH_MAP[product.category]}`}>{product.category}</a>
          <ChevronRight size={16} />
          <span className="active" aria-current="page">{product.title}</span>
        </div>
      </nav>

      <div className="row row-gap-6 pb-10 pb-lg-12">
        <div className="col-lg-6">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="product-img"
          />
        </div>
        <div className="col-lg-6">
          <h3 className="mb-2">{product.title}</h3>
          <p className="text-p-20 mb-2">{product.description}</p>
          <div className="d-flex justify-content-between align-items-center mb-6">
            <span className="text-p-6-b">${product.price}</span>
            {/* 手機版收藏按鈕 */}
            <button
              type="button"
              className="d-flex d-md-none border-0 bg-transparent p-3"
              onClick={() => toggleFavoriteProduct(product)}
            >
              {isCurrentFavorite ? <HeartFill color="#D75E7E" /> : <Heart />}
            </button>
          </div>

          <div className="d-flex align-items-center mb-6">
            <button
              className="btn btn-qty d-flex align-items-center justify-content-center p-3"
              type="button"
              onClick={() => handleQtyChange(-1)}
            >
              <Minus strokeWidth={2.5} />
            </button>
            <input
              type="number"
              className="qty-input form-control w-auto fw-bold fs-24 text-center border-0"
              size="2"
              min="1"
              max="99"
              value={qtyDisplay}
              onChange={handleQtyInput}
              onBlur={handleQtyBlur}
              onKeyDown={handleQtyKeyDown}
            />
            <button
              className="btn btn-qty d-flex align-items-center justify-content-center p-3"
              type="button"
              onClick={() => handleQtyChange(+1)}
            >
              <Plus strokeWidth={2.5} />
            </button>
          </div>

          <div className="d-flex gap-4 gap-md-6">
            <button
              className="btn btn-dora-outline btn-compact-mobile flex-grow-1 flex-md-grow-0"
              onClick={() => handleAddToCart(product)}
            >
              加入購物車
            </button>

            <button
              className="btn btn-dora btn-compact-mobile d-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0"
              onClick={handleBuyNow}
            >
              <span className="me-2">立即購買</span> <ShoppingCart />
            </button>

            {/* 桌機版收藏按鈕 */}
            <button
              className={`btn-favorite btn d-none d-md-flex align-items-center gap-2 px-0 py-3${isCurrentFavorite ? " is-favorited" : ""}`}
              onClick={() => toggleFavoriteProduct(product)}
            >
              {isCurrentFavorite ? <HeartFill color="#D75E7E" /> : <Heart />}
              <span>{isCurrentFavorite ? "取消收藏" : "加入收藏"}</span>
            </button>
          </div>
        </div>
      </div>

      <main>
        <div className="border-bottom border-primary-200 pb-4 mb-6 mb-md-8">
          <h6 className="fw-bold mb-4">商品介紹</h6>
          {product.content?.split("\n").map(
            (line, index) =>
              line.trim() && (
                <p key={index} className="mb-2">
                  {line}
                </p>
              ),
          )}
        </div>

        <div className="border-bottom border-primary-200 pb-4 mb-6 mb-md-8">
          <h6 className="fw-bold mb-4">商品特色</h6>
          <ul className="mb-0">
            {product.features?.split("\n").map(
              (feature, index) =>
                feature.trim() && (
                  <li key={index} className="mb-2">
                    {feature}
                  </li>
                ),
            )}
          </ul>
        </div>

        <div className="border-bottom border-primary-200 pb-4 mb-6 mb-md-8">
          <h6 className="fw-bold mb-4">商品規格</h6>
          {product.specifications?.split("\n").map((line, index) => {
            const [label, ...valueParts] = line.split("：");
            const value = valueParts.join("：");

            return (
              line.trim() && (
                <p key={index} className="mb-2 lh-sm">
                  <span className="fw-bold">{label}：</span>
                  <span className="fw-normal">{value}</span>
                </p>
              )
            );
          })}
        </div>

        <div className="border-bottom border-primary-200 pb-4 mb-6 mb-md-8">
          <h6 className="fw-bold mb-4">保養與注意事項</h6>
          <ul className="mb-0">
            <li>建議避免長時間受潮或浸水</li>
            <li>若有灰塵可輕拍或使用柔軟刷具清理</li>
            <li>請勿大力拉扯或機洗</li>
            <li>手工商品每款略有差異，屬正常現象</li>
          </ul>
        </div>

        <div className="border-bottom border-primary-200 pb-4">
          <h6 className="fw-bold mb-4">貼心提醒</h6>
          <ul className="mb-0">
            <li className="mb-4">螢幕顯示顏色可能與實品略有差異</li>
            <li>
              若有客製化需求（尺寸、配件），歡迎使用
              <a
                href="#/customization"
                className="fw-bold text-decoration-underline"
              >
                客製化服務
              </a>
              洽詢
            </li>
          </ul>
        </div>
      </main>

      {/* 相關商品 */}
      <section className="pb-10 py-lg-12">
        <h6 className="fw-bold mb-4">相關商品</h6>
        <ul className="row row-cols-1 row-cols-md-2 row-cols-lg-4 row-gap-6 ps-0">
          {relatedProducts.map((item) => (
            <li className="col list-unstyled" key={item.id}>
              <ProductCard product={item} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default SingleProduct;
