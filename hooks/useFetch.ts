import { handleAPIError, shouldRetry } from "@/utils/errors";
import { useCallback, useEffect, useRef, useState } from "react";

// Enhanced cache entry interface
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
    isStale: boolean;
}

// Advanced cache manager with TTL and stale-while-revalidate
class AdvancedCache {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly maxSize = 200;
    private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
    private readonly defaultStaleTime = 2 * 60 * 1000; // 2 minutes

    set<T>(key: string, data: T, ttl?: number, staleTime?: number): void {
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }

        const now = Date.now();
        const actualTTL = ttl || this.defaultTTL;
        const actualStaleTime = staleTime || this.defaultStaleTime;

        this.cache.set(key, {
            data,
            timestamp: now,
            expiry: now + actualTTL,
            isStale: false
        });

        // Set up stale marking
        setTimeout(() => {
            const entry = this.cache.get(key);
            if (entry) {
                entry.isStale = true;
            }
        }, actualStaleTime);
    }

    get<T>(key: string): { data: T; isStale: boolean } | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return {
            data: entry.data,
            isStale: entry.isStale || (Date.now() - entry.timestamp > this.defaultStaleTime)
        };
    }

    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
                key,
                timestamp: entry.timestamp,
                expiry: entry.expiry,
                isStale: entry.isStale,
                age: Date.now() - entry.timestamp
            }))
        };
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
            
            const toRemove = sortedEntries.slice(0, 20);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }
}

// Global cache instance
const globalCache = new AdvancedCache();

// Enhanced options interface
interface EnhancedUseFetchOptions extends UseFetchOptions {
    enableRetry?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
    retryBackoff?: number;
    staleTime?: number;
    backgroundRefetch?: boolean;
    dedupe?: boolean;
    onSuccess?: (data: any) => void;
    onError?: (error: AppError) => void;
    onStaleData?: (data: any) => void;
}

// Request deduplication
const activeRequests = new Map<string, Promise<any>>();

