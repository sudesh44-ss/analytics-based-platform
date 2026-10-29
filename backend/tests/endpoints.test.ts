import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('Protected API Endpoints Auth & Error Handling', async (t) => {
  const app = buildApp();

  await t.test('GET /api/v1/projects requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test('GET /api/v1/billing/subscription requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/subscription',
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test('GET /api/v1/billing/usage requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/usage',
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test('GET /api/v1/billing/invoices requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/invoices',
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test('GET /api/v1/projects with dev-token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: {
        authorization: 'Bearer dev-token',
      },
    });
    console.log('PROJECTS WITH DEV-TOKEN STATUS:', res.statusCode, 'BODY:', res.body);
  });

  await t.test('GET /api/v1/billing/subscription with dev-token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/subscription',
      headers: {
        authorization: 'Bearer dev-token',
      },
    });
    console.log('SUBSCRIPTION WITH DEV-TOKEN STATUS:', res.statusCode, 'BODY:', res.body);
  });

  await t.test('GET /api/v1/billing/usage with dev-token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/usage',
      headers: {
        authorization: 'Bearer dev-token',
      },
    });
    console.log('USAGE WITH DEV-TOKEN STATUS:', res.statusCode, 'BODY:', res.body);
  });

  await t.test('GET /api/v1/billing/invoices with dev-token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/invoices',
      headers: {
        authorization: 'Bearer dev-token',
      },
    });
    console.log('INVOICES WITH DEV-TOKEN STATUS:', res.statusCode, 'BODY:', res.body);
  });

  await app.close();
});
