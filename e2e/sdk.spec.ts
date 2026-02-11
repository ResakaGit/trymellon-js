import { test, expect } from '@playwright/test';

test.describe('SDK load and public API', () => {
  test('page loads SDK and exposes TryMellon on window', async ({ page }) => {
    await page.goto('/e2e/index.html');
    const sdkLoaded = await page.evaluate(
      () => (window as unknown as { __sdkLoaded?: boolean }).__sdkLoaded
    );
    expect(sdkLoaded).toBe(true);
  });

  test('TryMellon.isSupported() is callable and returns boolean', async ({ page }) => {
    await page.goto('/e2e/index.html');
    const isSupportedResult = await page.evaluate(() => {
      const root = (
        window as unknown as { TryMellon?: { TryMellon?: { isSupported?: () => boolean } } }
      ).TryMellon;
      const Cls = root && root.TryMellon;
      return Cls && typeof Cls.isSupported === 'function' ? Cls.isSupported() : undefined;
    });
    expect(typeof isSupportedResult).toBe('boolean');
  });
});
