/**
 * KPI Calculation Utilities
 * Centralized KPI calculation functions with proper logging
 */

const logger = require('./logger');

/**
 * Log KPI calculation details
 * @param {string} operation - Operation name
 * @param {object} data - Calculation data
 * @param {object} result - Calculation result
 */
const logKPICalculation = (operation, data, result) => {
  logger.logBusiness('KPI Calculation', {
    operation,
    input: data,
    result: {
      rating: result.rating,
      score: result.score,
      color: result.color
    }
  });
};

/**
 * Calculate KPI score based on consecutive days completed in cycle
 * @param {number} consecutiveDays - Number of consecutive days completed (0-7)
 * @returns {object} KPI score and rating
 */
const calculateKPI = (consecutiveDays) => {
  let rating, color, description, score;
  
  if (consecutiveDays >= 7) {
    rating = 'Excellent';
    color = '#10b981';
    description = 'Outstanding! Complete 7-day cycle achieved.';
    score = 100;
  } else if (consecutiveDays >= 5) {
    rating = 'Good';
    color = '#22c55e';
    description = 'Good progress! Keep going to complete the cycle.';
    score = Math.round((consecutiveDays / 7) * 100);
  } else if (consecutiveDays >= 3) {
    rating = 'Average';
    color = '#eab308';
    description = 'Average progress. Focus on consistency.';
    score = Math.round((consecutiveDays / 7) * 100);
  } else {
    rating = 'No KPI Points';
    color = '#ef4444';
    description = 'Need at least 3 consecutive days for KPI points.';
    score = 0;
  }

  const result = {
    rating,
    color,
    description,
    score: score,
    consecutiveDays: consecutiveDays,
    maxDays: 7
  };

  logKPICalculation('Consecutive Days KPI', { consecutiveDays }, result);
  return result;
};

/**
 * Calculate KPI score based on assignment completion rate
 * @param {number} completedAssignments - Number of completed assignments
 * @param {number} totalAssignments - Total number of assignments given
 * @param {number} onTimeSubmissions - Number of on-time submissions
 * @param {number} qualityScore - Average quality score (0-100)
 * @param {number} pendingAssignments - Number of pending assignments with future due dates (optional)
 * @param {number} overdueAssignments - Number of overdue assignments (optional)
 * @returns {object} KPI score and rating
 */
