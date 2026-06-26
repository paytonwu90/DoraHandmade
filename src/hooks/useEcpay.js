import { useState } from "react";

// 綠界物流設定（從 .env 讀取，金鑰不寫死在程式碼）
const VITE_ECPAY_MERCHANT_ID = import.meta.env.VITE_ECPAY_MERCHANT_ID;
const VITE_ECPAY_HASH_KEY    = import.meta.env.VITE_ECPAY_HASH_KEY;
const VITE_ECPAY_HASH_IV     = import.meta.env.VITE_ECPAY_HASH_IV;
const VITE_ECPAY_MAP_BASE    = import.meta.env.VITE_ECPAY_MAP_BASE;
const VITE_ECPAY_REPLY_URL   = import.meta.env.VITE_ECPAY_REPLY_URL;
const VITE_ECPAY_POLL_URL    = import.meta.env.VITE_ECPAY_POLL_URL;

export function useEcpay() {
    const [selectedStore, setSelectedStore] = useState(null);

    // 綠界 CheckMacValue 產生（依官方文件規格）
    const generateCheckMacValue = async (params) => {
        // Step 1：按 key 字母順序排序（case-insensitive）
        const sorted = Object.keys(params)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .map(k => `${k}=${params[k]}`)
            .join("&");

        // Step 2：前後加上 HashKey / HashIV
        const raw = `HashKey=${VITE_ECPAY_HASH_KEY}&${sorted}&HashIV=${VITE_ECPAY_HASH_IV}`;

        // Step 3：URLEncode 整個字串（.NET 風格）
        const urlEncoded = encodeURIComponent(raw)
            .replace(/%20/g, "+")
            .replace(/%21/g, "!")
            .replace(/%27/g, "'")
            .replace(/%28/g, "(")
            .replace(/%29/g, ")")
            .replace(/%2A/g, "*")
            .replace(/%7E/g, "~");

        // Step 4：轉小寫
        const lowerStr = urlEncoded.toLowerCase();

        // Step 5：SHA256 → 轉大寫
        const msgBuffer  = new TextEncoder().encode(lowerStr);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray  = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    };

    // 開啟綠界超商地圖
    const openCvsMap = async (subType) => {
        // 監聽子視窗透過 postMessage 傳回的門市資訊（後端已組好格式化字串）
        const handleMessage = (event) => {
            if (!event.data || event.data.type !== "CVS_STORE_SELECTED") return;
            setSelectedStore({
                label:   event.data.storeLabel || "",  // 後端組好的完整字串，直接存入 message
                id:      event.data.storeID    || "",  // 備用顯示
                name:    event.data.storeName  || "",
                address: event.data.address    || "",
                brand:   event.data.brand      || "",
                subType: event.data.subType    || subType,
            });
            window.removeEventListener("message", handleMessage);
        };
        window.addEventListener("message", handleMessage);

        const tradeNo  = "Cart" + Date.now().toString().slice(-8);
        const replyUrl = VITE_ECPAY_REPLY_URL;

        // 組成要簽章的參數（不含 HashKey/HashIV）
        const params = {
            MerchantID:       VITE_ECPAY_MERCHANT_ID,
            MerchantTradeNo:  tradeNo,
            LogisticsType:    "CVS",
            LogisticsSubType: subType,
            IsCollection:     "N",
            ServerReplyURL:   replyUrl,
            // 手機裝置帶 Device=1，讓綠界顯示行動版地圖介面
            Device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "1" : "0",
        };

        const checkMac = await generateCheckMacValue(params);
        const formParams = { ...params, CheckMacValue: checkMac };

        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

        if (isMobile) {
            // ── 手機版：開新分頁 → 選完門市 → cvsmap.php 存 session ────────
            // 使用者切回購物車頁時，visibilitychange 觸發輪詢撈取門市資料

            // 開新分頁提交 POST
            const form = document.createElement("form");
            form.method  = "POST";
            form.action  = VITE_ECPAY_MAP_BASE;
            form.target  = "_blank";
            form.enctype = "application/x-www-form-urlencoded";

            Object.entries(formParams).forEach(([k, v]) => {
                const input = document.createElement("input");
                input.type  = "hidden";
                input.name  = k;
                input.value = v;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            // 監聽使用者切回本頁（visibilitychange）
            let pollTimer = null;
            let pollCount = 0;
            const MAX_POLL = 20; // 最多輪詢 20 次（約 10 秒）

            const stopPoll = () => {
                clearInterval(pollTimer);
                document.removeEventListener("visibilitychange", onVisible);
            };

            const pollStore = async () => {
                try {
                    const res = await fetch(
                        `${VITE_ECPAY_POLL_URL}?clear=1`,
                        { credentials: "include" }
                    );
                    const data = await res.json();

                    if (data.found) {
                        setSelectedStore({
                            label:   data.storeLabel,
                            id:      data.storeID,
                            name:    data.storeName,
                            address: data.address,
                            brand:   data.brand,
                            subType: data.subType,
                        });
                        stopPoll();
                        return "found";
                    }
                    return "empty"; // 尚無資料，繼續等
                } catch (e) {
                    console.error("搜尋門市資料失敗:", e);
                    return "error"; // fetch 失敗，停止搜尋
                }
            };

            const onVisible = async () => {
                if (document.visibilityState !== "visible") return;

                // 切回頁面時立即查一次
                const result = await pollStore();
                if (result === "found" || result === "error") return;

                // 還沒有資料，每 500ms 輪詢，最多 MAX_POLL 次
                pollTimer = setInterval(async () => {
                    pollCount++;
                    const result = await pollStore();
                    if (result === "found" || result === "error" || pollCount >= MAX_POLL) {
                        stopPoll();
                    }
                }, 500);
            };

            document.addEventListener("visibilitychange", onVisible);
        } else {
            // ── 桌機版：開新視窗，選完由 postMessage 傳回 ──────────────────
            const mapWindow = window.open("", "cvsMap", "width=900,height=700,scrollbars=yes");

            const form = document.createElement("form");
            form.method  = "POST";
            form.action  = VITE_ECPAY_MAP_BASE;
            form.target  = "cvsMap";
            form.enctype = "application/x-www-form-urlencoded";

            Object.entries(formParams).forEach(([k, v]) => {
                const input = document.createElement("input");
                input.type  = "hidden";
                input.name  = k;
                input.value = v;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            if (!mapWindow || mapWindow.closed) {
                alert("請允許瀏覽器開啟彈出視窗後再試一次");
            }
        }
    };

    return {
        selectedStore,
        setSelectedStore,
        openCvsMap,
    };
}
