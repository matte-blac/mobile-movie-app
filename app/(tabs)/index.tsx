import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import TrendingCard from "@/components/TrendingCard";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useSavedMovies } from "@/context/SavedMoviesContext";
import useFetch from "@/hooks/useFetch";
import { fetchMoviePagination, preloadNextPage } from "@/services/api";
import { getTrendingMovies } from "@/services/appwrite";
import { logger } from "@/utils/log";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

const {width: screenWidth} = Dimensions.get('window')
const MOVIE_ITEM_WIDTH = (screenWidth - 40 -40) / 3
const MOVIE_ITEM_HEIGHT = 260

// memoized components
const ErrorScreen = memo(({ errorMessage, onRetry }: { errorMessage: string; onRetry: () => void }) => (
    <View className="flex-1 bg-primary">
        <Image source={images.bg} className="absolute w-full h-full z-0"/>
        <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
            <View className="items-center py-10">
                <Image source={icons.logo} className="w-16 h-12 mb-6 opacity-50"/>
                <Text className="text-red-400 text-lg font-semibold mb-2">
                    Something went wrong
                </Text>
                <Text className="text-gray-400 text-center mb-6">
                    {errorMessage || 'Failed to load movies'}
                </Text>
                <TouchableOpacity
                    onPress={onRetry}
                    className="bg-accent px-6 py-3 rounded-lg"
                >
                    <Text className="text-white font-semibold">Try Again</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </View>
));

const LoadingScreen = memo(() => (
    <View className="flex-1 bg-primary justify-center items-center">
        <Image source={images.bg} className="absolute w-full h-full z-0"/>
        <ActivityIndicator size='small' color='light-accent'/>
        <Text className="text-white mt-4 text-lg">Loading movies...</Text>
    </View>
));

const LoadMoreButton = memo(({onPress, loading, disabled}: {
    onPress: () => void
    loading: boolean
    disabled?: boolean
}) => (
    <View className="items-center py-6">
        <TouchableOpacity
            onPress={onPress}
            disabled={loading || disabled}
            className={`px-8 py-3 rouded-full ${loading || disabled ? 'bg-gray-600 opacity-50': 'bg-accent opacity-90'}`}
            activeOpacity={0.8}
        >
            {loading ? (
                <View className="flex-row items-center">
                    <ActivityIndicator size='small' color='#fff' />
                    <Text className="text-white font-semibold ml-2">Loading...</Text>
                </View>
            ) : (
                <Text className="text-white font-semibold">
                    {disabled ? 'No More Movies' : 'Load More Movies'}
                </Text>
            )}
        </TouchableOpacity>
    </View>
))

const PaginatedInfo = memo(({pagination}: {pagination: PaginationState}) => (
    <View className="items-center py-2">
        <Text className="text-gray-400 text-sm">
            Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalResults} total movies
        </Text>
    </View>
))

const TrendingSection = memo(({ trendingMovies, renderTrendingItem, keyExtractor }: {
    trendingMovies: TrendingMovie[];
    renderTrendingItem: any;
    keyExtractor: any;
}) => {
    const flatlistProps = useMemo(() => ({
        horizontal: true,
        showsHorizontalScrollIndicator: false,
        ItemSeparatorComponent: () => <View className="w-4"/>,
        data: trendingMovies,
        renderItem: renderTrendingItem,
        keyExtractor: keyExtractor,
        initialNumToRender: 3,
        maxToRenderPerBatch: 2,
        windowSize: 5,
        contentContainerStyle: { paddingLeft: 0, paddingRight: 16 },
        removeClippedSubviews: false,
        getItemLayout: (_: any, index: number) => ({
            length: 128,
            offset: 128 * index,
            index,
        }),
    }), [trendingMovies, renderTrendingItem, keyExtractor]);

    if (!trendingMovies || trendingMovies.length === 0) return null;

    return (
        <View className='mt-10'>
            <Text className='text-lg text-white font-bold mb-3'>
                Trending Movies
            </Text>
            <FlatList {...flatlistProps}/>
        </View>
    );
});

