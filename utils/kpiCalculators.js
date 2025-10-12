/**
 * KPI Calculators
 * Centralized KPI calculation functions
 */

/**
 * Calculate KPI score based on consecutive days completed in cycle
 * @param {number} consecutiveDays - Number of consecutive days completed (0-7)
 * @returns {object} KPI score and rating
 */
const calculateKPI = (consecutiveDays) => {
  if (consecutiveDays === 0) {
    return {
      rating: 'Not Started',
      score: 0,
      color: '#6b7280',
      description: 'No consecutive days completed yet. Start your work readiness journey!'
    };
  } else if (consecutiveDays === 1) {
    return {
      rating: 'Getting Started',
      score: 20,
      color: '#f59e0b',
      description: 'Great start! Day 1 complete. Keep building momentum!'
    };
  } else if (consecutiveDays === 2) {
    return {
      rating: 'Building Momentum',
      score: 40,
      color: '#f59e0b',
      description: 'Excellent! 2 consecutive days. You\'re building good habits!'
    };
  } else if (consecutiveDays === 3) {
    return {
      rating: 'Good Progress',
      score: 60,
      color: '#3b82f6',
      description: 'Very good! 3 consecutive days. You\'re developing consistency!'
    };
  } else if (consecutiveDays === 4) {
    return {
      rating: 'Strong Performance',
      score: 75,
      color: '#3b82f6',
      description: 'Outstanding! 4 consecutive days. You\'re showing strong commitment!'
    };
  } else if (consecutiveDays === 5) {
    return {
      rating: 'Excellent',
      score: 85,
      color: '#10b981',
      description: 'Fantastic! 5 consecutive days. You\'re almost at the finish line!'
    };
  } else if (consecutiveDays === 6) {
    return {
      rating: 'Outstanding',
      score: 95,
      color: '#10b981',
      description: 'Amazing! 6 consecutive days. One more day to complete your cycle!'
    };
  } else if (consecutiveDays >= 7) {
    return {
      rating: 'Perfect',
      score: 100,
      color: '#10b981',
      description: 'Perfect! 7+ consecutive days completed! You\'ve mastered the work readiness cycle!'
    };
  } else {
    return {
      rating: 'Unknown',
      score: 0,
      color: '#6b7280',
      description: 'Invalid consecutive days count'
    };
  }
};

/**
 * Calculate KPI score based on assignment completion rate
 * @param {number} completedAssignments - Number of completed assignments
 * @param {number} totalAssignments - Total number of assignments given
 * @param {number} onTimeSubmissions - Number of on-time submissions
 * @param {number} qualityScore - Average quality score (0-100)
 * @param {number} pendingAssignments - Number of pending assignments with future due dates (optional)
 * @param {number} overdueAssignments - Number of overdue assignments (optional)
 * @param {Array} overdueAssignmentsWithDates - Array of overdue assignments with dates for shift-based decay (optional)
 * @returns {object} KPI score and rating
 */
