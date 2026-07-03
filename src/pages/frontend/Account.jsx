import axios from "axios";
import { useEffect, useState } from "react";
import { useContext } from "react";
import UserContext from "@contexts/UserContext";
import { useNavigate } from "react-router";
import { UserCircle } from "lucide-react";
import useMessage from "@hooks/useMessage";
import useLogout from "@hooks/useLogout";

function Account() {
    const navigate = useNavigate();
    const [ isLoggedIn, setIsLoggedIn ] = useState(false);
    const { user } = useContext(UserContext);
    const { showError } = useMessage();
    const logout = useLogout();

    const LogOut = () => {
        setIsLoggedIn(false);
        logout();
    };

    function maskString(str) {
        if (!str) return "";
        if (str.length <= 2) return str;
        const first = str[0];
        const last = str[str.length - 1];
        return first + "*".repeat(str.length - 2) + last;
    }

    // email 專用遮罩
    function maskEmail(email) {
        if (!email) return "";
        const [name, domain] = email.split("@");
        return maskString(name) + "@" + domain;
    }

    useEffect(() => {
        // 取得 token
        const token = document.cookie.split("; ").find(row => row.startsWith("doraToken="))?.split("=")[1];
        if (!token) {
            navigate("/login");
            return;
        }
        const tokenData = {
            token: token,
        }
        const checkUser = async () => {
            try {
                const response = await axios.post(import.meta.env.VITE_API_USER_CHECK_URL, tokenData);
                if (response.data.success === true) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                    showError("使用者驗證失敗，請重新登入");
                    navigate("/login");
                }
            } catch (error) {
                console.error("使用者驗證失敗:", error);
                setIsLoggedIn(false);
                showError("使用者驗證失敗，請重新登入");
                navigate("/login");
            }
        };
        checkUser();
    }, [navigate, user, showError]);


    return (
        <>
        {isLoggedIn && user ? (
            <div className="container my-5">
                <h2 className="account-heading-title mb-4">帳戶資訊</h2>
                {user.name ? (
                    <p className="account-info"><UserCircle className="me-2" />{maskString(user.name)}</p>
                ) : null}
                {user.email ? (
                    <p className="account-info"><UserCircle className="me-2" />{maskEmail(user.email)}</p>
                ) : null}
                <button className="btn btn-secondary mt-3" onClick={LogOut}>登出</button>
            </div>
        ) : (
            <div className="container my-5">
                <div className="alert alert-primary">請先登入以查看帳戶資訊</div>
            </div>
        )}
        </>
    );
}

export default Account;