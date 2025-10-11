// utils/metricsCalculator.ts
export interface AssignmentData {
  id: string;
  assigned_date: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  due_time: string;
  completed_at?: string;
  created_at: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface MonthlyMetrics {
  totalAssignments: number;
  completedAssignments: number;
  overdueSubmissions: number;
  notStartedAssignments: number;
  completionRate: number;
  onTimeRate: number;
  averageResponseTime: number;
  qualityScore: number;
  totalMembers: number;
  teamHealthScore: number;
  highRiskReports: number;
  caseClosures: number;
  onTimeSubmissions: number;
  monthOverMonthChange: {
    completionRate: number;
    onTimeRate: number;
    teamHealth: number;
    responseTime: number;
  };
}

export const calculateMonthlyMetrics = (assignments: AssignmentData[], unselectedWorkers: any[] = []): MonthlyMetrics => {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const overdueSubmissions = assignments.filter(a => a.status === 'overdue').length;
  const notStartedAssignments = assignments.filter(a => a.status === 'pending').length;
  
  // Calculate completion rate
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
  
  // Calculate on-time submissions
  const onTimeSubmissions = assignments.filter(a => {
    if (a.status !== 'completed') return false;
    const assignedDate = new Date(a.assigned_date);
    const completedDate = new Date(a.completed_at || a.created_at);
    return completedDate <= new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000);
  }).length;
  
  // FIXED: On-Time Rate now includes overdue assignments for realistic reporting
  const onTimeRate = totalAssignments > 0 ? (onTimeSubmissions / totalAssignments) * 100 : 0;
  
  // Calculate average response time
  const completedWithTime = assignments.filter(a => a.status === 'completed' && a.completed_at);
  const totalResponseTime = completedWithTime.reduce((total, assignment) => {
    const assignedDate = new Date(assignment.assigned_date);
    const completedDate = new Date(assignment.completed_at!);
    const responseTime = (completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60); // hours
    return total + responseTime;
  }, 0);
  
  const averageResponseTime = completedWithTime.length > 0 ? totalResponseTime / completedWithTime.length : 0;
  
  // Calculate quality score based on completion rate and on-time rate
  const qualityScore = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));
  
  // Get unique team members from assignments
  const uniqueWorkers = new Set(assignments.map(a => a.worker?.id).filter(Boolean));
  const totalMembers = uniqueWorkers.size;
  
  // Calculate team health score based on completion and on-time rates
  const teamHealthScore = Math.round((completionRate * 0.5) + (onTimeRate * 0.3) + (Math.max(0, 100 - (overdueSubmissions / totalAssignments) * 100) * 0.2));
  
  // High risk reports (overdue assignments)
  const highRiskReports = overdueSubmissions;
  
  // Case closures (completed assignments)
  const caseClosures = completedAssignments;
  
  return {
    totalAssignments,
    completedAssignments,
    overdueSubmissions,
    notStartedAssignments,
    completionRate,
    onTimeRate,
    averageResponseTime,
    qualityScore,
    totalMembers,
    teamHealthScore,
    highRiskReports,
    caseClosures,
    onTimeSubmissions,
    monthOverMonthChange: {
      completionRate: 0,
      onTimeRate: 0,
      teamHealth: 0,
      responseTime: 0
    }
  };
};
