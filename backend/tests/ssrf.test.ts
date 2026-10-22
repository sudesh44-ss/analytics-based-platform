import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTargetUrl } from '../src/services/ssrf.js';

test('SSRF Validator — Security Boundaries', async (t) => {
  await t.test('rejects loopback IPv4 127.0.0.1', async () => {
    const res = await validateTargetUrl('http://127.0.0.1');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited|loopback|private/i);
  });

  await t.test('rejects localhost hostname', async () => {
    const res = await validateTargetUrl('http://localhost');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /localhost and local destinations are prohibited/i);
  });

  await t.test('rejects cloud metadata IP 169.254.169.254', async () => {
    const res = await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /cloud metadata/i);
  });

  await t.test('rejects RFC 1918 private IP 10.0.0.1', async () => {
    const res = await validateTargetUrl('http://10.0.0.1');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /disallowed private/i);
  });

  await t.test('rejects RFC 1918 private IP 192.168.1.1', async () => {
    const res = await validateTargetUrl('http://192.168.1.1/admin');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /disallowed private/i);
  });

  await t.test('rejects non-HTTP protocols', async () => {
    const res = await validateTargetUrl('file:///etc/passwd');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /only http and https/i);
  });

  await t.test('rejects embedded credentials in URL', async () => {
    const res = await validateTargetUrl('https://admin:password@example.com');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /embedded credentials/i);
  });

  await t.test('rejects disallowed internal ports', async () => {
    const res = await validateTargetUrl('http://example.com:6379'); // Redis port
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /port 6379 is not permitted/i);
  });
});
