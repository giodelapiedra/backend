/**
 * KPI Calculation Constants
 * Centralized constants for KPI calculations to avoid magic numbers
 */

// KPI Weight Configuration (Current/Production)
export const KPI_WEIGHTS = {
  COMPLETION_RATE: 0.5,    // 50% weight
  ON_TIME_RATE: 0.25,      // 25% weight
  LATE_RATE: 0.15,         // 15% weight (penalty)
  QUALITY_SCORE: 0.1       // 10% weight
} as const;

// Health Score Configuration
export const HEALTH_SCORE_WEIGHTS = {
  COMPLETION_RATE: 0.6,    // 60% weight
  READINESS_SCORE: 0.4     // 40% weight
} as const;

// KPI Rating Thresholds
export const KPI_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  AVERAGE: 60,
  POOR: 40,
  FAILING: 0
} as const;

// KPI Rating Colors
export const KPI_COLORS = {
  EXCELLENT: '#10b981',    // Green
  GOOD: '#22c55e',         // Light Green
  AVERAGE: '#eab308',      // Yellow
  POOR: '#f97316',         // Orange
  FAILING: '#ef4444'       // Red
} as const;

// Readiness Level Scores
export const READINESS_SCORES = {
  FIT: 100,
  MINOR: 75,
  NOT_FIT: 25,
  UNKNOWN: 0
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TTL: 30000,              // 30 seconds
  MAX_SIZE: 100,           // Max cache entries
  AUTO_REFRESH: 30000      // 30 seconds
} as const;

// Pagination Configuration
export const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  DEFAULT_PAGE: 1
} as const;

// Date Configuration
export const DATE_CONFIG = {
  TIMEZONE: 'Asia/Manila',
  PHT_OFFSET_HOURS: 8,
  DEFAULT_LOOKBACK_DAYS: 30
} as const;

/**
 * Get KPI rating based on score
 */
export function getKPIRating(score: number): {
  rating: string;
  color: string;
} {
  if (score >= KPI_THRESHOLDS.EXCELLENT) {
    return { rating: 'Excellent', color: KPI_COLORS.EXCELLENT };
  } else if (score >= KPI_THRESHOLDS.GOOD) {
    return { rating: 'Good', color: KPI_COLORS.GOOD };
  } else if (score >= KPI_THRESHOLDS.AVERAGE) {
    return { rating: 'Average', color: KPI_COLORS.AVERAGE };
  } else if (score >= KPI_THRESHOLDS.POOR) {
    return { rating: 'Poor', color: KPI_COLORS.POOR };
  } else {
    return { rating: 'Failing', color: KPI_COLORS.FAILING };
  }
}

/**
 * Get readiness score based on level
 */
export function getReadinessScore(level: string): number {
  switch (level.toLowerCase()) {
    case 'fit':
      return READINESS_SCORES.FIT;
    case 'minor':
      return READINESS_SCORES.MINOR;
    case 'not_fit':
      return READINESS_SCORES.NOT_FIT;
    default:
      return READINESS_SCORES.UNKNOWN;
  }
}

