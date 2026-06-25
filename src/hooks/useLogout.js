import { useContext, useCallback } from "react";
import { useNavigate } from "react-router";
import UserContext from "@contexts/UserContext";
import useMessage from "./useMessage";
import { clearDoraToken } from "@utils/clearDoraToken";

function useLogout() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const { showSuccess } = useMessage();

  return useCallback((message = "已登出成功") => {
    clearDoraToken();
    setUser(null);
    showSuccess(message);
    navigate("/login");
  }, [setUser, showSuccess, navigate]);
}

export default useLogout;
