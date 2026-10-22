import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { crawlWebsite } from '../src/crawlers/cheerio.js';

test('Cheerio Website Crawler — Engine Verification', async (t) => {
  let server: http.Server;
  let baseUrl: string;

  await t.test('setup local mock website server', async () => {
    server = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <title>Home - Test SaaS Site</title>
            <meta name="description" content="This is the home page description.">
            <link rel="canonical" href="${baseUrl}/">
            <meta name="robots" content="index, follow">
          </head>
          <body>
            <h1>Welcome to Test SaaS</h1>
            <a href="/features">Features Page</a>
            <a href="/pricing">Pricing Page</a>
            <a href="/broken-link">Broken 404 Page</a>
            <a href="https://external-unauthorized.com/blog">External Link</a>
          </body>
          </html>
        `);
      } else if (url === '/features') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Features - Test SaaS Site</title>
            <meta name="description" content="Features overview.">
            <link rel="canonical" href="${baseUrl}/features">
          </head>
          <body>
            <h1>Our Features</h1>
            <a href="/">Back Home</a>
          </body>
          </html>
        `);
      } else if (url === '/pricing') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Pricing Plans</title>
          </head>
          <body>
            <h1>Affordable Pricing</h1>
          </body>
          </html>
        `);
      } else if (url === '/broken-link') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  await t.test('crawls bounded origin, extracts SEO metadata, and detects 404', async () => {
    const result = await crawlWebsite(baseUrl, {
      maxPages: 10,
      crawlDepth: 2,
      requestTimeoutMs: 5000,
      maxConcurrency: 2,
      allowLocalhost: true, // test flag
    });

    assert.ok(result.totalPagesCrawled >= 3, `Expected at least 3 pages crawled, got ${result.totalPagesCrawled}`);

    // Verify Home Page extraction
    const homePage = result.pages.find((p) => p.url === `${baseUrl}/` || p.normalizedUrl === baseUrl);
    assert.ok(homePage, 'Home page must be crawled');
    assert.equal(homePage?.title, 'Home - Test SaaS Site');
    assert.equal(homePage?.metaDescription, 'This is the home page description.');
    assert.equal(homePage?.h1, 'Welcome to Test SaaS');
    assert.equal(homePage?.statusCode, 200);
    assert.equal(homePage?.isIndexable, true);

    // Verify 404 page was discovered and recorded
    const brokenPage = result.pages.find((p) => p.url.includes('/broken-link'));
    assert.ok(brokenPage, 'Broken 404 link should be captured in crawled pages');
    assert.equal(brokenPage?.statusCode, 404);

    // Verify broken link status code propagation in homePage.links
    const brokenLinkRef = homePage?.links.find((l) => l.targetUrl.includes('/broken-link'));
    assert.ok(brokenLinkRef, 'Broken link reference must be present in home page links');
    assert.equal(brokenLinkRef?.statusCode, 404);

    // Verify origin bounding: external link is NOT enqueued or crawled
    const externalCrawled = result.pages.some((p) => p.url.includes('external-unauthorized.com'));
    assert.equal(externalCrawled, false, 'External links must NOT be crawled');
  });

  await t.test('teardown mock website server', async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
