import { createAuthError, handleAPIError } from "@/utils/errors"
import { logger } from "@/utils/log"
import { Account, ID } from "react-native-appwrite"
import { client } from "./appwrite"

const account = new Account(client)

const OTP_CONFIG = {
    LENGTH: 6,
    EXPIRY_MINUTES: 15,
    RESEND_DELAY_SECONDS: 60,
}

const validateEmail = (email: string): void => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        throw createAuthError('Invalid email address', 'INVALID_EMAIL')
    }
}

export const generateAndSendOTP = async (email: string): Promise<{
    success: boolean
    message: string
    userId: string
    resendDelay: number
}> => {
    try {
        validateEmail(email)

        logger.info('Requesting OTP generation via Appwrite')

        const token = await account.createEmailToken(
            ID.unique(),
            email.toLowerCase()
        )

        logger.info('OTP generated and sent via Appwrite')
        logger.debug(`OTP token ID: ${token.$id}, user ID: ${token.userId}`)

        return {
            success: true,
            userId: token.userId,
            message: 'Verification code sent to your email',
            resendDelay: OTP_CONFIG.RESEND_DELAY_SECONDS,
        }
    } catch (error: any) {
        logger.error('Generate OTP error:', error)

        // hanlde appwrite-specific errors
        if (error.code === 429) {
            throw createAuthError(
                `Too many requests. Please wait before requesting a new code`,
                'RATE_LIMITED'
            )
        }
        
        if (error.type === 'user_invalid_token') {
            throw createAuthError(
                'Invalid email address',
                'INVALID_EMAIL'
            )
        }

        throw handleAPIError(error)
    }
}

export const verifyOTP = async (
    userId: string,
    otp: string
): Promise<{
    success: boolean
    message: string
    sessionId: string
}> => {
    try {
        // validate inputs
        if (!userId || typeof userId !== 'string') {
            logger.error('Invalid userId:', typeof userId, userId)
            throw createAuthError(
                'User ID and OTP are required', 
                'MISSING_PARAMETERS'
            )
        }

        if (!otp || typeof otp !== 'string') {
            logger.error('Invalid OTP format:', typeof otp, otp)
            throw createAuthError(
                'User ID and OTP are required', 
                'MISSING_PARAMETERS'
            )
        }

        // validate userId length
        if (userId.length > 36) {
            logger.error('UserId too long:', userId.length)
            throw createAuthError(
                'Invalid user ID format. Please request a new verification code.',
                'INVALID_USER_ID_LENGTH'
            )
        }

        // validate OTP format
        if (!/^\d{6}$/.test(otp)) {
            throw createAuthError(
                'Invalid OTP format', 
                'INVALID_OTP_FORMAT'
            )
        }

        logger.info('Verifying OTP userId:', userId)
        logger.debug('OTP length:', otp.length, 'OTP value:', otp)
        logger.debug('UserId length:', userId.length, 'UserId:', userId)

        const session = await account.createSession(userId, otp)

        logger.info('OTP verified successfully via Appwrite')
        
        return {
            success: true,
            message: 'OTP verified successfully',
            sessionId: session.$id,
        }
    } catch (error: any) {
        logger.error('Verify OTP error:', error)

        // handle appwrite-specific errors
        if (error.code === 401) {
            throw createAuthError(
                'Invalid or expired OTP', 
                'INVALID_OR_EXPIRED_OTP'
            )
        }

        if (error.type === 'user_invalid_token') {
            throw createAuthError(
                'Invalid OTP',
                'INVALID_OTP'
            )
        }

        if (error.type === 429) {
            throw createAuthError(
                'Too many requests. Please wait before requesting a new code',
                'RATE_LIMITED'
            )
        }

        throw handleAPIError(error)
    }
}

export const resendOTP = async (email: string): Promise<{
    success: boolean
    message: string
    resendDelay: number
    userId: string
}> => {
    try {
        logger.info('Resending OTP via Appwrite')

        const result = await generateAndSendOTP(email)

        return {
            ...result,
            message: 'Verification code resent to your email',
        }
    } catch (error) {
        logger.error('Resend OTP error:', error)
        throw error
    }
}

export const checkActiveSession = async (): Promise<boolean> => {
    try {
        await account.get()
        return true
    } catch (error) {
        return false
    }
}

export const deleteCurrentSession = async (): Promise<void> => {
    try {
        await account.deleteSession('current')
        logger.info('Current session deleted successfully')
    } catch (error) {
        logger.error('Delete session error:', error)
        throw handleAPIError(error)
    }
}

export const OTP_UI_CONFIG = {
    OTP_LENGTH: OTP_CONFIG.LENGTH,
    EXPIRY_MINUTES: OTP_CONFIG.EXPIRY_MINUTES,
    RESEND_DELAY_SECONDS: OTP_CONFIG.RESEND_DELAY_SECONDS,
}