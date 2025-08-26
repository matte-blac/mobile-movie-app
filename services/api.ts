import { handleAPIError } from "@/utils/errors"

export const TMDB_CONFIG = {
    BASE_URL: 'https://api.themoviedb.org/3',
    API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
    }
}

// Cache interface
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

// Cache manager class
class RequestCache {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly defaultTTL = 5 * 60 * 1000;
    private readonly maxSize = 100;

    set<T>(key: string, data: T, ttl?: number): void {
        // clean up if cache is too large
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }

        const expiry = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, { data, timestamp: Date.now(), expiry });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // check if expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    isStale(key: string, staleTime: number = 2 * 60 * 1000): boolean {
        const entry = this.cache.get(key);
        if (!entry) return true;
        
        return Date.now() - entry.timestamp > staleTime;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    private cleanup(): void {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        
        // remove expired entries first
        entries.forEach(([key, entry]) => {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        });

        // if still too large, remove oldest entries
        if (this.cache.size >= this.maxSize) {
            const sortedEntries = entries
                .filter(([key]) => this.cache.has(key))
                .sort(([, a], [, b]) => a.timestamp - b.timestamp);
            
            const toRemove = sortedEntries.slice(0, this.cache.size - this.maxSize + 10);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }
}

// global cache instance
const requestCache = new RequestCache();

// retry configuration
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
};

// request options interface
interface RequestOptions extends RequestInit {
    retryConfig?: Partial<RetryConfig>;
    cacheKey?: string;
    cacheTTL?: number;
    staleTime?: number;
    enableCache?: boolean;
    enableRetry?: boolean;
}

// sleep utility for delays
const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

// calculate retry delay with exponential backoff and jitter
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    const clampedDelay = Math.min(exponentialDelay, config.maxDelay);
    
    // add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * clampedDelay;
    return clampedDelay + jitter;
};

// check if error is retryable
const isRetryableError = (error: any): boolean => {
    if (!error.response) {
        // network errors are retryable
        return error.name === 'TypeError' && error.message.includes('fetch');
    }
    
    const status = error.response.status;
    return [408, 429, 500, 502, 503, 504].includes(status);
};

// enhanced API request function with retry logic and caching
const apiRequest = async <T>(
    endpoint: string, 
    options: RequestOptions = {}
): Promise<T> => {
    const {
        retryConfig = {},
        cacheKey,
        cacheTTL,
        staleTime = 2 * 60 * 1000,
        enableCache = true,
        enableRetry = true,
        ...requestOptions
    } = options;

    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    // check cache first
    if (enableCache && cacheKey) {
        const cachedData = requestCache.get<T>(cacheKey);
        if (cachedData) {
            // Return cached data immediately
            const isStale = requestCache.isStale(cacheKey, staleTime);
            
            if (!isStale) {
                return cachedData;
            }
            
            // stale-while-revalidate: return stale data but trigger background refresh
            const backgroundRefresh = async () => {
                try {
                    const freshData = await performRequest<T>(endpoint, requestOptions, config, enableRetry);
                    requestCache.set(cacheKey, freshData, cacheTTL);
                } catch (error) {
                    console.warn('Background refresh failed:', error);
                }
            };
            
            backgroundRefresh();
            return cachedData;
        }
    }

    // perform the request
    const data = await performRequest<T>(endpoint, requestOptions, config, enableRetry);
    
    // cache successful response
    if (enableCache && cacheKey) {
        requestCache.set(cacheKey, data, cacheTTL);
    }
    
    return data;
};

