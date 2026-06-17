export const emailValidation = {
  required: "Email 為必填",
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "請輸入有效的 Email 地址",
  },
};

export const phonePattern = /^[0-9]{10}$/;
export const twPhoneValidation = {
  required: "請輸入手機號碼",
  pattern: {
    value: phonePattern,
    message: "格式為 10 位數字",
  },
};
