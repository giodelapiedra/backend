// utils/teamRatingCalculator.ts
export interface TeamRatingMetrics {
  completionRate: number;
  onTimeRate: number;
  overdueSubmissions: number;
  totalAssignments: number;
  notStartedAssignments: number;
}

export interface TeamRatingResult {
  grade: string;
  score: number;
  color: string;
  description: string;
  breakdown: {
    completionScore: number;
    onTimeScore: number;
    latePenalty: number;
    volumeBonus: number;
    improvementBonus: number;
    gracePeriodBonus: number;
    fairCalculation: {
      decidedAssignments: number;
      fairCompletionRate: number;
      fairOnTimeRate: number;
      lateRate: number;
    };
  };
}

export const calculateTeamRating = (metrics: TeamRatingMetrics): TeamRatingResult => {
  const { completionRate, onTimeRate, overdueSubmissions, totalAssignments, notStartedAssignments } = metrics;
  
  // FAIR CALCULATION: Only count assignments that have been decided
  const decidedAssignments = totalAssignments - notStartedAssignments;
  const lateRate = decidedAssignments > 0 ? (overdueSubmissions / decidedAssignments) * 100 : 0;
  
  // Base score calculation
  let score = 0;
  
  // FAIR Completion Rate (35% weight)
  const fairCompletionRate = decidedAssignments > 0 ? 
    ((totalAssignments - notStartedAssignments - overdueSubmissions) / decidedAssignments) * 100 : 0;
  
  if (fairCompletionRate >= 95) score += 35;
  else if (fairCompletionRate >= 90) score += 32;
  else if (fairCompletionRate >= 85) score += 28;
  else if (fairCompletionRate >= 80) score += 25;
  else if (fairCompletionRate >= 75) score += 21;
  else if (fairCompletionRate >= 70) score += 18;
  else if (fairCompletionRate >= 60) score += 14;
  else if (fairCompletionRate >= 50) score += 10;
  else if (fairCompletionRate >= 40) score += 7;
  else if (fairCompletionRate >= 30) score += 4;
  else if (fairCompletionRate >= 20) score += 2;
  else score += 0;
  
  // FAIR On-Time Rate (25% weight)
  const fairOnTimeRate = decidedAssignments > 0 ? 
    ((totalAssignments - notStartedAssignments - overdueSubmissions) / decidedAssignments) * 100 : 0;
  
  if (fairOnTimeRate >= 95) score += 25;
  else if (fairOnTimeRate >= 90) score += 22;
  else if (fairOnTimeRate >= 85) score += 19;
  else if (fairOnTimeRate >= 80) score += 16;
  else if (fairOnTimeRate >= 75) score += 13;
  else if (fairOnTimeRate >= 70) score += 10;
  else if (fairOnTimeRate >= 60) score += 8;
  else if (fairOnTimeRate >= 50) score += 6;
  else if (fairOnTimeRate >= 40) score += 4;
  else if (fairOnTimeRate >= 30) score += 2;
  else if (fairOnTimeRate >= 20) score += 1;
  else score += 0;
  
  // Late Rate Penalty (15% weight)
  if (lateRate <= 5) score += 15;
  else if (lateRate <= 10) score += 12;
  else if (lateRate <= 15) score += 9;
  else if (lateRate <= 20) score += 6;
  else if (lateRate <= 30) score += 3;
  else if (lateRate <= 40) score += 0;
  else score -= 5;
  
  // Volume Bonus (10% weight)
  if (totalAssignments >= 100) score += 10;
  else if (totalAssignments >= 80) score += 8;
  else if (totalAssignments >= 60) score += 6;
  else if (totalAssignments >= 40) score += 4;
  else if (totalAssignments >= 20) score += 2;
  else score += 0;
  
  // Improvement Bonus (10% weight)
  let improvementBonus = 0;
  if (fairCompletionRate >= 80 && fairOnTimeRate >= 70) {
    improvementBonus = 10;
  } else if (fairCompletionRate >= 60 && fairOnTimeRate >= 50) {
    improvementBonus = 7;
  } else if (fairCompletionRate >= 40 && fairOnTimeRate >= 30) {
    improvementBonus = 4;
  } else if (fairCompletionRate >= 20 && fairOnTimeRate >= 15) {
    improvementBonus = 2;
  }
  score += improvementBonus;
  
  // Grace Period Bonus (5% weight)
  let gracePeriodBonus = 0;
  if (totalAssignments < 50) {
    gracePeriodBonus = 5;
  }
  score += gracePeriodBonus;
  
  // Determine letter grade
  let grade = '';
  let color = '';
  let description = '';
  
  if (score >= 95) { grade = 'A+'; color = '#10b981'; description = 'Outstanding Performance'; }
  else if (score >= 90) { grade = 'A'; color = '#10b981'; description = 'Excellent Performance'; }
  else if (score >= 85) { grade = 'A-'; color = '#10b981'; description = 'Very Good Performance'; }
  else if (score >= 80) { grade = 'B+'; color = '#3b82f6'; description = 'Good Performance'; }
  else if (score >= 75) { grade = 'B'; color = '#3b82f6'; description = 'Above Average Performance'; }
  else if (score >= 70) { grade = 'B-'; color = '#3b82f6'; description = 'Average Performance'; }
  else if (score >= 65) { grade = 'C+'; color = '#f59e0b'; description = 'Below Average Performance'; }
  else if (score >= 60) { grade = 'C'; color = '#f59e0b'; description = 'Needs Improvement'; }
  else if (score >= 55) { grade = 'C-'; color = '#f59e0b'; description = 'Poor Performance'; }
  else if (score >= 50) { grade = 'D'; color = '#ef4444'; description = 'Very Poor Performance'; }
  else { grade = 'F'; color = '#ef4444'; description = 'Critical Performance Issues'; }
  
  return {
    grade,
    score: Math.max(0, Math.min(100, score)),
    color,
    description,
    breakdown: {
      completionScore: Math.min(35, (fairCompletionRate / 100) * 35),
      onTimeScore: Math.min(25, (fairOnTimeRate / 100) * 25),
      latePenalty: Math.max(-5, 15 - (lateRate / 100) * 15),
      volumeBonus: Math.min(10, (totalAssignments / 100) * 10),
      improvementBonus,
      gracePeriodBonus,
      fairCalculation: {
        decidedAssignments,
        fairCompletionRate,
        fairOnTimeRate,
        lateRate
      }
    }
  };
};
