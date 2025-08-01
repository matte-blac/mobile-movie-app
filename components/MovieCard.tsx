import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/context/SavedMoviesContext";
import { removeSavedMovie, saveMovie } from '@/services/appwrite';
import { Link } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';

const MovieCard = memo(({ 
    id, 
    poster_path, 
    title, 
    vote_average, 
    release_date, 
    showSaveButton = true, 
    ...movieData
}: MovieCardProps) => {

    const {isMovieSaved, addSavedMovie, removeSavedMovie: removeFromGlobalState, refreshSavedMovies} = useSavedMovies();
    const [isLoading, setIsLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const debounceSaveRef = useRef<NodeJS.Timeout>()
    const isMountedRef = useRef(true)

    const isSaved = isMovieSaved(id);

    // Memoize the movie object to prevent infinite re-renders
    const movieToSave = useMemo((): Movie => ({
        id,
        title,
        poster_path,
        vote_average,
        release_date,
        adult: movieData.adult || false,
        backdrop_path: movieData.backdrop_path || '',
        genre_ids: movieData.genre_ids || [],
        original_language: movieData.original_language || '',
        original_title: movieData.original_title || title,
        overview: movieData.overview || '',
        popularity: movieData.popularity || 0,
        video: movieData.video || false,
        vote_count: movieData.vote_count || 0,
    }), [id, title, poster_path, vote_average, release_date, movieData]);

    const handleSaveToggle = useCallback(async (e: any) => {
        e.preventDefault();
        e.stopPropagation();

        if (debounceSaveRef.current) {
            clearTimeout(debounceSaveRef.current)
        }

        debounceSaveRef.current = setTimeout(async () => {
            if (isLoading || !isMountedRef.current) return

            setIsLoading(true);
            const wasInitiallySaved = isSaved;

            try {
                if (wasInitiallySaved) {
                    // Remove from saved movies
                    await removeSavedMovie(id);
                    removeFromGlobalState(id);
                } else {
                    // Add to saved movies
                    await saveMovie(movieToSave);
                    addSavedMovie(id);
                }
                
                // Refresh the saved movies to ensure consistency
                await refreshSavedMovies();
                
            } catch (error) {
                console.error('Error saving movie:', error);
                const errorMessage = error instanceof Error ? error.message : 'An error occurred';

                if (errorMessage.includes('already saved')) {
                    Alert.alert('Already Saved', 'This movie is already in your saved list.');
                    addSavedMovie(id);
                } else if (errorMessage.includes('not authorized')) {
                    Alert.alert('Permission Error', 'Please make sure you are logged in and have permission to save movies.');
                } else {
                    Alert.alert('Error', `Failed to ${wasInitiallySaved ? 'remove' : 'save'} movie. Please try again.`);
                }
                
                // Refresh to get the actual state from server
                await refreshSavedMovies();
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        }, 300)
    }, [id, isSaved, movieToSave, addSavedMovie, removeFromGlobalState, refreshSavedMovies, isLoading]);

    const handleImageLoad = useCallback(() => {
        setImageLoading(false);
        setImageError(false);
    }, []);

    const handleImageError = useCallback(() => {
        setImageLoading(false);
        setImageError(true);
    }, []);

    const imageSource = useMemo(() => {
        if (poster_path && !imageError) {
            return {
                uri: `https://image.tmdb.org/t/p/w342/${poster_path}`,
                cache: 'force-cache'
            }
        }
        return {
            uri: `https://placehold.co/342x513/1a1a1a/ffffff.png?text=${encodeURIComponent(title)}`
        }
    }, [poster_path, imageError, title]);

    const yearFromDate = useMemo(() => {
        return release_date?.split('-')[0] || '';
    }, [release_date]);

    const roundedRating = useMemo(() => {
        return Math.round(vote_average / 2);
    }, [vote_average]);

    const saveButtonStyles = useMemo(() => ({
        backgroundColor: isSaved ? '#ab8bff' : 'rgba(0, 0, 0, 0.5)', // Use hex color instead of 'accent'
        opacity: isLoading ? 0.7 : 1
    }), [isSaved, isLoading])

    const saveIconTintColor = useMemo(() => {
        return isSaved ? '#ffffff' : '#a8b5db' // Use hex colors instead of named colors
    }, [isSaved])

    useEffect(() => {
        isMountedRef.current = true

        return () => {
            isMountedRef.current = false
            if (debounceSaveRef.current) {
                clearTimeout(debounceSaveRef.current)
            }
        }
    }, [])

    return (
        <View className="relative">
            <Link href={`/movies/${id}`} asChild>
                <TouchableOpacity>
                    <View className="relative">
                        <Image
                            source={imageSource}
                            style={{
                                width: '100%',
                                height: 208,
                                borderRadius: 8,
                            }}
                            resizeMode="cover"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />  

                        {/* loading placeholder */}
                        {imageLoading && (
                            <View className="absolute inset-0 bg-dark-200 rounded-lg items-center justify-center">
                                <ActivityIndicator color='#ab8bff' size='small' />
                                <Text className="text-gray-400 text-xs mt-2">Loading...</Text>
                            </View>
                        )}

                        {/* Error placeholder */}
                        {imageError && !imageLoading && (
                            <View className="absolute inset-0 bg-dark-200 rounded-lg items-center justify-center">
                                <Image source={icons.logo} className="w-8 h-6 opacity-50"/>
                                <Text className="text-gray-400 text-xs mt-2 text-center px-2" numberOfLines={3}>
                                    {title}
                                </Text>
                            </View>
                        )}

                        <View className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg"/>
                    </View>
                    
                    {showSaveButton && (
                        <TouchableOpacity
                            onPress={handleSaveToggle}
                            style={[
                                {
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: {
                                        width: 0,
                                        height: 1,
                                    },
                                    shadowOpacity: 0.22,
                                    shadowRadius: 2.22,
                                    elevation: 3,
                                },
                                saveButtonStyles
                            ]}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator size='small' color='#ffffff'/>
                            ): (
                               <Image 
                                source={icons.save} 
                                className="size-4" 
                                tintColor={saveIconTintColor}
                            /> 
                            )}
                            
                        </TouchableOpacity>
                    )}
                    
                    <View className="mt-3">
                        <Text className="text-sm font-bold text-white leading-5" numberOfLines={2}>
                            {title}
                        </Text>
                        
                        <View className="flex-row items-center justify-between mt-2">
                            <View className="flex-row items-center gap-x-1">
                                <Image source={icons.star} className="size-4"/>
                                <Text className="text-xs text-white font-bold">
                                    {roundedRating}/5
                                </Text>
                            </View>
                            
                            {yearFromDate && (
                                <Text className="text-xs text-light-300 font-medium">
                                    {yearFromDate}
                                </Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Link>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.id === nextProps.id &&
        prevProps.poster_path === nextProps.poster_path &&
        prevProps.title === nextProps.title &&
        prevProps.vote_average === nextProps.vote_average &&
        prevProps.release_date === nextProps.release_date &&
        prevProps.showSaveButton === nextProps.showSaveButton
    )
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;