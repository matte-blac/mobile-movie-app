import { createAuthError, handleAPIError } from "@/utils/errors";
import { Account, Client, Databases, ID, Query } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const SAVED_MOVIES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_SAVED_MOVIES_COLLECTION_ID!;

export const client = new Client()
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const database = new Databases(client);
const account = new Account(client)

export const SessionUtils = {
    async getCurrentSession() {
        try {
            return await account.getSession('current')
        } catch (error) {
            throw createAuthError('No active session', 'NO_SESSION')
        }
    },
     
    async refreshSession() {
        try {
            const currentSession = await account.getSession('current')

            const expiryTime = new Date(currentSession.expire)
            const now = new Date()
            const oneHour = 60 * 60 * 1000

            if (expiryTime.getTime() - now.getTime() < oneHour) {
                const user = await account.get()
                return {refreshed: true, user}
            }

            return {refreshed: false, session: currentSession}
        } catch (error) {
            throw createAuthError('Failed to refresh session', 'REFRESH_FAILED')
        }
    },

    async validateSession() {
        try {
            const user = await account.get()
            const session = await account.getSession('current')

            const expiryTime = new Date(session.expire)
            const now = new Date()

            if (expiryTime <= now) {
                throw createAuthError('Session expired', 'SESSION_EXPIRED')
            }

            return {user, session, isValid: true}
        } catch (error) {
            throw createAuthError('Invalid session', 'INVALID_SESSION')
        }
    }
}

const getCurrentUserId = async (): Promise<string> => {
    try {
        const user = await account.get()
        return user.$id
    } catch (error) {
        throw createAuthError ('User not authenticated', 'NOT_AUTHENTICATED')
    }
}

const handleAppwriteError = (error: any, operation: string) => {
    console.error(`${operation} error:`, error)

    if (error.code === 401) {
        throw createAuthError('Authentication required', 'UNAUTHORIZED')
    }

    if (error.code === 403) {
        throw createAuthError('Access forbidden', 'FORBIDDEN')
    }

    if (error.code === 429) {
        throw handleAPIError({
            message: 'Too many requests. Please try again later',
            code: 'RATE_LIMITED'
        })
    }

    if (error.type === 'document_not_found') {
        throw handleAPIError({
            message: 'Resource not found',
            code: 'NOT_FOUND'
        })
    }

    if (error.type === 'document_already_exists') {
        throw handleAPIError({
            message: 'Resource already exists',
            code: 'ALREADY_EXISTS'
        })
    }

    throw handleAPIError(error)
}

const withSessionValidation = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    retryCount: number = 0
): Promise<T> => {
    const maxRetries = 10

    try {
        await SessionUtils.validateSession()
        return await operation()
    } catch (error: any) {
        if (
            (error.code === 'INVALID_REASON' || error.code === 'SESSION_EXPIRED' || error.code === 'UNAUTHORIZED') &&
            retryCount < maxRetries
        ) {
            try {
                await SessionUtils.refreshSession()
                return await withSessionValidation(operation, operationName, retryCount + 1)
            } catch (refreshError) {
                throw createAuthError('Session refresh failed. Please log in again', 'SESSION_REFRESH_FAILED')
            }
        }

        handleAppwriteError(error, operationName)
        throw error
    }
}

export const updateSearchCount = async (query: string, movie: Movie) => {
    try {
        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.equal('searchTerm', query)
        ])

        if (result.documents.length > 0) {
            const existingMovie = result.documents[0];

            await database.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                existingMovie.$id,
                {
                    count: parseInt(existingMovie.count) + 1,
                }
            )
        } else {
            await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
                searchTerm: query,
                movie_id: movie.id,
                count: 1,
                title: movie.title,
                poster_url: `https://api.themoviedb.org/t/p/w500${movie.poster_path}`,
            })
        }
    } catch (error) {
        handleAppwriteError(error, 'Update search count')
    }
}

export const getTrendingMovies = async (): Promise<TrendingMovie[] | undefined> => {
    try {
        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(5),
            Query.orderDesc('count'),
        ])
        return result.documents as unknown as TrendingMovie[];
    } catch (error) {
        console.warn('Failed to get trending movies:', error)
        return []
    }
}

export const saveMovie = async (movie: Movie): Promise<boolean> => {

    return withSessionValidation(async () =>{ 
        const userId = await getCurrentUserId()

        const existingMovie = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movie.id),
            Query.equal('user_id', userId)
        ])

        if (existingMovie.documents.length > 0) {
            throw handleAPIError({
                message: 'Movie is already saved',
                code: 'ALREADY_EXISTS'
            })
        }

        await database.createDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, ID.unique(), {
            user_id: userId,
            movie_id: movie.id,
            title: movie.title,
            poster_path: `https://api.themoviedb.org/t/p/w500${movie.poster_path}`,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
            saved_at: new Date().toISOString()
        })

        return true;
    }, 'Save movie')
}

export const removeSavedMovie = async (movieId: number): Promise<boolean> => {
    return withSessionValidation(async () =>{
        const userId = await getCurrentUserId()
        
        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId),
            Query.equal('user_id', userId)
        ]);

        if (result.documents.length > 0) {
            await database.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, result.documents[0].$id);
        }
        return true;
    }, 'Remove saved movie')
}

export const getSavedMovies = async (): Promise<SavedMovie[]> => {
    return withSessionValidation(async () =>{

        const userId = await getCurrentUserId()

        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('user_id', userId),
            Query.orderDesc('saved_at'),
            Query.limit(100)
        ])

        return result.documents as unknown as SavedMovie[]
    }, 'Get saved movies')
}

export const isMovieSaved = async (movieId: number): Promise<boolean> => {
    return withSessionValidation(async () =>{

        const userId = await getCurrentUserId()

        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId),
            Query.equal('user_id', userId)
        ]);

        return result.documents.length > 0;
    }, 'Check if movie is saved')
}

export const clearAllSavedMovies = async (): Promise<boolean> => {
    return withSessionValidation(async () =>{

        const userId = await getCurrentUserId()

        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('user_id', userId)
        ])

        const batchSize = 10
        for (let i = 0; i < result.documents.length; i += batchSize) {
            const batch = result.documents.slice(i, i + batchSize)
            const deletePromises = batch.map(doc => 
                database.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, doc.$id) 
            )
            await Promise.all(deletePromises)
        }
        return true
    }, 'Clear all saved movies')
}

export const AuthService = {
    async checkAuthStatus() {
        try {
            const {user, session, isValid} = await SessionUtils.validateSession()
            return {isAuthenticated: isValid, user, session}
        } catch (error) {
            return {isAuthenticated: false, user: null, session: null}
        }
    },

    async refreshUserSession() {
        try {
            const result = await SessionUtils.refreshSession()
            if (result.refreshed) {
                return { success: true, user: result.user}
            }
            return { success: true, user: result.session}
        } catch (error) {
            return {success: false, error}
        }
    },

    async logout() {
        try {
            await account.deleteSession('current')
            return {success: true}
        } catch (error) {
            console.error('Logout error:', error)
            return {success: false, error}
        }
    }
}