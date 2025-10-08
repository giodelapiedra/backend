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
}

export const calculateMonthlyMetrics = (assignments: AssignmentData[]): MonthlyMetrics => {
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
  
  return {
    totalAssignments,
    completedAssignments,
    overdueSubmissions,
    notStartedAssignments,
    completionRate,
    onTimeRate,
    averageResponseTime
  };
};
