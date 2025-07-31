import { client } from "@/services/appwrite";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from "react";
import { Account, ID, Models } from "react-native-appwrite";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
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
       } catch (error) {
        console.error('Session refresh error:', error)
        throw error
       } 
    }

    const login = async (email: string, password: string) => {
        try {
            setLoading(true)

            const session = await account.createEmailPasswordSession(email, password)
            const currentUser = await account.get()

            await SessionManager.saveSession({
                userId: currentUser.$id,
                sessionId: session.$id,
                expires: session.expire
            })

            await SessionManager.saveUserData(currentUser)
            setUser(currentUser)

            router.replace('/(tabs)')
        } catch (error) {
            console.error('Login error:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const register = async (email: string, password: string, name: string) => {
        try {
            setLoading(true)
            
            await account.create(ID.unique(), email, password, name)

            await login(email, password)
            // router.replace('/(tabs)')
        } catch (error) {
            console.error('Registration error:', error)
            throw error
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
        login,
        register,
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