const useFetch = <T>(
    fetchFunction: () => Promise<T>,
    options: EnhancedUseFetchOptions = {}
): AsyncOperation<T> & {
    isStale: boolean;
    refetchInBackground: () => Promise<void>;
    clearCache: () => void;
} => {
    
    const { 
        autoFetch = true, 
        cacheKey, 
        cacheDuration = 5 * 60 * 1000,
        enableRetry = true,
        retryAttempts = 3,
        retryDelay = 1000,
        retryBackoff = 2,
        staleTime = 2 * 60 * 1000,
        backgroundRefetch = true,
        dedupe = true,
        onSuccess,
        onError,
        onStaleData
    } = options;
    
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [isStale, setIsStale] = useState(false);

    const abortControllerRef = useRef<AbortController>();
    const isMountedRef = useRef(true);
    const fetchFunctionRef = useRef(fetchFunction);
    const lastFetchTimeRef = useRef<number>(0);
    const backgroundRefetchTimeoutRef = useRef<NodeJS.Timeout>();

    const minFetchInterval = 1000;

    useEffect(() => {
        fetchFunctionRef.current = fetchFunction;
    }, [fetchFunction]);

    const delay = useCallback((ms: number) => 
        new Promise(resolve => setTimeout(resolve, ms)), []
    );

    const performFetch = useCallback(async (
        isRetry = false, 
        bypassCache = false, 
        isBackground = false
    ): Promise<T> => {
        let retryCount = 0;
        let lastError: AppError;

        while (retryCount <= (enableRetry ? retryAttempts : 0)) {
            try {
                if (abortControllerRef.current && !isBackground) {
                    abortControllerRef.current.abort();
                }

                if (!isBackground) {
                    abortControllerRef.current = new AbortController();
                }

                const result = await fetchFunctionRef.current();
                
                // Cache successful result
                if (cacheKey) {
                    globalCache.set(cacheKey, result, cacheDuration, staleTime);
                }

                onSuccess?.(result);
                return result;
            } catch (error) {
                const appError = handleAPIError(error);
                lastError = appError;

                if (!enableRetry || retryCount >= retryAttempts || !shouldRetry(appError)) {
                    break;
                }

                retryCount++;
                const currentDelay = retryDelay * Math.pow(retryBackoff, retryCount - 1);
                
                console.log(`Retrying request (${retryCount}/${retryAttempts}) in ${currentDelay}ms...`);
                await delay(currentDelay);
            }
        }

        onError?.(lastError);
        throw lastError;
    }, [
        enableRetry, 
        retryAttempts, 
        retryDelay, 
        retryBackoff, 
        cacheKey, 
        cacheDuration, 
        staleTime,
        onSuccess,
        onError,
        delay
    ]);

    const fetchData = useCallback(async (bypassCache = false, isBackground = false) => {
        try {
            const now = Date.now();
            
            // Prevent rapid successive calls
            if (!isBackground && now - lastFetchTimeRef.current < minFetchInterval) {
                return;
            }

            // Check for active request (deduplication)
            if (!isBackground && dedupe && cacheKey && activeRequests.has(cacheKey)) {
                try {
                    const result = await activeRequests.get(cacheKey);
                    if (isMountedRef.current) {
                        setData(result);
                        setError(null);
                        setIsStale(false);
                    }
                    return;
                } catch (error) {
                    // Continue with normal flow if deduped request fails
                }
            }

            // Check cache first (unless bypassing or background refresh)
            if (!bypassCache && !isBackground && cacheKey) {
                const cached = globalCache.get<T>(cacheKey);
                if (cached && isMountedRef.current) {
                    setData(cached.data);
                    setError(null);
                    setIsStale(cached.isStale);
                    
                    if (cached.isStale) {
                        onStaleData?.(cached.data);
                        
                        // Trigger background refetch for stale data
                        if (backgroundRefetch) {
                            backgroundRefetchTimeoutRef.current = setTimeout(() => {
                                refetchInBackground();
                            }, 100);
                        }
                    }
                    
                    return;
                }
            }

            if (!isBackground) {
                lastFetchTimeRef.current = now;
                setLoading(true);
                setError(null);
            }

            // Create fetch promise for deduplication
            let fetchPromise: Promise<T>;
            
            if (dedupe && cacheKey && !activeRequests.has(cacheKey)) {
                fetchPromise = performFetch(false, bypassCache, isBackground);
                activeRequests.set(cacheKey, fetchPromise);
                
                // Clean up active request on completion
                fetchPromise.finally(() => {
                    activeRequests.delete(cacheKey);
                });
            } else {
                fetchPromise = performFetch(false, bypassCache, isBackground);
            }

            const result = await fetchPromise;

            if (isMountedRef.current) {
                setData(result);
                setIsStale(false);
            }
        } catch (error) {
            if (isMountedRef.current && 
                (error as any)?.name !== 'AbortError' && 
                !isBackground) {
                const appError = handleAPIError(error);
                setError(appError);
            }
        } finally {
            if (isMountedRef.current && !isBackground) {
                setLoading(false);
            }
        }
    }, [
        cacheKey, 
        performFetch, 
        backgroundRefetch, 
        dedupe,
        onStaleData
    ]);

    const refetchInBackground = useCallback(async () => {
        if (!cacheKey) return;
        
        try {
            const result = await performFetch(false, true, true);
            if (isMountedRef.current) {
                setData(result);
                setIsStale(false);
            }
        } catch (error) {
            console.warn('Background refetch failed:', error);
        }
    }, [cacheKey, performFetch]);

    const refetch = useCallback((bypassCache = false) => {
        return fetchData(bypassCache, false);
    }, [fetchData]);

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        if (backgroundRefetchTimeoutRef.current) {
            clearTimeout(backgroundRefetchTimeoutRef.current);
        }

        setLoading(false);
        setError(null);
        setData(null);
        setIsStale(false);
        
        // Clear cache for this key
        if (cacheKey) {
            globalCache.delete(cacheKey);
            activeRequests.delete(cacheKey);
        }
    }, [cacheKey]);

    const clearCache = useCallback(() => {
        if (cacheKey) {
            globalCache.delete(cacheKey);
        }
    }, [cacheKey]);

    useEffect(() => {
        isMountedRef.current = true;

        if (autoFetch) {
            fetchData();
        }

        return () => {
            isMountedRef.current = false;
            
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            if (backgroundRefetchTimeoutRef.current) {
                clearTimeout(backgroundRefetchTimeoutRef.current);
            }
        };
    }, [fetchData, autoFetch]);

    return { 
        data, 
        loading, 
        error, 
        refetch, 
        reset,
        isStale,
        refetchInBackground,
        clearCache,
        lastFetched: lastFetchTimeRef.current
    };
};

// Cache utilities for external use
export const cacheUtils = {
    getStats: () => globalCache.getStats(),
    clearAll: () => globalCache.clear(),
    remove: (key: string) => globalCache.delete(key),
    has: (key: string) => globalCache.has(key),
    preload: async <T>(key: string, fetcher: () => Promise<T>, ttl?: number, staleTime?: number) => {
        try {
            const data = await fetcher();
            globalCache.set(key, data, ttl, staleTime);
            return data;
        } catch (error) {
            console.error('Preload failed for key:', key, error);
            throw error;
        }
    }
};

export default useFetch;