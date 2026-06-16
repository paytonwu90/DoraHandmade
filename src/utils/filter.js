export const currency = (num) => {
    const formatter = Number(num) || 0;
    return formatter.toLocaleString("zh-TW", {
        style: "currency",
        currency: "TWD",
        maximumFractionDigits: 0,
    });
};
