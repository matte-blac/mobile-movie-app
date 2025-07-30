import { handleAPIError } from "@/utils/errors"

export const TMDB_CONFIG = {
    BASE_URL: 'https://api.themoviedb.org/3',
    API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
    }
}

const apiRequest = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: TMDB_CONFIG.headers,
            ...options
        })

        if (!response.ok) {
            throw handleAPIError({
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    data: await response.json().catch(() => ({}))
                }
            })
        }

        return await response.json()
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw handleAPIError({
                message: 'Network error. Please check your internet connection.',
                code: 'NETWORK_ERROR'
            })
        }
        throw handleAPIError(error)
    }
}

export const fetchMovies = async ({ query }: { query: string }) => {
    const endpoint = query 
    ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
    : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc`;

    try {
        const data = await apiRequest<TMDBResponse<Movie>>(endpoint)
        return data.results || []
    } catch (error) {
        console.error('Failed to fetch movies:', error)
        throw error
    }
}

export const fetchMovieDetails = async (movieId: string): Promise<MovieDetails> => {
    const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`
    
    try {
         {
            return await apiRequest<MovieDetails>(endpoint)
        }
    } catch (error) {
        console.error('Failed to fetch movie details:', error);
        throw error;
    }
}

export const getImageUrl = (path: string | null): string | undefined => {
    if (!path) return undefined 
    return `https://image.tmdb.org/t/p/w342/${path}`
}

export const getPlaceholderImageUrl = (title: string, width: number = 342, height: number = 513): string => {
    const encodedTitle = encodeURIComponent(title)
    return `https://placehold.co/${width}x${height}/1a1a1a/ffffff.png?text=${encodedTitle}`
}