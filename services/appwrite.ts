import { Client, Databases, ID, Query } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const SAVED_MOVIES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_SAVED_MOVIES_COLLECTION_ID!;

const client = new Client()
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const database = new Databases(client);

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
        console.log(error);
        throw error;
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
        console.log(error);
        return undefined;
    }
}

export const saveMovie = async (movie: Movie) => {
    try {
        const existingMovie = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movie.id)
        ])

        if (existingMovie.documents.length > 0) {
            throw new Error("Movie is already saved");
        }

        await database.createDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, ID.unique(), {
            movie_id: movie.id,
            title: movie.title,
            poster_path: `https://api.themoviedb.org/t/p/w500${movie.poster_path}`,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
            saved_at: new Date().toISOString()
        })

        return true;
    } catch (error) {
        console.error('Error saving movie:', error);
        throw error
    }
}

export const removeSavedMovie = async (movieId: number) => {
    try {
        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId)
        ]);

        if (result.documents.length > 0) {
            await database.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, result.documents[0].$id);
        }
        return true;
    } catch (error) {
        console.error('Error removing saved movie:', error)
        throw error
    }
}

export const getSavedMovies = async () => {
    try {
        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.orderDesc('saved_at'),
            Query.limit(100)
        ])

        return result.documents;
    } catch (error) {
        console.error('Error fetching saved movies:', error);
        throw error;
    }
}

export const isMovieSaved = async (movieId: number): Promise<boolean> => {
    try {
        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, [
            Query.equal('movie_id', movieId)
        ]);

        return result.documents.length > 0;
    } catch (error) {
        console.error('Error checking if movie is saved:', error);
        return false
    }
}

export const clearAllSavedMovies = async () => {
    try {
        const result = await database.listDocuments(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID)

        const deletePromises = result.documents.map(doc => 
            database.deleteDocument(DATABASE_ID, SAVED_MOVIES_COLLECTION_ID, doc.$id)
        )

        await Promise.all(deletePromises)
        return true
    } catch (error) {
        console.error('Error clearing saved movies:', error)
        throw error;
    }
}