const calculateAssignmentKPI = (completedAssignments, totalAssignments, onTimeSubmissions = 0, qualityScore = 0, pendingAssignments = 0, overdueAssignments = 0, overdueAssignmentsWithDates = [], lateSubmissions = []) => {
  // Input validation
  if (typeof completedAssignments !== 'number' || typeof totalAssignments !== 'number') {
    logger.error('Invalid input types for KPI calculation', {
      completedAssignments: typeof completedAssignments,
      totalAssignments: typeof totalAssignments
    });
    return {
      rating: 'Error',
      color: '#ef4444',
      description: 'Invalid data for KPI calculation',
      score: 0,
      completionRate: 0,
      onTimeRate: 0,
      qualityScore: 0,
      completedAssignments: 0,
      totalAssignments: 0
    };
  }
  
  // Handle edge cases
  if (totalAssignments === 0) {
    return {
      rating: 'No Assignments',
      color: '#6b7280',
      description: 'No work readiness assignments given yet.',
      score: 0,
      completionRate: 0,
      onTimeRate: 0,
      qualityScore: 0,
      completedAssignments: 0,
      totalAssignments: 0
    };
  }
  
  // Calculate rates with late submission penalties
  const completionRate = Math.max(0, Math.min(100, (completedAssignments / totalAssignments) * 100));
  
  // Calculate on-time rate with late submission penalties
  // Late submissions should reduce the on-time rate proportionally
  let onTimeRate = Math.max(0, Math.min(100, (onTimeSubmissions / totalAssignments) * 100));
  
  // Apply late submission penalty to on-time rate (reduce by percentage of late submissions)
  if (lateSubmissions && lateSubmissions.length > 0) {
    const latePenaltyRate = (lateSubmissions.length / totalAssignments) * 50; // 50% penalty per late submission
    onTimeRate = Math.max(0, onTimeRate - latePenaltyRate);
  }
  
  // Calculate quality score with late submission penalties
  let validatedQualityScore = Math.max(0, Math.min(100, qualityScore));
  
  // Apply late submission penalty to quality score
  if (lateSubmissions && lateSubmissions.length > 0) {
    const latePenaltyQuality = (lateSubmissions.length / totalAssignments) * 20; // 20% penalty per late submission
    validatedQualityScore = Math.max(0, validatedQualityScore - latePenaltyQuality);
  }
  
  // Calculate weighted score with bonuses and penalties
  const pendingBonus = Math.min(5, (pendingAssignments / totalAssignments) * 5); // Max 5% bonus for pending
  
  // IMPROVED: Shift-based overdue penalty calculation
  let overduePenalty = 0;
  if (overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0) {
    const now = new Date();
    let totalPenalty = 0;
    
    overdueAssignmentsWithDates.forEach(assignment => {
      const dueTime = new Date(assignment.due_time);
      const overdueDate = new Date(assignment.overdue_date || assignment.updated_at);
      
      // Calculate how many shifts have passed since due time
      const hoursOverdue = Math.floor((now - dueTime) / (1000 * 60 * 60));
      const shiftsOverdue = Math.floor(hoursOverdue / 8); // Assuming 8-hour shifts
      
      let penaltyMultiplier = 1.0; // Full penalty for recent overdue
      
      // Shift-based decay: Reduce penalty based on shifts passed
      if (shiftsOverdue > 30) { // More than 30 shifts (10 days)
        penaltyMultiplier = 0.1; // 90% reduction for very old overdue
      } else if (shiftsOverdue > 10) { // More than 10 shifts (3-4 days)
        penaltyMultiplier = 0.3; // 70% reduction for old overdue
      } else if (shiftsOverdue > 3) { // More than 3 shifts (1 day)
        penaltyMultiplier = 0.6; // 40% reduction for moderately old overdue
      }
      
      totalPenalty += penaltyMultiplier;
    });
    
    overduePenalty = Math.min(10, (totalPenalty / totalAssignments) * 10);
  } else {
    // Fallback to old calculation if no dates provided
    overduePenalty = Math.min(10, (overdueAssignments / totalAssignments) * 10);
  }
  
  // IMPROVED: Recovery bonus based on recent assignment completion
  let recoveryBonus = 0;
  if (completedAssignments > 0) {
    // Calculate recent completion rate (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    // Count recent completed assignments (last 7 days)
    let recentCompletions = 0;
    if (overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0) {
      // Count completed assignments from the last 7 days
      recentCompletions = overdueAssignmentsWithDates.filter(assignment => {
        if (assignment.status === 'completed' && assignment.completed_at) {
          const completedDate = new Date(assignment.completed_at);
          return completedDate >= sevenDaysAgo;
        }
        return false;
      }).length;
    }
    
    // Calculate recent completion rate
    const recentCompletionRate = totalAssignments > 0 ? (recentCompletions / totalAssignments) * 100 : 0;
    
    // Recovery bonus for recent good performance
    if (recentCompletionRate > 80) {
      recoveryBonus = 3; // 3% bonus for excellent recent performance
    } else if (recentCompletionRate > 60) {
      recoveryBonus = 2; // 2% bonus for good recent performance
    } else if (recentCompletionRate > 40) {
      recoveryBonus = 1; // 1% bonus for improving performance
    }
  }
  
  // Calculate late rate for weighted scoring
  const lateRate = lateSubmissions && lateSubmissions.length > 0 
    ? Math.max(0, Math.min(100, (lateSubmissions.length / totalAssignments) * 100))
    : 0;
  
  // Updated weighted score formula with balanced weights:
  // • Completion Rate: 50% weight (positive)
  // • On-Time Rate: 25% weight (positive)
  // • Late Rate: 15% weight (NEGATIVE - penalty for late submissions)
  // • Quality Score: 10% weight (positive)
  // Plus bonuses (pending, recovery) minus penalties (overdue)
  // FIXED: Late rate is now a PENALTY (negative) instead of a bonus (positive)
  const weightedScore = (completionRate * 0.5) + (onTimeRate * 0.25) - (lateRate * 0.15) + (validatedQualityScore * 0.1) + pendingBonus - overduePenalty + recoveryBonus;
  
  // Log detailed calculation
  logger.logBusiness('Assignment KPI Calculation (Balanced Weights with Late Penalty)', {
    totalAssignments,
    completedAssignments,
    completionRate: Math.round(completionRate * 100) / 100,
    onTimeSubmissions,
    onTimeRate: Math.round(onTimeRate * 100) / 100,
    lateRate: Math.round(lateRate * 100) / 100,
    qualityScore: Math.round(validatedQualityScore * 100) / 100,
    pendingAssignments,
    pendingBonus: Math.round(pendingBonus * 100) / 100,
    overdueAssignments,
    overduePenalty: Math.round(overduePenalty * 100) / 100,
    recoveryBonus: Math.round(recoveryBonus * 100) / 100,
    lateSubmissions: lateSubmissions ? lateSubmissions.length : 0,
    latePenaltyApplied: lateSubmissions && lateSubmissions.length > 0,
    weightedScore: Math.round(weightedScore * 100) / 100,
    shiftBasedDecayApplied: overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0,
    weightBreakdown: {
      completionWeight: '50%',
      onTimeWeight: '25%', 
      lateWeight: '15%',
      qualityWeight: '10%'
    }
  });
  
  // Determine rating and letter grade based on weighted score
  let rating, color, description, letterGrade;
  if (weightedScore >= 95) {
    rating = 'Excellent';
    letterGrade = 'A+';
    color = '#10b981';
    description = 'Outstanding performance! Perfect assignment completion and quality.';
  } else if (weightedScore >= 90) {
    rating = 'Excellent';
    letterGrade = 'A';
    color = '#10b981';
    description = 'Excellent performance! Perfect assignment completion and quality.';
  } else if (weightedScore >= 85) {
    rating = 'Very Good';
    letterGrade = 'A-';
    color = '#10b981';
    description = 'Very good performance! Keep up the excellent work.';
  } else if (weightedScore >= 80) {
    rating = 'Good';
    letterGrade = 'B+';
    color = '#3b82f6';
    description = 'Good performance! Keep up the consistency.';
  } else if (weightedScore >= 75) {
    rating = 'Good';
    letterGrade = 'B';
    color = '#3b82f6';
    description = 'Good performance! Keep up the consistency.';
  } else if (weightedScore >= 70) {
    rating = 'Above Average';
    letterGrade = 'B-';
    color = '#3b82f6';
    description = 'Above average performance. Good progress.';
  } else if (weightedScore >= 65) {
    rating = 'Average';
    letterGrade = 'C+';
    color = '#eab308';
    description = 'Average performance. Focus on completing more assignments.';
  } else if (weightedScore >= 60) {
    rating = 'Average';
    letterGrade = 'C';
    color = '#eab308';
    description = 'Average performance. Focus on completing more assignments.';
  } else if (weightedScore >= 55) {
    rating = 'Below Average';
    letterGrade = 'C-';
    color = '#f97316';
    description = 'Below average performance. Needs improvement.';
  } else if (weightedScore >= 50) {
    rating = 'Below Average';
    letterGrade = 'D';
    color = '#f97316';
    description = 'Below average performance. Needs improvement.';
  } else {
    rating = 'Needs Improvement';
    letterGrade = 'F';
    color = '#ef4444';
    description = 'Poor performance. Immediate attention required.';
  }


  const result = {
    rating,
    letterGrade,
    color,
    description,
    score: Math.round(weightedScore),
    completionRate: Math.round(completionRate),
    onTimeRate: Math.round(onTimeRate),
    lateRate: Math.round(lateRate),
    qualityScore: Math.round(validatedQualityScore),
    pendingBonus: Math.round(pendingBonus),
    overduePenalty: Math.round(overduePenalty),
    recoveryBonus: Math.round(recoveryBonus),
    completedAssignments,
    pendingAssignments,
    overdueAssignments,
    totalAssignments,
    lateSubmissions: lateSubmissions ? lateSubmissions.length : 0,
    latePenaltyApplied: lateSubmissions && lateSubmissions.length > 0,
    shiftBasedDecayApplied: overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0,
    weightBreakdown: {
      completionWeight: '50%',
      onTimeWeight: '25%', 
      lateWeight: '15%',
      qualityWeight: '10%'
    }
  };

  logKPICalculation('Assignment KPI', {
    completedAssignments,
    totalAssignments,
    onTimeSubmissions,
    qualityScore,
    pendingAssignments,
    overdueAssignments
  }, result);

  return result;
};

