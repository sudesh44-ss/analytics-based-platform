export interface PageAuditData {
  url: string;
  statusCode: number;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  canonicalUrl?: string | null;
  robotsMeta?: string | null;
  links: Array<{ targetUrl: string; statusCode?: number }>;
}

export interface GeneratedFinding {
  ruleId: string;
  category: 'SEO' | 'PERFORMANCE' | 'SECURITY' | 'TECHNICAL_HEALTH';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  explanation: string;
  recommendation: string;
  affectedUrls: string[];
  scoreImpact: number;
}

export function evaluateSeoRules(pages: PageAuditData[]): GeneratedFinding[] {
  const findingsMap = new Map<string, GeneratedFinding>();

  function recordIssue(
    ruleId: string,
    category: 'SEO' | 'SECURITY' | 'TECHNICAL_HEALTH',
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
    title: string,
    explanation: string,
    recommendation: string,
    url: string
  ) {
    if (!findingsMap.has(ruleId)) {
      findingsMap.set(ruleId, {
        ruleId,
        category,
        severity,
        title,
        explanation,
        recommendation,
        affectedUrls: [],
        scoreImpact: severity === 'CRITICAL' ? -10 : severity === 'HIGH' ? -5 : severity === 'MEDIUM' ? -2 : -0.5,
      });
    }
    const finding = findingsMap.get(ruleId)!;
    if (!finding.affectedUrls.includes(url)) {
      finding.affectedUrls.push(url);
    }
  }

  // Evaluate each page
  for (const page of pages) {
    // 1. HTTP 4xx / 5xx Status
    if (page.statusCode >= 500) {
      recordIssue(
        'HEALTH_SERVER_ERROR',
        'TECHNICAL_HEALTH',
        'CRITICAL',
        'Internal Server Error (5xx)',
        'Server returned a 5xx response code.',
        'Inspect web server logs and fix backend unhandled exceptions.',
        page.url
      );
    } else if (page.statusCode >= 400) {
      recordIssue(
        'HEALTH_CLIENT_ERROR',
        'TECHNICAL_HEALTH',
        'HIGH',
        'Client Error (4xx)',
        'Page returned a 4xx error code (e.g. 404 Not Found).',
        'Fix broken links or configure a 301 redirect to valid replacement content.',
        page.url
      );
    }

    // 2. Title Tag
    if (!page.title || page.title.trim().length === 0) {
      recordIssue(
        'SEO_MISSING_TITLE',
        'SEO',
        'HIGH',
        'Missing Title Tag',
        'The page does not have a <title> element.',
        'Add a unique, descriptive <title> tag between 30 and 60 characters.',
        page.url
      );
    }

    // 3. Meta Description
    if (!page.metaDescription || page.metaDescription.trim().length === 0) {
      recordIssue(
        'SEO_MISSING_META_DESCRIPTION',
        'SEO',
        'MEDIUM',
        'Missing Meta Description',
        'Page lacks a meta description tag.',
        'Add a concise summary between 120 and 160 characters in a <meta name="description"> tag.',
        page.url
      );
    }

    // 4. Heading 1 (H1)
    if (!page.h1 || page.h1.trim().length === 0) {
      recordIssue(
        'SEO_MISSING_H1',
        'SEO',
        'HIGH',
        'Missing Heading 1 (H1)',
        'The page has no <h1> element.',
        'Include a single prominent <h1> heading summarizing the page topic.',
        page.url
      );
    }

    // 5. Canonical Tag
    if (!page.canonicalUrl) {
      recordIssue(
        'SEO_MISSING_CANONICAL',
        'SEO',
        'MEDIUM',
        'Missing Canonical Tag',
        'No <link rel="canonical"> tag detected.',
        'Specify the preferred canonical URL to prevent duplicate content indexing.',
        page.url
      );
    }

    // 6. Robots Noindex
    if (page.robotsMeta && page.robotsMeta.toLowerCase().includes('noindex')) {
      recordIssue(
        'SEO_NOINDEX_DIRECTIVE',
        'SEO',
        'MEDIUM',
        'Page Has Noindex Directive',
        'Page contains a noindex robots directive instructing search engines not to index it.',
        'Verify if this page was intentionally excluded from search engines.',
        page.url
      );
    }

    // 7. Security: HTTPS Check
    if (page.url.startsWith('http://')) {
      recordIssue(
        'SEC_INSECURE_HTTP',
        'SECURITY',
        'HIGH',
        'Insecure HTTP Protocol Used',
        'Resource was loaded over unencrypted HTTP.',
        'Enforce HTTPS and configure automatic 301 redirects to https://.',
        page.url
      );
    }

    // 8. Broken Outbound / Internal Links
    for (const link of page.links) {
      if (link.statusCode === 404) {
        recordIssue(
          'HEALTH_BROKEN_LINK',
          'TECHNICAL_HEALTH',
          'HIGH',
          'Broken Internal Link (404)',
          `Link on this page points to a 404 URL: ${link.targetUrl}`,
          'Update or remove the broken link reference.',
          page.url
        );
      }
    }
  }

  return Array.from(findingsMap.values());
}
