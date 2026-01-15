const IS_DEV = __DEV__

// sensitive patterns to redact
const SENSITIVE_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\+?\d{10,}/g,
    password: /(password|pwd|pass)[\s:=]+[^\s&]+/gi,
    token: /(token|jwt|bearer|auth)[\s:=]+[^\s&]+/gi,
    apiKey: /(api[_-]?key|secret[_-]?key)[\s:=]+[^\s&]+/gi,
    sessionId: /(session[_-]?id|sid)[\s:=]+[^\s&]+/gi
}

// sensitive object keys to redact
const SENSITIVE_KEYS = new Set([
    'password',
    'pwd',
    'pass',
    'token',
    'jwt',
    'bearer',
    'auth',
    'authentication',
    'api_key',
    'apiKey',
    'secret',
    'secret_key',
    'session',
    'sessionId',
    'otp',
    'otpCode'
])

// removing/ masking sensitive info from logs
function sanitizeValue(value: any, key?: string): any {
    // check if the key is sensitive
    if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
        return '[REDACTED]'
    }

    // handle null/undefined
    if (value === null || value === undefined) {
        return value
    }

    // handle strings
    if (typeof value === 'string') {
        let sanitized = value

        // redact sensitive patterns
        Object.entries(SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
            sanitized = sanitized.replace(pattern, `[REDACTED_${type.toUpperCase()}]`)
        })

        return sanitized
    }

    // handle arrays
    if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(item, `${key}[${index}]`))
    }

    // handle objects
    if (typeof value === 'object') {
        const sanitized: any = {}

        for (const [objKey, objValue] of Object.entries(value)) {
            sanitized[objKey] = sanitizeValue(objValue, objKey)
        }

        return sanitized
    }

    return value
}

// safe logging
function sanitizeError(error: any): any {
    if (!error) return error

    const sanitized: any = {
        message: error.message ? sanitizeValue(error.message) : 'Unknown error',
        name: error.name || 'Error'
    }

    if (IS_DEV && error.stack) {
        sanitized.stack = error.stack
    }

    // include error code if present
    if (error.code) {
        sanitized.code = error.code
    }

    // include status code if present
    if (error.statusCode) {
        sanitized.statusCode = error.statusCode
    }

    return sanitized
}

function formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` [${context}]` : ''
    return `[${timestamp}]${contextStr} ${level}: ${message}`
}

class SecureLogger {
    private context?: string

    constructor(context?: string) {
        this.context = context
    }

    // development log
    info(message: string, ...args: any[]): void {
        if (!IS_DEV) return

        const sanitizedArgs = args.map(arg => sanitizeValue(arg))
        console.log(formatMessage('INFO', message, this.context), ...sanitizedArgs)
    }

    // warning log
    warn(message: string, ...args: any[]): void {
        const sanitizedArgs = args.map(arg => sanitizeValue(arg))
        console.warn(formatMessage('WARN', message, this.context), ...sanitizedArgs)
    }

    // error log
    error(message: string, error?: any, context?: Record<string, any>): void {
        const sanitizedError = error ? sanitizeError(error) : undefined
        const sanitizedContext = context ? sanitizeValue(context) : undefined

        if (IS_DEV) {
            console.error(
                formatMessage('ERROR', message, this.context),
                sanitizedError,
                sanitizedContext
            )
        } else {
            // in production, log minimal error info
            console.log(
                formatMessage('ERROR', message, this.context),
                {
                    message: sanitizedError?.message || 'An error occurred',
                    code: sanitizedError?.code,
                }
            )
        }

        // crash reporting integration
    }

    // debug log
    debug(message: string, ...args: any[]): void {
        if (!IS_DEV) return

        const sanitizedArgs = args.map(arg => sanitizeValue(arg))
        console.debug(formatMessage('DEBUG', message, this.context), ...sanitizedArgs)
    }

    // child log
    child(childContext: string): SecureLogger {
        const fullContext = this.context
            ? `${this.context}:${childContext}`
            : childContext
        return new SecureLogger(fullContext)
    }
}

// log instance
export function createLogger(context?: string): SecureLogger {
    return new SecureLogger(context)
}

// default log instance
export const logger = new SecureLogger()

export { sanitizeError, sanitizeValue }
