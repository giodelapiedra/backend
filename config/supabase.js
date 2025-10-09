const { createClient } = require('@supabase/supabase-js');

// ✅ SECURITY FIX: Load configuration from environment variables only
// NO FALLBACK VALUES - Fail fast if configuration is missing
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration - Exit immediately if missing
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL: Missing required Supabase configuration!');
  console.error('');
  console.error('Required environment variables:');
  console.error('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.error('');
  console.error('Please add these to your .env file:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_KEY=your-service-role-key');
  console.error('');
  console.error('⚠️  NEVER commit service role keys to version control!');
  process.exit(1);
}

console.log('✅ Supabase configuration loaded successfully');
console.log('📍 Supabase URL:', supabaseUrl);

// Create Supabase client for backend operations (service role)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database helper functions
const db = {
  // Users
  users: {
    async findById(id) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByEmail(email) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async create(userData) {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('users').select('*');
      
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

    async count(filters = {}) {
      let query = supabase.from('users').select('*', { count: 'exact', head: true });
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          query = query.eq(key, filters[key]);
        }
      });
      
      const { count, error } = await query;
      if (error) throw error;
      return count;
    }
  },

  // Cases
  cases: {
    async findById(id) {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          worker:users!cases_worker_id_fkey(*),
          employer:users!cases_employer_id_fkey(*),
          case_manager:users!cases_case_manager_id_fkey(*),
          clinician:users!cases_clinician_id_fkey(*),
          incident:incidents(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async create(caseData) {
      const { data, error } = await supabase
        .from('cases')
        .insert([caseData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('cases').select(`
        *,
        worker:users!cases_worker_id_fkey(*),
        employer:users!cases_employer_id_fkey(*),
        case_manager:users!cases_case_manager_id_fkey(*),
        clinician:users!cases_clinician_id_fkey(*),
        incident:incidents(*)
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
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  },

  // Incidents
  incidents: {
    async findById(id) {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          reported_by:users!incidents_reported_by_id_fkey(*),
          worker:users!incidents_worker_id_fkey(*),
          employer:users!incidents_employer_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async create(incidentData) {
      const { data, error } = await supabase
        .from('incidents')
        .insert([incidentData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Notifications
  notifications: {
    async create(notificationData) {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('notifications').select(`
        *,
        sender:users!notifications_sender_id_fkey(*)
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
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async markAsRead(id) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Work Readiness
  work_readiness: {
    async create(workReadinessData) {
      const { data, error } = await supabase
        .from('work_readiness')
        .insert([workReadinessData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('work_readiness').select(`
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
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  },

  // Activity Logs
  activity_logs: {
    async create(activityLogData) {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert([activityLogData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('activity_logs').select(`
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
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  },

  // Authentication Logs
  authentication_logs: {
    async create(authLogData) {
      const { data, error } = await supabase
        .from('authentication_logs')
        .insert([authLogData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('authentication_logs').select(`
        *,
        user:users!authentication_logs_user_id_fkey(*)
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
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async getRecentLogins(limit = 50) {
      const { data, error } = await supabase
        .from('authentication_logs')
        .select(`
          *,
          user:users!authentication_logs_user_id_fkey(*)
        `)
        .eq('action', 'login')
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },

    async getUserActivitySummary(userId, days = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('authentication_logs')
        .select('action, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  },

  // Audit Logs
  audit_logs: {
    async create(auditLogData) {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([auditLogData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findMany(filters = {}, options = {}) {
      let query = supabase.from('audit_logs').select('*');
      
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
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  }
};

module.exports = { supabase, db };
