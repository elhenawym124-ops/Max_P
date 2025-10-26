import React from 'react';
import {
  ExclamationTriangleIcon,
  WifiIcon,
  ServerIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ErrorState } from '../../hooks/useErrorHandler';

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  compact = false
}) => {
  const getErrorIcon = (errorType: ErrorState['errorType']) => {
    const iconClass = "w-6 h-6";
    
    switch (errorType) {
      case 'network':
        return <WifiIcon className={`${iconClass} text-red-500`} />;
      case 'server':
        return <ServerIcon className={`${iconClass} text-red-500`} />;
      case 'auth':
        return <ShieldExclamationIcon className={`${iconClass} text-yellow-500`} />;
      case 'validation':
        return <ExclamationTriangleIcon className={`${iconClass} text-orange-500`} />;
      default:
        return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    }
  };

  const getErrorColor = (errorType: ErrorState['errorType']) => {
    switch (errorType) {
      case 'network':
        return 'red';
      case 'server':
        return 'red';
      case 'auth':
        return 'yellow';
      case 'validation':
        return 'orange';
      default:
        return 'red';
    }
  };

  const color = getErrorColor(error.errorType);
  
  if (compact) {
    return (
      <div className={`flex items-center p-3 bg-${color}-50 border border-${color}-200 rounded-lg`}>
        <div className="flex-shrink-0">
          {getErrorIcon(error.errorType)}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm text-${color}-800`}>
            {error.errorMessage}
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          {error.canRetry && onRetry && (
            <button
              onClick={onRetry}
              className={`text-${color}-600 hover:text-${color}-800 transition-colors duration-200`}
              title="إعادة المحاولة"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`text-${color}-400 hover:text-${color}-600 transition-colors duration-200`}
              title="إغلاق"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-${color}-50 border border-${color}-200 p-6`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getErrorIcon(error.errorType)}
        </div>
        <div className="ml-4 flex-1">
          <h3 className={`text-lg font-medium text-${color}-800 mb-2`}>
            {error.errorType === 'network' && 'مشكلة في الاتصال'}
            {error.errorType === 'server' && 'خطأ في الخادم'}
            {error.errorType === 'auth' && 'مشكلة في المصادقة'}
            {error.errorType === 'validation' && 'خطأ في البيانات'}
            {error.errorType === 'unknown' && 'خطأ غير متوقع'}
          </h3>
          <p className={`text-sm text-${color}-700 mb-4`}>
            {error.errorMessage}
          </p>
          
          {error.errorCode && (
            <p className={`text-xs text-${color}-600 mb-4`}>
              رمز الخطأ: {error.errorCode}
            </p>
          )}

          <div className="flex items-center space-x-3 space-x-reverse">
            {error.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-${color}-600 hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 transition-colors duration-200`}
              >
                <ArrowPathIcon className="w-4 h-4 ml-2" />
                إعادة المحاولة
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`inline-flex items-center px-4 py-2 border border-${color}-300 text-sm font-medium rounded-md text-${color}-700 bg-white hover:bg-${color}-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 transition-colors duration-200`}
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// مكون خطأ مبسط للاستخدام في القوائم
export const InlineError: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div className="flex items-center justify-center p-4 text-center">
      <div className="flex items-center space-x-3 space-x-reverse text-red-600">
        <ExclamationTriangleIcon className="w-5 h-5" />
        <span className="text-sm">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
};

// مكون إشعار خطأ عائم
export const ErrorToast: React.FC<{
  error: ErrorState;
  onDismiss: () => void;
  onRetry?: () => void;
}> = ({ error, onDismiss, onRetry }) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-red-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                حدث خطأ
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {error.errorMessage}
              </p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              {error.canRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  إعادة
                </button>
              )}
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
