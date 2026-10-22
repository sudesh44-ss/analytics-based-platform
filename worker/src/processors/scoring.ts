export interface RuleFindingInput {
  ruleId: string;
  category: 'SEO' | 'PERFORMANCE' | 'SECURITY' | 'TECHNICAL_HEALTH';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  occurrencesCount: number;
}

export interface CalculatedScores {
  overallScore: number;
  seoScore: number;
  performanceScore: number;
  technicalHealthScore: number;
  securityScore: number;
  isProvisional: boolean;
}

const SEVERITY_BASE_PENALTY: Record<string, number> = {
  CRITICAL: 10.0,
  HIGH: 5.0,
  MEDIUM: 2.0,
  LOW: 0.5,
  INFO: 0.0,
};

const SEVERITY_MAX_PENALTY: Record<string, number> = {
  CRITICAL: 15.0,
  HIGH: 10.0,
  MEDIUM: 5.0,
  LOW: 2.0,
  INFO: 0.0,
};

const CATEGORY_WEIGHTS = {
  SEO: 0.35,
  PERFORMANCE: 0.25,
  TECHNICAL_HEALTH: 0.25,
  SECURITY: 0.15,
};

export function calculateCategoryScore(findings: RuleFindingInput[]): number {
  let totalDeductions = 0;

  for (const finding of findings) {
    const basePenalty = SEVERITY_BASE_PENALTY[finding.severity] || 0;
    const maxPenalty = SEVERITY_MAX_PENALTY[finding.severity] || 0;

    // Logarithmic dampening: base * log2(count + 1), capped at maxPenalty
    const dampened = basePenalty * Math.log2(finding.occurrencesCount + 1);
    const cappedDeduction = Math.min(dampened, maxPenalty);

    totalDeductions += cappedDeduction;
  }

  return Math.max(0, Math.round(100 - totalDeductions));
}

export function computeAuditScores(
  findings: RuleFindingInput[],
  performanceScoreOverride?: number | null
): CalculatedScores {
  const seoFindings = findings.filter((f) => f.category === 'SEO');
  const healthFindings = findings.filter((f) => f.category === 'TECHNICAL_HEALTH');
  const securityFindings = findings.filter((f) => f.category === 'SECURITY');

  const seoScore = calculateCategoryScore(seoFindings);
  const technicalHealthScore = calculateCategoryScore(healthFindings);
  const securityScore = calculateCategoryScore(securityFindings);

  // Performance score comes from PageSpeed / Lighthouse or falls back to health baseline
  const performanceScore = performanceScoreOverride !== undefined && performanceScoreOverride !== null
    ? Math.max(0, Math.min(100, Math.round(performanceScoreOverride)))
    : technicalHealthScore;

  // Composite weighted score calculation
  const composite =
    seoScore * CATEGORY_WEIGHTS.SEO +
    performanceScore * CATEGORY_WEIGHTS.PERFORMANCE +
    technicalHealthScore * CATEGORY_WEIGHTS.TECHNICAL_HEALTH +
    securityScore * CATEGORY_WEIGHTS.SECURITY;

  return {
    overallScore: Math.round(composite),
    seoScore,
    performanceScore,
    technicalHealthScore,
    securityScore,
    isProvisional: performanceScoreOverride === null,
  };
}
