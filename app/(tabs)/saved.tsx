import MovieCard from "@/components/MovieCard"
import { EmptyState, ErrorScreen, Loading, ScreenHeader } from "@/components/shared"
import { icons } from "@/constants/icons"
import { images } from "@/constants/images"
import { useSavedMovies } from "@/context/SavedMoviesContext"
import useFetch from "@/hooks/useFetch"
import { getSavedMovies, removeSavedMovie } from "@/services/appwrite"
import { showErrorAlert } from "@/utils/errors"
import { useCallback, useMemo, memo } from "react"
import { Alert, Dimensions, FlatList, Image, TouchableOpacity, View } from "react-native"

const {width: screenWidth} = Dimensions.get('window')
const ITEM_WIDTH = (screenWidth - 40 - 30) / 3
const ITEM_HEIGHT = 300

// Memoized components
const RemoveButton = memo(({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity
        onPress={onPress}
        className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.7}
    >
        <Image source={icons.save} className="size-4" tintColor='#ffffff'/>
    </TouchableOpacity>
));

const SavedMovieItem = memo(({ item, onRemove }: { 
    item: any; 
    onRemove: (movieId: number, title: string) => void;
}) => {
    const handleRemove = useCallback(() => {
        onRemove(item.movie_id, item.title);
    }, [item.movie_id, item.title, onRemove]);

    return (
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
                showSaveButton={false}
            />
            <RemoveButton onPress={handleRemove} />
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item.$id === nextProps.item.$id &&
        prevProps.item.movie_id === nextProps.item.movie_id &&
        prevProps.item.title === nextProps.item.title &&
        prevProps.item.poster_path === nextProps.item.poster_path &&
        prevProps.onRemove === nextProps.onRemove
    );
});

const SavedMoviesGrid = memo(({ 
    savedMovies, 
    onRemove, 
    onRefresh, 
    loading 
}: {
    savedMovies: any[];
    onRemove: (movieId: number, title: string) => void;
    onRefresh: () => void;
    loading: boolean;
}) => {
    const renderSavedMovie = useCallback(({item}: {item: any}) => (
        <SavedMovieItem item={item} onRemove={onRemove} />
    ), [onRemove]);

    const keyExtractor = useCallback((item: any) => `saved-${item.$id}`, []);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_HEIGHT + 20,
        offset: (ITEM_HEIGHT + 20) * Math.floor(index / 3),
        index,
    }), []);

    const contentContainerStyle = useMemo(() => ({
        paddingHorizontal: 20,
        paddingBottom: 100,
    }), []);

    const columnWrapperStyle = useMemo(() => ({
        justifyContent: 'flex-start' as const,
        gap: 20
    }), []);

    return (
        <FlatList
            data={savedMovies}
            renderItem={renderSavedMovie}
            keyExtractor={keyExtractor}
            numColumns={3}
            contentContainerStyle={contentContainerStyle}
            showsVerticalScrollIndicator={false}
            onRefresh={onRefresh}
            refreshing={loading}
            columnWrapperStyle={columnWrapperStyle}
            ItemSeparatorComponent={() => <View style={{height: 10}}/>}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={9}
            updateCellsBatchingPeriod={100}
            windowSize={10}
            initialNumToRender={9}
        />
    );
});

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

    const handleRemoveMovie = useCallback((movieId: number, title: string) => {
        Alert.alert(
            "Remove Movie",
            `Are you sure you want to remove "${title}" from your saved list?`,
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

    const headerSubtitle = useMemo(() => 
        `${savedMovies.length} ${savedMovies.length === 1 ? 'movie' : 'movies'}`,
        [savedMovies.length]
    );

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

            <ScreenHeader
                title="Saved Movies"
                subtitle={headerSubtitle}
            />

            {savedMovies.length === 0 ? (
                <EmptyState
                    icon={icons.save}
                    title="No Saved Movies"
                    subtitle="Movies you save will appear here."
                />
            ) : (
                <SavedMoviesGrid 
                    savedMovies={savedMovies}
                    onRemove={handleRemoveMovie}
                    onRefresh={handleRefresh}
                    loading={loading}
                />
            )}
        </View>
    )
}

export default Saved