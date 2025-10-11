import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authClient, dataClient } from '../lib/supabase';
import { SupabaseAPI } from '../utils/supabaseApi';

// Authentication logging functions - simplified version
const logAuthenticationEvent = async (
  userId: string,
  email: string,
  action: 'login' | 'logout',
  success: boolean,
  sessionId?: string | null,
  failureReason?: string
) => {
  try {
    console.log(`✅ Authentication ${action} logged for user: ${email}`);
    // Note: Authentication logging can be implemented later if needed
    // For now, we'll just log to console
  } catch (error) {
    console.error(`❌ Failed to log authentication ${action}:`, error);
  }
};

const logFailedAuthenticationEvent = async (email: string, failureReason: string) => {
  try {
    console.log(`✅ Failed authentication attempt logged for: ${email}`);
    // Note: Authentication logging can be implemented later if needed
    // For now, we'll just log to console
  } catch (error) {
    console.error(`❌ Failed to log failed authentication attempt:`, error);
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
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout')), 5000);
        });
        
        const sessionPromise = authClient.auth.getSession();
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
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
            // Load user profile from auth metadata instead of database
            const transformedUser: User = {
              id: session.user.id,
              firstName: session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0] || '',
              lastName: session.user.user_metadata?.last_name || session.user.user_metadata?.full_name?.split(' ')[1] || '',
              email: session.user.email || '',
              role: session.user.user_metadata?.role || 'worker',
              team: session.user.user_metadata?.team || session.user.user_metadata?.default_team || 'TEAM GEO',
              phone: session.user.user_metadata?.phone || '',
              address: session.user.user_metadata?.address || {},
              employer_id: session.user.user_metadata?.employer_id || '',
              is_active: true,
              last_login: session.user.last_sign_in_at || '',
              profileImage: session.user.user_metadata?.avatar_url || '',
              emergencyContact: session.user.user_metadata?.emergency_contact || {},
              medicalInfo: session.user.user_metadata?.medical_info || {},
              package: session.user.user_metadata?.package || ''
            };
            
            setUser(transformedUser);
            setLoading(false);
            console.log('✅ User profile loaded from auth metadata');
            console.log('🔍 User data:', transformedUser);
            console.log('🔍 User team:', transformedUser.team);
            console.log('🔍 User role:', transformedUser.role);
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
    
    // Fallback timeout to ensure loading is always set to false
    const fallbackTimeout = setTimeout(() => {
      if (isSubscribed && loading) {
        console.warn('⚠️ Auth initialization fallback timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000);

    // Listen for auth changes
    const { data: { subscription } } = authClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, session?.user?.id);
      
      if (!isSubscribed) return;
      
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, loading profile...');
        try {
          // Create user profile from auth metadata
          const transformedUser: User = {
            id: session.user.id,
            firstName: session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: session.user.user_metadata?.last_name || session.user.user_metadata?.full_name?.split(' ')[1] || '',
            email: session.user.email || '',
            role: session.user.user_metadata?.role || 'worker',
            team: session.user.user_metadata?.team || session.user.user_metadata?.default_team || 'TEAM GEO',
            phone: session.user.user_metadata?.phone || '',
            address: session.user.user_metadata?.address || {},
            employer_id: session.user.user_metadata?.employer_id || '',
            is_active: true,
            last_login: session.user.last_sign_in_at || '',
            profileImage: session.user.user_metadata?.avatar_url || '',
            emergencyContact: session.user.user_metadata?.emergency_contact || {},
            medicalInfo: session.user.user_metadata?.medical_info || {},
            package: session.user.user_metadata?.package || ''
          };
          
          setUser(transformedUser);
          setLoading(false);
          console.log('✅ User profile loaded from auth metadata on sign in');
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
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Loading user profile for ID:', userId);
      
      // First, get the user from Supabase Auth
      const { data: authUser, error: authError } = await authClient.auth.getUser();
      
      if (authError) {
        console.error('❌ Error getting auth user:', authError);
        setError('Authentication error: ' + authError.message);
        setLoading(false);
        return;
      }
      
      if (!authUser.user) {
        console.error('❌ No authenticated user found');
        setError('No authenticated user');
        setLoading(false);
        return;
      }
      
      console.log('✅ Auth user found:', authUser.user);
      
      // Create user profile from auth user data
      const transformedUser: User = {
        id: authUser.user.id,
        firstName: authUser.user.user_metadata?.first_name || authUser.user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: authUser.user.user_metadata?.last_name || authUser.user.user_metadata?.full_name?.split(' ')[1] || '',
        email: authUser.user.email || '',
        role: authUser.user.user_metadata?.role || 'worker',
        team: authUser.user.user_metadata?.team || authUser.user.user_metadata?.default_team || 'TEAM GEO',
        phone: authUser.user.user_metadata?.phone || '',
        address: authUser.user.user_metadata?.address || {},
        employer_id: authUser.user.user_metadata?.employer_id || '',
        is_active: true,
        last_login: authUser.user.last_sign_in_at || '',
        profileImage: authUser.user.user_metadata?.avatar_url || '',
        emergencyContact: authUser.user.user_metadata?.emergency_contact || {},
        medicalInfo: authUser.user.user_metadata?.medical_info || {},
        package: authUser.user.user_metadata?.package || ''
      };
      
      console.log('✅ Transformed user from auth:', transformedUser);
      
      // Set user and navigate
      setUser(transformedUser);
      setLoading(false);
      
      console.log('✅ Profile loaded successfully from auth data');
      
    } catch (error: any) {
      console.error('❌ Error loading user profile:', error);
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
      
      // Log authentication event to database
      if (data.user) {
        try {
          // Get user info for logging
          const userName = `${data.user.user_metadata?.first_name || ''} ${data.user.user_metadata?.last_name || ''}`.trim() || email;
          const userRole = data.user.user_metadata?.role || 'worker';
          
          // Get IP address and user agent
          const ipAddress = '127.0.0.1'; // Default for localhost
          const userAgent = navigator.userAgent;
          
          // Log to authentication_logs table
          await SupabaseAPI.logLoginActivity(
            data.user.id,
            email,
            userName,
            userRole,
            ipAddress,
            userAgent
          );
          
          console.log('✅ Login activity logged to database');
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
            role: userData.role,
            team: userData.team,
            phone: userData.phone,
            address: userData.address,
            emergency_contact: userData.emergencyContact,
            medical_info: userData.medicalInfo,
            employer_id: userData.employer,
            default_team: userData.defaultTeam,
            managed_teams: userData.managedTeams
          }
        }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        console.log('Registration successful - user created in auth');
        // User profile data is now stored in auth metadata, no need for separate users table
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
        
        // Get fresh user data from auth
        const { data: authUser, error: authError } = await authClient.auth.getUser();
        
        if (authError) {
          console.error('Error refreshing auth user:', authError);
          return;
        }
        
        if (!authUser.user) {
          console.error('No auth user found during refresh');
          return;
        }
        
        console.log('Raw auth user from refresh:', authUser.user);
        
        // Transform snake_case to camelCase for frontend compatibility
        const transformedUser: User = {
          id: authUser.user.id,
          firstName: authUser.user.user_metadata?.first_name || authUser.user.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: authUser.user.user_metadata?.last_name || authUser.user.user_metadata?.full_name?.split(' ')[1] || '',
          email: authUser.user.email || '',
          role: authUser.user.user_metadata?.role || 'worker',
          team: authUser.user.user_metadata?.team || authUser.user.user_metadata?.default_team || 'TEAM GEO',
          phone: authUser.user.user_metadata?.phone || '',
          address: authUser.user.user_metadata?.address || {},
          employer_id: authUser.user.user_metadata?.employer_id || '',
          is_active: true,
          last_login: authUser.user.last_sign_in_at || '',
          profileImage: authUser.user.user_metadata?.avatar_url || '',
          emergencyContact: authUser.user.user_metadata?.emergency_contact || {},
          medicalInfo: authUser.user.user_metadata?.medical_info || {},
          package: authUser.user.user_metadata?.package || ''
        };
        
        setUser(transformedUser);
        console.log('User data refreshed from auth:', transformedUser);
        console.log('=== END REFRESH USER DEBUG ===');
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
