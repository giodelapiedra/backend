import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PhotoUpload from '../components/PhotoUpload';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'worker', // Always worker for registration
    phone: '',
    employer: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    medicalInfo: {
      bloodType: '',
      allergies: [] as string[],
      medications: [] as string[],
      medicalConditions: [] as string[]
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const { login, register, loading, user } = useAuth();
  const navigate = useNavigate();

  // Check authentication status immediately
  useEffect(() => {
    const checkAuthStatus = () => {
      // If we have a token in cookies, assume user is authenticated
      const token = document.cookie.split(';').find(c => c.trim().startsWith('token='));
      if (token) {
        setIsCheckingAuth(true);
        // Don't show login form if token exists
        return;
      }
      setIsCheckingAuth(false);
    };

    checkAuthStatus();
  }, []);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user && !loading) {
      // Redirect based on user role - using exact role names from Dashboard component
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'clinician':
          navigate('/clinician');
          break;
        case 'case_manager':
          navigate('/case-manager');
          break;
        case 'employer':
          navigate('/employer');
          break;
        case 'site_supervisor':
          navigate('/site-supervisor');
          break;
        case 'gp_insurer':
          navigate('/gp-insurer');
          break;
        case 'worker':
        default:
          navigate('/worker');
          break;
      }
    } else if (!loading && !user) {
      // Only show login form when we're sure user is not authenticated
      setIsCheckingAuth(false);
    }
  }, [user, loading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        const parentValue = prev[parent as keyof typeof prev];
        const parentObject = parentValue && typeof parentValue === 'object' ? parentValue : {};
        return {
          ...prev,
          [parent]: {
            ...parentObject,
            [child]: value
          }
        };
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        // Navigation will be handled by the useEffect above
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          employer: formData.employer || undefined,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
          medicalInfo: formData.medicalInfo,
        }, profilePhoto);
        // Navigation will be handled by the useEffect above
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'worker', // Always worker for registration
      phone: '',
      employer: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        email: ''
      },
      medicalInfo: {
        bloodType: '',
        allergies: [],
        medications: [],
        medicalConditions: []
      }
    });
  };

  // Show loading while checking authentication or redirecting
  if (loading || isCheckingAuth) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#1976d2' }}>
            {isCheckingAuth ? 'Checking authentication...' : 'Loading...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Don't render the form if user is authenticated (will redirect)
  if (user) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#1976d2' }}>
            Redirecting to dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left Side - Branding with Philippines Map */}
      <Box
        sx={{
          flex: 1,
          background: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Philippines Map Background */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '400px',
            opacity: 0.1,
            background: `
              radial-gradient(circle at 20% 30%, #1976d2 2px, transparent 2px),
              radial-gradient(circle at 80% 20%, #1976d2 2px, transparent 2px),
              radial-gradient(circle at 30% 70%, #1976d2 2px, transparent 2px),
              radial-gradient(circle at 70% 80%, #1976d2 2px, transparent 2px),
              radial-gradient(circle at 50% 50%, #1976d2 2px, transparent 2px)
            `,
            backgroundSize: '100px 100px',
          }}
        />
        
        {/* Logo */}
        <Box sx={{ textAlign: 'center', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1,
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#64b5f6',
                }}
              />
            </Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                color: '#1976d2',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
                ml: 1,
              }}
            >
              MSK
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: '#666',
              fontWeight: 400,
            }}
          >
            Occupational Rehabilitation Management System
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          p: 4,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              color: '#1976d2',
              fontWeight: 'bold',
              mb: 1,
            }}
          >
            {isLogin ? 'Welcome back!' : 'Create Account'}
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              color: '#666',
              mb: 4,
            }}
          >
            {isLogin 
              ? 'Log in to continue to your account' 
              : 'Join our professional rehabilitation platform'
            }
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required={!isLogin}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required={!isLogin}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </Box>
                
                {/* Photo Upload */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <PhotoUpload
                    onPhotoChange={setProfilePhoto}
                    size={100}
                  />
                </Box>
              </>
            )}

            <TextField
              fullWidth
              label="Email or Username"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              variant="outlined"
              placeholder="john@example.com or username"
              sx={{ mb: 2 }}
            />

            {!isLogin && (
              <>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Role"
                  name="role"
                  value="worker"
                  disabled
                  variant="outlined"
                  sx={{ mb: 2 }}
                  helperText="All registrations are automatically set to Worker role"
                />
                
                {/* Address Information */}
                <Typography variant="h6" sx={{ mt: 3, mb: 2, color: '#1976d2' }}>
                  Address Information
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="City"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="State"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Zip Code"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    variant="outlined"
                  />
                </Box>
                
                {/* Emergency Contact */}
                <Typography variant="h6" sx={{ mt: 3, mb: 2, color: '#1976d2' }}>
                  Emergency Contact
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Emergency Contact Name"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleChange}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Relationship"
                    name="emergencyContact.relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={handleChange}
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Emergency Contact Phone"
                    name="emergencyContact.phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleChange}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Emergency Contact Email"
                    name="emergencyContact.email"
                    value={formData.emergencyContact.email}
                    onChange={handleChange}
                    variant="outlined"
                  />
                </Box>
                
                {/* Medical Information */}
                <Typography variant="h6" sx={{ mt: 3, mb: 2, color: '#1976d2' }}>
                  Medical Information
                </Typography>
                <TextField
                  fullWidth
                  label="Blood Type"
                  name="medicalInfo.bloodType"
                  value={formData.medicalInfo.bloodType}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              variant="outlined"
              placeholder={isLogin ? "Enter your password" : "Password123!"}
              sx={{ mb: 1 }}
              helperText={!isLogin ? "Must be 12+ chars with uppercase, lowercase, number, and special character (@$!%*?&)" : ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {isLogin && (
              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Link
                  component="button"
                  variant="body2"
                  sx={{
                    color: '#1976d2',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
            )}

            {!isLogin && (
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required={!isLogin}
                variant="outlined"
                sx={{ mb: 3 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                mb: 3,
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                isLogin ? 'Log in' : 'Create Account'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={toggleMode}
                  sx={{
                    color: '#1976d2',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {isLogin ? 'Sign up here for free' : 'Sign in'}
                </Link>
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Need help?{' '}
                <Link
                  component="button"
                  variant="body2"
                  sx={{
                    color: '#1976d2',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Contact us
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
