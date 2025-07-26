import { useCallback, useEffect, useRef, useState } from "react";

const useFetch = <T>(fetchFunction: () => Promise<T>, autoFetch= true) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController>()
    const isMountedRef = useRef(true)

    const fetchFunctionRef = useRef(fetchFunction)

    useEffect(() => {
        fetchFunctionRef.current = fetchFunction 
    }, [fetchFunction])

    const fetchData = useCallback (async () => {
        try {

            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            abortControllerRef.current = new AbortController()

            setLoading(true);
            setError(null);

            const result = await fetchFunctionRef.current();

            if (isMountedRef.current) {
                setData(result)
            }
        } catch (error) {
            if (isMountedRef.current && (error as any)?. name !== 'AbortError'){
                setError(error instanceof Error ? error : new Error('an error occurred'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [])

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            setLoading(false);
            setError(null);
            setData(null);
        }
    }, [])

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

    return { data, loading, error, refetch: fetchData, reset };
}

export default useFetch