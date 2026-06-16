// 視覺驗證 script：截取關鍵 UI 狀態的截圖，供 Claude Code 讀取確認視覺結果。
// 對照設計稿請參閱 scripts/design-specs/index.md
//
// 使用方式：
//   1. npm run dev（另一個終端）
//   2. node scripts/verify.js                  # 全跑（本地）
//      node scripts/verify.js user-dropdown    # 只跑 User Dropdown
//      node scripts/verify.js sort-dropdown    # 只跑 Sort Dropdown
//      node scripts/verify.js category-dropdown
//
// 指定目標環境（預設 localhost:5173）：
//   VERIFY_BASE=https://paytonwu90.github.io/DoraHandmade node scripts/verify.js

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.VERIFY_BASE || 'http://localhost:5173';
const OUT = 'scripts/screenshots';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

async function checkDevServer() {
  const maxRetries = 3;
  for (let i = 1; i <= maxRetries; i++) {
    const page = await browser.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'load', timeout: 10000 });
      await page.close();
      return;
    } catch (e) {
      await page.close();
      if (i < maxRetries) {
        console.log(`Dev server 連線失敗，2 秒後重試（${i}/${maxRetries}）...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.error(`\nDev server 無法連線，請先執行 npm run dev\n${e.message}`);
        await browser.close();
        process.exit(1);
      }
    }
  }
}

async function verifyUserDropdown() {
  // Desktop (1280px)
  console.log('User Dropdown (Desktop)...');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE, { waitUntil: 'networkidle' });

    await shoot(page, 'desktop-header');

    // 開啟使用者選單（desktop li 版本）
    await page.click('li.user-dropdown > button');
    await page.waitForTimeout(300);
    await shoot(page, 'desktop-user-menu-open');

    // Hover 第一個 item，用 li 限制範圍避免匹配到隱藏的 mobile 選單
    await page.hover('li.user-dropdown .dropdown-menu .dropdown-item:first-of-type', { force: true });
    await shoot(page, 'desktop-user-menu-hover');

    const menuBox = await page.locator('li.user-dropdown .dropdown-menu').boundingBox();
    if (menuBox) {
      await page.screenshot({
        path: `${OUT}/desktop-user-menu-hover-zoom.png`,
        clip: { x: menuBox.x - 8, y: menuBox.y - 8, width: menuBox.width + 16, height: menuBox.height + 16 },
      });
      console.log('  ✓ desktop-user-menu-hover-zoom.png');
    }

    // 登入狀態
    await page.evaluate(() => {
      localStorage.setItem('doraUser', JSON.stringify({ name: 'Amy' }));
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.click('li.user-dropdown > button');
    await page.waitForTimeout(300);
    await shoot(page, 'desktop-user-menu-loggedin-open');

    await page.hover('li.user-dropdown .dropdown-menu .dropdown-item:first-of-type', { force: true });
    const loggedInMenuBox = await page.locator('li.user-dropdown .dropdown-menu').boundingBox();
    if (loggedInMenuBox) {
      await page.screenshot({
        path: `${OUT}/desktop-user-menu-loggedin-hover-zoom.png`,
        clip: { x: loggedInMenuBox.x - 8, y: loggedInMenuBox.y - 8, width: loggedInMenuBox.width + 16, height: loggedInMenuBox.height + 16 },
      });
      console.log('  ✓ desktop-user-menu-loggedin-hover-zoom.png');
    }

    await page.close();
  }

  // Mobile (390px)
  console.log('User Dropdown (Mobile)...');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle' });

    await shoot(page, 'mobile-header');

    // 開啟使用者選單（mobile div 版本）
    await page.click('div.user-dropdown > button');
    await page.waitForTimeout(300);
    await shoot(page, 'mobile-user-menu-open');

    // Hover 第一個 item，用 div 限制範圍
    await page.hover('div.user-dropdown .dropdown-menu .dropdown-item:first-of-type', { force: true });
    await shoot(page, 'mobile-user-menu-hover');

    const mobileMenuBox = await page.locator('div.user-dropdown .dropdown-menu').boundingBox();
    if (mobileMenuBox) {
      await page.screenshot({
        path: `${OUT}/mobile-user-menu-hover-zoom.png`,
        clip: { x: mobileMenuBox.x - 8, y: mobileMenuBox.y - 8, width: mobileMenuBox.width + 16, height: mobileMenuBox.height + 16 },
      });
      console.log('  ✓ mobile-user-menu-hover-zoom.png');
    }

    // 登入狀態
    await page.evaluate(() => {
      localStorage.setItem('doraUser', JSON.stringify({ name: 'Amy' }));
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.click('div.user-dropdown > button');
    await page.waitForTimeout(300);
    await shoot(page, 'mobile-user-menu-loggedin-open');

    await page.hover('div.user-dropdown .dropdown-menu .dropdown-item:first-of-type', { force: true });
    const mobileLoggedInMenuBox = await page.locator('div.user-dropdown .dropdown-menu').boundingBox();
    if (mobileLoggedInMenuBox) {
      await page.screenshot({
        path: `${OUT}/mobile-user-menu-loggedin-hover-zoom.png`,
        clip: { x: mobileLoggedInMenuBox.x - 8, y: mobileLoggedInMenuBox.y - 8, width: mobileLoggedInMenuBox.width + 16, height: mobileLoggedInMenuBox.height + 16 },
      });
      console.log('  ✓ mobile-user-menu-loggedin-hover-zoom.png');
    }

    await page.close();
  }
}

async function verifySortDropdown() {
  console.log('Sort Dropdown...');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/#/product`, { waitUntil: 'networkidle' });

    // 未開啟狀態
    const sortBtn = page.locator('.sort-dropdown button.dropdown-toggle');
    await sortBtn.waitFor({ state: 'visible' });
    const sortBtnBox = await sortBtn.boundingBox();
    if (sortBtnBox) {
      await page.screenshot({
        path: `${OUT}/sort-dropdown-closed.png`,
        clip: { x: sortBtnBox.x - 8, y: sortBtnBox.y - 8, width: 200, height: sortBtnBox.height + 16 },
      });
      console.log('  ✓ sort-dropdown-closed.png');
    }

    // 開啟下拉
    await sortBtn.click();
    await page.waitForTimeout(300);

    // Hover 第一個 item
    await page.hover('.sort-dropdown .dropdown-menu .dropdown-item:first-of-type', { force: true });

    const sortMenuBox = await page.locator('.sort-dropdown .dropdown-menu').boundingBox();
    if (sortMenuBox) {
      await page.screenshot({
        path: `${OUT}/sort-dropdown-hover-zoom.png`,
        clip: { x: sortMenuBox.x - 8, y: sortMenuBox.y - 8, width: sortMenuBox.width + 16, height: sortMenuBox.height + 16 },
      });
      console.log('  ✓ sort-dropdown-hover-zoom.png');
    }

    await page.close();
  }
}

