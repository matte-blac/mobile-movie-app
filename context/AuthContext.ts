import { client } from "@/services/appwrite";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Account, ID, Models } from "react-native-appwrite";
import {router} from "expo-router";


interface AuthContextType {
    user: Models.User<Models.Preferences> | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, name: string) => Promise<void>
    logout: () => Promise<void>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const account = new Account(client)

export const AuthProvider = ({ children }: {children: React.ReactNode}) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkCurrentUser();
    }, [])

    const checkCurrentUser = async () => {
        try {
            const currentUser = await account.get()
            setUser(currentUser)
        } catch (error) {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email: string, password: string) => {
        try {
            await account.createEmailPasswordSession(email, password)
            const currentUser = await account.get()
            setUser(currentUser)
            router.replace('/(tabs)')
        } catch (error) {
            console.error('Login error:', error)
            throw error
        }
    }

    const register = async (email: string, password: string, name: string) => {
        try {
            await account.create(ID.unique(), email, password, name)
            await login(email, password)
            router.replace('/(tabs)')
        } catch (error) {
            console.error('Registration error:', error)
            throw error
        }
    }

    const logout = async () => {
        try {
            await account.deleteSession('current')
            setUser(null)
        } catch (error) {
            console.error('Logout error:', error)
            throw error
        }
    }

    const value: AuthContextType = {
        user,
        loading,
        login,
        register,
        logout,
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