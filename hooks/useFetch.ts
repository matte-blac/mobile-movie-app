import { handleAPIError, shouldRetry } from "@/utils/errors";
import { useCallback, useEffect, useRef, useState } from "react";

const useFetch = <T>(
    fetchFunction: () => Promise<T>,
    options: UseFetchOptions = {}
): AsyncOperation<T> => {
    
    const { autoFetch = true, cacheKey, cacheDuration = 5 * 60 * 1000 } = options; // 5 minutes default cache
    
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);

    const abortControllerRef = useRef<AbortController>();
    const isMountedRef = useRef(true);
    const fetchFunctionRef = useRef(fetchFunction);
    const retryCountRef = useRef(0);
    const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
    const lastFetchTimeRef = useRef<number>(0);

    const maxRetries = 3;
    const baseRetryDelay = 1000;
    const minFetchInterval = 1000; // Prevent rapid successive fetches

    useEffect(() => {
        fetchFunctionRef.current = fetchFunction;
    }, [fetchFunction]);

    const delay = useCallback((ms: number) => 
        new Promise(resolve => setTimeout(resolve, ms)), []
    );

    const getCachedData = useCallback((key: string): T | null => {
        if (!key) return null;
        
        const cached = cacheRef.current.get(key);
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > cacheDuration;
        if (isExpired) {
            cacheRef.current.delete(key);
            return null;
        }
        
        return cached.data;
    }, [cacheDuration]);

    const setCachedData = useCallback((key: string, data: T) => {
        if (!key) return;
        cacheRef.current.set(key, { data, timestamp: Date.now() });
    }, []);

    const fetchData = useCallback(async (isRetry = false, bypassCache = false) => {
        try {
            // Prevent rapid successive calls
            const now = Date.now();
            if (now - lastFetchTimeRef.current < minFetchInterval && !isRetry) {
                return;
            }
            lastFetchTimeRef.current = now;

            // Check cache first
            if (cacheKey && !bypassCache && !isRetry) {
                const cachedData = getCachedData(cacheKey);
                if (cachedData && isMountedRef.current) {
                    setData(cachedData);
                    setError(null);
                    return;
                }
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            if (!isRetry) {
                retryCountRef.current = 0;
            }

            setLoading(true);
            setError(null);

            const result = await fetchFunctionRef.current();

            if (isMountedRef.current) {
                setData(result);
                retryCountRef.current = 0;
                
                // Cache the result
                if (cacheKey) {
                    setCachedData(cacheKey, result);
                }
            }
        } catch (error) {
            if (isMountedRef.current && (error as any)?.name !== 'AbortError') {
                const appError = handleAPIError(error);
                
                if (!isRetry && shouldRetry(appError) && retryCountRef.current < maxRetries) {
                    retryCountRef.current++;
                    const retryDelay = baseRetryDelay * Math.pow(2, retryCountRef.current - 1);

                    console.log(`Retrying request in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);

                    await delay(retryDelay);

                    if (isMountedRef.current) {
                        return fetchData(true, bypassCache);
                    }
                }

                setError(appError);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [cacheKey, getCachedData, setCachedData, delay]);

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setLoading(false);
        setError(null);
        setData(null);
        retryCountRef.current = 0;
        
        // Clear cache for this key
        if (cacheKey) {
            cacheRef.current.delete(cacheKey);
        }
    }, [cacheKey]);

    const refetch = useCallback((bypassCache = false) => {
        return fetchData(false, bypassCache);
    }, [fetchData]);

    // Cleanup cache periodically
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of cacheRef.current.entries()) {
                if (now - cached.timestamp > cacheDuration) {
                    cacheRef.current.delete(key);
                }
            }
        }, cacheDuration);

        return () => clearInterval(cleanupInterval);
    }, [cacheDuration]);

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
        };
    }, [fetchData, autoFetch]);

    return { 
        data, 
        loading, 
        error, 
        refetch, 
        reset,
        // Additional utilities
        isStale: cacheKey ? !getCachedData(cacheKey) : false,
        lastFetched: lastFetchTimeRef.current
    };
};

export default useFetch;