import type { Finding, FindingCategory, FindingSeverity } from "@/core/types";

const CATEGORY_SCORE_KEYS = [
  "safety",
  "schema",
  "docs",
  "errors",
  "agent_usability",
  "auth",
] as const satisfies readonly FindingCategory[];

const SCORE_PENALTIES: Record<FindingSeverity, number> = {
  error: 10,
  warning: 4,
  info: 1,
};

export type ScoreSummary = {
  overall: number;
  safety: number;
  schema: number;
  docs: number;
  errors: number;
  agentUsability: number;
  auth: number;
};

/**
 * Computes deterministic 0-100 scores from findings.
 *
 * Scores are deliberately simple: they are not a security grade, just a stable
 * signal for comparing specs and tracking improvement over time.
 */
export function calculateScores(findings: Finding[]): ScoreSummary {
  return {
    overall: calculateScore(findings),
    safety: calculateScoreForCategory(findings, "safety"),
    schema: calculateScoreForCategory(findings, "schema"),
    docs: calculateScoreForCategory(findings, "docs"),
    errors: calculateScoreForCategory(findings, "errors"),
    agentUsability: calculateScoreForCategory(findings, "agent_usability"),
    auth: calculateScoreForCategory(findings, "auth"),
  };
}

export function calculateScore(findings: Finding[]): number {
  const penalty = findings.reduce((total, finding) => total + SCORE_PENALTIES[finding.severity], 0);

  return clampScore(100 - penalty);
}

function calculateScoreForCategory(
  findings: Finding[],
  category: (typeof CATEGORY_SCORE_KEYS)[number],
): number {
  return calculateScore(findings.filter((finding) => finding.category === category));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
