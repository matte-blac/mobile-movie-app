import { createAuthError, handleAPIError } from "@/utils/errors"
import { Databases, ID, Query } from "react-native-appwrite"
import { client } from "./appwrite"


const DATABASE_ID =  process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const OTP_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_OTP_COLLECTION_ID!
const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY!
const FROM_EMAIL = process.env.EXPO_PUBLIC_FROM_EMAIL!

const database = new Databases(client)

const OTP_CONFIG = {
    LENGTH: 6,
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
    RATE_LIMIT_MINUTES: 1,
    RESEND_DELAY_SECONDS: 60,
}

const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: email,
                subject: 'Your Movie Explorer Verification Code',
                html: `
                <!DOCTYPE html>
                <html>
                    <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verification Code</title>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Movie Explorer</h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Your Verification Code</h2>
                                <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 24px;">
                                    Use the code below to complete your verification. This code will expire in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.
                                </p>
                                
                                <!-- OTP Code Box -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                    <td style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
                                        <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                        ${otp}
                                        </div>
                                    </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 20px;">
                                    If you didn't request this code, please ignore this email or contact support if you have concerns.
                                </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                                <p style="margin: 0; color: #999999; font-size: 12px;">
                                    © ${new Date().getFullYear()} Movie Explorer. All rights reserved.
                                </p>
                                </td>
                            </tr>
                            </table>
                        </td>
                        </tr>
                    </table>
                    </body>
                </html>
          `
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to send email')
        }

        return true
    } catch (error) {
        console.error('Resend email error:', error)
        throw createAuthError('Failed to send verification email', 'EMAIL_SEND_FAILED')
    }
}

// check if email can request new OTP (rate limiting)
const canRequestOTP = async (email: string): Promise<boolean> => {
    try {
        const now = new Date()
        const rateLimit = new Date(now.getTime() - OTP_CONFIG.RATE_LIMIT_MINUTES * 60 * 1000)

        const recentOTPs = await database.listDocuments(
            DATABASE_ID,
            OTP_COLLECTION_ID,
            [
                Query.equal('email', email.toLowerCase()),
                Query.greaterThan('created_at', rateLimit.toISOString()),
                Query.orderAsc('created_at'),
                Query.limit(1),
            ]
        )

        return recentOTPs.documents.length === 0
    } catch (error) {
        console.error('Rate limit check error:', error)
        return true // allow on error
    }
}

const cleanupExpiredOTPs = async (email: string): Promise<void> => {
    try {
        const now = new Date()
        const expiredOTPs = await database.listDocuments(
            DATABASE_ID,
            OTP_COLLECTION_ID,
            [
                Query.equal('email', email.toLowerCase()),
                Query.lessThan('expires_at', now.toISOString())
            ]
        )

        const deletePromises = expiredOTPs.documents.map((doc) => 
            database.deleteDocument(DATABASE_ID, OTP_COLLECTION_ID, doc.$id)
        )

        await Promise.all(deletePromises)
    } catch (error) {
        console.warn('Failed to cleanup expired OTPs:', error)
    }
}

export const generateAndSendOTP = async (email: string): Promise<{
    success: boolean
    message: string
    resendDelay: number
}> => {
    try {
        // validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            throw createAuthError('Invalid email address', 'INVALID_EMAIL')
        }

        // check rate limiting
        const canRequest = await canRequestOTP(email)
        if (!canRequest) {
            throw createAuthError(
                `Please wait ${OTP_CONFIG.RATE_LIMIT_MINUTES} minute(s) before requesting a new code`,
                'RATE_LIMITED'
            )
        }

        await cleanupExpiredOTPs(email)

        const otp = generateOTP()
        const now = new Date()
        const expiresAt = new Date(now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000)

        await sendOTPEmail(email, otp)

        // store OTP in database
        await database.createDocument(
            DATABASE_ID,
            OTP_COLLECTION_ID,
            ID.unique(),
            {
                email: email.toLowerCase(),
                otp_code: otp,
                expires_at: expiresAt.toISOString(),
                verified: false,
                attempts: 0,
                created_at: now.toISOString(),
            }
        )

        return {
            success: true,
            message: 'Verification code sent to your email',
            resendDelay: OTP_CONFIG.RESEND_DELAY_SECONDS,
        }
    } catch (error) {
        console.error('Generate OTP error:', error)
        if (error instanceof Error && error.message.includes('RATE_LIMITED')) {
            throw error
        }
        throw handleAPIError(error)
    }
}

export const verifyOTP = async (
    email: string,
    otp: string
): Promise<{
    success: boolean
    message: string
}> => {
    try {
        const now = new Date()

        // find valid OTP
        const otpRecords = await database.listDocuments(
            DATABASE_ID,
            OTP_COLLECTION_ID,
            [
                Query.equal('email', email.toLowerCase()),
                Query.equal('verified', false),
                Query.greaterThan('expires_at', now.toISOString()),
                Query.orderDesc('created_at'),
                Query.limit(1),
            ]
        )

        if (otpRecords.documents.length === 0) {
            throw createAuthError(
                'Invalid or expired verification code',
                'INVALID_OTP'
            )
        }

        const otpRecord = otpRecords.documents[0]

        // check max attempts
        if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
            throw createAuthError(
                'Maximum attempts exceeded. Request a new code',
                'MAX_ATTEMPTS_EXCEEDED'
            )
        }

        // verify otp
        if (otpRecord.otp_code !== otp) {
            // increment attempts
            await database.updateDocument(
                DATABASE_ID,
                OTP_COLLECTION_ID,
                otpRecord.$id,
                {
                    attempts: otpRecord.attempts + 1,
                }
            )

            const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (otpRecord.attempts + 1)
            throw createAuthError(
                `Invalid code. ${remainingAttempts} attempt(s) remaining`,
                'INVALID_OTP'
            )
        }

        // mark as verified
        await database.updateDocument(
            DATABASE_ID,
            OTP_COLLECTION_ID,
            otpRecord.$id,
            {
                verified: true,
            }
        )

        await cleanupExpiredOTPs(email)

        return {
            success: true,
            message: 'Verfication successful',
        }
    } catch (error) {
        console.error('Verify OTP error:', error)
        throw handleAPIError(error)
    }
}

export const getOTPStatus = async (email: string): Promise<{
    hasActiveOTP: boolean
    expiresAt?: string
    attemptsRemaining?: number
}> => {
    try {
        const now = new Date()
        const otpRecords = await database.listDocuments(
            DATABASE_ID,
            OTP_COLLECTION_ID,
            [
                Query.equal('email', email.toLowerCase()),
                Query.equal('verified', false),
                Query.greaterThan('expires_at', now.toISOString()),
                Query.orderDesc('created_at'),
                Query.limit(1),
            ]
        )

        if (otpRecords.documents.length === 0) {
            return {hasActiveOTP: false}
        }
        const otpRecord = otpRecords.documents[0]
        return {
            hasActiveOTP: true,
            expiresAt: otpRecord.expries_at,
            attemptsRemaining: OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts,
        }
    } catch (error) {
        console.warn('Get OTP status error:', error)
        return {hasActiveOTP: false}
    }
}

export const OTP_UI_CONFIG = {
    OTP_LENGTH: OTP_CONFIG.LENGTH,
    EXPIRY_MINUTES: OTP_CONFIG.EXPIRY_MINUTES,
    RESEND_DELAY_SECONDS: OTP_CONFIG.RESEND_DELAY_SECONDS,
    MAX_ATTEMPTS: OTP_CONFIG.MAX_ATTEMPTS,
}