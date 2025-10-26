import { useState, useCallback } from 'react';

export interface ErrorState {
  hasError: boolean;
  errorType: 'network' | 'server' | 'auth' | 'validation' | 'unknown';
  errorMessage: string;
  errorCode?: string | number;
  canRetry: boolean;
  timestamp: number;
}

export interface UseErrorHandlerReturn {
  error: ErrorState | null;
  setError: (error: ErrorState | null) => void;
  clearError: () => void;
  handleError: (error: any) => void;
  isError: boolean;
}

const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<ErrorState | null>(null);

  const setError = useCallback((error: ErrorState | null) => {
    setErrorState(error);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const getErrorMessage = (error: any): string => {
    // رسائل خطأ مخصصة باللغة العربية
    const errorMessages: Record<string, string> = {
      'Network Error': 'خطأ في الاتصال بالشبكة. تأكد من اتصالك بالإنترنت.',
      'timeout': 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.',
      '401': 'انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.',
      '403': 'ليس لديك صلاحية للوصول إلى هذا المحتوى.',
      '404': 'المحتوى المطلوب غير موجود.',
      '500': 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
      '502': 'الخادم غير متاح حالياً. يرجى المحاولة لاحقاً.',
      '503': 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.',
    };

    if (error?.response?.status) {
      return errorMessages[error.response.status.toString()] || 'حدث خطأ غير متوقع.';
    }

    if (error?.message) {
      return errorMessages[error.message] || error.message;
    }

    if (typeof error === 'string') {
      return errorMessages[error] || error;
    }

    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  };

  const getErrorType = (error: any): ErrorState['errorType'] => {
    if (error?.response?.status) {
      const status = error.response.status;
      if (status === 401 || status === 403) return 'auth';
      if (status >= 400 && status < 500) return 'validation';
      if (status >= 500) return 'server';
    }

    if (error?.message === 'Network Error' || error?.code === 'NETWORK_ERROR') {
      return 'network';
    }

    return 'unknown';
  };

  const canRetry = (error: any): boolean => {
    const errorType = getErrorType(error);
    const status = error?.response?.status;

    // لا يمكن إعادة المحاولة في حالات المصادقة والتحقق
    if (errorType === 'auth' || errorType === 'validation') {
      return false;
    }

    // يمكن إعادة المحاولة في حالات الشبكة والخادم
    if (errorType === 'network' || errorType === 'server') {
      return true;
    }

    // حالات خاصة
    if (status === 404) return false; // المحتوى غير موجود
    if (status === 429) return true;  // كثرة الطلبات

    return true;
  };

  const handleError = useCallback((error: any) => {
    console.error('Error handled:', error);

    const errorState: ErrorState = {
      hasError: true,
      errorType: getErrorType(error),
      errorMessage: getErrorMessage(error),
      errorCode: error?.response?.status || error?.code,
      canRetry: canRetry(error),
      timestamp: Date.now()
    };

    setErrorState(errorState);

    // إرسال الخطأ لخدمة التتبع (في المستقبل)
    if (process.env.NODE_ENV === 'production') {
      // sendErrorToTracking(errorState);
    }
  }, []);

  return {
    error,
    setError,
    clearError,
    handleError,
    isError: !!error?.hasError
  };
};

export default useErrorHandler;
