import { Alert } from "react-native";

// Implement the actual error classes
export class APIError extends Error implements AppError {
    code?: string;
    statusCode?: number;
    details?: any;

    constructor(message: string, code?: string, statusCode?: number, details?: any) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }
}

export class AuthError extends Error implements AppError {
    code?: string;
    details?: any;

    constructor(message: string, code?: string, details?: any) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
        this.details = details;
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthError);
        }
    }
}

export const createAPIError = (
    message: string,
    statusCode?: number,
    code?: string,
    details?: any
): APIError => {
    return new APIError(message, code, statusCode, details)
}

export const createAuthError = (
    message: string,
    code?: string,
    details?: any
): AuthError => {
    return new AuthError(message, code, details)
}

export const handleAPIError = (error: any): APIError => {
    if (error instanceof APIError) {
        return error
    }

    let message = 'An unexpected error occurred'
    let statusCode: number | undefined
    let code: string | undefined

    if (error?.response) {
        statusCode = error.response.status
        message = error.response.data?.message || error.response.statusText || message
        code = error.response.data?.code
    } else if (error?.message) {
        message = error.message
    }

    switch (statusCode) {
        case 401:
            message = 'Authentication required'
            code = 'UNAUTHORIZED'
            break
        case 403:
            message = 'Access forbidden'
            code = 'FORBIDDEN'
            break
        case 404:
            message = 'Resource not found'
            code = 'NOT_FOUND'
            break
        case 429:
            message = 'Too many requests. Please try again later'
            code = 'RATE_LIMITED'
            break
        case 500:
            message = 'Server error. Please try again later'
            code = 'SERVER_ERROR'
            break
    }

    return createAPIError(message, statusCode, code, error)
}

export const handleAuthError = (error: any): AuthError => {
    if (error instanceof AuthError) {
        return error
    }

    let message = 'Authentication failed'
    let code: string | undefined

    if (error?.message) {
        if (error.message.includes('Invalid credentials')) {
            message = 'Invalid email or password'
            code = 'INVALID_CREDENTIALS'
        } else if (error.message.includes('already exists')) {
            message = 'An account with this email already exists'
            code = 'USER_EXISTS'
        } else if (error.message.includes('Password')) {
            message = 'Password must be at least 8 characters long'
            code = 'WEAK_PASSWORD'
        } else if (error.message.includes('Email')) {
            message = 'Please enter a valid email address'
            code = 'INVALID_EMAIL'
        } else {
            message = error.message
        }
    }

    return createAuthError(message, code, error)
}

export const showErrorAlert = (
    error: AppError | Error,
    title: string = 'Error',
    onRetry?: () => void
) => {
    const message = error.message || 'An unexpected error occurred'

    const buttons = [
        {text: 'OK', style: 'default' as const}
    ]

    if (onRetry) {
        buttons.unshift({
            text: 'Retry',
            style: 'default' as const,
            onPress: onRetry
        })
    }

    Alert.alert(title, message, buttons)
}

export const getErrorMessage = (error: any): string => {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'string') {
        return error
    }

    if (error?.message) {
        return error.message
    }

    return 'An unexpected error occurred'
}

const isNetworkError = (error: any): boolean => {
    return (
        error?.name === 'NetworkError' ||
        error?.code === 'NETWORK_ERROR' ||
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch')
    )
}

export const shouldRetry = (error: AppError): boolean => {
    if (isNetworkError(error)) return true

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
    return error.statusCode ? retryableStatusCodes.includes(error.statusCode) : false
}