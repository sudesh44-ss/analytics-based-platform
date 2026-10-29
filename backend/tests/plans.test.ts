import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('Billing Plans Endpoint', async (t) => {
  const app = buildApp();

  await t.test('GET /api/v1/billing/plans returns 200 with plans array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/plans',
    });

    console.log('PLANS RESPONSE STATUS:', res.statusCode);
    console.log('PLANS RESPONSE BODY:', res.body);

    assert.equal(res.statusCode, 200);
    const json = res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.items));
  });

  await app.close();
});
