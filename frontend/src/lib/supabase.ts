import { createClient } from '@supabase/supabase-js';
import { cookieStorage } from './cookieStorage';

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDQ3MTgsImV4cCI6MjA3NDcyMDcxOH0.n557fWuqr8-e900nNhWOfeJTzdnhSzsv5tBW2pNM4gw';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

// Auth client with anon key for auth operations using cookie storage
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
    storageKey: 'supabase.auth.token'
  }
});

// Data client with service role key for data operations
export const dataClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    }
  }
});

// Default export for backward compatibility - use authClient
export const supabase = authClient;

// Database type definitions
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          role: string;
          team?: string;
          team_leader_id?: string;
          default_team?: string;
          managed_teams?: string[];
          phone?: string;
          address?: any;
          emergency_contact?: any;
          medical_info?: any;
          profile_image_url?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          first_name: string;
          last_name: string;
          email: string;
          role: string;
          team?: string;
          team_leader_id?: string;
          default_team?: string;
          managed_teams?: string[];
          phone?: string;
          address?: any;
          emergency_contact?: any;
          medical_info?: any;
          profile_image_url?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          email?: string;
          role?: string;
          team?: string;
          team_leader_id?: string;
          default_team?: string;
          managed_teams?: string[];
          phone?: string;
          address?: any;
          emergency_contact?: any;
          medical_info?: any;
          profile_image_url?: string;
        };
      };
      cases: {
        Row: {
          id: string;
          case_number: string;
          worker_id: string;
          employer_id: string;
          case_manager_id: string;
          clinician_id?: string;
          incident_id: string;
          status: string;
          priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          case_number?: string;
          worker_id: string;
          employer_id: string;
          case_manager_id: string;
          clinician_id?: string;
          incident_id: string;
          status?: string;
          priority?: string;
        };
        Update: {
          status?: string;
          priority?: string;
          clinician_id?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          incident_number?: string;
          reported_by_id: string;
          worker_id: string;
          employer_id: string;
          incident_date: string;
          report_date: string;
          incident_type: string;
          severity: string;
          description: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          incident_number?: string;
          reported_by_id: string;
          worker_id: string;
          employer_id: string;
          incident_date: string;
          incident_type: string;
          severity: string;
          description: string;
          status?: string;
        };
        Update: {
          status?: string;
          investigation_notes?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          sender_id: string;
          type: string;
          title: string;
          message: string;
          priority: string;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          recipient_id: string;
          sender_id: string;
          type: string;
          title: string;
          message: string;
          priority?: string;
        };
        Update: {
          is_read?: boolean;
          read_at?: string;
        };
      };
      work_readiness: {
        Row: {
          id: string;
          worker_id: string;
          team_leader_id: string;
          team: string;
          fatigue_level: number;
          pain_discomfort: string;
          pain_areas?: string[];
          readiness_level: string;
          mood: string;
          notes?: string;
          submitted_at: string;
          status: string;
          reviewed_by_id?: string;
          reviewed_at?: string;
          follow_up_reason?: string;
          follow_up_notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          worker_id: string;
          team_leader_id: string;
          team: string;
          fatigue_level: number;
          pain_discomfort: string;
          pain_areas?: string[];
          readiness_level: string;
          mood: string;
          notes?: string;
          submitted_at?: string;
          status?: string;
        };
        Update: {
          status?: string;
          reviewed_by_id?: string;
          reviewed_at?: string;
          follow_up_reason?: string;
          follow_up_notes?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          worker_id: string;
          case_id: string;
          clinician_id: string;
          activity_type: string;
          title: string;
          description: string;
          priority: string;
          status: string;
          is_reviewed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          worker_id: string;
          case_id: string;
          clinician_id: string;
          activity_type: string;
          title: string;
          description: string;
          priority?: string;
          status?: string;
        };
        Update: {
          is_reviewed?: boolean;
          reviewed_at?: string;
          clinician_notes?: string;
        };
      };
    };
  };
}

