import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo): void => {
    // Here you would send the error to your monitoring service
    // Example: Sentry, LogRocket, etc.
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Send to monitoring service
      console.error('Error logged to monitoring service:', errorData);
    } catch (loggingError) {
      console.error('Failed to log error to monitoring service:', loggingError);
    }
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                حدث خطأ غير متوقع
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                نعتذر، حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى أو إعادة تحميل الصفحة.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
                    Error Details (Development Only):
                  </h3>
                  <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="btn btn-primary btn-md"
                >
                  المحاولة مرة أخرى
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="btn btn-outline btn-md"
                >
                  إعادة تحميل الصفحة
                </button>
              </div>

              <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                <p>
                  إذا استمر هذا الخطأ، يرجى{' '}
                  <a
                    href="mailto:support@example.com"
                    className="text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  >
                    التواصل مع الدعم الفني
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
