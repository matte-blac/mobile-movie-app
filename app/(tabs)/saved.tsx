import MovieCard from "@/components/MovieCard"
import { EmptyState, ErrorScreen, Loading, ScreenHeader } from "@/components/shared"
import { icons } from "@/constants/icons"
import { images } from "@/constants/images"
import { useSavedMovies } from "@/context/SavedMoviesContext"
import useFetch from "@/hooks/useFetch"
import { getSavedMovies, removeSavedMovie } from "@/services/appwrite"
import { showErrorAlert } from "@/utils/errors"
import { useCallback, useMemo } from "react"
import { Alert, Dimensions, FlatList, Image, TouchableOpacity, View } from "react-native"

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
    } = useFetch(getSavedMovies, {autoFetch: true})

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
                            const success = await removeSavedMovie(movieId)
                            if (success) {
                                removeFromGlobalState(movieId)
                            }
                        } catch (error: any) {
                            showErrorAlert(error, "Failed to remove movie.")
                        }
                    }
                }
            ]
        )
    }, [removeFromGlobalState])

    const handleRefresh = useCallback(async () => {
        try {
            await refreshSavedMovies()
            refetch()
        } catch (error: any) {
            showErrorAlert(error, 'Failed to refresh')
        }
    }, [refreshSavedMovies, refetch])

    const renderSavedMovie = useCallback(({item}: {item: any}) => (
        <View style={{width: ITEM_WIDTH, height: ITEM_HEIGHT, marginBottom: 20}}>
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
                original_title={item.title}
                overview=""
                popularity={0}
                video={false}
                vote_count={0}
            />
            <TouchableOpacity
                onPress={() => handleRemoveMovie(item.movie_id, item.title)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full items-center justify-center"
            >
                <Image source={icons.save} className="size-4" tintColor='#ffffff'/>
                {/* <Text className="text-red-500 text-xs font-medium">Remove</Text> */}
            </TouchableOpacity>
        </View>
    ), [handleRemoveMovie])

    const columnWrapperStyle = useMemo(() => ({
        justifyContent: 'space-between' as const,
        paddingHorizontal: 5,
        marginBottom: 16,
    }), [])
    
    const keyExtractor = useCallback((item: any) => `saved-${item.$id}`, [])

    const numColumns = 3
    const contentContainerStyle = useMemo(()=> ({
        paddingHorizontal: 20,
        paddingBottom: 100,
    }), [])

    if (loading) {
        return <Loading message="Loading Saved Movies"/>
    }

    if (error) {
        return (
            <ErrorScreen 
                error={error}
                onRetry={handleRefresh}
                title="Failed to Load Saved Movies"
            />
        )
    }

    return (
        <View className="bg-primary flex-1">
            <Image source={images.bg} className="absolute w-full h-full z-0" resizeMode="cover"/>

            {/* Header */}
                <ScreenHeader
                    title="Saved Movies"
                    subtitle={`${savedMovies.length} ${savedMovies.length === 1 ? 'movie' : 'movies'}`}
                />

                {savedMovies.length === 0 ? (
                    <EmptyState
                        icon={icons.save}
                        title="No Saved Movies"
                        subtitle="Movies you save will appear here."
                    />
                ): (
                    <FlatList
                        data={savedMovies}
                        renderItem={renderSavedMovie}
                        keyExtractor={keyExtractor}
                        numColumns={numColumns}
                        contentContainerStyle={contentContainerStyle}
                        showsVerticalScrollIndicator={false}
                        onRefresh={handleRefresh}
                        refreshing={loading}
                        columnWrapperStyle={{
                            justifyContent: 'flex-start',
                            gap: 20
                        }}
                        ItemSeparatorComponent={() => <View style={{height: 10}}/>}
                    />
                )}
        </View>
    )
}

export default Saved