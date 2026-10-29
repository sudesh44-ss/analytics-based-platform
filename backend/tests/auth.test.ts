import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import { buildApp } from '../src/app.js';

test('Authentication Middleware & Token Verification', async (t) => {
  const app = buildApp();

  await t.test('rejects request with missing Authorization header (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audits',
    });

    assert.equal(res.statusCode, 401);
    const json = res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  await t.test('rejects request with malformed Authorization header (no Bearer prefix)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audits',
      headers: {
        authorization: 'Basic dXNlcjpwYXNz',
      },
    });

    assert.equal(res.statusCode, 401);
    const json = res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  await t.test('rejects expired or invalid bearer token with INVALID_TOKEN (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audits',
      headers: {
        authorization: 'Bearer this-is-an-expired-fake-token.xyz',
      },
    });

    assert.equal(res.statusCode, 401);
    const json = res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'INVALID_TOKEN');
    assert.match(json.error.message, /Session token has expired or is invalid/i);
  });

  await t.test('accepts dev-token in controlled test environment', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audits',
      headers: {
        authorization: 'Bearer dev-token',
      },
    });

    // In test environment, dev-token is verified and attaches dev user (returns 200 or DB query response, not 401)
    assert.notEqual(res.statusCode, 401);
  });

  await app.close();
});
