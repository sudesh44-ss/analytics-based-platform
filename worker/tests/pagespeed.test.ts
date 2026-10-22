import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPageSpeedMetrics } from '../src/services/pagespeed.js';

test('Google PageSpeed Insights & Performance Service', async (t) => {
  await t.test('returns baseline lab metrics when API key is unconfigured', async () => {
    // Force empty API key
    const metrics = await fetchPageSpeedMetrics('https://example.com', 'MOBILE', '');

    assert.equal(metrics.performanceScore, 85);
    assert.equal(metrics.source, 'LIGHTHOUSE_WORKER');
    assert.equal(metrics.hasFieldData, false);
    assert.ok(metrics.lcpMs > 0);
    assert.ok(metrics.cls >= 0);
    assert.ok(metrics.inpMs > 0);
    assert.ok(metrics.fcpMs > 0);
  });

  await t.test('handles non-existent or invalid API key with graceful fallback', async () => {
    const metrics = await fetchPageSpeedMetrics('https://example.com', 'MOBILE', 'invalid_key_123');

    assert.ok(metrics.performanceScore >= 0 && metrics.performanceScore <= 100);
    assert.ok(metrics.accessibilityScore >= 0);
  });
});
