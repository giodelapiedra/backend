import { dataClient } from '../lib/supabase';
import { NotificationService } from './notificationService';

export interface CaseAssignmentData {
  caseId: string;
  clinicianId: string;
  caseManagerId: string;
  notes?: string;
}

export class CaseAssignmentService {
  /**
   * Assign a case to a clinician and send notification
   */
  static async assignCaseToClinician(assignmentData: CaseAssignmentData) {
    try {
      // Get case details for notification
      const { data: caseData, error: caseError } = await dataClient
        .from('cases')
        .select('*')
        .eq('id', assignmentData.caseId)
        .single();

      if (caseError) {
        console.error('Error fetching case details:', caseError);
        throw caseError;
      }

      const caseNumber = caseData.case_number || `CASE-${caseData.id.slice(-6)}`;
      
      // Get worker details
      const { data: workerData } = await dataClient
        .from('users')
        .select('first_name, last_name')
        .eq('id', caseData.worker_id)
        .single();

      const workerName = workerData 
        ? `${workerData.first_name} ${workerData.last_name}`
        : 'Unknown Worker';

      // Get case manager details
      const { data: caseManagerData } = await dataClient
        .from('users')
        .select('first_name, last_name')
        .eq('id', assignmentData.caseManagerId)
        .single();

      const caseManagerName = caseManagerData 
        ? `${caseManagerData.first_name} ${caseManagerData.last_name}`
        : 'Case Manager';

      // Send notification to the assigned clinician
      await NotificationService.sendCaseAssignmentNotification(
        assignmentData.clinicianId,
        assignmentData.caseManagerId,
        assignmentData.caseId
      );

      // Update case in database with clinician assignment
      console.log('Attempting to update case in database...');
      console.log('Case ID:', assignmentData.caseId);
      console.log('Clinician ID:', assignmentData.clinicianId);
      
      const { data: updatedCase, error: updateError } = await dataClient
        .from('cases')
        .update({ 
          clinician_id: assignmentData.clinicianId,
          priority: 'medium',
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentData.caseId)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Error updating case with clinician assignment:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // Check if it's a column missing error
        if (updateError.code === '42703' || updateError.message.includes('clinician_id')) {
          console.error('🚨 clinician_id column does not exist in cases table!');
          console.error('Please run the migration script: add-clinician-id-column.sql');
        }
        
        throw updateError;
      }

      console.log('✅ Case assigned to clinician in database:', caseNumber);
      console.log('✅ Updated case data:', updatedCase);
      console.log('✅ Notification sent to clinician:', assignmentData.clinicianId);
      
      return caseData;

    } catch (error) {
      console.error('Failed to assign case to clinician:', error);
      throw error;
    }
  }

