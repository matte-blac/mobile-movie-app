import React from "react";
import { Alert } from "react-native";

// Enhanced error classes with retry information
export class APIError extends Error implements AppError {
    code?: string;
    statusCode?: number;
    details?: any;
    retryable?: boolean;
    timestamp?: number;
    requestId?: string;

    constructor(
        message: string, 
        code?: string, 
        statusCode?: number, 
        details?: any,
        retryable?: boolean
    ) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.retryable = retryable;
        this.timestamp = Date.now();
        this.requestId = Math.random().toString(36).substr(2, 9);
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }
}

export class AuthError extends Error implements AppError {
    code?: string;
    details?: any;
    timestamp?: number;

    constructor(message: string, code?: string, details?: any) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
        this.details = details;
        this.timestamp = Date.now();
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthError);
        }
    }
}

export class NetworkError extends Error implements AppError {
    code?: string;
    retryable?: boolean;
    timestamp?: number;

    constructor(message: string, code?: string) {
        super(message);
        this.name = 'NetworkError';
        this.code = code || 'NETWORK_ERROR';
        this.retryable = true;
        this.timestamp = Date.now();
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NetworkError);
        }
    }
}

export class CacheError extends Error implements AppError {
    code?: string;
    timestamp?: number;

    constructor(message: string, code?: string) {
        super(message);
        this.name = 'CacheError';
        this.code = code || 'CACHE_ERROR';
        this.timestamp = Date.now();
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CacheError);
        }
    }
}

// Error factory functions
export const createAPIError = (
    message: string,
    statusCode?: number,
    code?: string,
    details?: any,
    retryable?: boolean
): APIError => {
    return new APIError(message, code, statusCode, details, retryable);
};

export const createAuthError = (
    message: string,
    code?: string,
    details?: any
): AuthError => {
    return new AuthError(message, code, details);
};

export const createNetworkError = (
    message: string,
    code?: string
): NetworkError => {
    return new NetworkError(message, code);
};

export const createCacheError = (
    message: string,
    code?: string
): CacheError => {
    return new CacheError(message, code);
};

// Enhanced error classification
export const isRetryableError = (error: any): boolean => {
    if (error instanceof NetworkError) return true;
    if (error instanceof APIError) return error.retryable ?? false;
    
    if (error?.response) {
        const status = error.response.status;
        return [408, 429, 500, 502, 503, 504].includes(status);
    }
    
    // Network errors
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return true;
    }
    
    // Timeout errors
    if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
        return true;
    }
    
    return false;
};

export const isNetworkError = (error: any): boolean => {
    return (
        error instanceof NetworkError ||
        error?.name === 'NetworkError' ||
        error?.code === 'NETWORK_ERROR' ||
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch') ||
        error?.name === 'TypeError' && error?.message?.includes('fetch')
    );
};

export const isCacheError = (error: any): boolean => {
    return (
        error instanceof CacheError ||
        error?.name === 'CacheError' ||
        error?.code === 'CACHE_ERROR'
    );
};

// Enhanced error handling with context
export const handleAPIError = (error: any, context?: string): APIError => {
    if (error instanceof APIError) {
        return error;
    }

    let message = 'An unexpected error occurred';
    let statusCode: number | undefined;
    let code: string | undefined;
    let retryable = false;

    // Handle network errors
    if (isNetworkError(error)) {
        message = 'Network error. Please check your internet connection.';
        code = 'NETWORK_ERROR';
        retryable = true;
        return createAPIError(message, undefined, code, error, retryable);
    }

    // Handle HTTP response errors
    if (error?.response) {
        statusCode = error.response.status;
        message = error.response.data?.message || error.response.statusText || message;
        code = error.response.data?.code;

        switch (statusCode) {
            case 400:
                message = 'Bad request. Please check your input.';
                code = 'BAD_REQUEST';
                break;
            case 401:
                message = 'Authentication required';
                code = 'UNAUTHORIZED';
                break;
            case 403:
                message = 'Access forbidden';
                code = 'FORBIDDEN';
                break;
            case 404:
                message = 'Resource not found';
                code = 'NOT_FOUND';
                break;
            case 408:
                message = 'Request timeout. Please try again.';
                code = 'TIMEOUT';
                retryable = true;
                break;
            case 429:
                message = 'Too many requests. Please try again later';
                code = 'RATE_LIMITED';
                retryable = true;
                break;
            case 500:
                message = 'Server error. Please try again later';
                code = 'SERVER_ERROR';
                retryable = true;
                break;
            case 502:
                message = 'Bad gateway. Please try again later';
                code = 'BAD_GATEWAY';
                retryable = true;
                break;
            case 503:
                message = 'Service unavailable. Please try again later';
                code = 'SERVICE_UNAVAILABLE';
                retryable = true;
                break;
            case 504:
                message = 'Gateway timeout. Please try again later';
                code = 'GATEWAY_TIMEOUT';
                retryable = true;
                break;
        }
    } else if (error?.message) {
        message = error.message;
        
        // Detect timeout errors
        if (message.includes('timeout') || message.includes('TIMEOUT')) {
            code = 'TIMEOUT';
            retryable = true;
        }
        
        // Detect abort errors
        if (message.includes('aborted') || error?.name === 'AbortError') {
            code = 'ABORTED';
            retryable = false;
        }
    }

    // Add context to error message
    if (context) {
        message = `${context}: ${message}`;
    }

    return createAPIError(message, statusCode, code, error, retryable);
};

