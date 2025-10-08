/**
 * ✨ Design Tokens - Modern, Clean, Professional
 * Inspired by Linear, Stripe, Notion
 */

export const designTokens = {
  // 🎨 Colors - Soft, Professional
  colors: {
    // Primary
    primary: {
      main: '#4F46E5',      // Indigo (muted)
      hover: '#4338CA',     // Darker on hover
      light: '#818CF8',     // Light variant
      bg: '#EEF2FF'         // Background tint
    },
    
    // Backgrounds (Layered)
    background: {
      base: '#FAFAFA',      // Page background
      elevated: '#FFFFFF',  // Cards
      subtle: '#F8FAFC',    // Alternate rows
      overlay: 'rgba(15, 23, 42, 0.05)'
    },
    
    // Text (Clear Hierarchy)
    text: {
      primary: '#0F172A',   // Headings
      secondary: '#475569', // Body text
      tertiary: '#94A3B8',  // Captions, labels
      disabled: '#CBD5E1'   // Disabled state
    },
    
    // Borders
    border: {
      default: '#E2E8F0',
      hover: '#CBD5E1',
      focus: '#4F46E5'
    },
    
    // Status (Softer, Professional)
    status: {
      success: {
        main: '#10B981',
        bg: '#ECFDF5',
        border: '#D1FAE5'
      },
      warning: {
        main: '#F59E0B',
        bg: '#FFFBEB',
        border: '#FEF3C7'
      },
      error: {
        main: '#EF4444',
        bg: '#FEF2F2',
        border: '#FECACA'
      },
      info: {
        main: '#3B82F6',
        bg: '#EFF6FF',
        border: '#DBEAFE'
      }
    }
  },
  
  // 📏 Spacing - 8-Point Grid
  spacing: {
    '0': 0,
    '1': 4,    // 0.25rem - 4px
    '2': 8,    // 0.5rem - 8px
    '3': 12,   // 0.75rem - 12px
    '4': 16,   // 1rem - 16px
    '5': 20,   // 1.25rem - 20px
    '6': 24,   // 1.5rem - 24px
    '8': 32,   // 2rem - 32px
    '10': 40,  // 2.5rem - 40px
    '12': 48,  // 3rem - 48px
    '16': 64   // 4rem - 64px
  },
  
  // 🔤 Typography
  typography: {
    h1: {
      fontSize: '2rem',        // 32px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontSize: '1.5rem',      // 24px
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontSize: '1.25rem',     // 20px
      fontWeight: 600,
      lineHeight: 1.4
    },
    h4: {
      fontSize: '1rem',        // 16px
      fontWeight: 600,
      lineHeight: 1.5
    },
    body1: {
      fontSize: '0.875rem',    // 14px
      fontWeight: 400,
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.75rem',     // 12px
      fontWeight: 400,
      lineHeight: 1.5
    },
    caption: {
      fontSize: '0.6875rem',   // 11px
      fontWeight: 500,
      lineHeight: 1.4,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  },
  
  // 🎭 Shadows - Minimal, Subtle
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(15, 23, 42, 0.08)',
    md: '0 4px 12px rgba(15, 23, 42, 0.12)',
    lg: '0 8px 24px rgba(15, 23, 42, 0.16)',
    focus: '0 0 0 3px rgba(79, 70, 229, 0.1)'
  },
  
  // 🔲 Border Radius
  radius: {
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    lg: '1rem',     // 16px
    full: '9999px'
  },
  
  // ⚡ Transitions
  transitions: {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  
  // 📐 Layout
  layout: {
    maxWidth: '1280px',
    cardPadding: '24px',
    pagePadding: '32px'
  }
} as const;

// 🎨 Helper Functions
export const getStatusColor = (status: string) => {
  const statusMap: Record<string, any> = {
    success: designTokens.colors.status.success,
    warning: designTokens.colors.status.warning,
    error: designTokens.colors.status.error,
    info: designTokens.colors.status.info
  };
  return statusMap[status] || designTokens.colors.status.info;
};

export const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return '#10B981'; // Green
  if (grade.startsWith('B')) return '#3B82F6'; // Blue
  if (grade.startsWith('C')) return '#F59E0B'; // Amber
  return '#EF4444'; // Red for D/F
};

export default designTokens;

