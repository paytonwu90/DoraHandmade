// 視覺驗證 script：在 dev server 執行中時跑此 script，
// 截取關鍵 UI 狀態的截圖，供 Claude Code 讀取確認視覺結果。
// 對照設計稿請參閱 scripts/design-specs/index.md
//
// 使用方式：
//   1. npm run dev（另一個終端）
//   2. node scripts/verify.js                  # 全跑
//      node scripts/verify.js user-dropdown    # 只跑 User Dropdown
//      node scripts/verify.js sort-dropdown    # 只跑 Sort Dropdown

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:5173';
const OUT = 'scripts/screenshots';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

async function checkDevServer() {
  const page = await browser.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  } catch {
    console.error('\nDev server 未啟動，請先執行 npm run dev');
    await browser.close();
    process.exit(1);
  }
  await page.close();
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
    await page.click('li.user-dropdown a[data-bs-toggle="dropdown"]');
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

    await page.click('li.user-dropdown a[data-bs-toggle="dropdown"]');
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
    await page.click('div.user-dropdown button[data-bs-toggle="dropdown"]');
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

    await page.click('div.user-dropdown button[data-bs-toggle="dropdown"]');
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

const sections = {
  'user-dropdown': verifyUserDropdown,
  'sort-dropdown': verifySortDropdown,
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