const MoviesSection = memo(({
    movies,
    renderMovieItem,
    keyExtractor,
    onLoadMore,
    pagination,
    showPaginationInfo = true
}: {
    movies: Movie[]
    renderMovieItem: any
    keyExtractor: any
    onLoadMore: () => void
    pagination: PaginationState
    showPaginationInfo?: boolean
}) => {
    const columnWrapperStyle = useMemo(() => ({
        justifyContent: 'space-between' as const,
        paddingHorizontal: 5,
        marginBottom: 16,
    }), []);

    const flatlistProps = useMemo(() => ({
        scrollEnabled: false,
        ItemSeparatorComponent: () => <View className="w-4"/>,
        data: movies,
        renderItem: renderMovieItem,
        keyExtractor,
        numColumns: 3 as const,
        columnWrapperStyle,
        maxToRenderPerBatch: 6,
        initialNumToRender: 9,
        removeClippedSubviews: true,
        getItemLayout: (_: any, index: number) => ({
            length: MOVIE_ITEM_HEIGHT,
            offset: MOVIE_ITEM_HEIGHT * Math.floor(index / 3),
            index,
        }),
    }), [movies, renderMovieItem, keyExtractor, columnWrapperStyle]);

    if (!movies || movies.length === 0) return null;

    return (
        <View className="mt-8">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg text-white font-bold">
                    Latest Movies
                </Text>
                <Text className="text-sm text-gray-400">
                    {movies.length} movies
                </Text>
            </View>

            <FlatList {...flatlistProps}/>

            {showPaginationInfo && (
                <PaginatedInfo pagination={pagination} />
            )}

             {pagination.hasNextPage && (
                <LoadMoreButton
                        onPress={onLoadMore}
                        loading={pagination.loadingMore}
                        disabled={!pagination.hasNextPage}
                />
             )}
        </View>
    );
});

