// Service to check clinician assignment for workers
import { dataClient } from '../lib/supabase';

export interface ClinicianAssignmentStatus {
  hasAssignedClinician: boolean;
  clinicianName?: string;
  caseId?: string;
  caseNumber?: string;
}

export class WorkerClinicianService {
  /**
   * Check if a worker has an assigned clinician for their active case
   */
  static async getClinicianAssignmentStatus(workerId: string): Promise<ClinicianAssignmentStatus> {
    try {
      console.log('🔍 Checking clinician assignment for worker:', workerId);
      
      // Get the worker's active case with clinician information
      const { data: caseData, error: caseError } = await dataClient
        .from('cases')
        .select(`
          id,
          case_number,
          status,
          clinician_id,
          clinician:users!cases_clinician_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('worker_id', workerId)
        .in('status', ['triaged', 'assessed', 'in_rehab', 'new'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (caseError) {
        console.error('❌ Error fetching case data:', caseError);
        return {
          hasAssignedClinician: false
        };
      }

      if (!caseData) {
        console.log('ℹ️ No active case found for worker');
        return {
          hasAssignedClinician: false
        };
      }

      // Check if clinician is assigned
      const hasAssignedClinician = caseData.clinician_id !== null && caseData.clinician !== null;
      
      if (hasAssignedClinician) {
        // Handle case where clinician might be an array or single object
        const clinician = Array.isArray(caseData.clinician) ? caseData.clinician[0] : caseData.clinician;
        const clinicianName = `${clinician?.first_name || ''} ${clinician?.last_name || ''}`.trim();
        console.log('✅ Worker has assigned clinician:', clinicianName);
        
        return {
          hasAssignedClinician: true,
          clinicianName,
          caseId: caseData.id,
          caseNumber: caseData.case_number
        };
      } else {
        console.log('⚠️ Worker has case but no assigned clinician');
        return {
          hasAssignedClinician: false,
          caseId: caseData.id,
          caseNumber: caseData.case_number
        };
      }
    } catch (error) {
      console.error('Failed to check clinician assignment:', error);
      return {
        hasAssignedClinician: false
      };
    }
  }

  /**
   * Check if worker has an active rehabilitation plan
   */
  static async hasActiveRehabilitationPlan(workerId: string): Promise<boolean> {
    try {
      const { data: planData, error: planError } = await dataClient
        .from('rehabilitation_plans')
        .select('id, status')
        .eq('worker_id', workerId)
        .in('status', ['active', 'paused'])
        .limit(1);

      if (planError) {
        console.error('❌ Error checking rehabilitation plan:', planError);
        return false;
      }

      return planData && planData.length > 0;
    } catch (error) {
      console.error('Failed to check rehabilitation plan:', error);
      return false;
    }
  }
}