/**
 * Calculate KPI score based on completion rate percentage (Legacy - for backward compatibility)
 * @param {number} completionRate - Completion rate percentage (0-100)
 * @param {number} currentDay - Current day in cycle (optional)
 * @param {number} totalAssessments - Total number of assessments submitted (optional)
 * @returns {object} KPI score and rating
 */
const calculateCompletionRateKPI = (completionRate, currentDay = null, totalAssessments = null) => {
  let rating, color, description, score;
  
  // Check if user hasn't started KPI rating yet
  if (completionRate === 0 && (totalAssessments === 0 || totalAssessments === null)) {
    rating = 'Not Started';
    color = '#6b7280'; // gray
    description = 'KPI rating not yet started. Begin your work readiness assessments.';
    score = 0;
    return { rating, color, description, score, completionRate, maxRate: 100 };
  }
  
  // Special handling for early cycle days
  if (currentDay !== null && currentDay <= 2) {
    // Days 1-2: Neutral rating, no penalty
    rating = 'On Track';
    color = '#3b82f6'; // blue
    description = 'Just started the cycle. Keep going!';
    score = 0; // No KPI points yet
    return { rating, color, description, score, completionRate, maxRate: 100 };
  }
  
  // KPI scoring based on completion rate for days 3+:
  // 100%: Excellent
  // 70-99%: Good  
  // 50-69%: Average
  // Below 50%: Needs Improvement
  
  if (completionRate >= 100) {
    rating = 'Excellent';
    color = '#10b981'; // green
    description = 'Outstanding! Perfect completion rate achieved.';
    score = 100;
  } else if (completionRate >= 70) {
    rating = 'Good';
    color = '#22c55e'; // light green
    description = 'Good progress! Keep up the consistency.';
    score = Math.round(completionRate);
  } else if (completionRate >= 50) {
    rating = 'Average';
    color = '#eab308'; // yellow/orange
    description = 'Average progress. Focus on consistency.';
    score = Math.round(completionRate);
  } else {
    rating = 'Needs Improvement';
    color = '#ef4444'; // red
    description = 'Below average performance. Needs attention.';
    score = Math.round(completionRate);
  }

  const result = {
    rating,
    color,
    description,
    score: score,
    completionRate: completionRate,
    maxRate: 100
  };

  logKPICalculation('Completion Rate KPI', { completionRate, currentDay, totalAssessments }, result);
  return result;
};