async function assertSubmenuInViewport(page, viewportWidth) {
  // 點擊開啟商品分類 dropdown
  await page.click('li.category-dropdown > a.nav-link');
  await page.waitForTimeout(300);

  // Hover 材料 → 觸發 handleSubmenuEnter（方向判斷）+ CSS hover（顯示 submenu）
  const materialLi = page.locator('li.dropdown-submenu').filter({ has: page.locator('button:has-text("材料")') });
  await materialLi.hover();
  await page.waitForTimeout(200);

  // 確認 submenu 實際出現
  const submenuLocator = materialLi.locator('> ul.dropdown-menu');
  await submenuLocator.waitFor({ state: 'visible', timeout: 3000 });

  const submenuBox = await submenuLocator.boundingBox();
  if (!submenuBox) throw new Error(`[${viewportWidth}px] 找不到材料 submenu`);

  // 記錄展開方向供參考
  const isLeft = await materialLi.evaluate(el => el.classList.contains('submenu-left'));
  console.log(`  → submenu 方向：${isLeft ? '向左' : '向右'} (x=${Math.round(submenuBox.x)}, width=${Math.round(submenuBox.width)})`);

  // 斷言：submenu 完整在 viewport 內
  if (submenuBox.x < 0)
    throw new Error(`[${viewportWidth}px] submenu 左側超出 viewport (x=${submenuBox.x})`);
  if (submenuBox.x + submenuBox.width > viewportWidth)
    throw new Error(`[${viewportWidth}px] submenu 右側超出 viewport (右邊界=${submenuBox.x + submenuBox.width})`);

  console.log(`  ✓ submenu 完整在 viewport 內`);

  // 主 dropdown + submenu 合併的 zoom 截圖
  const mainMenuLocator = page.locator('li.category-dropdown > .dropdown-menu');
  const mainMenuBox = await mainMenuLocator.boundingBox();
  if (mainMenuBox && submenuBox) {
    const left = Math.min(mainMenuBox.x, submenuBox.x) - 8;
    const top = Math.min(mainMenuBox.y, submenuBox.y) - 8;
    const right = Math.max(mainMenuBox.x + mainMenuBox.width, submenuBox.x + submenuBox.width) + 8;
    const bottom = Math.max(mainMenuBox.y + mainMenuBox.height, submenuBox.y + submenuBox.height) + 8;
    await page.screenshot({
      path: `${OUT}/desktop-category-submenu-${viewportWidth}-zoom.png`,
      clip: { x: left, y: top, width: right - left, height: bottom - top },
    });
    console.log(`  ✓ desktop-category-submenu-${viewportWidth}-zoom.png`);
  }
}

