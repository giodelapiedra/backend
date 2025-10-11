/**
 * Metrics Validation Utility
 * Validates data accuracy and logs issues
 */

export interface MetricsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TeamMetrics {
  totalAssignments: number;
  completedAssignments: number;
  onTimeSubmissions?: number;
  lateSubmissions?: number;
  overdueAssignments?: number;
  assignedWorkers: number;
  workerCount: number;
  complianceRate: number;
}

/**
 * Validate team metrics for data consistency
 */
export function validateTeamMetrics(
  metrics: TeamMetrics,
  context: { teamName: string; dateRange: string }
): MetricsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Completed assignments can't exceed total assignments
  if (metrics.completedAssignments > metrics.totalAssignments) {
    errors.push(
      `Completed (${metrics.completedAssignments}) exceeds total (${metrics.totalAssignments})`
    );
  }

  // Rule 2: Assigned workers can't exceed worker count
  if (metrics.assignedWorkers > metrics.workerCount) {
    errors.push(
      `Assigned workers (${metrics.assignedWorkers}) exceeds total workers (${metrics.workerCount})`
    );
  }

  // Rule 3: On-time + Late should not exceed Completed
  if (metrics.onTimeSubmissions !== undefined && metrics.lateSubmissions !== undefined) {
    const submissionSum = metrics.onTimeSubmissions + metrics.lateSubmissions;
    if (submissionSum > metrics.completedAssignments) {
      errors.push(
        `Submission sum (${submissionSum}) exceeds completed (${metrics.completedAssignments})`
      );
    }
  }

  // Rule 4: Compliance rate should be 0-100
  if (metrics.complianceRate < 0 || metrics.complianceRate > 100) {
    errors.push(
      `Compliance rate (${metrics.complianceRate}%) is out of valid range (0-100)`
    );
  }

  // Warning 1: Very low assignment count might indicate data issue
  if (metrics.totalAssignments === 0 && metrics.workerCount > 0) {
    warnings.push(
      `No assignments found for ${metrics.workerCount} workers in ${context.dateRange}`
    );
  }

  // Warning 2: 100% compliance might need verification
  if (metrics.complianceRate === 100 && metrics.totalAssignments > 10) {
    warnings.push(
      `Perfect 100% compliance with ${metrics.totalAssignments} assignments - please verify`
    );
  }

  // Warning 3: Very low compliance might need attention
  if (metrics.complianceRate < 20 && metrics.totalAssignments > 0) {
    warnings.push(
      `Low compliance rate (${metrics.complianceRate}%) detected - needs attention`
    );
  }

  // Log results if there are issues
  if (errors.length > 0 || warnings.length > 0) {
    console.warn(`⚠️ Validation issues for ${context.teamName}:`, {
      dateRange: context.dateRange,
      metrics,
      errors,
      warnings
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate date range parameters
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): MetricsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Dates must be in YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate)) {
    errors.push(`Invalid start date format: ${startDate}. Expected YYYY-MM-DD`);
  }
  if (!dateRegex.test(endDate)) {
    errors.push(`Invalid end date format: ${endDate}. Expected YYYY-MM-DD`);
  }

  // Rule 2: End date must be >= start date
  if (startDate && endDate && endDate < startDate) {
    errors.push(`End date (${endDate}) is before start date (${startDate})`);
  }

  // Rule 3: Date range should not be in the future
  const today = new Date().toISOString().split('T')[0];
  if (startDate > today) {
    warnings.push(`Start date (${startDate}) is in the future`);
  }

  // Warning: Very large date ranges might be slow
  if (startDate && endDate) {
    const daysDiff = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 90) {
      warnings.push(
        `Large date range (${daysDiff} days) may result in slow queries. Consider shorter ranges.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize and normalize metrics to ensure valid values
 */
export function sanitizeMetrics(metrics: Partial<TeamMetrics>): TeamMetrics {
  return {
    totalAssignments: Math.max(0, metrics.totalAssignments || 0),
    completedAssignments: Math.max(0, Math.min(
      metrics.completedAssignments || 0,
      metrics.totalAssignments || 0
    )),
    onTimeSubmissions: Math.max(0, metrics.onTimeSubmissions || 0),
    lateSubmissions: Math.max(0, metrics.lateSubmissions || 0),
    overdueAssignments: Math.max(0, metrics.overdueAssignments || 0),
    assignedWorkers: Math.max(0, Math.min(
      metrics.assignedWorkers || 0,
      metrics.workerCount || 0
    )),
    workerCount: Math.max(0, metrics.workerCount || 0),
    complianceRate: Math.max(0, Math.min(100, metrics.complianceRate || 0))
  };
}