/**
 * Calculate weekly team KPI based on submission rate
 * @param {number} weeklySubmissionRate - Weekly submission rate percentage
 * @param {number} weeklySubmissions - Number of weekly submissions
 * @param {number} totalMembers - Total team members
 * @returns {object} Team KPI score and rating
 */
const calculateWeeklyTeamKPI = (weeklySubmissionRate, weeklySubmissions, totalMembers) => {
  let rating, color, description;
  
  if (weeklySubmissionRate >= 90) {
    rating = 'Excellent';
    color = '#10b981'; // green
    description = `Excellent! ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else if (weeklySubmissionRate >= 75) {
    rating = 'Good';
    color = '#3b82f6'; // blue
    description = `Good performance! ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else if (weeklySubmissionRate >= 60) {
    rating = 'Average';
    color = '#f59e0b'; // yellow
    description = `Average performance. ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else if (weeklySubmissionRate >= 40) {
    rating = 'Needs Improvement';
    color = '#ef4444'; // red
    description = `Needs improvement. Only ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else {
    rating = 'Poor';
    color = '#dc2626'; // dark red
    description = `Poor performance. Only ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  }
  
  const result = {
    rating,
    color,
    description,
    score: Math.round(weeklySubmissionRate),
    completionRate: weeklySubmissionRate,
    maxRate: 100,
    weeklySubmissions,
    totalMembers,
    weeklySubmissionRate: Math.round(weeklySubmissionRate)
  };

  logKPICalculation('Weekly Team KPI', { weeklySubmissionRate, weeklySubmissions, totalMembers }, result);
  return result;
};

/**
 * Calculate submission streaks
 * @param {array} assessments - Array of assessments
 * @returns {object} Current and longest streaks
 */
const calculateStreaks = (assessments) => {
  if (!assessments || assessments.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort assessments by date
  const sortedAssessments = assessments
    .map(a => a)
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  // Calculate working days streak (consecutive weekdays)
  sortedAssessments.forEach(assessment => {
    const assessmentDate = new Date(assessment.submitted_at);
    
    // Skip weekends
    if (assessmentDate.getDay() === 0 || assessmentDate.getDay() === 6) {
      return;
    }
    
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor((assessmentDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1; // Start new streak
      }
    }
    
    lastDate = new Date(assessmentDate);
  });

  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate current streak from the end
  let currentStreak = 0;
  const today = new Date();
  const sortedDates = [...new Set(sortedAssessments
    .map(a => new Date(a.submitted_at))
    .filter(d => d.getDay() !== 0 && d.getDay() !== 6) // Only weekdays
    .sort((a, b) => b - a))]; // Sort descending (most recent first)

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      const lastSubmission = sortedDates[i];
      const daysSinceLastSubmission = Math.floor((today - lastSubmission) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSubmission <= 1) {
        currentStreak = 1;
        
        // Continue checking previous days
        let j = 1;
        while (j < sortedDates.length) {
          const currentDate = sortedDates[j - 1];
          const previousDate = sortedDates[j];
          const daysDiff = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            currentStreak++;
            j++;
          } else {
            break;
          }
        }
      }
    }
    break;
  }

  const result = {
    current: currentStreak,
    longest: longestStreak
  };

  logger.logBusiness('Streak Calculation', {
    totalAssessments: assessments.length,
    currentStreak,
    longestStreak
  });

  return result;
};

module.exports = {
  calculateKPI,
  calculateAssignmentKPI,
  calculateCompletionRateKPI,
  calculateWeeklyTeamKPI,
  calculateStreaks,
  logKPICalculation
};
