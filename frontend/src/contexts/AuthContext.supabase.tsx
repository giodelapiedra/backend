import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authClient, dataClient } from '../lib/supabase';

// Authentication logging functions
const logAuthenticationEvent = async (
  userId: string,
  email: string,
  action: 'login' | 'logout',
  success: boolean,
  sessionId?: string | null,
  failureReason?: string
) => {
  try {
    // Get user info for logging
    const { data: userProfile } = await dataClient
      .from('users')
      .select('first_name, last_name, role')
      .eq('id', userId)
      .single();

    const userName = userProfile 
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      : email;
    
    const userRole = userProfile?.role || 'worker';

    // Try the enhanced schema first, fallback to basic schema
    try {
      await dataClient
        .from('authentication_logs')
        .insert({
          user_id: userId,
          user_email: email,
          user_name: userName,
          user_role: userRole,
          action: action,
          ip_address: 'unknown',
          user_agent: navigator.userAgent || 'unknown',
          success: success,
          session_id: sessionId,
          failure_reason: failureReason,
          created_at: new Date().toISOString()
        });
    } catch (schemaError) {
      // Fallback to basic schema (no action, success, created_at fields)
      console.warn('Using basic auth log schema fallback');
      await dataClient
        .from('authentication_logs')
        .insert({
          user_id: userId,
          user_email: email,
          user_name: userName,
          user_role: userRole
        });
    }

    console.log(`✅ Authentication ${action} logged for user: ${email}`);
  } catch (error) {
    console.error(`❌ Failed to log authentication ${action}:`, error);
    throw error;
  }
};

const logFailedAuthenticationEvent = async (email: string, failureReason: string) => {
  try {
    await dataClient
      .from('authentication_logs')
      .insert({
        user_id: null, // User ID unknown for failed login
        user_email: email,
        user_name: email,
        user_role: 'unknown',
        action: 'login',
        ip_address: 'unknown',
        user_agent: navigator.userAgent || 'unknown',
        success: false,
        failure_reason: failureReason,
        created_at: new Date().toISOString()
      });

    console.log(`✅ Failed authentication attempt logged for: ${email}`);
  } catch (error) {
    console.error(`❌ Failed to log failed authentication attempt:`, error);
    throw error;
  }
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  team?: string;
  phone?: string;
  address?: any;
  employer_id?: string;
  is_active: boolean;
  last_login?: string;
  profileImage?: string;
  emergencyContact?: any;
  medicalInfo?: any;
  package?: string;
}

