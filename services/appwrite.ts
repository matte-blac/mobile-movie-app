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

    throw handleAPIError(error)
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
        handleAppwriteError(error, 'Get trending movies')
        return []
    }
}

export const saveMovie = async (movie: Movie) => {
    try {
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
    } catch (error) {
        handleAppwriteError(error, 'Save movie')
        return false
    }
}

export const removeSavedMovie = async (movieId: number) => {
    try {

        const userId = await getCurrentUserId()
        
        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId),
            Query.equal('user_id', userId)
        ]);

        if (result.documents.length > 0) {
            await database.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, result.documents[0].$id);
        }
        return true;
    } catch (error) {
       handleAppwriteError(error, 'Remove saved movie')
        return false
    }
}

export const getSavedMovies = async () => {
    try {

        const userId = await getCurrentUserId()

        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('user_id', userId),
            Query.orderDesc('saved_at'),
            Query.limit(100)
        ])

        return result.documents;
    } catch (error) {
        handleAppwriteError(error, 'Get saved movies')
        return []
    }
}

export const isMovieSaved = async (movieId: number): Promise<boolean> => {
    try {

        const userId = await getCurrentUserId()

        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId),
            Query.equal('user_id', userId)
        ]);

        return result.documents.length > 0;
    } catch (error) {
        handleAppwriteError(error, 'Error checking if movie is saved')
        return false
    }
}

export const clearAllSavedMovies = async () => {
    try {

        const userId = await getCurrentUserId()

        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('user_id', userId)
        ])

        const deletePromises = result.documents.map(doc => 
            database.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, doc.$id)
        )

        await Promise.all(deletePromises)
        return true
    } catch (error) {
        handleAppwriteError(error, 'Clear all saved movies')
        return false
    }
}