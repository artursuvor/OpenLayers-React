const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('the production map supports drawing controls, coordinates, and help', { timeout: 60000 }, async () => {
  const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4210', '--strictPort'], { stdio: 'ignore', windowsHide: true });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch('http://127.0.0.1:4210')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'the production preview starts');
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4210');
    await page.getByRole('heading', { name: 'Interactive Map' }).waitFor();
    await page.locator('.ol-viewport').waitFor();
    await page.getByLabel('Type:').selectOption('Polygon');
    await page.getByLabel('Units:').selectOption('miles');
    await page.getByLabel('Angle:').selectOption('radians');
    await page.getByPlaceholder('Longitude (EPSG:4326)').fill('14.4378');
    await page.getByPlaceholder('Latitude (EPSG:4326)').fill('50.0755');
    await page.getByRole('button', { name: 'Add Point', exact: true }).click();
    assert.equal(await page.getByPlaceholder('Longitude (EPSG:4326)').inputValue(), '');
    assert.equal(await page.getByPlaceholder('Latitude (EPSG:4326)').inputValue(), '');
    await page.getByRole('button', { name: 'Clear Map', exact: true }).click();
    await page.getByRole('button', { name: '?', exact: true }).click();
    await page.getByRole('heading', { name: 'Help', exact: true }).waitFor();
    await page.locator('.help-modal').click({ position: { x: 5, y: 5 } });
    await page.locator('.help-modal').waitFor({ state: 'hidden' });
    assert.deepEqual(errors, [], 'map interactions cause no uncaught browser errors');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
});
