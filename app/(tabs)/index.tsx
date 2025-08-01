import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import TrendingCard from "@/components/TrendingCard";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useSavedMovies } from "@/context/SavedMoviesContext";
import useFetch from "@/hooks/useFetch";
import { fetchMovies } from "@/services/api";
import { getTrendingMovies } from "@/services/appwrite";
import { useRouter } from "expo-router";
import { useCallback, useMemo, memo, useEffect } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

const {width: screenWidth} = Dimensions.get('window')
const MOVIE_ITEM_WIDTH = (screenWidth - 40 -40) / 3
const MOVIE_ITEM_HEIGHT = 260

// Memoized components
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
        <ActivityIndicator size='small' color='#ab8bff'/>
        <Text className="text-white mt-4 text-lg">Loading movies...</Text>
    </View>
));

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

const MoviesSection = memo(({ movies, renderMovieItem, keyExtractor }: {
    movies: Movie[];
    renderMovieItem: any;
    keyExtractor: any;
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
            <Text className="text-lg text-white font-bold mt-5 mb-3">
                Latest Movies
            </Text>
            <FlatList {...flatlistProps}/>
        </View>
    );
});

export default function Index() {
    const router = useRouter();
    const { refreshSavedMovies } = useSavedMovies();

    const {
        data: trendingMovies,
        loading: trendingLoading,
        error: trendingError,
        refetch: refetchTrending,
    } = useFetch(getTrendingMovies)

    const {
        data: movies,
        loading: moviesLoading,
        error: moviesError,
        refetch: refetchMovies,
    } = useFetch(() => fetchMovies({
        query: ''
    }))

    // Refresh saved movies when component mounts to ensure consistency
    useEffect(() => {
        refreshSavedMovies();
    }, [refreshSavedMovies]);

    const handleSearchPress = useCallback(() => {
        router.push('/search')
    }, [router])

    const handleRetry = useCallback(() => {
        refetchTrending()
        refetchMovies()
    }, [refetchTrending, refetchMovies])

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
                        movies={movies || []}
                        renderMovieItem={renderMovieItem}
                        keyExtractor={keyExtractor}
                    />
                </View>
            </ScrollView>
        </View>
    );
}