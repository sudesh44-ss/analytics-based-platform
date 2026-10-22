import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSeoRules } from '../src/processors/seo-rules.js';

test('SEO Rule Evaluation Engine', async (t) => {
  await t.test('detects missing title and H1 tags', () => {
    const findings = evaluateSeoRules([
      {
        url: 'https://example.com/bad-page',
        statusCode: 200,
        title: '',
        metaDescription: 'Some description',
        h1: null,
        canonicalUrl: 'https://example.com/bad-page',
        robotsMeta: null,
        links: [],
      },
    ]);

    const missingTitle = findings.find((f) => f.ruleId === 'SEO_MISSING_TITLE');
    assert.ok(missingTitle, 'Should detect SEO_MISSING_TITLE');
    assert.equal(missingTitle.severity, 'HIGH');

    const missingH1 = findings.find((f) => f.ruleId === 'SEO_MISSING_H1');
    assert.ok(missingH1, 'Should detect SEO_MISSING_H1');
    assert.equal(missingH1.severity, 'HIGH');
  });

  await t.test('detects broken 404 links', () => {
    const findings = evaluateSeoRules([
      {
        url: 'https://example.com/blog',
        statusCode: 200,
        title: 'Blog Title',
        metaDescription: 'Blog Description',
        h1: 'Blog',
        canonicalUrl: 'https://example.com/blog',
        robotsMeta: null,
        links: [{ targetUrl: 'https://example.com/broken-page', statusCode: 404 }],
      },
    ]);

    const brokenLink = findings.find((f) => f.ruleId === 'HEALTH_BROKEN_LINK');
    assert.ok(brokenLink, 'Should detect HEALTH_BROKEN_LINK');
    assert.equal(brokenLink.severity, 'HIGH');
  });
});
