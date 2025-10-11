import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorNotFound from './ErrorNotFound';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a "not found" type error
      const errorMessage = this.state.error?.message || '';
      if (errorMessage.includes('not found') || 
          errorMessage.includes('404') || 
          errorMessage.includes('Not Found')) {
        return <ErrorNotFound />;
      }

      // Use custom fallback if provided, otherwise use ErrorNotFound
      return this.props.fallback || <ErrorNotFound />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;