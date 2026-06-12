import { Link, useNavigate } from "react-router";
import { ShoppingCart, User, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useContext, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { createAsyncMessage } from "@/slice/messageSlice";
import UserContext from "@contexts/UserContext";
import logoImg from "@images/logo.png";

const Header = () => {
  const { user, setUser } = useContext(UserContext);
  const isLoggedIn = !!user;
  const userName = user?.name || "使用者";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null); // null | 'handmade' | 'material'
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const headerSubmenuRef = useRef(null);
  const mobileUserMenuRef = useRef(null);
  const desktopUserMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        headerSubmenuRef.current &&
        !headerSubmenuRef.current.contains(event.target)
      ) {
        setIsSubmenuOpen(false);
        setOpenSubmenu(null);
      }
      const isOutsideMobile = !mobileUserMenuRef.current?.contains(event.target);
      const isOutsideDesktop = !desktopUserMenuRef.current?.contains(event.target);
      if (isOutsideMobile && isOutsideDesktop) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    setUser(null);
    document.cookie =
      "doraToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // 為了確保 cookie 被正確刪除，指定 path 為 /DoraHandmade
    const expiredDate = "Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = `doraToken=; expires=${expiredDate}; path=/DoraHandmade;`;
    dispatch(createAsyncMessage({ success: true, message: "已登出成功" }));
    navigate("/login");
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    setIsSubmenuOpen(false); // 關閉選單時也重置子選單
    setOpenSubmenu(null);
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isMenuOpen) {
      setIsSubmenuOpen(false); // 關閉選單時也重置子選單
      setOpenSubmenu(null);
    }
  };

  const toggleSubmenu = (e) => {
    // 全權由 React state 控制
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();

    // 立即移除點擊後的焦點
    e.currentTarget.blur();

    setIsSubmenuOpen((prev) => !prev);
  };

  // 電腦版由 CSS hover 控制，點擊只在手機版觸發（互斥：點一個會關閉另一個）
  const toggleMobileSubmenu = (name) => (e) => {
    e.stopPropagation();
    if (window.innerWidth >= 992) return;
    setOpenSubmenu((prev) => (prev === name ? null : name));
  };

  // 自動判斷子選單展開方向
  const handleSubmenuEnter = (e) => {
    const item = e.currentTarget;
    const rect = item.getBoundingClientRect();
    const windowWidth = window.innerWidth;

    if (windowWidth - rect.right < 170) {
      item.classList.add("submenu-left");
    } else {
      item.classList.remove("submenu-left");
    }
  };

  // mobile（btn-icon）與 desktop（nav-link）的 toggle 樣式不同，無法合併成單一元素，
  // 但選單內容完全相同，提取為變數避免重複維護兩份
  const userDropdownMenu = (
    <ul
      className={`dropdown-menu dropdown-menu-end text-center${isUserMenuOpen ? " show" : ""}`}
      // 移除 data-bs-toggle 後 Bootstrap JS 不再初始化此 dropdown，
      // 需手動設定讓 Bootstrap CSS 的 dropdown-menu[data-bs-popper] 定位規則生效
      data-bs-popper="static"
      onClick={() => setIsUserMenuOpen(false)}
    >
      {!isLoggedIn ? (
        <>
          <li>
            <Link className="dropdown-item" to="/login?mode=register">
              會員註冊
            </Link>
          </li>
          <li>
            <Link className="dropdown-item" to="/login">
              會員登入
            </Link>
          </li>
        </>
      ) : (
        <>
          <li>
            <span className="dropdown-item-text fw-bold text-primary-700">
              {userName}, 您好！
            </span>
          </li>
          <li>
            <Link className="dropdown-item" to="/account">
              我的帳戶
            </Link>
          </li>
          <li>
            <Link className="dropdown-item" to="/order">
              訂單查詢
            </Link>
          </li>
          <li>
            <Link className="dropdown-item" to="/favorites">
              我的收藏
            </Link>
          </li>
          <li>
            <Link className="dropdown-item" to="/admin">
              後台管理
            </Link>
          </li>
          <li>
            <a className="dropdown-item" href="#" onClick={handleLogout}>
              登出
            </a>
          </li>
        </>
      )}
    </ul>
  );

  return (
    <header className="header sticky-top">
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="menu-overlay d-lg-none" onClick={closeMobileMenu}></div>
      )}
      <nav className="navbar navbar-expand-lg navbar-custom">
        <div className="container">
          {/* Logo */}
          <Link
            className="navbar-brand d-flex align-items-center"
            to="/"
            onClick={closeMobileMenu}
          >
            <span className="logo-font">
              <img src={logoImg} className="mb-2 me-1" alt="愛哆啦也愛手作" />
              <span className="text-secondary-700">愛哆啦也愛</span>
              <span className="text-primary-700">手作</span>
            </span>
          </Link>

          {/* Mobile Icons */}
          <div className="d-lg-none navbar-icons ms-auto">
            <Link className="btn-icon" to="/cart">
              <ShoppingCart size={20} strokeWidth={2.5} />
            </Link>

            <div className="dropdown user-dropdown" ref={mobileUserMenuRef}>
              <button
                className="btn-icon"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
              >
                <User size={20} strokeWidth={2.5} />
              </button>
              {userDropdownMenu}
            </div>

            <button
              className="navbar-toggler navbar-toggler-custom border-0"
              type="button"
              onClick={toggleMobileMenu}
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div
            className={`collapse navbar-collapse ${isMenuOpen ? "show" : ""}`}
            id="navbarContent"
          >
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
              <li className="nav-item me-lg-3 text-p-16-b">
                <Link
                  className="nav-link"
                  to="/workshop"
                  onClick={closeMobileMenu}
                >
                  手作小教室
                </Link>
              </li>

              <li className="nav-item me-lg-3 text-p-16-b">
                <Link
                  className="nav-link"
                  to="/custom-form"
                  onClick={closeMobileMenu}
                >
                  客製化專區
                </Link>
              </li>

              <li
                ref={headerSubmenuRef}
                className="nav-item dropdown category-dropdown me-lg-4 text-p-16-b"
              >
                {/* 商品分類：完全使用 React state 控制，不依賴 Bootstrap Dropdown JS */}
                <a
                  className={`nav-link d-flex align-items-center text-p-16-b ${isSubmenuOpen ? "show" : ""}`}
                  href="#"
                  onClick={toggleSubmenu}
                >
                  商品分類
                  <ChevronDown size={16} className="ms-1" />
                </a>
                <ul
                  className={`dropdown-menu ${isSubmenuOpen ? "show" : ""}`}
                >
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/product"
                      onClick={closeMobileMenu}
                    >
                      全部商品
                    </Link>
                  </li>
                  {/* 成品 Submenu */}
                  <li
                    className={`dropdown-submenu dropdown ${openSubmenu === 'handmade' ? "show" : ""}`}
                    onMouseEnter={handleSubmenuEnter}
                  >
                    <button
                      type="button"
                      className="dropdown-item-toggle d-flex justify-content-lg-center align-items-center"
                      onClick={toggleMobileSubmenu('handmade')}
                    >
                      成品
                      <ChevronRight size={16} className="ms-2" />
                    </button>
                    <ul
                      className={`dropdown-menu ${openSubmenu === 'handmade' ? "show" : ""}`}
                    >
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/category/handmade/bow"
                          onClick={closeMobileMenu}
                        >
                          蝴蝶結
                        </Link>
                      </li>
                    </ul>
                  </li>

                  {/* 材料 Submenu */}
                  <li
                    className={`dropdown-submenu dropdown ${openSubmenu === 'material' ? "show" : ""}`}
                    onMouseEnter={handleSubmenuEnter}
                  >
                    <button
                      type="button"
                      className="dropdown-item-toggle d-flex justify-content-lg-center align-items-center"
                      onClick={toggleMobileSubmenu('material')}
                    >
                      材料
                      <ChevronRight size={16} className="ms-2" />
                    </button>
                    <ul
                      className={`dropdown-menu ${openSubmenu === 'material' ? "show" : ""}`}
                    >
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/category/material/ribbon"
                          onClick={closeMobileMenu}
                        >
                          帶子
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/category/material/clip"
                          onClick={closeMobileMenu}
                        >
                          夾子
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/category/material/patch"
                          onClick={closeMobileMenu}
                        >
                          貼片
                        </Link>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              <li className="nav-item me-lg-2 d-none d-lg-block">
                <Link className="nav-link d-flex align-items-center" to="/cart">
                  <ShoppingCart size={20} strokeWidth={2.5} />
                </Link>
              </li>

              <li className="nav-item dropdown user-dropdown d-none d-lg-block" ref={desktopUserMenuRef}>
                <button
                  type="button"
                  className="nav-link d-flex align-items-center"
                  aria-expanded={isUserMenuOpen}
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                >
                  <User size={20} strokeWidth={2.5} />
                </button>
                {userDropdownMenu}
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
