import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ShoppingCart, Heart, Minus, Plus, ChevronRight } from "lucide-react";
import axios from "axios";
import { useCartActionContext } from "@contexts/CartAction";
import { useFavoriteProductsContext } from "@contexts/FavoriteProducts";
import product1 from "@images/product-1.png";
import product2 from "@images/product-2.png";
import product3 from "@images/product-3.png";
import product4 from "@images/product-4.png";

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
  const [product, setProduct] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  // 共用加入購物車 + toast（從 CartActionContext 拿）
  const { handleAddToCart, showToast } = useCartActionContext();

  // 收藏 Context
  const { toggleFavoriteProduct, isProductFavorite } =
    useFavoriteProductsContext();

  // 單一商品收藏
  const handleToggleFavoriteProduct = () => {
    const result = toggleFavoriteProduct(product);
    if (result) {
      showToast("已加入收藏");
    } else {
      showToast("已取消收藏");
    }
  };

  // 相關商品收藏
  const handleToggleFavoriteRelated = (item) => {
    const result = toggleFavoriteProduct(item);
    if (result) {
      showToast("已加入收藏");
    } else {
      showToast("已取消收藏");
    }
  };

  useEffect(() => {
    const getProduct = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/${API_PATH}/product/${id}`,
        );
        setProduct(res.data.product);
      } catch (error) {
        console.error("取得商品失敗：", error);
        alert("商品載入失敗，請稍後再試");
      }
    };
    if (id) {
      getProduct();
    }
  }, [id]);

  // 假資料相關商品（只負責顯示 UI）
  const relatedProducts = [
    { id: 1, title: "銀白冬夜亮片蝴蝶結", price: 777, imageUrl: product1 },
    { id: 2, title: "聖誕紅緞帶雙層蝴蝶結", price: 777, imageUrl: product2 },
    { id: 3, title: "聖誕雪花點點蝴蝶結", price: 777, imageUrl: product3 },
    { id: 4, title: "銀白冬夜亮片蝴蝶結", price: 777, imageUrl: product4 },
  ];

  const handleQtyChange = (delta) => {
    setQty((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleAddToCartClick = async (productItem) => {
    try {
      await handleAddToCart(productItem);
    } catch (error) {
      console.error("加入購物車錯誤：", error);
      alert("加入購物車失敗，請稍後再試");
    }
  };

  const handleBuyNow = async () => {
    try {
      const cartData = {
        data: {
          product_id: product.id,
          qty: Number(qty),
        },
      };
      const res = await axios.post(
        `${API_BASE}/api/${API_PATH}/cart`,
        cartData,
      );
      if (res.data.success) {
        navigate("/cart");
      } else {
        alert("系統忙碌中，請稍後再試");
      }
    } catch (error) {
      alert(error.message || "系統忙碌中，請稍後再試");
    }
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
    <div className="container pt-6 pt-lg-12 pb-4 pb-lg-12">
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

      <div className="row mt-4 pb-5">
        <div className="col-md-6">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="img-fluid image-hover"
            style={{ width: "636px" }}
          />
        </div>
        <div className="col-md-6">
          <h3>{product.title}</h3>
          <p>{product.description}</p>
          <div className="d-flex justify-content-between align-items-center">
            <span className="fs-3 fw-bold text-pink">${product.price}</span>
            {/* 手機版收藏按鈕 */}
            <button
              type="button"
              className="ms-auto btn p-1 border-0 bg-transparent d-block d-md-none"
              onClick={handleToggleFavoriteProduct}
            >
              <Heart className={isCurrentFavorite ? "is-favorite" : ""} />
            </button>
          </div>

          <div className="input-group" style={{ width: "192px" }}>
            <button
              className="btn btn-minus btn-sm p-3"
              type="button"
              onClick={() => handleQtyChange(-1)}
            >
              <Minus />
            </button>
            <input
              type="number"
              className="form-control text-center bg-white border-0"
              value={qty}
              readOnly
            />
            <button
              className="btn btn-plus btn-sm p-3"
              type="button"
              onClick={() => handleQtyChange(+1)}
            >
              <Plus />
            </button>
          </div>

          <div className="d-flex flex-row gap-3 mb-3 mt-4">
            <button
              className="btn btn-sm btn-dora-outline flex-grow-1 text-nowrap d-flex align-items-center justify-content-center"
              onClick={() => handleAddToCartClick(product)}
            >
              加入購物車
            </button>

            <button
              className="btn btn-sm btn-dora flex-grow-1 text-nowrap d-flex align-items-center justify-content-center text-white"
              onClick={handleBuyNow}
            >
              <span className="mr-2">立即購買</span> <ShoppingCart />
            </button>

            {/* 桌機版收藏按鈕 */}
            <button
              className="btn btn-sm flex-grow-1 text-nowrap d-flex align-items-center justify-content-center d-none d-md-block btn-add-cart"
              onClick={handleToggleFavoriteProduct}
            >
              <span className="mr-2">
                <Heart className={isCurrentFavorite ? "is-favorite" : ""} />
              </span>
              <span>{isCurrentFavorite ? "取消收藏" : "加入收藏"}</span>
            </button>
          </div>
        </div>
      </div>

      <main>
        <div className="mb-5 border-bottom border-primary-200 pb-4">
          <h6 className="fw-bold mb-3">商品介紹</h6>
          {product.content?.split("\n").map(
            (line, index) =>
              line.trim() && (
                <p key={index} className="mb-2">
                  {line}
                </p>
              ),
          )}
        </div>

        <div className="mb-5 border-bottom border-primary-200 pb-4">
          <h6 className="fw-bold mb-3">商品特色</h6>
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

        <div className="mb-5 border-bottom border-primary-200 pb-4">
          <h6 className="fw-bold mb-3">商品規格</h6>
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

        <div className="mb-5 border-bottom border-primary-200 pb-4">
          <h6 className="fw-bold mb-3">保養與注意事項</h6>
          <ul className="mb-0">
            <li>建議避免長時間受潮或浸水</li>
            <li>若有灰塵可輕拍或使用柔軟刷具清理</li>
            <li>請勿大力拉扯或機洗</li>
            <li>手工商品每款略有差異，屬正常現象</li>
          </ul>
        </div>

        <div className="mb-5 border-bottom border-primary-200 pb-4">
          <h6 className="fw-bold mb-3">貼心提醒</h6>
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
      <section className="py-7">
        <h6 className="fw-bold mb-4">相關商品</h6>
        <div className="row">
          {relatedProducts?.map((item) => {
            const isRelatedFavorite = isProductFavorite(item);

            return (
              <div className="col-md-3 col-12 mb-4" key={item.id}>
                <div className="card w-100 h-100 border-0 shadow-sm position-relative">
                  {/* 收藏按鈕 */}
                  <button
                    className="btn btn-light shadow-sm rounded-circle position-absolute wishlist-btn"
                    style={{
                      top: "30px",
                      right: "30px",
                      zIndex: 10,
                      padding: "12px 12px",
                    }}
                    onClick={() => handleToggleFavoriteRelated(item)}
                  >
                    <Heart
                      className={isRelatedFavorite ? "is-favorite" : ""}
                    />
                  </button>

                  {/* 圖片 */}
                  <img
                    src={item.imageUrl}
                    className="card-img-top image-hover p-4"
                    alt={item.title}
                    style={{ objectFit: "cover" }}
                  />

                  {/* 文字與購物車 */}
                  <div className="card-body p-2 d-flex flex-column px-4">
                    <p className="card-title text-truncate small mb-2 fw-bold text-gray-600">
                      {item.title}
                    </p>

                    <div className="d-flex justify-content-between align-items-center mt-auto">
                      <span className="fw-bold">NT${item.price}</span>
                      <button
                        className="btn btn-sm p-1 btn-add-cart-icon"
                        onClick={() => handleAddToCartClick(product)}
                      >
                        <ShoppingCart />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default SingleProduct;
