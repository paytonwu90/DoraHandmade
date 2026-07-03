import { useForm } from "react-hook-form";
import { emailValidation } from "../utils/validation";
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
import { Link, Outlet, useLocation, Navigate } from "react-router";
import { useState, useEffect , useCallback } from "react";
import { useNavigate } from "react-router";
import axios from 'axios'
import useMessage from "@hooks/useMessage";
const VITE_API_BASE = import.meta.env.VITE_API_BASE;
const VITE_API_PATH = import.meta.env.VITE_API_PATH;

const BackendLayout = () => {
    const navigate = useNavigate();
    const [ isLogin, setIsLogin ] = useState(false);
    const { showError } = useMessage();
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm({
        mode: "onChange",
        defaultValues: {
            username: "",
            password: "",
        }
    });

    const onSubmit = useCallback(async (formData) => {
        try {
            if (formData.username === ADMIN_USERNAME && formData.password === ADMIN_PASSWORD) {
                // 登入六角API
                const response = await axios.post(`${VITE_API_BASE}/admin/signin`, formData);
                const { token, expired } = response.data;
                document.cookie = `hexToken=${token};expires=${new Date(expired)};`;
                axios.defaults.headers.common.Authorization = token;
                setIsLogin(true);
                localStorage.setItem("adminLogin", "true");
                navigate("/admin/product");
            } else {
                showError("帳號或密碼錯誤");
            }
        } catch (error) {
            console.error(error);
            showError("登入失敗，請稍後再試");
        }
    }, [navigate, showError]);

    // 初始化時自動讀取 localStorage 判斷是否已登入，並驗證 token
    useEffect(() => {
        const checkLogin = async () => {
            if (localStorage.getItem("adminLogin") === "true") {
                // 取得 token 並設置 axios headers
                const token = document.cookie.replace(
                    /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
                    "$1"
                );
                if (token) {
                    axios.defaults.headers.common.Authorization = token;
                }
                try {
                    // 檢查登入狀態（用六角 API 驗證 token）
                    await axios.post(`${VITE_API_BASE}/api/user/check`);
                    setIsLogin(true);
                } catch (error) {
                    // token 驗證失敗，導回登入頁
                    console.error("Token 驗證失敗:", error);
                    setIsLogin(false);
                    localStorage.removeItem("adminLogin");
                }
            }
        };
        checkLogin();
    }, []);

    const location = useLocation();
    return (
        <>
        {/* // 如果已登入顯示後台選單，否則顯示登入選單 */}
        {isLogin ? (
            <>
            <header>
                <ul className="nav">
                    <li className="nav-item">
                        <Link className="nav-link" to="/">回前台</Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/admin/dashboard">儀表板</Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/admin/product">商品管理</Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/admin/order">訂單管理</Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/admin/coupon">優惠券管理</Link>
                    </li>
                    <li className="nav-item">
                        <button className="btn btn-link nav-link" onClick={async () => {
                            try {
                                await axios.post(`${VITE_API_BASE}/logout`);
                            } catch (e) {
                                // 即使 API 失敗也繼續清除本地狀態
                                console.error("登出 API 失敗:", e);
                            }
                            setIsLogin(false);
                            localStorage.removeItem("adminLogin");
                            delete axios.defaults.headers.common.Authorization;
                            // 清除 hexToken cookie
                            document.cookie = 'hexToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
                        }}>登出</button>
                    </li>
                </ul>
            </header>
            <main>
                {location.pathname === "/admin" && <Navigate to="/admin/dashboard" replace />}
                <Outlet />
            </main>
            <footer></footer>
            </>
        ) : (
            <div className="container py-15 login">
                <div className="row justify-content-center">
                <h1 className="h3 mb-3 font-weight-normal text-center">請先登入</h1>
                <div className="col-8">
                    <form id="form" className="form-signin" onSubmit={handleSubmit(onSubmit)}>
                    <div className="form-floating mb-3">
                        <input
                        type="email"
                        className="form-control"
                        id="username"
                        placeholder="name@example.com"
                        {...register("username", emailValidation)}
                        />
                        <label htmlFor="username">Email address</label>
                        {errors.username && (
                        <div className="text-danger mt-1">{errors.username.message}</div>
                        )}
                    </div>
                    <div className="form-floating">
                        <input
                        type="password"
                        className="form-control"
                        id="password"
                        placeholder="Password"
                        {...register("password", {
                            required: "請輸入密碼",
                            minLength: {
                                value: 6,
                                message: "密碼長度至少需 6 碼",
                            },
                            })}
                        />
                        <label htmlFor="password">Password</label>
                        {errors.password && (
                        <div className="text-danger mt-1">{errors.password.message}</div>
                        )}
                    </div>
                    <button
                        className="btn btn-lg btn-primary w-100 mt-3"
                        type="submit"
                        disabled={!isValid}
                        >
                        登入
                    </button>
                    </form>
                </div>
                </div>
                <p className="mt-5 mb-3 text-muted text-center">&copy; 2026~∞ - 愛哆啦也愛手作</p>
            </div>
        )}
        </>
    )
}

export default BackendLayout;