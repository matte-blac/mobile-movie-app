import { handleAPIError } from "@/utils/errors"
import { useCallback, useEffect, useRef, useState } from "react"

// Search cache entry interface
interface SearchCacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
    query: string;
}

// Search-specific cache manager
class SearchCache {
    private cache = new Map<string, SearchCacheEntry<any>>();
    private readonly maxSize = 50;
    private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes for search results

    set<T>(query: string, data: T, ttl?: number): void {
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }

        const now = Date.now();
        const key = this.generateKey(query);
        
        this.cache.set(key, {
            data,
            timestamp: now,
            expiry: now + (ttl || this.defaultTTL),
            query: query.toLowerCase().trim()
        });
    }

    get<T>(query: string): T | null {
        const key = this.generateKey(query);
        const entry = this.cache.get(key);
        
        if (!entry) return null;

        // Check if expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    has(query: string): boolean {
        const key = this.generateKey(query);
        const entry = this.cache.get(key);
        
        if (!entry) return false;
        
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(query: string): void {
        const key = this.generateKey(query);
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Get similar queries from cache (for suggestions)
    getSimilar(query: string, limit = 5): string[] {
        const normalizedQuery = query.toLowerCase().trim();
        const results: string[] = [];
        
        for (const [, entry] of this.cache) {
            if (entry.query.includes(normalizedQuery) && entry.query !== normalizedQuery) {
                results.push(entry.query);
                if (results.length >= limit) break;
            }
        }
        
        return results.sort((a, b) => a.length - b.length);
    }

    getRecentQueries(limit = 10): string[] {
        const entries = Array.from(this.cache.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
            
        return entries.map(entry => entry.query);
    }

    private generateKey(query: string): string {
        return `search:${query.toLowerCase().trim()}`;
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
            
            const toRemove = sortedEntries.slice(0, 10);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }
}

// Global search cache
const searchCache = new SearchCache();

// Enhanced search options
interface EnhancedUseSearchOptions extends UseSearchOptions {
    enableRetry?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
    enableCache?: boolean;
    cacheTTL?: number;
    onSuccess?: (data: any, query: string) => void;
    onError?: (error: Error, query: string) => void;
    backgroundRefetch?: boolean;
    maxConcurrentRequests?: number;
}

// Request tracking for cancellation and deduplication
const activeSearchRequests = new Map<string, AbortController>();
const requestQueue = new Map<string, Promise<any>>();

export const useSearch = <T>(
    searchFunction: (query: string) => Promise<T>,
    options: EnhancedUseSearchOptions = {}
): UseSearchReturn<T> & {
    clearCache: () => void;
    getCachedQueries: () => string[];
    getSimilarQueries: (query: string) => string[];
    cancelSearch: () => void;
} => {
    const {
        debounceMs = 300, 
        minQueryLength = 2,
        enableRetry = true,
        retryAttempts = 2,
        retryDelay = 1000,
        enableCache = true,
        cacheTTL = 5 * 60 * 1000, // 5 minutes
        onSuccess,
        onError,
        backgroundRefetch = false,
        maxConcurrentRequests = 3
    } = options;

    const [query, setQuery] = useState('');
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const debounceTimeoutRef = useRef<NodeJS.Timeout>();
    const currentAbortControllerRef = useRef<AbortController>();
    const lastQueryRef = useRef('');
    const isMountedRef = useRef(true);
    const searchFunctionRef = useRef(searchFunction);
    const activeRequestsCount = useRef(0);

    // Update search function reference
    useEffect(() => {
        searchFunctionRef.current = searchFunction;
    }, [searchFunction]);

    // Utility function for delays
    const delay = useCallback((ms: number) => 
        new Promise(resolve => setTimeout(resolve, ms)), []
    );

    // Cancel current search
    const cancelSearch = useCallback(() => {
        if (currentAbortControllerRef.current) {
            currentAbortControllerRef.current.abort();
        }
        
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        setLoading(false);
        setIsSearching(false);
    }, []);

    // Perform search with retry logic
    const performSearch = useCallback(async (
        searchQuery: string,
        abortController: AbortController
    ): Promise<T> => {
        let retryCount = 0;
        let lastError: Error;

        while (retryCount <= (enableRetry ? retryAttempts : 0)) {
            try {
                // Check if request was aborted
                if (abortController.signal.aborted) {
                    throw new Error('Request aborted');
                }

                // Limit concurrent requests
                if (activeRequestsCount.current >= maxConcurrentRequests) {
                    await new Promise(resolve => {
                        const checkInterval = setInterval(() => {
                            if (activeRequestsCount.current < maxConcurrentRequests || 
                                abortController.signal.aborted) {
                                clearInterval(checkInterval);
                                resolve(undefined);
                            }
                        }, 100);
                    });
                }

                if (abortController.signal.aborted) {
                    throw new Error('Request aborted');
                }

                activeRequestsCount.current++;

                try {
                    const result = await searchFunctionRef.current(searchQuery);
                    
                    // Cache successful result
                    if (enableCache) {
                        searchCache.set(searchQuery, result, cacheTTL);
                    }

                    onSuccess?.(result, searchQuery);
                    return result;
                } finally {
                    activeRequestsCount.current--;
                }
            } catch (error: any) {
                activeRequestsCount.current = Math.max(0, activeRequestsCount.current - 1);
                
                if (error.message === 'Request aborted' || error.name === 'AbortError') {
                    throw error;
                }

                const appError = handleAPIError(error);
                lastError = appError;

                // Check if we should retry
                if (retryCount < retryAttempts && enableRetry && !abortController.signal.aborted) {
                    retryCount++;
                    const currentDelay = retryDelay * Math.pow(1.5, retryCount - 1);
                    
                    console.log(`Search retry ${retryCount}/${retryAttempts} in ${currentDelay}ms for query: ${searchQuery}`);
                    await delay(currentDelay);
                    continue;
                }

                break;
            }
        }

        onError?.(lastError, searchQuery);
        throw lastError;
    }, [
        enableRetry,
        retryAttempts,
        retryDelay,
        enableCache,
        cacheTTL,
        maxConcurrentRequests,
        onSuccess,
        onError,
        delay
    ]);

    // Execute search with caching and deduplication
    const executeSearch = useCallback(async (searchQuery: string) => {
        // Skip if query is too short
        if (searchQuery.length < minQueryLength) {
            setData(null);
            setLoading(false);
            setError(null);
            setIsSearching(false);
            return;
        }

        // Skip if same query as last one
        if (searchQuery === lastQueryRef.current) {
            return;
        }

        // Cancel previous request
        if (currentAbortControllerRef.current) {
            currentAbortControllerRef.current.abort();
        }

        // Check cache first
        if (enableCache) {
            const cachedResult = searchCache.get<T>(searchQuery);
            if (cachedResult && isMountedRef.current) {
                lastQueryRef.current = searchQuery;
                setData(cachedResult);
                setLoading(false);
                setError(null);
                setIsSearching(false);
                
                // Optionally refresh in background
                if (backgroundRefetch) {
                    setTimeout(() => {
                        if (!isMountedRef.current || query !== searchQuery) return;
                        
                        const backgroundController = new AbortController();
                        performSearch(searchQuery, backgroundController)
                            .then(freshData => {
                                if (isMountedRef.current && query === searchQuery) {
                                    setData(freshData);
                                }
                            })
                            .catch(error => {
                                console.warn('Background search refresh failed:', error);
                            });
                    }, 1000);
                }
                
                return;
            }
        }

        // Check for existing request (deduplication)
        const requestKey = `search:${searchQuery}`;
        if (requestQueue.has(requestKey)) {
            try {
                const result = await requestQueue.get(requestKey);
                if (isMountedRef.current && searchQuery === lastQueryRef.current) {
                    setData(result);
                    setLoading(false);
                    setError(null);
                    setIsSearching(false);
                }
                return;
            } catch (error) {
                // Continue with new request if deduped request fails
            }
        }

        lastQueryRef.current = searchQuery;
        currentAbortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        setIsSearching(true);

        // Create and store request promise for deduplication
        const requestPromise = performSearch(searchQuery, currentAbortControllerRef.current);
        requestQueue.set(requestKey, requestPromise);

        // Clean up request queue entry when done
        requestPromise.finally(() => {
            requestQueue.delete(requestKey);
        });

        try {
            const result = await requestPromise;

            if (searchQuery === lastQueryRef.current && isMountedRef.current) {
                setData(result);
            }
        } catch (err: any) {
            if (searchQuery === lastQueryRef.current && 
                isMountedRef.current && 
                err.name !== 'AbortError' && 
                err.message !== 'Request aborted') {
                const appError = handleAPIError(err);
                setError(appError);
                setData(null);
            }
        } finally {
            if (searchQuery === lastQueryRef.current && isMountedRef.current) {
                setLoading(false);
                setIsSearching(false);
            }
        }
    }, [minQueryLength, enableCache, backgroundRefetch, performSearch, query]);

    // Debounced search
    const debouncedSearch = useCallback((searchQuery: string) => {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Clear results if query is empty
        if (!searchQuery.trim()) {
            setData(null);
            setLoading(false);
            setError(null);
            setIsSearching(false);
            lastQueryRef.current = '';
            return;
        }

        // Set searching state immediately for queries that meet minimum length
        if (searchQuery.length >= minQueryLength && isMountedRef.current) {
            setLoading(true);
            setError(null);
            setIsSearching(true);
        }

        // Debounce the actual search
        debounceTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                executeSearch(searchQuery.trim());
            }
        }, debounceMs);
    }, [debounceMs, executeSearch, minQueryLength]);

    // Update query and trigger search
    const updateQuery = useCallback((newQuery: string) => {
        setQuery(newQuery);
        debouncedSearch(newQuery);
    }, [debouncedSearch]);

    // Clear search
    const clearSearch = useCallback(() => {
        setQuery('');
        setData(null);
        setLoading(false);
        setError(null);
        setIsSearching(false);
        lastQueryRef.current = '';

        cancelSearch();
    }, [cancelSearch]);

    // Retry current search
    const retry = useCallback(() => {
        if (query && query.length >= minQueryLength) {
            executeSearch(query.trim());
        }
    }, [query, minQueryLength, executeSearch]);

    // Cache management utilities
    const clearCache = useCallback(() => {
        searchCache.clear();
    }, []);

    const getCachedQueries = useCallback(() => {
        return searchCache.getRecentQueries();
    }, []);

    const getSimilarQueries = useCallback((searchQuery: string) => {
        return searchCache.getSimilar(searchQuery);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            cancelSearch();
        };
    }, [cancelSearch]);

    return {
        query,
        data,
        loading,
        error,
        updateQuery,
        clearSearch,
        retry,
        isSearching,
        clearCache,
        getCachedQueries,
        getSimilarQueries,
        cancelSearch
    };
};

// Export cache utilities for external use
export const searchCacheUtils = {
    clear: () => searchCache.clear(),
    getRecentQueries: (limit?: number) => searchCache.getRecentQueries(limit),
    getSimilar: (query: string, limit?: number) => searchCache.getSimilar(query, limit),
    has: (query: string) => searchCache.has(query),
    delete: (query: string) => searchCache.delete(query)
};