// perform the actual request with retry logic
const performRequest = async <T>(
    endpoint: string,
    requestOptions: RequestInit,
    retryConfig: RetryConfig,
    enableRetry: boolean
): Promise<T> => {
    let lastError: any;
    const maxAttempts = enableRetry ? retryConfig.maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: TMDB_CONFIG.headers,
                ...requestOptions
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = {
                    response: {
                        status: response.status,
                        statusText: response.statusText,
                        data: errorData
                    }
                };
                
                // check if we should retry
                if (attempt < maxAttempts && enableRetry && isRetryableError(error)) {
                    const delay = calculateRetryDelay(attempt, retryConfig);
                    console.log(`Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
                    await sleep(delay);
                    continue;
                }
                
                throw handleAPIError(error);
            }

            return await response.json();
        } catch (error) {
            lastError = error;
            
            // handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = {
                    message: 'Network error. Please check your internet connection.',
                    code: 'NETWORK_ERROR'
                };
                
                if (attempt < maxAttempts && enableRetry) {
                    const delay = calculateRetryDelay(attempt, retryConfig);
                    console.log(`Network error (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
                    await sleep(delay);
                    continue;
                }
                
                throw handleAPIError(networkError);
            }
            
            // if it's already a handled API error, don't retry
            throw error;
        }
    }
    
    throw lastError;
};

// enhanced movie fetching with paination support
export const fetchMovies = async ({ 
    query, 
    page = 1,
    options = {}
}: { 
    query: string; 
    page?: number;
    options?: Partial<RequestOptions>;
}) => {
    const endpoint = query 
        ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}`
        : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc&page=${page}`;

    const cacheKey = query 
        ? `search-movies-${query}-${page}`
        : `discover-movies-${page}`;

    try {
        const data = await apiRequest<TMDBResponse<Movie>>(endpoint, {
            cacheKey,
            cacheTTL: query ? 10 * 60 * 1000 : 30 * 60 * 1000,
            staleTime: query ? 5 * 60 * 1000 : 15 * 60 * 1000,
            ...options
        });
        
        return data.results || [];
    } catch (error) {
        console.error('Failed to fetch movies:', error);
        throw error;
    }
};

// enhanced movie details fetching with full pagination metadata
export const fetchMoviePagination = async ({
    query,
    page = 1,
    options = {}
}: {
    movieId: string, 
    options: Partial<RequestOptions>
}): Promise<PaginatedMoviesResponse> => {
    const endpoint = query
        ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}`
        : `${TMDB_CONFIG.BASE_URL}/discover/movie?sort_by=popularity.desc&page=${page}`

    const cacheKey = query
        ? `paginated-search-movies-${query}-${page}`
        : `paginated-discover-movies-${page}`
    
    try {
        const data = await apiRequest<TMDBResponse<Movie>>(endpoint, {
            cacheKey,
            cacheTTL: query ? 10 * 60 * 1000: 30 * 60 * 1000,
            staleTime: query ? 5 * 60 * 1000: 15 * 60 * 1000,
            ...options
        });

        // validate response structure
        const currentPage = Math.max(1, data.page || page)
        const totalPages = Math.max(1, data.total_pages || 1)
        const totalResults = Math.max(0, data.total_results || 0)
        const movies = data.results || []

        return {
            movies,
            pagination: {
                currentPage,
                totalPages,
                totalResults,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1
            }
        }
    } catch (error) {
        console.error('Failed to fetch movies with pagination', error);
        throw error;
    }
};

// batch fetch multiple pages at once
export const fetchMoviesBatch = async ({
    query,
    startPage = 1,
    pageCount = 3,
    options = {}
}: {
    query: string
    startPage?: number
    pageCount?: number
    options?: Partial<RequestOptions>
}): Promise<{
    movies: Movie[]
    pagination: {
        startPage: number
        endPage: number
        totalPages: number
        totalResults: number
        hasMorePages: boolean
    }
}> => {
    try {
        // fetch multiple pages concurrently
        const pagePromises = Array.from({length: pageCount}, (_, index) => 
            fetchMoviePagination({
                query,
                page: startPage + index,
                options
            })
        )

        const results = await Promise.allSettled(pagePromises)
        const successfulResults = results
            .filter((result): result is PromiseFulfilledResult<PaginatedMoviesResponse> => 
                result.status === 'fulfilled'
            )
            .map(result => result.value)

        if (successfulResults.length === 0) {
            throw new Error('All page requests failed')
        }

        // combine all movies from successful requests
        const allMovies = successfulResults.flatMap(result => result.movies)

        // use pagination info from the first successful result
        const firstResult = successfulResults[0]
        const endPage = startPage + successfulResults.length - 1

        return {
            movies: allMovies,
            pagination: {
                startPage,
                endPage,
                totalPages: firstResult.pagination.totalPages,
                totalResults: firstResult.pagination.totalResults,
                hasMorePages: endPage < firstResult.pagination.totalPages
            }
        }
    } catch (error) {
        console.error('Failed t fetch movies batch:', error)
        throw error
    }
}

// enhanced movie details fetching
export const fetchMovieDetails = async (
    movieId: string, 
    options: Partial<RequestOptions> = {}
): Promise<MovieDetails> => {
    const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`;
    const cacheKey = `movie-details-${movieId}`;
    
    try {
        return await apiRequest<MovieDetails>(endpoint, {
            cacheKey,
            cacheTTL: 60 * 60 * 1000, 
            staleTime: 30 * 60 * 1000, 
            ...options
        });
    } catch (error) {
        console.error('Failed to fetch movie details:', error);
        throw error;
    }
};

