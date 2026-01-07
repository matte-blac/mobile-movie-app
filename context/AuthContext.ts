import { client } from "@/services/appwrite";
import { generateAndSendOTP, verifyOTP } from "@/services/otp";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from "react";
import { Account, ID, Models } from "react-native-appwrite";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    sendOTP: (email: string) => Promise<{success: boolean; message: string; resendDelay: number}>
    verifyOTPAndLogin: (email: string, otp: string, name?: string) => Promise<void>
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

const account = new Account(client);

// secure storage keys
const STORAGE_KEYS = {
    SESSION: 'user_session',
    USER_DATA: 'user_data'
};

// generate consistent password from email for otp auth
const generatePasswordFromEmail = (email: string): string => {
    // use a consistent algorith to generate password from email
    const normalized = email.toLowerCase().trim()

    // create a deterministic but secure password
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // convert to 32bit int
    }
    
    // make hash positive and convert to string
    const hashStr = Math.abs(hash).toString()

    const password = `Otp${hashStr}Auth${normalized.length}Key!`

        return password
}

// session management utilities
const SessionManager = {
    async saveSession(SessionData: SessionData): Promise<void> {
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.SESSION, JSON.stringify(SessionData))
        } catch (error) {
            console.error('Failed to save session:', error)
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
            console.error('Failed to get session:', error)
            return null
        }
    },

    async clearSession(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION)
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA)
        } catch (error) {
            console.error('Failed to clear session:', error)
        }
    },

    async saveUserData(user: Models.User<Models.Preferences>): Promise<void>{
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
        } catch (error) {
            console.error('Failed to save user data:', error)
        }
    },

    async getUserData(): Promise<Models.User<Models.Preferences> | null> {
        try {
            const userString = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA)
            return userString ? JSON.parse(userString) : null
        } catch (error) {
            console.error('Failed to get user data:', error)
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
                    console.log('Saved session invalid, attempting refresh...')
                    await attemptSessionRefresh()
                }
            } else {
                await checkCurrentUser()
            }
        } catch (error) {
            console.log('No active session found')
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
            // Try to refresh the current session by getting the current user
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
            console.log('Session refresh failed')
            await SessionManager.clearSession()
            setUser(null)
            throw error
        }
    }

    const refreshSession = async () => {
       try {
        await attemptSessionRefresh()
       } catch (RefreshError) {
        console.error('Session refresh error:', RefreshError)
        throw RefreshError
       } 
    }

    // OTP authentication methods
    const sendOTP = async (email: string) => {
        try {
            setLoading(true)
            const result = await generateAndSendOTP(email)
            return result
        } catch (error) {
            console.error('Send OTP error:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const verifyOTPAndLogin = async (email: string, otp: string, name?: string) => {
        try {
        setLoading(true)

        // verify custom OTP first
        const verificationResult = await verifyOTP(email, otp)
        if (!verificationResult.success) {
            throw new Error('OTP verification failed')
        }

        // clean up any existing sessions
        try {
            await account.deleteSession('current')
        } catch (error) {
            console.log('No session to delete', error)
        }

        // generate consistent password from email
        const password = generatePasswordFromEmail(email)
        const userId = ID.unique()
        
        let isNewUser = false

        try {
            // create a new account
            await account.create(
                userId,
                email,
                password,
                name || undefined
            )

            console.log('New account created')
            isNewUser = true
        } catch (createError: any) {
            if (createError.code === 409) {
                console.log('Existing user, proceeding to login')
                isNewUser = false
            } else {
                console.error('Account creation error:', createError)
                throw new Error('Failed to create account. Please try again.')
            }
        }

        // create email session with the consistent password
        try {
            await account.createEmailPasswordSession(email, password)
            console.log('Session created successfully')
        } catch (sessionError: any) {
            console.error('Session creation error:', sessionError)
            throw new Error('Failed to create session. Please try again.')
        }

        // if existing user needs to update their name
        if (!isNewUser && name) {
            try {
                await account.updateName(name)
                console.log('Name updated for existing user')
            } catch (nameError) {
                console.warn('Could not update name:', nameError)
            }
        } 
        
        const currentUser = await account.get()
        const session = await account.getSession('current')

        await SessionManager.saveSession({
            userId: currentUser.$id,
            sessionId: session.$id,
            expires: session.expire
        })

        await SessionManager.saveUserData(currentUser)
        setUser(currentUser)

        router.replace('/(tabs)')
    } catch (VerifyError: any) {
        console.error('Verify OTP and login error:', VerifyError)

        // clean up any session on error
        try {
            await account.deleteSession('current')
        } catch (cleanupError) {
            console.log('No session to clean up:', cleanupError)
        }
        throw VerifyError
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
            console.error('Logout error:', error)
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