interface AuthContextType {
  user: User | null;
  session: any;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData, profilePhoto?: File | null) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserInContext: (updatedUserData: any) => void;
  loading: boolean;
  error: string | null;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  employer?: string;
  address?: any;
  emergencyContact?: any;
  medicalInfo?: any;
  team?: string;
  defaultTeam?: string;
  managedTeams?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    console.log('🔄 Initializing auth state...');
    let isSubscribed = true;

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await authClient.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error getting initial session:', sessionError);
          if (isSubscribed) {
            setError('Failed to get initial session');
            setLoading(false);
          }
          return;
        }

        console.log('📝 Initial session:', session);
        if (isSubscribed) {
          setSession(session);
        }

        if (session?.user) {
          console.log('✅ Initial user found:', session.user.id);
          if (isSubscribed) {
            await loadUserProfile(session.user.id);
          }
        } else {
          console.log('ℹ️ No initial session');
          if (isSubscribed) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Error during auth initialization:', error);
        if (isSubscribed) {
          setError('Failed to initialize auth');
          setLoading(false);
        }
      }
    };

    // Start auth initialization
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = authClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, session?.user?.id);
      
      if (!isSubscribed) return;
      
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, loading profile...');
        try {
          // Only load profile if we don't already have a user
          if (!user) {
            await loadUserProfile(session.user.id);
          }
        } catch (error) {
          console.error('❌ Failed to load user profile:', error);
          setError('Failed to load user profile');
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setLoading(false);
      } else {
        console.log('ℹ️ Other auth event:', event);
        if (!session?.user) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up auth state...');
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Loading user profile for ID:', userId);
      
      // Skip session check and go directly to profile fetch
      console.log('📝 Fetching user profile directly (bypassing session check)...');
      
      const profilePromise = dataClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      const profileTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout after 5 seconds')), 5000);
      });
      
      const result = await Promise.race([
        profilePromise,
        profileTimeoutPromise
      ]) as any;
      
      const { data: userProfile, error } = result;
      
      if (error) {
        console.error('❌ Error fetching user profile:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setError('Profile fetch error: ' + error.message);
        setLoading(false);
        return;
      }
      
      if (!userProfile) {
        console.error('❌ No user profile found for ID:', userId);
        setError('User profile not found');
        setLoading(false);
        return;
      }
      
      console.log('✅ Raw user profile:', userProfile);
      
      // Transform snake_case to camelCase for frontend compatibility
      const transformedUser: User = {
        id: userProfile.id,
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || '',
        role: userProfile.role || '',
        team: userProfile.team || '',
        phone: userProfile.phone || '',
        address: userProfile.address || {},
        employer_id: userProfile.employer_id || '',
        is_active: userProfile.is_active || false,
        last_login: userProfile.last_login || '',
        profileImage: userProfile.profile_image_url || '',
        emergencyContact: userProfile.emergency_contact || {},
        medicalInfo: userProfile.medical_info || {},
        package: userProfile.package || ''
      };
      
      console.log('✅ Transformed user:', transformedUser);
      
      // Set user and navigate
      setUser(transformedUser);
      setLoading(false);
      
      // Log success
      console.log('✅ Profile loaded successfully, redirecting to dashboard...');
      
    } catch (error: any) {
      console.error('❌ Error loading user profile:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Stack trace:', error.stack);
      setError(error.message);
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login for:', email);
      
      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log('Login successful');
      
      // Log authentication event manually
      if (data.user) {
        try {
          await logAuthenticationEvent(
            data.user.id,
            email,
            'login',
            true,
            data.session ? 'session-' + data.session.expires_at : null
          );
        } catch (logError) {
          console.warn('Failed to log authentication event:', logError);
          // Don't fail login if logging fails
        }
      }
      
      // User profile will be loaded by the auth state change listener
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Log failed authentication attempt
      try {
        await logFailedAuthenticationEvent(email, error.message || 'Invalid credentials');
      } catch (logError) {
        console.warn('Failed to log failed authentication event:', logError);
      }
      
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData, profilePhoto?: File | null) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting registration for:', userData.email);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role
          }
        }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Create user profile in users table
        const profileData = {
          id: authData.user.id,
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          role: userData.role,
          phone: userData.phone,
          address: userData.address || {},
          emergency_contact: userData.emergencyContact || {},
          medical_info: userData.medicalInfo || {},
          team: userData.team,
          default_team: userData.defaultTeam,
          managed_teams: userData.managedTeams,
          is_active: true
        };
        
        const { error: profileError } = await dataClient
          .from('users')
          .insert([profileData]);
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway, profile might be created by trigger
        }
        
        console.log('Registration successful');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      if (session?.user) {
        console.log('=== REFRESH USER DEBUG ===');
        console.log('Refreshing user profile for ID:', session.user.id);
        
        const { data: userProfile, error } = await dataClient
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error refreshing user profile:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          return;
        }
        
        console.log('Raw user profile from database:', userProfile);
        console.log('Database first_name:', userProfile?.first_name);
        console.log('Database last_name:', userProfile?.last_name);
        console.log('=== END REFRESH USER DEBUG ===');
        
        // Transform snake_case to camelCase for frontend compatibility
        const transformedUser: User = {
          id: userProfile.id,
          firstName: userProfile.first_name || '',
          lastName: userProfile.last_name || '',
          email: userProfile.email || '',
          role: userProfile.role || '',
          team: userProfile.team || '',
          phone: userProfile.phone || '',
          address: userProfile.address || {},
          employer_id: userProfile.employer_id || '',
          is_active: userProfile.is_active || false,
          last_login: userProfile.last_login || '',
          profileImage: userProfile.profile_image_url || '',
          emergencyContact: userProfile.emergency_contact || {},
          medicalInfo: userProfile.medical_info || {},
          package: userProfile.package || ''
        };
        
        setUser(transformedUser);
        console.log('User data refreshed:', transformedUser);
      }
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
    }
  };

  const updateUserInContext = (updatedUserData: any) => {
    console.log('=== UPDATE USER IN CONTEXT ===');
    console.log('Raw updated user data:', updatedUserData);
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedUser: User = {
      id: updatedUserData.id,
      firstName: updatedUserData.first_name || '',
      lastName: updatedUserData.last_name || '',
      email: updatedUserData.email || '',
      role: updatedUserData.role || '',
      team: updatedUserData.team || '',
      phone: updatedUserData.phone || '',
      address: updatedUserData.address || {},
      employer_id: updatedUserData.employer_id || '',
      is_active: updatedUserData.is_active || false,
      last_login: updatedUserData.last_login || '',
      profileImage: updatedUserData.profile_image_url || '',
      emergencyContact: updatedUserData.emergency_contact || {},
      medicalInfo: updatedUserData.medical_info || {},
      package: updatedUserData.package || ''
    };
    
    console.log('Transformed user data:', transformedUser);
    setUser(transformedUser);
    console.log('=== END UPDATE USER IN CONTEXT ===');
  };

  const logout = async () => {
    try {
      // Log logout event before signing out
      if (user) {
        try {
          await logAuthenticationEvent(user.id, user.email, 'logout', true);
        } catch (logError) {
          console.warn('Failed to log logout event:', logError);
        }
      }
      
      const { error } = await authClient.auth.signOut();
      if (error) throw error;
      
      // Clear the auth cookie manually
      document.cookie = 'supabase.auth.token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure';
      
      setUser(null);
      setSession(null);
      console.log('Logout completed');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Continue with logout even if there's an error
      setUser(null);
      setSession(null);
    }
  };

  const value = {
    user,
    session,
    login,
    register,
    logout,
    refreshUser,
    updateUserInContext,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
