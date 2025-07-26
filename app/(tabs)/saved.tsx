import MovieCard from "@/components/MovieCard"
import { icons } from "@/constants/icons"
import { images } from "@/constants/images"
import { useSavedMovies } from "@/context/SavedMoviesContext"
import useFetch from "@/hooks/useFetch"
import { getSavedMovies, removeSavedMovie } from "@/services/appwrite"
import { useCallback, useMemo } from "react"
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Text, TouchableOpacity, View } from "react-native"

const {width: screenWidth} = Dimensions.get('window')
const ITEM_WIDTH = (screenWidth - 40 - 30) / 3
const ITEM_HEIGHT = 300

const Saved = () => {
    const { 
        removeSavedMovie: removeFromGlobalState, 
        savedMovies,
        refreshSavedMovies
    } = useSavedMovies()

    const {
        loading,
        error,
        refetch
    } = useFetch(getSavedMovies)

    const handleRemoveMovie = useCallback((movieId: number) => {
        Alert.alert(
            "Remove Movie",
            "Are your sure you want to remove this movie from your saved list?",
            [
                {text: "Cancel", style: "cancel"},
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeSavedMovie(movieId)
                            removeFromGlobalState(movieId)
                            refetch()
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove movie. Please try again.")
                        }
                    }
                }
            ]
        )
    }, [removeFromGlobalState, refetch])

    const renderSavedMovie = useCallback(({item}) => (
        <View style={{width: ITEM_WIDTH}}>
            <MovieCard
                id={item.movie_id}
                poster_path={item.poster_path}
                title={item.title}
                vote_average={item.vote_average}
                release_date={item.release_date}
                adult={false}
                backdrop_path=""
                genre_ids={[]}
                original_language=""
                original_title=""
                overview=""
                popularity={0}
                video={false}
                vote_count={0}
            />
            <TouchableOpacity
                onPress={() => handleRemoveMovie(item.movie_id)}
                className="w-full mt-2 bg-red-500/20 border border-red-500 rounded-lg py-1 px-2 flex-row items-center justify-center"
            >
                <Image source={icons.save} className="size-3 mr-1" tintColor='#ef4444'/>
                <Text className="text-red-500 text-xs font-medium">Remove</Text>
            </TouchableOpacity>
        </View>
    ), [handleRemoveMovie])

    const keyExtractor = useCallback((item) => item.$id, [])

    const getItemLayout = useCallback((_data: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * Math.floor(index / 3),
        index,
    }), [])

    const ListEmptyComponent = useMemo(() => {
        <View className="flex-1 justify-center items-center px-10">
            <Image source={icons.save} className="size-16 mb-4" tintColor='light-200'/>
            <Text className="text-white text-xl font-bold text-center mb-2">
                No Saved Movies Yet
            </Text>
            <Text className="text-gray-400 text-center text-base leading-6">
                Save your favorites to see them here
            </Text>
        </View>
    }, [])

    const columnWrapperStyle = useMemo(() => ({
        justifyContent: 'space-between' as const,
        paddingHorizontal: 5,
        marginBottom: 16,
    }), [])

    if (loading) {
        return (
            <View className="bg-primary flex-1 justify-center items-center">
                <Image source={images.bg} className="absolute w-full h-full z-0"/>
                <ActivityIndicator size='large' color='#000ff'/>
                <Text className="text-white mt-4">Loading saved movies...</Text>
            </View>
        )
    }

    if (error) {
        return (
            <View className="bg-primary flex-1 px-5">
                <Image source={images.bg} className="absolute w-full h-full z-0"/>
                <View className="flex-1 justify-center items-center">
                    <Image source={icons.save} className="size-12 mb-4" tintColor='#ef4444'/>
                    <Text className="text-red-500 text-center text-base mb-4">
                        Error loading saved movies: {error.message}
                    </Text>
                    <TouchableOpacity 
                        onPress={refetch}
                        className="bg-accent px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View className="bg-primary flex-1">
            <Image source={images.bg} className="absolute w-full h-full z-0" resizeMode="cover"/>
                <View className="flex-1 px-5">
                    <View className="w-full flex-row justify-center items-center mt-20 mb-5">
                        <Image source={icons.logo} className="w-12 h-10"/>
                    </View>
                    <Text className="text-white text-2xl font-bold text-center mb-2">
                        Saved Movies
                    </Text>
                    <Text className="text-gray-400 text-center text-sm mb-5">
                        {savedMovies?.length} saved movie{savedMovies?.length !== 1 ? 's' : ''}
                    </Text>

                    <FlatList 
                    data={savedMovies || []}
                    renderItem={renderSavedMovie}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                    numColumns={3}
                    columnWrapperStyle={columnWrapperStyle}
                    contentContainerStyle={{
                        paddingBottom: 120,
                        flexGrow: 1
                    }}
                    ListEmptyComponent={ListEmptyComponent}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={6}
                    updateCellsBatchingPeriod={100}
                    windowSize={10}
                    initialNumToRender={6}
                />
            </View>
        </View>
    )
}

export default Saved