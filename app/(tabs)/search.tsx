import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { fetchMovies } from "@/services/api";
import { updateSearchCount } from "@/services/appwrite";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Text, View } from 'react-native';

const {width: screenWidth} = Dimensions.get('window')
const ITEM_WIDTH = (screenWidth - 40 - 32) / 3
const ITEM_HEIGHT = 260

const Search = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const debounceTimeoutRef = useRef<NodeJS.Timeout>()
    const abortControllerRef = useRef<AbortController>()
    const lastQueryRef = useRef('')

    const searchMovies = useCallback(async (query: string) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // skip if the query is too short
        if (query.length < 2) {
            setMovies([])
            setLoading(false)
            setError(null)
            return
        }

        // skip if same query as last one
        if (query === lastQueryRef.current) {
            return
        }

        lastQueryRef.current = query
        abortControllerRef.current = new AbortController()

        setLoading(true)
        setError(null)

        try {
            const results = await fetchMovies({query})

            // only update if this is still the current query
            if (query === lastQueryRef.current){
                setMovies(results || [])

            if (results?.length > 0 && results[0]) {
                updateSearchCount(query, results[0]).catch(console.error)
            }
        }
    } catch (err) {
            if (query === lastQueryRef.current) {
                setError(err instanceof Error ? err : new Error('Search Failed'))
                setMovies([])
            }
        } finally {
            if (query === lastQueryRef.current) {
                setLoading(false)
            }
        }
    }, [])

    const debounceSearch = useCallback((query: string) => {
        // clear existing timeout
        if(debounceTimeoutRef.current){
            clearTimeout(debounceTimeoutRef.current)
        }

        // clear results if query is empty
        if (!query.trim()) {
            setMovies([])
            setLoading(false)
            setError(null)
            lastQueryRef.current = ''
            return
        }

        setLoading(true)
        setError(null)

        // debounce the actual search
        debounceTimeoutRef.current = setTimeout(() => {
            searchMovies(query.trim())
        }, 300)
    }, [searchMovies])

    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text)
        debounceSearch(text)
    }, [debounceSearch])

    const renderMovieItem = useCallback(({item}: {item: Movie}) => (
        <View style={{width: ITEM_WIDTH}}>
            <MovieCard {...item}/>
        </View>
    ), [])

    const getItemLayout = useCallback((_data: ArrayLike<Movie> | null | undefined, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * Math.floor(index / 3),
        index,
    }), [])

    const keyExtractor = useCallback((item: Movie) => item.id.toString(), [])

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

    const ListHeaderComponent = useMemo(() => {
        return (
            <>
            <View className="w-full flex-row justify-center mt-20 items-center">
                <Image source={icons.logo} className="w-12 h-10"/>
            </View>
            <View className="my-5">
                <SearchBar
                    placeholder="Search For Movies..."
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                />
            </View>

            {loading && searchQuery.length >= 2 && (
                <View className="py-4 items-center">
                    <ActivityIndicator size='large' color='accent'/>
                    <Text className="text-gray-400 text-sm"></Text>
                </View>
            )}

            {error && searchQuery.length >= 2 && (
                <View className="py-4 items-center">
                    <ActivityIndicator size='small' color='accent'/>
                    <Text className="text-red-400 text-center">
                        {error.message}
                    </Text>
                </View>
            )}

            {!loading && !error && searchQuery.trim() && movies && movies.length > 0 && (
                <Text className="text-xl text-white font-bold mb-4">
                    Search Results for {' '}
                    <Text className="text-accent">{searchQuery}</Text> ({movies.length})
                </Text>
            )}
        </>
        )
    }, [searchQuery, handleSearchChange, loading, error, movies.length])

    const ListEmptyComponent = useMemo(() => {
        if (loading || error) return null

    return (
        <View className="mt-10 px-5 py-8 items-center">
            <Image
                source={icons.search}
                className="w-16 h-16 mb-4"
                tintColor='#4b5563'
            />
            <Text className="text-center text-gray-400 text-lg font-medium">
                {searchQuery.trim() ? 'No Movies Found' : 'Search For Movies'}
            </Text>
            {searchQuery.trim() && (
                <Text className="text-center text-gray-500 text-sm mt-2">
                    Try different keywords or check your spelling
                </Text>
            )}
        </View>
    )
}, [loading, error, searchQuery])

const flatListProps = useMemo(() => ({
    renderItem: renderMovieItem,
    keyExtractor: keyExtractor,
    getItemLayout: getItemLayout,
    numColumns: 3 as const,
    columnWrapperStyle: {
        justifyContent: 'space-between' as const,
        paddingHorizontal: 5,
        marginBottom: 16
    },
    contentContainerStyle: {
        paddingBottom: 120,
        flexGrow: 1
    },
    showsVerticalScrollIndicator: false,
    removeClippedSubviews: true,
    maxToRenderPerBatch: 6,
    updateCellsBatchingPeriod: 100,
    windowSize: 10,
    initialNumToRender: 6,
    keyboardShouldPersistTaps: 'handled' as const,
}), [renderMovieItem, keyExtractor, getItemLayout])

return (
    <View className="flex-1 bg-primary">
        <Image source={images.bg} className="flex-1 absolute w-full h-full z-0" resizeMode="cover"/>
        <FlatList
            {...flatListProps}
            data={movies}
            className="px-5"
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
        />
    </View>
)

}

export default Search