export const handleAuthError = (error: any): AuthError => {
    if (error instanceof AuthError) {
        return error;
    }

    let message = 'Authentication failed';
    let code: string | undefined;

    if (error?.message) {
        if (error.message.includes('Invalid credentials') || error.message.includes('invalid email')) {
            message = 'Invalid email or password';
            code = 'INVALID_CREDENTIALS';
        } else if (error.message.includes('already exists') || error.message.includes('user with the same id')) {
            message = 'An account with this email already exists';
            code = 'USER_EXISTS';
        } else if (error.message.includes('Password')) {
            message = 'Password must be at least 8 characters long';
            code = 'WEAK_PASSWORD';
        } else if (error.message.includes('Email')) {
            message = 'Please enter a valid email address';
            code = 'INVALID_EMAIL';
        } else if (error.message.includes('session') || error.message.includes('Session')) {
            message = 'Session expired. Please log in again.';
            code = 'SESSION_EXPIRED';
        } else {
            message = error.message;
        }
    }

    return createAuthError(message, code, error);
};

// Enhanced error alert with retry option and error details
export const showErrorAlert = (
    error: AppError | Error,
    title: string = 'Error',
    options?: {
        onRetry?: () => void;
        showDetails?: boolean;
        context?: string;
    }
) => {
    const { onRetry, showDetails = false, context } = options || {};
    
    let message = error.message || 'An unexpected error occurred';
    
    if (context) {
        message = `${context}\n\n${message}`;
    }
    
    // Add error details if requested and available
    if (showDetails && error instanceof APIError) {
        const details = [];
        if (error.code) details.push(`Code: ${error.code}`);
        if (error.statusCode) details.push(`Status: ${error.statusCode}`);
        if (error.requestId) details.push(`ID: ${error.requestId}`);
        
        if (details.length > 0) {
            message += `\n\n${details.join(' • ')}`;
        }
    }

    const buttons = [
        { text: 'OK', style: 'default' as const }
    ];

    // Add retry button for retryable errors
    if (onRetry && (error instanceof APIError && error.retryable)) {
        buttons.unshift({
            text: 'Retry',
            style: 'default' as const,
            onPress: onRetry
        });
    }

    Alert.alert(title, message, buttons);
};

// Enhanced error message extraction
export const getErrorMessage = (error: any): string => {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error?.response?.data?.message) {
        return error.response.data.message;
    }

    if (error?.message) {
        return error.message;
    }

    return 'An unexpected error occurred';
};

// Get user-friendly error message
export const getFriendlyErrorMessage = (error: any): string => {
    if (isNetworkError(error)) {
        return 'Please check your internet connection and try again.';
    }

    if (error instanceof APIError) {
        switch (error.code) {
            case 'TIMEOUT':
                return 'The request took too long. Please try again.';
            case 'RATE_LIMITED':
                return 'Too many requests. Please wait a moment and try again.';
            case 'SERVER_ERROR':
                return 'Our servers are having issues. Please try again later.';
            case 'NOT_FOUND':
                return 'The requested content could not be found.';
            case 'UNAUTHORIZED':
                return 'Please log in to continue.';
            case 'FORBIDDEN':
                return 'You don\'t have permission to access this content.';
            default:
                return error.message;
        }
    }

    if (error instanceof AuthError) {
        switch (error.code) {
            case 'INVALID_CREDENTIALS':
                return 'Please check your email and password.';
            case 'SESSION_EXPIRED':
                return 'Your session has expired. Please log in again.';
            case 'USER_EXISTS':
                return 'An account with this email already exists.';
            default:
                return error.message;
        }
    }

    return getErrorMessage(error);
};