async function verifyCategoryDropdown() {
  // Desktop：兩個寬度，分別觸發 submenu 向右 / 向左展開
  for (const width of [1920, 1024]) {
    console.log(`Category Dropdown (Desktop ${width}px)...`);
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: 800 });
    await page.goto(BASE, { waitUntil: 'networkidle' });

    await assertSubmenuInViewport(page, width);
    await shoot(page, `desktop-category-submenu-${width}`);

    await page.close();
  }

  // Mobile
  console.log('Category Dropdown (Mobile)...');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle' });

    // 開啟 mobile 選單
    await page.click('button.navbar-toggler-custom');
    await page.waitForTimeout(300);

    // 開啟商品分類 dropdown
    await page.click('a.nav-link:has-text("商品分類")');
    await page.waitForTimeout(300);
    await shoot(page, 'mobile-category-dropdown-open');

    // 展開「材料」submenu，移開滑鼠避免 Playwright hover 假象
    await page.click('button.dropdown-item-toggle:has-text("材料")');
    await page.mouse.move(0, 200);
    await page.waitForTimeout(300);
    await shoot(page, 'mobile-category-submenu-open');

    await page.close();
  }
}

async function verifyCart() {
  console.log('Cart - Recipient Form...');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/#/cart`, { waitUntil: 'networkidle' });

    // 勾選「指定其他收件人」
    await page.click('#otherRecipient');
    await page.waitForTimeout(300);

    // 斷言 1：收件地址欄位出現
    const addressInput = page.locator('input[placeholder="收件人地址"]');
    await addressInput.waitFor({ state: 'visible', timeout: 3000 });
    console.log('  ✓ 收件地址欄位出現');

    // 斷言 2：地址空白時按鈕為 disabled
    const submitBtn = page.locator('button:has-text("立即結帳")');
    const isDisabled = await submitBtn.isDisabled();
    if (!isDisabled) throw new Error('地址空白時「立即結帳」應為 disabled');
    console.log('  ✓ 地址空白時「立即結帳」為 disabled');

    // 填入完整收件人資料後按鈕解除 disabled
    await page.fill('input[placeholder="收件人姓名"]', '王小美');
    await page.fill('input[placeholder="收件人電話"]', '0922333444');
    await page.fill('input[placeholder="收件人地址"]', '台北市信義區信義路五段8號');
    await page.waitForTimeout(300);

    const isDisabledAfter = await submitBtn.isDisabled();
    if (isDisabledAfter) throw new Error('填寫完整後「立即結帳」應解除 disabled');
    console.log('  ✓ 填寫完整後「立即結帳」解除 disabled');

    await page.close();
  }
}

const sections = {
  'user-dropdown': verifyUserDropdown,
  'sort-dropdown': verifySortDropdown,
  'category-dropdown': verifyCategoryDropdown,
  'cart': verifyCart,
};

const target = process.argv[2];

await checkDevServer();

if (target) {
  if (!sections[target]) {
    console.error(`未知的區段：${target}`);
    console.error(`可用的區段：${Object.keys(sections).join(', ')}`);
    await browser.close();
    process.exit(1);
  }
  await sections[target]();
} else {
  for (const fn of Object.values(sections)) {
    await fn();
  }
}

await browser.close();
console.log(`\n截圖完成，存在 ./${OUT}/`);
