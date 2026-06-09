import { Link } from "react-router";
import { Heart, ShoppingCart } from "lucide-react";
import { HeartFill } from "./icons";
import { useCartActionContext } from '@contexts/CartAction';
import { useFavoriteProductsContext } from '@contexts/FavoriteProducts';

function ProductCard({ product }) {
  const { handleAddToCart, addingProductId } = useCartActionContext();
  const { toggleFavoriteProduct, isProductFavorite } = useFavoriteProductsContext();

  return (
    <div className="product-card">
      <div className="position-relative z-3">
        <div className="product-card__like">
          <button type="button" className="d-block p-4 rounded-5"
            onClick={() => toggleFavoriteProduct(product)}
          >
            {isProductFavorite(product) ? <HeartFill color="#D75E7E" /> : <Heart />}
          </button>
        </div>
      </div>
      <Link to={`/product/${product.id}`}
        className={`d-block bg-gray-100 p-4 rounded-4 mb-4`}
      >
        <div className="overflow-hidden rounded-4">
          <img src={product.imageUrl} className="w-100 hover:zoom-in" alt={product.title} />
        </div>
      </Link>
      <div className="product-card-body">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h5 className="text-p-24-b text-gray-600">{product.title}</h5>
            <p className="text-p-20-b text-secondary-700 mb-0">NT${product.price}</p>
          </div>
          <div className="p-3">
            <button
              type="button"
              onClick={() => handleAddToCart(product)}
              className="product-card__cart d-block bg-transparent p-0"
              disabled={addingProductId != null}
            >
              {addingProductId === product.id ? (
                <div className="spinner-border text-gray-500" role="status" style={{ width: '24px', height: '24px' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : (
                <ShoppingCart strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCard;
