import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import axios from "axios";
import ProductCard from "@components/ProductCard";
import Loading from "@components/Loading";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

// URL 子路由參數（subCat）對應到 API 商品的 category 欄位
const subCatMap = {
  bow: "蝴蝶結",
  ribbon: "帶子",
  clip: "夾子",
  patch: "貼片",
};

function Products() {
  const { mainCat, subCat } = useParams(); // 對應 /category/:mainCat/:subCat
  const navigate = useNavigate();
  const itemsPerPage = 9;

  const [products, setProducts] = useState([]);
  const [sortedProducts, setSortedProducts] = useState([]);

  // 所有分類狀態完全由路由參數衍生，無需任何額外的 state 或 useEffect 同步
  const currentCategory = subCatMap[subCat] || "all";

  // 分頁（路由切換時完全重置）
  const [currentPage, setCurrentPage] = useState(1);

  // 排序與下拉
  const [sortLabel, setSortLabel] = useState("預設排序");
  const [sortOpen, setSortOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);

  // 載入中
  const [isLoading, setIsLoading] = useState(false);

  // API 取得商品
  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);

        const res = await axios.get(`${API_BASE}/api/${API_PATH}/products/all`);
        const enabledProducts = res.data.products?.filter(p => p.is_enabled && !p.is_placeholder) || [];
        setProducts(enabledProducts);
        setSortedProducts(enabledProducts);
      } catch (err) {
        console.error("取得商品失敗", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const effectivePage = currentPage;

  // 排序
  const handleSortChange = (type, label) => {
    let sorted = [...products];
    if (type === "default") sorted = [...products];
    if (type === "priceHigh") sorted.sort((a, b) => b.price - a.price);
    if (type === "priceLow") sorted.sort((a, b) => a.price - b.price);
    if (type === "dateNew")
      sorted.sort(
        (a, b) => new Date(b.published_at) - new Date(a.published_at),
      );
    if (type === "dateOld")
      sorted.sort(
        (a, b) => new Date(a.published_at) - new Date(b.published_at),
      );
    if (type === "hot") sorted = products.filter((p) => p.is_hot);

    setSortedProducts(sorted);
    setSortLabel(label);
    setCurrentPage(1);
    setSortOpen(false);
  };

  // 側邊欄點擊分類：透過路由跳轉來應用分類（这樣类別狀態全部由路由驅動）
  const handleCategoryChange = (newSubCat) => {
    setCurrentPage(1);
    setMaterialOpen(false);
    if (newSubCat === "all") {
      navigate("/product");
    } else {
      // 保留現有的 mainCat （如果存在），否則根據 subCat 推導 mainCat
      const cat = mainCat || (newSubCat === "bow" ? "handmade" : "material");
      navigate(`/category/${cat}/${newSubCat}`);
    }
  };

  const filteredProducts = sortedProducts.filter((product) => {
    if (currentCategory === "all") return true;
    return product.category === currentCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // 分頁
  const paginatedProducts = filteredProducts.slice(
    (effectivePage - 1) * itemsPerPage,
    effectivePage * itemsPerPage,
  );

  // 分頁切換時滾動到頂部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectivePage]);

  return (
    <div className="container pt-5">
      <div className="row">
        {/* 左側選單 */}
        <nav className="d-none d-md-block col-md-3 bg-white p-4">
          <div className="nav flex-column sticky-top" style={{ top: "20px" }}>
            <a
              className="nav-link ps-4 py-2 fw-bold text-secondary-700"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleCategoryChange("all");
              }}
            >
              全部商品
            </a>
            <a
              className="nav-link ps-4 py-2 fw-bold text-secondary-700"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleCategoryChange("bow"); // → /category/handmade/bow
              }}
            >
              蝴蝶結
            </a>

            <div className="dropdown material-dropdown">
              <a
                className="nav-link d-flex justify-content-between align-items-center fw-bold ps-4 py-2 text-secondary-700"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMaterialOpen(!materialOpen);
                }}
              >
                材料{" "}
                {materialOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </a>

              {materialOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <a
                      className="dropdown-item fw-bold"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCategoryChange("ribbon"); // → /category/material/ribbon
                      }}
                    >
                      帶子
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item fw-bold"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCategoryChange("clip"); // → /category/material/clip
                      }}
                    >
                      夾子
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item fw-bold"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCategoryChange("patch"); // → /category/material/patch
                      }}
                    >
                      貼片
                    </a>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </nav>

        {/* 主要內容 */}
        <main className="col-12 col-md-9 col-lg-9 p-4">
          <Loading isLoading={isLoading} text="商品載入中" />
          <header className="mb-4">
            <ul className="list-unstyled mb-4 d-flex align-items-center main-content-title">
              <li>
                <h2 className="fs-2 fw-bold">
                  {currentCategory === "all" ? "全部商品" : currentCategory}
                </h2>
              </li>
            </ul>

            <div className="d-flex justify-content-between align-items-center">
              {/* 排序下拉 */}
              <div className="dropdown app-dropdown ms-4 mt-2 mb-4">
                <button
                  className="btn dropdown-toggle border-0 p-0 fw-bold d-flex align-items-center gap-1 text-secondary-700"
                  type="button"
                  onClick={() => setSortOpen(!sortOpen)}
                >
                  {sortLabel}{" "}
                  {sortOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {sortOpen && (
                  <ul className="dropdown-menu show">
                    <li>
                      <button
                        className="dropdown-item fw-bold"
                        onClick={() => handleSortChange("default", "預設排序")}
                      >
                        預設排序
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item fw-bold"
                        onClick={() =>
                          handleSortChange("priceHigh", "價錢由高至低")
                        }
                      >
                        價錢由高至低
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item fw-bold"
                        onClick={() =>
                          handleSortChange("priceLow", "價錢由低至高")
                        }
                      >
                        價錢由低至高
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item fw-bold"
                        onClick={() =>
                          handleSortChange("dateNew", "上架日期由新到舊")
                        }
                      >
                        上架日期由新到舊
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item fw-bold"
                        onClick={() =>
                          handleSortChange("dateOld", "上架日期由舊到新")
                        }
                      >
                        上架日期由舊到新
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item fw-bold"
                        onClick={() => handleSortChange("hot", "本週熱賣")}
                      >
                        本週熱賣
                      </button>
                    </li>
                  </ul>
                )}
              </div>

              <div className="text-muted small">
                共{" "}
                <span className="text-dark fw-bold">
                  {filteredProducts.length}
                </span>{" "}
                樣商品
              </div>
            </div>
          </header>

          {/* 商品列表 */}
          <ul className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-gap-6 row-gap-md-8 ps-0 mb-6 mb-lg-12">
            {paginatedProducts.map((product) => (
              <li className="col list-unstyled" key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>

          {/* 分頁 */}
          {totalPages > 1 && (
            <nav className="mt-5">
              <ul className="pagination justify-content-center align-items-center">
                <li
                  className={`page-item ${effectivePage === 1 ? "disabled" : ""}`}
                >
                  <a
                    className="page-link"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (effectivePage > 1) setCurrentPage(effectivePage - 1);
                    }}
                  >
                    <ChevronLeft size={20} className="text-secondary-700" />
                  </a>
                </li>

                {[...Array(totalPages).keys()].map((pageNum) => (
                  <li
                    className={`page-item ${pageNum + 1 === effectivePage ? "active" : ""}`}
                    key={pageNum}
                  >
                    <a
                      className="page-link"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageNum + 1);
                      }}
                    >
                      {pageNum + 1}
                    </a>
                  </li>
                ))}

                <li
                  className={`page-item ${effectivePage === totalPages ? "disabled" : ""}`}
                >
                  <a
                    className="page-link"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (effectivePage < totalPages)
                        setCurrentPage(effectivePage + 1);
                    }}
                  >
                    <ChevronRight size={20} className="text-secondary-700" />
                  </a>
                </li>
              </ul>
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}

export default Products;