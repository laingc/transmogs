const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const context = { window: {} };
runInNewContext(readFileSync(resolve(__dirname, '../data.js'), 'utf8'), context);
const data = JSON.parse(JSON.stringify(context.window.GALLERY_DATA));

test('catalogue has sourced pictures and every local image decodes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(90);
  expect(new Set(data.entries.map(e => e.id)).size).toBe(90);
  expect(data.imageCount).toBe(271);
  for (const entry of data.entries) {
    expect(entry.images.length, entry.name).toBeGreaterThanOrEqual(3);
    expect(new Set(entry.images.map(image => image.src)).size, entry.name).toBe(entry.images.length);
    expect(entry.colours.length).toBeGreaterThan(0);
    expect(entry.effects.length).toBeGreaterThan(0);
    for (const image of entry.images) {
      expect(image.source).toMatch(/^https:\/\//);
      expect(image.credit).toBeTruthy();
    }
  }
  const failures = await page.evaluate(async paths => {
    const failures = [];
    // Bounded batches exercise real browser decoding without saturating the server.
    for (let i = 0; i < paths.length; i += 12) {
      await Promise.all(paths.slice(i, i + 12).map(async src => {
        const image = new Image(); image.src = src;
        try { await image.decode(); if (image.naturalWidth < 100) failures.push(src); }
        catch { failures.push(src); }
      }));
    }
    return failures;
  }, data.entries.flatMap(e => e.images.map(image => image.src)));
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

test('tag intersection, union, search, source filters, and empty-state recovery', async ({ page }) => {
  await page.goto('/');
  await page.locator('.filters [data-tag="gold"]').click();
  await page.locator('.filters [data-tag="lightning"]').click();
  await expect(page.locator('.card')).toHaveCount(data.entries.filter(e => e.tags.includes('gold') && e.tags.includes('lightning')).length);
  await expect(page.locator('#empty')).toBeVisible();
  await page.getByLabel('Any tag', { exact: true }).check();
  await expect(page.locator('.card')).toHaveCount(data.entries.filter(e => e.tags.includes('gold') || e.tags.includes('lightning')).length);
  await page.reload();
  await expect(page.getByLabel('Any tag', { exact: true })).toBeChecked();
  await expect(page.locator('.filters [data-tag="gold"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#reset').click();
  await page.locator('#search').fill('cyan lightning');
  await expect(page.locator('.card[data-id="mongoose"]')).toBeVisible();
  await page.locator('#source-filter').selectOption('Dungeon & raid');
  const categories = await page.locator('.card-category').allTextContents();
  expect(categories.length).toBeGreaterThan(0);
  expect(categories.every(category => category === 'Dungeon & raid')).toBe(true);
  await page.locator('#search').fill('no-such-illusion');
  await expect(page.locator('#empty')).toBeVisible();
  await page.locator('#empty-reset').click();
  await expect(page.locator('.card')).toHaveCount(90);
  await page.locator('#tag-search').fill('light');
  await expect(page.locator('#effect-tags button')).toHaveCount(1);
  await expect(page.locator('#effect-tags button')).toHaveText('lightning');
});

test('sort by colour and effect, browse pictures, and persist saved entries', async ({ page }) => {
  await page.goto('/');
  for (const [sort, field] of [['colour', 'colours'], ['effect', 'effects']]) {
    await page.locator('#sort').selectOption(sort);
    const ids = await page.locator('.card').evaluateAll(cards => cards.map(card => card.dataset.id));
    const tags = ids.map(id => data.entries.find(e => e.id === id)[field][0]);
    expect(tags).toEqual([...tags].sort((a, b) => a.localeCompare(b)));
  }
  await page.locator('#search').fill('Mongoose');
  await page.locator('.card .open-image').click();
  await expect(page.getByRole('dialog', { name: 'Mongoose', exact: true })).toBeVisible();
  const original = await page.locator('#viewer-image').getAttribute('src');
  await page.locator('#next-image').click();
  await expect(page.locator('#image-counter')).toHaveText('2 / 3');
  expect(await page.locator('#viewer-image').getAttribute('src')).not.toBe(original);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#image-counter')).toHaveText('3 / 3');
  await page.reload();
  await expect(page.locator('#image-counter')).toHaveText('3 / 3');
  await page.locator('#viewer-save').click();
  await expect(page.locator('#viewer-save')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).not.toBeVisible();
  await expect(page).not.toHaveURL(/illusion=/);
  await page.reload();
  await expect(page.locator('#saved-count')).toHaveText('1');
  await page.locator('#reset').click();
  await page.locator('#saved-nav').click();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toHaveText('Mongoose');
  await page.locator('.favorite').click();
  await expect(page.locator('#empty')).toBeVisible();
});

test('desktop and mobile layouts have no overflow, with working legacy reference search', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/gallery-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/gallery-mobile.png' });
  await page.locator('#toggle-filters').click();
  await expect(page.locator('#filters')).toBeVisible();
  await page.locator('#toggle-filters').click();
  await expect(page.locator('#filters')).not.toBeVisible();
  await page.locator('#search').fill('Galaxy');
  await page.locator('.card .open-image').click();
  expect(await page.evaluate(() => document.querySelector('#viewer').scrollWidth <= document.querySelector('#viewer').clientWidth)).toBe(true);
  await page.locator('#viewer .close-dialog').click();
  await page.locator('#legacy-details summary').click();
  await page.locator('#legacy-search').fill('Hurricane');
  await expect(page.locator('#legacy-rows tr')).toHaveCount(1);
  await expect(page.locator('#legacy-rows')).toContainText('Lightning');
});

test('gallery opens directly from disk without remote dependencies', async ({ page }) => {
  const remoteRequests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  await page.goto('file://' + resolve(__dirname, '../index.html'));
  await expect(page.locator('.card')).toHaveCount(90);
  await page.locator('#search').fill('gold');
  expect(await page.locator('.card').count()).toBeGreaterThan(0);
  await page.locator('.card .open-image').first().click();
  await expect(page.locator('#viewer')).toBeVisible();
  expect(await page.locator('#viewer-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(remoteRequests).toEqual([]);
});
