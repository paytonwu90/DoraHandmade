import axios from "axios";
import { useState, useEffect, useContext, useCallback } from "react";
import useMessage from "@hooks/useMessage";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router";
import { useGoogleLogin } from "@react-oauth/google";
import UserContext from "@contexts/UserContext";
import { clearDoraToken } from "@utils/clearDoraToken";
const API_USER_CHECK_URL = import.meta.env.VITE_API_USER_CHECK_URL;
const API_SIGNUP_URL     = import.meta.env.VITE_API_SIGNUP_URL;
const API_PATH           = import.meta.env.VITE_API_PATH;
const API_LOGIN_URL      = import.meta.env.VITE_API_LOGIN_URL;
const API_GOOGLE_URL     = import.meta.env.VITE_API_GOOGLE_URL;

function Signup() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("login");
    const { showError, showSuccess } = useMessage();
    const switchMode = () => {
        setMode(mode === "login" ? "register" : "login");
    };
    // useForm 表單驗證
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset,
    } = useForm({
        mode: "onChange"
    });

    const { setUser } = useContext(UserContext);

    const onSubmit = useCallback(async (formData) => {
        // 登入或註冊 API 呼叫
        try {
            if (mode === "register") {
                const regiData = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    api_path: API_PATH,
                }
                const response = await axios.post(API_SIGNUP_URL, regiData);
                console.log(response.data.message);
                reset();
                // 註冊成功後自動切換到登入模式
                setMode("login");
            } else {
                const loginData = {
                    email: formData.email,
                    password: formData.password,
                    api_path: API_PATH,
                }
                const response = await axios.post(API_LOGIN_URL, loginData);
                if (response.data.success === true) {
                    const COOKIE_PATH = "/DoraHandmade";
                    const { token, expired } = response.data;
                    // 用函式包裝副作用，避免 ESLint 錯誤
                    const setCookie = () => {
                        // 設定 cookie，指定 path 為 /
                        document.cookie = `doraToken=${token};expires=${new Date(expired)}; path=/;`;
                        // 設定 cookie，指定 path 為 /DoraHandmade
                        document.cookie = `doraToken=${token};expires=${new Date(expired)}; path=${COOKIE_PATH};`;
                    };
                    setCookie();
                    reset();
                    setUser({
                        name: response.data.name,
                        email: response.data.email,
                    });
                    showSuccess("登入成功！");
                    navigate("/");
                } else {
                    showError("登入失敗，請檢查帳號密碼");
                    navigate("/login");
                }

            }
        } catch (error) {
            console.error("API 呼叫失敗:", error);
            showError("登入或註冊失敗，請稍後再試");
        }
    }, [mode, reset, setUser, navigate, showError, showSuccess]);

    // ── Google 登入 ──
    const handleGoogleSuccess = useCallback(async (tokenResponse) => {
        try {
            // 1. 用 access_token 取得 Google 用戶資訊
            const userInfoRes = await axios.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
            );
            const { sub, email, name } = userInfoRes.data;

            // 2. 送到後端 API
            const response = await axios.post(API_GOOGLE_URL, {
                api_path: API_PATH,
                id_token: tokenResponse.access_token, // 後端用此向 Google 驗證
                google_sub: sub,
                email,
                name,
            });

            if (response.data.success) {
                const { token, name: userName, email: userEmail } = response.data;
                const COOKIE_PATH = "/DoraHandmade";
                const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
                document.cookie = `doraToken=${token}; expires=${expires}; path=/;`;
                document.cookie = `doraToken=${token}; expires=${expires}; path=${COOKIE_PATH};`;
                setUser({ name: userName, email: userEmail });
                showSuccess("Google 登入成功！");
                navigate("/");
            } else {
                showError(response.data.message || "Google 登入失敗");
            }
        } catch (error) {
            console.error("Google 登入失敗:", error);
            showError("Google 登入失敗，請稍後再試");
        }
    }, [setUser, navigate, showError, showSuccess]);

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError:   () => showError("Google 登入取消或失敗"),
    });

    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const modeParam = params.get("mode");
        if (modeParam === "register") {
            setTimeout(() => setMode("register"), 0);
        } else {
            setTimeout(() => setMode("login"), 0);
        }
    }, [location.search]);

    useEffect(() => {
        // 取得 token
        const token = document.cookie.split("; ").find(row => row.startsWith("doraToken="))?.split("=")[1];
        if (token) {
            const tokenData = {
                token: token,
            }
            const checkUser = async () => {
                try {
                    const response = await axios.post(API_USER_CHECK_URL, tokenData);
                    if (response.data.success) {
                        navigate("/");
                    } else {
                        clearDoraToken();
                        navigate("/login");
                    }
                } catch (error) {
                    console.error("user_check 失敗:", error);
                    clearDoraToken();
                    navigate("/login");
                }
            };
            checkUser();
        }
    }, [navigate, setUser, showError]);

    return (
        <>
        <div className="auth-wrapper d-flex align-items-center justify-content-center">
            <div className="auth-card card shadow-sm border-0">
                <div className="card-body p-4">

                <h2 className="text-center mb-4 auth-title">
                    {mode === "login" ? "會員登入" : "會員註冊"}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)}>

                    {mode === "register" && (
                    <div className="mb-3">
                        <label htmlFor="name" className="form-label">姓名</label>
                        <input
                        id="name"
                        type="text"
                        className="form-control"
                        placeholder="請輸入姓名"
                        {...register("name", {
                            required: "請輸入姓名",
                        })}
                        />
                        {errors.name && <p className="text-danger mt-1">{errors.name.message}</p>}
                    </div>
                    )}

                    <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="form-control"
                        placeholder="請輸入 Email"
                        {...register("email", {
                            required: "請輸入電子郵件",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "請輸入有效的電子郵件地址",
                            },
                        })}
                    />
                    {errors.email && <p className="text-danger mt-1">{errors.email.message}</p>}
                    </div>

                    <div className="mb-4">
                    <label htmlFor="password" className="form-label">密碼</label>
                    <input
                        id="password"
                        type="password"
                        className="form-control"
                        placeholder="請輸入密碼"
                        {...register("password", {
                            required: "請輸入密碼",
                            minLength: {
                                value: 6,
                                message: "密碼長度至少需 6 碼",
                            },
                        })}
                    />
                    {errors.password && <p className="text-danger mt-1">{errors.password.message}</p>}
                    </div>

                    <button className="btn btn-primary w-100 auth-btn" type="submit" disabled={!isValid}>
                    {mode === "login" ? "登入" : "註冊"}
                    </button>

                </form>

                <div className="text-center mt-3">

                    <button
                    type="button"
                    className="btn btn-link auth-switch"
                    onClick={switchMode}
                    >
                    {mode === "login"
                        ? "還沒有帳號？立即註冊"
                        : "已有帳號？返回登入"}
                    </button>

                </div>

                {/* ── Google 登入分隔線 ── */}
                <div className="d-flex align-items-center my-3">
                    <hr className="flex-grow-1" />
                    <span className="px-3 text-secondary" style={{ fontSize: "13px" }}>或</span>
                    <hr className="flex-grow-1" />
                </div>

                <button
                    type="button"
                    className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                    style={{
                        background:   "#fff",
                        border:       "1px solid #dadce0",
                        borderRadius: "6px",
                        fontWeight:   500,
                        color:        "#3c4043",
                        boxShadow:    "0 1px 3px rgba(0,0,0,.1)",
                    }}
                    onClick={() => googleLogin()}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-21 0-1.3-.2-2.7-.5-4z"/>
                        <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                        <path fill="#FBBC05" d="M24 46c5.8 0 10.8-1.9 14.8-5.2l-6.8-5.6C29.8 36.8 27 37.8 24 37.8c-5.9 0-10.9-4-12.7-9.5l-7 5.4C7.9 41.8 15.4 46 24 46z"/>
                        <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.8 6.3l6.8 5.6C41.8 37.1 46 31 46 24c0-1.3-.2-2.7-.5-4z"/>
                    </svg>
                    使用 Google 登入／註冊
                </button>

                </div>
            </div>
        </div>
        </>
    );
}

export default Signup;