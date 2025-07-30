import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import TrendingCard from "@/components/TrendingCard";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import useFetch from "@/hooks/useFetch";
import { fetchMovies } from "@/services/api";
import { getTrendingMovies } from "@/services/appwrite";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

const {width: screenWidth} = Dimensions.get('window')
const MOVIE_ITEM_WIDTH = (screenWidth - 40 -40) / 3
const MOVIE_ITEM_HEIGHT = 260

export default function Index() {
    const router = useRouter();

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

    const TrendingItemSeparator = useCallback(() => <View className="w-4"/>, []);
    const MovieItemSeparator = useCallback(() => <View className="w-4"/>, []);

    const keyExtractor = useCallback((item: any) => {
        return item.id ? item.id.toString() : item.movie_id ? item.movie_id.toString() : Math.random().toString()
    }, [])

    const getItemLayout = useCallback((_data: ArrayLike<Movie> | null | undefined, index: number) => ({
        length: MOVIE_ITEM_HEIGHT,
        offset: MOVIE_ITEM_HEIGHT * Math.floor(index / 3),
        index,
    }), [])

    const columnWrapperStyle = useMemo(() => ({
        justifyContent: 'space-between' as const,
        paddingHorizontal: 5,
        marginBottom: 16,
    }), [])

    const ScrollViewContentStyle = useMemo(() => ({
        flexGrow: 1,
        paddingBottom: 10
    }), [])

    const errorScreenContentStyle = useMemo(() => ({
        flexGrow: 1,
        justifyContent: 'center' as const
    }), [])

    const isLoading = useMemo(()=> trendingLoading || moviesLoading, [trendingLoading, moviesLoading]) 
    const hasError = useMemo(()=> trendingError || moviesError, [trendingError, moviesError]) 
    const errorMessage = useMemo(()=> trendingError?.message || moviesError?.message, [trendingError, moviesError])
    
    const trendingFlatlistProps = useMemo (() => ({
        horizontal: true,
        showsHorizontalScrollIndicator:false,
        ItemSeperatorComponent: TrendingItemSeparator,
        data: trendingMovies || [],
        renderItem: renderTrendingItem,
        keyExtractor: keyExtractor,
        initialNumToRender: 3,
        maxToRenderPerBatch: 2,
        windowSize: 5,
        contentContainerStyle: { paddingLeft: 0, paddingRight: 16 },
        removeClippedSubviews: false,
    }), [trendingMovies, renderTrendingItem, keyExtractor])

    const moviesFlatlistProps = useMemo (() => ({
        scrollEnabled:false,
        ItemSeperatorComponent: MovieItemSeparator,
        data: movies || [],
        renderItem: renderMovieItem,
        keyExtractor,
        numColumns: 3 as const,
        columnWrapperStyle,
        maxToRenderPerBatch: 6,
        initialNumToRender: 9,
        removeClippedSubviews: true,
    }), [movies, renderMovieItem, keyExtractor, columnWrapperStyle])

    if (isLoading) {
        return (
            <View className="flex-1 bg-primary justify-center items-center">
                <Image source={images.bg} className="absolute w-full h-full z-0"/>
                <ActivityIndicator size='small' color='accent'/>
                <Text className="text-white mt-4 text-lg">Loading movies...</Text>
            </View>
        )
    }

    if (hasError) {
        return (
            <View className="flex-1 bg-primary">
                <Image source={images.bg} className="absolute w-full h-full z-0"/>
                <ScrollView
                    className="flex-1 px-5"
                    contentContainerStyle={errorScreenContentStyle}
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
                            onPress={handleRetry}
                            className="bg-accent px-6 py-3 rounded-lg"
                        >
                            <Text className="text-white font-semibold">Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-primary">
            <Image source={images.bg} className="absolute w-full h-full z-0" />

            <ScrollView 
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={ScrollViewContentStyle}
                removeClippedSubviews={true}
                >
                <Image source={icons.logo} className="w-12 h-10 mt-20 mb-5 mx-auto" />

                    <View className="flex-1 mt-5">
                        <SearchBar
                            onPress={handleSearchPress}
                            placeholder="Search for a movie"
                        />

                        {/* Trending Movies Section */}
                        {trendingMovies &&  trendingMovies.length > 0 && (
                            <View className='mt-10'>
                                <Text className='text-lg text-white font-bold mb-3'>
                                    Trending Movies
                                </Text>
                                <FlatList {...trendingFlatlistProps}/>
                            </View>
                        )}

                        {/* Latest Movies Section */}
                        {movies && movies.length > 0 && (
                            <View className="mt-8">
                            <Text className="text-lg text-white font-bold mt-5 mb-3">
                                Latest Movies
                            </Text>
                            <FlatList {...moviesFlatlistProps}/>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