// Utility functions for image URLs
export const getImageUrl = (path: string | null, size: string = 'w342'): string | undefined => {
    if (!path) return undefined;
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getPlaceholderImageUrl = (title: string, width: number = 342, height: number = 513): string => {
    const encodedTitle = encodeURIComponent(title);
    return `https://placehold.co/${width}x${height}/1a1a1a/ffffff.png?text=${encodedTitle}`;
};

// enhanced search with built-in pagination
export const searchMoviesWithPagination = async (
    query: string,
    page: number = 1,
    options: Partial<RequestOptions> = {}
): Promise<PaginatedMoviesResponse> => {
    if (!query.trim()) {
        throw new Error('Search query cannot be empty')
    }

    return fetchMoviePagination({
        query: query.trim(),
        page,
        options: {
            cacheTTL: 5 * 60 * 1000,
            staleTime: 2 * 60 * 1000,
            ...options
        }
    })
}

// preload next page for smooth pagination
export const preloadNextPage = async (
    query: string,
    currentPage: number,
    options: Partial<RequestOptions> = {}
): Promise<void> => {
    try {
        const nextPage = currentPage + 1
        await fetchMoviePagination({
            query,
            page: nextPage,
            options: {
                cacheTTL: 10 * 60 * 1000,
                ...options
            }
        })
        console.log(`Preload page ${nextPage} for query: ${query}`)
    } catch (error) {
        console.warn('Failed to preload next page:', error)
    }
}

// cache management utilities
export const cacheUtils = {
    clearCache: () => requestCache.clear(),
    removeFromCache: (key: string) => requestCache.delete(key),
    getCacheSize: () => requestCache['cache'].size,
    preloadData: async <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => {
        try {
            const data = await fetcher();
            requestCache.set(key, data, ttl);
            return data;
        } catch (error) {
            console.error('Preload failed:', error);
            throw error;
        }
    },
    // clear pagination caches for a specific query
    clearPaginationCache: (query: string) => {
        const keysToDelete: string[] = []
        requestCache['cache'].forEach((_, key) => {
            if (key.includes(`-movies-${query}-`) || key.includes(`paginated-`)) {
                keysToDelete.push(key)
            }
        })
        keysToDelete.forEach(key => requestCache.delete(key))
    },

    // get cache statistics
    getCacheStats: () => {
        const cache = requestCache['cache']
        const now = Date.now()
        const entries = Array.from(cache.entries())

        return {
            totalEntries: cache.size,
            expiredEntries: entries.filter(([_, entry]) => now > entry.expiry).length,
            staleEntries: entries.filter(([_, entry]) =>
                 now - entry.timestamp > 2 * 60 * 1000 && now <= entry.expiry).length,
            freshEntries: entries.filter(([_, entry]) => 
                now - entry.timestamp <= 2 * 60 * 1000 && now <= entry.expiry).length,
        }
    }
};