// Helper functions for common operations
export const supabaseHelpers = {
  // Storage helpers
  async uploadProfileImage(userId: string, imageFile: File, fileName?: string): Promise<string> {
    try {
      const fileExtension = imageFile.name.split('.').pop();
      const filePath = `profile-images/${userId}/profile.${fileExtension}`;
      
      // First try to upload file to Supabase Storage
      // Upload file to Supabase Storage with proper CORS settings
      console.log('📸 Uploading to physio bucket:', filePath);
      console.log('📸 File details:', {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      });
      
      const { data, error } = await dataClient.storage
        .from('physio')
        .upload(filePath, imageFile, {
          cacheControl: 'max-age=300', // 5 minutes cache for profile images
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        
        // If bucket doesn't exist, create it using REST API
        if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
          console.log('Creating physio bucket with anonymous access...');
          
          // Create bucket using REST API
          const createBucketResponse = await fetch('https://dtcgzgbxhefwhqpeotrl.supabase.co/rest/v1/storage/v1/bucket', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: 'physio',
              name: 'physio',
              public: true,
              file_size_limit: 5242880,
              allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            })
          });
          
          console.log('Bucket creation response:', createBucketResponse.status);
          
          // Retry upload after creating bucket
          const { data: retryData, error: retryError } = await dataClient.storage
            .from('physio')
            .upload(filePath, imageFile, {
              cacheControl: 'max-age=300', // 5 minutes cache for profile images
              upsert: true
            });
            
          if (retryError) {
            console.error('Error uploading after bucket creation:', retryError);
            throw retryError;
          }
          
          console.log('Upload successful after bucket creation');
        } else {
          throw error;
        }
      }

      // Get public URL - ensure it's accessible anonymously
      const { data: { publicUrl } } = dataClient.storage
        .from('physio')
        .getPublicUrl(filePath);

      console.log('✅ Profile image uploaded successfully!');
      console.log('🔗 Raw URL:', publicUrl);
      
      // Verify the URL format is correct for anonymous access
      const verifiedUrl = publicUrl.includes('supabase') ? publicUrl : 
        `https://dtcgzgbxhefwhqpeotrl.supabase.co/storage/v1/object/public/physio/${filePath}`;
      
      console.log('🔗 Verified public URL for anonymous access:', verifiedUrl);
      console.log('🌍 URL format check:', verifiedUrl.includes('/public/') ? '✅ Correct' : '❌ Missing /public/');
      
      return verifiedUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      
      // Fallback: Convert image to base64 and store in database
      console.log('Attempting fallback: storing as base64...');
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          console.log('Stored as base64 fallback');
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(imageFile);
      });
    }
  },
  
  async deleteProfileImage(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split('/');
      const fileName = pathSegments[pathSegments.length - 1];
      const userId = pathSegments[pathSegments.length - 2];
      const filePath = `profile-images/${userId}/${fileName}`;
      
      const { error } = await dataClient.storage
        .from('physio')
        .remove([filePath]);
        
      if (error) {
        console.error('Error deleting profile image:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw error;
    }
  },
  // Users
  async getCurrentUser() {
    try {
      console.log('getCurrentUser: Starting...');
      
      // Get current session from auth client
      const { data: { session }, error: sessionError } = await authClient.auth.getSession();
      
      if (sessionError) {
        console.error('getCurrentUser: Error getting session:', sessionError);
        throw sessionError;
      }
      
      if (!session?.user) {
        console.log('getCurrentUser: No authenticated user');
        return null;
      }

      console.log('getCurrentUser: User found in session:', session.user.id);
      
      // Use data client with service role to fetch profile
      const { data, error } = await dataClient
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('getCurrentUser: Supabase query error:', error);
        console.error('getCurrentUser: Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('getCurrentUser: User profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('getCurrentUser: Unexpected error:', error);
      throw error;
    }
  },

  async updateUserProfile(userId: string, updates: any) {
    console.log('updateUserProfile:', { userId, updates });
    
    // Use data client for direct database access
    const { data, error } = await dataClient
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
    
    console.log('Profile updated successfully:', data);
    return data;
  },

  // Cases
  async getCases(filters: any = {}, options: any = {}) {
    let query = supabase
      .from('cases')
      .select(`
        *,
        worker:users!cases_worker_id_fkey(*),
        employer:users!cases_employer_id_fkey(*),
        case_manager:users!cases_case_manager_id_fkey(*),
        clinician:users!cases_clinician_id_fkey(*),
        incident:incidents(*)
      `);

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending !== false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Notifications
  async getNotifications(userId: string, options: any = {}) {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        sender:users!notifications_sender_id_fkey(*)
      `)
      .eq('recipient_id', userId);

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Work Readiness
  async getWorkReadiness(filters: any = {}, options: any = {}) {
    let query = supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(*),
        team_leader:users!work_readiness_team_leader_id_fkey(*)
      `);

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    query = query.order('submitted_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Activity Logs
  async getActivityLogs(filters: any = {}, options: any = {}) {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        worker:users!activity_logs_worker_id_fkey(*),
        clinician:users!activity_logs_clinician_id_fkey(*),
        case:cases(*)
      `);

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// Real-time subscriptions
export const realtime = {
  // Subscribe to notifications for a user
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to case updates
  subscribeToCaseUpdates(caseId: string, callback: (payload: any) => void) {
    return supabase
      .channel('case_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `id=eq.${caseId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to work readiness updates
  subscribeToWorkReadiness(teamLeaderId: string, callback: (payload: any) => void) {
    return supabase
      .channel('work_readiness')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_readiness',
          filter: `team_leader_id=eq.${teamLeaderId}`
        },
        callback
      )
      .subscribe();
  }
};

export default supabase;
