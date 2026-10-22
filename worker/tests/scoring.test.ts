import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCategoryScore, computeAuditScores } from '../src/processors/scoring.js';

test('Scoring Engine — Mathematical Accuracy', async (t) => {
  await t.test('clean audit returns perfect 100 in category and composite', () => {
    const scores = computeAuditScores([], 100);
    assert.equal(scores.seoScore, 100);
    assert.equal(scores.technicalHealthScore, 100);
    assert.equal(scores.securityScore, 100);
    assert.equal(scores.performanceScore, 100);
    assert.equal(scores.overallScore, 100);
  });

  await t.test('single Critical issue applies 10 point base deduction', () => {
    const categoryScore = calculateCategoryScore([
      { ruleId: 'HEALTH_SERVER_ERROR', category: 'TECHNICAL_HEALTH', severity: 'CRITICAL', occurrencesCount: 1 },
    ]);
    // 100 - (10 * log2(1 + 1)) = 100 - 10 = 90
    assert.equal(categoryScore, 90);
  });

  await t.test('category score caps at max deduction and never falls below 0', () => {
    const categoryScore = calculateCategoryScore([
      { ruleId: 'R1', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R2', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R3', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R4', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R5', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R6', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R7', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
      { ruleId: 'R8', category: 'SEO', severity: 'CRITICAL', occurrencesCount: 100 },
    ]);
    assert.ok(categoryScore >= 0);
  });
});
