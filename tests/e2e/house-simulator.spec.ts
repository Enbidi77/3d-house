import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_DIR =
  'C:/Users/PC/.gemini/antigravity/brain/716fa4b8-9192-4a50-aba1-95672ac013cd';

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

test.describe('3D House Simulator E2E', () => {
  test('renders 3D canvas and main editor shell with zero uncaught errors', async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    // Desktop side panels
    await expect(page.locator('button[title="Build & Floors"]')).toBeVisible();
    await expect(page.getByText('Inspector', { exact: true })).toBeVisible();

    // 3D WebGL canvas renders and resizes to fill viewport
    const canvas = page.locator('main canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    await expect(async () => {
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(200);
    }).toPass({ timeout: 15_000 });

    // Save desktop 3D viewport screenshot
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `${ARTIFACT_DIR}/desktop-3d-viewport.png`,
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  test('edits project name inline and persists theme across reload', async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto('/');
    await expect(page.locator('main canvas').first()).toBeVisible({ timeout: 20_000 });

    // Edit project name inline
    const renameButton = page.locator('button[title="Click to rename project"]');
    await renameButton.click();
    const nameInput = page.locator('input[aria-label="Project name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Glass Villa QA');
    await nameInput.press('Enter');
    await expect(page.locator('button[title="Click to rename project"]')).toHaveText(
      'Glass Villa QA',
    );

    // Toggle theme and verify persistence in localStorage across reload
    const html = page.locator('html');
    const initialHasDark = await html.evaluate((el) => el.classList.contains('dark'));
    await page.locator('button[aria-label="Toggle theme"]').click();
    const toggledHasDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(toggledHasDark).toBe(!initialHasDark);

    await page.reload();
    await expect(page.locator('header')).toBeVisible();
    const persistedHasDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(persistedHasDark).toBe(toggledHasDark);

    expect(errors).toEqual([]);
  });

  test('switches camera modes (Orbit -> Plan -> Walk -> Orbit) and captures floorplan', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await page.goto('/');
    await expect(page.locator('main canvas').first()).toBeVisible({ timeout: 20_000 });

    // Orbit -> Floor Plan
    await page.locator('footer button', { hasText: 'Plan' }).click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${ARTIFACT_DIR}/desktop-floorplan-view.png`,
      fullPage: true,
    });

    // Plan -> Walk (First-Person)
    await page.locator('footer button', { hasText: 'Walk' }).click();
    await expect(page.getByText(/First-Person Walk:/)).toBeVisible();

    // Walk -> Orbit
    await page.locator('main button', { hasText: 'Exit' }).click();
    await expect(page.getByText(/First-Person Walk:/)).not.toBeVisible();

    expect(errors).toEqual([]);
  });

  test('places furniture from library, inspects properties, and performs Undo/Redo', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await page.goto('/');
    await expect(page.locator('main canvas').first()).toBeVisible({ timeout: 20_000 });

    // Open Furniture Library tab
    await page.locator('button[title="Furniture Library"]').click();
    await expect(page.locator('input[aria-label="Search furniture"]')).toBeVisible();

    // Place first furniture item
    const firstPlaceBtn = page.locator('button', { hasText: '+ Place' }).first();
    const itemName = (await firstPlaceBtn.locator('div.text-xs.font-medium').textContent())?.trim();
    await firstPlaceBtn.click();

    // Inspector should now show the placed item's properties instead of Overview
    await expect(page.getByText('Overview')).not.toBeVisible();
    if (itemName) {
      await expect(page.locator('aside').last().locator('input').first()).toHaveValue(itemName);
    }

    // Undo should remove selection / revert placement and enable Redo
    const undoBtn = page.locator('button[aria-label="Undo"]');
    const redoBtn = page.locator('button[aria-label="Redo"]');
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();

    expect(errors).toEqual([]);
  });

  test('switches lighting and environment preset', async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto('/');
    await expect(page.locator('main canvas').first()).toBeVisible({ timeout: 20_000 });

    await page.locator('button[title="Lighting & Environment"]').click();
    await expect(page.getByText('7 Lighting Presets')).toBeVisible();

    // Click Golden Hour preset
    await page.locator('button', { hasText: 'Golden Hour' }).click();
    await expect(page.locator('footer')).toContainText('17:');

    // Click Nighttime preset
    await page.locator('button', { hasText: 'Nighttime' }).click();
    await expect(page.locator('footer')).toContainText('22:00');

    expect(errors).toEqual([]);
  });

  test('navigates to /projects and /settings cleanly', async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto('/projects');
    await expect(page.locator('body')).toContainText(/Projects/i);

    await page.goto('/settings');
    await expect(page.locator('body')).toContainText(/Settings/i);

    expect(errors).toEqual([]);
  });

  test('supports responsive mobile drawer and sheet controls at 390x844', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/');
    await expect(page.locator('main canvas').first()).toBeVisible({ timeout: 20_000 });

    const mobileLeftBtn = page.locator('button[aria-label="Open tools panel"]');
    const mobileRightBtn = page.locator('button[aria-label="Open inspector"]');
    await expect(mobileLeftBtn).toBeVisible();
    await expect(mobileRightBtn).toBeVisible();

    // Open mobile left drawer
    await mobileLeftBtn.click();
    await expect(page.getByText('Tools & Library')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Tools & Library')).not.toBeVisible();

    // Open mobile right drawer
    await mobileRightBtn.click();
    await expect(page.getByText('Properties Inspector')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Properties Inspector')).not.toBeVisible();

    expect(errors).toEqual([]);
  });
});
