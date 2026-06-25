// 雙路徑清除：path=/ 對應本地開發，path=/DoraHandmade 對應 GitHub Pages 部署路徑
export function clearDoraToken() {
  const expired = "Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `doraToken=; expires=${expired}; path=/;`;
  document.cookie = `doraToken=; expires=${expired}; path=/DoraHandmade;`;
}
