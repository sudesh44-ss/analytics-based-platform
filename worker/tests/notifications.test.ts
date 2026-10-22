import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sendAuditCompletedEmail,
  sendSecurityAlertEmail,
} from '../src/services/notifications.js';

test('Transactional Notification & Email Service', async (t) => {
  await t.test('simulates audit completion email safely in dev environment', async () => {
    const res = await sendAuditCompletedEmail({
      to: 'owner@example.com',
      domain: 'testsite.io',
      overallScore: 88,
      totalPages: 12,
      issuesCount: 3,
      auditId: '11111111-2222-3333-4444-555555555555',
    });

    assert.equal(res.success, true);
    assert.ok(res.id);
  });

  await t.test('simulates critical security alert dispatch safely', async () => {
    const res = await sendSecurityAlertEmail({
      to: 'sec-team@example.com',
      domain: 'testsite.io',
      ruleTitle: 'Insecure HTTP Protocol Used',
      severity: 'CRITICAL',
      recommendation: 'Enforce automatic 301 redirects to HTTPS',
      auditId: '11111111-2222-3333-4444-555555555555',
    });

    assert.equal(res.success, true);
    assert.ok(res.id);
  });
});