export default function Index() {
    const router = useRouter();
    const { refreshSavedMovies } = useSavedMovies();

    // state for movies and pagination
    const [allMovies, setAllMovies] = useState<Movie[]>([])
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 0,
        totalPages: 1,
        totalResults: 0,
        hasNextPage: true,
        loadingMore: false
    })

    // ref to prevent duplicate requests
    const loadingRef = useRef(false)
    const preloadTimeoutRef = useRef<NodeJS.Timeout>()

    const {
        data: trendingMovies,
        loading: trendingLoading,
        error: trendingError,
        refetch: refetchTrending,
    } = useFetch(getTrendingMovies)

    const {
        data: initialData,
        loading: moviesLoading,
        error: moviesError,
        refetch: refetchMovies,
    } = useFetch(() => fetchMoviePagination({
        query: '',
        page: 1
    }), {
        cacheKey: 'home-movies-page-1',
        cacheDuration: 30 * 60 * 1000
    })

    // initialize movies and pagination on first load
    useEffect(() => {
        if (initialData && initialData.movies.length > 0) {
            setAllMovies(initialData.movies)
            setPagination({
                currentPage: initialData.pagination.currentPage,
                totalPages: initialData.pagination.totalPages,
                totalResults: initialData.pagination.totalResults,
                hasNextPage: initialData.pagination.hasNextPage,
                loadingMore: false
            })

            // preload next page for smooth experience
            if (initialData.pagination.hasNextPage) {
                preloadTimeoutRef.current = setTimeout(() => {
                    preloadNextPage('', 1)
                }, 200)
            }
        }
    }, [initialData])

    // refresh saved movies when component mounts to ensure consistency
    useEffect(() => {
        refreshSavedMovies();
    }, [refreshSavedMovies]);

    // cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (preloadTimeoutRef.current) {
                clearTimeout(preloadTimeoutRef.current)
            }
        }
    }, [])

    const handleSearchPress = useCallback(() => {
        router.push('/search')
    }, [router])

    const handleRetry = useCallback(() => {
        setAllMovies([])
        setPagination({
            currentPage: 0,
            totalPages: 1,
            totalResults: 0,
            hasNextPage: true,
            loadingMore: false
        })
        refetchTrending()
        refetchMovies()
    }, [refetchTrending, refetchMovies])

    const handleLoadMore = useCallback(async () => {
        if (loadingRef.current || pagination.loadingMore || !pagination.hasNextPage) {
            return
        }

        loadingRef.current = true
        setPagination(prev => ({...prev, loadingMore: true}))

        try {
            const nextPage = pagination.currentPage + 1
            const result = await fetchMoviePagination({
                query: '',
                page: nextPage
            })

            if (result && result.movies.length > 0) {
                // filter out any duplicates
                const uniqueNewMovies = result.movies.filter(
                    newMovie => !allMovies.some(existingMovie => existingMovie.id === newMovie.id)
                )

                if (uniqueNewMovies.length > 0) {
                    setAllMovies(prev => [...prev, ...uniqueNewMovies])
                    setPagination({
                        currentPage: result.pagination.currentPage,
                        totalPages: result.pagination.totalPages,
                        totalResults: result.pagination.totalResults,
                        hasNextPage: result.pagination.hasNextPage,
                        loadingMore: false
                    })

                    // preload next page if available
                    if (result.pagination.hasNextPage) {
                        preloadTimeoutRef.current = setTimeout(() => {
                            preloadNextPage('', result.pagination.currentPage)
                        }, 1000)
                    }
                } else {
                    // no new unique movies, this is the end
                    setPagination(prev => ({
                        ...prev,
                        hasNextPage: false,
                        loadingMore: false
                    }))
                }
            } else {
                setPagination(prev => ({
                        ...prev,
                        hasNextPage: false,
                        loadingMore: false
                    }))
            }
        } catch (error) {
            logger.error('Failed to load more movies:', error)
            setPagination(prev => ({
                ...prev,
                loadingMore: false
            }))
        } finally {
            loadingRef.current = false
        }
    }, [pagination, allMovies])

    const renderTrendingItem = useCallback(({item, index}: {item: TrendingMovie; index: number}) => (
        <TrendingCard movie={item} index={index}/>
    ), [])
    
    const renderMovieItem = useCallback(({item}: {item: Movie}) => (
        <View style={{width: MOVIE_ITEM_WIDTH}}>
            <MovieCard {...item}/>
        </View>
    ), [])

    const keyExtractor = useCallback((item: any) => {
        return item.id ? item.id.toString() : item.movie_id ? item.movie_id.toString() : Math.random().toString()
    }, [])

    const scrollViewContentStyle = useMemo(() => ({
        flexGrow: 1,
        paddingBottom: 100
    }), [])

    const isLoading = useMemo(()=> trendingLoading || moviesLoading, [trendingLoading, moviesLoading]) 
    const hasError = useMemo(()=> trendingError || moviesError, [trendingError, moviesError]) 
    const errorMessage = useMemo(()=> trendingError?.message || moviesError?.message, [trendingError, moviesError])
    
    if (isLoading) {
        return <LoadingScreen />;
    }

    if (hasError) {
        return <ErrorScreen errorMessage={errorMessage || 'Failed to load movies'} onRetry={handleRetry} />;
    }

    return (
        <View className="flex-1 bg-primary">
            <Image source={images.bg} className="absolute w-full h-full z-0" />

            <ScrollView 
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={scrollViewContentStyle}
                removeClippedSubviews={true}
                keyboardShouldPersistTaps="handled"
                >
                <Image source={icons.logo} className="w-12 h-10 mt-20 mb-5 mx-auto" />

                <View className="flex-1 mt-5">
                    <SearchBar
                        onPress={handleSearchPress}
                        placeholder="Search for a movie"
                    />

                    <TrendingSection 
                        trendingMovies={trendingMovies || []}
                        renderTrendingItem={renderTrendingItem}
                        keyExtractor={keyExtractor}
                    />

                    <MoviesSection 
                        movies={allMovies}
                        renderMovieItem={renderMovieItem}
                        keyExtractor={keyExtractor}
                        onLoadMore={handleLoadMore}
                        pagination={pagination}
                        showPaginationInfo={true}
                    />
                </View>
            </ScrollView>
        </View>
    );
}