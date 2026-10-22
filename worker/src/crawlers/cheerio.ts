import { URL } from 'node:url';
import { CheerioCrawler, Configuration, LogLevel } from 'crawlee';
import { validateTargetUrl } from '../security/ssrf.js';

export interface CrawlJobConfig {
  maxPages?: number;
  crawlDepth?: number;
  requestTimeoutMs?: number;
  maxConcurrency?: number;
  allowLocalhost?: boolean;
}

export interface ExtractedLink {
  targetUrl: string;
  statusCode?: number;
  isInternal: boolean;
}

export interface CrawledPageData {
  url: string;
  normalizedUrl: string;
  statusCode: number;
  responseTimeMs: number;
  contentType?: string | null;
  contentLength?: number | null;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  canonicalUrl?: string | null;
  robotsMeta?: string | null;
  isIndexable: boolean;
  depth: number;
  links: ExtractedLink[];
  errorMessage?: string;
}

export interface CrawlResult {
  pages: CrawledPageData[];
  totalPagesCrawled: number;
  failedCount: number;
  durationMs: number;
}

export async function crawlWebsite(
  targetUrl: string,
  config: CrawlJobConfig = {},
  onProgress?: (pagesCrawled: number) => Promise<void> | void
): Promise<CrawlResult> {
  const startTime = Date.now();

  // 1. Pre-flight SSRF check on target root URL
  const initialSsrf = await validateTargetUrl(targetUrl, {
    allowLocalhost: config.allowLocalhost,
  });

  if (!initialSsrf.isValid || !initialSsrf.normalizedUrl) {
    throw new Error(
      `SSRF validation failed for target URL: ${initialSsrf.error || 'Disallowed destination'}`
    );
  }

  const normalizedTarget = initialSsrf.normalizedUrl;
  const parsedTarget = new URL(normalizedTarget);
  const targetOrigin = parsedTarget.origin.toLowerCase();

  const maxPages = config.maxPages && config.maxPages > 0 ? Math.min(config.maxPages, 1000) : 50;
  const maxDepth = config.crawlDepth && config.crawlDepth > 0 ? Math.min(config.crawlDepth, 10) : 3;
  const maxConcurrency = config.maxConcurrency && config.maxConcurrency > 0 ? Math.min(config.maxConcurrency, 5) : 3;
  const timeoutSecs = Math.max(5, Math.min(60, Math.round((config.requestTimeoutMs || 15000) / 1000)));

  const crawledPagesMap = new Map<string, CrawledPageData>();
  const visitedUrls = new Set<string>();
  const enqueuedUrls = new Set<string>();

  // Normalize URL for deduplication
  function normalizeLink(urlStr: string): string | null {
    try {
      const u = new URL(urlStr);
      u.hash = ''; // strip fragments
      // Strip trailing slash for consistency (unless root path)
      if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
        u.pathname = u.pathname.slice(0, -1);
      }
      return u.toString();
    } catch {
      return null;
    }
  }

  const normalizedSeed = normalizeLink(normalizedTarget) || normalizedTarget;
  visitedUrls.add(normalizedSeed);
  enqueuedUrls.add(normalizedSeed);

  // Configure Crawlee in-memory configuration to isolate test and production runs
  const crawleeConfig = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
  });

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerCrawl: maxPages,
      maxConcurrency,
      navigationTimeoutSecs: timeoutSecs,
      maxRequestRetries: 1,

      // Pre-navigation SSRF hook: Enforces network isolation before ANY outbound HTTP request
      preNavigationHooks: [
        async (crawlingContext) => {
          const reqUrl = crawlingContext.request.url;
          const ssrfResult = await validateTargetUrl(reqUrl, {
            allowLocalhost: config.allowLocalhost,
          });

          if (!ssrfResult.isValid) {
            throw new Error(`SSRF Blocked during pre-navigation: ${ssrfResult.error}`);
          }

          // Enforce strict origin bounding
          const parsed = new URL(reqUrl);
          if (parsed.origin.toLowerCase() !== targetOrigin) {
            throw new Error(
              `Out-of-origin request blocked: ${parsed.origin} does not match target ${targetOrigin}`
            );
          }
        },
      ],

      // Successful response handler
      requestHandler: async ({ request, response, $, addRequests }) => {
        const currentUrl = request.url;
        const normalizedCurrent = normalizeLink(currentUrl) || currentUrl;
        const depth = (request.userData?.depth as number) ?? 0;
        const statusCode = response.statusCode || 200;
        const responseTimeMs = (request.userData?.startTime
          ? Date.now() - (request.userData.startTime as number)
          : 120);

        const contentType = (response.headers['content-type'] as string) || null;
        const contentLength = response.headers['content-length']
          ? parseInt(response.headers['content-length'] as string, 10)
          : null;

        // Parse HTML Metadata
        const title = $('title').first().text().trim() || null;
        const metaDescription =
          $('meta[name="description" i]').attr('content')?.trim() ||
          $('meta[property="og:description" i]').attr('content')?.trim() ||
          null;
        const h1 = $('h1').first().text().trim() || null;
        const canonicalUrl = $('link[rel="canonical" i]').attr('href')?.trim() || null;
        const robotsMeta = $('meta[name="robots" i]').attr('content')?.trim() || null;

        const isIndexable = !(
          robotsMeta &&
          (robotsMeta.toLowerCase().includes('noindex') || robotsMeta.toLowerCase().includes('none'))
        );

        // Discover and extract links
        const extractedLinks: ExtractedLink[] = [];
        const candidateInternalLinks: string[] = [];

        $('a[href]').each((_, el) => {
          const href = $(el).attr('href')?.trim();
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
          }

          try {
            const resolved = new URL(href, currentUrl);
            if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
              return;
            }

            const cleanLink = normalizeLink(resolved.toString());
            if (!cleanLink) return;

            const isInternal = resolved.origin.toLowerCase() === targetOrigin;
            extractedLinks.push({
              targetUrl: cleanLink,
              isInternal,
            });

            if (isInternal) {
              candidateInternalLinks.push(cleanLink);
            }
          } catch {
            // Unparseable URL
          }
        });

        const pageRecord: CrawledPageData = {
          url: currentUrl,
          normalizedUrl: normalizedCurrent,
          statusCode,
          responseTimeMs,
          contentType,
          contentLength,
          title,
          metaDescription,
          h1,
          canonicalUrl,
          robotsMeta,
          isIndexable,
          depth,
          links: extractedLinks,
        };

        crawledPagesMap.set(normalizedCurrent, pageRecord);

        if (onProgress) {
          try {
            await onProgress(crawledPagesMap.size);
          } catch {
            // Ignore callback errors
          }
        }

        // Enqueue internal links if depth permits and limit not reached
        if (depth < maxDepth && crawledPagesMap.size < maxPages) {
          const newRequests = [];

          for (const rawLink of candidateInternalLinks) {
            if (enqueuedUrls.has(rawLink) || visitedUrls.has(rawLink)) {
              continue;
            }

            // Perform SSRF check on candidate before enqueuing
            const linkSsrf = await validateTargetUrl(rawLink, {
              allowLocalhost: config.allowLocalhost,
            });

            if (linkSsrf.isValid) {
              enqueuedUrls.add(rawLink);
              newRequests.push({
                url: rawLink,
                userData: {
                  depth: depth + 1,
                  startTime: Date.now(),
                },
              });
            }

            if (enqueuedUrls.size >= maxPages) {
              break;
            }
          }

          if (newRequests.length > 0) {
            await addRequests(newRequests);
          }
        }
      },

      // Error handler for 4xx/5xx or unreachable pages
      failedRequestHandler: async ({ request, error, response }) => {
        const currentUrl = request.url;
        const normalizedCurrent = normalizeLink(currentUrl) || currentUrl;
        const depth = (request.userData?.depth as number) ?? 0;
        const errMessage = error instanceof Error ? error.message : String(error);
        const statusCode = response?.statusCode || (errMessage.includes('404') ? 404 : 500);

        const failedRecord: CrawledPageData = {
          url: currentUrl,
          normalizedUrl: normalizedCurrent,
          statusCode,
          responseTimeMs: 0,
          title: null,
          metaDescription: null,
          h1: null,
          canonicalUrl: null,
          robotsMeta: null,
          isIndexable: false,
          depth,
          links: [],
          errorMessage: errMessage,
        };

        crawledPagesMap.set(normalizedCurrent, failedRecord);
      },
    },
    crawleeConfig
  );

  // Start crawling with seed URL
  try {
    await crawler.run([
      {
        url: normalizedSeed,
        userData: { depth: 0, startTime: Date.now() },
      },
    ]);
  } catch (crawlErr: any) {
    // If the seed request failed completely and map is empty, rethrow
    if (crawledPagesMap.size === 0) {
      throw new Error(`Crawl failed to reach initial target: ${crawlErr?.message || crawlErr}`);
    }
  }

  // Cross-reference extracted links with crawled status codes for broken link detection
  const pages = Array.from(crawledPagesMap.values());
  for (const page of pages) {
    for (const link of page.links) {
      if (link.isInternal && crawledPagesMap.has(link.targetUrl)) {
        link.statusCode = crawledPagesMap.get(link.targetUrl)!.statusCode;
      }
    }
  }

  const failedCount = pages.filter((p) => p.statusCode >= 400).length;

  return {
    pages,
    totalPagesCrawled: pages.length,
    failedCount,
    durationMs: Date.now() - startTime,
  };
}
