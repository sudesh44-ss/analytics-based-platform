import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTargetUrl, isIpAddressDisallowed } from '../src/security/ssrf.js';

test('Worker SSRF Defense Layer', async (t) => {
  await t.test('blocks loopback destination 127.0.0.1 by default', async () => {
    const res = await validateTargetUrl('http://127.0.0.1');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited|loopback|private/i);
  });

  await t.test('blocks localhost hostname', async () => {
    const res = await validateTargetUrl('http://localhost');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited|local destination|localhost/i);
  });

  await t.test('blocks cloud metadata 169.254.169.254', async () => {
    const res = await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /cloud metadata/i);
  });

  await t.test('blocks private subnets (10.0.0.0/8, 192.168.0.0/16)', async () => {
    const res1 = await validateTargetUrl('http://10.20.30.40');
    assert.equal(res1.isValid, false);

    const res2 = await validateTargetUrl('http://192.168.1.100');
    assert.equal(res2.isValid, false);
  });

  await t.test('blocks non-HTTP protocols', async () => {
    const res = await validateTargetUrl('gopher://internal-service');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /only http and https/i);
  });

  await t.test('blocks embedded credentials', async () => {
    const res = await validateTargetUrl('https://user:pass@example.com');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /embedded credentials/i);
  });

  await t.test('blocks prohibited ports', async () => {
    const res = await validateTargetUrl('http://example.com:22');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /port 22 is not permitted/i);
  });

  await t.test('blocks IPv6 loopback [::1] and link-local [fe80::1]', async () => {
    const resLoop = await validateTargetUrl('http://[::1]');
    assert.equal(resLoop.isValid, false);

    const resLink = await validateTargetUrl('http://[fe80::1]');
    assert.equal(resLink.isValid, false);
  });

  await t.test('blocks IPv4-mapped IPv6 literals', async () => {
    const resMapped = await validateTargetUrl('http://[::ffff:127.0.0.1]');
    assert.equal(resMapped.isValid, false);

    const resMetadata = await validateTargetUrl('http://[::ffff:169.254.169.254]');
    assert.equal(resMetadata.isValid, false);
  });

  await t.test('isIpAddressDisallowed utility identifies illegal IPs', () => {
    assert.equal(isIpAddressDisallowed('127.0.0.1').disallowed, true);
    assert.equal(isIpAddressDisallowed('169.254.169.254').disallowed, true);
    assert.equal(isIpAddressDisallowed('10.1.2.3').disallowed, true);
    assert.equal(isIpAddressDisallowed('fd00:ec2::254').disallowed, true);
  });
});
