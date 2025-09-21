import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
}

interface ToastOptions {
  title?: string;
  duration?: number;
  action?: React.ReactNode;
  position?: 'top' | 'bottom';
}

interface ToastState {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  action?: React.ReactNode;
  position?: 'top' | 'bottom';
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    type: 'info'
  });

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    options: ToastOptions = {}
  ) => {
    setToast({
      open: true,
      message,
      type,
      title: options.title,
      duration: options.duration,
      action: options.action,
      position: options.position || 'bottom'
    });
  };

  const showSuccess = (message: string, options: ToastOptions = {}) => {
    showToast(message, 'success', options);
  };

  const showError = (message: string, options: ToastOptions = {}) => {
    showToast(message, 'error', options);
  };

  const showWarning = (message: string, options: ToastOptions = {}) => {
    showToast(message, 'warning', options);
  };

  const showInfo = (message: string, options: ToastOptions = {}) => {
    showToast(message, 'info', options);
  };

  const handleClose = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast
        open={toast.open}
        onClose={handleClose}
        message={toast.message}
        type={toast.type}
        title={toast.title}
        duration={toast.duration}
        action={toast.action}
        position={toast.position}
      />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
