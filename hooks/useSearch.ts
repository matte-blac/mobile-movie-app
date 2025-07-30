import { handleAPIError } from "@/utils/errors"
import { useCallback, useEffect, useRef, useState } from "react"

export const useSearch = <T>(
    searchFunction: (query: string) => Promise<T>,
    options: UseSearchOptions = {}
) => {
    const {debounceMs = 300, minQueryLength = 2 } = options

    const [query, setQuery] = useState('')
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const debounceTimeoutRef = useRef<NodeJS.Timeout>()
    const abortControllerRef = useRef<AbortController>()
    const lastQueryRef = useRef('')
    const isMountRef = useRef(true)

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
            if (searchQuery === lastQueryRef.current && isMountRef.current) {
                setData(results)
            }
        } catch (err) {
            if (searchQuery === lastQueryRef.current && isMountRef.current && (err as any)?. name !== 'AbortError') {
                const appError = handleAPIError(err)
                setError(appError)
                setData(null)
            }
        } finally {
            if (searchQuery === lastQueryRef.current && isMountRef.current) {
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

        if (searchQuery.length >= minQueryLength && isMountRef.current) {
            setLoading(true)
            setError(null)
        }

        debounceTimeoutRef.current = setTimeout(() => {
            if (isMountRef.current){
              executeSearch(searchQuery.trim())  
            }
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

    const retry = useCallback(() => {
        if (query && query.length >= minQueryLength) {
            executeSearch(query)
        }
    }, [query, minQueryLength, executeSearch])

    // cleanup on unmount
    useEffect(() => {
        isMountRef.current = true

        return () => {
            isMountRef.current = true
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
        retry,
        isSearching: loading && query.length >= minQueryLength,
    }
}