import { handleAPIError, shouldRetry } from "@/utils/errors";
import { useCallback, useEffect, useRef, useState } from "react";

const useFetch = <T>(
    fetchFunction: () => Promise<T>,
     options: UseFetchOptions = {}
    ): AsyncOperation<T> => {
    
    const {autoFetch = true} = options
    
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);

    const abortControllerRef = useRef<AbortController>()
    const isMountedRef = useRef(true)
    const fetchFunctionRef = useRef(fetchFunction)
    const retryCountRef = useRef(0)

    const maxRetries = 10
    const baseRetryDelay = 1000

    useEffect(() => {
        fetchFunctionRef.current = fetchFunction 
    }, [fetchFunction])

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const fetchData = useCallback (async (isRetry = false) => {
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            abortControllerRef.current = new AbortController()

            if (!isRetry) {
                retryCountRef.current = 0
            }

            setLoading(true);
            setError(null);

            const result = await fetchFunctionRef.current();

            if (isMountedRef.current) {
                setData(result)
                retryCountRef.current = 0
            }
        } catch (error) {
            if (isMountedRef.current && (error as any)?. name !== 'AbortError'){
                const appError = handleAPIError(error)
                
                if (!isRetry && shouldRetry(appError) && retryCountRef.current < maxRetries) {
                    retryCountRef.current++
                    const retryDelay = baseRetryDelay * Math.pow(2, retryCountRef.current - 1)

                    console.log(`Retrying request in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`)

                    await delay(retryDelay)

                    if (isMountedRef.current) {
                        return fetchData(true)
                    }
                }

                setError(appError)
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [])

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
         }   
            setLoading(false);
            setError(null);
            setData(null);
        
    }, [])

    const refetch = useCallback(() => {
        return fetchData(false)
    }, [fetchData])

    useEffect(() => {
        isMountedRef.current = true

        if(autoFetch) {
            fetchData();
        }

        return () => {
            isMountedRef.current = false
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [fetchData, autoFetch]);

    return { data, loading, error, refetch, reset };
}

export default useFetch