// Enhanced retry logic
export const shouldRetry = (error: AppError, attempt: number = 1, maxAttempts: number = 3): boolean => {
    if (attempt >= maxAttempts) return false;
    
    if (error instanceof APIError) {
        return error.retryable ?? false;
    }
    
    return isRetryableError(error);
};

// Error logging utility
export const logError = (error: any, context?: string, metadata?: Record<string, any>) => {
    const errorInfo = {
        message: getErrorMessage(error),
        name: error?.name,
        code: error?.code,
        statusCode: error?.statusCode,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        context,
        metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // In development, log to console
    if (__DEV__) {
        console.group(`🔴 Error${context ? ` in ${context}` : ''}`);
        console.error('Message:', errorInfo.message);
        if (errorInfo.code) console.error('Code:', errorInfo.code);
        if (errorInfo.statusCode) console.error('Status:', errorInfo.statusCode);
        if (metadata) console.error('Metadata:', metadata);
        if (error?.stack) console.error('Stack:', error.stack);
        console.groupEnd();
    }

    // In production, you might want to send to crash reporting service
    // Example: Crashlytics, Sentry, etc.
    // crashlytics().recordError(error);
    
    return errorInfo;
};

// Error boundary helper
export const createErrorBoundaryHandler = (fallbackComponent?: React.ComponentType<any>) => {
    return class ErrorBoundary extends React.Component {
        constructor(props: any) {
            super(props);
            this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error: any) {
            return { hasError: true, error };
        }

        componentDidCatch(error: any, errorInfo: any) {
            logError(error, 'ErrorBoundary', { errorInfo });
        }

        render() {
            if (this.state.hasError) {
                if (fallbackComponent) {
                    return React.createElement(fallbackComponent, { 
                        error: this.state.error,
                        onRetry: () => this.setState({ hasError: false, error: null })
                    });
                }
                
                return React.createElement('div', { 
                    style: { padding: 20, textAlign: 'center' }
                }, 'Something went wrong. Please refresh the page.');
            }

            return this.props.children
        }
    };
};

// Global error handler for unhandled promises
export const setupGlobalErrorHandling = () => {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', (event) => {
            logError(event.reason, 'UnhandledPromiseRejection');
            
            // Prevent the default browser behavior
            event.preventDefault();
        });
    }
    
    // For React Native, you might use ErrorUtils
    if (typeof ErrorUtils !== 'undefined') {
        const originalHandler = ErrorUtils.getGlobalHandler();
        
        ErrorUtils.setGlobalHandler((error, isFatal) => {
            logError(error, 'GlobalErrorHandler', { isFatal });
            
            // Call original handler
            if (originalHandler) {
                originalHandler(error, isFatal);
            }
        });
    }
};

// Error metrics tracking
interface ErrorMetrics {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByCode: Record<string, number>;
    retryableErrors: number;
    networkErrors: number;
    lastError?: {
        message: string;
        timestamp: number;
    };
}

class ErrorTracker {
    private metrics: ErrorMetrics = {
        totalErrors: 0,
        errorsByType: {},
        errorsByCode: {},
        retryableErrors: 0,
        networkErrors: 0,
    };

    track(error: any) {
        this.metrics.totalErrors++;
        
        const errorType = error?.name || 'UnknownError';
        this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
        
        if (error?.code) {
            this.metrics.errorsByCode[error.code] = (this.metrics.errorsByCode[error.code] || 0) + 1;
        }
        
        if (isRetryableError(error)) {
            this.metrics.retryableErrors++;
        }
        
        if (isNetworkError(error)) {
            this.metrics.networkErrors++;
        }
        
        this.metrics.lastError = {
            message: getErrorMessage(error),
            timestamp: Date.now(),
        };
    }

    getMetrics(): ErrorMetrics {
        return { ...this.metrics };
    }

    reset() {
        this.metrics = {
            totalErrors: 0,
            errorsByType: {},
            errorsByCode: {},
            retryableErrors: 0,
            networkErrors: 0,
        };
    }
}

export const errorTracker = new ErrorTracker();

// Export enhanced utility
export const errorUtils = {
    isRetryable: isRetryableError,
    isNetwork: isNetworkError,
    isCache: isCacheError,
    shouldRetry,
    getFriendlyMessage: getFriendlyErrorMessage,
    log: logError,
    track: (error: any) => errorTracker.track(error),
    getMetrics: () => errorTracker.getMetrics(),
    resetMetrics: () => errorTracker.reset(),
};