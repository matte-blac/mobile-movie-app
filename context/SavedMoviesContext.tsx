import { getSavedMovies } from "@/services/appwrite"
import { handleAPIError } from "@/utils/errors"
import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"

const SavedMoviesContext = createContext<SavedMoviesContextType | undefined>(undefined)

export const useSavedMovies = (): SavedMoviesContextType => {
    const context = useContext(SavedMoviesContext)
    if (!context) {
        throw new Error('useSavedMovies must be used within a SavedMovies Provider')
    }
    return context
}

interface SavedMoviesProviderProps {
    children: React.ReactNode
}

export const SavedMoviesProvider: React.FC<SavedMoviesProviderProps> = ({children}) => {
    const [savedMoviesIds, setSavedMoviesIds] = useState<Set<number>>(new Set())
    const [savedMovies, setSavedMovies] = useState<SavedMovie[]>([])
    const [loading, setLoading] = useState(false)
    const {user, isAuthenticated} = useAuth()

    const refreshSavedMovies = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setSavedMoviesIds(new Set())
            setSavedMovies([])
            return
        }

        setLoading(true)
        try {
            const movies = await getSavedMovies()
            setSavedMovies(movies)
            setSavedMoviesIds(new Set(movies.map(movie => movie.movie_id)))
        } catch (error) {
            console.error('Error refreshing saved movies:', error)
            const appError = handleAPIError(error)

            if (appError.code === 'UNAUTHORIZED' || appError.code === 'NOT_AUTHENTICATED') {
                setSavedMoviesIds(new Set())
                setSavedMovies([])
            }
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated, user])
    
    const addSavedMovie = useCallback((movieId: number) => {
        setSavedMoviesIds(prev => new Set([...prev, movieId]))
        // No need for setTimeout here - let the API call handle the refresh
    }, [])

    const removeSavedMovie = useCallback((movieId: number) => {
        setSavedMoviesIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(movieId)
            return newSet
        })
        setSavedMovies(prev => prev.filter(movie => movie.movie_id !== movieId))
    }, [])

    const isMovieSaved = useCallback((movieId: number) => {
        return savedMoviesIds.has(movieId)
    }, [savedMoviesIds])

    // Initial load of saved movies
    useEffect(() => {
        if (isAuthenticated) {
            refreshSavedMovies();
        }
    }, [isAuthenticated, refreshSavedMovies])

    // Sync savedMoviesIds when savedMovies changes
    useEffect(() => {
        if (savedMovies.length >= 0) { // Changed from > 0 to >= 0 to handle empty arrays
            const movieIds = new Set(savedMovies.map(movie => movie.movie_id))
            setSavedMoviesIds(movieIds)
        }
    }, [savedMovies])

    const contextValue: SavedMoviesContextType = {
        savedMoviesIds,
        savedMovies,
        loading,
        refreshSavedMovies,
        addSavedMovie,
        removeSavedMovie,
        isMovieSaved,
    }

    return (
        <SavedMoviesContext.Provider value={contextValue}>
            {children}
        </SavedMoviesContext.Provider>
    )
}