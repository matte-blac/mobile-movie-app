import { useEffect, useState } from "react"

export interface ValidationResult {
    isValid: boolean
    error?: string
}

export interface ValidationRules {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: string) => ValidationResult
}

export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{4,}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
} as const;

export const ValidationMessages = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    password: 'Password must be at least 4 characters with uppercase, lowercase and number',
    strongPassword: 'Password must contain uppercase, lowercase, number and special characters',
    name: 'Name must be 2-50 characters and contain only letters and spaces',
    minLength: (min: number) => `Must be at least ${min} characters long`,
    maxLength: (max: number) => `Must be no more than ${max} characters long`,
    passwordMismatch: 'Passwords do not match'
} as const;

export const validateField = (value: string, rules: ValidationRules): ValidationResult => {
    // Check if rules is defined
    if (!rules) {
        return { isValid: true };
    }

    // required validation
    if (rules.required && (!value || value.trim().length === 0)) {
        return {isValid: false, error: ValidationMessages.required}
    }

    // skip other validations if field is empty and not required
    if (!value || value.trim().length === 0) {
        return {isValid: true}
    }

    // min length validation
    if (rules.minLength && value.length < rules.minLength) {
        return {isValid: false, error: ValidationMessages.minLength(rules.minLength)}
    }

    // max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
        return {isValid: false, error: ValidationMessages.maxLength(rules.maxLength)}
    }

    // pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
        // return specific error messages for known patterns
        if (rules.pattern.source === ValidationPatterns.email.source) {
            return {isValid: false, error: ValidationMessages.email}
        }
        if (rules.pattern.source === ValidationPatterns.password.source) {
            return {isValid: false, error: ValidationMessages.password}
        }
        if (rules.pattern.source === ValidationPatterns.strongPassword.source) {
            return {isValid: false, error: ValidationMessages.strongPassword}
        }
        if (rules.pattern.source === ValidationPatterns.name.source) {
            return {isValid: false, error: ValidationMessages.name}
        }
        return {isValid: false, error: 'Invalid Format'}
    }

    if (rules.custom) {
        return rules.custom(value)
    }

    return {isValid: true}
}

// predefined validation rules for common fields
export const CommonValidationRules: Record<string, ValidationRules> = {
    email: {
        required: true,
        pattern: ValidationPatterns.email,
        maxLength: 255
    },
    password: {
        required: true,
        pattern: ValidationPatterns.password,
        minLength: 4
    },
    strongPassword: {
        required: true,
        pattern: ValidationPatterns.strongPassword,
        minLength: 8
    },
    name: {
        required: true,
        pattern: ValidationPatterns.name,
        maxLength: 50,
        minLength: 2
    }
} as const;

export const validateForm = (
    FormData: Record<string, string>,
    ValidationRules: Record<string, ValidationRules>
): {isValid: boolean; errors: Record<string, string>} => {
    const errors: Record<string, string> = {}
    let isValid = true

    Object.keys(ValidationRules).forEach(field => {
        const value = FormData[field] || ''
        const rules = ValidationRules[field]
        const result = validateField(value, rules)

        if (!result.isValid) {
            errors[field] = result.error || 'Invalid'
            isValid = false
        }
    })

    return {isValid, errors}
}

export const validatePasswordConfirmation = (
    password: string,
    confirmPassword: string,
): ValidationResult => {
    if (password !== confirmPassword) {
        return {isValid: false, error: ValidationMessages.passwordMismatch}
    }
    return {isValid: true}
}

// real-time validation hook
export const useFieldValidation = (
    value: string,
    rules: ValidationRules,
    validateOnChange: boolean = true
) => {
    const [error, setError] = useState<string | undefined>()
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (validateOnChange && touched) {
            const result = validateField(value, rules)
            setError(result.error)
        }
    }, [value, rules, validateOnChange, touched])

    const validate = () => {
        setTouched(true)
        const result = validateField(value, rules)
        setError(result.error)
        return result
    }

    const clearError = () => {
        setError(undefined)
    }

    return {
        error,
        hasError: !!error,
        validate,
        clearError,
        touched
    }
}