  /**
   * Get available clinicians for case assignment
   */
  static async getAvailableClinicians() {
    try {
      console.log('Fetching available clinicians...');
      
      const { data: clinicians, error } = await dataClient
        .from('users')
        .select('id, first_name, last_name, email, specialty, is_active')
        .eq('role', 'clinician')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching clinicians:', error);
        throw error;
      }

      console.log('Fetched clinicians:', clinicians);
      console.log('Total clinicians found:', clinicians?.length || 0);
      
      // Check if admin_clinician@test.com is in the list
      const adminClinician = clinicians?.find(c => c.email === 'admin_clinician@test.com');
      if (adminClinician) {
        console.log('✅ admin_clinician@test.com found:', adminClinician);
        console.log('Clinician ID:', adminClinician.id);
      } else {
        console.log('❌ admin_clinician@test.com NOT found in clinicians list');
        console.log('Available clinician emails:', clinicians?.map(c => c.email));
        
        // Check if there are any clinicians at all
        if (clinicians?.length === 0) {
          console.log('🚨 No clinicians found in database!');
          console.log('Please check if users with role="clinician" exist in the users table');
        }
      }

      return clinicians || [];
    } catch (error) {
      console.error('Failed to fetch available clinicians:', error);
      return [];
    }
  }

  /**
   * Get cases that need clinician assignment
   */
  static async getCasesNeedingAssignment(caseManagerId: string) {
    try {
      // Get cases that need clinician assignment (where clinician_id is null)
      const { data: cases, error } = await dataClient
        .from('cases')
        .select(`
          *,
          worker:users!cases_worker_id_fkey(id, first_name, last_name),
          incident:incidents!cases_incident_id_fkey(id, incident_number, description, severity)
        `)
        .eq('case_manager_id', caseManagerId)
        .is('clinician_id', null)
        .in('status', ['new', 'triaged']) // Only new or triaged cases
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases needing assignment:', error);
        throw error;
      }

      console.log('Cases needing assignment:', cases?.length || 0);
      return cases || [];
    } catch (error) {
      console.error('Failed to fetch cases needing assignment:', error);
      return [];
    }
  }

  /**
   * Get cases assigned to a specific clinician
   */
  static async getClinicianCases(clinicianId: string) {
    try {
      console.log('Getting cases for clinician ID:', clinicianId);
      
      // Get cases directly from database where clinician_id matches
      const { data: casesData, error: casesError } = await dataClient
        .from('cases')
        .select(`
          *,
          worker:users!cases_worker_id_fkey(id, first_name, last_name, email),
          case_manager:users!cases_case_manager_id_fkey(id, first_name, last_name, email),
          clinician:users!cases_clinician_id_fkey(id, first_name, last_name, email),
          incident:incidents!cases_incident_id_fkey(id, incident_type, description, severity)
        `)
        .eq('clinician_id', clinicianId)
        .order('created_at', { ascending: false });

      if (casesError) {
        console.error('❌ Error fetching clinician cases:', casesError);
        console.error('Error details:', {
          code: casesError.code,
          message: casesError.message,
          details: casesError.details,
          hint: casesError.hint
        });
        
        // Check if it's a column missing error
        if (casesError.code === '42703' || casesError.message.includes('clinician_id')) {
          console.error('🚨 clinician_id column does not exist in cases table!');
          console.error('Please run the migration script: add-clinician-id-column.sql');
          return [];
        }
        
        throw casesError;
      }

      console.log('✅ CASE ASSIGNMENT SERVICE: Fetched cases for clinician:', casesData?.length || 0);
      console.log('✅ CASE ASSIGNMENT SERVICE: Cases data:', casesData);
      console.log('✅ CASE ASSIGNMENT SERVICE: Clinician ID used:', clinicianId);

      return casesData || [];
    } catch (error) {
      console.error('Failed to fetch clinician cases:', error);
      return [];
    }
  }

  /**
   * Update case status and notify relevant parties
   */
  static async updateCaseStatus(
    caseId: string, 
    newStatus: string, 
    updatedBy: string, 
    notes?: string
  ) {
    try {
      // Update case status
      const { data: updatedCase, error: caseError } = await dataClient
        .from('cases')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .select(`
          *,
          worker:users!cases_worker_id_fkey(id, first_name, last_name),
          case_manager:users!cases_case_manager_id_fkey(id, first_name, last_name),
          clinician:users!cases_clinician_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (caseError) {
        console.error('Error updating case status:', caseError);
        throw caseError;
      }

      // Send notification to case manager about status update
      if (updatedCase.case_manager_id && updatedCase.case_manager_id !== updatedBy) {
        await NotificationService.sendCaseUpdateNotification(
          updatedCase.case_manager_id,
          updatedBy,
          caseId,
          newStatus,
          notes
        );
      }

      // Send notification to worker about status update
      if (updatedCase.worker_id) {
        await NotificationService.sendCaseUpdateNotification(
          updatedCase.worker_id,
          updatedBy,
          caseId,
          newStatus,
          notes
        );
      }

      console.log('Case status updated successfully:', updatedCase);
      return updatedCase;

    } catch (error) {
      console.error('Failed to update case status:', error);
      throw error;
    }
  }

  /**
   * Force refresh clinician data by triggering re-fetch and clearing cache
   */
  static async forceRefreshClinicianData(clinicianId: string) {
    try {
      console.log('🔄 Force refreshing clinician data for:', clinicianId);
      
      // Clear browser cache for clinician
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('🧹 Browser cache cleared for clinician:', cacheNames.length, 'caches');
      }
      
      // Clear localStorage cache
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase') || key.includes('clinician'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage cache
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase') || key.includes('clinician'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Trigger a custom event that clinician components can listen to
      const refreshEvent = new CustomEvent('clinicianDataRefresh', {
        detail: { 
          clinicianId,
          timestamp: Date.now(),
          cacheCleared: true
        }
      });
      window.dispatchEvent(refreshEvent);
      
      console.log('✅ Force refresh completed for clinician:', clinicianId);
    } catch (error) {
      console.error('Error forcing refresh:', error);
    }
  }

  /**
   * Debug method to check if a specific clinician exists
   */
  static async debugClinicianExists(email: string) {
    try {
      console.log(`=== DEBUG: Checking if clinician exists: ${email} ===`);
      
      const { data: clinician, error } = await dataClient
        .from('users')
        .select('id, first_name, last_name, email, role, is_active')
        .eq('email', email)
        .single();

      if (error) {
        console.log('❌ Clinician not found or error:', error);
        return null;
      }

      console.log('✅ Clinician found:', clinician);
      console.log('Role:', clinician.role);
      console.log('Is active:', clinician.is_active);
      console.log('=== END DEBUG ===');
      
      return clinician;
    } catch (error) {
      console.error('Error checking clinician:', error);
      return null;
    }
  }
}
