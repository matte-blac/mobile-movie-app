import MovieCard from "@/components/MovieCard"
import { icons } from "@/constants/icons"
import { images } from "@/constants/images"
import { useSavedMovies } from "@/context/SavedMoviesContext"
import { getSavedMovies, removeSavedMovie } from "@/services/appwrite"
import useFetch from "@/services/useFetch"
import { ActivityIndicator, Alert, FlatList, Image, Text, TouchableOpacity, View } from "react-native"


const Saved = () => {
    const { removeSavedMovie: removeFromGlobalState, savedMovies} = useSavedMovies()

    const {
        loading,
        error,
        refetch
    } = useFetch(getSavedMovies)

    const handleRemoveMovie = (movieId: number) => {
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
    }

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
            {!savedMovies || savedMovies.length === 0 ? (
                <View className="flex-1 justify-center items-center px-10">
                    <Image source={icons.save} className="size-16 mb-4" tintColor='light-200'/>
                    <Text className="text-white text-xl font-bold text-center mb-2">
                        No Saved Movies Yet
                    </Text>
                    <Text className="text-gray-400 text-center text-base leading-6">
                        Save your favorites to see them here
                    </Text>
                </View>
            ): (
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
                    data={savedMovies}
                    renderItem={({item }) => (
                        <View style={{width: '30%'}}>
                                <MovieCard
                                id={item.movie_id}
                                poster_path={item.poster_path}
                                title={item.title}
                                vote_average={item.vote_average}
                                release_date={item.release_date} adult={false} backdrop_path={""} genre_ids={[]}
                                original_language={""} original_title={""} overview={""} popularity={0}
                                video={false} vote_count={0} 
                        />  
                            <TouchableOpacity
                                onPress={() => handleRemoveMovie(item.movie_id)}
                                className="w-full mt-2 bg-red-500/20 border border-red-500 rounded-lg py-2 px-3 flex-row items-center justify-center"
                            >
                                <Image source={icons.save} className="size-4 mr-2" tintColor='#ef4444'/>
                                <Text className="text-red-500 text-xs font-medium">Remove</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    keyExtractor={(item) => item.$id}
                    numColumns={3}
                    columnWrapperStyle={{
                        justifyContent: 'flex-start',
                        gap: 20,
                        paddingRight: 5,
                        marginBottom: 10
                    }}
                    contentContainerStyle={{
                        paddingBottom: 120,
                        flexGrow: 1
                    }}
                    showsVerticalScrollIndicator={false}
                    />
                </View>
            )}
        </View>
    )
}

export default Saved