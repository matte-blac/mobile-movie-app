import { useCallback, useEffect, useRef, useState } from "react"


interface useSearchOptions {
    debounceMs?: number
    minQueryLength?: number
}

export const useSearch = <T>(
    searchFunction: (query: string) => Promise<T>,
    options: useSearchOptions = {}
) => {
    const {debounceMs = 300, minQueryLength = 2 } = options

    const [query, setQuery] = useState('')
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const debounceTimeoutRef = useRef<NodeJS.Timeout>()
    const abortControllerRef = useRef<AbortController>()
    const lastQueryRef = useRef('')

    const executeSearch = useCallback(async (searchQuery: string) => {
        // cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // skip if query is too short
        if (searchQuery.length < minQueryLength) {
            setData(null)
            setLoading(false)
            setError(null)
            return
        }

        // skip if same query as last one
        if (searchQuery === lastQueryRef.current) {
            return
        }

        lastQueryRef.current = searchQuery
        abortControllerRef.current = new AbortController()

        setLoading(true)
        setError(null)

        try {
            const results = await searchFunction(searchQuery)

            // only update if this still the current query
            if (searchQuery === lastQueryRef.current) {
                setData(results)
            }
        } catch (err) {
            if (searchQuery === lastQueryRef.current && (err as any)?. name !== 'AbortError') {
                setError(err instanceof Error ? err : new Error('Search failed'))
                setData(null)
            }
        } finally {
            if (searchQuery === lastQueryRef.current) {
                setLoading(false)
            }
        }
    },[minQueryLength, searchFunction])

    const debouncedSearch = useCallback((searchQuery: string) => {
        // clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        // if query is empty, clear results
        if (!searchQuery.trim()) {
            setData(null)
            setLoading(false)
            setError(null)
            lastQueryRef.current = ''
            return
        }

        if (searchQuery.length >= minQueryLength) {
             setLoading(true)
        setError(null)
        }

        debounceTimeoutRef.current = setTimeout(() => {
            executeSearch(searchQuery.trim())
        }, debounceMs)
    }, [debounceMs, executeSearch, minQueryLength])

    const updateQuery = useCallback((newQuery: string) => {
        setQuery(newQuery)
        debouncedSearch(newQuery)
    }, [debouncedSearch])

    const clearSearch = useCallback(() => {
        setQuery('')
        setData(null)
        setLoading(false)
        setError(null)
        lastQueryRef.current = ''

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
    }, [])

    // cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    return {
        query,
        data,
        loading,
        error,
        updateQuery,
        clearSearch,
        isSearching: loading && query.length >= minQueryLength,
    }
}