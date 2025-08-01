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
    private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
    private readonly maxSize = 100;

    set<T>(key: string, data: T, ttl?: number): void {
        // Clean up if cache is too large
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }

        const expiry = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, { data, timestamp: Date.now(), expiry });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
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
        
        // Remove expired entries first
        entries.forEach(([key, entry]) => {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        });

        // If still too large, remove oldest entries
        if (this.cache.size >= this.maxSize) {
            const sortedEntries = entries
                .filter(([key]) => this.cache.has(key))
                .sort(([, a], [, b]) => a.timestamp - b.timestamp);
            
            const toRemove = sortedEntries.slice(0, this.cache.size - this.maxSize + 10);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }
}

// Global cache instance
const requestCache = new RequestCache();

// Retry configuration
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

// Request options interface
interface RequestOptions extends RequestInit {
    retryConfig?: Partial<RetryConfig>;
    cacheKey?: string;
    cacheTTL?: number;
    staleTime?: number;
    enableCache?: boolean;
    enableRetry?: boolean;
}

// Sleep utility for delays
const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

// Calculate retry delay with exponential backoff and jitter
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    const clampedDelay = Math.min(exponentialDelay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * clampedDelay;
    return clampedDelay + jitter;
};

// Check if error is retryable
const isRetryableError = (error: any): boolean => {
    if (!error.response) {
        // Network errors are retryable
        return error.name === 'TypeError' && error.message.includes('fetch');
    }
    
    const status = error.response.status;
    return [408, 429, 500, 502, 503, 504].includes(status);
};

// Enhanced API request function with retry logic and caching
const apiRequest = async <T>(
    endpoint: string, 
    options: RequestOptions = {}
): Promise<T> => {
    const {
        retryConfig = {},
        cacheKey,
        cacheTTL,
        staleTime = 2 * 60 * 1000, // 2 minutes
        enableCache = true,
        enableRetry = true,
        ...requestOptions
    } = options;

    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    // Check cache first
    if (enableCache && cacheKey) {
        const cachedData = requestCache.get<T>(cacheKey);
        if (cachedData) {
            // Return cached data immediately
            const isStale = requestCache.isStale(cacheKey, staleTime);
            
            if (!isStale) {
                return cachedData;
            }
            
            // Stale-while-revalidate: return stale data but trigger background refresh
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

    // Perform the request
    const data = await performRequest<T>(endpoint, requestOptions, config, enableRetry);
    
    // Cache successful response
    if (enableCache && cacheKey) {
        requestCache.set(cacheKey, data, cacheTTL);
    }
    
    return data;
};

// Perform the actual request with retry logic
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
                
                // Check if we should retry
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
            
            // Handle network errors
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
            
            // If it's already a handled API error, don't retry
            throw error;
        }
    }
    
    throw lastError;
};

// Enhanced movie fetching with caching and retry
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
            cacheTTL: query ? 10 * 60 * 1000 : 30 * 60 * 1000, // Search: 10min, Discover: 30min
            staleTime: query ? 5 * 60 * 1000 : 15 * 60 * 1000, // Search: 5min, Discover: 15min
            ...options
        });
        
        return data.results || [];
    } catch (error) {
        console.error('Failed to fetch movies:', error);
        throw error;
    }
};

// Enhanced movie details fetching
export const fetchMovieDetails = async (
    movieId: string, 
    options: Partial<RequestOptions> = {}
): Promise<MovieDetails> => {
    const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`;
    const cacheKey = `movie-details-${movieId}`;
    
    try {
        return await apiRequest<MovieDetails>(endpoint, {
            cacheKey,
            cacheTTL: 60 * 60 * 1000, // 1 hour cache for movie details
            staleTime: 30 * 60 * 1000, // 30 minutes stale time
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

// Cache management utilities
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
    }
};