const calculateAssignmentKPI = (completedAssignments, totalAssignments, onTimeSubmissions = 0, qualityScore = 0, pendingAssignments = 0, overdueAssignments = 0, overdueAssignmentsWithDates = [], lateSubmissions = []) => {
  // Input validation
  if (totalAssignments === 0) {
    return {
      rating: 'No Assignments',
      letterGrade: 'N/A',
      score: 0,
      color: '#6b7280',
      description: 'No assignments given yet',
      breakdown: {
        completionScore: 0,
        onTimeScore: 0,
        qualityScore: 0,
        pendingBonus: 0,
        overduePenalty: 0,
        recoveryBonus: 0,
        shiftBasedDecayApplied: false
      }
    };
  }

  // Calculate completion rate
  const completionRate = (completedAssignments / totalAssignments) * 100;
  
  // Calculate on-time rate with late submission penalties
  // Late submissions should reduce the on-time rate proportionally
  let onTimeRate = (onTimeSubmissions / totalAssignments) * 100;
  
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
  
  // Calculate pending bonus (max 5%)
  const pendingBonus = Math.min(5, (pendingAssignments / totalAssignments) * 5);
  
  // IMPROVED: Shift-based overdue penalty calculation
  let overduePenalty = 0;
  if (overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0) {
    const now = new Date();
    let totalPenalty = 0;
    
    overdueAssignmentsWithDates.forEach(assignment => {
      const dueTime = new Date(assignment.due_time);
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
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    let recentCompletions = 0;
    if (overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0) {
      recentCompletions = overdueAssignmentsWithDates.filter(assignment => {
        if (assignment.status === 'completed' && assignment.completed_at) {
          const completedDate = new Date(assignment.completed_at);
          return completedDate >= sevenDaysAgo;
        }
        return false;
      }).length;
    }
    
    const recentCompletionRate = totalAssignments > 0 ? (recentCompletions / totalAssignments) * 100 : 0;
    
    if (recentCompletionRate > 80) {
      recoveryBonus = 3; // 3% bonus for excellent recent performance
    } else if (recentCompletionRate > 60) {
      recoveryBonus = 2; // 2% bonus for good recent performance
    } else if (recentCompletionRate > 40) {
      recoveryBonus = 1; // 1% bonus for improving performance
    }
  }
  
  // Calculate weighted score
  // Calculate late rate for weighted scoring
  const lateRate = lateSubmissions && lateSubmissions.length > 0 
    ? Math.max(0, Math.min(100, (lateSubmissions.length / totalAssignments) * 100))
    : 0;
  
  // Updated weighted score formula with balanced weights
  // On-Time Rate: 25% weight, Late Rate: 15% weight, Completion Rate: 50%, Quality: 10%
  const weightedScore = (completionRate * 0.5) + (onTimeRate * 0.25) + (lateRate * 0.15) + (validatedQualityScore * 0.1) + pendingBonus - overduePenalty + recoveryBonus;
  
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


  return {
    rating,
    letterGrade,
    score: Math.max(0, Math.min(100, weightedScore)),
    color,
    description,
    lateRate: lateRate,
    breakdown: {
      completionScore: Math.min(50, (completionRate / 100) * 50),
      onTimeScore: Math.min(25, (onTimeRate / 100) * 25),
      lateScore: Math.min(15, (lateRate / 100) * 15),
      qualityScore: Math.min(10, (validatedQualityScore / 100) * 10),
      pendingBonus: Math.min(5, pendingBonus),
      overduePenalty: Math.min(10, overduePenalty),
      recoveryBonus: Math.min(3, recoveryBonus),
      shiftBasedDecayApplied: overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0
    }
  };
};

/**
 * Calculate KPI score based on completion rate percentage (Legacy - for backward compatibility)
 * @param {number} completionRate - Completion rate percentage (0-100)
 * @param {number} currentDay - Current day in cycle (optional)
 * @param {number} totalAssessments - Total number of assessments submitted (optional)
 * @returns {object} KPI score and rating
 */
const calculateCompletionRateKPI = (completionRate, currentDay = null, totalAssessments = null) => {
  if (completionRate >= 90) {
    return {
      rating: 'Excellent',
      score: Math.round(completionRate),
      color: '#10b981',
      description: `Excellent! ${Math.round(completionRate)}% completion rate achieved!`
    };
  } else if (completionRate >= 75) {
    return {
      rating: 'Good',
      score: Math.round(completionRate),
      color: '#3b82f6',
      description: `Good performance! ${Math.round(completionRate)}% completion rate.`
    };
  } else if (completionRate >= 60) {
    return {
      rating: 'Average',
      score: Math.round(completionRate),
      color: '#f59e0b',
      description: `Average performance. ${Math.round(completionRate)}% completion rate.`
    };
  } else if (completionRate >= 40) {
    return {
      rating: 'Needs Improvement',
      score: Math.round(completionRate),
      color: '#ef4444',
      description: `Needs improvement. ${Math.round(completionRate)}% completion rate.`
    };
  } else {
    return {
      rating: 'Poor',
      score: Math.round(completionRate),
      color: '#dc2626',
      description: `Poor performance. ${Math.round(completionRate)}% completion rate.`
    };
  }
};

/**
 * Calculate weekly team KPI
 * @param {number} weeklySubmissionRate - Weekly submission rate percentage
 * @param {number} weeklySubmissions - Number of weekly submissions
 * @param {number} totalMembers - Total number of team members
 * @returns {object} Team KPI data
 */
const calculateWeeklyTeamKPI = (weeklySubmissionRate, weeklySubmissions, totalMembers) => {
  // Simple percentage-based team rating
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
  
  return {
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
};

/**
 * Calculate streaks from assessments
 * @param {Array} assessments - Array of assessments
 * @returns {object} Streak data
 */
const calculateStreaks = (assessments) => {
  if (!assessments || assessments.length === 0) {
    return { current: 0, longest: 0 };
  }

  const sortedAssessments = assessments.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedAssessments.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedAssessments[i - 1].submitted_at);
      const currDate = new Date(sortedAssessments[i].submitted_at);
      const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);
  currentStreak = tempStreak;

  return { current: currentStreak, longest: longestStreak };
};

module.exports = {
  calculateKPI,
  calculateAssignmentKPI,
  calculateCompletionRateKPI,
  calculateWeeklyTeamKPI,
  calculateStreaks
};
