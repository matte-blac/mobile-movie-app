import { getSavedMovies } from "@/services/appwrite"
import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"


interface SavedMovie {
    $id: string
    movie_id: number
    title: string
    poster_path: string
    vote_average: number
    release_date: string;
    saved_at: string
    user_id: string
}

interface SavedMoviesContextType {
    savedMoviesIds: Set<number>
    savedMovies: SavedMovie[]
    refreshSavedMovies: () => Promise<void>
    addSavedMovie: (movieId: number) => void
    removeSavedMovie: (movieId: number) => void
    isMovieSaved: (movieId: number) => boolean
}

const SavedMoviesContext = createContext<SavedMoviesContextType | undefined>(undefined)

export const SavedMoviesProvider = ({ children }: {children: React.ReactNode}) => {
    const [savedMoviesIds, setSavedMoviesIds] = useState<Set<number>>(new Set())
    const [savedMovies, setSavedMovies] = useState<SavedMovie[]>([])
    const {user, isAuthenticated} = useAuth()

    const refreshSavedMovies = async () => {
        if (!isAuthenticated || !user) {
            setSavedMovies([])
            setSavedMoviesIds(new Set())
            return
        }

        try {
            const movies = await getSavedMovies()
            const movieData = movies || []
            const ids = new Set(movieData.map(movie => movie.movie_id))

            setSavedMovies(movieData as SavedMovie[])
            setSavedMoviesIds(ids)
        } catch (error) {
            console.error('Error refreshing saved movies:', error)
            setSavedMovies([])
            setSavedMoviesIds(new Set())
        }
    }
    const addSavedMovie = (movieId: number) => {
        setSavedMoviesIds(prev => new Set([...prev, movieId]))
        refreshSavedMovies()
    }

    const removeSavedMovie = (movieId: number) => {
        setSavedMoviesIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(movieId)
            return newSet
        })

        setSavedMovies(prev => prev.filter(movie => movie.movie_id !== movieId))
    }

    const isMovieSaved = (movieId: number) => {
        return savedMoviesIds.has(movieId)
    }

    useEffect(() => {
        refreshSavedMovies();
    }, [user?.$id, isAuthenticated])

    const value: SavedMoviesContextType = {
        savedMoviesIds,
        savedMovies,
        refreshSavedMovies,
        addSavedMovie,
        removeSavedMovie,
        isMovieSaved,
    }

    return React.createElement(
        SavedMoviesContext.Provider,
        {value},
        children
    )
}

export const useSavedMovies = () => {
    const context = useContext(SavedMoviesContext)
    if (context === undefined) {
        throw new Error('useSavedMovies must be used within an SavedMoviesProvider')
    }
    return context
}