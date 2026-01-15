import { client } from "@/services/appwrite";
import { generateAndSendOTP, verifyOTP } from "@/services/otp";
import { createLogger } from "@/utils/log";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from "react";
import { Account, Models } from "react-native-appwrite";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    sendOTP: (email: string) => Promise<{success: boolean; userId: string; message: string; resendDelay: number}>
    verifyOTPAndLogin: (userId: string, otp: string) => Promise<void>
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
    isAuthenticated: boolean;
}

interface SessionData {
    userId: string;
    sessionId: string;
    expires: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const logger = createLogger('AuthContext')

const account = new Account(client);

// secure storage keys
const STORAGE_KEYS = {
    SESSION: 'user_session',
    USER_DATA: 'user_data'
};

// session management utilities
const SessionManager = {
    async saveSession(sessionData: SessionData): Promise<void> {
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.SESSION, JSON.stringify(sessionData))
        } catch (error) {
            logger.error('Failed to save session:', error)
        }
    },

    async getSession(): Promise<SessionData | null> {
        try {
            const sessionString = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION)
            if (!sessionString) return null

            const session: SessionData = JSON.parse(sessionString)

            // check if session is expired
            if (new Date(session.expires) <= new Date()) {
                await this.clearSession()
                return null
            }

            return session
        } catch (error) {
            logger.error('Failed to get session:', error)
            return null
        }
    },

    async clearSession(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION)
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA)
        } catch (error) {
            logger.error('Failed to clear session:', error)
        }
    },

    async saveUserData(user: Models.User<Models.Preferences>): Promise<void>{
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
        } catch (error) {
            logger.error('Failed to save user data:', error)
        }
    },

    async getUserData(): Promise<Models.User<Models.Preferences> | null> {
        try {
            const userString = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA)
            return userString ? JSON.parse(userString) : null
        } catch (error) {
            logger.error('Failed to get user data:', error)
            return null
        }
    }
}

export const AuthProvider = ({ children }: {children: React.ReactNode}) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        initializeAuth();
    }, [])

    const initializeAuth = async () => {
        try {
            const savedSession = await SessionManager.getSession()

            if (savedSession) {
                try {
                    const currentUser = await account.get()
                    await SessionManager.saveUserData(currentUser)
                    setUser(currentUser)
                } catch (error) {
                    logger.info('Saved session invalid, attempting refresh:', error)
                    await attemptSessionRefresh()
                }
            } else {
                await checkCurrentUser()
            }
        } catch (error) {
            logger.debug('No active session found:', error)
            await SessionManager.clearSession()
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const checkCurrentUser = async () => {
        try {
            const currentUser = await account.get()

            const session = await account.getSession('current')

            await SessionManager.saveSession({
                userId: currentUser.$id,
                sessionId: session.$id,
                expires: session.expire
            })

            await SessionManager.saveUserData(currentUser)
            setUser(currentUser)
        } catch (error) {
            setUser(null)
            throw error
        }
    }

    const attemptSessionRefresh = async () => {
        try {
            const currentUser = await account.get()
            const session = await account.getSession('current')

            await SessionManager.saveSession({
                userId: currentUser.$id,
                sessionId: session.$id,
                expires: session.expire
            })

            await SessionManager.saveUserData(currentUser)
            setUser(currentUser)
        } catch (error) {
            logger.info('Session refresh failed')
            await SessionManager.clearSession()
            setUser(null)
            throw error
        }
    }

    const refreshSession = async () => {
       try {
        await attemptSessionRefresh()
       } catch (RefreshError) {
        logger.error('Session refresh error:', RefreshError)
        throw RefreshError
       } 
    }

    // OTP authentication methods
    const sendOTP = async (email: string) => {
        try {
            setLoading(true)

            // appwrite sends otp and returns userId for verification
            const result = await generateAndSendOTP(email)

            logger.info('OTP sent, userId received for verification')
            return result
        } catch (error) {
            logger.error('Send OTP error:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }
    
    const verifyOTPAndLogin = async (userId: string, otp: string) => {
        try {
            setLoading(true)

            // clean up any existing session
            try {
                await account.deleteSession('current')
            } catch (error) {
                logger.info('No existing session to delete', error)
            }

            // verify OTP
            await verifyOTP(userId, otp)

            logger.info('OTP verified successfully, creating session')

            // get newly created session and user
            const currentUser = await account.get()
            const session = await account.getSession('current')

            // save session and user data
            await SessionManager.saveSession({
                userId: currentUser.$id,
                sessionId: session.$id,
                expires: session.expire
            })

            await SessionManager.saveUserData(currentUser)
            setUser(currentUser)

            logger.info('User logged in successfully via OTP')

            router.replace('/(tabs)')
        } catch (verifyError: any) {
            logger.error('Verify OTP error:', verifyError)
            
            // clean up any partial session
            try {
                await account.deleteSession('current')
            } catch (cleanupError) {
                logger.debug('No session to delete:', cleanupError)
            }

            throw verifyError
        } finally {
            setLoading(false)
        }
}

    const logout = async () => {
        try {
            setLoading(true)
            await account.deleteSession('current')
            await SessionManager.clearSession()
            setUser(null)
            router.replace('/login')
        } catch (error) {
            logger.error('Logout error:', error)
            await SessionManager.clearSession()
            setUser(null)
            router.replace('/login')
            throw error
        } finally {
            setLoading(false)
        }
    }

    const value: AuthContextType = {
        user,
        loading,
        sendOTP,
        verifyOTPAndLogin,
        logout,
        refreshSession,
        isAuthenticated: !!user,
    }

    return React.createElement(
        AuthContext.Provider,
        {value},
        children
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}