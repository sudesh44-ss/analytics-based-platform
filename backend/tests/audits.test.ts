import test from 'node:test';
import assert from 'node:assert/strict';

// Set test environment variables so requireAuth permits dev-token in tests
process.env.NODE_ENV = 'test';

import { buildApp } from '../src/app.js';

test('Audits API Routes & Workflow Validation', async (t) => {
  const app = buildApp();

  await t.test('GET /api/v1/audits returns 401 when Authorization is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audits',
    });

    assert.equal(res.statusCode, 401);
    const json = res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  await t.test('POST /api/v1/audits returns 401 when Authorization is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/audits',
      payload: {
        projectId: '00000000-0000-0000-0000-000000000001',
      },
    });

    assert.equal(res.statusCode, 401);
    const json = res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  await t.test('POST /api/v1/audits rejects invalid request payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/audits',
      headers: {
        authorization: 'Bearer dev-token',
      },
      payload: {
        projectId: 'not-a-valid-uuid',
      },
    });

    assert.equal(res.statusCode, 400);
  });

  await t.test('GET /api/v1/audits/:auditId returns 401 when unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audits/00000000-0000-0000-0000-000000000001',
    });

    assert.equal(res.statusCode, 401);
  });

  await app.close();
});
