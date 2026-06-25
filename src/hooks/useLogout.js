import { useContext, useCallback } from "react";
import { useNavigate } from "react-router";
import UserContext from "@contexts/UserContext";
import useMessage from "./useMessage";

function useLogout() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const { showSuccess } = useMessage();

  return useCallback((message = "已登出成功") => {
    const expired = "Thu, 01 Jan 1970 00:00:00 UTC";
    // 雙路徑清除：path=/ 對應本地開發，path=/DoraHandmade 對應 GitHub Pages 部署路徑
    document.cookie = `doraToken=; expires=${expired}; path=/;`;
    document.cookie = `doraToken=; expires=${expired}; path=/DoraHandmade;`;
    setUser(null);
    showSuccess(message);
    navigate("/login");
  }, [setUser, showSuccess, navigate]);
}

export default useLogout;
