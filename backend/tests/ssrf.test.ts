import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTargetUrl, isIpAddressDisallowed } from '../src/services/ssrf.js';

test('SSRF Validator — Security Boundaries & Advanced Threat Vectors', async (t) => {
  await t.test('rejects loopback IPv4 127.0.0.1', async () => {
    const res = await validateTargetUrl('http://127.0.0.1');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited|loopback|private/i);
  });

  await t.test('rejects localhost hostname', async () => {
    const res = await validateTargetUrl('http://localhost');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited|local destination/i);
  });

  await t.test('rejects cloud metadata IP 169.254.169.254', async () => {
    const res = await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /cloud metadata/i);
  });

  await t.test('rejects cloud metadata hostnames', async () => {
    const res = await validateTargetUrl('http://metadata.google.internal/computeMetadata/v1/');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited/i);
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

  await t.test('rejects non-HTTP protocols (file, ftp, gopher, ws)', async () => {
    const resFile = await validateTargetUrl('file:///etc/passwd');
    assert.equal(resFile.isValid, false);
    assert.match(resFile.error || '', /only http and https/i);

    const resFtp = await validateTargetUrl('ftp://example.com/file');
    assert.equal(resFtp.isValid, false);
    assert.match(resFtp.error || '', /only http and https/i);

    const resGopher = await validateTargetUrl('gopher://example.com/1');
    assert.equal(resGopher.isValid, false);
    assert.match(resGopher.error || '', /only http and https/i);
  });

  await t.test('rejects embedded credentials in URL', async () => {
    const res = await validateTargetUrl('https://admin:password@example.com');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /embedded credentials/i);
  });

  await t.test('rejects disallowed internal ports', async () => {
    const resRedis = await validateTargetUrl('http://example.com:6379'); // Redis
    assert.equal(resRedis.isValid, false);
    assert.match(resRedis.error || '', /port 6379 is not permitted/i);

    const resPg = await validateTargetUrl('http://example.com:5432'); // PostgreSQL
    assert.equal(resPg.isValid, false);
    assert.match(resPg.error || '', /port 5432 is not permitted/i);

    const resSsh = await validateTargetUrl('http://example.com:22'); // SSH
    assert.equal(resSsh.isValid, false);
    assert.match(resSsh.error || '', /port 22 is not permitted/i);
  });

  await t.test('rejects IPv6 loopback [::1]', async () => {
    const res = await validateTargetUrl('http://[::1]');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /prohibited|loopback|local/i);
  });

  await t.test('rejects IPv6 link-local [fe80::1]', async () => {
    const res = await validateTargetUrl('http://[fe80::1]');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /disallowed|linklocal|subnet/i);
  });

  await t.test('rejects IPv6 cloud metadata [fd00:ec2::254]', async () => {
    const res = await validateTargetUrl('http://[fd00:ec2::254]');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /cloud metadata|uniqueLocal/i);
  });

  await t.test('rejects IPv4-mapped IPv6 [::ffff:127.0.0.1]', async () => {
    const res = await validateTargetUrl('http://[::ffff:127.0.0.1]');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /disallowed|loopback|private/i);
  });

  await t.test('rejects IPv4-mapped IPv6 cloud metadata [::ffff:169.254.169.254]', async () => {
    const res = await validateTargetUrl('http://[::ffff:169.254.169.254]');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /cloud metadata/i);
  });

  await t.test('rejects decimal dword and hex IP notation for loopback', async () => {
    const resDword = await validateTargetUrl('http://2130706433/'); // 127.0.0.1
    assert.equal(resDword.isValid, false);
    assert.match(resDword.error || '', /prohibited|loopback|private/i);

    const resHex = await validateTargetUrl('http://0x7f000001/'); // 127.0.0.1
    assert.equal(resHex.isValid, false);
    assert.match(resHex.error || '', /prohibited|loopback|private/i);
  });

  await t.test('rejects URLs exceeding maximum permitted length', async () => {
    const hugeUrl = 'https://example.com/' + 'a'.repeat(2100);
    const res = await validateTargetUrl(hugeUrl);
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /exceeds maximum permitted length/i);
  });

  await t.test('isIpAddressDisallowed utility directly identifies illegal IP ranges', () => {
    assert.equal(isIpAddressDisallowed('127.0.0.1').disallowed, true);
    assert.equal(isIpAddressDisallowed('10.0.0.5').disallowed, true);
    assert.equal(isIpAddressDisallowed('172.16.0.1').disallowed, true);
    assert.equal(isIpAddressDisallowed('192.168.1.1').disallowed, true);
    assert.equal(isIpAddressDisallowed('169.254.169.254').disallowed, true);
    assert.equal(isIpAddressDisallowed('::1').disallowed, true);
    assert.equal(isIpAddressDisallowed('fe80::1').disallowed, true);
    assert.equal(isIpAddressDisallowed('::ffff:127.0.0.1').disallowed, true);
    assert.equal(isIpAddressDisallowed('8.8.8.8').disallowed, false);
    assert.equal(isIpAddressDisallowed('1.1.1.1').disallowed, false);
  });
});
