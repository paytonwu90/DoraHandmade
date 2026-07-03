import { useDispatch } from "react-redux";
import { useCallback } from "react";
import { createAsyncMessage } from "../slice/messageSlice";

function useMessage() {
    const dispatch = useDispatch();

    // 用 useCallback 確保函式引用穩定，不會每次 render 都產生新函式
    const showSuccess = useCallback((message) => {
        dispatch(
            createAsyncMessage({
                success: true,
                message,
            })
        );
    }, [dispatch]);

    const showError = useCallback((message) => {
        dispatch(
            createAsyncMessage({
                success: false,
                message,
            })
        );
    }, [dispatch]);

    return { showSuccess, showError };
}

export default useMessage;
