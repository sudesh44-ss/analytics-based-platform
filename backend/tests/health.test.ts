import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('Fastify Health Route', async (t) => {
  const app = buildApp();

  await t.test('GET /api/v1/health returns 200 with service status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'healthy');
    assert.equal(json.data.service, 'sitescope-api');
  });

  await app.close();
});
